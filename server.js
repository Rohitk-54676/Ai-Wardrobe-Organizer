// =============================================
//   WARDAI — SERVER.JS
//   All routes + controllers merged
// =============================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));


// ─────────────────────────────────────────────
//   IN-MEMORY WARDROBE STORE
// ─────────────────────────────────────────────
let wardrobe = [];


// ─────────────────────────────────────────────
//   WARDROBE ROUTES
// ─────────────────────────────────────────────

app.post("/api/wardrobe", (req, res) => {
  const item = {
    id:           Date.now(),
    type:         req.body.type,
    originalType: req.body.originalType || req.body.type,
    color:        req.body.color,
    image:        req.body.image,
    occasion:     req.body.occasion
  };
  wardrobe.push(item);
  res.json({ message: "Item added", item });
});

app.get("/api/wardrobe", (req, res) => {
  res.json(wardrobe);
});

app.delete("/api/wardrobe/:id", (req, res) => {
  const id = parseInt(req.params.id);
  wardrobe  = wardrobe.filter(item => item.id !== id);
  res.json({ message: "Item deleted" });
});


// ─────────────────────────────────────────────
//   AI OUTFIT SUGGESTION
// ─────────────────────────────────────────────

app.post("/api/ai/suggest", async (req, res) => {
  const { weather, wardrobe: wb } = req.body;

  const prompt = `
You are a smart fashion assistant.
Weather: ${weather}°C
Wardrobe:
${JSON.stringify(wb)}
----------------------------------------
RULES:
- Select EXACTLY:
  • 1 item from tops    → return as topId
  • 1 item from bottoms → return as bottomId
  • 1 item from shoes   → return as shoesId
- Do NOT mix categories
- Do NOT skip any category
- Do NOT invent items
- Return ONLY IDs (numbers)
----------------------------------------
WEATHER LOGIC:
- If >30°C → hot → choose light & breathable clothes (avoid jackets)
- If <15°C → cold → prefer warm clothing
- Otherwise → moderate
----------------------------------------
SUMMARY (VERY IMPORTANT):
- Start with temperature (e.g., "At 30°C...")
- Mention weather type (hot/cold/moderate)
- Explain WHY each item is chosen (top, bottom, shoes)
- Explain WHY other clothes were avoided
- Keep it natural and human-like
- DO NOT mention IDs
----------------------------------------
OUTPUT (STRICT JSON ONLY):
{
  "topId": number,
  "bottomId": number,
  "shoesId": number,
  "summary": "clear explanation"
}
`;

  try {
    console.log("Sending outfit request to AI...");

    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3-8b-instruct",
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await response.json();
      if (!data?.choices?.length) continue;

      const text = data.choices[0].message.content;

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON");
        const result = JSON.parse(jsonMatch[0]);

        if (
          typeof result.topId    === "number" &&
          typeof result.bottomId === "number" &&
          typeof result.shoesId  === "number"
        ) {
          return res.json(result);
        }
      } catch (err) {
        console.log("Retrying AI... attempt:", attempt + 1);
      }
    }

    return res.status(500).json({ error: "AI failed after retries" });

  } catch (error) {
    console.error("AI suggestion error:", error);
    res.status(500).json({ error: "AI request failed" });
  }
});


// ─────────────────────────────────────────────
//   FASHION CHATBOT
// ─────────────────────────────────────────────

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  const systemPrompt = `You are StyleBot, a witty and knowledgeable AI fashion assistant for WardAI.
You ONLY answer questions related to:
- Fashion, clothing, style, outfits, and trends
- Wardrobe organization and management  
- Dressing for occasions (casual, formal, party, sports, etc.)
- Color coordination and outfit combinations
- Seasonal and weather-based clothing advice
- Clothing care, fabric types, and maintenance
- Shopping tips for clothes and accessories
- Personal style development and confidence

If the user asks ANYTHING outside these fashion/wardrobe topics, politely decline with a short message like:
"I'm StyleBot, your fashion assistant! I can only help with clothing and style questions 👗"
Then suggest a fashion-related topic they could ask about instead.

Keep responses concise (2-4 sentences max), friendly, and practical. Use emojis occasionally.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3-8b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        max_tokens: 350
      })
    });

    const data = await response.json();
    if (!data?.choices?.length) return res.status(500).json({ error: "No AI response" });

    return res.json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Chat failed" });
  }
});


// ─────────────────────────────────────────────
//   SERVE FRONTEND
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


// ─────────────────────────────────────────────
//   START SERVER
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✦ WardAI server running → http://localhost:${PORT}`);
});