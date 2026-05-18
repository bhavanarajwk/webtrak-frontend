import { extractFirstObjectArray, toPagedRows } from "@/src/lib/apiRows";

function rowLooksLikeTrainingParticipant(row: Record<string, unknown>): boolean {
  if (
    row.session_date != null ||
    row.sessionDate != null ||
    row.start_time != null ||
    row.startTime != null
  ) {
    return false;
  }
  return (
    row.user_id != null ||
    row.userId != null ||
    row.participant_user_id != null ||
    row.participantUserId != null ||
    row.enrollment_status != null ||
    row.enrollmentStatus != null ||
    row.participant != null ||
    row.trainingParticipant != null ||
    row.email != null ||
    row.user_email != null ||
    row.userEmail != null ||
    Boolean(row.user && typeof row.user === "object") ||
    Boolean(row.employee && typeof row.employee === "object")
  );
}

/** Unwrap GET /trainings/:id/participants payloads that may nest arrays under custom keys. */
export function participantListFromApiEnvelope(res: unknown): Array<Record<string, unknown>> {
  const rows = toPagedRows((res as { data?: unknown })?.data ?? res);
  if (rows.length) return rows;
  let payload: unknown = (res as { data?: unknown })?.data ?? res;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
      const fromString = participantListFromApiEnvelope({ data: payload });
      if (fromString.length) return fromString;
    } catch {
      return [];
    }
  }
  if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>;
    for (const key of [
      "participants",
      "training_participants",
      "trainingParticipants",
      "participantList",
      "participant_list",
      "records",
      "elements",
      "values",
      "enrolled_users",
      "enrolledUsers",
      "result",
      "body",
    ] as const) {
      const arr = o[key];
      if (Array.isArray(arr) && arr.length) return arr as Array<Record<string, unknown>>;
    }
    const embedded = o._embedded;
    if (embedded && typeof embedded === "object" && !Array.isArray(embedded)) {
      for (const v of Object.values(embedded as Record<string, unknown>)) {
        if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
          return v as Array<Record<string, unknown>>;
        }
      }
    }
    const extracted = extractFirstObjectArray(payload);
    if (extracted.length && extracted.some(rowLooksLikeTrainingParticipant)) return extracted;
  }
  if (Array.isArray(res)) return res as Array<Record<string, unknown>>;
  return [];
}

export function normalizeParticipantRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rows.map((r) => {
    const inner =
      (r.participant as Record<string, unknown> | undefined) ??
      (r.participantDto as Record<string, unknown> | undefined) ??
      (r.participant_dto as Record<string, unknown> | undefined) ??
      (r.trainingParticipant as Record<string, unknown> | undefined) ??
      (r.training_participant as Record<string, unknown> | undefined);
    if (inner && typeof inner === "object") {
      const hasUserRef =
        inner.user_id != null ||
        inner.userId != null ||
        inner.participant_user_id != null ||
        inner.employee_id != null ||
        inner.employeeId != null ||
        inner.emp_id != null ||
        inner.empId != null ||
        inner.id != null;
      if (hasUserRef) return { ...r, ...inner };
    }
    return r;
  });
}

export function participantListFromTrainingRecord(training: Record<string, unknown> | null): Array<Record<string, unknown>> {
  if (!training) return [];
  const candidates: Array<Record<string, unknown>> = [training];
  for (const wrap of ["training", "payload", "result", "body", "record", "data"] as const) {
    const inner = training[wrap];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      candidates.push(inner as Record<string, unknown>);
    }
  }
  for (const c of candidates) {
    for (const key of [
      "participants",
      "training_participants",
      "trainingParticipants",
      "participantList",
      "participant_list",
      "enrolled_users",
      "enrolledUsers",
      "employee_list",
      "employeeList",
      "roster",
      "attendees",
    ] as const) {
      const v = c[key];
      if (Array.isArray(v) && v.length) return v as Array<Record<string, unknown>>;
    }
  }
  return [];
}

