"use client";

import { useOnboardAccountManagers } from "@/components/learning-development/hooks/useLearningTrainerDirectory";

export function AccountManagerSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { data: options = [], isLoading, isError } = useOnboardAccountManagers();

  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      Account manager
      <select
        className="input-field px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
      >
        <option value="">
          {isLoading
            ? "Loading account managers…"
            : isError
              ? "Could not load list"
              : options.length
                ? "Select account manager"
                : "No account managers found"}
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.name}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
