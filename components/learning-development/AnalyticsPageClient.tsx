"use client";

import { useMemo, useState } from "react";
import { useTrainingAnalytics } from "@/components/learning-development/hooks/useLearningTrainings";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";

const METRIC_LABELS: Record<string, string> = {
  training_id: "Training ID",
  enrolled_count: "Enrolled count",
  completed_count: "Completed count",
  average_score_percent: "Average score (%)",
  average_attendance_percent: "Average attendance (%)",
};

export function AnalyticsPageClient() {
  const [trainingId, setTrainingId] = useState("");
  const analyticsQ = useTrainingAnalytics(trainingId, Boolean(trainingId.trim()));

  const entries = useMemo(() => {
    const a = analyticsQ.data ?? {};
    return Object.entries(a).filter(([, value]) => value !== null && value !== undefined);
  }, [analyticsQ.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-wt-text-muted mt-1 max-w-2xl">
          Metrics load from{" "}
          <code className="text-[11px] bg-wt-surface-2 px-1 py-0.5 rounded">
            GET /api/v1/trainings/&#123;training_id&#125;/analytics
          </code>{" "}
          after you pick a training. The backend aggregates enrollment, completion, scores, and
          attendance for that training only.
        </p>
      </div>

      <TrainingScopePicker trainingId={trainingId} onTrainingIdChange={setTrainingId} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {analyticsQ.isLoading ? (
          <p className="text-sm text-wt-text-muted">Loading analytics…</p>
        ) : entries.length ? (
          entries.map(([key, value]) => (
            <article key={key} className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
                {METRIC_LABELS[key] ?? key.replaceAll("_", " ")}
              </p>
              <p className="text-lg font-semibold mt-2 break-all">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </p>
            </article>
          ))
        ) : (
          <p className="text-sm text-wt-text-muted">
            {trainingId ? "No analytics returned for this training." : "Select a training to load analytics."}
          </p>
        )}
      </div>
    </div>
  );
}
