const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

exports.summarizeTranslate = async (req, res) => {
  const text = req.body?.text;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const prompt = `
The following is a personal note written in any language.
Understand the meaning and emotional tone.
Summarize it into ONE clear, natural English sentence that reflects both the situation and the emotion.

Rules:
- Do not add new information
- Do not exaggerate or reduce urgency
- Do not give advice

Note:
${text}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const result = response.text;

    if (!result) throw new Error("Empty Gemini response");

    return res.json({
      result,
      source: "gemini",
    });
  } catch (error) {
    console.error("Gemini SDK error:", error.message);

    // ✅ SAFE FALLBACK
    return res.json({
      result: text,
      source: "fallback",
    });
  }
};
