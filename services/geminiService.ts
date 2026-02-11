import { GoogleGenAI, Type, SchemaShared } from "@google/genai";
import { QuestionData } from "../types";

// Initialize the client
// The API key is securely obtained from the environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using gemini-2.5-flash for better stability with JSON schema generation in this context
const modelId = "gemini-2.5-flash";

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

// Fallback data to use when API quota is exhausted (429 errors)
const FALLBACK_QUESTIONS: QuestionData[] = [
  {
    topic: "The Great Emu War",
    statements: [
      "The Australian government declared war on emus in 1932.",
      "Soldiers used Lewis machine guns, but the emus dodged most bullets.",
      "The emus formally surrendered after 10,000 rounds were fired.",
      "The military commander said the emus had the invulnerability of tanks."
    ],
    lieIndex: 2,
    explanation: "The emus never surrendered! In fact, the military withdrew, effectively conceding victory to the birds. The 'war' was a failure."
  },
  {
    topic: "Mike the Headless Chicken",
    statements: [
      "Mike lived for 18 months after his head was cut off.",
      "His owner fed him with an eyedropper directly into his gullet.",
      "Mike eventually died because he choked on a corn kernel.",
      "Mike grew a new, smaller head after 3 months."
    ],
    lieIndex: 3,
    explanation: "Mike did not grow a new head. He survived because the axe missed his jugular vein and left enough brain stem to control basic functions."
  },
  {
    topic: "The Dancing Plague of 1518",
    statements: [
      "Hundreds of people in Strasbourg danced uncontrollably for days.",
      "Authorities encouraged more dancing, hiring musicians to cure them.",
      "It started with a single woman named Frau Troffea.",
      "The dancers were possessed by a funky alien rhythm signal."
    ],
    lieIndex: 3,
    explanation: "There were no aliens. Theories range from mass hysteria to ergot poisoning, but it was a strictly terrestrial (and terrifying) psychological phenomenon."
  },
   {
    topic: "Wombat Poop",
    statements: [
      "Wombats are the only animals known to produce cube-shaped poop.",
      "They use the cubes to mark territory so they don't roll away.",
      "Their intestines have elastic ridges that mold the shape.",
      "They stack the cubes into small pyramids to attract mates."
    ],
    lieIndex: 3,
    explanation: "Wombats do mark territory, but they don't build pyramids to attract mates. The shape helps the poop stay on rocks and logs without rolling off."
  },
  {
    topic: "Project Pigeon",
    statements: [
      "During WWII, the US developed a missile guidance system using pigeons.",
      "The pigeons were trained to peck at a target on a screen inside the missile.",
      "The project was cancelled because the pigeons got motion sickness.",
      "B.F. Skinner, the famous psychologist, was behind the project."
    ],
    lieIndex: 2,
    explanation: "The project wasn't cancelled due to motion sickness; it was cancelled because the military found the idea too absurd and impractical compared to electronic guidance."
  },
  {
    topic: "The London Beer Flood",
    statements: [
      "A giant vat of porter burst, unleashing a tsunami of beer.",
      "Eight people drowned in the beer or died from injuries.",
      "The brewery was prosecuted and fined heavily for negligence.",
      "Rescuers had to stop people from drinking the floodwaters."
    ],
    lieIndex: 2,
    explanation: "The brewery was actually NOT fined. The judge ruled it an 'Act of God', and the victims' families received no compensation."
  },
  {
    topic: "Napoleon's Rabbit Attack",
    statements: [
      "Napoleon organized a rabbit hunt to celebrate a treaty.",
      "The rabbits were tame farm rabbits, not wild hares.",
      "Instead of fleeing, the rabbits swarmed Napoleon in a hungry horde.",
      "Napoleon drew his sword and fought them off single-handedly."
    ],
    lieIndex: 3,
    explanation: "Napoleon didn't fight them off; he fled! He retreated to his carriage, and the rabbits reportedly even climbed into it."
  },
  {
    topic: "Operation Paul Bunyan",
    statements: [
      "The US military launched a massive operation just to cut down a tree.",
      "It involved 800 soldiers, helicopters, B-52 bombers, and an aircraft carrier.",
      "The tree was in the Korean DMZ and blocked a view.",
      "The tree fought back by dropping a heavy branch on a tank."
    ],
    lieIndex: 3,
    explanation: "The tree did not fight back. It was a Poplar tree. The massive show of force was a response to an earlier incident where soldiers were killed trying to trim it."
  },
  {
    topic: "The Banana Republics",
    statements: [
      "The term was coined by writer O. Henry.",
      "It originally referred to countries whose economy depended on bananas.",
      "Banana companies actually overthrew governments to protect profits.",
      "Banana Republic clothing store was founded by a former dictator."
    ],
    lieIndex: 3,
    explanation: "The clothing store was founded by Mel and Patricia Ziegler in California, having nothing to do with actual dictators (other than the safari aesthetic)."
  },
  {
    topic: "Viking Navigation",
    statements: [
      "Vikings used 'sunstones' to locate the sun on cloudy days.",
      "They navigated by the stars and coastal landmarks.",
      "They trained ravens to fly towards land.",
      "They had magnetic compasses made from floating needles."
    ],
    lieIndex: 3,
    explanation: "Vikings did not have magnetic compasses. The magnetic compass wasn't used in Europe until much later (around the 12th-13th century)."
  }
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

  // Helper to get fallback data
  const getFallbackQuestion = (prev: string[]) => {
    // Filter fallback questions that haven't been used yet
    const availableFallback = FALLBACK_QUESTIONS.filter(q => 
      !prev.some(p => p.toLowerCase().includes(q.topic.toLowerCase()))
    );
    
    // If all used, just pick a random one from full list
    const pool = availableFallback.length > 0 ? availableFallback : FALLBACK_QUESTIONS;
    const randomIndex = Math.floor(Math.random() * pool.length);
    console.log("Serving fallback question:", pool[randomIndex].topic);
    return pool[randomIndex];
  };

  // Retry logic for robustness
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [{ parts: [{ text: prompt }] }],
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
          } as SchemaShared
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response text from AI");
      }

      const parsed = JSON.parse(text) as QuestionData;
      
      // Basic validation
      if (!parsed.statements || parsed.statements.length !== 4) {
        throw new Error("Invalid number of statements returned");
      }
      
      return parsed;
    } catch (e: any) {
      console.warn(`Attempt ${attempt + 1} failed:`, e);
      lastError = e;
      
      // If we hit a quota limit, stop retrying immediately and use fallback
      if (e.message?.includes("429") || e.status === 429 || JSON.stringify(e).includes("RESOURCE_EXHAUSTED")) {
         console.warn("Quota exceeded, switching to fallback mode.");
         break;
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  // If we reach here, API failed (either retries exhausted or quota hit).
  // Serve fallback content instead of crashing.
  console.warn("Generating question failed, using fallback content.");
  return getFallbackQuestion(previousTopics);
};
