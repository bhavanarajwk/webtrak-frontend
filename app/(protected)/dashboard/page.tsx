"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient, type ApiEnvelope } from "@/src/api/httpClient";
import { endpoints } from "@/src/api/endpoints";
import { hrmsService, type PagedData } from "@/src/services/hrms.service";
import { useOverviewData } from "@/src/hooks/useOverviewData";
import { ApiError } from "@/src/api/error";
import { useDashboardNav } from "@/components/dashboard/DashboardNavContext";
import { dashboardNavigation, filterVisibleNavigation } from "@/config/dashboardNavigation";
import { toRows, toPagedRows } from "@/src/lib/apiRows";
import { AllocationExtensionPanel } from "@/app/(protected)/dashboard/AllocationExtensionPanel";
import { AccountManagerSelect } from "@/components/allocation/AccountManagerSelect";

const HARDCODED_DEPARTMENT_OPTIONS = [
  "Developer",
  "Quality Assurance",
  "UI/UX",
  "Delivery Manager",
  "AI/ML",
  "Human Resources",
  "Finance",
  "QA",
  "Project Manager",
  "Business Analyst",
  "Account Manager",
  "DevOps",
  "Executive",
];

const MAX_ONBOARD_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ONBOARD_TOTAL_BYTES = 6 * 1024 * 1024;

function IconUser({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 ${className}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.33 0-8 1.67-8 5v1h16v-1c0-3.33-4.67-5-8-5z" />
    </svg>
  );
}

