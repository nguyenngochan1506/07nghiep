import { env } from "@07nghiep/env/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  AI_CV_SYSTEM_PROMPT,
  buildApplicationFitScorePrompt,
  buildCandidateCvAnalysisPrompt,
} from "../prompts";
import type { AiCvProvider } from "../provider";
import {
  type ApplicationFitScoreInput,
  type ApplicationFitScoreResult,
  applicationFitScoreResultSchema,
  type CandidateCvAnalysisInput,
  type CandidateCvAnalysisResult,
  candidateCvAnalysisResultSchema,
} from "../schemas";

type MessageContent = Anthropic.Messages.Message["content"];
type TextContentBlock = Extract<MessageContent[number], { type: "text" }>;

function extractJsonObject(text: string) {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Anthropic response did not contain a JSON object");
  }

  return text.slice(firstBrace, lastBrace + 1);
}

function extractJsonText(content: MessageContent) {
  const text = content
    .filter((block): block is TextContentBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  return extractJsonObject(text);
}

export class AnthropicCvProvider implements AiCvProvider {
  private readonly client: Anthropic;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required for AnthropicCvProvider");
    }

    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      baseURL: env.ANTHROPIC_URL,
    });
  }

  async analyzeCandidateCv(input: CandidateCvAnalysisInput): Promise<CandidateCvAnalysisResult> {
    const response = await this.client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 4096,
      temperature: 0.2,
      system: AI_CV_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildCandidateCvAnalysisPrompt(input) }],
    });

    return candidateCvAnalysisResultSchema.parse(JSON.parse(extractJsonText(response.content)));
  }

  async scoreApplicationFit(input: ApplicationFitScoreInput): Promise<ApplicationFitScoreResult> {
    const response = await this.client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 3072,
      temperature: 0.1,
      system: AI_CV_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildApplicationFitScorePrompt(input) }],
    });

    return applicationFitScoreResultSchema.parse(JSON.parse(extractJsonText(response.content)));
  }
}
