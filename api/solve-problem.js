import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const prompt = `高校生向けの学習支援AIです。画像の問題を慎重に読み取り、読めない情報は推測せず、必ずJSONだけで返してください。形式: {"readable":true,"subject":"","topic":"","problemText":"","missingInformation":[],"hint":"","steps":[],"finalAnswer":"","explanation":"","confidenceNote":""}`;

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).send("Method Not Allowed");
  try {
    const body = request.body || {};
    const image = String(body.image || "");
    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match || match[2].length > 8_000_000) return response.status(413).json({ error: "画像が大きすぎるか、形式に対応していません" });
    if (!process.env.GEMINI_API_KEY) return response.status(500).json({ error: "VercelにGEMINI_API_KEYが登録されていません" });
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await ai.models.generateContent({
      model: MODEL,
      config: { responseMimeType: "application/json" },
      contents: [{ role: "user", parts: [
        { text: `${prompt} 科目:${body.subject || "AIに判断してもらう"}` },
        { inlineData: { mimeType: match[1], data: match[2] } }
      ] }]
    });
    const raw = String(result.text || "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Gemini returned no JSON");
    return response.status(200).json(JSON.parse(raw.slice(start, end + 1)));
  } catch (error) {
    console.error("solve-problem failed:", error?.message || "unknown error");
    return response.status(502).json({ error: "Gemini APIとの通信に失敗しました。Vercelの設定を確認してください" });
  }
}
