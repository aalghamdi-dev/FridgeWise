import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";

dotenv.config();

interface DbSchema {
  fridges: {
    [fridgeId: string]: {
      items: any[];
      history: any[];
      recipes: any[];
    };
  };
  barcodes: {
    barcode: string;
    name: string;
    category: string;
    unit?: string;
    unitSize?: string;
  }[];
}

const DB_FILE = path.join(process.cwd(), "db.json");

async function readDb(): Promise<DbSchema> {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, initialize it with empty fridges and standard barcodes
    const initialDb: DbSchema = {
      fridges: {},
      barcodes: []
    };
    await writeDb(initialDb);
    return initialDb;
  }
}

async function writeDb(db: DbSchema): Promise<void> {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function generateFridgeId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function createUniqueFridgeId(db: DbSchema): Promise<string> {
  let id = generateFridgeId();
  while (db.fridges[id]) {
    id = generateFridgeId();
  }
  return id;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- DATABASE ENDPOINTS ---

  // Verify fridge ID
  app.post("/api/fridge/verify", async (req, res) => {
    try {
      const { fridgeId } = req.body;
      if (!fridgeId || typeof fridgeId !== "string" || fridgeId.length !== 8) {
        return res.status(400).json({ error: "Invalid fridge ID format" });
      }
      const db = await readDb();
      const exists = !!db.fridges[fridgeId];
      res.json({ exists });
    } catch (err: any) {
      console.error("Error verifying fridge:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Create new fridge ID
  app.post("/api/fridge/create", async (req, res) => {
    try {
      const db = await readDb();
      const fridgeId = await createUniqueFridgeId(db);
      db.fridges[fridgeId] = {
        items: [],
        history: [],
        recipes: []
      };
      await writeDb(db);
      res.json({ fridgeId });
    } catch (err: any) {
      console.error("Error creating fridge:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Fetch fridge data
  app.get("/api/fridge/:fridgeId", async (req, res) => {
    try {
      const { fridgeId } = req.params;
      if (!fridgeId || fridgeId.length !== 8) {
        return res.status(400).json({ error: "Invalid fridge ID format" });
      }
      const db = await readDb();
      let fridge = db.fridges[fridgeId];
      if (!fridge) {
        // If it doesn't exist, initialize it on the fly
        fridge = {
          items: [],
          history: [],
          recipes: []
        };
        db.fridges[fridgeId] = fridge;
        await writeDb(db);
      }
      res.json(fridge);
    } catch (err: any) {
      console.error("Error fetching fridge:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Sync fridge data
  app.post("/api/fridge/:fridgeId/sync", async (req, res) => {
    try {
      const { fridgeId } = req.params;
      const { items, history, recipes } = req.body;
      if (!fridgeId || fridgeId.length !== 8) {
        return res.status(400).json({ error: "Invalid fridge ID format" });
      }
      const db = await readDb();
      db.fridges[fridgeId] = {
        items: Array.isArray(items) ? items : [],
        history: Array.isArray(history) ? history : [],
        recipes: Array.isArray(recipes) ? recipes : []
      };
      await writeDb(db);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error syncing fridge:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Fetch shared barcodes
  app.get("/api/barcodes", async (req, res) => {
    try {
      const db = await readDb();
      res.json({ barcodes: db.barcodes });
    } catch (err: any) {
      console.error("Error fetching barcodes:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Add new shared barcode mapping
  app.post("/api/barcodes", async (req, res) => {
    try {
      const { barcode, name, category, unit, unitSize } = req.body;
      if (!barcode || !name || !category) {
        return res.status(400).json({ error: "Missing required fields for barcode mapping" });
      }
      const db = await readDb();
      const exists = db.barcodes.some(b => b.barcode === barcode);
      if (!exists) {
        db.barcodes.push({
          barcode,
          name,
          category,
          unit,
          unitSize
        });
        await writeDb(db);
      }
      res.json({ success: true, barcodes: db.barcodes });
    } catch (err: any) {
      console.error("Error saving barcode:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // API Route for recipe generation proxying to OpenRouter
  app.post("/api/generate-recipes", async (req: express.Request, res: express.Response) => {
    try {
      const { ingredients } = req.body;
      
      const openRouterKey = process.env.OPENROUTER_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;

      const hasOpenRouter = !!(openRouterKey && openRouterKey !== "MY_OPENROUTER_API_KEY" && openRouterKey.trim() !== "");
      const hasGemini = !!(geminiKey && geminiKey !== "MY_GEMINI_API_KEY" && geminiKey.trim() !== "");

      if (!hasOpenRouter && !hasGemini) {
        return res.status(400).json({
          error: "API Key is missing or not configured. Please configure GEMINI_API_KEY in your environment secrets."
        });
      }

      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({
          error: "Please select or provide some ingredients to generate recipes."
        });
      }

      // Format ingredients for the prompt
      const ingredientsText = ingredients.map((ing: any) => {
        return `- ${ing.name} (Qty: ${ing.quantity}, Expiry: ${ing.expiryDate || "N/A"})`;
      }).join("\n");

      const systemPrompt = `You are FridgeWise AI, an expert culinary assistant. 
Your goal is to suggest 2-3 creative, delicious, and easy-to-cook recipes prioritizing the ingredients provided, especially those expiring soon.
The user is providing a list of ingredients in their fridge.

Rules for Recipe Generation:
1. Prioritize ingredients that are expiring soonest.
2. You can include common household pantry items (like oil, salt, pepper, garlic, water, basic spices, flour, sugar) that might not be in their list.
3. If a recipe needs 1-2 additional key ingredients that are NOT in the list, you MUST clearly specify them in a "missingOrPantry" ingredients section and add a clear note in "missingKeyIngredientsNote" explaining exactly what is missing and how they can substitute it or if they need to buy it.
4. For each recipe, return:
   - Name of the recipe
   - Difficulty level (Easy, Medium, Hard)
   - Prep time and Cook time
   - Match Rating / Percentage (how well it uses their expiring items, e.g., 90)
   - Ingredients list (separated into "fromFridge" and "missingOrPantry" - with status such as (Pantry) or (Missing - Need to buy))
   - Step-by-step instructions
   - Brief whyThisRecipe explaining how this uses up expiring ingredients.

You MUST respond ONLY with a clean, valid JSON array of objects. Do not wrap the JSON in markdown code blocks like \`\`\`json ... \`\`\`. Your output must parse directly as JSON.
The JSON structure must look exactly like this:
[
  {
    "name": "Recipe Name",
    "difficulty": "Easy",
    "prepTime": "10 mins",
    "cookTime": "15 mins",
    "matchPercentage": 95,
    "whyThisRecipe": "A perfect way to use up your expiring Spinach and Cream before they spoil.",
    "ingredients": {
      "fromFridge": ["Spinach", "Cream", "Garlic"],
      "missingOrPantry": ["Olive oil (Pantry)", "Parmesan cheese (Missing - 1 item)"]
    },
    "instructions": [
      "Sauté the garlic in olive oil until fragrant.",
      "Add the spinach and cook until wilted.",
      "Stir in the cream and simmer for 5 minutes."
    ],
    "missingKeyIngredientsNote": "Needs Parmesan cheese, but you can substitute with cheddar or skip it."
  }
]`;

      const userPrompt = `Here are the ingredients in my fridge:
${ingredientsText}

Generate 2-3 recipes using these ingredients. Return ONLY the JSON array matching the spec.`;

      let content = "";

      if (!hasOpenRouter && hasGemini) {
        console.log("Using official Google GenAI SDK for recipe generation...");
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
          }
        });

        content = response.text || "";
      } else {
        // Fallback or explicit OpenRouter call
        const apiKeyToUse = openRouterKey || geminiKey;
        let modelId = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash:free";
        
        // Map invalid model IDs and default paid models to the free tier version
        if (modelId === "google/gemini-2.5-flash" || modelId.includes("gemini-3-flash") || modelId.includes("gemini-3.5-flash")) {
          modelId = "google/gemini-2.5-flash:free";
        }

        console.log(`Calling OpenRouter API with model ${modelId}...`);

        // Check if the model supports standard response_format.
        // Google, Anthropic, OpenAI generally do, but third-party models like Tencent might not.
        const supportsJsonFormat = 
          modelId.includes("gemini") || 
          modelId.includes("gpt") || 
          modelId.includes("openai") || 
          modelId.includes("claude");

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKeyToUse}`,
            "HTTP-Referer": process.env.APP_URL || "https://fridgewise.ai",
            "X-Title": "FridgeWise"
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            ...(supportsJsonFormat ? { response_format: { type: "json_object" } } : {}),
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("OpenRouter API error:", errorText);
          return res.status(response.status).json({
            error: `OpenRouter API error: ${response.statusText}`,
            details: errorText
          });
        }

        const data = await response.json();
        content = data.choices?.[0]?.message?.content || "";
      }

      if (!content) {
        throw new Error("Empty response from AI assistant");
      }

      // Try to parse JSON to make sure it's valid
      try {
        let cleanContent = content.trim();

        // Strip markdown code block wrappers if present (e.g. ```json ... ``` or ``` ... ```)
        if (cleanContent.includes("```")) {
          const regex = /```(?:json)?([\s\S]*?)```/i;
          const match = cleanContent.match(regex);
          if (match && match[1]) {
            cleanContent = match[1].trim();
          }
        }

        // If there's still non-JSON junk surrounding the payload (common with chatty models),
        // extract the first valid JSON array/object bounds
        const firstCurly = cleanContent.indexOf('{');
        const firstSquare = cleanContent.indexOf('[');
        let startIdx = -1;
        let endIdx = -1;

        if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
          startIdx = firstCurly;
          endIdx = cleanContent.lastIndexOf('}');
        } else if (firstSquare !== -1) {
          startIdx = firstSquare;
          endIdx = cleanContent.lastIndexOf(']');
        }

        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          cleanContent = cleanContent.substring(startIdx, endIdx + 1);
        }

        const recipes = JSON.parse(cleanContent);
        return res.json({ recipes });
      } catch (parseError) {
        console.error("Failed to parse JSON content from AI:", content);
        return res.status(500).json({
          error: "AI returned invalid JSON format",
          rawContent: content
        });
      }

    } catch (error: any) {
      console.error("Error generating recipes:", error);
      res.status(500).json({ error: error.message || "Failed to generate recipes" });
    }
  });

  // Serve static files in production / Vite middleware in dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
