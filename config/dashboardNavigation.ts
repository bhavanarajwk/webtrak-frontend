export type NavItem =
  | { id: string; label: string; roles: string[] }
  | {
      id: string;
      label: string;
      roles: string[];
      children: Array<{ id: string; label: string }>;
    };

export const dashboardNavigation: NavItem[] = [
  { id: "overview", label: "Overview", roles: ["ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN", "ROLE_FINANCE"] },
  { id: "employee", label: "Employee & Onboarding", roles: ["ROLE_EMPLOYEE", "ROLE_HR", "ROLE_ADMIN"] },
  { id: "allocation", label: "Allocation & Projects", roles: ["ROLE_HR", "ROLE_ADMIN"] },
  { id: "allocation-extension", label: "Allocation Extensions", roles: ["ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"] },
  { id: "offboarding", label: "Offboarding", roles: ["ROLE_HR"] },
  { id: "background-verification", label: "Background Verification", roles: ["ROLE_HR"] },
  { id: "timelog", label: "Timelog", roles: ["ROLE_EMPLOYEE", "ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"] },
  { id: "leave", label: "Leave Requests", roles: ["ROLE_EMPLOYEE", "ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"] },
  {
    id: "learning",
    label: "Learning & Development",
    roles: ["ROLE_EMPLOYEE", "ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"],
  },
  {
    id: "reports",
    label: "Reports",
    roles: ["ROLE_HR", "ROLE_ADMIN"],
    children: [
      { id: "reports-workforce", label: "Workforce Overview" },
      { id: "reports-section-2", label: "Utilization vs Effort" },
      { id: "reports-section-3", label: "Attrition & Retention" },
      { id: "reports-section-4", label: "Skill & Capacity Report" },
      { id: "reports-section-5", label: "Engagement & Culture Metrics" },
      { id: "reports-section-6", label: "Compliance & Risk Support Report" },
      { id: "reports-section-7", label: "BGV Report Dashboard" },
    ],
  },
  { id: "uploads", label: "Uploads", roles: ["ROLE_HR", "ROLE_ADMIN"] },
  { id: "masters", label: "Masters & Admin", roles: ["ROLE_HR", "ROLE_ADMIN"] },
];

export function filterVisibleNavigation(
  items: NavItem[],
  userRoles: string[],
  options: { hasHrAccess: boolean }
): NavItem[] {
  return items.filter((item) => {
    if (item.id === "employee" && !options.hasHrAccess) return false;
    return item.roles.length === 0 ? true : item.roles.some((r) => userRoles.includes(r));
  });
}
