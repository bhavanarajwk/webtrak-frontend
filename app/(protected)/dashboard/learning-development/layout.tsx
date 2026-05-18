import type { ReactNode } from "react";
import { LearningPageShell } from "@/components/learning-development/LearningPageShell";

export default function LearningDevelopmentLayout({ children }: { children: ReactNode }) {
  return <LearningPageShell>{children}</LearningPageShell>;
}
