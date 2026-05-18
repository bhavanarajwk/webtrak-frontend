"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useTrainingParticipants } from "@/components/learning-development/hooks/useLearningTrainings";
import { useLearningTrainerDirectory } from "@/components/learning-development/hooks/useLearningTrainerDirectory";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";
import { DataTable } from "@/components/learning-development/ui/forms";
import { participantRowUserId } from "@/src/lib/learning/participants";
import { resolveLearningTrainerUserId } from "@/src/lib/learning/resolveTrainerUserId";
import { hrmsService } from "@/src/services/hrms.service";

export function ParticipantsPageClient() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  const [trainingId, setTrainingId] = useState("");
  const [traineePick, setTraineePick] = useState("");
  const qc = useQueryClient();
  const traineesQ = useTrainingParticipants(trainingId, Boolean(trainingId.trim()));
  const onboardQ = useLearningTrainerDirectory();

  const enrolledUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of traineesQ.data ?? []) {
      const id = participantRowUserId(row);
      if (id) ids.add(id);
    }
    return ids;
  }, [traineesQ.data]);

  const addTraineeOptions = useMemo(
    () => (onboardQ.data ?? []).filter((o) => !enrolledUserIds.has(o.id)),
    [onboardQ.data, enrolledUserIds]
  );

  useEffect(() => {
    setTraineePick("");
  }, [trainingId]);

  const addMut = useMutation({
    mutationFn: async () => {
      const idNum = await resolveLearningTrainerUserId(traineePick);
      await hrmsService.addTrainingParticipants(trainingId, { user_ids: [idNum], select_all: false });
    },
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["learning", "participants", trainingId] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trainees</h1>
          <p className="text-sm text-wt-text-muted mt-1">Manage training roster enrollment.</p>
        </div>
        {trainingId ? (
          <Link
            href={`/dashboard/learning-development/trainings/${encodeURIComponent(trainingId)}?tab=participants`}
            className="text-sm font-medium text-indigo-600 hover:underline self-center"
          >
            Detail view
          </Link>
        ) : null}
      </div>

      <TrainingScopePicker trainingId={trainingId} onTrainingIdChange={setTrainingId} />

      {hasHrAccess ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-wt-text-muted flex flex-col gap-1 min-w-[min(100%,280px)] flex-1 max-w-md">
              Add trainee
              <select
                className="input-field px-3 py-2 text-sm"
                value={traineePick}
                onChange={(e) => setTraineePick(e.target.value)}
              >
                <option value="">Select trainee</option>
                {addTraineeOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm shrink-0"
              disabled={addMut.isPending || !traineePick || !trainingId}
              onClick={() => addMut.mutate(undefined, { onError: (e) => alert(String(e)) })}
            >
              Add trainee
            </button>
          </div>
          {onboardQ.isLoading ? (
            <p className="text-xs text-wt-text-muted">Loading employees from onboard list…</p>
          ) : null}
        </section>
      ) : (
        <p className="text-sm text-wt-text-muted">Trainee management requires HR/Admin.</p>
      )}

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        <DataTable
          title="Enrolled trainees"
          columns={["id", "training_id", "user_id", "name", "email", "enrollment_status"]}
          rows={traineesQ.data ?? []}
          emptyLabel={trainingId ? "No trainees enrolled for this training." : "Select a training to view trainees."}
        />
      </section>
    </div>
  );
}
