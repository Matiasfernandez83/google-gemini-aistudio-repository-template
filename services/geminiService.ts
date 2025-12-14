
import { TruckRecord, ExpenseRecord, CardStatement } from "../types";

// --- HELPERS ---

const getApiKey = () => {
    let apiKey: string | undefined = undefined;
    try {
        if (typeof process !== 'undefined' && process.env) apiKey = process.env.API_KEY;
        if (!apiKey && typeof window !== 'undefined' && (window as any).process?.env) apiKey = (window as any).process.env.API_KEY;
    } catch (e) { console.warn(e); }
    
    if (!apiKey) throw new Error("CRÍTICO: API_KEY no detectada.");
    return apiKey;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getResponseSchema = () => ({
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        patente: { type: "STRING", description: "La patente o matrícula del camión (ej: AB123CD)." },
        tag: { type: "STRING", description: "El número de TAG, dispositivo de peaje o telepase." },
        dueno: { type: "STRING", description: "Nombre del propietario o dueño del camión." },
        valor: { type: "NUMBER", description: "El valor monetario, monto, flete o cantidad numérica." },
        concepto: { type: "STRING", description: "Breve descripción del servicio o ítem." },
        fecha: { type: "STRING", description: "Fecha del servicio si está disponible (YYYY-MM-DD)." }
      },
      required: ["patente", "dueno", "valor", "concepto"],
    },
});

/**
 * Robust JSON parser for LLM outputs.
 */
