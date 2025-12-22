
import { TruckRecord, ProcessedStatementResult } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const normalizeValue = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let str = String(val).trim();
    
    // Detectar si el número es negativo (ej: -46.200,00 o (46.200,00))
    const isNegative = str.includes('-') || (str.startsWith('(') && str.endsWith(')'));
    
    if (str.includes('.') && str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
        str = str.replace(',', '.');
    }
    
    let parsed = parseFloat(str.replace(/[^0-9.]/g, ''));
    if (isNaN(parsed)) return 0;
    return isNegative ? -parsed : parsed;
};

export const processDocuments = async (
  contents: { mimeType: string; data: string }[],
  retries = 2
): Promise<{ items: TruckRecord[], totalDocumento: number }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const SYSTEM_PROMPT = `
    Eres un AUDITOR LOGÍSTICO EXHAUSTIVO. Tu tarea es extraer CADA LÍNEA de la tabla de la factura.
    
    REGLAS DE ORO (PROHIBIDO OMITIR DATOS):
    1. NO AGRUPAR: Si un mismo TAG aparece 10 veces, DEBES generar 10 registros distintos. No sumes ni omitas repeticiones.
    2. DOBLE COLUMNA: Las facturas de Corredores Viales tienen una tabla a la izquierda y otra a la derecha. Escanea AMBAS columnas en todas las páginas.
    3. IDENTIFICACIÓN DE TAG: Busca el código que empieza con "SI" (ej: SI9094436594). 
       - Extrae exactamente los ÚLTIMOS 8 NÚMEROS (ej: 94436594).
    4. BONIFICACIONES: Si la descripción contiene "BONIFICACION", el monto DEBE ser NEGATIVO.
    5. MONTO DE CONTROL: Busca el campo "Subtotal" al pie de la última página (ej: $387.703,54). 
       - Este valor es la suma exacta de todos los pases y bonificaciones extraídos.
    
    FORMATO DE SALIDA: Devuelve un JSON con el 'montoSubtotal' y la lista de 'registros'.
  `;

  for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [...contents.map(c => ({ inlineData: { mimeType: c.mimeType, data: c.data } })), { text: SYSTEM_PROMPT }] },
            config: { 
                temperature: 0,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        montoSubtotal: { type: Type.NUMBER, description: "Valor del campo Subtotal al pie de la factura" },
                        registros: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    tag_8_digitos: { type: Type.STRING, description: "Los últimos 8 números del TAG" },
                                    monto_importe: { type: Type.NUMBER, description: "Valor de la columna Importe (Negativo si es bonificación)" },
                                    detalle_completo: { type: Type.STRING }
                                },
                                required: ['tag_8_digitos', 'monto_importe']
                            }
                        }
                    },
                    required: ['montoSubtotal', 'registros']
                }
            }
        });

        const rawJson = JSON.parse(response.text || "{}");
        const totalControl = normalizeValue(rawJson.montoSubtotal);
        const filas = rawJson.registros || [];
        
        // Verificación de cuadre para el semáforo (ShieldCheck/ShieldAlert)
        const sumaItems = filas.reduce((acc: number, curr: any) => acc + normalizeValue(curr.monto_importe), 0);
        const diferencia = Math.abs(sumaItems - totalControl);

        const mappedItems = filas.map((item: any, index: number) => {
            const rawId = String(item.tag_8_digitos || "").toUpperCase().replace(/[^0-9]/g, '');
            const detail = String(item.detalle_completo || "").toUpperCase();
            const isBonificacion = detail.includes("BONIFICACION") || item.monto_importe < 0;

            return {
                id: `rec-${Date.now()}-${index}`,
                patente: "", 
                tag: isBonificacion ? "BONIFICACION" : rawId,
                valor: normalizeValue(item.monto_importe),
                concepto: item.detalle_completo || (isBonificacion ? "Bonificación" : "Pase Peaje"),
                fecha: new Date().toISOString().split('T')[0],
                dueno: isBonificacion ? "BONIFICACION" : "Pendiente de cruce",
                isVerified: false,
                documentTotal: totalControl,
                balanceDiff: diferencia 
            };
        });

        return { items: mappedItems, totalDocumento: totalControl };
      } catch (error) {
        if (attempt === retries) throw error;
        await wait(2000);
      }
  }
  return { items: [], totalDocumento: 0 };
};

export const processCardExpenses = async (contents: { mimeType: string; data: string }[]): Promise<ProcessedStatementResult> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const prompt = `Extrae datos de resumen de tarjeta bancaria: banco, titular, periodo, vencimiento, total resumen y lista de gastos de peajes.`;
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...contents.map(c => ({ inlineData: { mimeType: c.mimeType, data: c.data } })), { text: prompt }] },
        config: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    metadata: {
                        type: Type.OBJECT,
                        properties: {
                            banco: { type: Type.STRING },
                            titular: { type: Type.STRING },
                            totalResumen: { type: Type.NUMBER },
                            periodo: { type: Type.STRING },
                            fechaVencimiento: { type: Type.STRING }
                        }
                    },
                    items: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                fecha: { type: Type.STRING },
                                concepto: { type: Type.STRING },
                                monto: { type: Type.NUMBER },
                                categoria: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        }
    });

    const json = JSON.parse(response.text || "{}");
    if (json.metadata) json.metadata.totalResumen = normalizeValue(json.metadata.totalResumen);
    if (json.items) json.items = json.items.map((i: any) => ({ ...i, monto: normalizeValue(i.monto) }));
    return json;
};
