import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: { responseMimeType: "application/json" } 
});

export const recognizeHandDrawnShape = async (base64Image: string) => {
  const prompt = `
    Analyze this sketch. If it's a circle, rectangle, triangle, or arrow, return:
    { "shape": "circle", "x": number, "y": number, "width": number, "height": number }
    Only return valid JSON.
  `;

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: base64Image, mimeType: "image/png" } }
  ]);

  return JSON.parse(result.response.text());
};