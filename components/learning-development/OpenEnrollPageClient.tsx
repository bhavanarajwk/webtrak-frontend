"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useOpenTrainingsList } from "@/components/learning-development/hooks/useLearningTrainings";
import { DataTable } from "@/components/learning-development/ui/forms";
import { hrmsService } from "@/src/services/hrms.service";

/** Shown to employees on the trainings hub — self-enroll into open trainings. */
export function OpenEnrollPageClient() {
  const { data: openRows = [], refetch } = useOpenTrainingsList();
  const [trainingId, setTrainingId] = useState("");
  const qc = useQueryClient();

  const enrollMut = useMutation({
    mutationFn: () => hrmsService.selfEnrollTraining(trainingId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning"] });
      await refetch();
    },
  });

  return (
    <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4 mt-8">
      <h2 className="font-semibold">Open trainings (self-enroll)</h2>
      <DataTable columns={["id", "name", "category", "type", "status", "duration_days"]} rows={openRows} emptyLabel="No open trainings." />
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
          Training id to enroll
          <input className="input-field px-3 py-2 text-sm" value={trainingId} onChange={(e) => setTrainingId(e.target.value)} placeholder="e.g. 12" />
        </label>
        <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={enrollMut.isPending || !trainingId.trim()} onClick={() => enrollMut.mutate(undefined, { onError: (e) => alert(String(e)) })}>
          Enroll
        </button>
      </div>
    </section>
  );
}
