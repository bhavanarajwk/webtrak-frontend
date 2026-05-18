"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { TrainingDetailPageClient } from "@/components/learning-development/TrainingDetailPageClient";

function TrainingDetailInner() {
  const params = useParams();
  const trainingId = String(params.trainingId ?? "");
  return (
    <Suspense fallback={<div className="text-sm text-wt-text-muted p-6">Loading training…</div>}>
      <TrainingDetailPageClient trainingId={trainingId} />
    </Suspense>
  );
}

export default function LearningTrainingDetailPage() {
  return <TrainingDetailInner />;
}
