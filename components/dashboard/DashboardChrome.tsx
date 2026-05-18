"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { WebTrakBrand } from "@/app/components/WebTrakBrand";
import { apiClient } from "@/src/api/httpClient";
import { endpoints } from "@/src/api/endpoints";
import { hrmsService } from "@/src/services/hrms.service";
import { toRows } from "@/src/lib/apiRows";
import { dashboardNavigation, filterVisibleNavigation } from "@/config/dashboardNavigation";
import { learningSubNav, LEARNING_BASE } from "@/config/learningNav";
import { useDashboardNav } from "@/components/dashboard/DashboardNavContext";

function IconUser({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.33 0-8 1.67-8 5v1h16v-1c0-3.33-4.67-5-8-5z" />
    </svg>
  );
}

function IconBell({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

function IconCheck({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconSettings({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 shrink-0 ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.52-.4-1.08-.73-1.69-.98l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.61.25-1.17.59-1.69.98l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.52.4 1.08.73 1.69.98l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.61-.25 1.17-.59 1.69-.98l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  );
}

function extractRoleFromNotificationMessage(message: string): string {
  const pipeMatch = message.match(/\|\s*([^|]+?)\s+submitted/i);
  if (pipeMatch?.[1]) return pipeMatch[1].trim();
  const roleWordMatch = message.match(/\b(HR|Manager|Employee|Emp|Admin|Finance)\b/i);
  return roleWordMatch?.[1] ? roleWordMatch[1].trim() : "—";
}

function applyTheme(nextTheme: "light" | "dark" | "system") {
  const root = document.documentElement;
  if (nextTheme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = prefersDark ? "dark" : "light";
  } else {
    root.dataset.theme = nextTheme;
  }
}

export function DashboardChrome({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const {
    activeTab,
    goToTab,
    reportsExpanded,
    setReportsExpanded,
    learningExpanded,
    setLearningExpanded,
  } = useDashboardNav();

  const userRoles = user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");
  const canAccessProfile = Boolean(user);

  const visibleNavigation = useMemo(
    () => filterVisibleNavigation(dashboardNavigation, userRoles, { hasHrAccess }),
    [userRoles, hasHrAccess]
  );

  const [notifications, setNotifications] = useState<Array<Record<string, unknown>>>([]);
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("wt-theme");
    if (stored === "dark" || stored === "light" || stored === "system") return stored;
    return "light";
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem("wt-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const loadNotifications = useCallback(async () => {
    const res = await hrmsService.getNotifications({ page: "0", size: "20" });
    setNotifications(toRows(res.data));
  }, []);

  const runAction = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setActionLoading(true);
    try {
      await fn();
    } finally {
      setActionLoading(false);
    }
  }, []);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((row) => !Boolean(row.is_read ?? row.isRead ?? false)).length,
    [notifications]
  );

  const isLearningRoute = pathname.startsWith("/dashboard/learning-development");
  const learningSectionTitle = useMemo(() => {
    const hit = learningSubNav.find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`));
    return hit?.label ?? "Learning & Development";
  }, [pathname]);

  return (
    <div className="wt-page-scroll h-dvh overflow-y-auto bg-wt-bg text-wt-text">
      <div className="flex min-h-full max-lg:flex-col lg:flex-row">
      <aside className="sticky top-0 z-20 flex max-h-[min(36vh,260px)] shrink-0 flex-col border-b border-wt-border bg-wt-surface-1 p-4 max-lg:relative max-lg:min-h-0 lg:h-dvh lg:max-h-dvh lg:w-[250px] lg:border-b-0 lg:border-r lg:p-5">
        <div className="mb-4 shrink-0">
          <WebTrakBrand variant="sidebar" />
        </div>
        <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {visibleNavigation.map((item) => {
            const children = "children" in item ? item.children : undefined;
            if (children?.length && item.id === "reports") {
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setReportsExpanded((prev) => !prev);
                      if (!activeTab.startsWith("reports-")) {
                        goToTab("reports-workforce");
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      activeTab.startsWith("reports-")
                        ? "bg-wt-surface-3 text-wt-text"
                        : "text-wt-text-muted hover:bg-wt-surface-2"
                    }`}
                  >
                    {item.label}
                  </button>
                  {reportsExpanded ? (
                    <div className="ml-2 space-y-1 border-l border-wt-border pl-2">
                      {children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => goToTab(child.id)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition ${
                            activeTab === child.id
                              ? "bg-wt-surface-3 text-wt-text"
                              : "text-wt-text-muted hover:bg-wt-surface-2"
                          }`}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }

            if (item.id === "learning") {
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLearningExpanded((prev) => !prev);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      isLearningRoute ? "bg-wt-surface-3 text-wt-text" : "text-wt-text-muted hover:bg-wt-surface-2"
                    }`}
                  >
                    {item.label}
                  </button>
                  {learningExpanded ? (
                    <div className="ml-2 space-y-1 border-l border-wt-border pl-2">
                      {learningSubNav.map((link) => {
                        const active =
                          pathname === link.href ||
                          (link.href === LEARNING_BASE
                            ? pathname === LEARNING_BASE || pathname === `${LEARNING_BASE}/`
                            : pathname.startsWith(`${link.href}/`) || pathname.startsWith(link.href));
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={`block w-full text-left px-3 py-1.5 rounded-lg text-xs transition ${
                              active ? "bg-wt-surface-3 text-wt-text" : "text-wt-text-muted hover:bg-wt-surface-2"
                            }`}
                          >
                            {link.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goToTab(item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  activeTab === item.id ? "bg-wt-surface-3 text-wt-text" : "text-wt-text-muted hover:bg-wt-surface-2"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        {canAccessProfile ? (
          <div className="mt-4 shrink-0 border-t border-wt-border pt-4">
            <Link
              href="/dashboard?tab=profile"
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                activeTab === "profile"
                  ? "border-wt-border bg-wt-surface-3 text-wt-text"
                  : "border-transparent bg-wt-surface-2 text-wt-text-muted hover:bg-wt-surface-3 hover:text-wt-text"
              }`}
              aria-label="Profile"
            >
              <IconUser className="shrink-0" />
              Profile
            </Link>
          </div>
        ) : null}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 shrink-0 border-b border-wt-border bg-wt-bg px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              {activeTab === "profile" && !isLearningRoute ? "My profile" : null}
              {activeTab !== "profile" && !isLearningRoute ? "Dashboard" : null}
              {isLearningRoute ? "Learning & Development" : null}
            </h2>
            <p className="text-xs text-wt-text-muted">
              {isLearningRoute ? learningSectionTitle : "WebTrak workforce workspace"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <details
              className="group relative"
              onToggle={(e) => {
                const el = e.currentTarget as HTMLDetailsElement;
                if (el.open) {
                  void loadNotifications().catch(() => setNotifications([]));
                }
              }}
            >
              <summary className="relative flex cursor-pointer list-none items-center justify-center rounded-lg border border-wt-border bg-wt-surface-1 p-2.5 text-wt-text shadow-sm transition hover:bg-wt-surface-2 [&::-webkit-details-marker]:hidden">
                <IconBell className="text-wt-text-muted" />
                {unreadNotificationCount ? (
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </span>
                ) : null}
              </summary>
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(100vw-2rem,360px)] rounded-xl border border-wt-border bg-wt-surface-1 p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                  <button
                    type="button"
                    className="btn-ghost px-2.5 py-1.5 text-xs"
                    onClick={() =>
                      runAction("Mark all notifications read", async () => {
                        await hrmsService.markAllNotificationsRead();
                        await loadNotifications();
                      })
                    }
                    disabled={actionLoading || !notifications.length}
                  >
                    Read All
                  </button>
                </div>
                <div className="max-h-[320px] space-y-2 overflow-auto pr-1">
                  {notifications.length ? (
                    notifications.map((row, idx) => {
                      const id = String(row.id ?? row.notification_id ?? row.notificationId ?? "").trim();
                      const isRead = Boolean(row.is_read ?? row.isRead ?? false);
                      const message = String(row.message ?? "").trim() || "—";
                      const roleLabel = extractRoleFromNotificationMessage(message);
                      return (
                        <div
                          key={id || `notification-${idx}`}
                          className="flex items-start justify-between gap-2 rounded-lg border border-wt-border bg-wt-surface-2 p-2.5"
                        >
                          <div className="min-w-0 space-y-1">
                            <span className="inline-block rounded-full border border-wt-border bg-wt-surface-1 px-2 py-0.5 text-[10px] font-medium text-wt-text-muted">
                              {roleLabel}
                            </span>
                            <p className={`text-sm break-words ${isRead ? "text-wt-text-muted" : "text-wt-text"}`}>
                              {message}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="rounded-md border border-wt-border p-1 text-wt-text-muted hover:bg-wt-surface-3 disabled:opacity-40"
                            disabled={actionLoading || isRead || !id}
                            onClick={() =>
                              runAction("Mark notification read", async () => {
                                await apiClient.put(endpoints.notifications.readById(id));
                                await loadNotifications();
                              })
                            }
                          >
                            <IconCheck />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-wt-text-muted">No notifications.</p>
                  )}
                </div>
              </div>
            </details>
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center justify-center rounded-lg border border-wt-border bg-wt-surface-1 p-2.5 text-wt-text shadow-sm transition hover:bg-wt-surface-2 [&::-webkit-details-marker]:hidden">
                <IconSettings className="h-5 w-5 text-wt-text-muted" />
              </summary>
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(100vw-2rem,280px)] space-y-4 rounded-xl border border-wt-border bg-wt-surface-1 p-4 shadow-lg">
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-wt-text-muted">Theme</span>
                  <select
                    value={theme}
                    onChange={(event) => {
                      const nextTheme = event.target.value as "light" | "dark" | "system";
                      setTheme(nextTheme);
                      applyTheme(nextTheme);
                    }}
                    className="input-field w-full px-3 py-2 text-sm"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="w-full rounded-lg border border-red-600/90 bg-red-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
              </div>
            </details>
          </div>
        </header>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
      </div>
    </div>
  );
}
