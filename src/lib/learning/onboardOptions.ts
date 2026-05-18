import type { OnboardItem } from "@/src/services/hrms.service";

export type OnboardEmployeeOption = { id: string; label: string; name: string };

function onboardRowRecord(row: OnboardItem | Record<string, unknown>): Record<string, unknown> {
  return row as Record<string, unknown>;
}

export function isAccountManagerOnboardRow(row: OnboardItem | Record<string, unknown>): boolean {
  const r = onboardRowRecord(row);
  const fields = [
    r.department,
    r.user_type,
    r.userType,
    r.designation,
    r.role,
    r.job_title,
    r.title,
    r.stream,
  ].map((v) => String(v ?? "").trim().toLowerCase());
  return fields.some(
    (f) => f === "account manager" || f.includes("account manager")
  );
}

/** Map GET /api/v1/user/onboard rows to picker options (deduped by user id). */
export function onboardRowsToEmployeeOptions(
  rows: Array<OnboardItem | Record<string, unknown>>
): OnboardEmployeeOption[] {
  return Array.from(
    new Map(
      rows
        .map((row) => {
          const r = onboardRowRecord(row);
          const rawId = String(
            r.user_id ??
              r.userId ??
              r.emp_id ??
              r.empId ??
              r.id ??
              (r.user as Record<string, unknown> | undefined)?.id ??
              ""
          ).trim();
          const name = String(r.name ?? "Employee").trim();
          const email = String(
            r.email ?? r.user_email ?? r.userEmail ?? r.employee_email ?? r.employeeEmail ?? ""
          ).trim();
          const userId = rawId || (email ? `email:${email.toLowerCase()}` : "");
          if (!userId) return null;
          const label = email ? `${name} (${email})` : name;
          return [userId, { id: userId, label, name }] as const;
        })
        .filter((item): item is readonly [string, OnboardEmployeeOption] => Boolean(item))
    ).values()
  );
}

export function accountManagerOptionsFromOnboard(
  rows: Array<OnboardItem | Record<string, unknown>>
): OnboardEmployeeOption[] {
  const managers = onboardRowsToEmployeeOptions(rows.filter(isAccountManagerOnboardRow));
  return managers.length ? managers : onboardRowsToEmployeeOptions(rows);
}
