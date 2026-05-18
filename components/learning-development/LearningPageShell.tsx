import type { ReactNode } from "react";

/** Consistent horizontal padding so L&D content is not flush against the sidebar. */
export function LearningPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 md:px-8 lg:px-10 py-6 md:py-8">
      {children}
    </div>
  );
}
