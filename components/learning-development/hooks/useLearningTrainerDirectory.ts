"use client";

import { useQuery } from "@tanstack/react-query";
import {
  accountManagerOptionsFromOnboard,
  onboardRowsToEmployeeOptions,
  type OnboardEmployeeOption,
} from "@/src/lib/learning/onboardOptions";
import { hrmsService } from "@/src/services/hrms.service";
import { toPagedRows } from "@/src/lib/apiRows";

export type TrainerOption = { id: string; label: string };

async function fetchOnboardRows(): Promise<Array<Record<string, unknown>>> {
  const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "500" });
  return toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes);
}

/** Employees from GET /api/v1/user/onboard for trainer/trainee pickers. */
export function useLearningTrainerDirectory() {
  return useQuery({
    queryKey: ["learning", "onboardEmployees"],
    queryFn: async (): Promise<TrainerOption[]> => {
      const options = onboardRowsToEmployeeOptions(await fetchOnboardRows());
      return options.map(({ id, label }) => ({ id, label }));
    },
    staleTime: 60_000,
  });
}

/** Account managers from GET /api/v1/user/onboard (falls back to all onboard if none tagged). */
export function useOnboardAccountManagers() {
  return useQuery({
    queryKey: ["onboard", "accountManagers"],
    queryFn: async (): Promise<OnboardEmployeeOption[]> => {
      return accountManagerOptionsFromOnboard(await fetchOnboardRows());
    },
    staleTime: 60_000,
  });
}
