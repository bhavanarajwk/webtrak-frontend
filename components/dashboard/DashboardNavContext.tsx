"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type DashboardNavContextValue = {
  activeTab: string;
  setActiveTab: (id: string) => void;
  goToTab: (id: string) => void;
  reportsExpanded: boolean;
  setReportsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  learningExpanded: boolean;
  setLearningExpanded: React.Dispatch<React.SetStateAction<boolean>>;
};

const DashboardNavContext = createContext<DashboardNavContextValue | null>(null);

export function DashboardNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [learningExpanded, setLearningExpanded] = useState(true);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "profile") {
      setActiveTab("profile");
      return;
    }
    if (tab && tab !== "profile") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (pathname.startsWith("/dashboard/learning-development")) {
      setLearningExpanded(true);
    }
  }, [pathname]);

  const goToTab = useCallback(
    (id: string) => {
      setActiveTab(id);
      if (id === "profile") {
        router.replace("/dashboard?tab=profile", { scroll: false });
        return;
      }
      router.replace(`/dashboard?tab=${encodeURIComponent(id)}`, { scroll: false });
    },
    [router]
  );

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      goToTab,
      reportsExpanded,
      setReportsExpanded,
      learningExpanded,
      setLearningExpanded,
    }),
    [activeTab, goToTab, reportsExpanded, learningExpanded]
  );

  return <DashboardNavContext.Provider value={value}>{children}</DashboardNavContext.Provider>;
}

export function useDashboardNav() {
  const ctx = useContext(DashboardNavContext);
  if (!ctx) throw new Error("useDashboardNav must be used within DashboardNavProvider");
  return ctx;
}
