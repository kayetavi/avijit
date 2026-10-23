// /api/parse-stream-document.js
// Multimodal PDF/Image/Excel Process Stream Data Sheet Extractor with Multi-Model Fallback & Truncation Recovery
import { GoogleGenAI } from "@google/genai";

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

/**
 * Robust JSON Parser with Truncation Recovery & Fallback Stream Extractor
 * Prevents "Unterminated string in JSON" from crashing when documents are large.
 */
function safeParseStreamJson(rawText) {
  if (!rawText) return null;
  let text = rawText.trim();
  // Strip markdown code fences if present
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

  // 1. Direct JSON.parse
  try {
    return JSON.parse(text);
  } catch (err1) {
    console.warn("Direct JSON parse failed, attempting truncated JSON repair:", err1.message);
  }

  // 2. Bracket repair for truncated outputs
  try {
    let repaired = text;
    // Find last closed stream object (look for "}," or "}\n")
    const lastValidTokenIdx = Math.max(
      repaired.lastIndexOf("},"),
      repaired.lastIndexOf("}\n"),
      repaired.lastIndexOf("}")
    );

    if (lastValidTokenIdx > 0) {
      repaired = repaired.slice(0, lastValidTokenIdx + 1);
      // Count open '[' vs ']' and '{' vs '}'
      let openBrackets = 0;
      let openBraces = 0;
      for (const char of repaired) {
        if (char === '[') openBrackets++;
        else if (char === ']') openBrackets--;
        else if (char === '{') openBraces++;
        else if (char === '}') openBraces--;
      }
      while (openBrackets > 0) {
        repaired += "]";
        openBrackets--;
      }
      while (openBraces > 0) {
        repaired += "}";
        openBraces--;
      }

      const parsed = JSON.parse(repaired);
      if (parsed && parsed.streams && parsed.streams.length > 0) {
        console.log(`Repaired truncated JSON successfully. Salvaged ${parsed.streams.length} streams.`);
        return parsed;
      }
    }
  } catch (err2) {
    console.warn("Bracket repair failed, attempting regex stream extraction:", err2.message);
  }

  // 3. Regex Stream Extractor Fallback
  try {
    const streamMatches = [];
    const streamRegex = /\{\s*"streamNo"\s*:\s*"[^"]+"[\s\S]*?\n\s*\}/g;
    let match;
    while ((match = streamRegex.exec(text)) !== null) {
      try {
        const streamObj = JSON.parse(match[0]);
        if (streamObj && streamObj.streamNo) {
          streamMatches.push(streamObj);
        }
      } catch (e) {}
    }

    if (streamMatches.length > 0) {
      console.log(`Extracted ${streamMatches.length} complete streams via regex fallback.`);
      const hasProps = streamMatches.some(s => s.properties && Object.keys(s.properties).length > 0);
      const hasComps = streamMatches.some(s => s.components && Object.keys(s.components).length > 0);
      return {
        title: "Extracted Process Stream Data (Auto-Recovered)",
        sheetCategory: hasProps && hasComps ? "COMBINED" : (hasProps ? "PROPERTIES" : "COMPONENTS"),
        streams: streamMatches,
        engineeringNotes: "Stream dataset successfully recovered from document."
      };
    }
  } catch (err3) {
    console.warn("Regex stream recovery failed:", err3.message);
  }

  return null;
}

