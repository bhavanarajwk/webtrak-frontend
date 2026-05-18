"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  useTrainingParticipants,
  useTrainingSessions,
} from "@/components/learning-development/hooks/useLearningTrainings";
import { TraineeAttendanceAnalytics } from "@/components/learning-development/TraineeAttendanceAnalytics";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";
import { traineeTableRowsFromParticipants } from "@/src/lib/learning/participants";
import { resolveLearningTrainerUserId } from "@/src/lib/learning/resolveTrainerUserId";
import { toPagedRows } from "@/src/lib/apiRows";
import { hrmsService } from "@/src/services/hrms.service";

type AttendanceStatus = "PRESENT" | "ABSENT";

function AttendanceToggle({
  value,
  onChange,
}: {
  value: AttendanceStatus;
  onChange: (v: AttendanceStatus) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-wt-border p-0.5 text-xs font-medium">
      {(["PRESENT", "ABSENT"] as const).map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          className={`rounded-md px-3 py-1.5 transition ${
            value === status
              ? status === "PRESENT"
                ? "bg-emerald-600 text-white"
                : "bg-rose-600 text-white"
              : "text-wt-text-muted hover:bg-wt-surface-2"
          }`}
        >
          {status === "PRESENT" ? "Present" : "Absent"}
        </button>
      ))}
    </div>
  );
}

export function AttendancePageClient() {
  const [trainingId, setTrainingId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [attendanceByUser, setAttendanceByUser] = useState<Record<string, AttendanceStatus>>({});
  const [viewEmployeeId, setViewEmployeeId] = useState("");

  const sessionsQ = useTrainingSessions(trainingId, Boolean(trainingId.trim()));
  const traineesQ = useTrainingParticipants(trainingId, Boolean(trainingId.trim()));

  const attendanceQ = useQuery({
    queryKey: ["learning", "attendance", trainingId, sessionId],
    enabled: Boolean(trainingId.trim() && sessionId.trim()),
    queryFn: async () => {
      const res = await hrmsService.getAttendance(trainingId, sessionId);
      return toPagedRows(res.data ?? res);
    },
  });

  const traineeRows = useMemo(
    () => traineeTableRowsFromParticipants(traineesQ.data ?? []),
    [traineesQ.data]
  );

  useEffect(() => {
    if (!trainingId || !sessionId) {
      setAttendanceByUser({});
      return;
    }
    const saved = attendanceQ.data ?? [];
    const next: Record<string, AttendanceStatus> = {};
    for (const row of traineeRows) {
      const match = saved.find(
        (a) =>
          String(a.user_id ?? a.userId ?? "").trim() === row.userId ||
          String(a.user_id ?? a.userId ?? "").trim() === String(Number(row.userId))
      );
      const status = String(match?.attendance_status ?? match?.attendanceStatus ?? "PRESENT").toUpperCase();
      next[row.userId] = status === "ABSENT" ? "ABSENT" : "PRESENT";
    }
    setAttendanceByUser(next);
  }, [traineeRows, attendanceQ.data, trainingId, sessionId]);

  const qc = useQueryClient();

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!trainingId || !sessionId) throw new Error("Select training and session.");
      if (!traineeRows.length) throw new Error("No trainees enrolled for this training.");
      for (const row of traineeRows) {
        const status = attendanceByUser[row.userId] ?? "PRESENT";
        const uid = await resolveLearningTrainerUserId(row.userId);
        await hrmsService.markAttendance(trainingId, sessionId, {
          user_id: uid,
          attendance_status: status,
        });
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "attendance", trainingId] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-sm text-wt-text-muted mt-1">
          Select a training and session, then mark each trainee present or absent.
        </p>
      </div>

      <TrainingScopePicker
        trainingId={trainingId}
        onTrainingIdChange={(id) => {
          setTrainingId(id);
          setSessionId("");
          setViewEmployeeId("");
        }}
      />

      <div className="grid md:grid-cols-2 gap-4 max-w-xl">
        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
          Session
          <select
            className="input-field px-3 py-2 text-sm"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            disabled={!trainingId}
          >
            <option value="">Select session</option>
            {(sessionsQ.data ?? []).map((s) => {
              const sid = String(s.id ?? "").trim();
              const d = String(s.session_date ?? "").trim();
              return (
                <option key={sid} value={sid}>
                  {[d, sid].filter(Boolean).join(" · ") || sid}
                </option>
              );
            })}
          </select>
        </label>
      </div>

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-wt-border pb-4">
          <h2 className="font-semibold">Trainee attendance</h2>
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm"
            disabled={
              saveMut.isPending || !trainingId || !sessionId || !traineeRows.length
            }
            onClick={() =>
              saveMut.mutate(undefined, {
                onError: (e) => alert(e instanceof Error ? e.message : String(e)),
              })
            }
          >
            {saveMut.isPending ? "Saving…" : "Save attendance"}
          </button>
        </div>

        {!trainingId ? (
          <p className="text-sm text-wt-text-muted">Select a training to load trainees.</p>
        ) : traineesQ.isLoading ? (
          <p className="text-sm text-wt-text-muted">Loading trainees…</p>
        ) : !sessionId ? (
          <p className="text-sm text-wt-text-muted">Select a session to mark attendance.</p>
        ) : traineeRows.length === 0 ? (
          <p className="text-sm text-wt-text-muted">No trainees enrolled for this training.</p>
        ) : (
          <div className="wt-scroll-both overflow-x-auto rounded-xl border border-wt-border">
            <table className="min-w-full text-sm">
              <thead className="bg-wt-surface-2 text-wt-text-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Trainee</th>
                  <th className="text-left px-3 py-2 font-medium">Email</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {traineeRows.map((row) => (
                  <tr key={row.key} className="border-t border-wt-border">
                    <td className="px-3 py-2 whitespace-nowrap">{row.name}</td>
                    <td className="px-3 py-2 text-wt-text-muted">{row.email || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.enrollmentStatus}</td>
                    <td className="px-3 py-2">
                      <AttendanceToggle
                        value={attendanceByUser[row.userId] ?? "PRESENT"}
                        onChange={(v) =>
                          setAttendanceByUser((prev) => ({ ...prev, [row.userId]: v }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        <h2 className="font-semibold">Attendance analytics</h2>
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
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <TraineeAttendanceAnalytics
          trainingId={trainingId}
          employeeUserId={viewEmployeeId}
          traineeRows={traineeRows}
          sessions={sessionsQ.data ?? []}
        />
      </section>
    </div>
  );
}
