// /api/gemini.js
// Ultra-intelligent Server-Side Brain for KayetBot with Multi-Model Fallback & Engineering Engine
import { GoogleGenAI } from "@google/genai";
import {
  performEngineeringCalculations,
  buildKayetBotSystemInstruction,
  DASHBOARD_MODULES
} from "./engineering-engine.js";

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
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  const { message, currentTab, dashboardContext } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Missing message in request body." });
  }

  // 1. Run server-side calculation engine for high-precision mathematical grounding
  const preCalculations = performEngineeringCalculations(message);

  // 2. Detect dashboard navigation intent directly
  const lowerMsg = message.toLowerCase();
  const matchedNavModules = [];
  for (const mod of DASHBOARD_MODULES) {
    const titleWords = mod.title.toLowerCase().split(/[\s()—/]+/);
    const idKey = mod.id.toLowerCase().replace("tab", "");
    if (
      lowerMsg.includes(idKey) ||
      titleWords.some(w => w.length > 3 && lowerMsg.includes(w) && (lowerMsg.includes("open") || lowerMsg.includes("show") || lowerMsg.includes("jao") || lowerMsg.includes("kholo") || lowerMsg.includes("dekhao") || lowerMsg.includes("calculator")))
    ) {
      matchedNavModules.push(mod);
    }
  }

  // 3. Fallback builder if remote model is unavailable or key is missing
  const buildEngineFallbackReply = (note = "") => {
    let text = note ? `*(Note: ${note})*\n\n` : "";
    if (preCalculations.length > 0) {
      const calc = preCalculations[0];
      text += `### 📐 ${calc.title}\n\n`;
      text += `**Input Parameters:**\n`;
      for (const [k, v] of Object.entries(calc.inputs)) {
        text += `- **${k.replace(/_/g, " ")}**: ${v}\n`;
      }
      text += `\n**Verified Mathematical Outputs:**\n`;
      for (const [k, v] of Object.entries(calc.outputs)) {
        if (typeof v === "object") {
          text += `- **${k.replace(/_/g, " ")}**:\n`;
          for (const [subK, subV] of Object.entries(v)) {
            text += `  * ${subK}: ${subV}\n`;
          }
        } else {
          text += `- **${k.replace(/_/g, " ")}**: ${v}\n`;
        }
      }
      if (calc.action && calc.action.tag) {
        text += `\n\n${calc.action.tag}`;
      }
    } else {
      text += `I am KayetBot, your Asset Integrity & Engineering Assistant. I have full access to all calculations, standards, and dashboard tools.\n\n`;
      text += `Please ask any question about piping wall thickness, ASME Section VIII pressure vessels, API 571 damage mechanisms (CUI, HIC, SSC, HTHA), API 581 consequence, or remaining life in **Hindi, Bengali, Hinglish, or English**.`;
      if (matchedNavModules.length > 0) {
        text += `\n\n[[ACTION:NAVIGATE:${matchedNavModules[0].id}:📋 Open ${matchedNavModules[0].title}]]`;
      }
    }
    return text;
  };

  if (!apiKey) {
    return res.status(200).json({ reply: buildEngineFallbackReply("Server operating with built-in Engineering Engine") });
  }

  // Candidate models in preference order for seamless resilience
  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
    "gemini-2.5-flash"
  ].filter(Boolean);

  const ai = getAIClient(apiKey);
  const systemInstruction = buildKayetBotSystemInstruction(currentTab, dashboardContext);

  // Build enriched prompt incorporating pre-calculated mathematical ground truth
  let promptWithContext = "";
  if (preCalculations.length > 0) {
    promptWithContext += `[VERIFIED SERVER-SIDE ENGINEERING GROUND TRUTH CALCULATIONS (Use these exact verified numbers in your response and maintain formulas & steps)]:
${JSON.stringify(preCalculations, null, 2)}
[/VERIFIED SERVER-SIDE GROUND TRUTH]

`;
  }

  if (matchedNavModules.length > 0) {
    promptWithContext += `[MATCHED DASHBOARD MODULES (Include navigation action tags for these)]:
${matchedNavModules.map(m => `[[ACTION:NAVIGATE:${m.id}:Open ${m.title}]]`).join(" ")}
[/MATCHED DASHBOARD MODULES]

`;
  }

  promptWithContext += `USER QUERY (${currentTab ? `Active Tab: ${currentTab}` : 'General Dashboard'}):
${message}`;

  let reply = "";
  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: promptWithContext,
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });
      if (response && response.text) {
        reply = response.text;
        break;
      }
    } catch (err) {
      lastError = err;
      // Continue to next model if 503, 429, or 404
      continue;
    }
  }

  if (!reply) {
    console.warn("All candidate models failed or unavailable. Falling back to local calculation engine.", lastError?.message);
    reply = buildEngineFallbackReply(lastError ? "Local Calculation Engine active" : "");
  }

  // Ensure action tags from server calculations are present
  if (preCalculations.length > 0) {
    for (const calc of preCalculations) {
      if (calc.action && calc.action.tag && !reply.includes(calc.action.tag.substring(0, 20))) {
        reply += `\n\n${calc.action.tag}`;
      }
    }
  }

  // Ensure navigation tag is present if user asked to open a specific module
  if (matchedNavModules.length > 0) {
    for (const mod of matchedNavModules) {
      const navTag = `[[ACTION:NAVIGATE:${mod.id}:`;
      if (!reply.includes(navTag)) {
        reply += `\n\n[[ACTION:NAVIGATE:${mod.id}:📋 Open ${mod.title}]]`;
      }
    }
  }

  return res.status(200).json({ reply });
}
