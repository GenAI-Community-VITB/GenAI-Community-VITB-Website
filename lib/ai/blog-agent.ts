/**
 * AI Summarization Agent for Generative AI Community VIT Bhopal LinkedIn Posts
 * Generates punchy headlines, executive summaries, and topic tags using Gemini / OpenAI.
 */

export interface LinkedInPostAnalysis {
  headline: string;
  summary: string;
  tags: string[];
}

export async function summarizeLinkedInPostWithAI(params: {
  rawContent: string;
  postUrl?: string;
  authorName?: string;
}): Promise<LinkedInPostAnalysis> {
  const { rawContent } = params;
  const cleanContent = rawContent.trim();
  if (!cleanContent) {
    return {
      headline: "GENAI Community Dispatch",
      summary: "Official update from the Generative AI Community at VIT Bhopal.",
      tags: ["GenAI", "Community"],
    };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiApiKey = process.env.OPENAI_API_KEY?.trim();

  const prompt = `You are the lead technical editor for the GENAI Community at VIT Bhopal University.
Analyze the following LinkedIn post from our club and generate:
1. "headline": A crisp, punchy, journalistic headline (max 10 words, no clickbait, highlighting the actual achievement, topic, or event).
2. "summary": A crisp 2-to-3 sentence executive summary explaining what happened, key takeaways, technologies used (e.g. LLMs, Agents, RAG, PyTorch), or event impact.
3. "tags": An array of up to 3 relevant topic tags without '#' (e.g. ["Agentic AI", "Hackathon", "Workshops", "LLMs", "Research"]).

Format your response strictly as valid JSON with keys "headline", "summary", "tags".

LinkedIn Post:
"""
${cleanContent}
"""`;

  // 1. Try Gemini API
  if (geminiApiKey && !geminiApiKey.startsWith("mock-") && geminiApiKey !== "your-gemini-api-key") {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 350,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          return {
            headline: cleanHeadline(parsed.headline) || generateFallbackHeadline(cleanContent),
            summary: cleanSummary(parsed.summary) || generateFallbackSummary(cleanContent),
            tags: cleanTags(parsed.tags, cleanContent),
          };
        }
      }
    } catch (err) {
      console.warn("[Blog AI Agent] Gemini API call skipped/failed:", err);
    }
  }

  // 2. Try OpenAI API (if configured)
  if (openaiApiKey && !openaiApiKey.startsWith("mock-")) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawJson = data.choices?.[0]?.message?.content;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          return {
            headline: cleanHeadline(parsed.headline) || generateFallbackHeadline(cleanContent),
            summary: cleanSummary(parsed.summary) || generateFallbackSummary(cleanContent),
            tags: cleanTags(parsed.tags, cleanContent),
          };
        }
      }
    } catch (err) {
      console.warn("[Blog AI Agent] OpenAI API call skipped/failed:", err);
    }
  }

  // 3. Fallback Heuristic Natural Language Processing Agent
  return {
    headline: generateFallbackHeadline(cleanContent),
    summary: generateFallbackSummary(cleanContent),
    tags: cleanTags([], cleanContent),
  };
}

function cleanHeadline(text?: string): string {
  if (!text) return "";
  return text.replace(/^["'\s]+|["'\s]+$/g, "").replace(/\n+/g, " ").trim();
}

function cleanSummary(text?: string): string {
  if (!text) return "";
  return text.replace(/^["'\s]+|["'\s]+$/g, "").replace(/\n+/g, " ").trim();
}

function cleanTags(tags?: any, fallbackText?: string): string[] {
  if (Array.isArray(tags) && tags.length > 0) {
    const valid = tags
      .map((t) => String(t).replace(/^#/, "").trim())
      .filter((t) => t.length > 0 && t.length < 25);
    if (valid.length > 0) return valid.slice(0, 3);
  }
  return extractKeyTags(fallbackText || "");
}

function generateFallbackHeadline(text: string): string {
  const clean = text.trim().replace(/\n+/g, " ");
  const firstSentence = clean.split(/[.!?\n]/)[0]?.trim() || "GENAI Community Dispatch";
  if (firstSentence.length <= 75) {
    return firstSentence;
  }
  return firstSentence.slice(0, 72) + "...";
}

function generateFallbackSummary(text: string): string {
  const clean = text.trim().replace(/\n+/g, " ");
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length >= 2) {
    return `${sentences[0]} ${sentences[1]}`;
  }
  if (clean.length > 220) {
    return clean.slice(0, 217) + "...";
  }
  return clean;
}

function extractKeyTags(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];

  if (lower.includes("agent") || lower.includes("autonomous") || lower.includes("crewai") || lower.includes("langchain")) {
    tags.push("AI Agents");
  }
  if (lower.includes("hackathon") || lower.includes("won") || lower.includes("winner") || lower.includes("podium")) {
    tags.push("Hackathon");
  }
  if (lower.includes("workshop") || lower.includes("session") || lower.includes("masterclass") || lower.includes("hands-on")) {
    tags.push("Workshop");
  }
  if (lower.includes("research") || lower.includes("paper") || lower.includes("architecture") || lower.includes("attention")) {
    tags.push("Research");
  }
  if (lower.includes("transformer") || lower.includes("llm") || lower.includes("rag") || lower.includes("gemini") || lower.includes("gpt")) {
    tags.push("LLMs");
  }
  if (lower.includes("vision") || lower.includes("diffusion") || lower.includes("multi-modal")) {
    tags.push("Computer Vision");
  }

  if (tags.length === 0) tags.push("GenAI", "Community");
  return tags.slice(0, 3);
}
