
import { TruckRecord, ExpenseRecord, CardStatement, ProcessedStatementResult } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

// Declaración local por seguridad
declare const __API_KEY__: string;

// --- HELPERS ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getResponseSchema = () => ({
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        patente: { type: Type.STRING, description: "La patente o matrícula. Si no es clara, usar 'PENDIENTE'." },
        tag: { type: Type.STRING, description: "El número de TAG o dispositivo." },
        dueno: { type: Type.STRING, description: "Nombre del propietario. Si no figura en la tabla, usar 'Desconocido'." },
        valor: { type: Type.NUMBER, description: "El valor monetario o monto numérico." },
        concepto: { type: Type.STRING, description: "Descripción del ítem (peaje, fecha, lugar)." },
        fecha: { type: Type.STRING, description: "Fecha (YYYY-MM-DD)." }
      },
      required: ["valor"], 
    },
});

const cleanAndParseJSON = (text: string): any => {
    try {
        if (!text) return null;
        let cleaned = text.replace(/```json/gi, '').replace(/```/g, '');
        const firstBracket = cleaned.indexOf('[');
        const firstBrace = cleaned.indexOf('{');
        
        let startIndex = -1;
        let endIndex = -1;

        if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
            startIndex = firstBracket;
            endIndex = cleaned.lastIndexOf(']');
        } else if (firstBrace !== -1) {
            startIndex = firstBrace;
            endIndex = cleaned.lastIndexOf('}');
        }

        if (startIndex !== -1 && endIndex !== -1) {
            cleaned = cleaned.substring(startIndex, endIndex + 1);
        }

        cleaned = cleaned.trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON Parse Error. Raw Text:", text);
        return []; 
    }
};

// --- VALIDATION HELPER ROBUST ---
const getApiKey = (): string => {
    try {
        // @ts-ignore
        if (typeof __API_KEY__ !== 'undefined' && __API_KEY__ && __API_KEY__.trim() !== '') {
            return __API_KEY__;
        }
    } catch (e) {}

    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            if (import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
            if (import.meta.env.API_KEY) return import.meta.env.API_KEY;
        }
    } catch (e) {}

    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env) {
             // @ts-ignore
            if (process.env.VITE_API_KEY) return process.env.VITE_API_KEY;
             // @ts-ignore
            if (process.env.API_KEY) return process.env.API_KEY;
        }
    } catch (e) {}

    console.error("API Key no encontrada.");
    throw new Error("FALTA API KEY: Verifica tu configuración.");
};

