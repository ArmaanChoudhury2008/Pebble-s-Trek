import { GoogleGenAI, Type } from "@google/genai";
import { QuestionData } from "../types";

// Initialize the client
// The API key is securely obtained from the environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelId = "gemini-3-flash-preview";

// A curated list of ~60 distinct, bizarre, and funny topics to "train" the app on specific knowledge.
const TOPIC_POOL = [
  "The Great Emu War", "The Dancing Plague of 1518", "Mike the Headless Chicken", "Project Pigeon", "The London Beer Flood",
  "Operation Paul Bunyan", "The War of the Bucket", "Australia's Feral Camels", "Wombat Cube Poop", "The Banana Republics",
  "The Cod Wars", "Exploding Toads of Hamburg", "The Great Molasses Flood", "Samuel Pepys' Buried Cheese", "Napoleon's Rabbit Attack",
  "The Disappearance of Harold Holt", "The Battle of Castle Itter", "Tsutomu Yamaguchi (Double Survivor)", "The Pet Rock Fad", "The Voynich Manuscript",
  "Tarrare the Glutton", "The Erfurt Latrine Disaster", "The Kettle War", "Mary Toft's Rabbits", "Emperor Norton I",
  "The Pig War", "Tulip Mania", "The Cadaver Synod", "Acoustic Kitty", "The Battle of Karánsebes",
  "The Kentucky Meat Shower", "Boston Corbett", "Stubby Sergeant", "Unsinkable Sam", "The Great Stink of London",
  "Heroin as Cough Medicine", "Radium Girls", "Phineas Gage", "The Tanganyika Laughter Epidemic", "1904 Olympic Marathon",
  "Project Habakkuk", "The Zucchini War", "Lichtenstein's Army", "The Ghost Army", "Bat Bombs",
  "Anti-Tank Dogs", "The Coconut Religion", "Lord Timothy Dexter", "The Sale of the Eiffel Tower", "D.B. Cooper",
  "The Gardner Museum Heist", "Max Headroom Incident", "The Toynbee Tiles", "The Bloop", "Lake Nyos",
  "The Door to Hell", "Snake Island", "The Silent Twins", "Phrenology", "Spontaneous Human Combustion"
];

export const generateQuestion = async (previousTopics: string[] = []): Promise<QuestionData> => {
  // Filter out topics that have already been played.
  // We use a loose check to avoid repeating even if the AI slightly modifies the title.
  const availableTopics = TOPIC_POOL.filter(poolTopic => 
    !previousTopics.some(prev => 
      prev.toLowerCase().includes(poolTopic.toLowerCase()) || 
      poolTopic.toLowerCase().includes(prev.toLowerCase())
    )
  );

  let selectedTopic = "";
  let promptTopicInstruction = "";

  if (availableTopics.length > 0) {
    // Pick a random topic from the unused pool
    const randomIndex = Math.floor(Math.random() * availableTopics.length);
    selectedTopic = availableTopics[randomIndex];
    promptTopicInstruction = `1. The topic MUST be: "${selectedTopic}".`;
  } else {
    // Fallback if pool is exhausted (or finding a new random one outside the pool)
    promptTopicInstruction = `1. Select a FUNNY, BIZARRE, or SURPRISING topic (e.g., "Weird Animal Behaviors", "Ridiculous History", "Space Oddities") that is NOT in this list: ${TOPIC_POOL.slice(0, 10).join(", ")}...`;
  }

  const prompt = `
    Generate a "Three Truths and One Lie" trivia challenge.
    
    ${promptTopicInstruction}
    2. Ensure this topic is DIFFERENT from these recently used topics: ${previousTopics.join(", ")}.
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