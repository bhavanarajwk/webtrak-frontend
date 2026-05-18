"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useTrainingAssessments } from "@/components/learning-development/hooks/useLearningTrainings";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";
import { DataTable, FileField, InputField } from "@/components/learning-development/ui/forms";
import { hrmsService } from "@/src/services/hrms.service";

export function AssessmentsPageClient() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  const [trainingId, setTrainingId] = useState("");
  const [form, setForm] = useState({ name: "", description: "", weight_percent: "10" });
  const [file, setFile] = useState<File | null>(null);
  const qc = useQueryClient();
  const assessmentsQ = useTrainingAssessments(trainingId, Boolean(trainingId.trim()));

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a PDF.");
      await hrmsService.uploadAssessment(trainingId, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        weight_percent: Number(form.weight_percent || "0"),
        assessmentFile: file,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "assessments", trainingId] });
      setFile(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
          <p className="text-sm text-wt-text-muted mt-1">Define weighted assessments with supporting documents.</p>
        </div>
        {trainingId ? (
          <Link href={`/dashboard/learning-development/trainings/${encodeURIComponent(trainingId)}?tab=assessments`} className="text-sm font-medium text-indigo-600 hover:underline self-center">
            Detail view
          </Link>
        ) : null}
      </div>

      <TrainingScopePicker trainingId={trainingId} onTrainingIdChange={setTrainingId} />

      {hasHrAccess ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <InputField label="Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
            <InputField label="Weight %" value={form.weight_percent} onChange={(v) => setForm((p) => ({ ...p, weight_percent: v }))} />
            <div className="sm:col-span-2">
              <InputField label="Description" value={form.description} onChange={(v) => setForm((p) => ({ ...p, description: v }))} />
            </div>
            <FileField label="Assessment PDF" accept=".pdf,application/pdf" onPick={setFile} />
            <div className="flex items-end">
              <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={uploadMut.isPending || !trainingId || !file} onClick={() => uploadMut.mutate(undefined, { onError: (e) => alert(String(e)) })}>
                Upload
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        <DataTable columns={["id", "training_id", "name", "description", "file_url", "weight_percent"]} rows={assessmentsQ.data ?? []} emptyLabel="No assessments." />
      </section>
    </div>
  );
}