export function participantRowUserId(row: Record<string, unknown>): string {
  /** Prefer FK columns on the participant row over nested `user.id` (they can disagree in bad joins). */
  const direct = String(
    row.user_id ??
      row.userId ??
      row.participant_user_id ??
      row.participantUserId ??
      row.member_user_id ??
      row.memberUserId ??
      row.employee_id ??
      row.employeeId ??
      row.emp_id ??
      row.empId ??
      ""
  ).trim();
  const d = Number(direct);
  if (direct && Number.isFinite(d) && d > 0) return direct;

  const nested =
    (row.user as Record<string, unknown> | undefined) ??
    (row.employee as Record<string, unknown> | undefined) ??
    (row.participant_user as Record<string, unknown> | undefined) ??
    (row.participantUser as Record<string, unknown> | undefined) ??
    (row.user_info as Record<string, unknown> | undefined);
  if (nested && typeof nested === "object") {
    const nid = String(
      nested.user_id ??
        nested.userId ??
        nested.emp_id ??
        nested.empId ??
        nested.id ??
        ""
    ).trim();
    const n = Number(nid);
    if (nid && Number.isFinite(n) && n > 0) return nid;
  }
  const emailRaw = String(
    row.email ??
      row.user_email ??
      row.userEmail ??
      row.employee_email ??
      row.employeeEmail ??
      (nested && typeof nested === "object"
        ? String(
            (nested as Record<string, unknown>).email ??
              (nested as Record<string, unknown>).user_email ??
              (nested as Record<string, unknown>).userEmail ??
              ""
          )
        : "")
  )
    .trim()
    .toLowerCase();
  if (emailRaw) return `email:${emailRaw}`;
  return "";
}

/** Human-readable label for a participant row (name, email, or fallback). */
export function participantRowDisplayLabel(row: Record<string, unknown>, userId: string): string {
  if (userId.startsWith("email:")) {
    return userId.slice("email:".length) || "Trainee";
  }
  const nested =
    (row.user as Record<string, unknown> | undefined) ??
    (row.employee as Record<string, unknown> | undefined);
  const name = String(
    row.name ??
      row.full_name ??
      row.fullName ??
      row.display_name ??
      row.displayName ??
      row.employee_name ??
      row.employeeName ??
      nested?.name ??
      nested?.full_name ??
      nested?.fullName ??
      ""
  ).trim();
  const email = String(
    row.email ??
      row.user_email ??
      row.userEmail ??
      row.employee_email ??
      row.employeeEmail ??
      nested?.email ??
      nested?.user_email ??
      nested?.userEmail ??
      ""
  ).trim();
  if (name && email) return `${name} (${email})`;
  if (name) return name;
  if (email) return email;
  return `User #${userId}`;
}

/**
 * Options for assigning trainers: one entry per participant user id from
 * `training_participants`, with labels from joined user fields when present.
 */
export function participantTrainerDropdownOptions(
  rows: Array<Record<string, unknown>> | undefined | null
): Array<{ id: string; label: string }> {
  if (!rows?.length) return [];
  const normalized = normalizeParticipantRows(rows);
  const map = new Map<string, string>();
  for (const row of normalized) {
    const id = participantRowUserId(row);
    if (!id) continue;
    map.set(id, participantRowDisplayLabel(row, id));
  }
  return Array.from(map.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

export type TraineeTableRow = {
  key: string;
  userId: string;
  name: string;
  email: string;
  enrollmentStatus: string;
};

/** Rows for attendance/scores tables from GET …/trainings/:id/participants. */
export function traineeTableRowsFromParticipants(
  rows: Array<Record<string, unknown>> | undefined | null
): TraineeTableRow[] {
  if (!rows?.length) return [];
  return normalizeParticipantRows(rows)
    .map((row, idx) => {
      const userId = participantRowUserId(row);
      if (!userId) return null;
      const nested =
        (row.user as Record<string, unknown> | undefined) ??
        (row.employee as Record<string, unknown> | undefined);
      const email = String(
        row.email ??
          row.user_email ??
          row.userEmail ??
          nested?.email ??
          nested?.user_email ??
          ""
      ).trim();
      return {
        key: userId,
        userId,
        name: participantRowDisplayLabel(row, userId),
        email,
        enrollmentStatus: String(
          row.enrollment_status ?? row.enrollmentStatus ?? "—"
        ).trim(),
      };
    })
    .filter((r): r is TraineeTableRow => Boolean(r));
}
