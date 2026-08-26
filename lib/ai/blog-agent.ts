/**
 * AI Summarization Agent for LinkedIn Club Posts
 * Summarizes long-form LinkedIn posts into crisp, punchy headlines & summaries.
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
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // If Gemini API Key is available, use Gemini Generative Language API
  if (apiKey && !apiKey.startsWith("mock-")) {
    try {
      const prompt = `You are the lead tech editor for the GENAI Community VIT Bhopal student club.
Analyze the following LinkedIn post from our social media team and generate:
1. A punchy, exciting headline (max 10 words).
2. A crisp 2-sentence executive summary highlighting the key takeaway, technical insight, or milestone.
3. Up to 3 relevant hashtags/topic tags (without the # symbol, e.g. "Agentic AI", "Hackathon", "Workshop").

Format your output strictly as a valid JSON object with keys: "headline", "summary", "tags" (array of strings). Do not include markdown codeblocks or extra text.

LinkedIn Post Content:
"""
${rawContent}
"""`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 300,
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
            headline: parsed.headline || generateFallbackHeadline(rawContent),
            summary: parsed.summary || generateFallbackSummary(rawContent),
            tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 3) : ["GenAI", "Community"],
          };
        }
      }
    } catch (aiErr) {
      console.warn("[Blog AI Agent] Gemini API call skipped/failed, using heuristic agent:", aiErr);
    }
  }

  // Heuristic Natural Language Processing Fallback Agent
  return {
    headline: generateFallbackHeadline(rawContent),
    summary: generateFallbackSummary(rawContent),
    tags: extractKeyTags(rawContent),
  };
}

function generateFallbackHeadline(text: string): string {
  const clean = text.trim().replace(/\n+/g, " ");
  const firstSentence = clean.split(/[.!?]/)[0]?.trim() || "Latest Update from GENAI Community";
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
  if (clean.length > 200) {
    return clean.slice(0, 197) + "...";
  }
  return clean;
}

function extractKeyTags(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];

  if (lower.includes("agent") || lower.includes("autonomous")) tags.push("AI Agents");
  if (lower.includes("hackathon") || lower.includes("won") || lower.includes("winner")) tags.push("Hackathon");
  if (lower.includes("workshop") || lower.includes("session") || lower.includes("masterclass")) tags.push("Workshop");
  if (lower.includes("research") || lower.includes("paper") || lower.includes("model")) tags.push("Research");
  if (lower.includes("transformer") || lower.includes("llm")) tags.push("LLMs");

  if (tags.length === 0) tags.push("LinkedIn", "Community");
  return tags.slice(0, 3);
}
