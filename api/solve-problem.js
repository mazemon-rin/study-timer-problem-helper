import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";
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
    const request = {
      config: { responseMimeType: "application/json" },
      contents: [{ role: "user", parts: [
        { text: `${prompt} 科目:${body.subject || "AIに判断してもらう"}` },
        { inlineData: { mimeType: match[1], data: match[2] } }
      ] }]
    };
    let result;
    try {
      result = await ai.models.generateContent({ ...request, model: MODEL });
    } catch (error) {
      if (!/503|high demand|unavailable/i.test(String(error?.message || "")) || MODEL === FALLBACK_MODEL) throw error;
      console.warn(`Gemini model busy; retrying with ${FALLBACK_MODEL}`);
      result = await ai.models.generateContent({ ...request, model: FALLBACK_MODEL });
    }
    const raw = String(result.text || "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Gemini returned no JSON");
    return response.status(200).json(JSON.parse(raw.slice(start, end + 1)));
  } catch (error) {
    const message = String(error?.message || "unknown error");
    console.error("solve-problem failed:", message);

    // APIキー自体は返さず、設定確認に必要な原因だけを分類します。
    let errorMessage = "Gemini APIとの通信に失敗しました。Vercelの設定を確認してください";
    if (/not found|not supported|model/i.test(message)) {
      errorMessage = `Geminiモデルを利用できません。GEMINI_MODELを「${MODEL}」に設定してください`;
    } else if (/api key|permission|unauthorized|401|403/i.test(message)) {
      errorMessage = "Gemini APIキーが無効、またはAPIの利用権限がありません。VercelのProduction環境変数を確認してください";
    } else if (/quota|rate limit|429|resource exhausted/i.test(message)) {
      errorMessage = "Gemini APIの利用上限に達した可能性があります。Google AI Studioの利用状況を確認してください";
    } else if (/json|unexpected token/i.test(message)) {
      errorMessage = "Geminiの回答形式を読み取れませんでした。もう一度画像を解析してください";
    }
    return response.status(502).json({ error: errorMessage });
  }
}
