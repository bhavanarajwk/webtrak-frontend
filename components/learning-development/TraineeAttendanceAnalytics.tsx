"use client";

import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import type { TraineeTableRow } from "@/src/lib/learning/participants";
import { toPagedRows } from "@/src/lib/apiRows";
import { hrmsService } from "@/src/services/hrms.service";

function isPresentStatus(status: string): boolean {
  return status.trim().toUpperCase() === "PRESENT";
}

function isAbsentStatus(status: string): boolean {
  return status.trim().toUpperCase() === "ABSENT";
}

export function TraineeAttendanceAnalytics({
  trainingId,
  employeeUserId,
  traineeRows,
  sessions,
}: {
  trainingId: string;
  employeeUserId: string;
  traineeRows: TraineeTableRow[];
  sessions: Array<Record<string, unknown>>;
}) {
  const trainee = useMemo(
    () => traineeRows.find((r) => r.userId === employeeUserId),
    [traineeRows, employeeUserId]
  );

  const sessionAttendanceQueries = useQueries({
    queries: sessions.map((session) => {
      const sessionId = String(session.id ?? "").trim();
      return {
        queryKey: ["learning", "attendance", trainingId, sessionId, "analytics", employeeUserId],
        enabled: Boolean(trainingId && sessionId && employeeUserId),
        queryFn: async () => {
          const res = await hrmsService.getAttendance(trainingId, sessionId);
          const rows = toPagedRows(res.data ?? res);
          const match = rows.find(
            (r) =>
              String(r.user_id ?? r.userId ?? "").trim() === employeeUserId ||
              String(r.user_id ?? r.userId ?? "").trim() === String(Number(employeeUserId))
          );
          const status = String(
            match?.attendance_status ?? match?.attendanceStatus ?? "Not recorded"
          ).trim();
          return {
            sessionId,
            sessionDate: String(session.session_date ?? session.sessionDate ?? "—"),
            status,
          };
        },
      };
    }),
  });

  if (!employeeUserId) {
    return (
      <p className="text-sm text-wt-text-muted">
        Select an employee to see how many sessions they attended for this training.
      </p>
    );
  }

  if (!trainee) {
    return <p className="text-sm text-wt-text-muted">Selected employee is not enrolled in this training.</p>;
  }

  const isLoading = sessionAttendanceQueries.some((q) => q.isLoading);
  const sessionRows = sessionAttendanceQueries.map((q) => q.data).filter(Boolean) as Array<{
    sessionId: string;
    sessionDate: string;
    status: string;
  }>;

  const totalSessions = sessions.length;
  const attended = sessionRows.filter((r) => isPresentStatus(r.status)).length;
  const absent = sessionRows.filter((r) => isAbsentStatus(r.status)).length;
  const notRecorded = totalSessions - attended - absent;
  const attendancePercent =
    totalSessions > 0 ? Math.round((attended / totalSessions) * 1000) / 10 : 0;

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{trainee.name}</p>
      {isLoading ? (
        <p className="text-sm text-wt-text-muted">Loading attendance analytics…</p>
      ) : totalSessions === 0 ? (
        <p className="text-sm text-wt-text-muted">No sessions scheduled for this training yet.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
                Total sessions
              </p>
              <p className="text-2xl font-semibold mt-1">{totalSessions}</p>
            </article>
            <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
                Attended
              </p>
              <p className="text-2xl font-semibold mt-1 text-emerald-700">{attended}</p>
            </article>
            <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
                Absent / not recorded
              </p>
              <p className="text-2xl font-semibold mt-1">
                {absent}
                {notRecorded > 0 ? (
                  <span className="text-sm font-normal text-wt-text-muted"> + {notRecorded} pending</span>
                ) : null}
              </p>
            </article>
            <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
                Attendance rate
              </p>
              <p className="text-2xl font-semibold mt-1">{attendancePercent}%</p>
              <p className="text-xs text-wt-text-muted mt-1">
                {attended} of {totalSessions} sessions present
              </p>
            </article>
          </div>
          <div className="wt-scroll-both overflow-x-auto rounded-lg border border-wt-border">
            <table className="min-w-full text-sm">
              <thead className="bg-wt-surface-2 text-wt-text-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Session date</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessionRows.map((row) => (
                  <tr key={row.sessionId} className="border-t border-wt-border">
                    <td className="px-3 py-2 whitespace-nowrap">{row.sessionDate}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={
                          isPresentStatus(row.status)
                            ? "text-emerald-700 font-medium"
                            : isAbsentStatus(row.status)
                              ? "text-rose-700 font-medium"
                              : "text-wt-text-muted"
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
