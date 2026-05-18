"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useTrainingSessions } from "@/components/learning-development/hooks/useLearningTrainings";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";
import { DataTable, InputField, SelectField } from "@/components/learning-development/ui/forms";
import { hrmsService } from "@/src/services/hrms.service";

export function SessionsPageClient() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  const [trainingId, setTrainingId] = useState("");
  const qc = useQueryClient();
  const sessionsQ = useTrainingSessions(trainingId, Boolean(trainingId.trim()));

  const [sessionForm, setSessionForm] = useState({
    session_date: "",
    start_time: "",
    end_time: "",
    mode: "ONLINE",
    venue: "",
    meeting_link: "",
  });

  const sessionMut = useMutation({
    mutationFn: () =>
      hrmsService.createTrainingSession(trainingId, {
        ...sessionForm,
        venue: sessionForm.venue.trim() || null,
        meeting_link: sessionForm.meeting_link.trim() || null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "sessions", trainingId] });
      setSessionForm({
        session_date: "",
        start_time: "",
        end_time: "",
        mode: "ONLINE",
        venue: "",
        meeting_link: "",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="text-sm text-wt-text-muted mt-1">Plan schedules per training.</p>
        </div>
        {trainingId ? (
          <Link
            href={`/dashboard/learning-development/trainings/${encodeURIComponent(trainingId)}?tab=sessions`}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            Open in training detail
          </Link>
        ) : null}
      </div>

      <TrainingScopePicker trainingId={trainingId} onTrainingIdChange={setTrainingId} />

      {hasHrAccess ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <h2 className="font-semibold">New session</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <InputField label="Session date" type="date" value={sessionForm.session_date} onChange={(v) => setSessionForm((p) => ({ ...p, session_date: v }))} />
            <SelectField label="Mode" value={sessionForm.mode} options={["ONLINE", "OFFLINE", "HYBRID"]} onChange={(v) => setSessionForm((p) => ({ ...p, mode: v }))} />
            <InputField label="Start time" type="time" value={sessionForm.start_time} onChange={(v) => setSessionForm((p) => ({ ...p, start_time: v }))} />
            <InputField label="End time" type="time" value={sessionForm.end_time} onChange={(v) => setSessionForm((p) => ({ ...p, end_time: v }))} />
            <InputField label="Venue" value={sessionForm.venue} onChange={(v) => setSessionForm((p) => ({ ...p, venue: v }))} />
            <InputField label="Meeting link" value={sessionForm.meeting_link} onChange={(v) => setSessionForm((p) => ({ ...p, meeting_link: v }))} />
          </div>
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm"
            disabled={sessionMut.isPending || !trainingId.trim()}
            onClick={() => sessionMut.mutate(undefined, { onError: (e) => alert(String(e)) })}
          >
            Add session
          </button>
        </section>
      ) : (
        <p className="text-sm text-wt-text-muted">Session creation is limited to HR/Admin.</p>
      )}

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        <DataTable
          title="Sessions for selected training"
          columns={["id", "session_date", "start_time", "end_time", "mode", "venue", "meeting_link"]}
          rows={sessionsQ.data ?? []}
          emptyLabel={trainingId.trim() ? "No sessions yet." : "Pick a training to load sessions."}
        />
      </section>
    </div>
  );
}
