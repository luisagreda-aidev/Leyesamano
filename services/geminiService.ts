import { GoogleGenAI } from "@google/genai";
import { Source } from "../types";

const SYSTEM_INSTRUCTION = `
Eres "Leyesamano", un asistente legal experto y empático diseñado para ayudar a las personas a encontrar, comprender e interpretar leyes y normativas.
Tu objetivo es actuar como un buscador legal avanzado.

INSTRUCCIONES:
1.  **Contexto Jurisdiccional:** Si se proporciona un País y un Estado/Región, limita estrictamente tus búsquedas y respuestas a la normativa vigente en esa jurisdicción específica. Si la ley es federal/nacional, indícalo. Si es estatal/provincial, indícalo.
2.  **Búsqueda y Verificación:** Utiliza SIEMPRE la herramienta de googleSearch para encontrar la información legal más reciente y relevante (leyes, decretos, códigos, jurisprudencia).
3.  **Interpretación:** No solo cites la ley. Explica qué significa en términos sencillos ("lenguaje claro") para el usuario.
4.  **Asistencia:** Proporciona pasos accionables o consejos generales basados en la ley encontrada.
5.  **Fuentes:** Es CRÍTICO que la información esté fundamentada. Referencia explícitamente las leyes mencionadas (ej. "Según el Artículo 43 de la Constitución de [País]...").
6.  **Descargo de Responsabilidad:** Mantén un tono profesional pero advierte sutilmente que esto es información informativa y no sustituye el consejo de un abogado profesional.
7.  **Idioma:** Responde siempre en Español.
`;

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const searchLegalInfo = async (query: string, country?: string, state?: string): Promise<{ text: string; sources: Source[] }> => {
  try {
    let contextualizedQuery = query;
    let contextString = "";

    if (country) {
      contextString += `País: ${country}`;
    }
    if (state) {
      contextString += `, Estado/Región: ${state}`;
    }

    if (contextString) {
      contextualizedQuery = `Contexto Legal (${contextString}). Pregunta del usuario: ${query}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contextualizedQuery,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "Lo siento, no pude generar una respuesta en este momento.";
    
    // Extract sources from grounding chunks
    const sources: Source[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          sources.push({
            uri: chunk.web.uri,
            title: chunk.web.title || new URL(chunk.web.uri).hostname,
          });
        }
      });
    }

    return { text, sources };
  } catch (error) {
    console.error("Error searching legal info:", error);
    throw new Error("Hubo un error al consultar el asistente legal. Por favor intenta de nuevo.");
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  try {
    // Clean text for better TTS
    const cleanText = text.replace(/[*#_`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').substring(0, 1000); // Limit length for preview speed

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is often female-sounding
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio generated");
    }
    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};