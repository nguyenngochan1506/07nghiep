import { candidateJobMatchSchema } from "@07nghiep/ai-cv";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { enqueueCandidateAnalysisSafely } from "../lib/ai-cv/enqueue";
import { reserveCandidateCvQuota } from "../lib/ai-cv/quota";
import { candidateProcedure, router } from "../lib/api";

const recommendedMatchesSchema = z.array(candidateJobMatchSchema);

export const cvAnalysisRouter = router({
  createFromCurrentResume: candidateProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const profile = await ctx.prisma.profile.findUnique({
      where: { userId: ctx.user.id },
      select: { resumeUrl: true },
    });

    if (!profile?.resumeUrl) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Upload a resume before requesting CV analysis.",
      });
    }

    const activeAnalysis = await ctx.prisma.candidateCvAnalysis.findFirst({
      where: { userId: ctx.user.id, status: { in: ["PENDING", "PROCESSING"] } },
      orderBy: { createdAt: "desc" },
    });

    if (activeAnalysis) {
      return activeAnalysis;
    }

    await reserveCandidateCvQuota(ctx.prisma, ctx.user.id);

    const analysis = await ctx.prisma.candidateCvAnalysis.create({
      data: {
        userId: ctx.user.id,
        resumeUrl: profile.resumeUrl,
        resumeTextHash: "",
        status: "PENDING",
        extractedSkills: [],
        quotaReservedAt: new Date(),
      },
    });

    await enqueueCandidateAnalysisSafely(ctx.prisma, analysis.id);

    return analysis;
  }),

  myLatest: candidateProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }

    return ctx.prisma.candidateCvAnalysis.findFirst({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  getRecommendedJobs: candidateProcedure
    .input(z.object({ analysisId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }

      const analysis = input?.analysisId
        ? await ctx.prisma.candidateCvAnalysis.findFirst({
            where: { id: input.analysisId, userId: ctx.user.id },
          })
        : await ctx.prisma.candidateCvAnalysis.findFirst({
            where: { userId: ctx.user.id },
            orderBy: { createdAt: "desc" },
          });

      if (!analysis || analysis.status !== "COMPLETED" || !analysis.recommendedMatches) {
        return { status: analysis?.status ?? "PENDING", jobs: [] };
      }

      const matchesResult = recommendedMatchesSchema.safeParse(analysis.recommendedMatches);
      if (!matchesResult.success || matchesResult.data.length === 0) {
        return { status: analysis.status, jobs: [] };
      }

      const matches = matchesResult.data;
      const jobs = await ctx.prisma.job.findMany({
        where: { id: { in: matches.map((match) => match.jobId) }, status: "OPEN" },
        include: { organization: true, skills: true },
      });

      return {
        status: analysis.status,
        jobs: matches
          .map((match) => ({
            match,
            job: jobs.find((job) => job.id === match.jobId) ?? null,
          }))
          .filter((item) => item.job),
      };
    }),
});
