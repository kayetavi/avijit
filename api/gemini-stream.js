// /api/gemini-stream.js
import { GoogleGenAI } from "@google/genai";
import { buildKayetBotSystemInstruction } from "./engineering-engine.js";

export const config = { runtime: "nodejs" };

let aiClient = null;
function getAIClient(apiKey) {
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method not allowed");
  const apiKey = process.env.GEMINI_API_KEY;
  const { message, currentTab, dashboardContext } = req.body || {};
  if (!message) return res.status(400).end("Missing message");

  if (!apiKey) {
    res.write(`data: ${JSON.stringify({ text: "Gemini API key is not configured. Please set GEMINI_API_KEY in the environment settings." })}\n\n`);
    res.end();
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const ai = getAIClient(apiKey);
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const systemInstruction = buildKayetBotSystemInstruction(currentTab, dashboardContext);

    const streamResponse = await ai.models.generateContentStream({
      model,
      contents: message,
      config: {
        systemInstruction,
        temperature: 0.2
      }
    });

    for await (const chunk of streamResponse) {
      if (chunk && chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
  } catch (err) {
    console.error("Gemini stream error:", err);
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
}
