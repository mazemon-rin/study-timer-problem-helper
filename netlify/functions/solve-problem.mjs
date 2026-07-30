import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
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
    if (!process.env.GEMINI_API_KEY) return Response.json({ error: "NetlifyにGEMINI_API_KEYが登録されていません" }, { status: 500 });
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await ai.models.generateContent({
      model: MODEL,
      config: { responseMimeType: "application/json" },
      contents: [{
        role: "user",
        parts: [
          { text: `${prompt} 科目:${body.subject || "AIに判断してもらう"}` },
          { inlineData: { mimeType: match[1], data: match[2] } }
        ]
      }]
    });
    const raw = String(result.text || "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Gemini returned no JSON");
    return Response.json(JSON.parse(raw.slice(start, end + 1)));
  } catch (error) {
    const message = String(error?.message || "");
    console.error("solve-problem failed:", message);
    if (/401|403|API key|API_KEY|permission|unauthorized/i.test(message)) return Response.json({ error: "Gemini APIキーが拒否されました。キーを確認してください" }, { status: 502 });
    if (/404|not found|model/i.test(message)) return Response.json({ error: "Geminiモデルを利用できません。GEMINI_MODELを確認してください" }, { status: 502 });
    if (/JSON|parse/i.test(message)) return Response.json({ error: "Geminiの返答を読み取れませんでした。もう一度試してください" }, { status: 502 });
    return Response.json({ error: "Gemini APIとの通信に失敗しました。Netlifyの設定を確認してください" }, { status: 502 });
  }
};
