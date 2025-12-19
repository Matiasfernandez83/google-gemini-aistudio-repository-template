
import { TruckRecord, ProcessedStatementResult } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const normalizeValue = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    
    // Limpieza agresiva de strings de moneda (ej: "$ 1.234,50" o "1,234.50")
    let str = String(val).trim();
    
    // Si tiene puntos y comas, asumimos formato regional (punto mil, coma decimal)
    if (str.includes('.') && str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
        // Si solo tiene coma, es el decimal
        str = str.replace(',', '.');
    }
    
    const parsed = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const processDocuments = async (
  contents: { mimeType: string; data: string }[],
  retries = 2
): Promise<TruckRecord[]> => {
  const SYSTEM_PROMPT = `
    Eres un auditor contable de alta precisión para Transporte Furlong.
    TU MISIÓN: Extraer TODAS Y CADA UNA de las filas de movimientos de peaje del documento. No puedes omitir ninguna, por más repetitiva que sea.
    
    REGLAS DE EXTRACCIÓN:
    1. EXHAUSTIVIDAD TOTAL: Si el documento tiene 100 pasadas, debes devolver 100 objetos en el JSON. No resumas con "..." ni omitas filas similares.
    2. IDENTIFICADORES: 
       - Patente: Busca formatos tipo AA123BB, AG123ZZ o similares.
       - TAG: Busca números largos (8 a 12 dígitos).
       - Extrae AMBOS si aparecen en la misma fila.
    3. MONTOS: Extrae el valor neto o tarifa. Ignora el signo $.
    4. FECHAS: Formato estándar YYYY-MM-DD.
    5. CONCEPTO: Incluye la estación de peaje o descripción de la autopista.
  `;

  for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [...contents.map(c => ({ inlineData: { mimeType: c.mimeType, data: c.data } })), { text: SYSTEM_PROMPT }] },
            config: { 
                temperature: 0.1, // Un poco de temperatura ayuda a no bloquearse en listas largas
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            patente: { type: Type.STRING, description: "Patente del vehículo" },
                            tag: { type: Type.STRING, description: "Número de dispositivo TAG" },
                            valor: { type: Type.NUMBER, description: "Monto exacto del pase" },
                            fecha: { type: Type.STRING, description: "Fecha en formato YYYY-MM-DD" },
                            estacion: { type: Type.STRING, description: "Nombre del peaje" },
                            referencia: { type: Type.STRING, description: "Nro de comprobante o línea original" }
                        },
                        required: ['valor', 'fecha']
                    }
                }
            }
        });

        const jsonStr = response.text || "[]";
        const rawJson = JSON.parse(jsonStr);
        
        return rawJson.map((item: any, index: number) => ({
            patente: (item.patente || "").toUpperCase().replace(/[^A-Z0-9]/g, ''),
            tag: (item.tag || "").replace(/\D/g, ''),
            valor: normalizeValue(item.valor),
            concepto: item.estacion || item.referencia || "Peaje",
            fecha: item.fecha || "",
            estacion: item.estacion || "",
            dueno: "Desconocido",
            id: `gen-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`
        }));
      } catch (error) {
        if (attempt === retries) throw error;
        await wait(3000);
      }
  }
  return [];
};

export const processCardExpenses = async (contents: { mimeType: string; data: string }[]): Promise<ProcessedStatementResult> => {
    const prompt = `
        Extrae datos de resumen de cuenta. Sé extremadamente minucioso con los ítems de PEAJES y TELEPASE.
        No omitas ningún cargo de "AUSA", "AUBASA", "TelePase" o "Caminos de las Sierras".
    `;
    
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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
                        },
                        required: ['banco', 'totalResumen']
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
                            },
                            required: ['fecha', 'concepto', 'monto']
                        }
                    }
                },
                required: ['metadata', 'items']
            }
        }
    });

    const json = JSON.parse(response.text || "{}");
    // Limpieza de montos en el resultado
    if (json.metadata) json.metadata.totalResumen = normalizeValue(json.metadata.totalResumen);
    if (json.items) {
        json.items = json.items.map((i: any) => ({ ...i, monto: normalizeValue(i.monto) }));
    }
    return json;
};
