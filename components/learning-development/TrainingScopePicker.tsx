"use client";

import { useTrainingsList } from "@/components/learning-development/hooks/useLearningTrainings";

export function TrainingScopePicker({
  trainingId,
  onTrainingIdChange,
}: {
  trainingId: string;
  onTrainingIdChange: (id: string) => void;
}) {
  const { data: trainings = [], isLoading } = useTrainingsList();

  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1 max-w-xl">
      Training name
      <select
        className="input-field px-3 py-2 text-sm"
        value={trainingId}
        onChange={(e) => onTrainingIdChange(e.target.value)}
      >
        <option value="">{isLoading ? "Loading…" : "Select a training"}</option>
        {trainings.map((row) => {
          const id = String(row.id ?? "").trim();
          const name = String(row.name ?? id).trim();
          return (
            <option key={id || name} value={id}>
              {name}
            </option>
          );
        })}
      </select>
    </label>
  );
}