// --- FALLBACK METHOD ---
const generateContentFallback = async (apiKey: string, prompt: string, contents: any[], schema?: any) => {
    console.warn("Using Fallback REST API...");
    const parts = contents.map((c: any) => {
        if (c.mimeType === 'text/plain') return { text: c.data };
        return { inlineData: { mimeType: c.mimeType, data: c.data } };
    });
    
    const generationConfig: any = { temperature: 0.1 };
    if (schema) {
        generationConfig.responseMimeType = "application/json";
        generationConfig.responseSchema = schema;
    } else {
         generationConfig.responseMimeType = "application/json";
    }
    
    const requestBody = {
        contents: [{ parts: [...parts, { text: prompt }] }],
        generationConfig
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error API (${response.status}): ${errText}`);
    }

    const json = await response.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
};

// --- MAIN SERVICE: TRUCK LOGISTICS ---

export const processDocuments = async (
  contents: { mimeType: string; data: string }[],
  retries = 3
): Promise<TruckRecord[]> => {
  let lastError: any;
  const apiKey = getApiKey();
  const schema = getResponseSchema();

  const prompt = `Analiza el documento como un experto logístico.
  Objetivo: Extraer filas de tablas de movimientos, viajes o peajes.

  IMPORTANTE - LECTURA DE FACTURAS AGRUPADAS (Ej: Autopistas, CEAMSE):
  En muchas facturas, el número de TAG (ej: SI9099565380) aparece en una línea SOLA (sin monto), y debajo aparecen las filas de peajes/pasadas con sus importes.
  
  REGLA DE CONTEXTO:
  1. Si ves un código alfanumérico largo (TAG) en una línea sin valor monetario, GUÁRDALO como "Tag Actual".
  2. Lee las líneas siguientes que tienen descripción (ej: "BUEN AYRE", "PASADAS") y MONTO.
  3. A esas líneas de monto, ASÍGNALES el "Tag Actual" que leíste arriba.
  4. Repite esto hasta que encuentres un nuevo TAG.
  
  INTELIGENCIA DEDUCTIVA GENERAL:
  - Columna con formato monetario ($1.000, 1000.00) -> ES EL "VALOR".
  - Columna con formato fecha (DD/MM/YYYY o YYYY-MM-DD) -> ES LA "FECHA".
  
  Mapeo de Campos Requerido:
  - Patente (Si no está clara, pon "PENDIENTE").
  - Dueño (Si falta, pon "Desconocido").
  - Valor (OBLIGATORIO: Debe ser numérico).
  - Concepto (Descripción del peaje/pasada).
  - Tag (El dispositivo asociado a este cobro).
  - Fecha.
  
  Devuelve un Array JSON plano con todas las transacciones encontradas (uniendo el Tag padre con sus filas hijas).`;

  for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        let textResult = "";
        try {
            const ai = new GoogleGenAI({ apiKey });
            const sdkParts = contents.map(c => c.mimeType === 'text/plain' ? { text: c.data } : { inlineData: { mimeType: c.mimeType, data: c.data } });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: { parts: [...sdkParts, { text: prompt }] },
                config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.1 },
            });
            textResult = response.text || "[]";
        } catch (e: any) {
            // Manejo específico de error 429 (Rate Limit)
            if (e.message?.includes('429') || e.toString().includes('429') || e.status === 429) {
                console.warn(`Límite de API (429) detectado. Esperando ${10 * attempt} segundos...`);
                await wait(10000 * attempt); // Espera exponencial: 10s, 20s, 30s
                if (attempt === retries) throw new Error("Servidor saturado (429). Intente subir menos archivos a la vez.");
                continue; // Reintentar loop
            }
            console.warn("SDK Error, using fallback:", e);
            textResult = await generateContentFallback(apiKey, prompt, contents, schema);
        }
        
        const data = cleanAndParseJSON(textResult);
        if (!Array.isArray(data)) return [];

        return data.map((item: any, index: number) => ({
            ...item,
            patente: item.patente || 'PENDIENTE',
            dueno: item.dueno || 'Desconocido',
            concepto: item.concepto || 'Varios',
            valor: Number(item.valor) || 0,
            id: `gen-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`
        }));
      } catch (error: any) {
        lastError = error;
        // Si el error es 429 en el fallback también esperamos
        if (error.message?.includes('429') || error.toString().includes('429')) {
             await wait(10000 * attempt);
        } else {
             if (attempt < retries) await wait(attempt * 2000);
        }
      }
  }
  throw new Error(`Error procesando documento: ${lastError?.message || 'Error desconocido'}`);
};

// --- NEW SERVICE: CREDIT CARD EXPENSES (ENHANCED) ---

export const processCardExpenses = async (
    contents: { mimeType: string; data: string }[],
    retries = 3
): Promise<ProcessedStatementResult> => {
    let lastError: any;
    const apiKey = getApiKey();
    
    // Prompt reforzado para deducción inteligente
    const prompt = `
        Analiza este documento (Resumen Tarjeta/Excel) buscando GASTOS VIALES (Peajes, Telepase, Rutas).
        
        INSTRUCCIONES DE "LECTURA INTELIGENTE":
        1. No busques palabras exactas. Busca patrones.
        2. Si ves items repetitivos con montos pequeños, son PEAJES.
        3. Si ves "MERPAGO" o "MP", revisa si parece un servicio vial.
        4. Si el concepto es ilegible pero la categoría dice "Vial" o "Servicios", inclúyelo.
        
        METADATA (Cabecera):
        - Busca el Banco (Galicia, BBVA, Santander). Si no está, busca logos o textos legales.
        - Busca la fecha de Vencimiento.
        - Busca el "Total a Pagar" o "Saldo Nuevo".

        ITEMS (Detalle):
        - Extrae fecha, concepto y monto de cada peaje/telepase encontrado.
        
        Devuelve JSON con metadata e items.
    `;
    
    const combinedSchema = {
        type: Type.OBJECT,
        properties: {
            metadata: {
                type: Type.OBJECT,
                properties: {
                    banco: { type: Type.STRING },
                    titular: { type: Type.STRING },
                    periodo: { type: Type.STRING },
                    fechaVencimiento: { type: Type.STRING },
                    totalResumen: { type: Type.NUMBER }
                },
                required: ["banco", "totalResumen", "fechaVencimiento"]
            },
            items: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        fecha: { type: Type.STRING },
                        concepto: { type: Type.STRING },
                        monto: { type: Type.NUMBER },
                        categoria: { type: Type.STRING, enum: ["PEAJE"] }
                    },
                    required: ["fecha", "concepto", "monto", "categoria"]
                }
            }
        },
        required: ["metadata", "items"]
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            let textResult = "";
            try {
                const ai = new GoogleGenAI({ apiKey });
                const sdkParts = contents.map(c => c.mimeType === 'text/plain' ? { text: c.data } : { inlineData: { mimeType: c.mimeType, data: c.data } });
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: { parts: [...sdkParts, { text: prompt }] },
                    config: { responseMimeType: "application/json", responseSchema: combinedSchema as any, temperature: 0.1 },
                });
                textResult = response.text || "{}";
            } catch (err: any) {
                 // Manejo específico de error 429
                 if (err.message?.includes('429') || err.toString().includes('429') || err.status === 429) {
                    console.warn(`Límite de API (429) en Gastos. Esperando ${10 * attempt} segundos...`);
                    await wait(10000 * attempt);
                    if (attempt === retries) throw new Error("Servidor ocupado (429). Intente más tarde.");
                    continue;
                 }
                 console.error("SDK Error (Expenses), trying fallback", err);
                 textResult = await generateContentFallback(apiKey, prompt, contents, combinedSchema);
            }

            const data = cleanAndParseJSON(textResult);
            
            if (!data || !data.metadata) {
                 if (Array.isArray(data)) {
                     // Fallback inteligente si devuelve array en vez de objeto
                     return { 
                        metadata: { banco: "Detectado por IA", titular: "Desconocido", periodo: "-", fechaVencimiento: "-", totalResumen: 0 },
                        items: data.map((d: any) => ({...d, categoria: 'PEAJE', monto: Number(d.monto) || Number(d.valor) || 0 }))
                     };
                 }
                 throw new Error("Estructura JSON inválida");
            }

            return data as ProcessedStatementResult;

        } catch (error: any) {
            lastError = error;
            if (error.message?.includes('429')) await wait(10000); // Wait extra on rate limit
            else if (attempt < retries) await wait(attempt * 2000);
        }
    }
    
    throw new Error(`Fallo procesamiento de gastos: ${lastError?.message}`);
};

export const convertPdfToData = async (contents: { mimeType: string; data: string }[]): Promise<any[]> => {
    const apiKey = getApiKey();
    const prompt = `Analiza PDF. Extrae tabla principal. JSON array.`;
    try {
        let textResult = "";
        try {
            const ai = new GoogleGenAI({ apiKey });
            const sdkParts = contents.map(c => ({ inlineData: { mimeType: c.mimeType, data: c.data } }));
            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: { parts: [...sdkParts, { text: prompt }] }, config: { responseMimeType: "application/json" } });
            textResult = response.text || "[]";
        } catch (e) { textResult = await generateContentFallback(apiKey, prompt, contents); }
        return cleanAndParseJSON(textResult);
    } catch (e: any) { throw new Error("Error conversión PDF: " + e.message); }
};
