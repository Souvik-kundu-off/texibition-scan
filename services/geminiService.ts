import { GoogleGenAI, Type } from "@google/genai";
import { ExcelRow, ColumnMapping } from "../types";

// Safe API key extraction
const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
};

const apiKey = getApiKey();

// Initialize client only if key exists (handled gracefully in caller)
const getAiClient = () => {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

/**
 * Uses Gemini to analyze Excel headers and first row to determine
 * which columns likely correspond to ID, Name, Team, Event, Email, and Payment.
 */
export const analyzeColumns = async (headers: string[], firstRow: ExcelRow): Promise<ColumnMapping> => {
  const ai = getAiClient();
  
  // Default fallback
  const fallback: ColumnMapping = {
    idColumn: headers[0],
    nameColumn: headers[1] || headers[0],
    emailColumn: headers.find(h => h.toLowerCase().includes('email')) || '',
    teamColumn: headers.find(h => h.toLowerCase().includes('team')) || '',
    eventColumn: headers.find(h => h.toLowerCase().includes('event')) || '',
    paymentColumn: headers.find(h => h.toLowerCase().includes('payment') || h.toLowerCase().includes('status')) || ''
  };

  // Fallback if no API key or AI failure
  if (!ai) {
    console.warn("No API Key found, using naive fallback.");
    return fallback;
  }

  const prompt = `
    I have a dataset with the following headers: ${JSON.stringify(headers)}.
    Here is a sample row of data: ${JSON.stringify(firstRow)}.
    
    I need to map these headers to specific roles for a QR Check-in App.
    Find the best matching header name for each role based on the header name AND the sample data. 
    If a specific role doesn't exist, return an empty string "".

    Roles:
    1. idColumn: The unique identifier (e.g., "1", "A-123", Ticket ID).
    2. nameColumn: The participant's full name.
    3. emailColumn: The participant's email address (looks like user@example.com).
    4. teamColumn: The name of their team, group, or organization (e.g., "Galactic Gladiators").
    5. eventColumn: The name of the event (e.g., "Tech Titans Summit").
    6. paymentColumn: The column indicating payment status. Look for boolean values (TRUE/FALSE) or status words like "Paid", "Done".

    Return a JSON object with keys: idColumn, nameColumn, emailColumn, teamColumn, eventColumn, paymentColumn.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            idColumn: { type: Type.STRING },
            nameColumn: { type: Type.STRING },
            emailColumn: { type: Type.STRING },
            teamColumn: { type: Type.STRING },
            eventColumn: { type: Type.STRING },
            paymentColumn: { type: Type.STRING },
          },
          required: ["idColumn", "nameColumn", "emailColumn", "teamColumn", "eventColumn", "paymentColumn"]
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text) as ColumnMapping;
      
      // Ensure returned columns actually exist in headers (sanity check)
      const validate = (col: string) => headers.includes(col) ? col : "";

      return {
        idColumn: validate(result.idColumn) || fallback.idColumn,
        nameColumn: validate(result.nameColumn) || fallback.nameColumn,
        emailColumn: validate(result.emailColumn) || fallback.emailColumn,
        teamColumn: validate(result.teamColumn) || fallback.teamColumn,
        eventColumn: validate(result.eventColumn) || fallback.eventColumn,
        paymentColumn: validate(result.paymentColumn) || fallback.paymentColumn,
      };
    }
    
    throw new Error("Empty response from AI");

  } catch (error) {
    console.error("Error analyzing columns with Gemini:", error);
    return fallback;
  }
};

/**
 * Generates a friendly welcome message.
 */
export const generateWelcomeMessage = async (row: ExcelRow): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Verification Successful!";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a very short, cheerful welcome message (under 10 words) for a guest. Data: ${JSON.stringify(row)}.`,
    });
    return response.text?.trim() || "Welcome!";
  } catch (e) {
    return "Verification Successful!";
  }
};