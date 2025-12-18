
import { TruckRecord, ProcessedStatementResult } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const normalizeValue = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let str = String(val).replace(/[^0-9,\.-]/g, '').trim();
    if (str.includes(',') && str.includes('.')) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
        str = str.replace(',', '.');
    }
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const processDocuments = async (
  contents: { mimeType: string; data: string }[],
  retries = 2
): Promise<TruckRecord[]> => {
  const SYSTEM_PROMPT = `
    Eres un auditor experto de Transporte Furlong. Extrae todos los movimientos de peaje.
    
    INSTRUCCIONES CRÍTICAS:
    1. IDENTIFICADOR: 
       - Si es CAMINOS DE LAS SIERRAS: La PATENTE (ej: AG299ZA).
       - Si es AUSOL / TELEPASE: El TAG (ej: 99740852).
    2. VALORES: Tarifa exacta.
    3. FECHA: YYYY-MM-DD.
  `;

  for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [...contents.map(c => ({ inlineData: { mimeType: c.mimeType, data: c.data } })), { text: SYSTEM_PROMPT }] },
            config: { 
                temperature: 0, 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            identificador: { type: Type.STRING },
                            valor_neto: { type: Type.NUMBER },
                            fecha: { type: Type.STRING },
                            estacion: { type: Type.STRING },
                            linea_origen: { type: Type.STRING }
                        },
                        required: ['identificador', 'valor_neto']
                    }
                }
            }
        });

        const jsonStr = response.text || "[]";
        const rawJson = JSON.parse(jsonStr);
        
        return rawJson.map((item: any, index: number) => {
            const id = (item.identificador || "").toUpperCase().replace(/[^A-Z0-9]/g, '');
            const isPatente = id.length <= 8 && !/^\d+$/.test(id);
            return {
                patente: isPatente ? id : "",
                tag: !isPatente ? id : "",
                valor: normalizeValue(item.valor_neto),
                concepto: item.linea_origen || item.estacion || "Peaje",
                fecha: item.fecha || "",
                estacion: item.estacion || "",
                dueno: "Desconocido",
                id: `gen-${Date.now()}-${index}`
            };
        });
      } catch (error) {
        if (attempt === retries) throw error;
        await wait(2000);
      }
  }
  return [];
};

export const processCardExpenses = async (contents: { mimeType: string; data: string }[]): Promise<ProcessedStatementResult> => {
    const prompt = `
        Extrae datos de resumen de cuenta/tarjeta. 
        Misión: Identificar TODOS los gastos relacionados a PEAJES, AUTOPISTAS, TELEPASE y pases de MERCADOPAGO (ej: MP*PEAJE).
        
        Reglas:
        1. Metadata: banco, titular, total del resumen, periodo y vencimiento.
        2. Items: Solo los gastos de peajes/autopistas. 
        3. Clasificación: Marcar como CATEGORIA: 'PEAJE' si dice Peaje, Autopista, Telepase o AUSA/AUBASA.
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
                        required: ['banco', 'titular', 'totalResumen']
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

    const jsonStr = response.text || "{}";
    return JSON.parse(jsonStr);
};
