import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface AiResult {
  aiTitle: string;
  aiSummary: string;
  aiTags: string[];
  aiCategory: string;
}

export async function analyzeContent(input: {
  url: string;
  platform: string;
  title?: string | null;
  description?: string | null;
  content?: string | null;
  authorName?: string | null;
}): Promise<AiResult> {
  const contentText = [
    input.content,
    input.description,
    input.title,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Truncate to avoid token waste
  const truncated = contentText.substring(0, 3000);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `다음 콘텐츠를 분석해서 JSON으로만 응답해줘. 다른 텍스트 없이 순수 JSON만.

원본 URL: ${input.url}
플랫폼: ${input.platform}
작성자: ${input.authorName || "알 수 없음"}
원본 제목: ${input.title || "없음"}
본문/설명:
${truncated || "없음"}

응답 형식 (JSON만):
{
  "aiTitle": "한국어로 핵심을 담은 깔끔한 제목 (20자 이내)",
  "aiSummary": "핵심 내용 2~3줄 요약 (한국어)",
  "aiTags": ["태그1", "태그2", "태그3"],
  "aiCategory": "기술|디자인|비즈니스|자기계발|건강|엔터테인먼트|기타 중 하나"
}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Parse JSON from response (handle potential markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`AI response is not valid JSON: ${text}`);
  }

  const result: AiResult = JSON.parse(jsonMatch[0]);

  // Validate required fields
  if (!result.aiTitle || !result.aiSummary || !result.aiCategory) {
    throw new Error(`AI response missing required fields: ${text}`);
  }

  return result;
}