const cleanAndParseJSON = (text: string): any => {
    try {
        if (!text) return null;
        let cleaned = text.replace(/```json/gi, '').replace(/```/g, '');
        const firstBracket = cleaned.indexOf('[');
        const firstBrace = cleaned.indexOf('{');
        
        // Determine if it's object or array
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

// --- FALLBACK METHOD (DIRECT REST API) ---
const generateContentFallback = async (apiKey: string, prompt: string, contents: any[], schema?: any) => {
    console.warn("Using Fallback REST API for generation...");
    
    const parts = contents.map((c: any) => {
        if (c.mimeType === 'text/plain') return { text: c.data };
        return { inlineData: { mimeType: c.mimeType, data: c.data } };
    });
    
    const generationConfig: any = {
        temperature: 0.1
    };

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
        throw new Error(`Fallback API Error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
};

// --- MAIN SERVICE: TRUCK LOGISTICS ---

export const processDocuments = async (
  contents: { mimeType: string; data: string }[],
  retries = 3
): Promise<TruckRecord[]> => {
  // ... existing implementation for trucks ...
  // Keeping this concise as requested, focusing on changes for Cards
  let lastError: any;
  const apiKey = getApiKey();
  const schema = getResponseSchema();
  const prompt = `Actúa como un sistema experto de ERP. Analiza doc. Extrae: TAG, Patente, Dueño, Valor, Concepto. JSON array.`;

  for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        let textResult = "";
        try {
            const { GoogleGenAI } = await import("@google/genai");
            const ai = new GoogleGenAI({ apiKey });
            const sdkParts = contents.map(c => c.mimeType === 'text/plain' ? { text: c.data } : { inlineData: { mimeType: c.mimeType, data: c.data } });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: { parts: [...sdkParts, { text: prompt }] },
                config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.1 },
            });
            textResult = response.text || "[]";
        } catch (e) {
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
    const apiKey = getApiKey();
    
    // Expanded keywords for extraction
    const keywords = [
        "corredores viales", "autopista", "aubasa", "accesos", "ausol", 
        "camino", "cvsa", "telepeaje", "telepase", "peaje", 
        "mercadopago", "mp", "caminos de las sierras", "tasa", "concesionaria"
    ];

    const prompt = `
        Analiza este resumen de tarjeta de crédito (PDF/Excel) de Argentina.
        
        OBJETIVO 1: Extraer METADATA DEL RESUMEN (Encabezado).
        Busca y extrae:
        - "banco": Nombre del banco (ej: Galicia, Santander, BBVA, Visa, Amex, Mastercard).
        - "titular": Nombre de la persona/empresa titular de la cuenta.
        - "periodo": El rango de fechas del resumen (ej: "Dic 23", "01/01/24 - 31/01/24"). Si no hay rango, usa el mes.
        - "fechaVencimiento": Fecha límite de pago en formato YYYY-MM-DD.
        - "totalResumen": El monto TOTAL A PAGAR (Saldo total) del resumen completo (no solo peajes, el total de la deuda).
        
        OBJETIVO 2: Extraer ITEMS DE PEAJES Y AUTOPISTAS.
        Filtra las filas usando estas palabras clave: ${keywords.join(', ')}.
        - EXCLUYE gastos en dólares o de países limítrofes (Chile, Uruguay, Brasil).
        - "categoria": Siempre "PEAJE".
        - "fecha": YYYY-MM-DD.

        Retorna un OBJETO JSON con dos claves: "metadata" y "items".
    `;
    
    const combinedSchema = {
        type: "OBJECT",
        properties: {
            metadata: {
                type: "OBJECT",
                properties: {
                    banco: { type: "STRING" },
                    titular: { type: "STRING" },
                    periodo: { type: "STRING" },
                    fechaVencimiento: { type: "STRING" },
                    totalResumen: { type: "NUMBER" }
                },
                required: ["banco", "totalResumen", "fechaVencimiento"]
            },
            items: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        fecha: { type: "STRING" },
                        concepto: { type: "STRING" },
                        monto: { type: "NUMBER" },
                        categoria: { type: "STRING", enum: ["PEAJE"] }
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
                const { GoogleGenAI } = await import("@google/genai");
                const ai = new GoogleGenAI({ apiKey });
                
                const sdkParts = contents.map(c => {
                    if (c.mimeType === 'text/plain') return { text: c.data };
                    return { inlineData: { mimeType: c.mimeType, data: c.data } };
                });

                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: { parts: [...sdkParts, { text: prompt }] },
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: combinedSchema as any,
                        temperature: 0.1,
                    },
                });
                textResult = response.text || "{}";
            } catch (importOrSdkErr) {
                 console.error("SDK load failed (Expenses), switching to fallback", importOrSdkErr);
                 textResult = await generateContentFallback(apiKey, prompt, contents, combinedSchema);
            }

            const data = cleanAndParseJSON(textResult);
            
            // Validate structure
            if (!data.metadata || !Array.isArray(data.items)) {
                throw new Error("Formato de respuesta IA incorrecto");
            }

            return data as ProcessedStatementResult;

        } catch (error: any) {
            lastError = error;
            console.warn(`Intento ${attempt} (Gastos) fallido:`, error.message);
            if (attempt < retries) await wait(attempt * 2000);
        }
    }
    
    throw new Error(`Error procesando gastos: ${lastError?.message || 'Fallo desconocido'}`);
};

// --- PDF TO EXCEL CONVERTER ---
export const convertPdfToData = async (
    contents: { mimeType: string; data: string }[]
): Promise<any[]> => {
    // ... existing implementation ...
    const apiKey = getApiKey();
    const prompt = `Analiza PDF. Extrae tabla principal. JSON array.`;
    try {
        let textResult = "";
        try {
            const { GoogleGenAI } = await import("@google/genai");
            const ai = new GoogleGenAI({ apiKey });
            const sdkParts = contents.map(c => ({ inlineData: { mimeType: c.mimeType, data: c.data } }));
            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: { parts: [...sdkParts, { text: prompt }] }, config: { responseMimeType: "application/json" } });
            textResult = response.text || "[]";
        } catch (e) { textResult = await generateContentFallback(apiKey, prompt, contents); }
        return cleanAndParseJSON(textResult);
    } catch (e: any) { throw new Error("Error en conversión PDF: " + e.message); }
};