export default async function handler(req, res) {
  // Always guarantee JSON response headers
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Only POST is supported." });
  }

  try {
    const { base64, mimeType, textData, files } = req.body || {};

    if (!base64 && !textData && (!files || files.length === 0)) {
      return res.status(400).json({ success: false, error: "Missing document data (base64, files, or textData is required)." });
    }

    // Security Hardening: Validate file uploads against MIME type whitelist and payload boundaries
    const ALLOWED_MIME_TYPES = new Set([
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp"
    ]);
    const MAX_FILES = 10;
    const MAX_BASE64_LENGTH = 35 * 1024 * 1024; // ~25MB file decoded

    if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Unsupported MIME type: '${mimeType}'. Allowed formats: PDF, PNG, JPEG, WEBP.`
      });
    }

    if (base64 && typeof base64 === "string" && base64.length > MAX_BASE64_LENGTH) {
      return res.status(400).json({ success: false, error: "Document payload exceeds 25MB size limit." });
    }

    if (Array.isArray(files)) {
      if (files.length > MAX_FILES) {
        return res.status(400).json({ success: false, error: `Exceeded maximum allowable files limit (${MAX_FILES}).` });
      }
      for (const f of files) {
        if (f.mimeType && !ALLOWED_MIME_TYPES.has(f.mimeType.toLowerCase())) {
          return res.status(400).json({
            success: false,
            error: `File '${f.name || "unnamed"}' has unsupported MIME type '${f.mimeType}'.`
          });
        }
        if (f.base64 && typeof f.base64 === "string" && f.base64.length > MAX_BASE64_LENGTH) {
          return res.status(400).json({ success: false, error: "One or more files exceed the 25MB limit." });
        }
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY is not configured on the server."
      });
    }

    const ai = getAIClient(apiKey);
    if (!ai) {
      return res.status(500).json({ success: false, error: "Failed to initialize Gemini AI client." });
    }

    const promptText = `
You are a senior refinery chemical engineer and process material balance data analyst.
Inspect this engineering Heat and Material Balance (H&MB) document / Stream Data Sheet / Component Data table (from refinery, petrochemical, or chemical plant).

The input may contain ONE or MULTIPLE documents/pages/images:
1. "STREAM DATA (PHYSICAL & THERMODYNAMIC PROPERTIES)" sheet (showing Flow Mass, Flow Molar, Std Liq/Vapor Flow, Temperature, Pressure, Pseudo Crit Temp/Press, Liquid Density, Specific Gravity, Viscosity, Specific Heat, Enthalpy, etc. for streams like 100, 100A, 100B, 100C, 100D, etc.).
2. "COMPONENT DATA MASS / MOLAR" sheet (showing component breakdown like H2, H2O, H2S, NH3, Methane, Ethane, Propane, Butanes, Naphtha, Diesel, VGO, etc. for streams like 172A, 173, etc.).
3. Or MULTIPLE files/pages (e.g. Document 1 contains physical properties and Document 2 contains chemical component compositions).

CRITICAL MULTI-DOCUMENT / MULTI-PAGE FUSION INSTRUCTION:
If multiple documents or pages are provided, correlate and match the process streams by their Stream Number / Tag (e.g. "100", "100A", "172A", "173", etc.). Merge both sets of information into unified stream objects so each stream contains BOTH its operating/physical 'properties' and its chemical 'components' breakdown. If a stream appears in only one document, include it as well.

CRITICAL COMPLETE EXTRACTION & TOKEN OPTIMIZATION RULES:
1. Extract EVERY SINGLE stream present across all pages and sheets (e.g., from stream 1 up to stream 475+). Do NOT stop or truncate early.
2. In 'components': ONLY include components that have non-zero or positive values (value > 0). DO NOT output zero entries (e.g., do NOT output "H2": 0, "H2S": 0). This keeps the JSON compact so hundreds of streams fit easily.
3. In 'properties': Include standard physical/thermodynamic properties present in the document. Omit empty or null fields.
4. Be strictly factual with stream numbers and numeric values. Output as many streams as exist in the document without stopping.

Return strictly a JSON object with this exact structure:
{
  "title": "Document Title (e.g. STREAM & COMPONENT DATA (SOR CASE) - RESID PROCESSING AND TREATING UNIT RPTU - NUMALIGARH REFINERY LIMITED)",
  "sheetCategory": "COMBINED",
  "streams": [
    {
      "streamNo": "100",
      "content": "VR FEED",
      "streamName": "VR FEED",
      "massFlow": 249999,
      "molarFlow": 354.0,
      "stdLiqFlow": 239.0,
      "stdVaporFlow": null,
      "condLiqFlow": 258.8,
      "tempC": 172,
      "pressKgCm2": 6.7,
      "properties": {
        "Flow Mass (kg/hr)": 249999,
        "Flow Molar (kg-mol/hr)": 354.0,
        "Flow Standard (Liq) (m3/hr@15.6C)": 239.0,
        "Flow Condition (Liq) (m3/hr)": 258.8,
        "Temperature (°C)": 172,
        "Pressure (kg/cm2 (g))": 6.7,
        "Pseudo Crit Temp (°C)": 813,
        "Pseudo Crit Press (kg/cm2)": 10.75,
        "Wt% Vaporized (%)": 0.0,
        "Liquid Density (kg/m3)": 965.9,
        "Specific Gravity": 1.048,
        "Liquid Viscosity (cP)": 133.376,
        "Total Sp. Enthalpy (kcal/kg)": 71.6
      },
      "components": {
        "DIESEL": 12500,
        "VR RESID": 210000
      }
    }
  ],
  "engineeringNotes": "Summary of observations"
}
`;

    const contents = [];

    if (Array.isArray(files) && files.length > 0) {
      files.forEach((f) => {
        if (!f.base64) return;
        const cleaned = f.base64.includes(",") ? f.base64.split(",")[1] : f.base64;
        contents.push({
          inlineData: {
            mimeType: f.mimeType || "application/pdf",
            data: cleaned
          }
        });
      });
    } else if (base64 && mimeType) {
      const cleanedBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
      contents.push({
        inlineData: {
          mimeType: mimeType,
          data: cleanedBase64
        }
      });
    }

    if (textData) {
      contents.push({
        text: `Document text data:\n\n${textData}`
      });
    }

    contents.push({
      text: promptText
    });

    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite"
    ];

    let lastError = null;

    for (const modelName of candidateModels) {
      // Allow up to 2 attempts per candidate model for transient 503 high demand spikes
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
              maxOutputTokens: 65536
            }
          });

          const textOutput = response.text ? response.text.trim() : "";
          if (!textOutput) continue;

          const parsedData = safeParseStreamJson(textOutput);

          if (parsedData && parsedData.streams && parsedData.streams.length > 0) {
            // Normalize streams
            parsedData.streams.forEach(s => {
              if (!s.components) s.components = {};
              if (!s.properties) s.properties = {};
              if ((!s.massFlow || s.massFlow === 0) && Object.keys(s.components).length > 0) {
                s.massFlow = Object.values(s.components).reduce((sum, v) => sum + (Number(v) || 0), 0);
              }
            });

            return res.status(200).json({
              success: true,
              model: modelName,
              data: parsedData
            });
          }
        } catch (err) {
          lastError = err;
          const isTransient = err?.status === 503 ||
            (err?.message && (err.message.includes("503") || err.message.includes("high demand") || err.message.includes("429")));

          if (isTransient && attempt === 1) {
            // Short backoff before second attempt on transient capacity spike
            await new Promise(r => setTimeout(r, 1200));
            continue;
          }
          break; // Switch to next candidate model
        }
      }
    }

    const errorMsg = lastError?.message?.includes("503")
      ? "AI models are currently experiencing high demand. Please try again in a few moments."
      : (lastError?.message || "All candidate models failed to extract structured stream data.");

    throw new Error(errorMsg);
  } catch (error) {
    console.error("Error in parse-stream-document handler:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to extract stream data from document",
      details: error.message
    });
  }
}
