"use client";

import { useMemo } from "react";
import type { TraineeTableRow } from "@/src/lib/learning/participants";

type ScoreDraft = { scorePct: string; markCompleted: boolean };

function parseScorePct(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

export function TraineeScoreAnalytics({
  employeeUserId,
  traineeRows,
  assessments,
  assessmentId,
  scoresByUser,
}: {
  employeeUserId: string;
  traineeRows: TraineeTableRow[];
  assessments: Array<Record<string, unknown>>;
  assessmentId: string;
  scoresByUser: Record<string, ScoreDraft>;
}) {
  const trainee = useMemo(
    () => traineeRows.find((r) => r.userId === employeeUserId),
    [traineeRows, employeeUserId]
  );

  const draft = scoresByUser[employeeUserId] ?? { scorePct: "0", markCompleted: false };
  const currentScore = parseScorePct(draft.scorePct);
  const selectedAssessment = useMemo(
    () => assessments.find((a) => String(a.id ?? "").trim() === assessmentId.trim()),
    [assessments, assessmentId]
  );
  const selectedName = String(selectedAssessment?.name ?? "Selected assessment").trim();
  const totalAssessments = assessments.length;
  const markedComplete = draft.markCompleted;

  if (!employeeUserId) {
    return (
      <p className="text-sm text-wt-text-muted">
        Select an employee to see score and completion analytics for this training.
      </p>
    );
  }

  if (!trainee) {
    return (
      <p className="text-sm text-wt-text-muted">
        Selected employee is not enrolled in this training.
      </p>
    );
  }

  if (!totalAssessments) {
    return (
      <p className="text-sm text-wt-text-muted">
        No assessments defined for this training yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{trainee.name}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
            Total assessments
          </p>
          <p className="text-2xl font-semibold mt-1">{totalAssessments}</p>
        </article>
        <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
            Current score
          </p>
          <p className="text-2xl font-semibold mt-1 text-sky-700">
            {currentScore != null ? `${currentScore}%` : "—"}
          </p>
          <p className="text-xs text-wt-text-muted mt-1 truncate" title={selectedName}>
            {selectedName}
          </p>
        </article>
        <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
            Training completion
          </p>
          <p
            className={`text-2xl font-semibold mt-1 ${
              markedComplete ? "text-emerald-700" : "text-wt-text-muted"
            }`}
          >
            {markedComplete ? "Complete" : "In progress"}
          </p>
        </article>
        <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
            Enrollment
          </p>
          <p className="text-2xl font-semibold mt-1 text-base">{trainee.enrollmentStatus}</p>
        </article>
      </div>
      <div className="wt-scroll-both overflow-x-auto rounded-lg border border-wt-border">
        <table className="min-w-full text-sm">
          <thead className="bg-wt-surface-2 text-wt-text-muted">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Assessment</th>
              <th className="text-left px-3 py-2 font-medium">Score (%)</th>
              <th className="text-left px-3 py-2 font-medium">Completion</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((a) => {
              const id = String(a.id ?? "").trim();
              const name = String(a.name ?? `Assessment ${id}`).trim();
              const isSelected = id === assessmentId.trim();
              return (
                <tr
                  key={id || name}
                  className={`border-t border-wt-border ${isSelected ? "bg-wt-surface-2/60" : ""}`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {name}
                    {isSelected ? (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-wt-text-muted">
                        (selected)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {isSelected && currentScore != null ? (
                      <span className="font-medium text-sky-700">{currentScore}%</span>
                    ) : (
                      <span className="text-wt-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {isSelected ? (
                      <span
                        className={
                          markedComplete ? "text-emerald-700 font-medium" : "text-wt-text-muted"
                        }
                      >
                        {markedComplete ? "Marked complete" : "Not completed"}
                      </span>
                    ) : (
                      <span className="text-wt-text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
