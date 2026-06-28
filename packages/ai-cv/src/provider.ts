import { env } from "@07nghiep/env/server";
import { AnthropicCvProvider } from "./providers/anthropic";
import type {
  ApplicationFitScoreInput,
  ApplicationFitScoreResult,
  CandidateCvAnalysisInput,
  CandidateCvAnalysisResult,
} from "./schemas";

export interface AiCvProvider {
  analyzeCandidateCv(input: CandidateCvAnalysisInput): Promise<CandidateCvAnalysisResult>;
  scoreApplicationFit(input: ApplicationFitScoreInput): Promise<ApplicationFitScoreResult>;
}

export function createAiCvProvider(): AiCvProvider {
  if (env.AI_PROVIDER === "anthropic") {
    return new AnthropicCvProvider();
  }

  throw new Error(`Unsupported AI provider: ${env.AI_PROVIDER}`);
}
