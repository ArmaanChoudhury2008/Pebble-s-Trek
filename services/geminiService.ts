import { GoogleGenAI, Type } from "@google/genai";
import { QuestionData } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelId = "gemini-3-flash-preview";

export const generateQuestion = async (previousTopics: string[] = []): Promise<QuestionData> => {
  const prompt = `
    Generate a "Three Truths and One Lie" trivia challenge.
    
    1. Select a FUNNY, BIZARRE, or SURPRISING topic (e.g., "Weird Animal Behaviors", "Ridiculous History", "Bizarre Laws", "Space Oddities", "Food Crimes", "Human Body Weirdness").
    2. Avoid these recently used topics: ${previousTopics.slice(-5).join(", ")}.
    3. Generate 4 statements about this topic.
    4. Exactly 3 statements must be FACTUALLY TRUE. **Crucial:** Choose truths that sound ABSURD, UNBELIEVABLE, or HILARIOUS (e.g., "Wombats poop cubes"). The weirder the truth, the better.
    5. Exactly 1 statement must be a LIE (false). **Crucial:** Make the lie sound SOMEWHAT PLAUSIBLE or logical. It should blend in, making it harder to spot against the ridiculous truths.
    6. The goal is to make it tricky and funny. The player should hesitate because the truths sound like lies.
    7. Provide a short, witty explanation revealing the lie.

    Return the response in strictly valid JSON format.
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: {
            type: Type.STRING,
            description: "The general topic of the trivia question."
          },
          statements: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of exactly 4 statements. 3 are true, 1 is a lie."
          },
          lieIndex: {
            type: Type.INTEGER,
            description: "The zero-based index (0-3) of the statement that is the lie."
          },
          explanation: {
            type: Type.STRING,
            description: "A short explanation revealing the lie."
          }
        },
        required: ["topic", "statements", "lieIndex", "explanation"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from AI");
  }

  try {
    return JSON.parse(text) as QuestionData;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    throw new Error("Invalid format from AI");
  }
};