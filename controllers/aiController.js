export const getAISuggestion = async (req, res) => {
    const { weather, wardrobe } = req.body;

    const prompt = `
You are a smart fashion assistant.

Weather: ${weather}°C

Wardrobe:
${JSON.stringify(wardrobe)}

----------------------------------------
RULES:
- Select EXACTLY:
  • 1 item from tops → return as topId
  • 1 item from bottoms → return as bottomId
  • 1 item from shoes → return as shoesId

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
-tell tempeartion 
- Clearly mention weather type (hot/cold/moderate)
- Explain WHY each item is chosen:
  • top → why suitable
  • bottom → why suitable
  • shoes → why suitable
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
        console.log("Data sent to AI");

        // 🔥 RETRY SYSTEM (VERY IMPORTANT)
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

            if (!data?.choices?.length) {
                continue; // retry
            }

            const text = data.choices[0].message.content;

            try {
                // 🔥 Extract JSON safely
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("No JSON");

                const result = JSON.parse(jsonMatch[0]);

                // 🔥 VALIDATION
                if (
                    typeof result.topId === "number" &&
                    typeof result.bottomId === "number" &&
                    typeof result.shoesId === "number"
                ) {
                    return res.json(result); // ✅ SUCCESS
                }

            } catch (err) {
                console.log("Retrying AI... attempt:", attempt + 1);
            }
        }

        // ❌ after retries fail
        return res.status(500).json({
            error: "AI failed to return valid response after retries"
        });

    } catch (error) {
        console.error("AI ERROR:", error);
        res.status(500).json({ error: "AI request failed" });
    }
};