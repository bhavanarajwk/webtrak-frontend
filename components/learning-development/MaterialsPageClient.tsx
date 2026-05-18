"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useTrainingMaterials } from "@/components/learning-development/hooks/useLearningTrainings";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";
import { DataTable, FileField, InputField, SelectField } from "@/components/learning-development/ui/forms";
import { hrmsService } from "@/src/services/hrms.service";

export function MaterialsPageClient() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  const [trainingId, setTrainingId] = useState("");
  const [form, setForm] = useState({ title: "", visibility: "EMPLOYEE" as "EMPLOYEE" | "HR_ONLY" });
  const [file, setFile] = useState<File | null>(null);
  const qc = useQueryClient();
  const materialsQ = useTrainingMaterials(trainingId, Boolean(trainingId.trim()));

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file.");
      await hrmsService.uploadTrainingMaterial(trainingId, {
        title: form.title.trim(),
        visibility: form.visibility,
        materialFile: file,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "materials", trainingId] });
      setFile(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Materials</h1>
          <p className="text-sm text-wt-text-muted mt-1">Upload PDFs and control visibility.</p>
        </div>
        {trainingId ? (
          <Link href={`/dashboard/learning-development/trainings/${encodeURIComponent(trainingId)}?tab=materials`} className="text-sm font-medium text-indigo-600 hover:underline self-center">
            Detail view
          </Link>
        ) : null}
      </div>

      <TrainingScopePicker trainingId={trainingId} onTrainingIdChange={setTrainingId} />

      {hasHrAccess ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <InputField label="Title" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} />
            <SelectField label="Visibility" value={form.visibility} options={["EMPLOYEE", "HR_ONLY"]} onChange={(v) => setForm((p) => ({ ...p, visibility: v as "EMPLOYEE" | "HR_ONLY" }))} />
            <FileField label="PDF" accept=".pdf,application/pdf" onPick={setFile} />
            <div className="flex items-end">
              <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={uploadMut.isPending || !trainingId || !file} onClick={() => uploadMut.mutate(undefined, { onError: (e) => alert(String(e)) })}>
                Upload
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        <DataTable columns={["id", "training_id", "title", "material_url", "visibility"]} rows={materialsQ.data ?? []} emptyLabel="No materials." />
      </section>
    </div>
  );
}
