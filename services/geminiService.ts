
import { TruckRecord, ExpenseRecord, CardStatement } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

// Declaración local por seguridad (aunque esté en d.ts)
declare const __API_KEY__: string;

// --- HELPERS ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getResponseSchema = () => ({
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        patente: { type: Type.STRING, description: "La patente o matrícula del camión (ej: AB123CD)." },
        tag: { type: Type.STRING, description: "El número de TAG, dispositivo de peaje o telepase." },
        dueno: { type: Type.STRING, description: "Nombre del propietario o dueño del camión." },
        valor: { type: Type.NUMBER, description: "El valor monetario, monto, flete o cantidad numérica." },
        concepto: { type: Type.STRING, description: "Breve descripción del servicio o ítem." },
        fecha: { type: Type.STRING, description: "Fecha del servicio si está disponible (YYYY-MM-DD)." }
      },
      required: ["patente", "dueno", "valor", "concepto"],
    },
});

const cleanAndParseJSON = (text: string): any => {
    try {
        if (!text) return null;
        let cleaned = text.replace(/```json/gi, '').replace(/```/g, '');
        const firstBracket = cleaned.indexOf('[');
        const firstBrace = cleaned.indexOf('{');
        
        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            const lastBrace = cleaned.lastIndexOf('}');
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        } else if (firstBracket !== -1) {
            const lastBracket = cleaned.lastIndexOf(']');
            cleaned = cleaned.substring(firstBracket, lastBracket + 1);
        }

        cleaned = cleaned.trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON Parse Error. Raw Text:", text);
        throw new Error("La IA generó un formato inválido. Intente nuevamente.");
    }
};

// --- VALIDATION HELPER ROBUST ---
const getApiKey = (): string => {
    let key = '';

    // 1. Intento: Variable Inyectada por Vite (Define)
    try {
        if (typeof __API_KEY__ !== 'undefined') key = __API_KEY__;
    } catch (e) {}

    // 2. Intento: Variables de entorno estándar Vite
    if ((!key || key.trim() === '') && import.meta && import.meta.env) {
        if (import.meta.env.VITE_API_KEY) key = import.meta.env.VITE_API_KEY;
        else if (import.meta.env.API_KEY) key = import.meta.env.API_KEY;
    }

    if (!key || key.trim() === '') {
        console.error("API Key vacía en todas las fuentes (__API_KEY__, VITE_API_KEY, API_KEY).");
        throw new Error("FALTA API KEY: Crea un archivo .env con 'VITE_API_KEY=tu_clave' y REINICIA la terminal.");
    }
    return key;
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
  let apiKey = "";
  try { apiKey = getApiKey(); } catch (e: any) { throw e; }

  const schema = getResponseSchema();
  const prompt = `Actúa como un sistema experto de ERP. Analiza doc. Extrae: TAG, Patente, Dueño, Valor, Concepto. JSON array.`;

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
        } catch (e) {
            console.warn("SDK Error, using fallback:", e);
            textResult = await generateContentFallback(apiKey, prompt, contents, schema);
        }
        const data = cleanAndParseJSON(textResult);
        return Array.isArray(data) ? data.map((item, index) => ({
            ...item,
            id: `gen-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`
        })) : [];
      } catch (error: any) {
        lastError = error;
        if (attempt < retries) await wait(attempt * 2000);
      }
  }
  throw new Error(`Error final: ${lastError?.message || 'Error desconocido'}`);
};

// --- NEW SERVICE: CREDIT CARD EXPENSES (ENHANCED) ---

interface ProcessedStatementResult {
    metadata: Omit<CardStatement, 'id' | 'sourceFileId'>;
    items: Omit<ExpenseRecord, 'id' | 'statementId' | 'sourceFileId' | 'sourceFileName'>[];
}

export const processCardExpenses = async (
    contents: { mimeType: string; data: string }[],
    retries = 3
): Promise<ProcessedStatementResult> => {
    let lastError: any;
    let apiKey = "";
    try { apiKey = getApiKey(); } catch (e: any) { throw e; }
    
    // Lista ULTRA completa de keywords para Argentina
    const keywords = [
        "peaje", "telepeaje", "telepase", "autopista", "ruta", "acceso", "corredor", 
        "vial", "camino", "autovia", "concesionaria", "tasa", "tariff", "cabina", "estacion",
        "ausol", "autopistas del sol", "ausa", "autopistas urbanas", "aubasa", "buenos aires",
        "cvsa", "corredores viales", "caminos de las sierras", "caminos del rio uruguay", "rio uruguay",
        "cruz del sur", "accesos norte", "acceso oeste", "grupo concesionario", "autovia del mar", 
        "riccheri", "illia", "perito moreno", "7 lagos", "andes", "litoral", "gco", "oeste",
        "mercadopago*telepase", "mp*telepase", "mercado pago telepase", "servicios viales", 
        "cv1", "cv2", "cv3", "cv4", "cv5", "cv 1", "cv 2", "cv 3", "cv 4", "cv 5",
        "a.u.s.a.", "a.u.s.o.l.", "g.c.o.", "caminos del valle"
    ];

    const prompt = `
        Analiza exhaustivamente este resumen de tarjeta (PDF/Excel) para detectar GASTOS DE PEAJE Y TELEPASE.
        
        OBJETIVO 1: METADATA
        Extrae: "banco", "titular", "periodo", "fechaVencimiento" (YYYY-MM-DD), "totalResumen" (Saldo Final).

        OBJETIVO 2: ITEMS DE PEAJE (Detección Agresiva)
        Tu prioridad absoluta es listar CADA movimiento que parezca un peaje o servicio vial.
        
        INSTRUCCIONES DE BÚSQUEDA:
        1. Busca en columna 'Concepto' o 'Detalle' las palabras clave: ${keywords.join(', ')}.
        2. IMPORTANTE: A veces el concepto es críptico (ej: "CVSA", "GCO SA", "AUSA"). Si coincide parcialmente, INCLÚYELO.
        3. Si ves una serie de montos pequeños repetidos en fechas cercanas, son peajes, INCLÚYELOS aunque el nombre sea genérico.
        4. "Mercado Pago" seguido de "Telepase" o similar es un peaje.
        5. NO filtres por duda. Ante la duda, si parece vial, es PEAJE.
        
        FORMATO JSON:
        {
          "metadata": { ... },
          "items": [
            { "fecha": "YYYY-MM-DD", "concepto": "Texto original", "monto": 1234.50, "categoria": "PEAJE" }
          ]
        }
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
            } catch (err) {
                 console.error("SDK Error (Expenses), trying fallback", err);
                 textResult = await generateContentFallback(apiKey, prompt, contents, combinedSchema);
            }

            const data = cleanAndParseJSON(textResult);
            if (!data.metadata || !Array.isArray(data.items)) throw new Error("Estructura JSON inválida");
            return data as ProcessedStatementResult;

        } catch (error: any) {
            lastError = error;
            console.warn(`Attempt ${attempt} failed:`, error.message);
            if (attempt < retries) await wait(attempt * 2000);
        }
    }
    
    throw new Error(`Fallo procesamiento de gastos: ${lastError?.message}`);
};

export const convertPdfToData = async (contents: { mimeType: string; data: string }[]): Promise<any[]> => {
    let apiKey = "";
    try { apiKey = getApiKey(); } catch (e: any) { throw e; }
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
