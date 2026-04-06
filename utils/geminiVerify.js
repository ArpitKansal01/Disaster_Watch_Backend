const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function geminiVerifyDisaster(fileBuffer, mimeType) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
    });

    const base64Image = fileBuffer.toString("base64");

    const prompt = `
Analyze this image and identify disaster type if it is a real image not ai generated.

Return ONLY ONE WORD from this list:
fire, flood, landslide, damaged_buildings, fallen_trees, no_disaster

Do not explain.
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text().trim().toLowerCase();

    return text;
  } catch (error) {
    console.error("Gemini error:", error.message);
    return null;
  }
}

module.exports = geminiVerifyDisaster;