function IconPencil({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IconTrash({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" />
    </svg>
  );
}

function IconRefresh({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.13-3.36L23 10M1 14l5.36 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

const ONBOARDING_INVITE_PREVIEW_LIMIT = 6;

function employeeRowStatusUpper(row: Record<string, unknown>): string {
  return String(row.status ?? row.user_status ?? row.userStatus ?? "").trim().toUpperCase();
}

function employeeRowRecencyMs(row: Record<string, unknown>): number {
  const candidates: unknown[] = [
    row.updated_at,
    row.updatedAt,
    row.created_at,
    row.createdAt,
    row.doj,
    row.doi,
    row.joining_date,
    row.joiningDate,
    row.id,
  ];
  for (const v of candidates) {
    if (v == null) continue;
    if (typeof v === "number" && Number.isFinite(v)) {
      return v > 1e12 ? v : v * 1000;
    }
    const s = String(v).trim();
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      if (Number.isFinite(n)) {
        return n > 1e12 ? n : n * 1000;
      }
    }
    const t = Date.parse(s);
    if (!Number.isNaN(t)) {
      return t;
    }
  }
  return 0;
}

function pickRecentInviteEmployees(
  rows: Array<Record<string, unknown>>,
  limit: number
): Array<Record<string, unknown>> {
  const inviteOnly = rows.filter((row) => {
    const s = employeeRowStatusUpper(row);
    return s === "INVITE" || s === "INVITED";
  });
  inviteOnly.sort((a, b) => employeeRowRecencyMs(b) - employeeRowRecencyMs(a));
  return inviteOnly.slice(0, limit);
}

function allocationAccManagerCell(row: Record<string, unknown>): string {
  const v =
    row.acc_manager ??
    row.accManager ??
    row.account_manager ??
    row.accountManager ??
    row.account_mgr ??
    row.accountMgr;
  const s = String(v ?? "").trim();
  return s || "—";
}

/** Letters, spaces, common punctuation; 2–120 chars */
function isValidPersonName(name: string): boolean {
  const t = name.trim();
  if (t.length < 2 || t.length > 120) return false;
  return /^[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ\s.'-]*$/u.test(t);
}

/** India mobile: optional +91, then 10 digits starting 6–9 */
function isValidIndiaMobile(phone: string): boolean {
  const d = phone.replace(/[\s-]/g, "");
  if (!d) return false;
  return /^(\+91)?[6-9]\d{9}$/.test(d);
}

function generateAutomaticProjectCode(): string {
  const part = `${Date.now()}`.slice(-6);
  return `P00${part}`;
}

/** Designations that use allocated hours 1–8 (others use 4 or 8 only). */
function designationAllowsFlexibleHours(designation: string): boolean {
  const r = designation.trim().toLowerCase();
  if (!r) return false;
  return (
    r.includes("design") ||
    r.includes("devops") ||
    r.includes("project manager") ||
    r.includes("delivery manager") ||
    /\bpm\b/.test(r) ||
    /\bdm\b/.test(r) ||
    r.includes("chief") ||
    r.includes("ceo") ||
    r.includes("cto") ||
    r.includes("cfo") ||
    r.includes("coo") ||
    r.includes("c-suite") ||
    r.includes("csuite") ||
    r.includes("c suite") ||
    r.includes("chair")
  );
}

const FLEXIBLE_ALLOCATION_HOUR_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;
const RESTRICTED_ALLOCATION_HOUR_OPTIONS = ["4", "8"] as const;

/** Full-time day = 8h → percentage of capacity (for display). */
function formatAllocatedHoursPercentLabel(hoursRaw: unknown): string {
  const raw = String(hoursRaw ?? "").trim();
  if (!raw || raw === "—") return "—";
  const n = Number.parseFloat(raw.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return raw;
  const pct = Math.min(100, Math.round((n / 8) * 100));
  return `${pct}% (${n}h)`;
}

function DashboardPageContent() {
  const isManagerFlagTruthy = (value: unknown): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    const normalized = String(value ?? "").trim().toLowerCase();
    if (!normalized) return false;
    if (["true", "yes", "y", "1", "manager"].includes(normalized)) return true;
    if (["false", "no", "n", "0"].includes(normalized)) return false;
    return false;
  };
  const isManagerRoleLabel = (value: unknown): boolean =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .includes("manager");
  const REQUEST_TYPE_ALIASES: Record<string, string[]> = {
    LEAVE: ["LEAVE"],
    WFH: ["WFH"],
    COMP_OFF: ["COMP_OFF", "COMPOFF", "COMP-OFF", "COMP OFF"],
  };

  const { user, signOut, refresh: refreshSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { metrics, loading, refresh } = useOverviewData();
  const { activeTab, setActiveTab, goToTab, setReportsExpanded } = useDashboardNav();
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("wt-theme");
    if (stored === "dark" || stored === "light" || stored === "system") return stored;
    return "light";
  });
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState<Record<string, unknown> | null>(null);
  const [inviteOnboardingRows, setInviteOnboardingRows] = useState<Array<Record<string, unknown>>>([]);
  const [allocations, setAllocations] = useState<Array<Record<string, unknown>>>([]);
  const [allocationForecastRows, setAllocationForecastRows] = useState<Array<Record<string, unknown>>>([]);
  const allocationRecordsRef = useRef<HTMLDivElement>(null);
  const projectCrudFormRef = useRef<HTMLDivElement>(null);
  const allocationFormRef = useRef<HTMLDivElement>(null);
  const [allocationRoles, setAllocationRoles] = useState<string[]>([]);
  const [allocationUsers, setAllocationUsers] = useState<
    Array<{ name: string; email: string; role?: string }>
  >([]);
  const [allocationProjects, setAllocationProjects] = useState<
    Array<{ code: string; name: string; project_type?: string }>
  >([]);
  const [allocationEmployeePickerOpen, setAllocationEmployeePickerOpen] = useState(false);
  const [allocationEmployeePickerQuery, setAllocationEmployeePickerQuery] = useState("");
  const allocationEmployeeComboboxRef = useRef<HTMLDivElement>(null);
  const [allocationListMissingEndDateOnly, setAllocationListMissingEndDateOnly] = useState(false);
  const [projects, setProjects] = useState<Array<Record<string, unknown>>>([]);
  const [assignedProjects, setAssignedProjects] = useState<Array<Record<string, unknown>>>([]);
  const [timelogs, setTimelogs] = useState<Array<Record<string, unknown>>>([]);
  const [managerEmailsForHr, setManagerEmailsForHr] = useState<string[]>([]);
  const [timelogProjects, setTimelogProjects] = useState<Array<{ code: string; name: string }>>([]);
  const [hrTimelogDirectoryEmails, setHrTimelogDirectoryEmails] = useState<string[]>([]);
  const [timelogForm, setTimelogForm] = useState({
    project_code: "",
    log_date: "",
    hours: "1",
    description: "",
    /** HR/Admin: optional — submit timelog for this employee when the API accepts it */
    subject_employee_email: "",
  });
  const [myLeaveRequests, setMyLeaveRequests] = useState<Array<Record<string, unknown>>>([]);
  const [employeeRequests, setEmployeeRequests] = useState<Array<Record<string, unknown>>>([]);
  const [kpis, setKpis] = useState<Array<Record<string, unknown>>>([]);
  const [headcountBreakdown, setHeadcountBreakdown] = useState<Array<Record<string, unknown>>>([]);
  const [roleBillingRows, setRoleBillingRows] = useState<Array<Record<string, unknown>>>([]);
  const [experienceBandRows, setExperienceBandRows] = useState<Array<Record<string, unknown>>>([]);
  const [utilizationByDepartmentRows, setUtilizationByDepartmentRows] = useState<Array<Record<string, unknown>>>([]);
  const [benchAgingRows, setBenchAgingRows] = useState<Array<Record<string, unknown>>>([]);
  const [offboardingUsers, setOffboardingUsers] = useState<Array<{ emp_id: string; name: string; email: string }>>([]);
  const [bgvUsers, setBgvUsers] = useState<
    Array<{ emp_id: string; name: string; email: string; role: string; level: string }>
  >([]);
  const [bgvRecords, setBgvRecords] = useState<Array<Record<string, unknown>>>([]);
  const [bgvDashboardRows, setBgvDashboardRows] = useState<Array<Record<string, unknown>>>([]);
  const [offboardingForm, setOffboardingForm] = useState({
    emp_id: "",
    resignation_date: "",
    last_working_day: "",
    separation_type: "VOLUNTARY" as "VOLUNTARY" | "INVOLUNTARY",
    reason: "",
    critical_skill: "",
    is_regretted: false,
  });
  const [bgvForm, setBgvForm] = useState({
    emp_id: "",
    name: "",
    role: "",
    level: "",
    consent_form_signed: "NO",
    identity: "",
    employment: "N/A",
    reference: "N/A",
    mail_id: "",
    onboarding_form: "PENDING",
    overall_status: "IN_PROGRESS",
    remarks: "",
  });
  const [attritionFyStartYear, setAttritionFyStartYear] = useState<string>(() => {
    const now = new Date();
    const year = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
    return String(year);
  });
  const [attritionOverallRows, setAttritionOverallRows] = useState<Array<Record<string, unknown>>>([]);
  const [attritionVoluntaryRows, setAttritionVoluntaryRows] = useState<Array<Record<string, unknown>>>([]);
  const [attritionRoleWiseRows, setAttritionRoleWiseRows] = useState<Array<Record<string, unknown>>>([]);
  const [attritionManagerWiseRows, setAttritionManagerWiseRows] = useState<Array<Record<string, unknown>>>([]);
  const [attritionCriticalSkillRows, setAttritionCriticalSkillRows] = useState<Array<Record<string, unknown>>>([]);
  const [attritionRegrettedRows, setAttritionRegrettedRows] = useState<Array<Record<string, unknown>>>([]);
  const [attritionAverageTenureBuckets, setAttritionAverageTenureBuckets] = useState<Array<Record<string, unknown>>>([]);
  const [attritionAverageTenureSummaryRows, setAttritionAverageTenureSummaryRows] = useState<Array<Record<string, unknown>>>([]);
  const [attritionUpsertResultRows, setAttritionUpsertResultRows] = useState<Array<Record<string, unknown>>>([]);
  const [skillInventoryRows, setSkillInventoryRows] = useState<Array<Record<string, unknown>>>([]);
  const [contractDistributionRows, setContractDistributionRows] = useState<Array<Record<string, unknown>>>([]);
  const [bgvReportSearch, setBgvReportSearch] = useState("");
  const [bgvReportStatusFilter, setBgvReportStatusFilter] = useState("ALL");
  const [bgvReportEmploymentFilter, setBgvReportEmploymentFilter] = useState("ALL");
  const [bgvReportReferenceFilter, setBgvReportReferenceFilter] = useState("ALL");
  const [attritionForm, setAttritionForm] = useState({
    emp_id: "",
    separation_type: "VOLUNTARY" as "VOLUNTARY" | "INVOLUNTARY",
    reason: "",
    critical_skill: "",
    is_regretted: false,
    last_working_day: "",
  });
  const [utilizationFilters, setUtilizationFilters] = useState({
    page: "0",
    size: "10",
    search: "",
    as_of: "",
  });
  const [roleAssignForm, setRoleAssignForm] = useState({
    target_email: "",
    role: "ROLE_HR",
  });
  const [roleAssignUsers, setRoleAssignUsers] = useState<Array<{ name: string; email: string }>>([]);

  const [leaveRequestForm, setLeaveRequestForm] = useState({
    request_from_date: "",
    request_to_date: "",
    request_type: "LEAVE",
    comments: "",
    is_half_day: false,
  });
  const [editingLeaveRequestId, setEditingLeaveRequestId] = useState<string>("");
  const [employeeRequestFilters, setEmployeeRequestFilters] = useState({
    fromDate: "",
    toDate: "",
    requestType: "ALL",
  });

  const [onboardForm, setOnboardForm] = useState({
    emp_id: "",
    email: "",
    name: "",
    user_type: "FULLTIME",
    department: "",
    phone_number: "",
    work_mode: "WFO",
    work_location_type: "OFFSHORE",
    role: "",
    band_id: 1,
    delivery_status: "DELIVERABLE",
    doj: "",
    doi: "",
    internship_duration: "",
  });

  const [uploadFiles, setUploadFiles] = useState<Record<string, File | null>>({
    leave: null,
    allocation: null,
    userData: null,
    batch: null,
  });
  const [onboardBands, setOnboardBands] = useState<Array<Record<string, unknown>>>([]);
  const [onboardDepartments, setOnboardDepartments] = useState<string[]>([]);
  const [bandDeptRoleMap, setBandDeptRoleMap] = useState<Record<string, string[]>>({});
  const [selfOnboardForm, setSelfOnboardForm] = useState({
    full_name: "",
    phone_number: "",
    yoe: "",
    primary_skills: "",
    secondary_skill: "",
    secondary_rating: "3",
    work_location_type: "OFFSHORE",
  });
  const [selfOnboardFiles, setSelfOnboardFiles] = useState<{
    resume: File | null;
    profile_photo: File | null;
    aadhaar: File | null;
    pan_card: File | null;
    reliving_letter: File | null;
    salary_slips: File | null;
  }>({
    resume: null,
    profile_photo: null,
    aadhaar: null,
    pan_card: null,
    reliving_letter: null,
    salary_slips: null,
  });
  const [selfProfileForm, setSelfProfileForm] = useState({
    phone_number: "",
    primary_skills: "",
    secondary_skill: "",
    secondary_rating: "3",
    yoe: "",
  });
  const [selfProfileEmploymentFiles, setSelfProfileEmploymentFiles] = useState<{
    reliving_letter: File | null;
    salary_slips: File | null;
  }>({
    reliving_letter: null,
    salary_slips: null,
  });
  const [selfProfilePic, setSelfProfilePic] = useState<File | null>(null);
  const [isEditingOwnProfile, setIsEditingOwnProfile] = useState(false);
  const priorEmploymentDocsForProfile = useMemo(() => {
    const raw = String(selfProfileForm.yoe ?? "").trim().replace(",", ".");
    if (!raw) return false;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0;
  }, [selfProfileForm.yoe]);
  const [isSelfOnboarded, setIsSelfOnboarded] = useState<boolean>(user?.status === "ACTIVE");
  const [projectForm, setProjectForm] = useState({
    project_name: "",
    project_type: "IN_HOUSE" as "IN_HOUSE" | "STAFFING" | "PRODUCT",
    client_name: "",
    account_manager: "",
  });
  const [editingProjectCode, setEditingProjectCode] = useState<string>("");
  const [projectFilters, setProjectFilters] = useState({
    search: "",
    project_type: "ALL",
  });
  const [managerProjects, setManagerProjects] = useState<Array<Record<string, unknown>>>([]);
  const [managerPortfolioRows, setManagerPortfolioRows] = useState<Array<Record<string, unknown>>>([]);
  const [selectedManagerProjectCode, setSelectedManagerProjectCode] = useState("");
  const [teamTimelogEmailFilter, setTeamTimelogEmailFilter] = useState("ALL");
  const managerDataLoadedRef = useRef(false);
  const managerDataLoadingRef = useRef(false);
  const [managerProjectAllocations, setManagerProjectAllocations] = useState<Array<Record<string, unknown>>>([]);
  const managerAllocationsCacheRef = useRef<Record<string, Array<Record<string, unknown>>>>({});
  const [allocationForm, setAllocationForm] = useState({
    allocation_id: "",
    employee_email: "",
    project_code: "",
    role: "",
    allocated_hours: "8",
    start_date: "",
    end_date: "",
    allocation_type: "DEPLOYABLE",
    billing_status: "BILLED" as "BILLED" | "BUFFER" | "INVESTMENT",
    is_manager: false,
  });
  const [editingAllocationId, setEditingAllocationId] = useState<string>("");
  const [allocationHrSubTab, setAllocationHrSubTab] = useState<"project" | "allocate" | "list">(
    "project"
  );
  const [timelogSubTab, setTimelogSubTab] = useState<"my" | "team">("my");
  const [leaveSubTab, setLeaveSubTab] = useState<"my" | "team">("my");
  const userRoles = user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");
  const hasManagerAccess = userRoles.includes("ROLE_MANAGER");
  const canExportTimelog = hasHrAccess || hasManagerAccess;
  const isEmployee = userRoles.includes("ROLE_EMPLOYEE");
  const restrictForPendingOnboarding =
    isEmployee && !hasHrAccess && !hasManagerAccess;
  const requiresSelfOnboarding = restrictForPendingOnboarding && !isSelfOnboarded;
  /** Self-service profile + onboarding (non-HR employees only) */
  const employeeSelfServeProfile = isEmployee && !hasHrAccess;
  const canAccessProfile = Boolean(user);

  useEffect(() => {
    if (activeTab === "team-timelog") {
      setTimelogSubTab("team");
      setActiveTab("timelog");
      router.replace("/dashboard?tab=timelog", { scroll: false });
      return;
    }
    if (activeTab === "employee-request") {
      setLeaveSubTab("team");
      setActiveTab("leave");
      router.replace("/dashboard?tab=leave", { scroll: false });
    }
  }, [activeTab, setActiveTab, router]);

  useEffect(() => {
    if (activeTab !== "timelog") return;
    if (!hasManagerAccess && !hasHrAccess && timelogSubTab === "team") {
      setTimelogSubTab("my");
    }
  }, [activeTab, hasManagerAccess, hasHrAccess, timelogSubTab]);

  useEffect(() => {
    if (activeTab !== "leave") return;
    if (!hasManagerAccess && !hasHrAccess && leaveSubTab === "team") {
      setLeaveSubTab("my");
    }
  }, [activeTab, hasManagerAccess, hasHrAccess, leaveSubTab]);

  const loadManagerData = useCallback(
    async (force = false) => {
      if (!hasManagerAccess) return { projectRows: [] as Array<Record<string, unknown>>, detailRows: [] as Array<Record<string, unknown>> };
      if (!force && managerDataLoadedRef.current) {
        return { projectRows: managerProjects, detailRows: managerPortfolioRows };
      }
      if (managerDataLoadingRef.current) {
        return { projectRows: managerProjects, detailRows: managerPortfolioRows };
      }
      managerDataLoadingRef.current = true;
      try {
        const [projectRes, detailRes] = await Promise.all([
          hrmsService.getManagerProjects(),
          hrmsService.getManagerProjectsWithRoles(),
        ]);
        const projectRows = toPagedRows(projectRes.data ?? projectRes);
        const detailRows = toPagedRows(detailRes.data ?? detailRes);
        // Fallback: if projects endpoint is empty but team-details has project info,
        // derive visible project list from detail rows.
        const effectiveProjectRows = projectRows.length ? projectRows : detailRows;
        setManagerProjects(effectiveProjectRows);
        setManagerPortfolioRows(detailRows);
        managerDataLoadedRef.current = true;
        const fallbackProjectCode = managerProjectCode(effectiveProjectRows[0] ?? detailRows[0] ?? {});
        setSelectedManagerProjectCode((prev) => prev || fallbackProjectCode);
        return { projectRows: effectiveProjectRows, detailRows };
      } finally {
        managerDataLoadingRef.current = false;
      }
    },
    [hasManagerAccess, managerProjects, managerPortfolioRows]
  );

  const loadAllProjectsForHr = useCallback(async () => {
    const res = await hrmsService.getProjects({ page: "0", size: "500" });
    const rows = toRows(res.data);
    if (rows.length) return rows;
    const fallback = await hrmsService.getAllProjects({});
    return toRows(fallback.data ?? fallback);
  }, []);

  const priorEmploymentDocsRequired = useMemo(() => {
    const raw = String(selfOnboardForm.yoe ?? "").trim().replace(",", ".");
    if (!raw) return false;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0;
  }, [selfOnboardForm.yoe]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "profile" && !canAccessProfile) {
      router.replace("/dashboard", { scroll: false });
      return;
    }
    if (tab === "profile" && canAccessProfile) {
      setActiveTab("profile");
    }
  }, [searchParams, canAccessProfile, router]);

  const loadMyProfile = useCallback(async () => {
    const res = await hrmsService.getMyProfile();
    const profile = (res.data ?? null) as Record<string, unknown> | null;
    setEmployeeProfile(profile);
    if (!profile) return;

    const status = String(profile.status ?? user?.status ?? "").toUpperCase();
    setIsSelfOnboarded(status === "ACTIVE");
  }, [user?.status]);

  useEffect(() => {
    if (!user) return;
    const id = window.setTimeout(() => {
      void loadMyProfile();
    }, 0);
    return () => window.clearTimeout(id);
  }, [user, loadMyProfile, activeTab]);

  useEffect(() => {
    if (activeTab !== "employee") return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const [bandsRes, departmentsRes] = await Promise.all([
            hrmsService.getBands(),
            hrmsService.getDepartments(),
          ]);
          const rows = toRows(bandsRes);
          setOnboardBands(rows);

          let departments = Array.from(
            new Set(
              toPagedRows((departmentsRes as { data?: unknown }).data ?? departmentsRes)
                .map((row) =>
                  String(
                    row.department ??
                      row.department_name ??
                      row.departmentName ??
                      row.name ??
                      row.value ??
                      ""
                  ).trim()
                )
                .filter((value) => Boolean(value))
            )
          ).sort();

          // Fallback only if departments API returns nothing.
          if (!departments.length) {
            departments = Array.from(
              new Set(
                rows
                  .map((row) => String(row.stream ?? row.department ?? "").trim())
                  .filter((value) => Boolean(value))
              )
            ).sort();
          }
          if (!departments.length) {
            const kpiRes = await hrmsService.getKpis({ limit: "200", offset: "0" });
            const kpiRows = toRows((kpiRes as { data?: unknown }).data ?? kpiRes);
            departments = Array.from(
              new Set(
                kpiRows
                  .map((row) => String(row.department ?? "").trim())
                  .filter((value) => Boolean(value))
              )
            ).sort();
          }
          setOnboardDepartments(
            Array.from(
              new Set([...HARDCODED_DEPARTMENT_OPTIONS, ...departments])
            ).sort()
          );
        } catch {
          setOnboardDepartments(HARDCODED_DEPARTMENT_OPTIONS);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "employee") return;
    if (!onboardForm.band_id) {
      return;
    }
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const bandId = String(onboardForm.band_id);
          const departmentsToQuery = onboardDepartments;
          if (!departmentsToQuery.length) {
            setBandDeptRoleMap({});
            return;
          }
          const deptResults = await Promise.allSettled(
            departmentsToQuery.map(async (department) => {
              const response = await hrmsService.getDesignations({
                band_id: bandId,
                department,
              });
              const rows = toRows(response);
              const roles = Array.from(
                new Set(
                  rows
                    .map((row) =>
                      String(row.designation ?? row.role ?? row.name ?? "").trim()
                    )
                    .filter((value) => Boolean(value))
                )
              ).sort();
              return { department, roles };
            })
          );
          const deptEntries = deptResults
            .filter(
              (
                result
              ): result is PromiseFulfilledResult<{ department: string; roles: string[] }> =>
                result.status === "fulfilled"
            )
            .map((result) => result.value);

          const nextMap = deptEntries.reduce<Record<string, string[]>>((acc, item) => {
            acc[item.department] = item.roles;
            return acc;
          }, {});

          setBandDeptRoleMap(nextMap);
          const resolvedDepartment = departmentsToQuery.includes(onboardForm.department)
            ? onboardForm.department
            : departmentsToQuery[0] ?? "";
          const resolvedRoles = nextMap[resolvedDepartment] ?? [];

          if (
            resolvedDepartment !== onboardForm.department ||
            (onboardForm.role && !resolvedRoles.includes(onboardForm.role))
          ) {
            setOnboardForm((prev) => ({
              ...prev,
              department: resolvedDepartment,
              role: resolvedRoles.includes(prev.role) ? prev.role : resolvedRoles[0] ?? "",
            }));
          }
        } catch {
          setBandDeptRoleMap({});
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, onboardForm.band_id, onboardForm.department, onboardForm.role, onboardDepartments]);

  useEffect(() => {
    if (activeTab !== "allocation") return;
    const hasAllocationAccess =
      (user?.roles ?? []).includes("ROLE_HR") || (user?.roles ?? []).includes("ROLE_ADMIN");
    if (!hasAllocationAccess) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const [response, onboardRes, projectRes] = await Promise.all([
            hrmsService.getAllocationRoles({}),
            hrmsService.getOnboardList({ page: "0", size: "10" }),
            hrmsService.getProjects({ page: "0", size: "10" }),
          ]);
          const rows = toRows(response.data ?? response);
          const roles = Array.from(
            new Set(
              rows
                .map((row) => String(row.name ?? row.role ?? "").trim())
                .filter(Boolean)
            )
          ).sort();
          setAllocationRoles(roles);
          const userRows = toPagedRows(onboardRes.data ?? onboardRes);
          const users = Array.from(
            new Map(
              userRows
                .map((row) => {
                  const email = String(row.email ?? "").trim();
                  const name = String(row.name ?? email).trim();
                  const role = String(
                    row.role ?? row.designation ?? row.designation_name ?? row.designationName ?? ""
                  ).trim();
                  if (!email) return null;
                  return [email.toLowerCase(), { name, email, ...(role ? { role } : {}) }] as const;
                })
                .filter(
                  (x): x is readonly [string, { name: string; email: string; role?: string }] => Boolean(x)
                )
            ).values()
          );
          setAllocationUsers(users);
          let projectRows = toRows(projectRes.data);
          if (!projectRows.length) {
            const fallback = await hrmsService.getAllProjects({});
            projectRows = toRows(fallback.data ?? fallback);
          }
          const projects = Array.from(
            new Map(
              projectRows
                .map((row) => {
                  const code = String(row.project_code ?? row.projectCode ?? "").trim();
                  const name = String(row.project_name ?? row.projectName ?? code).trim();
                  if (!code) return null;
                  const project_type = String(row.project_type ?? row.projectType ?? "").trim();
                  return [code, { code, name, project_type }] as [
                    string,
                    { code: string; name: string; project_type: string },
                  ];
                })
                .filter(
                  (x): x is [string, { code: string; name: string; project_type: string }] => x != null
                )
            ).values()
          ).sort((a, b) => a.name.localeCompare(b.name));
          setAllocationProjects(projects);
          const onboardEmailToName = buildEmailToNameMap(userRows);
          const projectDisplayByCode = buildProjectCodeDisplayMap(projectRows);

          try {
            const forecastRes = await hrmsService.getAllocationForecasting({ days: 14 });
            const forecastRows = toPagedRows((forecastRes as { data?: unknown }).data ?? forecastRes);
            setAllocationForecastRows(
              normalizeForecastRows(forecastRows, {
                emailToName: onboardEmailToName,
                projectDisplayByCode,
              })
            );
          } catch {
            setAllocationForecastRows([]);
          }
        } catch {
          setAllocationRoles([]);
          setAllocationUsers([]);
          setAllocationProjects([]);
          setAllocationForecastRows([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, user?.roles]);

  useEffect(() => {
    if (activeTab !== "masters") return;
    if (!(userRoles.includes("ROLE_ADMIN") || userRoles.includes("ROLE_HR"))) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await hrmsService.getOnboardList({ page: "0", size: "200" });
          const rows = toPagedRows((res as { data?: unknown }).data ?? res);
          const users = Array.from(
            new Map(
              rows
                .map((row) => {
                  const email = String(row.email ?? "").trim();
                  if (!email) return null;
                  const name = String(row.name ?? email).trim();
                  return [email.toLowerCase(), { name, email }] as const;
                })
                .filter((entry): entry is readonly [string, { name: string; email: string }] => Boolean(entry))
            ).values()
          ).sort((a, b) => a.name.localeCompare(b.name));
          setRoleAssignUsers(users);
        } catch {
          setRoleAssignUsers([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, userRoles]);

  useEffect(() => {
    if (activeTab !== "overview") return;
    if (hasManagerAccess) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const [assignedRes, myAllocationsRes] = await Promise.all([
            hrmsService.getAssignedProjects(),
            hrmsService.getMyAllocations(),
          ]);
          const normalizedProjects = normalizeAssignedProjects(
            toPagedRows(assignedRes.data ?? assignedRes)
          );
          const myAllocations = toPagedRows(myAllocationsRes.data ?? myAllocationsRes);
          setAssignedProjects(mergeProjectAndAllocationData(normalizedProjects, myAllocations));
        } catch {
          setAssignedProjects([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasManagerAccess]);
  useEffect(() => {
    if (activeTab !== "timelog" || requiresSelfOnboarding) return;
    if (!hasHrAccess) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "200" });
          const rows = toPagedRows(onboardRes.data ?? onboardRes);
          const emails = Array.from(
            new Set(
              rows
                .map((row) =>
                  String(row.email ?? row.user_email ?? row.userEmail ?? "").trim().toLowerCase()
                )
                .filter(Boolean)
            )
          ).sort();
          setHrTimelogDirectoryEmails(emails);
        } catch {
          setHrTimelogDirectoryEmails([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasHrAccess, requiresSelfOnboarding]);

  useEffect(() => {
    if (activeTab !== "timelog" || requiresSelfOnboarding) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          if (timelogSubTab === "my") {
            const [_, assignedRes, allocationRes] = await Promise.all([
              loadTimelogsForCurrentRole(),
              hrmsService.getAssignedProjects(),
              hrmsService.getMyAllocations(),
            ]);
            const assignedRows = toPagedRows(assignedRes.data ?? assignedRes);
            const allocationRows = toPagedRows(allocationRes.data ?? allocationRes);
            let projects = Array.from(
              new Map(
                [...assignedRows, ...allocationRows]
                  .map((row) => {
                    const code = String(
                      row.project_code ?? row.projectCode ?? row.code ?? row.project_id ?? row.projectId ?? ""
                    ).trim();
                    if (!code) return null;
                    const name = String(row.project_name ?? row.projectName ?? row.name ?? code).trim();
                    return [code.toLowerCase(), { code, name }] as const;
                  })
                  .filter((entry): entry is readonly [string, { code: string; name: string }] => Boolean(entry))
              ).values()
            ).sort((a, b) => a.name.localeCompare(b.name));
            if (hasHrAccess && !projects.length) {
              const all = await loadAllProjectsForHr();
              projects = Array.from(
                new Map(
                  all
                    .map((row) => {
                      const code = String(row.project_code ?? row.projectCode ?? "").trim();
                      const name = String(row.project_name ?? row.projectName ?? code).trim();
                      if (!code) return null;
                      return [code.toLowerCase(), { code, name }] as const;
                    })
                    .filter((entry): entry is readonly [string, { code: string; name: string }] => Boolean(entry))
                ).values()
              ).sort((a, b) => a.name.localeCompare(b.name));
            }
            setTimelogProjects(projects);
            return;
          }
          await loadTimelogsForCurrentRole();
        } catch {
          setTimelogs([]);
          setManagerEmailsForHr([]);
          if (timelogSubTab === "my") setTimelogProjects([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, timelogSubTab, hasHrAccess, requiresSelfOnboarding, loadTimelogsForCurrentRole, loadAllProjectsForHr]);

  useEffect(() => {
    if (activeTab !== "timelog" || timelogSubTab !== "team" || !hasManagerAccess) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          await loadManagerData();
        } catch {
          setManagerProjects([]);
          setManagerPortfolioRows([]);
          setSelectedManagerProjectCode("");
          managerDataLoadedRef.current = false;
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, timelogSubTab, hasManagerAccess, loadManagerData]);

  useEffect(() => {
    if (!hasManagerAccess) return;
    if (activeTab !== "timelog" || timelogSubTab !== "team") return;
    const code = selectedManagerProjectCode.trim();
    if (!code) {
      setManagerProjectAllocations([]);
      return;
    }

    const cacheKey = code.toLowerCase();
    const cached = managerAllocationsCacheRef.current[cacheKey];
    if (cached) {
      setManagerProjectAllocations(cached);
      return;
    }

    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await hrmsService.getAllocations({
            page: "0",
            size: "200",
            projectCode: code,
          });
          const rows = toPagedRows(res.data ?? res);
          managerAllocationsCacheRef.current[cacheKey] = rows;
          setManagerProjectAllocations(rows);
        } catch {
          setManagerProjectAllocations([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, timelogSubTab, hasManagerAccess, selectedManagerProjectCode]);

  useEffect(() => {
    if (activeTab !== "leave") return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          await loadMyLeaveRequests();
        } catch {
          setMyLeaveRequests([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, user]);
  useEffect(() => {
    if (activeTab !== "leave") return;
    const timer = window.setInterval(() => {
      void loadMyLeaveRequests().catch(() => {
        /* ignore periodic refresh errors */
      });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [activeTab, user]);
  function applyTheme(nextTheme: "light" | "dark" | "system") {
    const root = document.documentElement;
    if (nextTheme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", nextTheme);
    }
    window.localStorage.setItem("wt-theme", nextTheme);
  }

  async function runAction(label: string, fn: () => Promise<unknown>) {
    setActionLoading(true);
    try {
      await fn();
      setToast({ type: "success", message: `${label} completed.` });
      if (activeTab === "overview") refresh();
    } catch (error) {
      const backendMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "";
      setToast({
        type: "error",
        message: backendMessage || `Unable to ${label.toLowerCase()}. Please try again.`,
      });
    } finally {
      setActionLoading(false);
    }
  }

  function buildUserIdToNameMap(users: Array<Record<string, unknown>>) {
    const map: Record<string, string> = {};
    for (const u of users) {
      const name = String(u.name ?? "").trim();
      if (!name) continue;
      for (const key of ["id", "user_id", "userId", "userID", "emp_id"] as const) {
        const v = u[key];
        if (v != null && v !== "") map[String(v)] = name;
      }
    }
    return map;
  }

  function buildEmailToNameMap(users: Array<Record<string, unknown>>) {
    const map: Record<string, string> = {};
    for (const u of users) {
      const email = String(u.email ?? "").trim().toLowerCase();
      const name = String(u.name ?? "").trim();
      if (email && name) map[email] = name;
    }
    return map;
  }

  function allocationRowEmail(row: Record<string, unknown>) {
    return String(
      row.employee_email ??
        row.employeeEmail ??
        row.user_email ??
        row.userEmail ??
        row.email ??
        ""
    )
      .trim()
      .toLowerCase();
  }

  /** Raw project code from allocation row (may be empty). */
  function allocationProjectCode(row: Record<string, unknown>): string {
    const direct =
      row.project_code ??
      row.projectCode ??
      row.project_id ??
      row.projectId ??
      row.proj_code ??
      row.projCode;
    if (direct != null && direct !== "") return String(direct).trim();
    for (const key of Object.keys(row)) {
      const norm = key.toLowerCase().replace(/-/g, "_");
      if (
        norm === "project_code" ||
        norm === "project_id" ||
        norm === "projectcode" ||
        norm === "projectid"
      ) {
        const v = row[key];
        if (v != null && v !== "") return String(v).trim();
      }
    }
    return "";
  }

  function allocationProjectTitleFromRow(row: Record<string, unknown>) {
    return String(
      row.project_name ?? row.projectName ?? row.project_title ?? row.projectTitle ?? ""
    ).trim();
  }

  function buildProjectCodeDisplayMap(projectRows: Array<Record<string, unknown>>) {
    const map: Record<string, string> = {};
    for (const p of projectRows) {
      const code = String(p.project_code ?? p.projectCode ?? "").trim();
      if (!code) continue;
      const name = String(p.project_name ?? p.projectName ?? "").trim();
      map[code] = name ? `${code} — ${name}` : code;
    }
    return map;
  }

  function enrichAllocationRowsForDisplay(
    rows: Array<Record<string, unknown>>,
    ctx: {
      userIdToName: Record<string, string>;
      emailToName: Record<string, string>;
      projectDisplayByCode: Record<string, string>;
    }
  ) {
    const { userIdToName, emailToName, projectDisplayByCode } = ctx;
    return rows.map((row) => {
      const uidRaw = row.user_id ?? row.userId ?? row.userID;
      const uid = uidRaw != null && uidRaw !== "" ? String(uidRaw).trim() : "";
      const email = allocationRowEmail(row);

      const fromRow = String(
        row.employee_name ??
          row.employeeName ??
          row.user_name ??
          row.userName ??
          ""
      ).trim();

      let employee_name =
        (uid && userIdToName[uid]) || (email && emailToName[email]) || fromRow;
      if (!employee_name && email) employee_name = email;
      if (!employee_name && uid) employee_name = `Employee #${uid}`;
      if (!employee_name) employee_name = "Employee (unresolved)";

      const code = allocationProjectCode(row);
      const titleOnRow = allocationProjectTitleFromRow(row);
      let allocated_project = "";
      if (code) {
        allocated_project =
          projectDisplayByCode[code] ?? (titleOnRow ? `${code} — ${titleOnRow}` : code);
      } else if (titleOnRow) {
        allocated_project = titleOnRow;
      } else {
        allocated_project = "Project (no code on record)";
      }

      return { ...row, employee_name, allocated_project };
    });
  }

  function normalizeForecastRows(
    rows: Array<Record<string, unknown>>,
    ctx: {
      emailToName: Record<string, string>;
      projectDisplayByCode: Record<string, string>;
    }
  ) {
    const { emailToName, projectDisplayByCode } = ctx;
    return rows.map((row) => {
      const email = allocationRowEmail(row);
      const employeeName = String(
        row.employee_name ??
          row.employeeName ??
          row.user_name ??
          row.userName ??
          (email ? emailToName[email] : "") ??
          ""
      ).trim();

      const code = allocationProjectCode(row) || String(row.project_code ?? row.projectCode ?? "").trim();
      const titleOnRow = allocationProjectTitleFromRow(row);
      const mapped = code ? projectDisplayByCode[code] ?? "" : "";
      const mappedName = mapped.includes("—")
        ? mapped.split("—").slice(1).join("—").trim()
        : mapped.trim();
      const projectName = String(
        row.project_name ?? row.projectName ?? titleOnRow ?? mappedName ?? ""
      ).trim();

      return {
        ...row,
        project_code: code || "—",
        project_name: projectName || "—",
        employee_name: employeeName || "—",
        employee_email: email || "—",
        role: String(row.role ?? row.project_role ?? row.projectRole ?? row.designation ?? "—").trim() || "—",
        billing_status: String(row.billing_status ?? row.billingStatus ?? "—").trim() || "—",
        end_date: String(row.end_date ?? row.endDate ?? "—").trim() || "—",
      } as Record<string, unknown>;
    });
  }

  function normalizeAssignedProjects(rows: Array<Record<string, unknown>>) {
    return rows.map((row) => {
      const isManagerRaw = row.is_manager ?? null;
      const isManager =
        isManagerFlagTruthy(isManagerRaw) || isManagerRoleLabel(row.role ?? row.designation)
          ? "Yes"
          : "No";

      return {
        project_code: row.project_code ?? row.projectCode ?? row.code ?? "—",
        project_name: row.project_name ?? row.projectName ?? row.name ?? "—",
        project_type: row.project_type ?? row.projectType ?? "—",
        role: row.role ?? row.designation ?? "—",
        allocated_hours: row.allocated_hours ?? row.allocatedHours ?? row.hours ?? "—",
        billing_status: row.billing_status ?? row.billingStatus ?? "—",
        is_manager: isManager,
        start_date: row.start_date ?? row.startDate ?? "—",
        end_date: row.end_date ?? row.endDate ?? "—",
      } as Record<string, unknown>;
    });
  }

  function mergeProjectAndAllocationData(
    projectsRows: Array<Record<string, unknown>>,
    allocationRows: Array<Record<string, unknown>>
  ) {
    const allocationByProject = allocationRows.reduce<Record<string, Record<string, unknown>>>(
      (acc, row) => {
        const key = String(row.project_code ?? row.projectCode ?? "").trim();
        if (!key) return acc;
        const existing = acc[key];
        if (!existing) {
          acc[key] = row;
          return acc;
        }
        const existingIsManager =
          isManagerFlagTruthy(existing.is_manager) ||
          isManagerRoleLabel(existing.role ?? existing.designation);
        const nextIsManager =
          isManagerFlagTruthy(row.is_manager) ||
          isManagerRoleLabel(row.role ?? row.designation);
        // Prefer a manager allocation row when multiple users share a project code.
        acc[key] = nextIsManager && !existingIsManager ? row : existing;
        return acc;
      },
      {}
    );

    return projectsRows.map((row) => {
      const projectKey = String(row.project_code ?? "").trim();
      const allocation = allocationByProject[projectKey] ?? {};
      return {
        ...row,
        role: row.role === "—" ? allocation.role ?? allocation.designation ?? "—" : row.role,
        allocated_hours:
          row.allocated_hours === "—"
            ? allocation.allocated_hours ?? allocation.allocatedHours ?? allocation.hours ?? "—"
            : row.allocated_hours,
        billing_status:
          row.billing_status === "—"
            ? allocation.billing_status ?? allocation.billingStatus ?? "—"
            : row.billing_status,
        is_manager:
          row.is_manager === "No" &&
          (allocation.is_manager !== undefined || isManagerRoleLabel(allocation.role ?? allocation.designation))
            ? (() => {
                const raw = allocation.is_manager;
                return isManagerFlagTruthy(raw) || isManagerRoleLabel(allocation.role ?? allocation.designation);
              })()
              ? "Yes"
              : "No"
            : row.is_manager,
        start_date:
          row.start_date === "—"
            ? allocation.start_date ?? allocation.startDate ?? "—"
            : row.start_date,
        end_date:
          row.end_date === "—"
            ? allocation.end_date ?? allocation.endDate ?? "—"
            : row.end_date,
      } as Record<string, unknown>;
    });
  }

  function managerProjectCode(row: Record<string, unknown>) {
    const nestedProject = row.project as Record<string, unknown> | undefined;
    return String(
      row.project_code ??
        row.projectCode ??
        row.project_code_id ??
        row.projectCodeId ??
        row.allocated_project ??
        row.code ??
        nestedProject?.project_code ??
        nestedProject?.projectCode ??
        nestedProject?.code ??
        row.project_id ??
        row.projectId ??
        ""
    ).trim();
  }

  function managerProjectName(row: Record<string, unknown>) {
    const nestedProject = row.project as Record<string, unknown> | undefined;
    return String(
      row.project_name ??
        row.projectName ??
        row.name ??
        row.allocated_project_name ??
        nestedProject?.project_name ??
        nestedProject?.projectName ??
        nestedProject?.name ??
        ""
    ).trim();
  }

  function managerTeamEmails(rows: Array<Record<string, unknown>>) {
    return Array.from(
      new Set(
        rows
          .flatMap((row) => {
            const direct = String(
              row.employee_email ?? row.email ?? row.user_email ?? row.userEmail ?? ""
            )
              .trim()
              .toLowerCase();
            const nestedEmployees = Array.isArray(row.employees)
              ? (row.employees as Array<Record<string, unknown>>)
                  .map((emp) =>
                    String(emp.email ?? emp.user_email ?? emp.userEmail ?? "")
                      .trim()
                      .toLowerCase()
                  )
                  .filter(Boolean)
              : [];
            return [direct, ...nestedEmployees];
          })
          .filter(Boolean)
      )
    );
  }

  function managerTeamRowsForProject(
    rows: Array<Record<string, unknown>>,
    projectCode: string
  ) {
    const normalizedCode = projectCode.trim().toLowerCase();
    if (!normalizedCode) return [];
    return rows
      .filter((row) => managerProjectCode(row).trim().toLowerCase() === normalizedCode)
      .flatMap((row) => {
        const nestedEmployees = Array.isArray(row.employees)
          ? (row.employees as Array<Record<string, unknown>>)
          : [];
        const nestedUser =
          (row.user as Record<string, unknown> | undefined) ??
          (row.employee as Record<string, unknown> | undefined) ??
          (row.member as Record<string, unknown> | undefined) ??
          (row.user_master as Record<string, unknown> | undefined) ??
          (row.userMaster as Record<string, unknown> | undefined);
        const projectName = managerProjectName(row);
        const projectType = String(
          row.project_type ??
            row.projectType ??
            row.type ??
            (row.project as Record<string, unknown> | undefined)?.project_type ??
            (row.project as Record<string, unknown> | undefined)?.projectType ??
            "—"
        ).trim();
        const employeeFromRow = String(
          row.employee_name ??
            row.employeeName ??
            row.emp_name ??
            row.empName ??
            row.name ??
            row.user_name ??
            row.userName ??
            nestedUser?.name ??
            nestedUser?.employee_name ??
            nestedUser?.employeeName ??
            row.email ??
            row.user_email ??
            ""
        ).trim();
        const emailFromRow = String(
          row.email ??
            row.user_email ??
            row.userEmail ??
            row.employee_email ??
            row.employeeEmail ??
            row.emp_email ??
            row.empEmail ??
            nestedUser?.email ??
            nestedUser?.user_email ??
            nestedUser?.userEmail ??
            ""
        ).trim();
        const roleFromRow = String(
          row.role ??
            row.designation ??
            row.employee_role ??
            row.employeeRole ??
            nestedUser?.role ??
            nestedUser?.designation ??
            "—"
        ).trim();
        if (nestedEmployees.length) {
          return nestedEmployees.map((emp) => ({
            project_code: managerProjectCode(row) || "—",
            project_name: projectName || "—",
            project_type: projectType || "—",
            employee: String(emp.name ?? emp.employee_name ?? emp.employeeName ?? "—").trim() || "—",
            email: String(emp.email ?? emp.user_email ?? emp.userEmail ?? "—").trim() || "—",
            role: String(emp.project_role ?? emp.role ?? emp.designation ?? "—").trim() || "—",
            allocated_hours: formatAllocatedHoursPercentLabel(
              emp.allocated_hours ?? emp.allocatedHours ?? row.allocated_hours
            ),
            allocation_type: String(emp.allocation_type ?? emp.allocationType ?? row.allocation_type ?? "—").trim(),
            is_manager: String(emp.is_manager ?? emp.isManager ?? row.is_manager ?? "—").trim(),
            start_date: String(emp.start_date ?? emp.startDate ?? row.start_date ?? "—").trim(),
            end_date: String(emp.end_date ?? emp.endDate ?? row.end_date ?? "—").trim(),
          }));
        }
        return [{
          project_code: managerProjectCode(row) || "—",
          project_name: projectName || "—",
          project_type: projectType || "—",
          employee: employeeFromRow || "—",
          email: emailFromRow || "—",
          role: roleFromRow || "—",
          allocated_hours: formatAllocatedHoursPercentLabel(
            row.allocated_hours ?? row.allocatedHours ?? row.hours
          ),
          allocation_type: String(row.allocation_type ?? row.allocationType ?? "—").trim(),
          is_manager: String(row.is_manager ?? row.isManager ?? "—").trim(),
          start_date: String(row.start_date ?? row.startDate ?? "—").trim(),
          end_date: String(row.end_date ?? row.endDate ?? "—").trim(),
        }];
      })
      .filter((row) => row.employee !== "—" || row.email !== "—");
  }

  const availableOnboardRoles = bandDeptRoleMap[onboardForm.department] ?? [];
  const internBandId = useMemo(() => {
    const hit = onboardBands.find((row) => {
      const n = String(row.name ?? row.id ?? "").trim().toUpperCase();
      return n === "B8" || n.startsWith("B8") || n.includes("B8");
    });
    const id = hit?.id != null ? Number(hit.id) : NaN;
    return Number.isFinite(id) && id > 0 ? id : 8;
  }, [onboardBands]);
  const defaultConsultantBandId = useMemo(() => {
    const first = onboardBands[0];
    const id = first?.id != null ? Number(first.id) : NaN;
    return Number.isFinite(id) && id > 0 ? id : 1;
  }, [onboardBands]);
  const allocationEmployeesPickerFiltered = useMemo(() => {
    const q = allocationEmployeePickerQuery.trim().toLowerCase();
    if (!q) return allocationUsers;
    return allocationUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        Boolean(u.role && u.role.toLowerCase().includes(q))
    );
  }, [allocationUsers, allocationEmployeePickerQuery]);
  const allocationEmployeeSelectLabel = useMemo(() => {
    const email = allocationForm.employee_email.trim().toLowerCase();
    if (!email) return "Select employee";
    const hit = allocationUsers.find((u) => u.email.toLowerCase() === email);
    if (!hit) return allocationForm.employee_email.trim();
    return hit.role
      ? `${hit.name} | ${hit.role} (${hit.email})`
      : `${hit.name} (${hit.email})`;
  }, [allocationUsers, allocationForm.employee_email]);
  const allocationsForListView = useMemo(() => {
    if (!allocationListMissingEndDateOnly) return allocations;
    return allocations.filter((row) => !String(row.end_date ?? row.endDate ?? "").trim());
  }, [allocations, allocationListMissingEndDateOnly]);
  const assignedProjectsWithAllocationPct = useMemo(
    () =>
      assignedProjects.map((row) => ({
        ...row,
        allocated_hours: formatAllocatedHoursPercentLabel(
          row.allocated_hours ?? row.allocatedHours ?? row.hours
        ),
      })),
    [assignedProjects]
  );
  const investmentBenchRows = useMemo(() => {
    const fromAlloc = allocations
      .filter(
        (r) => String(r.billing_status ?? r.billingStatus ?? "").toUpperCase() === "INVESTMENT"
      )
      .map((r) => ({
        source: "Investment allocation",
        name: String(r.employee_name ?? "—"),
        email: String(r.employee_email ?? r.email ?? r.user_email ?? "—"),
        bench_days: "Investment allocation",
      }));
    const fromBench = benchAgingRows.map((r) => ({
      source: String(r.talent_pool ?? r.source ?? "Bench / talent pool"),
      name: String(r.name ?? "—"),
      email: String(r.email ?? "—"),
      bench_days: String(r.bench_days ?? r.benchDays ?? "—"),
    }));
    return [...fromBench, ...fromAlloc];
  }, [allocations, benchAgingRows]);
  const utilizationBenchRowsWithInvestment = useMemo(() => {
    const seen = new Set(
      benchAgingRows.map((r) => String(r.email ?? "").trim().toLowerCase()).filter(Boolean)
    );
    const extras: Array<Record<string, unknown>> = [];
    for (const row of allocations) {
      if (String(row.billing_status ?? row.billingStatus ?? "").toUpperCase() !== "INVESTMENT") continue;
      const email = String(
        row.employee_email ?? row.email ?? row.user_email ?? row.userEmail ?? ""
      )
        .trim()
        .toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      extras.push({
        emp_id: String(row.emp_id ?? row.employee_id ?? row.employeeId ?? row.id ?? "—"),
        email,
        name: String(row.employee_name ?? row.name ?? "—"),
        department: String(row.department ?? row.role ?? row.designation ?? "—"),
        bench_days: "Investment allocation",
      });
    }
    return [...benchAgingRows, ...extras];
  }, [benchAgingRows, allocations]);
  useEffect(() => {
    const code = allocationForm.project_code.trim();
    if (!code) return;
    const fromProjects = projects.find(
      (p) =>
        String(p.project_code ?? p.projectCode ?? "")
          .trim()
          .toLowerCase() === code.toLowerCase()
    );
    const fromAllocList = allocationProjects.find((p) => p.code.toLowerCase() === code.toLowerCase());
    const pt = String(
      fromProjects?.project_type ??
        fromProjects?.projectType ??
        fromAllocList?.project_type ??
        ""
    ).toUpperCase();
    if (pt === "PRODUCT") {
      setAllocationForm((prev) =>
        prev.billing_status === "INVESTMENT" ? prev : { ...prev, billing_status: "INVESTMENT" }
      );
    }
  }, [allocationForm.project_code, projects, allocationProjects]);

  useEffect(() => {
    if (!allocationEmployeePickerOpen) return;
    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const root = allocationEmployeeComboboxRef.current;
      if (root && !root.contains(e.target as Node)) {
        setAllocationEmployeePickerOpen(false);
        setAllocationEmployeePickerQuery("");
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [allocationEmployeePickerOpen]);

  useEffect(() => {
    const flex = designationAllowsFlexibleHours(allocationForm.role);
    const hrs = Number(allocationForm.allocated_hours);
    if (flex) {
      if (!Number.isFinite(hrs) || hrs < 1 || hrs > 8 || !Number.isInteger(hrs)) {
        setAllocationForm((p) => ({ ...p, allocated_hours: "8" }));
      }
    } else if (hrs !== 4 && hrs !== 8) {
      setAllocationForm((p) => ({ ...p, allocated_hours: "8" }));
    }
  }, [allocationForm.role, allocationForm.allocated_hours]);

  const offboardingNoticeLabel = useMemo(() => {
    const r = offboardingForm.resignation_date.trim();
    const l = offboardingForm.last_working_day.trim();
    if (!r || !l) return null;
    const a = new Date(r);
    const b = new Date(l);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) {
      return "Resignation date must be on or before last working day.";
    }
    const days = Math.round((b.getTime() - a.getTime()) / 86400000);
    return `Notice period (resignation → last working day): ${Math.max(0, days)} calendar day(s).`;
  }, [offboardingForm.resignation_date, offboardingForm.last_working_day]);
  const normalizeBandValue = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) return String(parsed);
    const digitMatch = raw.match(/\d+/);
    return digitMatch?.[0] ?? raw.toUpperCase();
  };
  const normalizeRoleToken = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/^role_/, "")
      .replace(/_/g, " ");
  const pickBandFromRecord = (record: Record<string, unknown>) => {
    const nestedBand = record.band_master as Record<string, unknown> | undefined;
    const nestedBandAlt = record.bandMaster as Record<string, unknown> | undefined;
    return normalizeBandValue(
      record.band_id ??
        record.bandId ??
        record.band ??
        record.band_name ??
        record.bandName ??
        nestedBand?.band_id ??
        nestedBand?.band ??
        nestedBandAlt?.band_id ??
        nestedBandAlt?.band
    );
  };
  const pickDesignationFromRecord = (record: Record<string, unknown>) =>
    String(
      record.designation ??
        record.designation_name ??
        record.designationName ??
        ""
    )
      .trim()
      .toLowerCase();
  const pickRoleTokensFromRecord = (record: Record<string, unknown>) =>
    new Set(
      [
        record.role,
        record.user_role,
        record.userRole,
        record.role_name,
        record.roleName,
      ]
        .map(normalizeRoleToken)
        .filter(Boolean)
    );
  const userBandId = useMemo(() => {
    return normalizeBandValue(
      employeeProfile?.band_id ??
        employeeProfile?.bandId ??
        employeeProfile?.band ??
        (employeeProfile?.band_master as Record<string, unknown> | undefined)?.band_id ??
        (employeeProfile?.bandMaster as Record<string, unknown> | undefined)?.band_id
    );
  }, [employeeProfile]);
  const userDesignation = useMemo(
    () =>
      String(
        employeeProfile?.designation ??
          employeeProfile?.designation_name ??
          employeeProfile?.designationName ??
          employeeProfile?.role ??
          ""
      )
        .trim()
        .toLowerCase(),
    [employeeProfile]
  );
  const userRoleTokens = useMemo(() => {
    const roleFromProfile = String(employeeProfile?.role ?? "").trim();
    const roleNameFromProfile = String(employeeProfile?.role_name ?? employeeProfile?.roleName ?? "").trim();
    const authRoles = (user?.roles ?? []).map((r) => String(r).trim());
    return new Set(
      [roleFromProfile, roleNameFromProfile, ...authRoles]
        .map(normalizeRoleToken)
        .filter(Boolean)
    );
  }, [employeeProfile, user?.roles]);
  const canViewAllKpis = useMemo(
    () => (user?.roles ?? []).some((r) => r === "ROLE_HR" || r === "ROLE_ADMIN"),
    [user?.roles]
  );
  const filteredKpis = useMemo(() => {
    if (!kpis.length) return [];
    if (canViewAllKpis) return kpis;
    const hasBandAwareRows = kpis.some((row) => Boolean(pickBandFromRecord(row)));
    const hasDesignationAwareRows = kpis.some((row) => Boolean(pickDesignationFromRecord(row)));
    const hasRoleAwareRows = kpis.some((row) => pickRoleTokensFromRecord(row).size > 0);

    if (hasBandAwareRows && !userBandId) return [];
    if (hasDesignationAwareRows && !userDesignation) return [];
    if (hasRoleAwareRows && userRoleTokens.size === 0) return [];

    return kpis.filter((row) => {
      const normalizedBand = pickBandFromRecord(row);
      const rowDesignation = pickDesignationFromRecord(row);
      const rowRoleTokens = pickRoleTokensFromRecord(row);

      const bandMatches = !hasBandAwareRows || normalizedBand === userBandId;
      const designationMatches =
        !hasDesignationAwareRows ||
        rowDesignation === userDesignation ||
        rowDesignation.includes(userDesignation) ||
        userDesignation.includes(rowDesignation);
      const roleMatches =
        !hasRoleAwareRows ||
        Array.from(rowRoleTokens).some((token) => userRoleTokens.has(token));

      return Boolean(bandMatches && designationMatches && roleMatches);
    });
  }, [kpis, canViewAllKpis, userBandId, userDesignation, userRoleTokens]);
  async function loadTimelogsForCurrentRole(targetEmployeeEmail?: string) {
    const parseManagerFlag = (value: unknown): boolean => {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value === 1;
      const normalized = String(value ?? "").trim().toLowerCase();
      if (!normalized) return false;
      if (["true", "yes", "y", "1", "manager"].includes(normalized)) return true;
      if (["false", "no", "n", "0"].includes(normalized)) return false;
      return false;
    };

    let timelogRows: Array<Record<string, unknown>> = [];
    if (hasHrAccess) {
      const normalizedTarget = String(targetEmployeeEmail ?? "")
        .trim()
        .toLowerCase();
      if (normalizedTarget) {
        try {
          const focusedRes = await hrmsService.getTimelogs({
            page: "0",
            size: "200",
            view: "ALL",
            employee_email: normalizedTarget,
            employeeEmail: normalizedTarget,
          } as Record<string, string>);
          const focusedRows = toPagedRows((focusedRes as { data?: unknown }).data ?? focusedRes).filter((row) => {
            const email = String(
              row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
            )
              .trim()
              .toLowerCase();
            return email === normalizedTarget;
          });
          if (focusedRows.length) {
            setTimelogs(focusedRows);
            return focusedRows;
          }
        } catch {
          /* fall through to org-wide load */
        }
      }
      try {
        const hrView = await hrmsService.getTimelogs({ page: "0", size: "200", view: "ALL" });
        timelogRows = toPagedRows((hrView as { data?: unknown }).data ?? hrView);
      } catch {
        timelogRows = [];
      }
    }
    if (!timelogRows.length) {
      const fallback = await hrmsService.getTimelogs({ page: "0", size: "200" });
      timelogRows = toPagedRows((fallback as { data?: unknown }).data ?? fallback);
    }

    if (!hasHrAccess) {
      if (hasManagerAccess) {
        let teamRows: Array<Record<string, unknown>> = [];
        try {
          const loaded = await loadManagerData();
          teamRows = loaded.detailRows;
        } catch {
          teamRows = [];
        }
        const teamEmailToName: Record<string, string> = {};
        for (const row of teamRows) {
          const directEmail = String(
            row.employee_email ?? row.email ?? row.user_email ?? row.userEmail ?? ""
          )
            .trim()
            .toLowerCase();
          const directName = String(
            row.employee_name ?? row.employeeName ?? row.name ?? row.user_name ?? row.userName ?? ""
          ).trim();
          if (directEmail && directName) teamEmailToName[directEmail] = directName;
          const nestedEmployees = Array.isArray(row.employees)
            ? (row.employees as Array<Record<string, unknown>>)
            : [];
          for (const emp of nestedEmployees) {
            const email = String(emp.email ?? emp.user_email ?? emp.userEmail ?? "")
              .trim()
              .toLowerCase();
            const name = String(emp.name ?? emp.employee_name ?? emp.employeeName ?? "").trim();
            if (email && name) teamEmailToName[email] = name;
          }
        }
        const teamEmailSet = new Set(managerTeamEmails(teamRows));
        if (teamEmailSet.size) {
          const normalizedTarget = String(targetEmployeeEmail ?? "")
            .trim()
            .toLowerCase();
          if (normalizedTarget && teamEmailSet.has(normalizedTarget)) {
            const focusedRes = await hrmsService.getTimelogs({
              page: "0",
              size: "200",
              employee_email: normalizedTarget,
              employeeEmail: normalizedTarget,
            });
            const focusedRows = toPagedRows((focusedRes as { data?: unknown }).data ?? focusedRes).filter((row) => {
              const email = String(
                row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
              )
                .trim()
                .toLowerCase();
              return email === normalizedTarget;
            });
            if (focusedRows.length) {
              setManagerEmailsForHr([]);
              setTimelogs(focusedRows);
              return focusedRows;
            }
          }

          // Preferred path: query timelog endpoint by employee email (works in this backend).
          const directResponses = await Promise.allSettled(
            Array.from(teamEmailSet).map((email) =>
              hrmsService.getTimelogs({
                page: "0",
                size: "200",
                view: "ALL",
                employee_email: email,
                employeeEmail: email,
              } as Record<string, string>)
            )
          );
          const directRows = directResponses
            .filter(
              (
                item
              ): item is PromiseFulfilledResult<ApiEnvelope<PagedData<unknown>>> =>
                item.status === "fulfilled"
            )
            .flatMap((item) => toPagedRows((item.value as { data?: unknown }).data ?? item.value))
            .filter((row) => {
              const email = String(
                row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
              )
                .trim()
                .toLowerCase();
              return Boolean(email) && teamEmailSet.has(email);
            });

          if (directRows.length) {
            const dedupedDirectRows = Array.from(
              new Map(
                directRows.map((row) => {
                  const key = String(
                    row.timelog_id ??
                      row.timeLogId ??
                      row.id ??
                      `${row.employee_email ?? row.email}-${row.project_code}-${row.log_date}-${row.hours}`
                  );
                  const email = String(
                    row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
                  )
                    .trim()
                    .toLowerCase();
                  const resolvedName = String(
                    row.employee_name ?? row.employeeName ?? row.name ?? (email ? teamEmailToName[email] : "") ?? ""
                  ).trim();
                  return [key, { ...row, employee_name: resolvedName || "—" }] as const;
                })
              ).values()
            );
            setManagerEmailsForHr([]);
            setTimelogs(dedupedDirectRows);
            return dedupedDirectRows;
          }

          const today = new Date();
          const dates: string[] = [];
          // Wider fallback window so future planned logs are visible.
          for (let i = -30; i < 90; i += 1) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            dates.push(d.toISOString().slice(0, 10));
          }
          const legacyResponses = await Promise.allSettled(
            Array.from(teamEmailSet).flatMap((email) =>
              dates.map((logDate) =>
                apiClient.get(endpoints.timelog.legacyGetByDate(email, logDate), {
                  query: { page: "0", size: "200" },
                })
              )
            )
          );
          const teamTimelogRows = legacyResponses
            .filter(
              (
                item
              ): item is PromiseFulfilledResult<unknown> => item.status === "fulfilled"
            )
            .flatMap((item) => toPagedRows((item.value as { data?: unknown }).data ?? item.value));
          const merged = [...timelogRows, ...teamTimelogRows];
          const deduped = Array.from(
            new Map(
              merged.map((row) => {
                const key = String(
                  row.timelog_id ??
                    row.timeLogId ??
                    row.id ??
                    `${row.employee_email ?? row.email}-${row.project_code}-${row.log_date}-${row.hours}`
                );
                const email = String(
                  row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
                )
                  .trim()
                  .toLowerCase();
                const resolvedName = String(
                  row.employee_name ?? row.employeeName ?? row.name ?? (email ? teamEmailToName[email] : "") ?? ""
                ).trim();
                return [key, { ...row, employee_name: resolvedName || "—" }] as const;
              })
            ).values()
          );
          setManagerEmailsForHr([]);
          setTimelogs(deduped);
          return deduped;
        }
      }
      setManagerEmailsForHr([]);
      setTimelogs(timelogRows);
      return timelogRows;
    }

    let allocationRows: Array<Record<string, unknown>> = [];
    let onboardRows: Array<Record<string, unknown>> = [];
    try {
      const allocRes = await hrmsService.getAllocations({ page: "0", size: "200", view: "ALL" });
      allocationRows = toPagedRows((allocRes as { data?: unknown }).data ?? allocRes);
      if (!allocationRows.length) {
        const allocFallback = await hrmsService.getAllocations({ page: "0", size: "200" });
        allocationRows = toPagedRows((allocFallback as { data?: unknown }).data ?? allocFallback);
      }
    } catch {
      allocationRows = [];
    }
    try {
      const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "200" });
      onboardRows = toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes);
    } catch {
      onboardRows = [];
    }

    const managerEmailSet = new Set<string>();
    const onboardUserIdToEmail: Record<string, string> = {};
    const onboardEmailToName: Record<string, string> = {};
    for (const row of onboardRows) {
      const uid = String(
        row.user_id ?? row.userId ?? row.userID ?? row.id ?? row.emp_id ?? ""
      ).trim();
      const email = String(row.email ?? row.user_email ?? row.userEmail ?? "")
        .trim()
        .toLowerCase();
      const name = String(row.name ?? "").trim();
      if (uid && email) onboardUserIdToEmail[uid] = email;
      if (email && name) onboardEmailToName[email] = name;
    }
    for (const row of allocationRows) {
      const isManager =
        parseManagerFlag(row.is_manager) ||
        isManagerRoleLabel(row.role ?? row.designation);
      if (!isManager) continue;
      const email = String(
        row.employee_email ?? row.email ?? row.user_email ?? row.userEmail ?? ""
      )
        .trim()
        .toLowerCase();
      if (email) {
        managerEmailSet.add(email);
        continue;
      }
      const uid = String(row.user_id ?? row.userId ?? row.userID ?? row.id ?? "").trim();
      const mappedEmail = onboardUserIdToEmail[uid];
      if (mappedEmail) managerEmailSet.add(mappedEmail);
    }
    for (const row of onboardRows) {
      const isManager =
        isManagerRoleLabel(row.role ?? row.designation ?? row.department ?? row.name);
      if (!isManager) continue;
      const email = String(row.email ?? row.user_email ?? row.userEmail ?? "")
        .trim()
        .toLowerCase();
      if (email) managerEmailSet.add(email);
    }

    // /timelog returns own logs only in many environments; for HR, fallback to
    // legacy manager-email/date endpoint to collect manager timelogs.
    if (!timelogRows.length && managerEmailSet.size) {
      const today = new Date();
      const dates: string[] = [];
      // Include recent past plus a small forward window (future-dated entries can exist).
      for (let i = -3; i < 14; i += 1) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
      const legacyResponses = await Promise.allSettled(
        Array.from(managerEmailSet).flatMap((email) =>
          dates.map((logDate) =>
            apiClient.get(endpoints.timelog.legacyGetByDate(email, logDate), {
              query: { page: "0", size: "200" },
            })
          )
        )
      );
      const legacyRows = legacyResponses
        .filter(
          (
            item
          ): item is PromiseFulfilledResult<unknown> => item.status === "fulfilled"
        )
        .flatMap((item) => toPagedRows((item.value as { data?: unknown }).data ?? item.value));
      if (legacyRows.length) {
        timelogRows = legacyRows;
      }
    }
    setManagerEmailsForHr(Array.from(managerEmailSet));

    const normalizedRows = timelogRows.map((row) => {
      const existingManagerFlag = parseManagerFlag(row.is_manager);
      const email = String(
        row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
      )
        .trim()
        .toLowerCase();
      const employeeName = String(
        row.employee_name ??
          row.employeeName ??
          row.name ??
          (email ? onboardEmailToName[email] : "") ??
          ""
      ).trim();
      if (existingManagerFlag) {
        return {
          ...row,
          employee_name: employeeName || "—",
        };
      }
      if (!email || !managerEmailSet.has(email)) {
        return {
          ...row,
          employee_name: employeeName || "—",
        };
      }
      return {
        ...row,
        is_manager: true,
        employee_name: employeeName || "—",
      };
    });
    setTimelogs(normalizedRows);
    return normalizedRows;
  }
  async function loadMyLeaveRequests() {
    const email = String((user as { email?: string } | null)?.email ?? "").trim();
    if (!email) {
      setMyLeaveRequests([]);
      return;
    }
    const today = new Date();
    const future = new Date(today);
    future.setFullYear(future.getFullYear() + 2);
    const from = "2000-01-01";
    const to = future.toISOString().slice(0, 10);
    const types = [
      ...REQUEST_TYPE_ALIASES.LEAVE,
      ...REQUEST_TYPE_ALIASES.WFH,
      ...REQUEST_TYPE_ALIASES.COMP_OFF,
    ] as const;
    let merged: Array<Record<string, unknown>> = [];
    const requestTs = Date.now();
    const responses = await Promise.allSettled(
      types.map((type) =>
        apiClient.get(endpoints.userRequest.getByEmployees(email, from, to, type), {
          query: { page: "0", size: "200", _ts: requestTs },
        })
      )
    );
    merged = responses
      .filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled")
      .flatMap((r) => toPagedRows((r.value as { data?: unknown }).data ?? r.value));

    // If employee-specific endpoint yields nothing (or fails), fall back to range + filter.
    if (!merged.length) {
      const rangeResponses = await Promise.allSettled(
        types.map((type) =>
          apiClient.get(endpoints.userRequest.getRange(from, to, type), {
            query: { page: "0", size: "200", _ts: requestTs },
          })
        )
      );
      const rows = rangeResponses
        .filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled")
        .flatMap((r) => toPagedRows((r.value as { data?: unknown }).data ?? r.value));
      merged = rows.filter((row) => {
        const rowEmail = String(
          row.email ??
            row.user_email ??
            row.userEmail ??
            row.emp_email ??
            row.empEmail ??
            row.employee_email ??
            row.employeeEmail ??
            row.requester_email ??
            row.requesterEmail ??
            row.requested_by_email ??
            row.requestedByEmail ??
            row.created_by_email ??
            row.createdByEmail ??
            row.requested_by ??
            row.requestedBy ??
            ""
        )
          .trim()
          .toLowerCase();
        return rowEmail === email.toLowerCase();
      });
    }
    const deduped = Array.from(
      new Map(
        merged.map((row) => {
          const key = String(row.user_request_id ?? row.userRequestId ?? row.id ?? Math.random());
          return [key, row] as const;
        })
      ).values()
    );
    setMyLeaveRequests(deduped);
  }
  const loadEmployeeRequestsForApprover = useCallback(async () => {
    const today = new Date();
    const future = new Date(today);
    future.setFullYear(future.getFullYear() + 2);
    const from = employeeRequestFilters.fromDate || `${today.getFullYear()}-01-01`;
    const to = employeeRequestFilters.toDate || future.toISOString().slice(0, 10);
    const requestType = employeeRequestFilters.requestType || "ALL";
    const requestTypes =
      requestType === "ALL"
        ? [
            ...REQUEST_TYPE_ALIASES.LEAVE,
            ...REQUEST_TYPE_ALIASES.WFH,
            ...REQUEST_TYPE_ALIASES.COMP_OFF,
          ]
        : REQUEST_TYPE_ALIASES[requestType] ?? [requestType];
    let onboardRows: Array<Record<string, unknown>> = [];
    let scopedManagerRows: Array<Record<string, unknown>> = [];
    if (hasHrAccess) {
      const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "200" });
      onboardRows = toPagedRows(onboardRes.data ?? onboardRes);
    } else if (hasManagerAccess) {
      if (managerPortfolioRows.length) {
        scopedManagerRows = managerPortfolioRows;
      } else {
        const loaded = await loadManagerData();
        scopedManagerRows = loaded.detailRows;
      }
    }
    const scopeRows = hasHrAccess ? onboardRows : scopedManagerRows;
    const expandedScopeRows = scopeRows.flatMap((row) => {
      const nestedEmployees = Array.isArray(row.employees)
        ? (row.employees as Array<Record<string, unknown>>)
        : [];
      if (!nestedEmployees.length) return [row];
      return nestedEmployees.map((emp) => ({
        ...row,
        email: emp.email ?? emp.user_email ?? emp.userEmail ?? row.email,
        user_email: emp.email ?? emp.user_email ?? emp.userEmail ?? row.user_email,
        name: emp.name ?? emp.employee_name ?? emp.employeeName ?? row.name,
        employee_name: emp.name ?? emp.employee_name ?? emp.employeeName ?? row.employee_name,
        user_id: emp.user_id ?? emp.userId ?? emp.emp_id ?? row.user_id,
        emp_id: emp.emp_id ?? emp.user_id ?? row.emp_id,
      }));
    });
    const idToName = buildUserIdToNameMap(expandedScopeRows);
    const emailToName = buildEmailToNameMap(expandedScopeRows);
    const userIdToEmail: Record<string, string> = {};
    for (const row of expandedScopeRows) {
      const uid = String(row.user_id ?? row.userId ?? row.userID ?? row.id ?? row.emp_id ?? "").trim();
      const email = String(
        row.email ?? row.user_email ?? row.userEmail ?? row.employee_email ?? row.employeeEmail ?? ""
      )
        .trim()
        .toLowerCase();
      if (uid && email) userIdToEmail[uid] = email;
    }
    const emailCsv = expandedScopeRows
      .map((r) =>
        String(
          r.email ?? r.user_email ?? r.userEmail ?? r.employee_email ?? r.employeeEmail ?? ""
        ).trim()
      )
      .filter(Boolean)
      .join(",");
    const collectedRows: Array<Record<string, unknown>> = [];
    if (emailCsv) {
      try {
        const responses = await Promise.all(
          requestTypes.map((type) =>
            apiClient.get(endpoints.userRequest.getByEmployees(emailCsv, from, to, type), {
              query: { page: "0", size: "200" },
            })
          )
        );
        collectedRows.push(
          ...responses.flatMap((res) => toPagedRows((res as { data?: unknown }).data ?? res))
        );
      } catch {
        /* ignore and continue with range endpoint */
      }
    }
    if (hasHrAccess) {
      try {
        const rangeResponses = await Promise.all(
          requestTypes.map((type) =>
            apiClient.get(endpoints.userRequest.getRange(from, to, type), {
              query: { page: "0", size: "200" },
            })
          )
        );
        collectedRows.push(
          ...rangeResponses.flatMap((res) => toPagedRows((res as { data?: unknown }).data ?? res))
        );
      } catch {
        /* ignore if one source already succeeded */
      }
    }
    let rows = collectedRows;
    rows = Array.from(
      new Map(
        rows.map((row) => {
          const key = String(
            row.user_request_id ?? row.userRequestId ?? row.request_id ?? row.requestId ?? row.id ?? Math.random()
          );
          return [key, row] as const;
        })
      ).values()
    );
    const unresolvedEmails = [
      ...new Set(
        rows
          .map((row) =>
            String(
              row.emp_email ??
                row.empEmail ??
                row.email ??
                row.user_email ??
                row.userEmail ??
                row.employee_email ??
                row.employeeEmail ??
                ""
            )
              .trim()
              .toLowerCase()
          )
          .filter((email) => Boolean(email) && !emailToName[email])
      ),
    ];
    await Promise.all(
      unresolvedEmails.map(async (email) => {
        try {
          const userRes = await hrmsService.getUser({ email });
          const payload = ((userRes as { data?: unknown }).data ?? userRes) as
            | Record<string, unknown>
            | null;
          if (!payload || typeof payload !== "object") return;
          const nested =
            (payload.user as Record<string, unknown> | undefined)?.name ??
            (payload.profile as Record<string, unknown> | undefined)?.name;
          const name = String(payload.name ?? nested ?? "").trim();
          if (name) emailToName[email] = name;
        } catch {
          /* ignore lookup misses */
        }
      })
    );
    const enriched = rows.map((row) => {
      const email = String(
        row.email ??
          row.user_email ??
          row.userEmail ??
          row.emp_email ??
          row.empEmail ??
          row.employee_email ??
          row.employeeEmail ??
          row.requested_by ??
          row.requestedBy ??
          ""
      )
        .trim()
        .toLowerCase();
      const uid = String(row.user_id ?? row.userId ?? row.emp_id ?? row.empId ?? "").trim();
      const nameFromRow = String(
        row.name ??
          row.employee_name ??
          row.employeeName ??
          row.user_name ??
          row.userName ??
          row.emp_name ??
          row.empName ??
          row.requested_by_name ??
          row.requestedByName ??
          ""
      ).trim();
      const emailFromUid = uid ? userIdToEmail[uid] ?? "" : "";
      const employee_display =
        nameFromRow ||
        (email && emailToName[email]) ||
        (emailFromUid && emailToName[emailFromUid]) ||
        (uid && idToName[uid]) ||
        email ||
        emailFromUid ||
        (uid ? `User #${uid}` : "—");
      return { ...row, employee_display };
    });
    setEmployeeRequests(enriched);
  }, [employeeRequestFilters, hasHrAccess, hasManagerAccess, managerPortfolioRows, loadManagerData]);
  useEffect(() => {
    if (activeTab !== "leave" || leaveSubTab !== "team") return;
    if (!hasManagerAccess && !hasHrAccess) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          await loadEmployeeRequestsForApprover();
        } catch {
          setEmployeeRequests([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, leaveSubTab, hasManagerAccess, hasHrAccess, loadEmployeeRequestsForApprover]);

  async function updateEmployeeRequestStatus(requestId: string, status: "APPROVED" | "REJECTED") {
    const idNum = Number(requestId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      throw new Error("Invalid request id.");
    }
    const message = status === "REJECTED" ? "Rejected by HR" : null;
    try {
      await apiClient.put(endpoints.userRequest.status, {
        contentType: "application/json",
        body: JSON.stringify({
          user_request_id: idNum,
          user_request_status: status,
          message,
        }),
      });
    } catch {
      await apiClient.put(endpoints.userRequest.status, {
        contentType: "application/json",
        body: JSON.stringify({
          user_request_id: idNum,
          user_request_status: status === "APPROVED" ? "APPROVE" : "REJECT",
          message,
        }),
      });
    }
  }
  const loadInviteOnboardingPreview = useCallback(async () => {
    const res = await hrmsService.getOnboardList({ page: "0", size: "200" });
    const rows = toRows((res as { data?: unknown }).data ?? res);
    setInviteOnboardingRows(pickRecentInviteEmployees(rows, ONBOARDING_INVITE_PREVIEW_LIMIT));
  }, []);

  const loadAllocationsForHr = useCallback(async () => {
    const res = await hrmsService.getAllocations({ page: "0", size: "200", view: "ALL" });
    const primary = (res as { data?: unknown }).data ?? res;
    let rows = toPagedRows(primary);
    if (!rows.length) {
      const fallback = await hrmsService.getAllocations({ page: "0", size: "200" });
      const fbPayload = (fallback as { data?: unknown }).data ?? fallback;
      rows = toPagedRows(fbPayload);
    }

    let onboardUsers: Array<Record<string, unknown>> = [];
    let projectRows: Array<Record<string, unknown>> = [];
    await Promise.all([
      (async () => {
        try {
          const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "10" });
          const onboardPayload = (onboardRes as { data?: unknown }).data ?? onboardRes;
          onboardUsers = toRows(onboardPayload);
        } catch {
          onboardUsers = [];
        }
      })(),
      (async () => {
        try {
          projectRows = await loadAllProjectsForHr();
        } catch {
          projectRows = [];
        }
      })(),
    ]);

    const userIdToName = buildUserIdToNameMap(onboardUsers);
    const emailToName = buildEmailToNameMap(onboardUsers);
    const projectDisplayByCode = buildProjectCodeDisplayMap(projectRows);

    const emailsToResolve = [
      ...new Set(
        rows.flatMap((r) => {
          const em = allocationRowEmail(r);
          if (!em) return [];
          const uid = String(r.user_id ?? r.userId ?? r.userID ?? "").trim();
          if (uid && userIdToName[uid]) return [];
          if (emailToName[em]) return [];
          return [em];
        })
      ),
    ];

    await Promise.all(
      emailsToResolve.map(async (email) => {
        try {
          const userRes = await hrmsService.getUser({ email });
          const raw = (userRes as { data?: unknown })?.data;
          const payload =
            raw && typeof raw === "object"
              ? (raw as Record<string, unknown>)
              : userRes && typeof userRes === "object"
                ? (userRes as unknown as Record<string, unknown>)
                : null;
          const nested =
            (payload?.user as Record<string, unknown> | undefined)?.name ??
            (payload?.profile as Record<string, unknown> | undefined)?.name;
          const name = String(payload?.name ?? nested ?? "").trim();
          if (name) emailToName[email] = name;
        } catch {
          /* ignore */
        }
      })
    );

    setAllocations(
      enrichAllocationRowsForDisplay(rows, {
        userIdToName,
        emailToName,
        projectDisplayByCode,
      })
    );
  }, [loadAllProjectsForHr]);

  useEffect(() => {
    if (activeTab !== "allocation") return;
    if (!hasHrAccess) return;
    if (requiresSelfOnboarding) return;
    const id = window.setTimeout(() => {
      void loadAllocationsForHr().catch(() => {
        setAllocations([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasHrAccess, requiresSelfOnboarding, loadAllocationsForHr]);

  useEffect(() => {
    if (activeTab !== "employee" || !hasHrAccess) return;
    const id = window.setTimeout(() => {
      void loadInviteOnboardingPreview().catch(() => {
        setInviteOnboardingRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasHrAccess, loadInviteOnboardingPreview]);

  const filteredProjects = useMemo(() => {
    const search = projectFilters.search.trim().toLowerCase();
    return projects.filter((project) => {
      const typeOk =
        projectFilters.project_type === "ALL" ||
        String(project.project_type ?? "").toUpperCase() === projectFilters.project_type;
      const searchOk =
        !search ||
        String(project.project_code ?? "").toLowerCase().includes(search) ||
        String(project.project_name ?? "").toLowerCase().includes(search);
      return typeOk && searchOk;
    });
  }, [projects, projectFilters]);
  const normalizedManagerProjects = useMemo(() => {
    const sourceRows = managerProjects.length ? managerProjects : managerPortfolioRows;
    return Array.from(
      new Map(
        sourceRows
          .map((row) => {
            const code = managerProjectCode(row);
            if (!code) return null;
            const name = managerProjectName(row) || code;
            const type = String(row.project_type ?? row.projectType ?? "—").trim();
            return [code.toLowerCase(), { project_code: code, project_name: name, project_type: type }] as const;
          })
          .filter(
            (value): value is readonly [string, { project_code: string; project_name: string; project_type: string }] =>
              Boolean(value)
          )
      ).values()
    );
  }, [managerProjects, managerPortfolioRows]);
  const managerProjectTeamRows = useMemo(() => {
    // Source-of-truth for "who is allocated to this project" is allocations.
    // Some manager endpoints only return the manager row (not full team), so allocations are safer.
    const source = managerProjectAllocations.length ? managerProjectAllocations : managerPortfolioRows;
    return managerTeamRowsForProject(source, selectedManagerProjectCode);
  }, [managerProjectAllocations, managerPortfolioRows, selectedManagerProjectCode]);
  const managerTeamEmailList = useMemo(
    () => managerTeamEmails(managerPortfolioRows),
    [managerPortfolioRows]
  );
  const teamTimelogEmployeeOptions = useMemo(() => {
    if (hasHrAccess && hrTimelogDirectoryEmails.length) return hrTimelogDirectoryEmails;
    return managerTeamEmailList;
  }, [hasHrAccess, hrTimelogDirectoryEmails, managerTeamEmailList]);
  const managerTeamTimelogs = useMemo(() => {
    const normalizedFilter = teamTimelogEmailFilter.trim().toLowerCase();
    if (normalizedFilter && normalizedFilter !== "all") {
      return timelogs.filter((row) => {
        const email = String(
          row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
        )
          .trim()
          .toLowerCase();
        return Boolean(email) && email === normalizedFilter;
      });
    }
    if (hasHrAccess) {
      return timelogs;
    }
    if (!managerTeamEmailList.length) return timelogs;
    const teamEmailSet = new Set(managerTeamEmailList);
    return timelogs.filter((row) => {
      const email = String(
        row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
      )
        .trim()
        .toLowerCase();
      return Boolean(email) && teamEmailSet.has(email);
    });
  }, [timelogs, managerTeamEmailList, teamTimelogEmailFilter, hasHrAccess]);
  useEffect(() => {
    if (teamTimelogEmailFilter === "ALL") return;
    const exists = teamTimelogEmployeeOptions.some(
      (email) => email.toLowerCase() === teamTimelogEmailFilter.trim().toLowerCase()
    );
    if (!exists) {
      setTeamTimelogEmailFilter("ALL");
    }
  }, [teamTimelogEmployeeOptions, teamTimelogEmailFilter]);
  useEffect(() => {
    if (activeTab !== "timelog" || timelogSubTab !== "team") return;
    const selected = teamTimelogEmailFilter.trim();
    if (!selected || selected.toUpperCase() === "ALL") return;
    void loadTimelogsForCurrentRole(selected).catch(() => {
      /* ignore focused refresh errors */
    });
  }, [activeTab, timelogSubTab, teamTimelogEmailFilter]);
  const hrVisibleTimelogs = useMemo(() => {
    if (!hasHrAccess) return timelogs;
    return timelogs;
  }, [hasHrAccess, timelogs]);

  // (learning loaders moved above useEffects to avoid TDZ)
  const loadWorkforceOverviewReports = useCallback(async () => {
    const params = {
      page: 0,
      size: 10,
      search: undefined,
    };
    const [headcountRes, billingRes, expRes] = await Promise.all([
      hrmsService.getWorkforceHeadcountDistribution(params),
      hrmsService.getWorkforceRoleBilling(params),
      hrmsService.getWorkforceExperienceBands(params),
    ]);
    const headcountPayload = ((headcountRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const billingPayload = ((billingRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const expPayload = ((expRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    setHeadcountBreakdown(
      toRows(headcountPayload.data ?? (headcountPayload as { data?: unknown }).data).map((row) => ({
        ...row,
        billing_type: row.billing_type ?? row.billingType ?? row.department_type ?? row.departmentType ?? "—",
      }))
    );
    setRoleBillingRows(toRows(billingPayload.data ?? (billingPayload as { data?: unknown }).data));
    setExperienceBandRows(toRows(expPayload.data ?? (expPayload as { data?: unknown }).data));
  }, []);
  const loadUtilizationReports = useCallback(async () => {
    const parsedPage = Number.parseInt(utilizationFilters.page, 10);
    const parsedSize = Number.parseInt(utilizationFilters.size, 10);
    const params = {
      page: Number.isFinite(parsedPage) && parsedPage >= 0 ? parsedPage : 0,
      size: Number.isFinite(parsedSize) && parsedSize > 0 ? Math.min(parsedSize, 500) : 10,
      search: utilizationFilters.search.trim() || undefined,
      as_of: utilizationFilters.as_of.trim() || undefined,
    };
    const [utilizationRes, benchRes] = await Promise.all([
      hrmsService.getUtilizationByDepartment(params),
      hrmsService.getBenchAging(params),
    ]);
    const utilizationPayload = ((utilizationRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const benchPayload = ((benchRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    setUtilizationByDepartmentRows(toRows(utilizationPayload.data ?? (utilizationPayload as { data?: unknown }).data));
    setBenchAgingRows(toRows(benchPayload.data ?? (benchPayload as { data?: unknown }).data));
  }, [utilizationFilters.as_of, utilizationFilters.page, utilizationFilters.search, utilizationFilters.size]);
  const loadAttritionReports = useCallback(async () => {
    const parsedFy = Number.parseInt(attritionFyStartYear, 10);
    const fy_start_year =
      Number.isFinite(parsedFy) && parsedFy >= 2000 && parsedFy <= 2100 ? parsedFy : new Date().getFullYear();
    const params = { fy_start_year };
    const [overallRes, viRes, roleRes, managerRes, skillRes, regrettedRes, tenureRes] = await Promise.all([
      hrmsService.getAttritionOverallPercent(params),
      hrmsService.getAttritionVoluntaryInvoluntary(params),
      hrmsService.getAttritionRoleWise(params),
      hrmsService.getAttritionManagerWise(params),
      hrmsService.getAttritionCriticalSkill(params),
      hrmsService.getAttritionRegretted(params),
      hrmsService.getAttritionAverageTenure(params),
    ]);
    const overallPayload = ((overallRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const viPayload = ((viRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const rolePayload = ((roleRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const managerPayload = ((managerRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const skillPayload = ((skillRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const regrettedPayload = ((regrettedRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const tenurePayload = ((tenureRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;

    setAttritionOverallRows([{
      fy_start_year: overallPayload.fy_start_year ?? fy_start_year,
      fy_april_start: overallPayload.fy_april_start ?? "—",
      fy_march_end: overallPayload.fy_march_end ?? "—",
      number_of_exits: overallPayload.number_of_exits ?? 0,
      attrition_percent: overallPayload.attrition_percent ?? 0,
    }]);
    setAttritionVoluntaryRows([{
      voluntary_count: viPayload.voluntary_count ?? 0,
      involuntary_count: viPayload.involuntary_count ?? 0,
      total_count: viPayload.total_count ?? 0,
    }]);
    setAttritionRoleWiseRows(toRows(rolePayload.rows ?? rolePayload.data));
    setAttritionManagerWiseRows(toRows(managerPayload.rows ?? managerPayload.data));
    setAttritionCriticalSkillRows(toRows(skillPayload.rows ?? skillPayload.data));
    setAttritionRegrettedRows([{
      total_regretted_exits: regrettedPayload.total_regretted_exits ?? 0,
      percent_of_total_attrition: regrettedPayload.percent_of_total_attrition ?? 0,
    }]);
    setAttritionAverageTenureBuckets(toRows(tenurePayload.buckets ?? tenurePayload.data));
    setAttritionAverageTenureSummaryRows([{
      average_tenure_days: tenurePayload.average_tenure_days ?? 0,
      tenure_unknown_employees: tenurePayload.tenure_unknown_employees ?? 0,
    }]);
  }, [attritionFyStartYear]);
  const loadSkillInventoryReport = useCallback(async () => {
    const res = await hrmsService.getSkillInventory({ page: 0, size: 10 });
    const payload = ((res as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const rows = toRows(payload.data ?? payload).map((row) => {
      const primarySkillsRaw = row.primary_skills ?? row.primarySkills;
      const secondarySkillsRaw = row.secondary_skills ?? row.secondarySkills;
      const certsRaw = row.certifications ?? row.certs;
      const primarySkills = Array.isArray(primarySkillsRaw)
        ? primarySkillsRaw.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ")
        : String(primarySkillsRaw ?? "—").trim() || "—";
      const secondarySkills = Array.isArray(secondarySkillsRaw)
        ? secondarySkillsRaw
            .map((item) => {
              if (item && typeof item === "object") {
                const rec = item as Record<string, unknown>;
                const skill = String(rec.skill ?? rec.name ?? "").trim();
                const rating = rec.rating ?? rec.level;
                return skill ? `${skill}${rating !== undefined ? ` (${String(rating)})` : ""}` : "";
              }
              return String(item ?? "").trim();
            })
            .filter(Boolean)
            .join(", ")
        : String(secondarySkillsRaw ?? "—").trim() || "—";
      const certifications = Array.isArray(certsRaw)
        ? certsRaw.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ")
        : String(certsRaw ?? "—").trim() || "—";
      return {
        emp_id: row.emp_id ?? row.empId ?? "—",
        email: row.email ?? "—",
        name: row.name ?? "—",
        department: row.department ?? "—",
        role: row.role ?? row.designation ?? "—",
        primary_skills: primarySkills || "—",
        secondary_skills: secondarySkills || "—",
        certifications: certifications || "—",
      };
    });
    setSkillInventoryRows(rows);
  }, []);
  const loadContractDistributionReport = useCallback(async () => {
    const res = await hrmsService.getContractDistribution({ page: 0, size: 10 });
    const payload = ((res as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const rows = toRows(payload.data ?? payload).map((row) => ({
      employment_type: row.employment_type ?? row.employmentType ?? "—",
      count: row.count ?? 0,
      workforce_percent: row.workforce_percent ?? row.workforcePercent ?? 0,
    }));
    setContractDistributionRows(rows);
  }, []);
  const loadBgvDashboardReport = useCallback(async () => {
    const params = {
      page: 0,
      size: 10,
      search: bgvReportSearch.trim() || undefined,
      overall_status:
        bgvReportStatusFilter !== "ALL" ? bgvReportStatusFilter.trim().toUpperCase() : undefined,
      employment_status:
        bgvReportEmploymentFilter !== "ALL"
          ? bgvReportEmploymentFilter.trim().toUpperCase()
          : undefined,
      reference_status:
        bgvReportReferenceFilter !== "ALL"
          ? bgvReportReferenceFilter.trim().toUpperCase()
          : undefined,
    };
    const res = await hrmsService.getBgvDashboard(params);
    const payload = ((res as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const rows = toRows(payload.data ?? (payload as { data?: unknown }).data).map((row) => ({
      employee: row.employee ?? row.name ?? "—",
      role: row.role ?? "—",
      consent: row.consent ?? false,
      identity: row.identity ?? "—",
      employment: row.employment ?? "—",
      overall_status: row.overall_status ?? "—",
    }));
    setBgvDashboardRows(rows);
  }, [bgvReportEmploymentFilter, bgvReportReferenceFilter, bgvReportSearch, bgvReportStatusFilter]);
  useEffect(() => {
    if (activeTab !== "reports-workforce" || !hasHrAccess) return;
    const id = window.setTimeout(() => {
      void loadWorkforceOverviewReports().catch(() => {
        setHeadcountBreakdown([]);
        setRoleBillingRows([]);
        setExperienceBandRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasHrAccess, loadWorkforceOverviewReports]);
  useEffect(() => {
    if (activeTab !== "reports-section-2" || !hasHrAccess) return;
    const id = window.setTimeout(() => {
      void loadUtilizationReports().catch(() => {
        setUtilizationByDepartmentRows([]);
        setBenchAgingRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasHrAccess, loadUtilizationReports]);
  useEffect(() => {
    if (activeTab !== "reports-section-3" || !hasHrAccess) return;
    const id = window.setTimeout(() => {
      void loadAttritionReports().catch(() => {
        setAttritionOverallRows([]);
        setAttritionVoluntaryRows([]);
        setAttritionRoleWiseRows([]);
        setAttritionManagerWiseRows([]);
        setAttritionCriticalSkillRows([]);
        setAttritionRegrettedRows([]);
        setAttritionAverageTenureBuckets([]);
        setAttritionAverageTenureSummaryRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasHrAccess, loadAttritionReports]);
  useEffect(() => {
    if (activeTab !== "reports-section-4" || !hasHrAccess) return;
    const id = window.setTimeout(() => {
      void loadSkillInventoryReport().catch(() => {
        setSkillInventoryRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasHrAccess, loadSkillInventoryReport]);
  useEffect(() => {
    if (activeTab !== "reports-section-6" || !hasHrAccess) return;
    const id = window.setTimeout(() => {
      void loadContractDistributionReport().catch(() => {
        setContractDistributionRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasHrAccess, loadContractDistributionReport]);
  useEffect(() => {
    if (activeTab !== "reports-section-7" || !hasHrAccess) return;
    const id = window.setTimeout(() => {
      void loadBgvDashboardReport().catch(() => {
        setBgvDashboardRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasHrAccess, loadBgvDashboardReport]);
  useEffect(() => {
    if (
      (activeTab !== "offboarding" &&
        activeTab !== "reports-section-3" &&
        activeTab !== "background-verification") ||
      !hasHrAccess
    ) {
      return;
    }
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await hrmsService.getOnboardList({ page: "0", size: "200" });
          const rows = toPagedRows((res as { data?: unknown }).data ?? res);
          const users = Array.from(
            new Map(
              rows
                .map((row) => {
                  const emp_id = String(row.emp_id ?? row.empId ?? "").trim();
                  if (!emp_id) return null;
                  const name = String(row.name ?? "—").trim() || "—";
                  const email = String(row.email ?? "—").trim() || "—";
                  return [emp_id.toLowerCase(), { emp_id, name, email }] as const;
                })
                .filter((entry): entry is readonly [string, { emp_id: string; name: string; email: string }] => Boolean(entry))
            ).values()
          ).sort((a, b) => a.emp_id.localeCompare(b.emp_id));
          setOffboardingUsers(users);
          const bgvRows = Array.from(
            new Map(
              rows
                .map((row) => {
                  const emp_id = String(row.emp_id ?? row.empId ?? "").trim();
                  if (!emp_id) return null;
                  return [
                    emp_id.toLowerCase(),
                    {
                      emp_id,
                      name: String(row.name ?? "—").trim() || "—",
                      email: String(row.email ?? "—").trim() || "—",
                      role: String(row.role ?? row.designation ?? row.band_role ?? "—").trim() || "—",
                      level: String(row.band_name ?? row.band ?? row.band_id ?? "—").trim() || "—",
                    },
                  ] as const;
                })
                .filter(
                  (
                    entry
                  ): entry is readonly [
                    string,
                    { emp_id: string; name: string; email: string; role: string; level: string },
                  ] => Boolean(entry)
                )
            ).values()
          ).sort((a, b) => a.emp_id.localeCompare(b.emp_id));
          setBgvUsers(bgvRows);
          setOffboardingForm((prev) => ({ ...prev, emp_id: prev.emp_id || users[0]?.emp_id || "" }));
          setAttritionForm((prev) => ({ ...prev, emp_id: prev.emp_id || users[0]?.emp_id || "" }));
          setBgvForm((prev) => {
            const selected =
              bgvRows.find((emp) => emp.emp_id === prev.emp_id) ??
              bgvRows[0];
            if (!selected) return prev;
            return {
              ...prev,
              emp_id: prev.emp_id || selected.emp_id,
              name: selected.name,
              role: selected.role,
              level: selected.level,
              mail_id: selected.email,
            };
          });
        } catch {
          setOffboardingUsers([]);
          setBgvUsers([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasHrAccess]);
  useEffect(() => {
    if (activeTab !== "background-verification" || !hasHrAccess) return;
    const empId = bgvForm.emp_id.trim();
    if (!empId) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await hrmsService.getBgvRecord(empId);
          const payload = ((res as { data?: unknown }).data ?? {}) as Record<string, unknown>;
          const row = ((payload.data ?? payload) ?? {}) as Record<string, unknown>;
          if (!row || typeof row !== "object") return;
          setBgvForm((prev) => ({
            ...prev,
            consent_form_signed: Boolean(row.consent_form_signed) ? "YES" : "NO",
            identity: String(row.identity ?? prev.identity ?? "").trim(),
            employment: String(row.employment_status ?? prev.employment ?? "N/A").trim() || "N/A",
            reference: String(row.reference_status ?? prev.reference ?? "N/A").trim() || "N/A",
            mail_id: String(row.mail_id ?? row.mail_id_verified ?? prev.mail_id ?? "").trim(),
            onboarding_form:
              String(row.onboarding_form_status ?? prev.onboarding_form ?? "PENDING").trim() || "PENDING",
            overall_status:
              String(row.overall_status ?? prev.overall_status ?? "IN_PROGRESS").trim() || "IN_PROGRESS",
            remarks: String(row.remarks ?? prev.remarks ?? "").trim(),
          }));
          setBgvRecords([{
            id: row.employee_id ?? row.emp_id ?? empId,
            name: row.name ?? bgvForm.name ?? "—",
            role: row.role ?? "—",
            level: row.level ?? "—",
            consent_form_signed: Boolean(row.consent_form_signed) ? "YES" : "NO",
            identity: row.identity ?? "—",
            employment: row.employment_status ?? "—",
            reference: row.reference_status ?? "—",
            mail_id: row.mail_id ?? row.mail_id_verified ?? "—",
            onboarding_form: row.onboarding_form_status ?? "—",
            overall_status: row.overall_status ?? "—",
            remarks: row.remarks ?? "",
          }]);
        } catch {
          setBgvRecords([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasHrAccess, bgvForm.emp_id]);
  useEffect(() => {
    if (!normalizedManagerProjects.length) {
      setSelectedManagerProjectCode("");
      return;
    }
    const exists = normalizedManagerProjects.some(
      (row) => String(row.project_code).trim().toLowerCase() === selectedManagerProjectCode.trim().toLowerCase()
    );
    if (!exists) {
      setSelectedManagerProjectCode(String(normalizedManagerProjects[0].project_code ?? ""));
    }
  }, [normalizedManagerProjects, selectedManagerProjectCode]);
  const visibleNavigation = useMemo(
    () => filterVisibleNavigation(dashboardNavigation, userRoles, { hasHrAccess }),
    [userRoles, hasHrAccess]
  );
  useEffect(() => {
    if (!hasHrAccess) return;
    if (activeTab.startsWith("reports-")) setReportsExpanded(true);
  }, [activeTab, hasHrAccess]);
  useEffect(() => {
    const allowed = new Set(
      visibleNavigation.flatMap((item) => {
        const childIds = Array.isArray((item as { children?: Array<{ id: string }> }).children)
          ? ((item as { children?: Array<{ id: string }> }).children ?? []).map((c) => c.id)
          : [];
        return [item.id, ...childIds];
      })
    );
    if (activeTab === "profile") return;
    if (allowed.has(activeTab)) return;
    const fallbackTab = visibleNavigation[0]?.id ?? "profile";
    setActiveTab(fallbackTab);
  }, [activeTab, visibleNavigation]);

  const renderSelfOnboardingPanel = () => (
    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
      <h3 className="font-semibold mb-1">Complete Your Onboarding</h3>
      <p className="text-sm text-wt-text-muted mb-4">
        Employees must complete onboarding before full portal access. Your legal name and phone here replace what HR
        entered when you were invited.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <InputField
          label="Full name (as per ID)"
          value={selfOnboardForm.full_name}
          onChange={(v) => setSelfOnboardForm((p) => ({ ...p, full_name: v }))}
        />
        <InputField
          label="Phone number"
          value={selfOnboardForm.phone_number}
          onChange={(v) => setSelfOnboardForm((p) => ({ ...p, phone_number: v }))}
        />
        <InputField label="Years of Experience" value={selfOnboardForm.yoe} onChange={(v) => setSelfOnboardForm((p) => ({ ...p, yoe: v }))} />
        <InputField
          label="Primary Skills (comma separated)"
          value={selfOnboardForm.primary_skills}
          onChange={(v) => setSelfOnboardForm((p) => ({ ...p, primary_skills: v }))}
        />
        <InputField
          label="Secondary Skill"
          value={selfOnboardForm.secondary_skill}
          onChange={(v) => setSelfOnboardForm((p) => ({ ...p, secondary_skill: v }))}
        />
        <SelectField
          label="Secondary Skill Rating"
          value={selfOnboardForm.secondary_rating}
          options={["1", "2", "3", "4", "5"]}
          onChange={(v) => setSelfOnboardForm((p) => ({ ...p, secondary_rating: v }))}
        />
        <SelectField
          label="Work Location"
          value={selfOnboardForm.work_location_type}
          options={["OFFSHORE", "ONSITE", "HYBRID", "REMOTE"]}
          onChange={(v) => setSelfOnboardForm((p) => ({ ...p, work_location_type: v }))}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <FileField label="Resume" accept=".pdf,.doc,.docx,image/*" onPick={(file) => setSelfOnboardFiles((p) => ({ ...p, resume: file }))} />
        <FileField label="Profile Photo" accept="image/*" onPick={(file) => setSelfOnboardFiles((p) => ({ ...p, profile_photo: file }))} />
        <FileField label="Aadhaar" accept=".pdf,image/*" onPick={(file) => setSelfOnboardFiles((p) => ({ ...p, aadhaar: file }))} />
        <FileField label="PAN Card" accept=".pdf,image/*" onPick={(file) => setSelfOnboardFiles((p) => ({ ...p, pan_card: file }))} />
      </div>
      {priorEmploymentDocsRequired ? (
        <div className="mt-4 rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-sm font-medium text-wt-text mb-2">Prior employment (YoE &gt; 0)</p>
          <p className="text-xs text-wt-text-muted mb-3">
            Relieving letter and a payslip are required when years of experience is greater than zero.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <FileField
              label="Relieving letter (previous company)"
              accept=".pdf,image/*"
              onPick={(file) => setSelfOnboardFiles((p) => ({ ...p, reliving_letter: file }))}
            />
            <FileField
              label="Upload last 3 months's payslip"
              accept=".pdf,image/*"
              onPick={(file) => setSelfOnboardFiles((p) => ({ ...p, salary_slips: file }))}
            />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-wt-text-muted">
          If your years of experience is above zero, add relieving letter and upload last 3 months&apos;s payslip (field appears when YoE &gt; 0).
        </p>
      )}
      <div className="mt-4">
        <button
          type="button"
          className="btn-primary px-3 py-2"
          onClick={() =>
            runAction("Submit onboarding", async () => {
              if (!user?.email) {
                throw new Error("Unable to resolve logged-in email.");
              }
              const legalName = selfOnboardForm.full_name.trim();
              const phone = selfOnboardForm.phone_number.trim();
              if (!legalName || !isValidPersonName(legalName)) {
                throw new Error("Enter your full name as per ID (letters and spaces, 2–120 characters).");
              }
              if (!phone || !isValidIndiaMobile(phone)) {
                throw new Error("Enter a valid Indian mobile number (10 digits, optional +91).");
              }
              const fd = new FormData();
              const primarySkills = selfOnboardForm.primary_skills
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
              if (!primarySkills.length) {
                throw new Error("Please add at least one primary skill.");
              }
              if (!selfOnboardFiles.resume) {
                throw new Error("Please upload resume.");
              }
              if (!selfOnboardFiles.profile_photo) {
                throw new Error("Please upload profile photo.");
              }
              if (!selfOnboardFiles.aadhaar) {
                throw new Error("Please upload Aadhaar.");
              }
              if (!selfOnboardFiles.pan_card) {
                throw new Error("Please upload PAN card.");
              }
              if (priorEmploymentDocsRequired) {
                if (!selfOnboardFiles.reliving_letter) {
                  throw new Error(
                    "Please upload your relieving letter from the previous company."
                  );
                }
                if (!selfOnboardFiles.salary_slips) {
                  throw new Error("Please upload a payslip file in the payslip field.");
                }
              }
              if (
                selfOnboardFiles.profile_photo.type &&
                !selfOnboardFiles.profile_photo.type.startsWith("image/")
              ) {
                throw new Error("Profile photo must be an image file (jpg/png/webp).");
              }
              const selectedFiles: Array<[string, File]> = [];
              for (const [key, val] of Object.entries(selfOnboardFiles)) {
                if (val) selectedFiles.push([key, val as File]);
              }
              for (const [key, file] of selectedFiles) {
                if (file.size > MAX_ONBOARD_FILE_BYTES) {
                  throw new Error(
                    `${key.replaceAll("_", " ")} exceeds 2 MB. Please upload a smaller file.`
                  );
                }
              }
              const totalBytes = selectedFiles.reduce((sum, [, file]) => sum + file.size, 0);
              if (totalBytes > MAX_ONBOARD_TOTAL_BYTES) {
                throw new Error("Total upload size exceeds 6 MB. Compress files and retry.");
              }
              const yoeValue = selfOnboardForm.yoe ? Number(selfOnboardForm.yoe) : null;
              fd.append(
                "user_data",
                JSON.stringify({
                  email: user.email,
                  name: legalName,
                  phone_number: phone,
                  yoe: yoeValue,
                  experience: yoeValue && yoeValue > 0 ? `${yoeValue} years` : null,
                  primary_skills: primarySkills,
                  secondary_skills: selfOnboardForm.secondary_skill
                    ? [
                        {
                          skill: selfOnboardForm.secondary_skill.trim(),
                          rating: Number(selfOnboardForm.secondary_rating),
                        },
                      ]
                    : [],
                  work_location_type: selfOnboardForm.work_location_type,
                })
              );
              Object.entries(selfOnboardFiles).forEach(([key, file]) => {
                if (key === "salary_slips") {
                  if (file) fd.append("salary_slips[]", file as File);
                  return;
                }
                if (!file) return;
                fd.append(key, file as File);
              });
              await hrmsService.completeMyOnboarding(fd);
              setSelfOnboardForm({
                full_name: "",
                phone_number: "",
                yoe: "",
                primary_skills: "",
                secondary_skill: "",
                secondary_rating: "3",
                work_location_type: "OFFSHORE",
              });
              setSelfOnboardFiles({
                resume: null,
                profile_photo: null,
                aadhaar: null,
                pan_card: null,
                reliving_letter: null,
                salary_slips: null,
              });
              setIsSelfOnboarded(true);
              await refreshSession();
              await loadMyProfile();
              router.replace("/dashboard", { scroll: false });
              setActiveTab("overview");
            })
          }
          disabled={actionLoading}
        >
          Submit Onboarding Form
        </button>
      </div>
    </div>
  );

  const openOwnProfileEditor = () => {
    const profile = employeeProfile ?? {};
    const primarySkillsRaw = profile.primary_skills ?? profile.primarySkills ?? [];
    const primarySkills = Array.isArray(primarySkillsRaw)
      ? primarySkillsRaw.map((item) => String(item).trim()).filter(Boolean).join(", ")
      : String(primarySkillsRaw ?? "").trim();
    const secondarySkillsRaw =
      (profile.secondary_skills as Array<Record<string, unknown>> | undefined) ??
      (profile.secondarySkills as Array<Record<string, unknown>> | undefined) ??
      [];
    const firstSecondary = Array.isArray(secondarySkillsRaw) ? secondarySkillsRaw[0] : undefined;

    setSelfProfileForm({
      phone_number: String(profile.phone_number ?? profile.phoneNumber ?? "").trim(),
      primary_skills: primarySkills,
      secondary_skill: String(firstSecondary?.skill ?? "").trim(),
      secondary_rating: String(firstSecondary?.rating ?? "3"),
      yoe: String(profile.yoe ?? "").trim(),
    });
    setSelfProfileEmploymentFiles({
      reliving_letter: null,
      salary_slips: null,
    });
    setSelfProfilePic(null);
    setIsEditingOwnProfile(true);
  };

  const renderMyProfileViewPanel = () => (
    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold mb-1">My Profile</h3>
          <p className="text-sm text-wt-text-muted">Review your profile details before editing.</p>
        </div>
        <button
          type="button"
          className="btn-primary px-3 py-2"
          onClick={openOwnProfileEditor}
          disabled={actionLoading}
        >
          Edit Profile
        </button>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
        <ProfileField label="Name" value={employeeProfile?.name ?? user?.name} />
        <ProfileField label="Email" value={employeeProfile?.email ?? user?.email} />
        <ProfileField label="Status" value={employeeProfile?.status ?? user?.status} />
        <ProfileField label="Phone Number" value={employeeProfile?.phone_number ?? employeeProfile?.phoneNumber} />
        <ProfileField
          label="Primary Skills"
          value={
            Array.isArray(employeeProfile?.primary_skills)
              ? (employeeProfile?.primary_skills as Array<unknown>).map((s) => String(s)).join(", ")
              : employeeProfile?.primary_skills
          }
        />
        <ProfileField label="Years of Experience" value={employeeProfile?.yoe} />
      </dl>
    </div>
  );

  const renderEditMyProfilePanel = () => (
    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
      <h3 className="font-semibold mb-1">Edit My Profile</h3>
      <p className="text-sm text-wt-text-muted mb-4">You are onboarded. Update your profile details anytime.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <InputField label="Phone Number" value={selfProfileForm.phone_number} onChange={(v) => setSelfProfileForm((p) => ({ ...p, phone_number: v }))} />
        <InputField label="Primary Skills (comma separated)" value={selfProfileForm.primary_skills} onChange={(v) => setSelfProfileForm((p) => ({ ...p, primary_skills: v }))} />
        <InputField label="Secondary Skill" value={selfProfileForm.secondary_skill} onChange={(v) => setSelfProfileForm((p) => ({ ...p, secondary_skill: v }))} />
        <SelectField label="Secondary Skill Rating" value={selfProfileForm.secondary_rating} options={["1", "2", "3", "4", "5"]} onChange={(v) => setSelfProfileForm((p) => ({ ...p, secondary_rating: v }))} />
        <InputField label="Years of Experience" value={selfProfileForm.yoe} onChange={(v) => setSelfProfileForm((p) => ({ ...p, yoe: v }))} />
      </div>
      {priorEmploymentDocsForProfile ? (
        <div className="mt-4 rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-sm font-medium text-wt-text mb-2">Prior employment (YoE &gt; 0)</p>
          <p className="text-xs text-wt-text-muted mb-3">
            Relieving letter and a payslip are required when years of experience is greater than zero.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <FileField
              label="Relieving letter (previous company)"
              accept=".pdf,image/*"
              onPick={(file) => setSelfProfileEmploymentFiles((p) => ({ ...p, reliving_letter: file }))}
            />
            <FileField
              label="Upload last 3 months's payslip"
              accept=".pdf,image/*"
              onPick={(file) =>
                setSelfProfileEmploymentFiles((p) => ({ ...p, salary_slips: file }))
              }
            />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-wt-text-muted">
          If your years of experience is above zero, add relieving letter and upload last 3 months&apos;s payslip (field appears when YoE &gt; 0).
        </p>
      )}
      <div className="mt-3">
        <FileField label="Profile Picture (optional)" accept="image/*" onPick={setSelfProfilePic} />
      </div>
      <div className="mt-4">
        <button
          type="button"
          className="btn-primary px-3 py-2"
          onClick={() =>
            runAction("Update my profile", async () => {
              const primarySkills = selfProfileForm.primary_skills
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
              if (priorEmploymentDocsForProfile) {
                if (!selfProfileEmploymentFiles.reliving_letter) {
                  throw new Error(
                    "Please upload your relieving letter from the previous company."
                  );
                }
                if (!selfProfileEmploymentFiles.salary_slips) {
                  throw new Error("Please upload a payslip file in the payslip field.");
                }
              }
              const employmentFilesFlat: Array<[string, File]> = [];
              if (selfProfileEmploymentFiles.reliving_letter) {
                employmentFilesFlat.push([
                  "reliving letter",
                  selfProfileEmploymentFiles.reliving_letter,
                ]);
              }
              if (selfProfileEmploymentFiles.salary_slips) {
                employmentFilesFlat.push([
                  "payslip",
                  selfProfileEmploymentFiles.salary_slips,
                ]);
              }
              const profilePicFiles: Array<[string, File]> = selfProfilePic
                ? [["profilePic", selfProfilePic]]
                : [];
              for (const [, file] of [...employmentFilesFlat, ...profilePicFiles]) {
                if (file.size > MAX_ONBOARD_FILE_BYTES) {
                  throw new Error("A selected file exceeds 2 MB. Please upload a smaller file.");
                }
              }
              const totalBytes =
                employmentFilesFlat.reduce((sum, [, f]) => sum + f.size, 0) +
                (selfProfilePic?.size ?? 0);
              if (totalBytes > MAX_ONBOARD_TOTAL_BYTES) {
                throw new Error(
                  "Total upload size exceeds 6 MB. Compress files and retry."
                );
              }
              if (
                selfProfilePic &&
                selfProfilePic.type &&
                !selfProfilePic.type.startsWith("image/")
              ) {
                throw new Error("Profile picture must be an image file (jpg/png/webp).");
              }
              const fd = new FormData();
              const yoeValue = selfProfileForm.yoe ? Number(selfProfileForm.yoe) : null;
              fd.append(
                "body",
                JSON.stringify({
                  phone_number: selfProfileForm.phone_number || null,
                  primary_skills: primarySkills.length ? primarySkills : null,
                  secondary_skills: selfProfileForm.secondary_skill
                    ? [
                        {
                          skill: selfProfileForm.secondary_skill.trim(),
                          rating: Number(selfProfileForm.secondary_rating),
                        },
                      ]
                    : [],
                  experience: yoeValue && yoeValue > 0 ? `${yoeValue} years` : null,
                  yoe: yoeValue,
                })
              );
              if (selfProfilePic) {
                fd.append("profilePic", selfProfilePic);
              }
              if (selfProfileEmploymentFiles.reliving_letter) {
                fd.append("reliving_letter", selfProfileEmploymentFiles.reliving_letter);
              }
              if (selfProfileEmploymentFiles.salary_slips) {
                fd.append("salary_slips[]", selfProfileEmploymentFiles.salary_slips);
              }
              await hrmsService.updateMyProfile(fd);
              setSelfProfileForm({
                phone_number: "",
                primary_skills: "",
                secondary_skill: "",
                secondary_rating: "3",
                yoe: "",
              });
              setSelfProfileEmploymentFiles({
                reliving_letter: null,
                salary_slips: null,
              });
              setSelfProfilePic(null);
              setIsEditingOwnProfile(false);
              await loadMyProfile();
            })
          }
          disabled={actionLoading}
        >
          Save Profile Changes
        </button>
        <button
          type="button"
          className="btn-ghost ml-2 px-3 py-2"
          onClick={() => setIsEditingOwnProfile(false)}
          disabled={actionLoading}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <>
      <main className="min-h-0 flex-1 space-y-4 p-4 sm:p-6">
            {requiresSelfOnboarding ? (
              <section className="rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 p-4">
                <h3 className="font-semibold">Onboarding pending</h3>
                <p className="text-sm mt-1">
                  Open <strong>Profile</strong> at the bottom of the sidebar to complete onboarding and unlock full access.
                </p>
              </section>
            ) : null}
            {activeTab === "overview" && !requiresSelfOnboarding ? (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <MetricCard label="Total Onboarded" value={metrics.totalOnboarded} loading={loading} />
                </div>
                {!hasManagerAccess ? (
                  <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">My Allocated Projects</h3>
                      <button
                        type="button"
                        className="btn-primary px-3 py-2"
                        onClick={() =>
                          runAction("Load assigned projects", async () => {
                            const [assignedRes, myAllocationsRes] = await Promise.all([
                              hrmsService.getAssignedProjects(),
                              hrmsService.getMyAllocations(),
                            ]);
                            const normalizedProjects = normalizeAssignedProjects(
                              toPagedRows(assignedRes.data ?? assignedRes)
                            );
                            const myAllocations = toPagedRows(myAllocationsRes.data ?? myAllocationsRes);
                            setAssignedProjects(
                              mergeProjectAndAllocationData(normalizedProjects, myAllocations)
                            );
                          })
                        }
                        disabled={actionLoading}
                      >
                        Refresh
                      </button>
                    </div>
                    <DataTable
                      title="Allocations show percent of an 8-hour day (100% = 8h)."
                      columns={[
                        "project_code",
                        "project_name",
                        "project_type",
                        "role",
                        "allocated_hours",
                        "billing_status",
                        "is_manager",
                        "start_date",
                        "end_date",
                      ]}
                      rows={assignedProjectsWithAllocationPct}
                      emptyLabel="No projects are allocated to you yet."
                    />
                  </section>
                ) : null}
              </div>
            ) : null}

            {activeTab === "profile" && canAccessProfile ? (
              <section className="max-w-3xl">
                {employeeSelfServeProfile ? (
                  requiresSelfOnboarding ? (
                    renderSelfOnboardingPanel()
                  ) : (
                    isEditingOwnProfile ? renderEditMyProfilePanel() : renderMyProfileViewPanel()
                  )
                ) : (
                  <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                    <h3 className="font-semibold mb-1">My Profile</h3>
                    <p className="text-sm text-wt-text-muted mb-4">
                      Your account details and current role information.
                    </p>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
                      <ProfileField label="Name" value={employeeProfile?.name ?? user?.name} />
                      <ProfileField label="Email" value={employeeProfile?.email ?? user?.email} />
                      <ProfileField label="Status" value={employeeProfile?.status ?? user?.status} />
                      <ProfileField label="Department" value={employeeProfile?.department} />
                      <ProfileField
                        label="Roles"
                        value={(user?.roles ?? []).length ? (user?.roles ?? []).join(", ") : "—"}
                      />
                      <ProfileField
                        label="User Type"
                        value={employeeProfile?.user_type ?? user?.user_type}
                      />
                    </dl>
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === "employee" && hasHrAccess ? (
                  <section className="space-y-4">
                    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                      <h3 className="font-semibold mb-1">Create New Employee</h3>
                      <p className="text-sm text-wt-text-muted mb-4">Capture core onboarding details used by HR operations.</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <InputField label="Employee ID" value={onboardForm.emp_id} onChange={(v) => setOnboardForm((p) => ({ ...p, emp_id: v }))} />
                        <InputField label="Email" value={onboardForm.email} onChange={(v) => setOnboardForm((p) => ({ ...p, email: v }))} />
                        <InputField label="Name" value={onboardForm.name} onChange={(v) => setOnboardForm((p) => ({ ...p, name: v }))} />
                        <SelectField
                          label="User Type"
                          value={onboardForm.user_type}
                          options={["FULLTIME", "INTERN", "CONSULTANT"]}
                          onChange={(v) =>
                            setOnboardForm((p) => {
                              const ut = v as "FULLTIME" | "INTERN" | "CONSULTANT";
                              if (ut === "INTERN") {
                                return { ...p, user_type: ut, band_id: internBandId, role: "" };
                              }
                              return { ...p, user_type: ut, role: ut === "CONSULTANT" ? p.role : "" };
                            })
                          }
                        />
                        <SelectField
                          label="Department"
                          value={onboardForm.department}
                          options={
                            onboardDepartments.length
                              ? onboardDepartments
                              : HARDCODED_DEPARTMENT_OPTIONS
                          }
                          onChange={(v) =>
                            setOnboardForm((p) => ({
                              ...p,
                              department: v,
                            }))
                          }
                        />
                        {onboardForm.user_type !== "CONSULTANT" ? (
                          <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                            Band
                            <select
                              className="input-field px-3 py-2 text-sm"
                              value={String(onboardForm.band_id)}
                              disabled={onboardForm.user_type === "INTERN"}
                              onChange={(e) =>
                                setOnboardForm((p) => ({
                                  ...p,
                                  band_id: Number(e.target.value || "1"),
                                  role: "",
                                }))
                              }
                            >
                              {onboardBands.length ? (
                                onboardBands.map((row) => (
                                  <option key={String(row.id)} value={String(row.id)}>
                                    {String(row.name ?? row.id ?? "")}
                                  </option>
                                ))
                              ) : (
                                <option value="1">B1</option>
                              )}
                            </select>
                            {onboardForm.user_type === "INTERN" ? (
                              <span className="text-[11px] text-wt-text-muted mt-0.5">Interns are assigned band B8.</span>
                            ) : null}
                          </label>
                        ) : (
                          <p className="text-xs text-wt-text-muted self-end">
                            Consultant: band is not shown; a default band id is sent for system compatibility.
                          </p>
                        )}
                        {onboardForm.user_type === "CONSULTANT" ? (
                          <InputField
                            label="Designation"
                            value={onboardForm.role}
                            onChange={(v) => setOnboardForm((p) => ({ ...p, role: v }))}
                          />
                        ) : (
                          <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                            Designation
                            <select
                              className="input-field px-3 py-2 text-sm"
                              value={onboardForm.role}
                              onChange={(e) =>
                                setOnboardForm((p) => ({
                                  ...p,
                                  role: e.target.value,
                                }))
                              }
                            >
                              <option value="">
                                {onboardForm.department
                                  ? availableOnboardRoles.length
                                    ? "Select designation"
                                    : "No designations for selected department"
                                  : "Select band and department first"}
                              </option>
                              {availableOnboardRoles.map((roleOption) => (
                                <option key={roleOption} value={roleOption}>
                                  {roleOption}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <InputField label="Phone Number" value={onboardForm.phone_number} onChange={(v) => setOnboardForm((p) => ({ ...p, phone_number: v }))} />
                        <SelectField label="Work Mode" value={onboardForm.work_mode} options={["WFO", "WFH", "HYBRID"]} onChange={(v) => setOnboardForm((p) => ({ ...p, work_mode: v }))} />
                        <SelectField label="Work Location" value={onboardForm.work_location_type} options={["OFFSHORE", "ONSITE", "HYBRID", "REMOTE"]} onChange={(v) => setOnboardForm((p) => ({ ...p, work_location_type: v }))} />
                        <SelectField label="Delivery Status" value={onboardForm.delivery_status} options={["DELIVERABLE", "NON_DELIVERABLE"]} onChange={(v) => setOnboardForm((p) => ({ ...p, delivery_status: v }))} />
                        {onboardForm.user_type === "INTERN" ? (
                          <>
                            <InputField label="Date of Internship" value={onboardForm.doi} onChange={(v) => setOnboardForm((p) => ({ ...p, doi: v }))} type="date" />
                            <InputField label="Internship Duration (months)" value={onboardForm.internship_duration} onChange={(v) => setOnboardForm((p) => ({ ...p, internship_duration: v }))} />
                          </>
                        ) : (
                          <InputField label="Date of Joining" value={onboardForm.doj} onChange={(v) => setOnboardForm((p) => ({ ...p, doj: v }))} type="date" />
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          onClick={() =>
                            runAction("Create employee", async () => {
                              const email = onboardForm.email.trim();
                              const name = onboardForm.name.trim();
                              const department = onboardForm.department.trim();
                              const role = onboardForm.role.trim();
                              const phoneNumber = onboardForm.phone_number.trim();
                              const doj = onboardForm.doj.trim();
                              const doi = onboardForm.doi.trim();
                              const internshipDurationRaw = onboardForm.internship_duration.trim();
                              const bandId =
                                onboardForm.user_type === "CONSULTANT"
                                  ? defaultConsultantBandId
                                  : onboardForm.user_type === "INTERN"
                                    ? internBandId
                                    : Number(onboardForm.band_id);

                              if (!email || !name) {
                                throw new Error("Email and Name are required.");
                              }
                              if (!isValidPersonName(name)) {
                                throw new Error(
                                  "Name should be 2–120 characters and contain letters (and spaces) only."
                                );
                              }
                              if (!department) {
                                throw new Error("Department is required.");
                              }
                              if (!role) {
                                throw new Error("Designation is required.");
                              }
                              if (!phoneNumber || !isValidIndiaMobile(phoneNumber)) {
                                throw new Error(
                                  "Phone number must be a valid Indian mobile (10 digits, optional +91)."
                                );
                              }
                              if (!Number.isFinite(bandId) || bandId <= 0) {
                                throw new Error("Please select a valid Band.");
                              }
                              if (onboardForm.user_type === "INTERN") {
                                if (!doi) {
                                  throw new Error("Date of Internship is required for interns.");
                                }
                                if (!internshipDurationRaw) {
                                  throw new Error("Internship Duration is required for interns.");
                                }
                              } else if (!doj) {
                                throw new Error("Date of Joining is required.");
                              }

                              const basePayload = {
                                emp_id: onboardForm.emp_id.trim() || null,
                                email,
                                name,
                                user_type: onboardForm.user_type,
                                department,
                                phone_number: phoneNumber || null,
                                work_mode: onboardForm.work_mode,
                                work_location_type: onboardForm.work_location_type,
                                delivery_status: onboardForm.delivery_status,
                                role,
                                band_id: bandId,
                              };

                              if (onboardForm.user_type === "INTERN") {
                                await hrmsService.createOnboard({
                                  ...basePayload,
                                  doj: null,
                                  doi,
                                  internship_duration: Number(internshipDurationRaw),
                                });
                              } else {
                                await hrmsService.createOnboard({
                                  ...basePayload,
                                  doj,
                                  doi: null,
                                  internship_duration: null,
                                });
                              }
                              await loadInviteOnboardingPreview();
                            })
                          }
                          disabled={actionLoading}
                        >
                          Create Employee
                        </button>
                        <button
                          type="button"
                          className="btn-ghost px-3 py-2"
                          onClick={() =>
                            runAction("Refresh onboarding list", async () => {
                              await loadInviteOnboardingPreview();
                            })
                          }
                          disabled={actionLoading}
                        >
                          Refresh Employee List
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                      <h3 className="font-semibold mb-1">Employee onboarding</h3>
                      <p className="text-sm text-wt-text-muted mb-3">
                        Up to six most recent employees with status <strong>INVITE</strong> (active and
                        offboarded records are hidden).
                      </p>
                      <DataTable
                        columns={["emp_id", "name", "email", "status", "user_type", "department"]}
                        rows={inviteOnboardingRows}
                        emptyLabel="No invite-stage employees found."
                      />
                    </div>
                  </section>
            ) : null}

            {activeTab === "allocation" && !requiresSelfOnboarding ? (
              <>
                {hasHrAccess ? (
                  <section className="space-y-4">
                    <div className="flex flex-wrap gap-2 border-b border-wt-border pb-3">
                      <button
                        type="button"
                        onClick={() => setAllocationHrSubTab("project")}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                          allocationHrSubTab === "project"
                            ? "bg-wt-surface-3 text-wt-text"
                            : "text-wt-text-muted hover:bg-wt-surface-2"
                        }`}
                      >
                        Create project
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllocationHrSubTab("allocate")}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                          allocationHrSubTab === "allocate"
                            ? "bg-wt-surface-3 text-wt-text"
                            : "text-wt-text-muted hover:bg-wt-surface-2"
                        }`}
                      >
                        Project allocation
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllocationHrSubTab("list")}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                          allocationHrSubTab === "list"
                            ? "bg-wt-surface-3 text-wt-text"
                            : "text-wt-text-muted hover:bg-wt-surface-2"
                        }`}
                      >
                        Allocation list
                      </button>
                    </div>

                    {allocationHrSubTab === "project" ? (
                    <div ref={projectCrudFormRef} className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                      <h3 className="font-semibold">Create project</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <InputField
                          label="Project Name"
                          value={projectForm.project_name}
                          onChange={(v) => setProjectForm((p) => ({ ...p, project_name: v }))}
                        />
                        <InputField
                          label="Client name"
                          value={projectForm.client_name}
                          onChange={(v) => setProjectForm((p) => ({ ...p, client_name: v }))}
                        />
                        <AccountManagerSelect
                          value={projectForm.account_manager}
                          onChange={(v) => setProjectForm((p) => ({ ...p, account_manager: v }))}
                        />
                        <SelectField
                          label="Project Type"
                          value={projectForm.project_type}
                          options={["IN_HOUSE", "STAFFING", "PRODUCT"]}
                          onChange={(v) =>
                            setProjectForm((p) => ({
                              ...p,
                              project_type: v as "IN_HOUSE" | "STAFFING" | "PRODUCT",
                            }))
                          }
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          onClick={() =>
                            runAction(
                              editingProjectCode ? "Update project" : "Create project",
                              async () => {
                                const name = projectForm.project_name.trim();
                                if (!name) {
                                  throw new Error("Project name is required.");
                                }
                                const am = projectForm.account_manager.trim();
                                if (!am) {
                                  throw new Error("Account manager is required.");
                                }
                                const project_code = generateAutomaticProjectCode();
                                await hrmsService.createProject({
                                  project_code,
                                  project_name: name,
                                  project_type: projectForm.project_type,
                                  client_name: projectForm.client_name.trim() || null,
                                  account_manager: am,
                                });
                                setEditingProjectCode("");
                                setProjectForm((p) => ({
                                  ...p,
                                  project_name: "",
                                  client_name: "",
                                  account_manager: "",
                                }));
                                const rows = await loadAllProjectsForHr();
                                setProjects(rows);
                              }
                            )
                          }
                          disabled={actionLoading}
                        >
                          {editingProjectCode ? "Save Project" : "Create Project"}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-wt-text-muted hover:bg-wt-surface-2 hover:text-wt-text"
                          onClick={() =>
                            runAction("Load projects", async () => {
                              const rows = await loadAllProjectsForHr();
                              setProjects(rows);
                              setProjectFilters({ search: "", project_type: "ALL" });
                            })
                          }
                          disabled={actionLoading}
                          aria-label="Refresh projects"
                          title="Refresh projects"
                        >
                          <IconRefresh />
                        </button>
                      </div>
                      <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-3">
                        <p className="text-sm font-medium">All Projects</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <InputField
                            label="Search by code or name"
                            value={projectFilters.search}
                            onChange={(v) =>
                              setProjectFilters((p) => ({
                                ...p,
                                search: v,
                              }))
                            }
                          />
                          <SelectField
                            label="Type Filter"
                            value={projectFilters.project_type}
                            options={["ALL", "IN_HOUSE", "STAFFING", "PRODUCT"]}
                            onChange={(v) =>
                              setProjectFilters((p) => ({
                                ...p,
                                project_type: v,
                              }))
                            }
                          />
                        </div>
                        {filteredProjects.length ? (
                          <div className="wt-scroll-both max-h-[min(50vh,420px)] overflow-auto rounded-lg border border-wt-border">
                            <table className="min-w-full text-sm">
                              <thead className="bg-wt-surface-1 text-wt-text-muted">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium">Project code</th>
                                  <th className="px-3 py-2 text-left font-medium">Project name</th>
                                  <th className="px-3 py-2 text-left font-medium">Type</th>
                                  <th className="px-3 py-2 text-right font-medium w-20">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredProjects.map((row, idx) => {
                                  const code = String(row.project_code ?? row.projectCode ?? "").trim();
                                  const name = String(row.project_name ?? row.projectName ?? "");
                                  const typ = String(row.project_type ?? row.projectType ?? "—");
                                  return (
                                    <tr key={code || String(idx)} className="border-t border-wt-border">
                                      <td className="px-3 py-2 whitespace-nowrap font-medium">{code || "—"}</td>
                                      <td className="px-3 py-2 max-w-[200px] truncate">{name || "—"}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{typ}</td>
                                      <td className="px-3 py-2 text-right">
                                        <button
                                          type="button"
                                          className="rounded-lg p-2 text-wt-text-muted hover:bg-rose-500/10 hover:text-rose-600"
                                          aria-label={`Delete project ${code}`}
                                          title="Delete project"
                                          disabled={actionLoading || !code}
                                          onClick={() =>
                                            runAction("Delete project", async () => {
                                              throw new Error(
                                                "Project delete API is not available on backend yet."
                                              );
                                            })
                                          }
                                        >
                                          <IconTrash />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-wt-text-muted">No projects match current filters.</p>
                        )}
                      </div>
                    </div>
                    ) : null}

                    {allocationHrSubTab === "allocate" ? (
                    <div ref={allocationFormRef} className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                      <h3 className="font-semibold">Employee Allocation Form</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div
                          ref={allocationEmployeeComboboxRef}
                          className="relative text-xs text-wt-text-muted flex flex-col gap-1"
                        >
                          <span className="block">Employee</span>
                          <button
                            type="button"
                            className="input-field flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-wt-text"
                            aria-expanded={allocationEmployeePickerOpen}
                            aria-haspopup="listbox"
                            onClick={() => {
                              setAllocationEmployeePickerOpen((open) => {
                                const next = !open;
                                if (next) setAllocationEmployeePickerQuery("");
                                return next;
                              });
                            }}
                          >
                            <span className="min-w-0 truncate">{allocationEmployeeSelectLabel}</span>
                            <span className="shrink-0 text-wt-text-muted" aria-hidden>
                              ▾
                            </span>
                          </button>
                          {allocationEmployeePickerOpen ? (
                            <div
                              className="absolute left-0 right-0 top-full z-50 mt-1 space-y-2 rounded-xl border border-wt-border bg-wt-surface-1 p-2 shadow-lg"
                              role="listbox"
                              aria-label="Employees"
                            >
                              <input
                                type="search"
                                className="input-field w-full px-3 py-2 text-sm"
                                placeholder="Search employees…"
                                value={allocationEmployeePickerQuery}
                                onChange={(e) => setAllocationEmployeePickerQuery(e.target.value)}
                                autoComplete="off"
                                autoFocus
                              />
                              <div className="max-h-52 overflow-auto rounded-lg border border-wt-border">
                                <button
                                  type="button"
                                  className="block w-full px-3 py-2 text-left text-sm text-wt-text-muted hover:bg-wt-surface-2"
                                  onClick={() => {
                                    setAllocationForm((p) => ({ ...p, employee_email: "" }));
                                    setAllocationEmployeePickerOpen(false);
                                    setAllocationEmployeePickerQuery("");
                                  }}
                                >
                                  Clear selection
                                </button>
                                {allocationEmployeesPickerFiltered.length ? (
                                  allocationEmployeesPickerFiltered.map((u) => (
                                    <button
                                      key={u.email}
                                      type="button"
                                      role="option"
                                      className={`block w-full border-t border-wt-border px-3 py-2 text-left text-sm hover:bg-wt-surface-2 ${
                                        allocationForm.employee_email === u.email
                                          ? "bg-indigo-500/10 font-medium"
                                          : ""
                                      }`}
                                      onClick={() => {
                                        setAllocationForm((p) => ({ ...p, employee_email: u.email }));
                                        setAllocationEmployeePickerOpen(false);
                                        setAllocationEmployeePickerQuery("");
                                      }}
                                    >
                                      {u.role
                                        ? `${u.name} | ${u.role} (${u.email})`
                                        : `${u.name} (${u.email})`}
                                    </button>
                                  ))
                                ) : (
                                  <p className="px-3 py-4 text-center text-sm text-wt-text-muted">
                                    No employees match your search.
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Project
                          <select
                            className="input-field px-3 py-2 text-sm"
                            value={allocationForm.project_code}
                            onChange={(e) =>
                              setAllocationForm((p) => ({
                                ...p,
                                project_code: e.target.value,
                              }))
                            }
                          >
                            <option value="">Select project</option>
                            {allocationProjects.map((p) => (
                              <option key={p.code} value={p.code}>
                                {p.name} ({p.code})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Designation
                          <select
                            className="input-field px-3 py-2 text-sm"
                            value={allocationForm.role}
                            onChange={(e) =>
                              setAllocationForm((p) => ({
                                ...p,
                                role: e.target.value,
                              }))
                            }
                          >
                            <option value="">Select designation</option>
                            {allocationRoles.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </label>
                        <SelectField
                          label="Allocated hours"
                          value={allocationForm.allocated_hours}
                          options={
                            designationAllowsFlexibleHours(allocationForm.role)
                              ? [...FLEXIBLE_ALLOCATION_HOUR_OPTIONS]
                              : [...RESTRICTED_ALLOCATION_HOUR_OPTIONS]
                          }
                          onChange={(v) => setAllocationForm((p) => ({ ...p, allocated_hours: v }))}
                        />
                        <SelectField
                          label="Allocation Type"
                          value={allocationForm.allocation_type}
                          options={["DEPLOYABLE", "STAFFING", "LOCKED"]}
                          onChange={(v) => setAllocationForm((p) => ({ ...p, allocation_type: v }))}
                        />
                        <SelectField
                          label="Billing Status"
                          value={allocationForm.billing_status}
                          options={["BILLED", "BUFFER", "INVESTMENT"]}
                          onChange={(v) =>
                            setAllocationForm((p) => ({
                              ...p,
                              billing_status: v as "BILLED" | "BUFFER" | "INVESTMENT",
                            }))
                          }
                        />
                        <InputField label="Start Date" value={allocationForm.start_date} onChange={(v) => setAllocationForm((p) => ({ ...p, start_date: v }))} type="date" />
                        <InputField label="End Date" value={allocationForm.end_date} onChange={(v) => setAllocationForm((p) => ({ ...p, end_date: v }))} type="date" />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-wt-text-muted">
                        <input
                          type="checkbox"
                          checked={allocationForm.is_manager}
                          onChange={(e) => setAllocationForm((p) => ({ ...p, is_manager: e.target.checked }))}
                        />
                        If clicked, employee becomes manager
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          onClick={() =>
                            runAction(editingAllocationId ? "Update allocation" : "Create allocation", async () => {
                              const isManager = Boolean(allocationForm.is_manager);
                              const hrs = Number(allocationForm.allocated_hours);
                              if (!Number.isFinite(hrs) || hrs <= 0) {
                                throw new Error("Allocated hours must be a positive number.");
                              }
                              if (!designationAllowsFlexibleHours(allocationForm.role)) {
                                if (hrs !== 4 && hrs !== 8) {
                                  throw new Error(
                                    "Allocated hours must be 4 or 8 for this designation (or pick a flexible designation such as Designer / DevOps / PM / DM / leadership)."
                                  );
                                }
                              } else {
                                if (!Number.isInteger(hrs) || hrs < 1 || hrs > 8) {
                                  throw new Error(
                                    "Allocated hours must be a whole number from 1 to 8 for this designation."
                                  );
                                }
                              }
                              const payload = {
                                employee_email: allocationForm.employee_email.trim(),
                                project_code: allocationForm.project_code.trim(),
                                role: allocationForm.role.trim() || null,
                                allocated_hours: hrs,
                                start_date: allocationForm.start_date,
                                end_date: allocationForm.end_date || null,
                                allocation_type: allocationForm.allocation_type,
                                billing_status: allocationForm.billing_status,
                                is_manager: isManager,
                              };
                              if (editingAllocationId) {
                                await hrmsService.updateAllocation(editingAllocationId, payload);
                              } else {
                                await hrmsService.createAllocation(payload);
                              }
                              setAllocationForm({
                                allocation_id: "",
                                employee_email: "",
                                project_code: "",
                                role: "",
                                allocated_hours: "8",
                                start_date: "",
                                end_date: "",
                                allocation_type: "DEPLOYABLE",
                                billing_status: "BILLED",
                                is_manager: false,
                              });
                              setEditingAllocationId("");
                              await loadAllocationsForHr();
                              setAllocationHrSubTab("list");
                            })
                          }
                          disabled={actionLoading}
                        >
                          {editingAllocationId ? "Save Allocation" : "Allocate Employee"}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-wt-text-muted hover:bg-wt-surface-2 hover:text-wt-text"
                          onClick={() =>
                            runAction("Load allocations", async () => {
                              await loadAllocationsForHr();
                              setAllocationHrSubTab("list");
                              requestAnimationFrame(() => {
                                allocationRecordsRef.current?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });
                              });
                            })
                          }
                          disabled={actionLoading}
                          aria-label="Refresh allocations"
                          title="Refresh allocations"
                        >
                          <IconRefresh />
                        </button>
                      </div>
                    </div>
                    ) : null}

                    {allocationHrSubTab === "list" ? (
                      <>
                      <div
                        ref={allocationRecordsRef}
                        className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">Allocation Records</p>
                          <label className="flex items-center gap-2 text-xs text-wt-text-muted">
                            <input
                              type="checkbox"
                              checked={allocationListMissingEndDateOnly}
                              onChange={(e) => setAllocationListMissingEndDateOnly(e.target.checked)}
                            />
                            Only without end date
                          </label>
                          <span className="text-xs text-wt-text-muted">
                            {allocationsForListView.length} row(s)
                          </span>
                        </div>
                        {allocationsForListView.length ? (
                          <div className="wt-scroll-both max-h-[min(70vh,520px)] rounded-xl border border-wt-border">
                            <table className="min-w-full text-sm">
                              <thead className="bg-wt-surface-2 text-wt-text-muted">
                                <tr>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">ALLOCATED PROJECT</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">EMPLOYEE NAME</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">ACC MANAGER</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">DESIGNATION</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                                    ALLOCATION (% of 8h)
                                  </th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">ALLOCATION TYPE</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">BILLING STATUS</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">START DATE</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">END DATE</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">IS ACTIVE</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">WORK LOCATION TYPE</th>
                                  <th className="text-right px-3 py-2 font-medium whitespace-nowrap">ACTIONS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {allocationsForListView.map((row, idx) => {
                                  const allocationId = String(
                                    row.id ?? row.allocation_id ?? row.allocationId ?? ""
                                  ).trim();
                                  const allocatedProjectText = String(row.allocated_project ?? "").trim();
                                  const derivedProjectCode = allocatedProjectText.includes("—")
                                    ? (allocatedProjectText.split("—")[0] ?? "").trim()
                                    : allocatedProjectText;
                                  const projectCode = String(
                                    row.project_code ??
                                      row.projectCode ??
                                      row.project_id ??
                                      row.projectId ??
                                      derivedProjectCode
                                  ).trim();
                                  const employeeEmail = String(
                                    row.employee_email ?? row.employeeEmail ?? row.email ?? ""
                                  ).trim();
                                  const role = String(row.role ?? "").trim();
                                  const allocatedHours = String(
                                    row.allocated_hours ?? row.allocatedHours ?? ""
                                  ).trim();
                                  const startDate = String(row.start_date ?? row.startDate ?? "").trim();
                                  const endDate = String(row.end_date ?? row.endDate ?? "").trim();
                                  const allocationType = String(
                                    row.allocation_type ?? row.allocationType ?? "DEPLOYABLE"
                                  ).trim();
                                  const billingStatus = String(
                                    row.billing_status ?? row.billingStatus ?? "BILLED"
                                  ).trim();
                                  const isManagerRaw = row.is_manager;
                                  return (
                                    <tr key={`${allocationId || "alloc"}-${idx}`} className="border-t border-wt-border">
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.allocated_project ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.employee_name ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{allocationAccManagerCell(row)}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.role ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        {formatAllocatedHoursPercentLabel(
                                          row.allocated_hours ?? row.allocatedHours ?? row.hours
                                        )}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.allocation_type ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.billing_status ?? row.billingStatus ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.start_date ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.end_date ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.is_active ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.work_location_type ?? "—")}</td>
                                      <td className="px-3 py-2 text-right">
                                        <div className="inline-flex items-center justify-end gap-1">
                                          <button
                                            type="button"
                                            className="rounded-lg p-2 text-wt-text-muted hover:bg-wt-surface-1 hover:text-wt-text"
                                            aria-label={`Edit allocation ${allocationId || idx}`}
                                            title="Edit allocation"
                                            disabled={actionLoading}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setAllocationForm((prev) => ({
                                                ...prev,
                                                allocation_id: allocationId,
                                                employee_email: employeeEmail,
                                                project_code: projectCode,
                                                role,
                                                allocated_hours: allocatedHours || "8",
                                                start_date: startDate,
                                                end_date: endDate,
                                                allocation_type:
                                                  ["DEPLOYABLE", "STAFFING", "LOCKED"].includes(
                                                    allocationType.toUpperCase()
                                                  )
                                                    ? allocationType.toUpperCase()
                                                    : "DEPLOYABLE",
                                                billing_status:
                                                  ["BILLED", "BUFFER", "INVESTMENT"].includes(
                                                    billingStatus.toUpperCase()
                                                  )
                                                    ? (billingStatus.toUpperCase() as "BILLED" | "BUFFER" | "INVESTMENT")
                                                    : "BILLED",
                                                is_manager: Boolean(isManagerRaw),
                                              }));
                                              setEditingAllocationId(allocationId);
                                              setAllocationHrSubTab("allocate");
                                              requestAnimationFrame(() => {
                                                allocationFormRef.current?.scrollIntoView({
                                                  behavior: "smooth",
                                                  block: "start",
                                                });
                                              });
                                            }}
                                          >
                                            <IconPencil />
                                          </button>
                                          <button
                                            type="button"
                                            className="rounded-lg p-2 text-wt-text-muted hover:bg-rose-500/10 hover:text-rose-600"
                                            aria-label={`Delete allocation ${allocationId || idx}`}
                                            title="Delete allocation"
                                            disabled={actionLoading || !allocationId}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              runAction("Delete allocation", async () => {
                                                await hrmsService.deleteAllocation(allocationId);
                                                await loadAllocationsForHr();
                                              });
                                            }}
                                          >
                                            <IconTrash />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-wt-text-muted">No allocations loaded.</p>
                        )}
                      </div>

                      <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-2">
                        <p className="text-sm font-medium">Bench &amp; investment snapshot</p>
                        <p className="text-xs text-wt-text-muted mb-2">
                          Merges bench/talent-pool rows with employees marked <strong>INVESTMENT</strong> on an allocation.
                          Extend backend APIs for full day-wise bench forecasting and talent-pool coverage.
                        </p>
                        <DataTable
                          columns={["source", "name", "email", "bench_days"]}
                          rows={investmentBenchRows}
                          emptyLabel="No bench or investment rows loaded (refresh bench reports and allocations)."
                        />
                      </div>

                      <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Allocation Forecasting (ending in 2 weeks)</p>
                          <button
                            type="button"
                            className="rounded-lg border border-wt-border bg-wt-surface-1 px-2.5 py-1 text-xs text-wt-text hover:bg-wt-surface-3"
                            onClick={() =>
                              runAction("Load allocation forecasting", async () => {
                                const [forecastRes, onboardRes] = await Promise.all([
                                  hrmsService.getAllocationForecasting({ days: 14 }),
                                  hrmsService.getOnboardList({ page: "0", size: "200" }),
                                ]);
                                const onboardRows = toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes);
                                const emailToName = buildEmailToNameMap(onboardRows);
                                const projectRows = await loadAllProjectsForHr();
                                const projectDisplayByCode = buildProjectCodeDisplayMap(projectRows);
                                const forecastRows = toPagedRows(
                                  (forecastRes as { data?: unknown }).data ?? forecastRes
                                );
                                setAllocationForecastRows(
                                  normalizeForecastRows(forecastRows, {
                                    emailToName,
                                    projectDisplayByCode,
                                  })
                                );
                              })
                            }
                            disabled={actionLoading}
                          >
                            Refresh
                          </button>
                        </div>
                        <DataTable
                          columns={["project_code", "project_name", "employee_name", "billing_status", "role"]}
                          rows={allocationForecastRows}
                          emptyLabel="No employees with allocations ending in the next 2 weeks."
                        />
                      </div>
                      </>
                    ) : null}
                  </section>
                ) : (
                  <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                    <p className="text-sm text-wt-text-muted">
                      Allocation management is available for HR/Admin. Use Allocation &amp; Projects to manage assignments.
                    </p>
                  </section>
                )}
              </>
            ) : null}

            {activeTab === "allocation-extension" && !requiresSelfOnboarding ? (
              <AllocationExtensionPanel />
            ) : null}

            {activeTab === "timelog" && !requiresSelfOnboarding ? (
              <section className="space-y-4">
                {hasManagerAccess || hasHrAccess ? (
                  <div className="flex flex-wrap gap-2 border-b border-wt-border pb-3">
                    <button
                      type="button"
                      onClick={() => setTimelogSubTab("my")}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        timelogSubTab === "my"
                          ? "bg-wt-surface-3 text-wt-text"
                          : "text-wt-text-muted hover:bg-wt-surface-2"
                      }`}
                    >
                      My timelogs
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimelogSubTab("team")}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        timelogSubTab === "team"
                          ? "bg-wt-surface-3 text-wt-text"
                          : "text-wt-text-muted hover:bg-wt-surface-2"
                      }`}
                    >
                      Team timelogs
                    </button>
                  </div>
                ) : null}

                {timelogSubTab === "my" ? (
                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-wt-border pb-4">
                    <h3 className="font-semibold">Timelog</h3>
                    <button
                      type="button"
                      className="btn-primary px-3 py-2"
                      onClick={() =>
                        runAction("Load timelogs", async () => {
                          await loadTimelogsForCurrentRole();
                        })
                      }
                      disabled={actionLoading}
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-wt-text">Log time</p>
                      <p className="text-xs text-wt-text-muted mt-1">
                        Submit hours against a project. HR and Admin can optionally attribute the entry to another
                        employee when the service accepts <code className="text-[11px]">employee_email</code> on create.
                      </p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                        Project
                        <select
                          className="input-field px-3 py-2 text-sm"
                          value={timelogForm.project_code}
                          onChange={(e) =>
                            setTimelogForm((prev) => ({
                              ...prev,
                              project_code: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select project</option>
                          {timelogProjects.map((project) => (
                            <option key={project.code} value={project.code}>
                              {project.name} ({project.code})
                            </option>
                          ))}
                        </select>
                      </label>
                      <InputField
                        label="Log Date"
                        value={timelogForm.log_date}
                        onChange={(v) => setTimelogForm((prev) => ({ ...prev, log_date: v }))}
                        type="date"
                      />
                      <SelectField
                        label="Hours"
                        value={timelogForm.hours}
                        options={["1", "2", "3"]}
                        onChange={(v) => setTimelogForm((prev) => ({ ...prev, hours: v }))}
                      />
                      <InputField
                        label="Description"
                        value={timelogForm.description}
                        onChange={(v) => setTimelogForm((prev) => ({ ...prev, description: v }))}
                      />
                      {hasHrAccess ? (
                        <div className="sm:col-span-2">
                          <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                            Employee (optional)
                            <select
                              className="input-field px-3 py-2 text-sm"
                              value={timelogForm.subject_employee_email}
                              onChange={(e) =>
                                setTimelogForm((prev) => ({
                                  ...prev,
                                  subject_employee_email: e.target.value,
                                }))
                              }
                            >
                              <option value="">Myself (current login)</option>
                              {hrTimelogDirectoryEmails.map((email) => (
                                <option key={email} value={email}>
                                  {email}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <button
                        type="button"
                        className="btn-primary px-3 py-2"
                        onClick={() =>
                          runAction("Submit timelog", async () => {
                            const projectCode = timelogForm.project_code.trim();
                            const logDate = timelogForm.log_date.trim();
                            if (!projectCode || !logDate) {
                              throw new Error("Project and Log Date are required.");
                            }
                            const subject = timelogForm.subject_employee_email.trim().toLowerCase();
                            const body: Record<string, unknown> = {
                              project_code: projectCode,
                              log_date: logDate,
                              hours: Number(timelogForm.hours),
                              description: timelogForm.description.trim() || null,
                            };
                            if (hasHrAccess && subject) {
                              body.employee_email = subject;
                              body.employeeEmail = subject;
                            }
                            await apiClient.post(endpoints.timelog.root, {
                              contentType: "application/json",
                              body: JSON.stringify(body),
                            });
                            setTimelogForm({
                              project_code: "",
                              log_date: "",
                              hours: "1",
                              description: "",
                              subject_employee_email: "",
                            });
                            try {
                              await loadTimelogsForCurrentRole(
                                hasHrAccess && subject ? subject : undefined
                              );
                            } catch {
                              /* submission succeeded; ignore refresh issue */
                            }
                          })
                        }
                        disabled={actionLoading}
                      >
                        Submit Timelog
                      </button>
                    </div>
                  </div>

                  {hasHrAccess ? (
                    <p className="text-xs text-wt-text-muted">
                      Table below shows organization-wide entries after refresh. Use the{" "}
                      <strong>Team timelogs</strong> tab to filter by employee email.
                    </p>
                  ) : null}
                  {hasHrAccess ? (
                    <DataTable
                      columns={["project_code", "employee_name", "log_date", "hours", "description"]}
                      rows={hrVisibleTimelogs}
                      emptyLabel="No timelogs loaded."
                    />
                  ) : (
                    <DataTable
                      columns={["project_code", "log_date", "hours", "description"]}
                      rows={timelogs}
                      emptyLabel="No timelogs loaded."
                    />
                  )}
                </div>
                ) : hasManagerAccess || hasHrAccess ? (
              <div className="space-y-4">
                {hasManagerAccess ? (
                  <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-semibold">Manager Projects &amp; Team</h3>
                        <p className="text-xs text-wt-text-muted mt-1">
                          View your allocated projects and the employees under each project.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-primary px-3 py-2 text-sm"
                        onClick={() =>
                          runAction("Refresh manager projects", async () => {
                            managerAllocationsCacheRef.current = {};
                            setManagerProjectAllocations([]);
                            await loadManagerData(true);
                          })
                        }
                        disabled={actionLoading}
                      >
                        Refresh manager view
                      </button>
                    </div>
                    {normalizedManagerProjects.length ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-3">
                          <SelectField
                            label="Project"
                            value={selectedManagerProjectCode}
                            options={normalizedManagerProjects.map((project) => project.project_code as string)}
                            onChange={setSelectedManagerProjectCode}
                          />
                          <DataTable
                            columns={[
                              "project_code",
                              "project_name",
                              "project_type",
                              "employee",
                              "email",
                              "role",
                              "allocated_hours",
                            ]}
                            rows={managerProjectTeamRows}
                            emptyLabel="No employees found for the selected project."
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-wt-text-muted">
                        No manager data yet. Click <strong>Refresh manager view</strong> to load your portfolio.
                      </p>
                    )}
                  </div>
                ) : null}
                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">Team Timelogs</h3>
                      <p className="text-xs text-wt-text-muted mt-1">
                        {hasManagerAccess
                          ? "View timelog entries for your team, or use the employee filter to focus on one person."
                          : "Review timelogs across the organization. Pick an employee email to load their entries, or leave ALL for the full feed."}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-primary px-3 py-2"
                      onClick={() =>
                        runAction("Load team timelogs", async () => {
                          if (!managerPortfolioRows.length && hasManagerAccess) {
                            await loadManagerData();
                          }
                          const selected = teamTimelogEmailFilter.trim();
                          await loadTimelogsForCurrentRole(
                            selected && selected.toUpperCase() !== "ALL" ? selected : undefined
                          );
                        })
                      }
                      disabled={actionLoading}
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="mb-3 max-w-md">
                    <SelectField
                      label="Employee email (filter)"
                      value={teamTimelogEmailFilter}
                      options={["ALL", ...teamTimelogEmployeeOptions]}
                      onChange={setTeamTimelogEmailFilter}
                    />
                  </div>
                  <DataTable
                    columns={["project_code", "employee_name", "log_date", "hours", "description"]}
                    rows={managerTeamTimelogs}
                    emptyLabel="No team timelogs loaded."
                  />
                </div>
              </div>
                ) : null}
              </section>
            ) : null}

            {activeTab === "leave" && !requiresSelfOnboarding ? (
              <section className="space-y-4">
                {hasManagerAccess || hasHrAccess ? (
                  <div className="flex flex-wrap gap-2 border-b border-wt-border pb-3">
                    <button
                      type="button"
                      onClick={() => setLeaveSubTab("my")}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        leaveSubTab === "my"
                          ? "bg-wt-surface-3 text-wt-text"
                          : "text-wt-text-muted hover:bg-wt-surface-2"
                      }`}
                    >
                      My leave requests
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveSubTab("team")}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        leaveSubTab === "team"
                          ? "bg-wt-surface-3 text-wt-text"
                          : "text-wt-text-muted hover:bg-wt-surface-2"
                      }`}
                    >
                      Team requests
                    </button>
                  </div>
                ) : null}
                {leaveSubTab === "my" ? (
              <section className="grid gap-4 xl:grid-cols-1">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                    <h3 className="font-semibold mb-1">Create Leave Request</h3>
                    <p className="text-sm text-wt-text-muted mb-3">Submit leave or work-from-home request.</p>
                    <div className="space-y-2">
                      <InputField label="From Date" value={leaveRequestForm.request_from_date} onChange={(v) => setLeaveRequestForm((p) => ({ ...p, request_from_date: v }))} type="date" />
                      <InputField label="To Date" value={leaveRequestForm.request_to_date} onChange={(v) => setLeaveRequestForm((p) => ({ ...p, request_to_date: v }))} type="date" />
                      <SelectField label="Request Type" value={leaveRequestForm.request_type} options={["LEAVE", "WFH", "COMP_OFF"]} onChange={(v) => setLeaveRequestForm((p) => ({ ...p, request_type: v }))} />
                      <InputField label="Comments" value={leaveRequestForm.comments} onChange={(v) => setLeaveRequestForm((p) => ({ ...p, comments: v }))} />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        className="btn-primary px-3 py-2"
                        onClick={() =>
                          runAction(editingLeaveRequestId ? "Update leave request" : "Create leave request", async () => {
                            const fromDate = leaveRequestForm.request_from_date.trim();
                            const toDate = leaveRequestForm.request_to_date.trim();
                            if (!fromDate || !toDate) {
                              throw new Error("From Date and To Date are required.");
                            }
                            const fromMs = Date.parse(fromDate);
                            const toMs = Date.parse(toDate);
                            if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
                              throw new Error("Please provide valid dates.");
                            }
                            if (toMs < fromMs) {
                              throw new Error("To Date cannot be earlier than From Date.");
                            }
                            const comments = leaveRequestForm.comments.trim();
                            if (comments.length > 200) {
                              throw new Error("Comments must be 200 characters or less.");
                            }
                            const payload = {
                              ...leaveRequestForm,
                              request_from_date: fromDate,
                              request_to_date: toDate,
                              comments,
                              is_half_day: leaveRequestForm.is_half_day,
                            };
                            if (editingLeaveRequestId) {
                              await apiClient.put(endpoints.userRequest.root, {
                                contentType: "application/json",
                                body: JSON.stringify({
                                  ...payload,
                                  user_request_id: Number(editingLeaveRequestId),
                                }),
                              });
                            } else {
                              await apiClient.post(endpoints.userRequest.root, {
                                contentType: "application/json",
                                body: JSON.stringify(payload),
                              });
                            }
                            setLeaveRequestForm({
                              request_from_date: "",
                              request_to_date: "",
                              request_type: "LEAVE",
                              comments: "",
                              is_half_day: false,
                            });
                            setEditingLeaveRequestId("");
                            try {
                              await loadMyLeaveRequests();
                            } catch {
                              /* submission succeeded; ignore refresh issue */
                            }
                          })
                        }
                        disabled={actionLoading}
                      >
                        {editingLeaveRequestId ? "Save Changes" : "Submit Request"}
                      </button>
                      {editingLeaveRequestId ? (
                        <button
                          type="button"
                          className="btn-ghost px-3 py-2"
                          onClick={() => {
                            setLeaveRequestForm({
                              request_from_date: "",
                              request_to_date: "",
                              request_type: "LEAVE",
                              comments: "",
                              is_half_day: false,
                            });
                            setEditingLeaveRequestId("");
                          }}
                          disabled={actionLoading}
                        >
                          Cancel Edit
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">My Previous Requests</h3>
                      <button
                        type="button"
                        className="btn-primary px-3 py-2"
                        onClick={() => runAction("Load my leave requests", loadMyLeaveRequests)}
                        disabled={actionLoading}
                      >
                        Refresh
                      </button>
                    </div>
                    {myLeaveRequests.length ? (
                      <div className="wt-scroll-both max-h-[min(50vh,380px)] rounded-xl border border-wt-border">
                        <table className="min-w-full text-sm">
                          <thead className="bg-wt-surface-2 text-wt-text-muted">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Request Type</th>
                              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">From</th>
                              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">To</th>
                              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Status</th>
                              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Comments</th>
                              <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myLeaveRequests.map((row, idx) => {
                              const requestId = String(
                                row.user_request_id ??
                                  row.userRequestId ??
                                  row.request_id ??
                                  row.requestId ??
                                  row.id ??
                                  ""
                              ).trim();
                              const status = String(
                                row.user_request_status ?? row.userRequestStatus ?? row.status ?? "PENDING"
                              ).toUpperCase();
                              const isPending = status === "PENDING";
                              return (
                                <tr key={`${requestId || "myreq"}-${idx}`} className="border-t border-wt-border">
                                  <td className="px-3 py-2 whitespace-nowrap">{String(row.request_type ?? row.requestType ?? "—")}</td>
                                  <td className="px-3 py-2 whitespace-nowrap">{String(row.request_from_date ?? row.requestFromDate ?? "—")}</td>
                                  <td className="px-3 py-2 whitespace-nowrap">{String(row.request_to_date ?? row.requestToDate ?? "—")}</td>
                                  <td className="px-3 py-2 whitespace-nowrap">{status}</td>
                                  <td className="px-3 py-2 max-w-[240px] truncate">{String(row.comments ?? "—")}</td>
                                  <td className="px-3 py-2 text-right">
                                    <div className="inline-flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        className="rounded-lg px-2.5 py-1.5 text-xs border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                        disabled={actionLoading || !requestId || !isPending}
                                        onClick={() => {
                                          setLeaveRequestForm({
                                            request_from_date: String(row.request_from_date ?? row.requestFromDate ?? ""),
                                            request_to_date: String(row.request_to_date ?? row.requestToDate ?? ""),
                                            request_type: String(row.request_type ?? row.requestType ?? "LEAVE"),
                                            comments: String(row.comments ?? ""),
                                            is_half_day: Boolean(row.is_half_day ?? row.isHalfDay ?? false),
                                          });
                                          setEditingLeaveRequestId(requestId);
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="rounded-lg px-2.5 py-1.5 text-xs border border-rose-600/30 text-rose-700 hover:bg-rose-500/10 disabled:opacity-50"
                                        disabled={actionLoading || !requestId || !isPending}
                                        onClick={() =>
                                          runAction("Revoke leave request", async () => {
                                            await apiClient.delete(endpoints.userRequest.root, {
                                              contentType: "application/json",
                                              body: JSON.stringify({
                                                user_request_id: Number(requestId),
                                              }),
                                            });
                                            if (editingLeaveRequestId === requestId) {
                                              setEditingLeaveRequestId("");
                                              setLeaveRequestForm({
                                                request_from_date: "",
                                                request_to_date: "",
                                                request_type: "LEAVE",
                                                comments: "",
                                                is_half_day: false,
                                              });
                                            }
                                            await loadMyLeaveRequests();
                                          })
                                        }
                                      >
                                        Revoke
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-wt-text-muted">No previous requests found.</p>
                    )}
                  </div>
                </div>
              </section>
                ) : hasManagerAccess || hasHrAccess ? (
              <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <InputField
                    label="From Date"
                    value={employeeRequestFilters.fromDate}
                    onChange={(v) => setEmployeeRequestFilters((p) => ({ ...p, fromDate: v }))}
                    type="date"
                  />
                  <InputField
                    label="To Date"
                    value={employeeRequestFilters.toDate}
                    onChange={(v) => setEmployeeRequestFilters((p) => ({ ...p, toDate: v }))}
                    type="date"
                  />
                  <SelectField
                    label="Request Type"
                    value={employeeRequestFilters.requestType}
                    options={["ALL", "LEAVE", "WFH", "COMP_OFF"]}
                    onChange={(v) => setEmployeeRequestFilters((p) => ({ ...p, requestType: v }))}
                  />
                  <button
                    type="button"
                    className="btn-primary px-3 py-2 h-10"
                    onClick={() => runAction("Load employee requests", loadEmployeeRequestsForApprover)}
                    disabled={actionLoading}
                  >
                    Fetch Requests
                  </button>
                </div>

                {employeeRequests.length ? (
                  <div className="wt-scroll-both max-h-[min(70vh,520px)] rounded-xl border border-wt-border">
                    <table className="min-w-full text-sm">
                      <thead className="bg-wt-surface-2 text-wt-text-muted">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Employee</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Type</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">From</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">To</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Status</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Comments</th>
                          <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeRequests.map((row, idx) => {
                          const requestId = String(
                            row.user_request_id ??
                              row.userRequestId ??
                              row.request_id ??
                              row.requestId ??
                              row.id ??
                              ""
                          ).trim();
                          const status = String(
                            row.user_request_status ?? row.userRequestStatus ?? row.status ?? "PENDING"
                          ).toUpperCase();
                          const employee = String(
                            row.employee_display ??
                              row.name ??
                              row.employee_name ??
                              row.employeeName ??
                              row.email ??
                              row.user_email ??
                              "—"
                          ).trim();
                          return (
                            <tr key={`${requestId || "req"}-${idx}`} className="border-t border-wt-border">
                              <td className="px-3 py-2 whitespace-nowrap">{employee || "—"}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{String(row.request_type ?? row.requestType ?? "—")}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{String(row.request_from_date ?? row.requestFromDate ?? "—")}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{String(row.request_to_date ?? row.requestToDate ?? "—")}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{status}</td>
                              <td className="px-3 py-2 max-w-[220px] truncate">{String(row.comments ?? "—")}</td>
                              <td className="px-3 py-2 text-right">
                                <div className="inline-flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    className="rounded-lg px-2.5 py-1.5 text-xs border border-emerald-600/30 text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-50"
                                    disabled={actionLoading || !requestId || status !== "PENDING"}
                                    onClick={() =>
                                      runAction("Approve request", async () => {
                                        await updateEmployeeRequestStatus(requestId, "APPROVED");
                                        await loadEmployeeRequestsForApprover();
                                      })
                                    }
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-lg px-2.5 py-1.5 text-xs border border-rose-600/30 text-rose-700 hover:bg-rose-500/10 disabled:opacity-50"
                                    disabled={actionLoading || !requestId || status !== "PENDING"}
                                    onClick={() =>
                                      runAction("Reject request", async () => {
                                        await updateEmployeeRequestStatus(requestId, "REJECTED");
                                        await loadEmployeeRequestsForApprover();
                                      })
                                    }
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-wt-text-muted">
                    No employee requests loaded yet. Click <strong>Fetch Requests</strong>.
                  </p>
                )}
              </section>
                ) : null}
              </section>
            ) : null}

            {activeTab === "offboarding" && !requiresSelfOnboarding && hasHrAccess ? (
              <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                <h3 className="font-semibold mb-1">Employee Offboarding</h3>
                <p className="text-sm text-wt-text-muted mb-4">
                  Submit employee exit details including separation type and retention context.
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                    Employee ID
                    <select
                      className="input-field px-3 py-2 text-sm"
                      value={offboardingForm.emp_id}
                      onChange={(e) => setOffboardingForm((p) => ({ ...p, emp_id: e.target.value }))}
                    >
                      {!offboardingUsers.length ? <option value="">No employees found</option> : null}
                      {offboardingUsers.map((emp) => (
                        <option key={emp.emp_id} value={emp.emp_id}>
                          {emp.emp_id} - {emp.name} ({emp.email})
                        </option>
                      ))}
                    </select>
                  </label>
                  <InputField
                    label="Resignation date"
                    type="date"
                    value={offboardingForm.resignation_date}
                    onChange={(v) => setOffboardingForm((p) => ({ ...p, resignation_date: v }))}
                  />
                  <InputField
                    label="Last Working Day"
                    type="date"
                    value={offboardingForm.last_working_day}
                    onChange={(v) => setOffboardingForm((p) => ({ ...p, last_working_day: v }))}
                  />
                  <SelectField
                    label="Separation Type"
                    value={offboardingForm.separation_type}
                    options={["VOLUNTARY", "INVOLUNTARY"]}
                    onChange={(v) =>
                      setOffboardingForm((p) => ({
                        ...p,
                        separation_type: v === "INVOLUNTARY" ? "INVOLUNTARY" : "VOLUNTARY",
                      }))
                    }
                  />
                  <InputField
                    label="Reason"
                    value={offboardingForm.reason}
                    onChange={(v) => setOffboardingForm((p) => ({ ...p, reason: v }))}
                  />
                  <InputField
                    label="Critical Skill (one or many, comma-separated)"
                    value={offboardingForm.critical_skill}
                    onChange={(v) => setOffboardingForm((p) => ({ ...p, critical_skill: v }))}
                  />
                  <label className="text-xs text-wt-text-muted flex items-center gap-2 mt-5">
                    <input
                      type="checkbox"
                      checked={offboardingForm.is_regretted}
                      onChange={(e) => setOffboardingForm((p) => ({ ...p, is_regretted: e.target.checked }))}
                    />
                    Is Regretted
                  </label>
                </div>
                {offboardingNoticeLabel ? (
                  <p className="text-sm text-wt-text-muted mt-2">{offboardingNoticeLabel}</p>
                ) : null}
                <div className="mt-4">
                  <button
                    type="button"
                    className="btn-primary px-3 py-2"
                    disabled={actionLoading}
                    onClick={() =>
                      runAction("Submit offboarding", async () => {
                        const empIdValue = offboardingForm.emp_id.trim();
                        if (!empIdValue) throw new Error("Please select emp_id.");
                        const lastWorkingDay = offboardingForm.last_working_day.trim();
                        if (!lastWorkingDay) throw new Error("Please select last working day.");
                        const resignationDate = offboardingForm.resignation_date.trim();
                        const payload = {
                          last_working_day: lastWorkingDay,
                          separation_type: offboardingForm.separation_type,
                          resignation_date: resignationDate || undefined,
                          reason: offboardingForm.reason.trim() || undefined,
                          critical_skill: offboardingForm.critical_skill.trim() || undefined,
                          is_regretted: offboardingForm.is_regretted,
                        };
                        await hrmsService.offboardEmployee(empIdValue, payload);
                        setOffboardingForm((prev) => ({
                          ...prev,
                          resignation_date: "",
                          last_working_day: "",
                          reason: "",
                          critical_skill: "",
                          is_regretted: false,
                        }));
                      })
                    }
                  >
                    Submit Offboarding
                  </button>
                </div>
              </section>
            ) : null}

            {activeTab === "background-verification" && !requiresSelfOnboarding && hasHrAccess ? (
              <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                <h3 className="font-semibold mb-1">Background Verification</h3>
                <p className="text-sm text-wt-text-muted mb-4">
                  HR-only verification form. Employees cannot view or edit these records.
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                    ID (Employee ID)
                    <select
                      className="input-field px-3 py-2 text-sm"
                      value={bgvForm.emp_id}
                      onChange={(e) =>
                        setBgvForm((prev) => {
                          const selected = bgvUsers.find((u) => u.emp_id === e.target.value);
                          if (!selected) return { ...prev, emp_id: e.target.value };
                          return {
                            ...prev,
                            emp_id: selected.emp_id,
                            name: selected.name,
                            role: selected.role,
                            level: selected.level,
                            mail_id: selected.email,
                          };
                        })
                      }
                    >
                      {!bgvUsers.length ? <option value="">No employees found</option> : null}
                      {bgvUsers.map((emp) => (
                        <option key={emp.emp_id} value={emp.emp_id}>
                          {emp.emp_id} - {emp.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <InputField label="Name" value={bgvForm.name} onChange={(v) => setBgvForm((p) => ({ ...p, name: v }))} />
                  <InputField label="Role" value={bgvForm.role} onChange={(v) => setBgvForm((p) => ({ ...p, role: v }))} />
                  <InputField label="Level" value={bgvForm.level} onChange={(v) => setBgvForm((p) => ({ ...p, level: v }))} />
                  <SelectField
                    label="Consent Form Signed"
                    value={bgvForm.consent_form_signed}
                    options={["YES", "NO"]}
                    onChange={(v) => setBgvForm((p) => ({ ...p, consent_form_signed: v }))}
                  />
                  <InputField
                    label="Identity"
                    value={bgvForm.identity}
                    onChange={(v) => setBgvForm((p) => ({ ...p, identity: v }))}
                  />
                  <SelectField
                    label="Employment"
                    value={bgvForm.employment}
                    options={["VERIFIED", "PENDING", "NOT_VERIFIED", "N/A"]}
                    onChange={(v) => setBgvForm((p) => ({ ...p, employment: v }))}
                  />
                  <SelectField
                    label="Reference"
                    value={bgvForm.reference}
                    options={["COMPLETED", "PENDING", "N/A"]}
                    onChange={(v) => setBgvForm((p) => ({ ...p, reference: v }))}
                  />
                  <InputField
                    label="Mail ID"
                    value={bgvForm.mail_id}
                    onChange={(v) => setBgvForm((p) => ({ ...p, mail_id: v }))}
                  />
                  <SelectField
                    label="Onboarding Form"
                    value={bgvForm.onboarding_form}
                    options={["FILLED", "PENDING"]}
                    onChange={(v) => setBgvForm((p) => ({ ...p, onboarding_form: v }))}
                  />
                  <SelectField
                    label="Overall Status"
                    value={bgvForm.overall_status}
                    options={["CLEAR", "IN_PROGRESS", "FLAGGED"]}
                    onChange={(v) => setBgvForm((p) => ({ ...p, overall_status: v }))}
                  />
                  <InputField
                    label="Remarks"
                    value={bgvForm.remarks}
                    onChange={(v) => setBgvForm((p) => ({ ...p, remarks: v }))}
                  />
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    className="btn-primary px-3 py-2"
                    disabled={actionLoading}
                    onClick={() =>
                      runAction("Save BGV record", async () => {
                        const empId = bgvForm.emp_id.trim();
                        if (!empId) throw new Error("Please select employee ID.");
                        const result = await hrmsService.upsertBgvRecord(empId, {
                          consent_form_signed: bgvForm.consent_form_signed === "YES",
                          identity: bgvForm.identity.trim(),
                          employment_status: bgvForm.employment.trim().toUpperCase(),
                          reference_status: bgvForm.reference.trim().toUpperCase(),
                          mail_id_verified: bgvForm.mail_id.trim(),
                          onboarding_form_status: bgvForm.onboarding_form.trim().toUpperCase(),
                          overall_status: bgvForm.overall_status.trim().toUpperCase(),
                          remarks: bgvForm.remarks.trim() || undefined,
                        });
                        const payload = ((result as { data?: unknown }).data ?? {}) as Record<string, unknown>;
                        const row = ((payload.data ?? payload) ?? {}) as Record<string, unknown>;
                        setBgvRecords([{
                          id: row.employee_id ?? empId,
                          name: row.name ?? bgvForm.name,
                          role: row.role ?? bgvForm.role,
                          level: row.level ?? bgvForm.level,
                          consent_form_signed: Boolean(row.consent_form_signed) ? "YES" : "NO",
                          identity: row.identity ?? "—",
                          employment: row.employment_status ?? "—",
                          reference: row.reference_status ?? "—",
                          mail_id: row.mail_id ?? row.mail_id_verified ?? bgvForm.mail_id,
                          onboarding_form: row.onboarding_form_status ?? "—",
                          overall_status: row.overall_status ?? "—",
                          remarks: row.remarks ?? "",
                        }]);
                        await loadBgvDashboardReport();
                      })
                    }
                  >
                    Save Verification
                  </button>
                </div>
                <div className="mt-4">
                  <DataTable
                    title="Background Verification Records"
                    columns={[
                      "id",
                      "name",
                      "role",
                      "level",
                      "consent_form_signed",
                      "identity",
                      "employment",
                      "reference",
                      "mail_id",
                      "onboarding_form",
                      "overall_status",
                      "remarks",
                    ]}
                    rows={bgvRecords}
                    emptyLabel="No background verification records saved yet."
                    compact
                  />
                </div>
              </section>
            ) : null}

            {activeTab.startsWith("reports-") && !requiresSelfOnboarding && hasHrAccess ? (
              <section className="space-y-4">
                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">HR Reports</h3>
                    <button
                      type="button"
                      className="btn-primary px-3 py-2"
                      onClick={() =>
                        runAction("Refresh reports", async () => {
                          if (activeTab === "reports-section-2") {
                            await loadUtilizationReports();
                            return;
                          }
                          if (activeTab === "reports-section-3") {
                            await loadAttritionReports();
                            return;
                          }
                          if (activeTab === "reports-section-4") {
                            await loadSkillInventoryReport();
                            return;
                          }
                          if (activeTab === "reports-section-6") {
                            await loadContractDistributionReport();
                            return;
                          }
                          if (activeTab === "reports-section-7") {
                            await loadBgvDashboardReport();
                            return;
                          }
                          await loadWorkforceOverviewReports();
                        })
                      }
                      disabled={actionLoading || !(activeTab === "reports-workforce" || activeTab === "reports-section-2" || activeTab === "reports-section-3" || activeTab === "reports-section-4" || activeTab === "reports-section-6" || activeTab === "reports-section-7")}
                    >
                      Refresh
                    </button>
                  </div>
                  {activeTab === "reports-workforce" ? (
                    <div className="space-y-4">
                      <DataTable
                        title="Headcount Distribution"
                        columns={["department", "designation", "billing_type", "total_headcount"]}
                        rows={headcountBreakdown}
                        emptyLabel="No headcount distribution rows."
                        compact
                      />
                      <DataTable
                        title="Role-wise Billed vs Unbilled"
                        columns={[
                          "role",
                          "department_type",
                          "total_count",
                          "billed_count",
                          "billed_percent",
                          "unbilled_count",
                          "unbilled_percent",
                        ]}
                        rows={roleBillingRows}
                        emptyLabel="No role billing rows."
                        compact
                      />
                      <DataTable
                        title="Experience"
                        columns={[
                          "emp_id",
                          "email",
                          "name",
                          "department",
                          "role",
                          "department_type",
                          "webknot_experience",
                          "total_experience",
                        ]}
                        rows={experienceBandRows}
                        emptyLabel="No experience band rows."
                        compact
                      />
                    </div>
                  ) : activeTab === "reports-section-2" ? (
                    <div className="space-y-4">
                      <DataTable
                        title="Overall Utilization Table"
                        columns={[
                          "department",
                          "head_count",
                          "actual_billed",
                          "utilization_percent",
                          "buffer",
                          "investment",
                          "talent_pool",
                        ]}
                        rows={utilizationByDepartmentRows}
                        emptyLabel="No utilization by department rows."
                        compact
                      />
                      <DataTable
                        title="Bench aging and size (includes investment allocations)"
                        columns={["emp_id", "email", "name", "department", "bench_days"]}
                        rows={utilizationBenchRowsWithInvestment}
                        emptyLabel="No bench aging rows."
                        compact
                      />
                    </div>
                  ) : activeTab === "reports-section-3" ? (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-3 gap-3">
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          FY Start Year (required)
                          <select
                            className="input-field px-3 py-2 text-sm"
                            value={attritionFyStartYear}
                            onChange={(e) => setAttritionFyStartYear(e.target.value)}
                          >
                            {Array.from(
                              { length: Math.max(new Date().getFullYear() - 2019 + 1, 1) },
                              (_, idx) => String(2019 + idx)
                            ).map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <DataTable
                        title="Overall Attrition %"
                        columns={["fy_start_year", "fy_april_start", "fy_march_end", "number_of_exits", "attrition_percent"]}
                        rows={attritionOverallRows}
                        emptyLabel="No overall attrition data."
                        compact
                      />
                      <DataTable
                        title="Voluntary vs Involuntary"
                        columns={["voluntary_count", "involuntary_count", "total_count"]}
                        rows={attritionVoluntaryRows}
                        emptyLabel="No voluntary/involuntary data."
                        compact
                      />
                      <DataTable
                        title="Role-wise Attrition"
                        columns={["role_or_designation", "exit_count"]}
                        rows={attritionRoleWiseRows}
                        emptyLabel="No role-wise attrition rows."
                        compact
                      />
                      <DataTable
                        title="Manager-wise Attrition"
                        columns={["reporting_manager", "exit_count"]}
                        rows={attritionManagerWiseRows}
                        emptyLabel="No manager-wise attrition rows."
                        compact
                      />
                      <DataTable
                        title="Critical Skill Attrition"
                        columns={["critical_skill", "exit_count"]}
                        rows={attritionCriticalSkillRows}
                        emptyLabel="No critical skill attrition rows."
                        compact
                      />
                      <DataTable
                        title="Regretted Attrition"
                        columns={["total_regretted_exits", "percent_of_total_attrition"]}
                        rows={attritionRegrettedRows}
                        emptyLabel="No regretted attrition data."
                        compact
                      />
                      <DataTable
                        title="Average Tenure Buckets"
                        columns={["tenure_bucket", "range_days", "number_of_employees"]}
                        rows={attritionAverageTenureBuckets}
                        emptyLabel="No average tenure bucket data."
                        compact
                      />
                      <DataTable
                        title="Average Tenure Summary"
                        columns={["average_tenure_days", "tenure_unknown_employees"]}
                        rows={attritionAverageTenureSummaryRows}
                        emptyLabel="No average tenure summary."
                        compact
                      />
                      <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-4 space-y-3">
                        <h4 className="font-medium">Upsert Attrition Record</h4>
                        <div className="grid md:grid-cols-2 gap-3">
                          <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                            Employee ID
                            <select
                              className="input-field px-3 py-2 text-sm"
                              value={attritionForm.emp_id}
                              onChange={(e) => setAttritionForm((p) => ({ ...p, emp_id: e.target.value }))}
                            >
                              {!offboardingUsers.length ? <option value="">No employees found</option> : null}
                              {offboardingUsers.map((emp) => (
                                <option key={emp.emp_id} value={emp.emp_id}>
                                  {emp.emp_id} - {emp.name} ({emp.email})
                                </option>
                              ))}
                            </select>
                          </label>
                          <InputField
                            label="Last Working Day"
                            type="date"
                            value={attritionForm.last_working_day}
                            onChange={(v) => setAttritionForm((p) => ({ ...p, last_working_day: v }))}
                          />
                          <SelectField
                            label="Separation Type"
                            value={attritionForm.separation_type}
                            options={["VOLUNTARY", "INVOLUNTARY"]}
                            onChange={(v) =>
                              setAttritionForm((p) => ({
                                ...p,
                                separation_type: v === "INVOLUNTARY" ? "INVOLUNTARY" : "VOLUNTARY",
                              }))
                            }
                          />
                          <InputField
                            label="Reason"
                            value={attritionForm.reason}
                            onChange={(v) => setAttritionForm((p) => ({ ...p, reason: v }))}
                          />
                          <InputField
                            label="Critical Skill"
                            value={attritionForm.critical_skill}
                            onChange={(v) => setAttritionForm((p) => ({ ...p, critical_skill: v }))}
                          />
                          <label className="text-xs text-wt-text-muted flex items-center gap-2 mt-5">
                            <input
                              type="checkbox"
                              checked={attritionForm.is_regretted}
                              onChange={(e) => setAttritionForm((p) => ({ ...p, is_regretted: e.target.checked }))}
                            />
                            Is Regretted
                          </label>
                        </div>
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          disabled={actionLoading}
                          onClick={() =>
                            runAction("Upsert attrition record", async () => {
                              const parsedFy = Number.parseInt(attritionFyStartYear, 10);
                              if (!Number.isFinite(parsedFy) || parsedFy < 2000 || parsedFy > 2100) {
                                throw new Error("FY start year must be between 2000 and 2100.");
                              }
                              const empId = attritionForm.emp_id.trim();
                              if (!empId) throw new Error("Please select emp_id.");
                              const lastWorkingDay = attritionForm.last_working_day.trim();
                              if (!lastWorkingDay) throw new Error("Please select last working day.");
                              const result = await hrmsService.upsertAttritionRecord(empId, {
                                separation_type: attritionForm.separation_type,
                                reason: attritionForm.reason.trim() || undefined,
                                critical_skill: attritionForm.critical_skill.trim() || undefined,
                                is_regretted: attritionForm.is_regretted,
                                last_working_day: lastWorkingDay,
                              });
                              const payload = ((result as { data?: unknown }).data ?? {}) as Record<string, unknown>;
                              const row = (payload.data ?? payload) as Record<string, unknown>;
                              setAttritionUpsertResultRows(row && typeof row === "object" ? [row] : []);
                              await loadAttritionReports();
                            })
                          }
                        >
                          Save Attrition Record
                        </button>
                        <DataTable
                          title="Latest Upserted Attrition Record"
                          columns={[
                            "emp_id",
                            "employee_name",
                            "separation_type",
                            "reason",
                            "critical_skill",
                            "is_regretted",
                            "last_working_day",
                            "designation",
                            "band_name",
                            "band_role",
                            "project_manager",
                          ]}
                          rows={attritionUpsertResultRows}
                          emptyLabel="No attrition upsert record submitted yet."
                          compact
                        />
                      </div>
                    </div>
                  ) : activeTab === "reports-section-4" ? (
                    <div className="space-y-4">
                      <DataTable
                        title="Skill Inventory Report"
                        columns={[
                          "emp_id",
                          "email",
                          "name",
                          "department",
                          "role",
                          "primary_skills",
                          "secondary_skills",
                          "certifications",
                        ]}
                        rows={skillInventoryRows}
                        emptyLabel="No skill inventory rows."
                        compact
                      />
                    </div>
                  ) : activeTab === "reports-section-5" ? (
                    <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-4 text-sm text-wt-text">
                      <h4 className="font-medium">Engagement &amp; Culture Metrics</h4>
                    </div>
                  ) : activeTab === "reports-section-6" ? (
                    <div className="space-y-4">
                      <DataTable
                        title="Contract Distribution"
                        columns={["employment_type", "count", "workforce_percent"]}
                        rows={contractDistributionRows}
                        emptyLabel="No contract distribution rows."
                        compact
                      />
                    </div>
                  ) : activeTab === "reports-section-7" ? (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-4 gap-3">
                        <InputField
                          label="Search"
                          value={bgvReportSearch}
                          onChange={(v) => setBgvReportSearch(v)}
                        />
                        <SelectField
                          label="Overall Status"
                          value={bgvReportStatusFilter}
                          options={["ALL", "CLEAR", "IN_PROGRESS", "FLAGGED"]}
                          onChange={(v) => setBgvReportStatusFilter(v)}
                        />
                        <SelectField
                          label="Employment Status"
                          value={bgvReportEmploymentFilter}
                          options={["ALL", "VERIFIED", "PENDING", "NOT_VERIFIED", "N/A"]}
                          onChange={(v) => setBgvReportEmploymentFilter(v)}
                        />
                        <SelectField
                          label="Reference Status"
                          value={bgvReportReferenceFilter}
                          options={["ALL", "COMPLETED", "PENDING", "N/A"]}
                          onChange={(v) => setBgvReportReferenceFilter(v)}
                        />
                      </div>
                      <DataTable
                        title="BGV Status Dashboard"
                        columns={["employee", "role", "consent", "identity", "employment", "overall_status"]}
                        rows={bgvDashboardRows}
                        emptyLabel="No background verification dashboard rows."
                        compact
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-4 text-sm text-wt-text-muted">
                      Placeholder for {activeTab.replace("reports-", "section ")}. Share requirements and I will implement it.
                    </div>
                  )}
                </div>
              </section>
            ) : null}


            {activeTab === "uploads" && !requiresSelfOnboarding ? (
              <section>
                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <h3 className="font-semibold mb-1">Bulk Upload Center</h3>
                  <p className="text-sm text-wt-text-muted mb-3">Upload HR files in supported Excel formats.</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <UploadTile
                      label="Leave Upload"
                      file={uploadFiles.leave}
                      onPick={(f) => setUploadFiles((p) => ({ ...p, leave: f }))}
                      onUpload={() => uploadFiles.leave ? runAction("Upload leave file", () => hrmsService.uploadFile(endpoints.upload.leave, uploadFiles.leave!)) : Promise.resolve()}
                      loading={actionLoading}
                    />
                    <UploadTile
                      label="Allocation Upload"
                      file={uploadFiles.allocation}
                      onPick={(f) => setUploadFiles((p) => ({ ...p, allocation: f }))}
                      onUpload={() => uploadFiles.allocation ? runAction("Upload allocation file", () => hrmsService.uploadFile(endpoints.upload.allocation, uploadFiles.allocation!)) : Promise.resolve()}
                      loading={actionLoading}
                    />
                    <UploadTile
                      label="User Data Upload"
                      file={uploadFiles.userData}
                      onPick={(f) => setUploadFiles((p) => ({ ...p, userData: f }))}
                      onUpload={() => uploadFiles.userData ? runAction("Upload user-data file", () => hrmsService.uploadFile(endpoints.upload.userData, uploadFiles.userData!)) : Promise.resolve()}
                      loading={actionLoading}
                    />
                    <UploadTile
                      label="User Batch Upload"
                      file={uploadFiles.batch}
                      onPick={(f) => setUploadFiles((p) => ({ ...p, batch: f }))}
                      onUpload={() => uploadFiles.batch ? runAction("Upload user-batch file", () => hrmsService.uploadFile(endpoints.user.batch, uploadFiles.batch!)) : Promise.resolve()}
                      loading={actionLoading}
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === "masters" && !requiresSelfOnboarding ? (
              <section className="grid xl:grid-cols-2 gap-4">
                <div className="xl:col-span-2 rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">KPI Definitions</h3>
                    <button
                      type="button"
                      className="btn-primary px-3 py-2"
                      onClick={() =>
                        runAction("Load KPI definitions", async () => {
                          const res = await hrmsService.getKpis({ limit: "500", offset: "0" });
                          setKpis(toRows((res as { data?: unknown[] }).data ?? res));
                        })
                      }
                      disabled={actionLoading}
                    >
                      Refresh
                    </button>
                  </div>
                  <DataTable
                    columns={["kpi_name", "designation", "department", "weightage"]}
                    rows={filteredKpis}
                    emptyLabel={canViewAllKpis ? "No KPI data loaded." : "No designated KPI data found for your profile."}
                  />
                </div>
                <div className="xl:col-span-2 rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <details>
                    <summary className="cursor-pointer list-none font-semibold text-wt-text">Assign Role</summary>
                    <div className="mt-4 rounded-xl border border-wt-border bg-wt-surface-2 p-4 space-y-3">
                      <p className="text-sm text-wt-text-muted">Select an employee and assign the required role.</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Email
                          <select
                            className="input-field px-3 py-2 text-sm"
                            value={roleAssignForm.target_email}
                            onChange={(e) =>
                              setRoleAssignForm((prev) => ({
                                ...prev,
                                target_email: e.target.value,
                              }))
                            }
                          >
                            <option value="">Select employee</option>
                            {roleAssignUsers.map((u) => (
                              <option key={u.email} value={u.email}>
                                {u.name} ({u.email})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Role
                          <select
                            className="input-field px-3 py-2 text-sm"
                            value={roleAssignForm.role}
                            onChange={(e) =>
                              setRoleAssignForm((prev) => ({
                                ...prev,
                                role: e.target.value,
                              }))
                            }
                          >
                            <option value="ROLE_HR">HR</option>
                            <option value="ROLE_MANAGER">Manager</option>
                            <option value="ROLE_EMPLOYEE">Employee</option>
                            <option value="ROLE_ADMIN">Admin</option>
                            <option value="ROLE_FINANCE">Finance</option>
                          </select>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-primary px-3 py-2 text-sm"
                          disabled={actionLoading}
                          onClick={() =>
                            runAction("Assign role", async () => {
                              const targetEmail = roleAssignForm.target_email.trim();
                              if (!targetEmail) throw new Error("Email is required.");
                              await hrmsService.assignRole({
                                target_email: targetEmail,
                                role: roleAssignForm.role,
                              });
                              setRoleAssignForm((prev) => ({ ...prev, target_email: "" }));
                            })
                          }
                        >
                          Assign Role
                        </button>
                        <button
                          type="button"
                          className="btn-ghost px-3 py-2 text-sm"
                          disabled={actionLoading}
                          onClick={() =>
                            runAction("Refresh employee list", async () => {
                              const res = await hrmsService.getOnboardList({ page: "0", size: "200" });
                              const rows = toPagedRows((res as { data?: unknown }).data ?? res);
                              const users = Array.from(
                                new Map(
                                  rows
                                    .map((row) => {
                                      const email = String(row.email ?? "").trim();
                                      if (!email) return null;
                                      const name = String(row.name ?? email).trim();
                                      return [email.toLowerCase(), { name, email }] as const;
                                    })
                                    .filter((entry): entry is readonly [string, { name: string; email: string }] => Boolean(entry))
                                ).values()
                              ).sort((a, b) => a.name.localeCompare(b.name));
                              setRoleAssignUsers(users);
                            })
                          }
                        >
                          Refresh Emails
                        </button>
                      </div>
                    </div>
                  </details>
                </div>
              </section>
            ) : null}
          </main>
      {toast ? (
        <div className="fixed right-5 bottom-5 z-50">
          <div
            className={`rounded-xl px-4 py-3 text-sm shadow-lg border ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-wt-bg text-sm text-wt-text-muted">
          Loading…
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}

function MetricCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <article className="rounded-2xl border border-wt-border bg-wt-surface-1 p-4">
      <p className="text-xs text-wt-text-muted">{label}</p>
      <p className="text-2xl mt-1 font-semibold">{loading ? "..." : value}</p>
    </article>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      {label}
      <input className="input-field px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} type={type} />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      {label}
      <select className="input-field px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function FileField({
  label,
  onPick,
  onPickFiles,
  accept,
  multiple,
}: {
  label: string;
  accept?: string;
  multiple?: boolean;
  onPick?: (file: File | null) => void;
  onPickFiles?: (files: File[]) => void;
}) {
  const isMulti = Boolean(multiple);
  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      {label}
      <input
        type="file"
        accept={accept}
        multiple={isMulti}
        className="input-field px-3 py-2 text-sm"
        onChange={(e) => {
          if (isMulti) {
            onPickFiles?.(e.target.files?.length ? Array.from(e.target.files) : []);
          } else {
            onPick?.(e.target.files?.[0] ?? null);
          }
        }}
      />
    </label>
  );
}

function UploadTile({
  label,
  file,
  onPick,
  onUpload,
  loading,
}: {
  label: string;
  file: File | null;
  onPick: (file: File | null) => void;
  onUpload: () => void | Promise<void>;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <input type="file" className="input-field px-2 py-1.5 text-sm" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      <p className="text-xs text-wt-text-muted truncate">{file ? file.name : "No file selected"}</p>
      <button type="button" className="btn-primary px-2.5 py-1.5 text-sm" onClick={onUpload} disabled={loading || !file}>
        Upload
      </button>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: unknown }) {
  return (
    <>
      <dt className="text-wt-text-muted">{label}</dt>
      <dd className="font-medium">{value ? String(value) : "—"}</dd>
    </>
  );
}

function DataTable({
  title,
  columns,
  rows,
  emptyLabel,
  compact = false,
}: {
  title?: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  emptyLabel: string;
  compact?: boolean;
}) {
  if (!rows.length) {
    return (
      <div className="space-y-1">
        {title ? <p className="text-sm font-medium">{title}</p> : null}
        <p className="text-sm text-wt-text-muted">{emptyLabel}</p>
      </div>
    );
  }
  const cellClass = compact ? "px-1.5 py-1 whitespace-nowrap" : "px-3 py-2 whitespace-nowrap";
  const headCellClass = compact
    ? "text-left px-1.5 py-1 font-medium whitespace-nowrap"
    : "text-left px-3 py-2 font-medium whitespace-nowrap";
  return (
    <div className="space-y-1">
      {title ? <p className="text-sm font-medium">{title}</p> : null}
      <div className="wt-scroll-both max-h-[min(70vh,520px)] rounded-xl border border-wt-border">
        <table className="min-w-full text-sm">
          <thead className="bg-wt-surface-2 text-wt-text-muted">
            <tr>
              {columns.map((col) => (
                <th key={col} className={headCellClass}>
                  {col.replaceAll("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-wt-border">
                {columns.map((col) => (
                  <td key={col} className={cellClass}>
                    {row[col] === null || row[col] === undefined ? "—" : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
