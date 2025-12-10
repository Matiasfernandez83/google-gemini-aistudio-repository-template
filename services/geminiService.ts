
import { TruckRecord, ExpenseRecord } from "../types";

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
 * Handles Markdown blocks, stray text, and partial JSON structures.
 */
const cleanAndParseJSON = (text: string): any[] => {
    try {
        if (!text) return [];
        
        // 1. Remove Markdown code blocks (```json ... ```)
        let cleaned = text.replace(/```json/gi, '').replace(/```/g, '');
        
        // 2. Find the outer array brackets [ ... ]
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1) {
            cleaned = cleaned.substring(firstBracket, lastBracket + 1);
        } else {
             // If no brackets found, it might be a single object or invalid. Try wrapping if it looks like an object.
             if (cleaned.trim().startsWith('{')) {
                 cleaned = `[${cleaned}]`;
             }
        }

        // 3. Clean control characters
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
  let lastError: any;
  const apiKey = getApiKey();
  const schema = getResponseSchema();
  const prompt = `
    Actúa como un sistema experto de ERP y contabilidad logística.
    Analiza el documento proporcionado.
    Extrae para cada movimiento: TAG, Patente, Dueño, Valor, Concepto.
    Si encuentras tablas, procesa cada fila.
    Retorna SOLAMENTE un JSON array válido.
  `;

  for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        let textResult = "";

        // TRY 1: OFFICIAL SDK
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
                    responseSchema: schema,
                    temperature: 0.1,
                },
            });
            textResult = response.text || "[]";
            
        } catch (importOrSdkErr) {
            console.error("SDK load failed, switching to fallback", importOrSdkErr);
            textResult = await generateContentFallback(apiKey, prompt, contents, schema);
        }

        const data = cleanAndParseJSON(textResult) as Omit<TruckRecord, 'id'>[];
        
        return data.map((item, index) => ({
            ...item,
            id: `gen-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`
        }));

      } catch (error: any) {
        lastError = error;
        console.warn(`Intento ${attempt} fallido:`, error.message);
        
        if (error.message?.includes('401') || error.message?.includes('API_KEY')) {
            throw new Error("Error de autenticación: API Key inválida.");
        }
        if (attempt < retries) await wait(attempt * 2000);
      }
  }
  
  throw new Error(`Error final: ${lastError?.message || 'No se pudo procesar el archivo.'}`);
};

// --- NEW SERVICE: CREDIT CARD EXPENSES (TOLLS) ---

export const processCardExpenses = async (
    contents: { mimeType: string; data: string }[],
    retries = 3
): Promise<ExpenseRecord[]> => {
    let lastError: any;
    const apiKey = getApiKey();
    
    // Expanded keywords
    const keywords = [
        "corredores viales", "autopista", "aubasa", "accesos", "ausol", 
        "camino", "cvsa", "telepeaje", "telepase", "peaje", 
        "mercadopago", "mp", "caminos de las sierras", "tasa", "concesionaria"
    ];

    const prompt = `
        Actúa como un analista de tarjetas de crédito experto en logística.
        Analiza este resumen de cuenta (PDF o Excel).
        Tu objetivo es extraer ÚNICAMENTE las líneas de gastos correspondientes a PEAJES y AUTOPISTAS de ARGENTINA.
        
        Instrucciones de Filtrado:
        1.  **INCLUIR**: Busca filas donde la descripción contenga palabras clave como: ${keywords.join(', ')}.
            *   Nota: Si dice "MERCADOPAGO" o "MP", inclúyelo solo si el concepto asociado refiere a peajes, telepase o vialidad.
        2.  **EXCLUIR (IMPORTANTÍSIMO)**: NO extraigas ningún gasto que ocurra en el exterior.
            *   Filtra y descarta filas que contengan: "URUGUAY", "UY", "CHILE", "CL", "BRASIL", "BR", "BRAZIL", "MONTEVIDEO", "SANTIAGO". Solo queremos peajes nacionales.

        Instrucciones de Extracción de Datos:
        1. 'concepto': Extrae EL TEXTO COMPLETO Y EXACTO de la columna de descripción. No resumas.
        2. 'categoria': Asigna SIEMPRE el valor "PEAJE".
        3. 'monto': Extrae el valor numérico (pesos).
        4. 'fecha': Extrae la fecha en formato YYYY-MM-DD.
        
        Retorna SOLAMENTE un JSON array.
    `;
    
    const expenseSchema = {
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
                        responseSchema: expenseSchema as any,
                        temperature: 0.1,
                    },
                });
                textResult = response.text || "[]";
            } catch (importOrSdkErr) {
                 console.error("SDK load failed (Expenses), switching to fallback", importOrSdkErr);
                 textResult = await generateContentFallback(apiKey, prompt, contents, expenseSchema);
            }

            const data = cleanAndParseJSON(textResult) as Omit<ExpenseRecord, 'id' | 'sourceFileId' | 'sourceFileName'>[];
            
            return data.map((item, index) => ({
                ...item,
                id: `exp-${Date.now()}-${index}`,
                sourceFileId: '',
                sourceFileName: ''
            }));

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
    const apiKey = getApiKey();
    const prompt = `
        Analiza este documento PDF.
        Identifica la TABLA PRINCIPAL de datos.
        Extrae TODAS las filas y columnas tal cual aparecen.
        Devuelve un JSON array de objetos, donde las claves son los encabezados de la tabla.
        Si hay múltiples páginas, une los datos.
    `;

    try {
        let textResult = "";
        
        try {
            const { GoogleGenAI } = await import("@google/genai");
            const ai = new GoogleGenAI({ apiKey });
            const sdkParts = contents.map(c => ({ inlineData: { mimeType: c.mimeType, data: c.data } }));
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: { parts: [...sdkParts, { text: prompt }] },
                config: {
                    responseMimeType: "application/json"
                }
            });
            textResult = response.text || "[]";
        } catch (e) {
             textResult = await generateContentFallback(apiKey, prompt, contents);
        }

        return cleanAndParseJSON(textResult);

    } catch (e: any) {
        throw new Error("Error en conversión PDF: " + e.message);
    }
};
