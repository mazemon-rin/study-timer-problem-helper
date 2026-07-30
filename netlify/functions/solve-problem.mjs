import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const prompt = `高校生向けの学習支援AIです。画像の問題を慎重に読み取り、読めない情報は推測せず、必ずJSONだけで返してください。形式: {"readable":true,"subject":"","topic":"","problemText":"","missingInformation":[],"hint":"","steps":[],"finalAnswer":"","explanation":"","confidenceNote":""}`;

export default async (request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const body = await request.json();
    const image = String(body.image || "");
    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match || match[2].length > 8_000_000) {
      return Response.json({ error: "画像が大きすぎるか、形式に対応していません" }, { status: 413 });
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{
        role: "user",
        parts: [
          { text: `${prompt} 科目:${body.subject || "AIに判断してもらう"}` },
          { inlineData: { mimeType: match[1], data: match[2] } }
        ]
      }]
    });
    const text = String(result.text || "").replace(/^```json\s*|\s*```$/g, "").trim();
    return Response.json(JSON.parse(text));
  } catch (error) {
    console.error("solve-problem failed:", error?.message || "unknown error");
    return Response.json({ error: "問題を解析できませんでした。API設定と画像を確認してください" }, { status: 500 });
  }
};
