"use client";

import Link from "next/link";
import { useTrainingsList, useOpenTrainingsList } from "@/components/learning-development/hooks/useLearningTrainings";

export default function LearningDevelopmentDashboardPage() {
  const { data: trainings = [], isLoading } = useTrainingsList();
  const { data: openTrainings = [] } = useOpenTrainingsList();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Learning overview</h1>
          <p className="text-sm text-wt-text-muted mt-1">
            Monitor trainings, enrollment, and completion from a single hub.
          </p>
        </div>
        <Link href="/dashboard/learning-development/trainings" className="btn-primary px-4 py-2 text-sm">
          Manage trainings
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
          <p className="text-xs text-wt-text-muted">Total trainings</p>
          <p className="text-3xl font-semibold mt-1">{isLoading ? "…" : trainings.length}</p>
        </article>
        <article className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
          <p className="text-xs text-wt-text-muted">Open for enrollment</p>
          <p className="text-3xl font-semibold mt-1">{openTrainings.length}</p>
        </article>
      </div>
    </div>
  );
}
