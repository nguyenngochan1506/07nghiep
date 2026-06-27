import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Job as JobCardJob } from "@/components/job-card";
import { queryClient, trpc } from "@/utils/trpc";

const LOCAL_SAVED_JOBS_STORAGE_KEY = "07nghiep:candidate:saved-jobs";
const LOCAL_SAVED_JOBS_EVENT = "07nghiep:local-saved-jobs-changed";

export type LocalSavedJob = JobCardJob;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeSavedJob(job: LocalSavedJob): LocalSavedJob | null {
  if (!job.id || !job.title) return null;

  return {
    id: job.id,
    title: job.title,
    companyName: job.companyName || "Unknown",
    companyLogo: job.companyLogo || "",
    isVerified: Boolean(job.isVerified),
    location: job.location || "",
    workType: job.workType || "",
    jobType: job.jobType || "",
    salaryRange: job.salaryRange || "Thỏa thuận",
    skills: Array.isArray(job.skills) ? job.skills.filter(Boolean) : [],
    postedDate: job.postedDate || "Đang cập nhật",
    expiresAt: job.expiresAt ?? null,
    isSaved: true,
  };
}

export function readLocalSavedJobs(): LocalSavedJob[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_SAVED_JOBS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const uniqueJobs = new Map<string, LocalSavedJob>();
    for (const item of parsed) {
      const normalized = normalizeSavedJob(item as LocalSavedJob);
      if (normalized) uniqueJobs.set(normalized.id, normalized);
    }

    return Array.from(uniqueJobs.values());
  } catch {
    return [];
  }
}

function writeLocalSavedJobs(jobs: LocalSavedJob[]) {
  if (!canUseStorage()) return;

  window.localStorage.setItem(LOCAL_SAVED_JOBS_STORAGE_KEY, JSON.stringify(jobs));
  window.dispatchEvent(new Event(LOCAL_SAVED_JOBS_EVENT));
}

export function clearLocalSavedJobs() {
  if (!canUseStorage()) return;

  window.localStorage.removeItem(LOCAL_SAVED_JOBS_STORAGE_KEY);
  window.dispatchEvent(new Event(LOCAL_SAVED_JOBS_EVENT));
}

export function useLocalSavedJobs() {
  const [savedJobs, setSavedJobs] = useState<LocalSavedJob[]>(() => readLocalSavedJobs());

  const refresh = useCallback(() => {
    setSavedJobs(readLocalSavedJobs());
  }, []);

  useEffect(() => {
    if (!canUseStorage()) return;

    window.addEventListener("storage", refresh);
    window.addEventListener(LOCAL_SAVED_JOBS_EVENT, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(LOCAL_SAVED_JOBS_EVENT, refresh);
    };
  }, [refresh]);

  const savedIds = useMemo(() => new Set(savedJobs.map((job) => job.id)), [savedJobs]);

  const toggleSavedJob = useCallback((job: LocalSavedJob) => {
    const normalized = normalizeSavedJob(job);
    if (!normalized) return;

    const currentJobs = readLocalSavedJobs();
    const isSaved = currentJobs.some((item) => item.id === normalized.id);
    const nextJobs = isSaved
      ? currentJobs.filter((item) => item.id !== normalized.id)
      : [normalized, ...currentJobs];

    writeLocalSavedJobs(nextJobs);
    setSavedJobs(nextJobs);
  }, []);

  const clearSavedJobs = useCallback(() => {
    clearLocalSavedJobs();
    setSavedJobs([]);
  }, []);

  return {
    savedJobs,
    savedIds,
    toggleSavedJob,
    clearSavedJobs,
  };
}

export function useSyncLocalSavedJobs(isLoggedIn: boolean) {
  const { savedJobs, clearSavedJobs } = useLocalSavedJobs();
  const localJobIds = useMemo(() => savedJobs.map((job) => job.id), [savedJobs]);
  const localJobIdsKey = localJobIds.join("|");
  const { isPending, mutate } = useMutation(trpc.savedJob.syncLocal.mutationOptions());

  useEffect(() => {
    if (!isLoggedIn || localJobIds.length === 0 || isPending) return;

    mutate(
      { jobIds: localJobIds },
      {
        onSuccess: () => {
          clearSavedJobs();
          queryClient.invalidateQueries({ queryKey: trpc.savedJob.list.queryKey() });
          for (const jobId of localJobIds) {
            queryClient.invalidateQueries({ queryKey: trpc.savedJob.isSaved.queryKey({ jobId }) });
          }
        },
      },
    );
  }, [clearSavedJobs, isLoggedIn, isPending, localJobIds, localJobIdsKey, mutate]);
}
