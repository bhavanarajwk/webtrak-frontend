"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { TraineeScoreAnalytics } from "@/components/learning-development/TraineeScoreAnalytics";
import {
  useTrainingAssessments,
  useTrainingParticipants,
} from "@/components/learning-development/hooks/useLearningTrainings";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";
import { traineeTableRowsFromParticipants } from "@/src/lib/learning/participants";
import { resolveLearningTrainerUserId } from "@/src/lib/learning/resolveTrainerUserId";
import { hrmsService } from "@/src/services/hrms.service";

type ScoreDraft = { scorePct: string; markCompleted: boolean };

export function ScoresPageClient() {
  const [trainingId, setTrainingId] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [viewEmployeeId, setViewEmployeeId] = useState("");
  const [scoresByUser, setScoresByUser] = useState<Record<string, ScoreDraft>>({});

  const assessmentsQ = useTrainingAssessments(trainingId, Boolean(trainingId.trim()));
  const traineesQ = useTrainingParticipants(trainingId, Boolean(trainingId.trim()));
  const qc = useQueryClient();

  const traineeRows = useMemo(
    () => traineeTableRowsFromParticipants(traineesQ.data ?? []),
    [traineesQ.data]
  );

  const assessments = assessmentsQ.data ?? [];

  useEffect(() => {
    if (!assessments.length) {
      setAssessmentId("");
      return;
    }
    const stillValid = assessments.some((a) => String(a.id ?? "") === assessmentId);
    if (!stillValid) {
      setAssessmentId(String(assessments[0]?.id ?? "").trim());
    }
  }, [assessments, assessmentId]);

  useEffect(() => {
    setScoresByUser((prev) => {
      const next: Record<string, ScoreDraft> = {};
      for (const row of traineeRows) {
        next[row.userId] = prev[row.userId] ?? { scorePct: "0", markCompleted: true };
      }
      return next;
    });
  }, [traineeRows]);

  useEffect(() => {
    setViewEmployeeId("");
  }, [trainingId]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!trainingId) throw new Error("Select a training.");
      if (!traineeRows.length) throw new Error("No trainees enrolled for this training.");
      const assessId = assessmentId.trim() || String(assessments[0]?.id ?? "1").trim() || "1";
      if (!assessId) throw new Error("Select an assessment.");
      for (const row of traineeRows) {
        const draft = scoresByUser[row.userId] ?? { scorePct: "0", markCompleted: true };
        const pct = Number(draft.scorePct);
        const userId = await resolveLearningTrainerUserId(row.userId);
        await hrmsService.submitTrainingScores(trainingId, {
          user_id: userId,
          scores_json: { [assessId]: Number.isFinite(pct) ? pct : 0 },
          mark_completed: draft.markCompleted,
        });
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scores &amp; completion</h1>
        <p className="text-sm text-wt-text-muted mt-1">
          Select a training and assessment, enter scores for each trainee, then save.
        </p>
      </div>

      <TrainingScopePicker
        trainingId={trainingId}
        onTrainingIdChange={(id) => {
          setTrainingId(id);
          setAssessmentId("");
          setViewEmployeeId("");
        }}
      />

      <label className="text-xs text-wt-text-muted flex flex-col gap-1 max-w-md">
        Assessment
        <select
          className="input-field px-3 py-2 text-sm"
          value={assessmentId}
          onChange={(e) => setAssessmentId(e.target.value)}
          disabled={!trainingId || assessmentsQ.isLoading}
        >
          <option value="">
            {assessmentsQ.isLoading ? "Loading…" : assessments.length ? "Select assessment" : "No assessments"}
          </option>
          {assessments.map((a) => {
            const id = String(a.id ?? "").trim();
            const name = String(a.name ?? `Assessment ${id}`).trim();
            return (
              <option key={id} value={id}>
                {name}
              </option>
            );
          })}
        </select>
      </label>

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-wt-border pb-4">
          <h2 className="font-semibold">Trainee scores</h2>
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm shrink-0"
            disabled={saveMut.isPending || !trainingId || !traineeRows.length || !assessmentId}
            onClick={() =>
              saveMut.mutate(undefined, {
                onError: (e) => alert(e instanceof Error ? e.message : String(e)),
              })
            }
          >
            {saveMut.isPending ? "Saving…" : "Save scores"}
          </button>
        </div>

        {!trainingId ? (
          <p className="text-sm text-wt-text-muted">Select a training to load trainees.</p>
        ) : traineesQ.isLoading ? (
          <p className="text-sm text-wt-text-muted">Loading trainees…</p>
        ) : traineeRows.length === 0 ? (
          <p className="text-sm text-wt-text-muted">No trainees enrolled for this training.</p>
        ) : !assessmentId ? (
          <p className="text-sm text-wt-text-muted">Select an assessment before saving scores.</p>
        ) : (
          <div className="wt-scroll-both overflow-x-auto rounded-xl border border-wt-border">
            <table className="min-w-full text-sm">
              <thead className="bg-wt-surface-2 text-wt-text-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Trainee</th>
                  <th className="text-left px-3 py-2 font-medium">Email</th>
                  <th className="text-left px-3 py-2 font-medium w-28">Score (%)</th>
                  <th className="text-left px-3 py-2 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {traineeRows.map((row) => {
                  const draft = scoresByUser[row.userId] ?? { scorePct: "0", markCompleted: true };
                  return (
                    <tr key={row.key} className="border-t border-wt-border">
                      <td className="px-3 py-2 whitespace-nowrap">{row.name}</td>
                      <td className="px-3 py-2 text-wt-text-muted">{row.email || "—"}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="input-field px-2 py-1.5 text-sm w-full max-w-[6rem]"
                          value={draft.scorePct}
                          onChange={(e) =>
                            setScoresByUser((prev) => ({
                              ...prev,
                              [row.userId]: { ...draft, scorePct: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={draft.markCompleted}
                            onChange={(e) =>
                              setScoresByUser((prev) => ({
                                ...prev,
                                [row.userId]: { ...draft, markCompleted: e.target.checked },
                              }))
                            }
                          />
                          <span className="text-xs text-wt-text-muted">Mark completed</span>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        <h2 className="font-semibold">Score analytics</h2>
        <p className="text-xs text-wt-text-muted">
          Scores and completion for the selected assessment and trainee.
        </p>
        <label className="text-xs text-wt-text-muted flex flex-col gap-1 max-w-md">
          View employee
          <select
            className="input-field px-3 py-2 text-sm"
            value={viewEmployeeId}
            onChange={(e) => setViewEmployeeId(e.target.value)}
            disabled={!trainingId || !traineeRows.length}
          >
            <option value="">Select employee</option>
            {traineeRows.map((row) => (
              <option key={row.userId} value={row.userId}>
                {row.email ? `${row.name} (${row.email})` : row.name}
              </option>
            ))}
          </select>
        </label>
        <TraineeScoreAnalytics
          employeeUserId={viewEmployeeId}
          traineeRows={traineeRows}
          assessments={assessments}
          assessmentId={assessmentId}
          scoresByUser={scoresByUser}
        />
      </section>
    </div>
  );
}
