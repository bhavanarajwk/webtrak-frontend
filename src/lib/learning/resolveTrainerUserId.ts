import { hrmsService } from "@/src/services/hrms.service";

/** Resolve dropdown value (numeric id or `email:foo`) to a numeric user id for APIs. */
export async function resolveLearningTrainerUserId(selectedValue: string): Promise<number> {
  let idNum = Number(selectedValue);
  if ((!Number.isFinite(idNum) || idNum <= 0) && selectedValue.startsWith("email:")) {
    const email = selectedValue.slice("email:".length).trim();
    if (email) {
      const userRes = await hrmsService.getUser({ email });
      const payload = ((userRes as { data?: unknown }).data ?? userRes) as Record<string, unknown> | null;
      const nestedUser = (payload?.user as Record<string, unknown> | undefined) ?? null;
      const candidate = Number(
        payload?.id ??
          payload?.user_id ??
          payload?.userId ??
          payload?.emp_id ??
          payload?.empId ??
          nestedUser?.id ??
          nestedUser?.user_id ??
          nestedUser?.userId ??
          nestedUser?.emp_id ??
          nestedUser?.empId ??
          0
      );
      if (Number.isFinite(candidate) && candidate > 0) {
        idNum = candidate;
      }
    }
  }
  if (!Number.isFinite(idNum) || idNum <= 0) {
    throw new Error("Please select a valid user.");
  }
  return idNum;
}
