"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient, type ApiEnvelope } from "@/src/api/httpClient";
import { endpoints } from "@/src/api/endpoints";
import { hrmsService, type PagedData } from "@/src/services/hrms.service";
import { useOverviewData } from "@/src/hooks/useOverviewData";
import { ApiError } from "@/src/api/error";
import { WebTrakBrand } from "@/app/components/WebTrakBrand";
import { AllocationExtensionPanel } from "@/app/(protected)/dashboard/AllocationExtensionPanel";

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

function IconSettings({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.52-.4-1.08-.73-1.69-.98l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.61.25-1.17.59-1.69.98l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.52.4 1.08.73 1.69.98l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.61-.25 1.17-.59 1.69-.98l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
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
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

function IconCheck({ className = "" }: { className?: string }) {
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
      <path d="M20 6 9 17l-5-5" />
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

function extractRoleFromNotificationMessage(message: string): string {
  const pipeMatch = message.match(/\|\s*([^|]+?)\s+submitted/i);
  if (pipeMatch?.[1]) return pipeMatch[1].trim();
  const roleWordMatch = message.match(/\b(HR|Manager|Employee|Emp|Admin|Finance)\b/i);
  return roleWordMatch?.[1] ? roleWordMatch[1].trim() : "—";
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
  const [activeTab, setActiveTab] = useState("overview");
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("wt-theme");
    if (stored === "dark" || stored === "light" || stored === "system") return stored;
    return "light";
  });
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [empId, setEmpId] = useState("");
  const [employeeProfile, setEmployeeProfile] = useState<Record<string, unknown> | null>(null);
  const [onboardedUsers, setOnboardedUsers] = useState<Array<Record<string, unknown>>>([]);
  const [allocations, setAllocations] = useState<Array<Record<string, unknown>>>([]);
  const [allocationForecastRows, setAllocationForecastRows] = useState<Array<Record<string, unknown>>>([]);
  const allocationRecordsRef = useRef<HTMLDivElement>(null);
  const projectCrudFormRef = useRef<HTMLDivElement>(null);
  const allocationFormRef = useRef<HTMLDivElement>(null);
  const [allocationRoles, setAllocationRoles] = useState<string[]>([]);
  const [allocationUsers, setAllocationUsers] = useState<Array<{ name: string; email: string }>>([]);
  const [allocationProjects, setAllocationProjects] = useState<Array<{ code: string; name: string }>>([]);
  const [projects, setProjects] = useState<Array<Record<string, unknown>>>([]);
  const [assignedProjects, setAssignedProjects] = useState<Array<Record<string, unknown>>>([]);
  const [timelogs, setTimelogs] = useState<Array<Record<string, unknown>>>([]);
  const [managerEmailsForHr, setManagerEmailsForHr] = useState<string[]>([]);
  const [timelogProjects, setTimelogProjects] = useState<Array<{ code: string; name: string }>>([]);
  const [timelogForm, setTimelogForm] = useState({
    project_code: "",
    log_date: "",
    hours: "1",
    description: "",
  });
  const [myLeaveRequests, setMyLeaveRequests] = useState<Array<Record<string, unknown>>>([]);
  const [employeeRequests, setEmployeeRequests] = useState<Array<Record<string, unknown>>>([]);
  const [notifications, setNotifications] = useState<Array<Record<string, unknown>>>([]);
  const [kpis, setKpis] = useState<Array<Record<string, unknown>>>([]);
  const [reportsExpanded, setReportsExpanded] = useState(false);
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
    project_code: "",
    project_name: "",
    project_type: "IN_HOUSE",
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
    billing_status: "BILLED",
    is_manager: false,
  });
  const [editingAllocationId, setEditingAllocationId] = useState<string>("");
  const [learningTrainings, setLearningTrainings] = useState<Array<Record<string, unknown>>>([]);
  /** Same rows as `learningTrainings` but updated synchronously after each fetch (avoids stale closure in roster load). */
  const learningTrainingsLatestRef = useRef<Array<Record<string, unknown>>>([]);
  const [learningOpenTrainings, setLearningOpenTrainings] = useState<Array<Record<string, unknown>>>([]);
  const [learningSessions, setLearningSessions] = useState<Array<Record<string, unknown>>>([]);
  const [learningMaterials, setLearningMaterials] = useState<Array<Record<string, unknown>>>([]);
  const [learningAssessments, setLearningAssessments] = useState<Array<Record<string, unknown>>>([]);
  const [learningAttendanceRows, setLearningAttendanceRows] = useState<Array<Record<string, unknown>>>([]);
  const [learningScores, setLearningScores] = useState<Array<Record<string, unknown>>>([]);
  const [learningAnalytics, setLearningAnalytics] = useState<Record<string, unknown> | null>(null);
  const [selectedLearningTrainingId, setSelectedLearningTrainingId] = useState("");
  const [selectedLearningSessionId, setSelectedLearningSessionId] = useState("");
  const [learningTrainingForm, setLearningTrainingForm] = useState({
    name: "",
    category: "TECHNICAL",
    type: "OPTIONAL",
    description: "",
    duration_days: "1",
    status: "DRAFT",
  });
  /** Set when creating a training; assigned via API right after create. */
  const [learningCreateTrainerId, setLearningCreateTrainerId] = useState("");
  const [learningTrainerOptions, setLearningTrainerOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedLearningTrainerId, setSelectedLearningTrainerId] = useState("");
  const [selectedLearningParticipantId, setSelectedLearningParticipantId] = useState("");
  const [selectedLearningApiParticipantId, setSelectedLearningApiParticipantId] = useState("");
  const [learningRosterTrainerRows, setLearningRosterTrainerRows] = useState<Array<Record<string, unknown>>>([]);
  const [learningRosterParticipantRows, setLearningRosterParticipantRows] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [learningSessionForm, setLearningSessionForm] = useState({
    session_date: "",
    start_time: "",
    end_time: "",
    mode: "ONLINE",
    venue: "",
    meeting_link: "",
  });
  const [learningMaterialForm, setLearningMaterialForm] = useState({
    title: "",
    visibility: "EMPLOYEE",
  });
  const [learningMaterialFile, setLearningMaterialFile] = useState<File | null>(null);
  const [learningAssessmentForm, setLearningAssessmentForm] = useState({
    name: "",
    description: "",
    weight_percent: "10",
  });
  const [learningAssessmentFile, setLearningAssessmentFile] = useState<File | null>(null);
  const [learningAttendanceForm, setLearningAttendanceForm] = useState({
    user_id: "",
    attendance_status: "PRESENT",
  });
  const [learningScoreForm, setLearningScoreForm] = useState({
    user_id: "",
    score_percent: "0",
    mark_completed: true,
  });
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

  /** Participants for this training (GET participants + optional name match from onboard list). */
  const learningParticipantOptionsForAttendanceScores = useMemo(() => {
    const out: Array<{ id: string; label: string }> = [];
    const seen = new Set<string>();
    const labelFromOnboard = (uid: string): string | null => {
      const u = uid.trim();
      if (!u) return null;
      const exact = learningTrainerOptions.find((o) => o.id === u);
      if (exact) return exact.label;
      const n = Number(u);
      if (Number.isFinite(n) && n > 0) {
        const byNum = learningTrainerOptions.find(
          (o) => !String(o.id).startsWith("email:") && Number(String(o.id)) === n
        );
        if (byNum) return byNum.label;
      }
      return null;
    };
    for (const row of learningRosterParticipantRows) {
      const uid = participantRowUserId(row);
      if (!uid || seen.has(uid)) continue;
      if (uid.startsWith("email:")) {
        seen.add(uid);
        let name = String(
          row.name ?? row.employee_name ?? row.employeeName ?? row.user_name ?? row.userName ?? ""
        ).trim();
        let email = String(
          row.email ?? row.user_email ?? row.userEmail ?? row.employee_email ?? row.employeeEmail ?? ""
        ).trim();
        const nested =
          (row.user as Record<string, unknown> | undefined) ??
          (row.employee as Record<string, unknown> | undefined);
        if (nested && typeof nested === "object") {
          if (!name) name = String(nested.name ?? nested.full_name ?? nested.fullName ?? "").trim();
          if (!email) email = String(nested.email ?? nested.user_email ?? nested.userEmail ?? "").trim();
        }
        const onboard = labelFromOnboard(uid);
        const status = String(row.enrollment_status ?? row.enrollmentStatus ?? "").trim();
        const source = String(row.participant_source ?? row.participantSource ?? "").trim();
        const emailFromOnboard = onboard?.match(/\(([^)]+)\)/)?.[1]?.trim() ?? "";
        const emailBracket = email || emailFromOnboard;
        const label = [
          name || onboard?.split("(")[0]?.trim() || uid.replace(/^email:/, ""),
          emailBracket ? `(${emailBracket})` : "",
          status ? `[${status}]` : "",
          source ? `[${source}]` : "",
        ]
          .filter(Boolean)
          .join(" ");
        out.push({ id: uid, label: label || onboard || uid });
        continue;
      }
      const n = Number(uid);
      if (!Number.isFinite(n) || n <= 0) continue;
      seen.add(uid);
      let name = String(
        row.name ?? row.employee_name ?? row.employeeName ?? row.user_name ?? row.userName ?? ""
      ).trim();
      let email = String(
        row.email ?? row.user_email ?? row.userEmail ?? row.employee_email ?? row.employeeEmail ?? ""
      ).trim();
      const nested =
        (row.user as Record<string, unknown> | undefined) ??
        (row.employee as Record<string, unknown> | undefined);
      if (nested && typeof nested === "object") {
        if (!name) name = String(nested.name ?? nested.full_name ?? nested.fullName ?? "").trim();
        if (!email) email = String(nested.email ?? nested.user_email ?? nested.userEmail ?? "").trim();
      }
      const onboard = labelFromOnboard(uid);
      const nameFromOnboard = onboard
        ? onboard.includes("(")
          ? onboard.slice(0, onboard.indexOf("(")).trim()
          : onboard
        : "";
      const emailFromOnboard =
        onboard?.match(/\(([^)]+)\)/)?.[1]?.trim() ?? "";
      const displayName = name || nameFromOnboard || `User ${uid}`;
      const displayEmail = email || emailFromOnboard;
      const status = String(row.enrollment_status ?? row.enrollmentStatus ?? "").trim();
      const source = String(row.participant_source ?? row.participantSource ?? "").trim();
      const label = [
        displayName,
        displayEmail ? `(${displayEmail})` : "",
        status ? `[${status}]` : "",
        source ? `[${source}]` : "",
      ]
        .filter(Boolean)
        .join(" ");
      out.push({ id: uid, label: label || onboard || `User ${uid}` });
    }
    return out;
  }, [learningRosterParticipantRows, learningTrainerOptions]);

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
                  if (!email) return null;
                  return [email.toLowerCase(), { name, email }] as const;
                })
                .filter((x): x is readonly [string, { name: string; email: string }] => Boolean(x))
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
                  return [code, { code, name }] as const;
                })
                .filter((x): x is readonly [string, { code: string; name: string }] => Boolean(x))
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
    if (activeTab !== "employee") return;
    if (!hasHrAccess) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await hrmsService.getOnboardList({ page: "0", size: "10" });
          setOnboardedUsers(toPagedRows(res.data));
        } catch {
          setOnboardedUsers([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasHrAccess]);
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
    if (activeTab !== "projects") return;
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
  }, [activeTab]);
  useEffect(() => {
    if (activeTab !== "timelog" && activeTab !== "team-timelog") return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          if (activeTab === "timelog") {
            const [_, assignedRes, allocationRes] = await Promise.all([
              loadTimelogsForCurrentRole(),
              hrmsService.getAssignedProjects(),
              hrmsService.getMyAllocations(),
            ]);
            const assignedRows = toPagedRows(assignedRes.data ?? assignedRes);
            const allocationRows = toPagedRows(allocationRes.data ?? allocationRes);
            const projects = Array.from(
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
            setTimelogProjects(projects);
            return;
          }
          await loadTimelogsForCurrentRole();
        } catch {
          setTimelogs([]);
          setManagerEmailsForHr([]);
          if (activeTab === "timelog") setTimelogProjects([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasHrAccess]);

  useEffect(() => {
    if (activeTab !== "projects" || !hasManagerAccess) return;
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
  }, [activeTab, hasManagerAccess, loadManagerData]);

  useEffect(() => {
    if (!hasManagerAccess) return;
    if (activeTab !== "projects") return;
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
  }, [activeTab, hasManagerAccess, selectedManagerProjectCode]);

  async function loadLearningTrainingsSafe() {
    const [trainingsRes, openRes, onboardRes, allocRes] = await Promise.allSettled([
      hrmsService.getTrainings(),
      hrmsService.getOpenTrainings(),
      hrmsService.getOnboardList({ page: "0", size: "500" }),
      hasHrAccess
        ? hrmsService.getAllocations({ page: "0", size: "500", view: "ALL" })
        : Promise.resolve({ data: [] }),
    ]);
    const trainings =
      trainingsRes.status === "fulfilled"
        ? toPagedRows((trainingsRes.value as { data?: unknown }).data ?? trainingsRes.value)
        : [];
    learningTrainingsLatestRef.current = trainings;
    const openTrainings =
      openRes.status === "fulfilled"
        ? toPagedRows((openRes.value as { data?: unknown }).data ?? openRes.value)
        : [];
    setLearningTrainings(trainings);
    setLearningOpenTrainings(openTrainings);
    const onboardRows =
      onboardRes.status === "fulfilled"
        ? toPagedRows((onboardRes.value as { data?: unknown }).data ?? onboardRes.value)
        : [];
    const allocationRows =
      allocRes.status === "fulfilled"
        ? toPagedRows((allocRes.value as { data?: unknown }).data ?? allocRes.value)
        : [];
    const mergedOnboardRows = [...onboardRows, ...onboardedUsers, ...allocationRows];
    const trainerOptions = Array.from(
      new Map(
        mergedOnboardRows
          .map((row) => {
            const rawId = String(
              row.user_id ??
                row.userId ??
                row.emp_id ??
                row.empId ??
                row.id ??
                (row.user as Record<string, unknown> | undefined)?.id ??
                ""
            ).trim();
            const name = String(row.name ?? "Employee").trim();
            const email = String(
              row.email ??
                row.user_email ??
                row.userEmail ??
                row.employee_email ??
                row.employeeEmail ??
                ""
            ).trim();
            const userId = rawId || (email ? `email:${email.toLowerCase()}` : "");
            if (!userId) return null;
            const label = email ? `${name} (${email})` : name;
            return [userId, { id: userId, label }] as const;
          })
          .filter((item): item is readonly [string, { id: string; label: string }] => Boolean(item))
      ).values()
    );
    setLearningTrainerOptions(trainerOptions);
    if (!selectedLearningTrainerId && trainerOptions.length) {
      setSelectedLearningTrainerId(trainerOptions[0].id);
    }
    // Keep training selector empty by default; user explicitly chooses.
  }

  async function loadLearningDetailSafe(trainingId: string, sessionId?: string) {
    if (!trainingId) return;
    const [sessionsRes, materialsRes, assessmentsRes, analyticsRes] = await Promise.allSettled([
      hrmsService.getTrainingSessions(trainingId),
      hrmsService.getTrainingMaterials(trainingId),
      hrmsService.getAssessments(trainingId),
      hrmsService.getTrainingAnalytics(trainingId),
    ]);
    setLearningSessions(
      sessionsRes.status === "fulfilled"
        ? toPagedRows((sessionsRes.value as { data?: unknown }).data ?? sessionsRes.value)
        : []
    );
    setLearningMaterials(
      materialsRes.status === "fulfilled"
        ? toPagedRows((materialsRes.value as { data?: unknown }).data ?? materialsRes.value)
        : []
    );
    setLearningAssessments(
      assessmentsRes.status === "fulfilled"
        ? toPagedRows((assessmentsRes.value as { data?: unknown }).data ?? assessmentsRes.value)
        : []
    );
    setLearningAnalytics(
      analyticsRes.status === "fulfilled"
        ? (((analyticsRes.value as { data?: unknown }).data ?? analyticsRes.value) as Record<string, unknown>)
        : null
    );
    const resolvedSessionId = sessionId || selectedLearningSessionId;
    if (resolvedSessionId) {
      try {
        const attendanceRes = await hrmsService.getAttendance(trainingId, resolvedSessionId);
        setLearningAttendanceRows(toPagedRows(attendanceRes.data ?? attendanceRes));
      } catch {
        setLearningAttendanceRows([]);
      }
    }
  }

  async function resolveLearningTrainerUserId(selectedValue: string): Promise<number> {
    let idNum = Number(selectedValue);
    if ((!Number.isFinite(idNum) || idNum <= 0) && selectedValue.startsWith("email:")) {
      const email = selectedValue.slice("email:".length).trim();
      if (email) {
        const userRes = await hrmsService.getUser({ email });
        const payload = ((userRes as { data?: unknown }).data ?? userRes) as
          | Record<string, unknown>
          | null;
        const nestedUser = (payload?.user as Record<string, unknown> | undefined) ?? null;
        const candidate = Number(
          payload?.id ??
            payload?.user_id ??
            payload?.userId ??
            payload?.emp_id ??
            payload?.empId ??
            nestedUser?.id ??
            nestedUser?.user_id ??
            nestedUser?.userId ??
            nestedUser?.emp_id ??
            nestedUser?.empId ??
            0
        );
        if (Number.isFinite(candidate) && candidate > 0) {
          idNum = candidate;
        }
      }
    }
    if (!Number.isFinite(idNum) || idNum <= 0) {
      throw new Error("Please select a valid trainer.");
    }
    return idNum;
  }

  async function loadLearningRosterLists(trainingId: string) {
    const tid = trainingId.trim();
    if (!tid) {
      setLearningRosterTrainerRows([]);
      setLearningRosterParticipantRows([]);
      return;
    }
    const [tRes, pRes] = await Promise.allSettled([
      hrmsService.getTrainingTrainers(tid),
      hrmsService.getTrainingParticipants(tid),
    ]);
    setLearningRosterTrainerRows(
      tRes.status === "fulfilled"
        ? toPagedRows((tRes.value as { data?: unknown }).data ?? tRes.value)
        : []
    );
    let participantRows =
      pRes.status === "fulfilled" ? participantListFromApiEnvelope(pRes.value) : [];
    if (pRes.status === "rejected") {
      const err = pRes.reason;
      const message =
        err instanceof ApiError
          ? `Participants could not be loaded (${err.status ?? "error"}: ${err.message}).`
          : "Participants could not be loaded.";
      setToast({ type: "error", message });
    }
    if (!participantRows.length) {
      try {
        const detail = await hrmsService.getTrainingById(tid);
        participantRows = participantListFromApiEnvelope(detail);
        if (!participantRows.length) {
          const root = ((detail as { data?: unknown }).data ?? detail) as Record<string, unknown> | null;
          participantRows = participantListFromTrainingRecord(root);
        }
      } catch {
        /* ignore */
      }
    }
    if (!participantRows.length) {
      const list =
        learningTrainingsLatestRef.current.length > 0 ? learningTrainingsLatestRef.current : learningTrainings;
      const cached = list.find((r) => String(r.id ?? "").trim() === tid);
      if (cached) participantRows = participantListFromTrainingRecord(cached as Record<string, unknown>);
    }
    const normalized = normalizeParticipantRows(participantRows).map((row) => ({
      ...row,
      participant_source: String(row.participant_source ?? row.participantSource ?? "").trim(),
      enrollment_status:
        row.enrollment_status == null
          ? null
          : String(row.enrollment_status ?? row.enrollmentStatus ?? "").trim() || null,
    }));
    setLearningRosterParticipantRows(normalized);
  }

  async function loadLearningParticipantsOnly(trainingId: string) {
    const tid = trainingId.trim();
    if (!tid) {
      setLearningRosterParticipantRows([]);
      return;
    }
    const res = await hrmsService.getTrainingParticipants(tid);
    const participantRows = participantListFromApiEnvelope(res);
    const normalized = normalizeParticipantRows(participantRows).map((row) => ({
      ...row,
      participant_source: String(row.participant_source ?? row.participantSource ?? "").trim(),
      enrollment_status:
        row.enrollment_status == null
          ? null
          : String(row.enrollment_status ?? row.enrollmentStatus ?? "").trim() || null,
    }));
    setLearningRosterParticipantRows(normalized);
    if (!selectedLearningApiParticipantId && normalized.length) {
      setSelectedLearningApiParticipantId(participantRowUserId(normalized[0] ?? {}));
    }
  }

  useEffect(() => {
    if (activeTab !== "learning") return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          await loadLearningTrainingsSafe();
        } catch {
          setLearningTrainings([]);
          setLearningOpenTrainings([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, selectedLearningTrainingId, onboardedUsers]);

  useEffect(() => {
    if (activeTab !== "learning") return;
    const trainingId = selectedLearningTrainingId.trim();
    if (!trainingId) {
      setLearningSessions([]);
      setLearningMaterials([]);
      setLearningAssessments([]);
      setLearningAnalytics(null);
      setLearningRosterTrainerRows([]);
      setLearningRosterParticipantRows([]);
      setSelectedLearningApiParticipantId("");
      return;
    }
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          await loadLearningTrainingsSafe();
        } catch {
          setLearningTrainings([]);
          setLearningOpenTrainings([]);
        }
        try {
          await loadLearningDetailSafe(trainingId);
        } catch {
          setLearningSessions([]);
          setLearningMaterials([]);
          setLearningAssessments([]);
          setLearningAnalytics(null);
        }
        try {
          await loadLearningRosterLists(trainingId);
        } catch {
          setLearningRosterTrainerRows([]);
          setLearningRosterParticipantRows([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, selectedLearningTrainingId, selectedLearningSessionId]);

  useEffect(() => {
    if (!learningSessions.length) {
      setSelectedLearningSessionId("");
      return;
    }
    const exists = learningSessions.some(
      (row) => String(row.id ?? "").trim() === selectedLearningSessionId.trim()
    );
    if (!exists) {
      setSelectedLearningSessionId(String(learningSessions[0]?.id ?? "").trim());
    }
  }, [learningSessions, selectedLearningSessionId]);

  useEffect(() => {
    setLearningAttendanceForm((p) => ({ ...p, user_id: "" }));
    setLearningScoreForm((p) => ({ ...p, user_id: "" }));
  }, [selectedLearningTrainingId]);

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

  function toRows(input: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(input)) return input as Array<Record<string, unknown>>;
    if (!input || typeof input !== "object") return [];
    const o = input as Record<string, unknown>;
    // Prefer non-empty `allocations` before `data`: some paginated responses include both,
    // and an empty `data: []` or partial `data` rows would otherwise hide full allocation rows.
    if (Array.isArray(o.items) && o.items.length) {
      return o.items as Array<Record<string, unknown>>;
    }
    if (Array.isArray(o.allocations) && o.allocations.length) {
      return o.allocations as Array<Record<string, unknown>>;
    }
    if (Array.isArray(o.data) && o.data.length) {
      return o.data as Array<Record<string, unknown>>;
    }
    if (Array.isArray(o.content) && o.content.length) {
      return o.content as Array<Record<string, unknown>>;
    }
    // Extra tolerance for manager/team endpoints that may use custom keys.
    for (const key of [
      "rows",
      "results",
      "result",
      "projects",
      "project_list",
      "projectList",
      "manager_projects",
      "managerProjects",
      "team",
      "team_members",
      "teamMembers",
    ] as const) {
      const value = o[key];
      if (Array.isArray(value) && value.length) {
        return value as Array<Record<string, unknown>>;
      }
    }
    return [];
  }

  function toPagedRows(input: unknown): Array<Record<string, unknown>> {
    const directRows = toRows(input);
    if (directRows.length) return directRows;
    if (input && typeof input === "object") {
      const dataRows = toRows((input as { data?: unknown }).data);
      if (dataRows.length) return dataRows;
      const nestedDataRows = toRows((input as { data?: { data?: unknown } }).data?.data);
      if (nestedDataRows.length) return nestedDataRows;
      const contentRows = toRows((input as { content?: unknown }).content);
      if (contentRows.length) return contentRows;
    }
    return [];
  }

  /** Last-resort: find first array of plain objects nested in arbitrary API shapes. */
  function extractFirstObjectArray(input: unknown, depth = 0): Array<Record<string, unknown>> {
    if (depth > 8) return [];
    if (Array.isArray(input)) {
      if (
        input.length &&
        input.every((x) => x !== null && typeof x === "object" && !Array.isArray(x))
      ) {
        return input as Array<Record<string, unknown>>;
      }
      for (const item of input) {
        const inner = extractFirstObjectArray(item, depth + 1);
        if (inner.length) return inner;
      }
      return [];
    }
    if (input !== null && typeof input === "object") {
      for (const v of Object.values(input as Record<string, unknown>)) {
        const inner = extractFirstObjectArray(v, depth + 1);
        if (inner.length) return inner;
      }
    }
    return [];
  }

  function rowLooksLikeTrainingParticipant(row: Record<string, unknown>): boolean {
    if (
      row.session_date != null ||
      row.sessionDate != null ||
      row.start_time != null ||
      row.startTime != null
    ) {
      return false;
    }
    return (
      row.user_id != null ||
      row.userId != null ||
      row.participant_user_id != null ||
      row.participantUserId != null ||
      row.enrollment_status != null ||
      row.enrollmentStatus != null ||
      row.participant != null ||
      row.trainingParticipant != null ||
      row.email != null ||
      row.user_email != null ||
      row.userEmail != null ||
      Boolean(row.user && typeof row.user === "object") ||
      Boolean(row.employee && typeof row.employee === "object")
    );
  }

  /** Unwrap GET /trainings/:id/participants payloads that may nest arrays under custom keys. */
  function participantListFromApiEnvelope(res: unknown): Array<Record<string, unknown>> {
    const rows = toPagedRows((res as { data?: unknown })?.data ?? res);
    if (rows.length) return rows;
    let payload: unknown = (res as { data?: unknown })?.data ?? res;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload) as unknown;
        const fromString = participantListFromApiEnvelope({ data: payload });
        if (fromString.length) return fromString;
      } catch {
        return [];
      }
    }
    if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
      const o = payload as Record<string, unknown>;
      for (const key of [
        "participants",
        "training_participants",
        "trainingParticipants",
        "participantList",
        "participant_list",
        "records",
        "elements",
        "values",
        "enrolled_users",
        "enrolledUsers",
        "result",
        "body",
      ] as const) {
        const arr = o[key];
        if (Array.isArray(arr) && arr.length) return arr as Array<Record<string, unknown>>;
      }
      const embedded = o._embedded;
      if (embedded && typeof embedded === "object" && !Array.isArray(embedded)) {
        for (const v of Object.values(embedded as Record<string, unknown>)) {
          if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
            return v as Array<Record<string, unknown>>;
          }
        }
      }
      const extracted = extractFirstObjectArray(payload);
      if (extracted.length && extracted.some(rowLooksLikeTrainingParticipant)) return extracted;
    }
    if (Array.isArray(res)) return res as Array<Record<string, unknown>>;
    return [];
  }

  function normalizeParticipantRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    return rows.map((r) => {
      const inner =
        (r.participant as Record<string, unknown> | undefined) ??
        (r.participantDto as Record<string, unknown> | undefined) ??
        (r.participant_dto as Record<string, unknown> | undefined) ??
        (r.trainingParticipant as Record<string, unknown> | undefined) ??
        (r.training_participant as Record<string, unknown> | undefined);
      if (inner && typeof inner === "object") {
        const hasUserRef =
          inner.user_id != null ||
          inner.userId != null ||
          inner.participant_user_id != null ||
          inner.employee_id != null ||
          inner.employeeId != null ||
          inner.emp_id != null ||
          inner.empId != null ||
          inner.id != null;
        if (hasUserRef) return { ...r, ...inner };
      }
      return r;
    });
  }

  function participantListFromTrainingRecord(
    training: Record<string, unknown> | null
  ): Array<Record<string, unknown>> {
    if (!training) return [];
    const candidates: Array<Record<string, unknown>> = [training];
    for (const wrap of ["training", "payload", "result", "body", "record", "data"] as const) {
      const inner = training[wrap];
      if (inner && typeof inner === "object" && !Array.isArray(inner)) {
        candidates.push(inner as Record<string, unknown>);
      }
    }
    for (const c of candidates) {
      for (const key of [
        "participants",
        "training_participants",
        "trainingParticipants",
        "participantList",
        "participant_list",
        "enrolled_users",
        "enrolledUsers",
        "employee_list",
        "employeeList",
        "roster",
        "attendees",
      ] as const) {
        const v = c[key];
        if (Array.isArray(v) && v.length) return v as Array<Record<string, unknown>>;
      }
    }
    return [];
  }

  function participantRowUserId(row: Record<string, unknown>): string {
    const nested =
      (row.user as Record<string, unknown> | undefined) ??
      (row.employee as Record<string, unknown> | undefined) ??
      (row.participant_user as Record<string, unknown> | undefined) ??
      (row.participantUser as Record<string, unknown> | undefined) ??
      (row.user_info as Record<string, unknown> | undefined);
    if (nested && typeof nested === "object") {
      const nid = String(
        nested.user_id ?? nested.userId ?? nested.id ?? nested.emp_id ?? nested.empId ?? ""
      ).trim();
      const n = Number(nid);
      if (nid && Number.isFinite(n) && n > 0) return nid;
    }
    const direct = String(
      row.user_id ??
        row.userId ??
        row.participant_user_id ??
        row.participantUserId ??
        row.member_user_id ??
        row.memberUserId ??
        row.employee_id ??
        row.employeeId ??
        row.emp_id ??
        row.empId ??
        ""
    ).trim();
    const d = Number(direct);
    if (direct && Number.isFinite(d) && d > 0) return direct;
    const emailRaw = String(
      row.email ??
        row.user_email ??
        row.userEmail ??
        row.employee_email ??
        row.employeeEmail ??
        (nested && typeof nested === "object"
          ? String(
              (nested as Record<string, unknown>).email ??
                (nested as Record<string, unknown>).user_email ??
                (nested as Record<string, unknown>).userEmail ??
                ""
            )
          : "")
    )
      .trim()
      .toLowerCase();
    if (emailRaw) return `email:${emailRaw}`;
    return "";
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
            allocated_hours: String(emp.allocated_hours ?? emp.allocatedHours ?? row.allocated_hours ?? "—").trim(),
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
          allocated_hours: String(row.allocated_hours ?? row.allocatedHours ?? row.hours ?? "—").trim(),
          allocation_type: String(row.allocation_type ?? row.allocationType ?? "—").trim(),
          is_manager: String(row.is_manager ?? row.isManager ?? "—").trim(),
          start_date: String(row.start_date ?? row.startDate ?? "—").trim(),
          end_date: String(row.end_date ?? row.endDate ?? "—").trim(),
        }];
      })
      .filter((row) => row.employee !== "—" || row.email !== "—");
  }

  const navigation = useMemo(
    () => [
      { id: "overview", label: "Overview", roles: ["ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN", "ROLE_FINANCE"] },
      { id: "employee", label: "Employee & Onboarding", roles: ["ROLE_EMPLOYEE", "ROLE_HR", "ROLE_ADMIN"] },
      { id: "allocation", label: "Allocation & Projects", roles: ["ROLE_HR", "ROLE_ADMIN"] },
      { id: "projects", label: "Projects", roles: ["ROLE_EMPLOYEE", "ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"] },
      { id: "allocation-extension", label: "Allocation Extensions", roles: ["ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"] },
      { id: "employee-request", label: "Team Requests", roles: ["ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"] },
      { id: "offboarding", label: "Offboarding", roles: ["ROLE_HR"] },
      { id: "background-verification", label: "Background Verification", roles: ["ROLE_HR"] },
      { id: "timelog", label: "Timelog", roles: ["ROLE_EMPLOYEE", "ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"] },
      { id: "team-timelog", label: "Team Timelogs", roles: ["ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"] },
      { id: "leave", label: "Leave Requests", roles: ["ROLE_EMPLOYEE", "ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"] },
      { id: "learning", label: "Learning & Development", roles: ["ROLE_EMPLOYEE", "ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"] },
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
    ],
    []
  );
  const availableOnboardRoles = bandDeptRoleMap[onboardForm.department] ?? [];
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
  const loadAllProjectsForHr = useCallback(async () => {
    const res = await hrmsService.getProjects({ page: "0", size: "10" });
    const rows = toRows(res.data);
    if (rows.length) return rows;
    const fallback = await hrmsService.getAllProjects({});
    return toRows(fallback.data ?? fallback);
  }, []);
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
      const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "10" });
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
    if (activeTab !== "leave" && activeTab !== "employee-request") return;
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
  }, [activeTab, hasManagerAccess, hasHrAccess, loadEmployeeRequestsForApprover]);

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
  }, [timelogs, managerTeamEmailList, teamTimelogEmailFilter]);
  useEffect(() => {
    if (teamTimelogEmailFilter === "ALL") return;
    const exists = managerTeamEmailList.some(
      (email) => email.toLowerCase() === teamTimelogEmailFilter.trim().toLowerCase()
    );
    if (!exists) {
      setTeamTimelogEmailFilter("ALL");
    }
  }, [managerTeamEmailList, teamTimelogEmailFilter]);
  useEffect(() => {
    if (activeTab !== "team-timelog") return;
    const selected = teamTimelogEmailFilter.trim();
    if (!selected || selected.toUpperCase() === "ALL") return;
    void loadTimelogsForCurrentRole(selected).catch(() => {
      /* ignore focused refresh errors */
    });
  }, [activeTab, teamTimelogEmailFilter]);
  const managerTimelogsForHr = useMemo(() => {
    if (!hasHrAccess) return timelogs;
    const managerEmailSet = new Set(managerEmailsForHr);
    return timelogs.filter((row) => {
      const managerRaw = row.is_manager;
      const isManagerFlag =
        typeof managerRaw === "boolean"
          ? managerRaw
          : typeof managerRaw === "number"
            ? managerRaw === 1
            : ["true", "yes", "y", "1", "manager"].includes(
                String(managerRaw ?? "").trim().toLowerCase()
              );
      const roleLabel = String(
        row.role ??
          row.user_role ??
          row.userRole ??
          row.designation ??
          ""
      )
        .trim()
        .toLowerCase();
      const email = String(
        row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
      )
        .trim()
        .toLowerCase();
      return isManagerFlag || roleLabel.includes("manager") || (email && managerEmailSet.has(email));
    });
  }, [timelogs, hasHrAccess, managerEmailsForHr]);
  const hrVisibleTimelogs = useMemo(() => {
    if (!hasHrAccess) return timelogs;
    return managerTimelogsForHr.length ? managerTimelogsForHr : timelogs;
  }, [hasHrAccess, timelogs, managerTimelogsForHr]);

  const unreadNotificationCount = useMemo(
    () =>
      notifications.filter((row) => !Boolean(row.is_read ?? row.isRead ?? false)).length,
    [notifications]
  );
  const loadNotifications = useCallback(async () => {
    const res = await hrmsService.getNotifications({ page: "0", size: "20" });
    setNotifications(toRows(res.data));
  }, []);
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
  const visibleNavigation = navigation.filter((item) => {
    if (item.id === "employee" && !hasHrAccess) return false;
    if (item.id === "team-timelog" && hasHrAccess) return false;
    return item.roles.length === 0 ? true : item.roles.some((r) => userRoles.includes(r));
  });
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

  const goToTab = (id: string) => {
    setActiveTab(id);
    router.replace("/dashboard", { scroll: false });
  };

  const renderSelfOnboardingPanel = () => (
    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
      <h3 className="font-semibold mb-1">Complete Your Onboarding</h3>
      <p className="text-sm text-wt-text-muted mb-4">Employees must complete onboarding before full portal access.</p>
      <div className="grid sm:grid-cols-2 gap-3">
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
    <div className="flex min-h-screen flex-col bg-wt-bg text-wt-text lg:flex-row">
        <aside className="wt-scroll flex max-h-[min(38vh,280px)] shrink-0 flex-col border-b border-wt-border bg-wt-surface-1 p-4 lg:max-h-none lg:min-h-0 lg:w-[250px] lg:shrink-0 lg:border-b-0 lg:border-r lg:p-5">
          <div className="mb-4 shrink-0">
            <WebTrakBrand variant="sidebar" />
          </div>
          <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
            {visibleNavigation.map((item) => {
              const children = (item as { children?: Array<{ id: string; label: string }> }).children;
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
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToTab(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    activeTab === item.id
                      ? "bg-wt-surface-3 text-wt-text"
                      : "text-wt-text-muted hover:bg-wt-surface-2"
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
                onClick={() => setActiveTab("profile")}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  activeTab === "profile"
                    ? "border-wt-border bg-wt-surface-3 text-wt-text"
                    : "border-transparent bg-wt-surface-2 text-wt-text-muted hover:bg-wt-surface-3 hover:text-wt-text"
                }`}
                aria-label="Profile"
                title="Profile"
              >
                <IconUser className="shrink-0" />
                Profile
              </Link>
            </div>
          ) : null}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-wt-border px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {activeTab === "profile" ? "My profile" : "Dashboard"}
              </h2>
              <p className="text-xs text-wt-text-muted">WebTrak workforce workspace</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <details
                className="group relative"
                onToggle={(e) => {
                  const el = e.currentTarget as HTMLDetailsElement;
                  if (el.open) {
                    void loadNotifications().catch(() => {
                      setNotifications([]);
                    });
                  }
                }}
              >
                <summary
                  className="relative flex cursor-pointer list-none items-center justify-center rounded-lg border border-wt-border bg-wt-surface-1 p-2.5 text-wt-text shadow-sm transition hover:bg-wt-surface-2 [&::-webkit-details-marker]:hidden"
                  aria-label="Notifications"
                >
                  <IconBell className="text-wt-text-muted" />
                  {unreadNotificationCount ? (
                    <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  ) : null}
                  <span className="sr-only">Notifications</span>
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
                          <div key={id || `notification-${idx}`} className="flex items-start justify-between gap-2 rounded-lg border border-wt-border bg-wt-surface-2 p-2.5">
                            <div className="min-w-0 space-y-1">
                              <span className="inline-block rounded-full border border-wt-border bg-wt-surface-1 px-2 py-0.5 text-[10px] font-medium text-wt-text-muted">
                                {roleLabel}
                              </span>
                              <p className={`text-sm break-words ${isRead ? "text-wt-text-muted" : "text-wt-text"}`}>{message}</p>
                            </div>
                            <button
                              type="button"
                              className="rounded-md border border-wt-border p-1 text-wt-text-muted hover:bg-wt-surface-3 disabled:opacity-40"
                              aria-label={isRead ? "Already read" : "Mark as read"}
                              title={isRead ? "Already read" : "Mark as read"}
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
                <summary
                  className="flex cursor-pointer list-none items-center justify-center rounded-lg border border-wt-border bg-wt-surface-1 p-2.5 text-wt-text shadow-sm transition hover:bg-wt-surface-2 [&::-webkit-details-marker]:hidden"
                  aria-label="Settings"
                >
                  <IconSettings className="h-5 w-5 text-wt-text-muted" />
                  <span className="sr-only">Settings</span>
                </summary>
                <div
                  className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(100vw-2rem,280px)] space-y-4 rounded-xl border border-wt-border bg-wt-surface-1 p-4 shadow-lg"
                  role="menu"
                >
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
                      aria-label="Color theme"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-red-600/90 bg-red-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 active:bg-red-800"
                    onClick={() => void signOut()}
                  >
                    Sign out
                  </button>
                </div>
              </details>
            </div>
          </header>

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
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard label="Total Onboarded" value={metrics.totalOnboarded} loading={loading} />
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
                  <section className="grid xl:grid-cols-[1.2fr_1fr] gap-4">
                    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                      <h3 className="font-semibold mb-1">Create New Employee</h3>
                      <p className="text-sm text-wt-text-muted mb-4">Capture core onboarding details used by HR operations.</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <InputField label="Employee ID" value={onboardForm.emp_id} onChange={(v) => setOnboardForm((p) => ({ ...p, emp_id: v }))} />
                        <InputField label="Email" value={onboardForm.email} onChange={(v) => setOnboardForm((p) => ({ ...p, email: v }))} />
                        <InputField label="Name" value={onboardForm.name} onChange={(v) => setOnboardForm((p) => ({ ...p, name: v }))} />
                        <SelectField label="User Type" value={onboardForm.user_type} options={["FULLTIME", "INTERN", "CONSULTANT"]} onChange={(v) => setOnboardForm((p) => ({ ...p, user_type: v }))} />
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
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Band
                          <select
                            className="input-field px-3 py-2 text-sm"
                            value={String(onboardForm.band_id)}
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
                        </label>
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Role
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
                                  ? "Select role"
                                  : "No roles available for selected department"
                                : "Select band and department first"}
                            </option>
                            {availableOnboardRoles.map((roleOption) => (
                              <option key={roleOption} value={roleOption}>
                                {roleOption}
                              </option>
                            ))}
                          </select>
                        </label>
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
                            runAction("Create employee", () => {
                              const email = onboardForm.email.trim();
                              const name = onboardForm.name.trim();
                              const department = onboardForm.department.trim();
                              const role = onboardForm.role.trim();
                              const phoneNumber = onboardForm.phone_number.trim();
                              const doj = onboardForm.doj.trim();
                              const doi = onboardForm.doi.trim();
                              const internshipDurationRaw = onboardForm.internship_duration.trim();
                              const bandId = Number(onboardForm.band_id);

                              if (!email || !name) {
                                throw new Error("Email and Name are required.");
                              }
                              if (!department) {
                                throw new Error("Department is required.");
                              }
                              if (!role) {
                                throw new Error("Role is required.");
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
                                return hrmsService.createOnboard({
                                  ...basePayload,
                                  doj: null,
                                  doi,
                                  internship_duration: Number(internshipDurationRaw),
                                });
                              }

                              return hrmsService.createOnboard({
                                ...basePayload,
                                doj,
                                doi: null,
                                internship_duration: null,
                              });
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
                            runAction("Load onboarded users", async () => {
                              const res = await hrmsService.getOnboardList({ page: "0", size: "20" });
                              setOnboardedUsers(toRows(res.data));
                            })
                          }
                          disabled={actionLoading}
                        >
                          Refresh Employee List
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                      <h3 className="font-semibold mb-1">Employee Profile</h3>
                      <p className="text-sm text-wt-text-muted mb-3">Search by employee ID.</p>
                      <InputField label="Employee ID" value={empId} onChange={setEmpId} />
                      <div className="mt-3">
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          onClick={() =>
                            runAction("Fetch employee profile", async () => {
                              if (userRoles.includes("ROLE_HR")) {
                                const res = await hrmsService.getEmployeeProfile(empId);
                                setEmployeeProfile((res.data ?? null) as Record<string, unknown> | null);
                                return;
                              }
                              const lookupRes = await hrmsService.getUser({ empId });
                              const payload = ((lookupRes as { data?: unknown }).data ?? lookupRes) as
                                | Record<string, unknown>
                                | null;
                              const candidate =
                                (payload?.user as Record<string, unknown> | undefined) ??
                                (payload?.profile as Record<string, unknown> | undefined) ??
                                payload;
                              setEmployeeProfile(
                                candidate && typeof candidate === "object" ? candidate : null
                              );
                            })
                          }
                          disabled={actionLoading}
                        >
                          View Profile
                        </button>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                        <ProfileField label="Name" value={employeeProfile?.name} />
                        <ProfileField label="Email" value={employeeProfile?.email} />
                        <ProfileField label="Status" value={employeeProfile?.status} />
                        <ProfileField label="Department" value={employeeProfile?.department} />
                        <ProfileField label="User Type" value={employeeProfile?.user_type} />
                        <ProfileField label="Work Mode" value={employeeProfile?.work_mode} />
                      </dl>
                    </div>
                    <div className="xl:col-span-2 rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                      <h3 className="font-semibold mb-3">Onboarded Employees</h3>
                      <DataTable
                        columns={["emp_id", "name", "email", "status", "user_type", "department"]}
                        rows={onboardedUsers}
                        emptyLabel="No employee records loaded yet."
                      />
                    </div>
                  </section>
            ) : null}

            {activeTab === "allocation" && !requiresSelfOnboarding ? (
              <>
                {hasHrAccess ? (
                  <section className="grid xl:grid-cols-2 gap-4">
                    <div ref={projectCrudFormRef} className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                      <h3 className="font-semibold">Project CRUD</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <InputField label="Project Code" value={projectForm.project_code} onChange={(v) => setProjectForm((p) => ({ ...p, project_code: v }))} />
                        <InputField label="Project Name" value={projectForm.project_name} onChange={(v) => setProjectForm((p) => ({ ...p, project_name: v }))} />
                        <SelectField
                          label="Project Type"
                          value={projectForm.project_type}
                          options={["IN_HOUSE", "STAFFING", "PRODUCT"]}
                          onChange={(v) => setProjectForm((p) => ({ ...p, project_type: v }))}
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
                                await hrmsService.createProject({
                                  project_code: projectForm.project_code.trim(),
                                  project_name: projectForm.project_name.trim(),
                                  project_type: projectForm.project_type,
                                });
                                setEditingProjectCode("");
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
                    <div ref={allocationFormRef} className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                      <h3 className="font-semibold">Employee Allocation Form</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Employee Name
                          <select
                            className="input-field px-3 py-2 text-sm"
                            value={allocationForm.employee_email}
                            onChange={(e) =>
                              setAllocationForm((p) => ({
                                ...p,
                                employee_email: e.target.value,
                              }))
                            }
                          >
                            <option value="">Select employee</option>
                            {allocationUsers.map((u) => (
                              <option key={u.email} value={u.email}>
                                {u.name} ({u.email})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Project Name
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
                          Role
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
                            <option value="">Select role</option>
                            {allocationRoles.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </label>
                        <InputField label="Allocated Hours (1-8)" value={allocationForm.allocated_hours} onChange={(v) => setAllocationForm((p) => ({ ...p, allocated_hours: v }))} />
                        <SelectField label="Allocation Type" value={allocationForm.allocation_type} options={["DEPLOYABLE", "STAFFING", "NONDEPLOYABLE", "NONBILLABLE", "LOCKED"]} onChange={(v) => setAllocationForm((p) => ({ ...p, allocation_type: v }))} />
                        <SelectField label="Billing Status" value={allocationForm.billing_status} options={["BILLED", "BUFFER", "UNBILLED"]} onChange={(v) => setAllocationForm((p) => ({ ...p, billing_status: v }))} />
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
                              const payload = {
                                employee_email: allocationForm.employee_email.trim(),
                                project_code: allocationForm.project_code.trim(),
                                role: allocationForm.role.trim() || null,
                                allocated_hours: Number(allocationForm.allocated_hours),
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
                      <div
                        ref={allocationRecordsRef}
                        className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Allocation Records</p>
                          <span className="text-xs text-wt-text-muted">{allocations.length} row(s)</span>
                        </div>
                        {allocations.length ? (
                          <div className="wt-scroll-both max-h-[min(70vh,520px)] rounded-xl border border-wt-border">
                            <table className="min-w-full text-sm">
                              <thead className="bg-wt-surface-2 text-wt-text-muted">
                                <tr>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">ALLOCATED PROJECT</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">EMPLOYEE NAME</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">ROLE</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">ALLOCATED HOURS</th>
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
                                {allocations.map((row, idx) => {
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
                                  const activeRaw = row.is_active ?? row.isActive;
                                  const isManagerRaw = row.is_manager;
                                  return (
                                    <tr key={`${allocationId || "alloc"}-${idx}`} className="border-t border-wt-border">
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.allocated_project ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.employee_name ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.role ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.allocated_hours ?? "—")}</td>
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
                                                  ["DEPLOYABLE", "STAFFING", "NONDEPLOYABLE", "NONBILLABLE", "LOCKED"].includes(
                                                    allocationType.toUpperCase()
                                                  )
                                                    ? allocationType.toUpperCase()
                                                    : "DEPLOYABLE",
                                                billing_status:
                                                  ["BILLED", "BUFFER", "UNBILLED"].includes(
                                                    billingStatus.toUpperCase()
                                                  )
                                                    ? billingStatus.toUpperCase()
                                                    : "BILLED",
                                                is_manager: Boolean(isManagerRaw),
                                              }));
                                              setEditingAllocationId(allocationId);
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
                          columns={["project_code", "project_name", "employee_name", "employee_email", "billing_status", "role"]}
                          rows={allocationForecastRows}
                          emptyLabel="No employees with allocations ending in the next 2 weeks."
                        />
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                    <p className="text-sm text-wt-text-muted">
                      Allocation management is available for HR/Admin. Use the Projects tab to view assigned projects.
                    </p>
                  </section>
                )}
              </>
            ) : null}

            {activeTab === "projects" && !requiresSelfOnboarding ? (
              <div className="space-y-4">
                {hasManagerAccess ? (
                  <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-semibold">Manager Projects & Team</h3>
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
                            columns={["project_code", "project_name", "project_type", "employee", "email", "role", "allocated_hours"]}
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
                  </section>
                ) : null}
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
                    columns={["project_code", "project_name", "project_type", "role", "allocated_hours", "billing_status", "is_manager", "start_date", "end_date"]}
                      rows={assignedProjects}
                      emptyLabel="No projects are allocated to you yet."
                    />
                  </section>
                ) : null}
              </div>
            ) : null}

            {activeTab === "allocation-extension" && !requiresSelfOnboarding ? (
              <AllocationExtensionPanel />
            ) : null}

            {activeTab === "timelog" && !requiresSelfOnboarding ? (
              <section>
                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Timelog Entries</h3>
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
                  {!userRoles.includes("ROLE_HR") ? (
                    <>
                      <div className="grid sm:grid-cols-2 gap-3 mb-4">
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
                      </div>
                      <div className="mb-4">
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
                              await apiClient.post(endpoints.timelog.root, {
                                contentType: "application/json",
                                body: JSON.stringify({
                                  project_code: projectCode,
                                  log_date: logDate,
                                  hours: Number(timelogForm.hours),
                                  description: timelogForm.description.trim() || null,
                                }),
                              });
                              setTimelogForm({
                                project_code: "",
                                log_date: "",
                                hours: "1",
                                description: "",
                              });
                              try {
                                await loadTimelogsForCurrentRole();
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
                    </>
                  ) : (
                    <p className="mb-4 text-sm text-wt-text-muted">
                      HR can review timelog entries only.
                    </p>
                  )}
                  {hasHrAccess ? (
                    <DataTable
                      columns={["project_code", "employee_name", "log_date", "hours", "description"]}
                      rows={hrVisibleTimelogs}
                      emptyLabel="No timelogs loaded."
                    />
                  ) : (
                    <DataTable columns={["project_code", "log_date", "hours", "description"]} rows={timelogs} emptyLabel="No timelogs loaded." />
                  )}
                </div>
              </section>
            ) : null}

            {activeTab === "team-timelog" && !requiresSelfOnboarding ? (
              <section>
                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">Team Timelogs</h3>
                      <p className="text-xs text-wt-text-muted mt-1">
                        View timelog entries submitted by employees under you.
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
                  <div className="mb-3 max-w-sm">
                    <SelectField
                      label="Employee Email"
                      value={teamTimelogEmailFilter}
                      options={["ALL", ...managerTeamEmailList]}
                      onChange={setTeamTimelogEmailFilter}
                    />
                  </div>
                  <DataTable
                    columns={["project_code", "employee_name", "log_date", "hours", "description"]}
                    rows={managerTeamTimelogs}
                    emptyLabel="No team timelogs loaded."
                  />
                </div>
              </section>
            ) : null}

            {activeTab === "leave" && !requiresSelfOnboarding ? (
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
            ) : null}

            {activeTab === "employee-request" && !requiresSelfOnboarding ? (
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
                        const payload = {
                          last_working_day: lastWorkingDay,
                          separation_type: offboardingForm.separation_type,
                          reason: offboardingForm.reason.trim() || undefined,
                          critical_skill: offboardingForm.critical_skill.trim() || undefined,
                          is_regretted: offboardingForm.is_regretted,
                        };
                        await hrmsService.offboardEmployee(empIdValue, payload);
                        setOffboardingForm((prev) => ({
                          ...prev,
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
                        title="Bench Aging and Size"
                        columns={["emp_id", "email", "name", "department", "bench_days"]}
                        rows={benchAgingRows}
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

            {activeTab === "learning" && !requiresSelfOnboarding ? (
              <section className="space-y-4">
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="btn-primary px-3 py-2"
                    onClick={() =>
                      runAction("Load learning hub", async () => {
                        await loadLearningTrainingsSafe();
                        const trainingId = selectedLearningTrainingId.trim();
                        if (trainingId) {
                          await loadLearningDetailSafe(trainingId);
                          await loadLearningRosterLists(trainingId);
                        }
                      })
                    }
                    disabled={actionLoading}
                  >
                    Refresh
                  </button>
                </div>

                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold">Training Records</h4>
                    <span className="text-xs text-wt-text-muted">{learningTrainings.length} training(s)</span>
                  </div>
                  {learningTrainings.length ? (
                    <div className="wt-scroll-both max-h-[min(48vh,360px)] rounded-xl border border-wt-border">
                      <table className="min-w-full text-sm">
                        <thead className="bg-wt-surface-2 text-wt-text-muted">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">id</th>
                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">name</th>
                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">category</th>
                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">type</th>
                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">status</th>
                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">duration days</th>
                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {learningTrainings.map((row, idx) => {
                            const id = String(row.id ?? "").trim();
                            return (
                              <tr key={`${id || "training"}-${idx}`} className="border-t border-wt-border">
                                <td className="px-3 py-2 whitespace-nowrap">{id || "—"}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{String(row.name ?? "—")}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{String(row.category ?? "—")}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{String(row.type ?? "—")}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{String(row.status ?? "—")}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{String(row.duration_days ?? "—")}</td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      className="rounded-lg p-2 text-wt-text-muted hover:bg-wt-surface-1 hover:text-wt-text"
                                      aria-label={`Edit training ${id || idx}`}
                                      title="Edit training"
                                      onClick={() => {
                                        setSelectedLearningTrainingId(id);
                                        setLearningTrainingForm((prev) => ({
                                          ...prev,
                                          name: String(row.name ?? "").trim(),
                                          category: String(row.category ?? "TECHNICAL").trim(),
                                          type: String(row.type ?? "OPTIONAL").trim(),
                                          description: String(row.description ?? "").trim(),
                                          duration_days: String(row.duration_days ?? "1").trim(),
                                          status: String(row.status ?? "DRAFT").trim(),
                                        }));
                                      }}
                                      disabled={!id || actionLoading}
                                    >
                                      <IconPencil />
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
                    <p className="text-sm text-wt-text-muted">No trainings loaded.</p>
                  )}
                </div>

                {hasHrAccess ? (
                  <div className="grid xl:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-3">
                      <h4 className="font-semibold">Create / Update Training</h4>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="btn-primary h-10 w-10 text-lg leading-none"
                          title="Create training"
                          aria-label="Create training"
                          disabled={actionLoading}
                          onClick={() =>
                            (() => {
                              setSelectedLearningTrainingId("");
                              setLearningCreateTrainerId("");
                              setLearningTrainingForm({
                                name: "",
                                category: "TECHNICAL",
                                type: "OPTIONAL",
                                description: "",
                                duration_days: "1",
                                status: "DRAFT",
                              });
                            })()
                          }
                        >
                          +
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <InputField
                          label="Name"
                          value={learningTrainingForm.name}
                          onChange={(v) => setLearningTrainingForm((p) => ({ ...p, name: v }))}
                        />
                        <SelectField
                          label="Category"
                          value={learningTrainingForm.category}
                          options={["PROFESSIONAL", "TECHNICAL", "SOFT_SKILLS"]}
                          onChange={(v) => setLearningTrainingForm((p) => ({ ...p, category: v }))}
                        />
                        <SelectField
                          label="Type"
                          value={learningTrainingForm.type}
                          options={["MANDATORY", "OPTIONAL", "HYBRID"]}
                          onChange={(v) => setLearningTrainingForm((p) => ({ ...p, type: v }))}
                        />
                        <InputField
                          label="Duration (days)"
                          value={learningTrainingForm.duration_days}
                          onChange={(v) => setLearningTrainingForm((p) => ({ ...p, duration_days: v }))}
                        />
                        <SelectField
                          label="Status"
                          value={learningTrainingForm.status}
                          options={["DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]}
                          onChange={(v) => setLearningTrainingForm((p) => ({ ...p, status: v }))}
                        />
                        <InputField
                          label="Description"
                          value={learningTrainingForm.description}
                          onChange={(v) => setLearningTrainingForm((p) => ({ ...p, description: v }))}
                        />
                        {!selectedLearningTrainingId ? (
                          <div className="sm:col-span-2">
                            <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                              Trainer (assigned when you create this training)
                              <select
                                className="input-field px-3 py-2 text-sm"
                                value={learningCreateTrainerId}
                                onChange={(e) => setLearningCreateTrainerId(e.target.value)}
                              >
                                <option value="">Select trainer (optional)</option>
                                {learningTrainerOptions.map((trainer) => (
                                  <option key={`create-trainer-${trainer.id}`} value={trainer.id}>
                                    {trainer.label}
                                  </option>
                                ))}
                              </select>
                              {!learningTrainerOptions.length ? (
                                <span className="text-[11px] text-wt-text-muted mt-1">
                                  Load employees with Refresh on this tab.
                                </span>
                              ) : null}
                            </label>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          disabled={actionLoading || !selectedLearningTrainingId}
                          onClick={() =>
                            runAction("Update training", async () => {
                              await hrmsService.updateTraining(selectedLearningTrainingId, {
                                name: learningTrainingForm.name.trim() || undefined,
                                category: learningTrainingForm.category,
                                type: learningTrainingForm.type,
                                description: learningTrainingForm.description.trim() || null,
                                duration_days: Number(learningTrainingForm.duration_days || "1"),
                                status: learningTrainingForm.status,
                              });
                              await loadLearningTrainingsSafe();
                              await loadLearningDetailSafe(selectedLearningTrainingId);
                            })
                          }
                        >
                          Update Selected
                        </button>
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          disabled={actionLoading}
                          onClick={() =>
                            runAction("Create training", async () => {
                              const normalizedName = learningTrainingForm.name.trim();
                              if (!normalizedName) {
                                throw new Error("Training name is required.");
                              }
                              const createRes = await hrmsService.createTraining({
                                name: normalizedName,
                                category: learningTrainingForm.category,
                                type: learningTrainingForm.type,
                                description: learningTrainingForm.description.trim() || null,
                                duration_days: Number(learningTrainingForm.duration_days || "1"),
                              });
                              const created = ((createRes as { data?: unknown }).data ?? createRes) as
                                | Record<string, unknown>
                                | null;
                              const createdTrainingId = String(created?.id ?? "").trim();
                              if (createdTrainingId && learningCreateTrainerId.trim()) {
                                const idNum = await resolveLearningTrainerUserId(learningCreateTrainerId);
                                await hrmsService.assignTrainers(createdTrainingId, [idNum]);
                              }
                              await loadLearningTrainingsSafe();
                              if (createdTrainingId) {
                                await loadLearningDetailSafe(createdTrainingId);
                              }
                              setSelectedLearningTrainingId("");
                              setLearningCreateTrainerId("");
                              setLearningTrainingForm({
                                name: "",
                                category: "TECHNICAL",
                                type: "OPTIONAL",
                                description: "",
                                duration_days: "1",
                                status: "DRAFT",
                              });
                            })
                          }
                        >
                          Create New
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-3">
                      <h4 className="font-semibold">Sessions & Trainers</h4>
                      <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                        Training
                        <select
                          className="input-field px-3 py-2 text-sm"
                          value={selectedLearningTrainingId}
                          onChange={(e) => setSelectedLearningTrainingId(e.target.value)}
                        >
                          <option value="">Select training</option>
                          {learningTrainings.map((row) => {
                            const id = String(row.id ?? "").trim();
                            const name = String((row.name ?? id) || "Training").trim();
                            return (
                              <option key={`session-training-${id || name}`} value={id}>
                                {name}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                      <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                        Trainer
                        <select
                          className="input-field px-3 py-2 text-sm"
                          value={selectedLearningTrainerId}
                          onChange={(e) => setSelectedLearningTrainerId(e.target.value)}
                        >
                          <option value="">Select trainer</option>
                          {learningTrainerOptions.map((trainer) => (
                            <option key={trainer.id} value={trainer.id}>
                              {trainer.label}
                            </option>
                          ))}
                        </select>
                        {!learningTrainerOptions.length ? (
                          <span className="text-[11px] text-wt-text-muted mt-1">
                            No employees loaded for trainer selection. Click Refresh.
                          </span>
                        ) : null}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          disabled={actionLoading || !selectedLearningTrainingId || !selectedLearningTrainerId}
                          onClick={() =>
                            runAction("Assign trainers", async () => {
                              const idNum = await resolveLearningTrainerUserId(selectedLearningTrainerId);
                              await hrmsService.assignTrainers(selectedLearningTrainingId, [idNum]);
                              await loadLearningTrainingsSafe();
                              await loadLearningRosterLists(selectedLearningTrainingId);
                            })
                          }
                        >
                          Assign Trainers
                        </button>
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          disabled={actionLoading || !selectedLearningTrainingId || !selectedLearningTrainerId}
                          onClick={() =>
                            runAction("Remove trainer", async () => {
                              const idNum = await resolveLearningTrainerUserId(selectedLearningTrainerId);
                              await hrmsService.removeTrainer(
                                selectedLearningTrainingId,
                                String(idNum)
                              );
                              await loadLearningTrainingsSafe();
                              await loadLearningRosterLists(selectedLearningTrainingId);
                            })
                          }
                        >
                          Remove Trainer
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <InputField
                          label="Session Date"
                          type="date"
                          value={learningSessionForm.session_date}
                          onChange={(v) => setLearningSessionForm((p) => ({ ...p, session_date: v }))}
                        />
                        <InputField
                          label="Start Time"
                          type="time"
                          value={learningSessionForm.start_time}
                          onChange={(v) => setLearningSessionForm((p) => ({ ...p, start_time: v }))}
                        />
                        <InputField
                          label="End Time"
                          type="time"
                          value={learningSessionForm.end_time}
                          onChange={(v) => setLearningSessionForm((p) => ({ ...p, end_time: v }))}
                        />
                        <SelectField
                          label="Mode"
                          value={learningSessionForm.mode}
                          options={["ONLINE", "OFFLINE", "HYBRID"]}
                          onChange={(v) => setLearningSessionForm((p) => ({ ...p, mode: v }))}
                        />
                        <InputField
                          label="Venue"
                          value={learningSessionForm.venue}
                          onChange={(v) => setLearningSessionForm((p) => ({ ...p, venue: v }))}
                        />
                        <InputField
                          label="Meeting Link"
                          value={learningSessionForm.meeting_link}
                          onChange={(v) => setLearningSessionForm((p) => ({ ...p, meeting_link: v }))}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-primary px-3 py-2"
                        disabled={actionLoading || !selectedLearningTrainingId}
                        onClick={() =>
                          runAction("Create session", async () => {
                            await hrmsService.createTrainingSession(selectedLearningTrainingId, {
                              ...learningSessionForm,
                              venue: learningSessionForm.venue.trim() || null,
                              meeting_link: learningSessionForm.meeting_link.trim() || null,
                            });
                            setLearningSessionForm({
                              session_date: "",
                              start_time: "",
                              end_time: "",
                              mode: "ONLINE",
                              venue: "",
                              meeting_link: "",
                            });
                            await loadLearningDetailSafe(selectedLearningTrainingId);
                          })
                        }
                      >
                        Add Session
                      </button>
                      <DataTable
                        title="Sessions"
                        columns={["id", "session_date", "start_time", "end_time", "mode", "venue", "meeting_link"]}
                        rows={learningSessions}
                        emptyLabel="No sessions loaded."
                      />
                    </div>

                    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-3 xl:col-span-2">
                      <h4 className="font-semibold">Trainers & participants</h4>
                      <p className="text-xs text-wt-text-muted">
                        Pick a training to load trainers. Add employees as participants below; participant data still
                        loads in the background for attendance and scores. Use Refresh on this tab if employee dropdowns
                        are empty.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Training
                          <select
                            className="input-field px-3 py-2 text-sm"
                            value={selectedLearningTrainingId}
                            onChange={(e) => setSelectedLearningTrainingId(e.target.value)}
                          >
                            <option value="">Select training</option>
                            {learningTrainings.map((row) => {
                              const id = String(row.id ?? "").trim();
                              const name = String((row.name ?? id) || "Training").trim();
                              return (
                                <option key={`roster-training-${id || name}`} value={id}>
                                  {name}
                                </option>
                              );
                            })}
                          </select>
                        </label>
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Employee (add as participant)
                          <select
                            className="input-field px-3 py-2 text-sm"
                            value={selectedLearningParticipantId}
                            onChange={(e) => setSelectedLearningParticipantId(e.target.value)}
                          >
                            <option value="">Select employee</option>
                            {learningTrainerOptions.map((emp) => (
                              <option key={`roster-participant-${emp.id}`} value={emp.id}>
                                {emp.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          disabled={actionLoading || !selectedLearningTrainingId || !selectedLearningParticipantId}
                          onClick={() =>
                            runAction("Add training participant", async () => {
                              const idNum = await resolveLearningTrainerUserId(selectedLearningParticipantId);
                              await hrmsService.addTrainingParticipants(selectedLearningTrainingId, {
                                user_ids: [idNum],
                                select_all: false,
                              });
                              await loadLearningTrainingsSafe();
                              await loadLearningRosterLists(selectedLearningTrainingId);
                            })
                          }
                        >
                          Add participant
                        </button>
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          disabled={actionLoading || !selectedLearningTrainingId.trim()}
                          onClick={() =>
                            runAction("Reload trainers and participants", async () => {
                              await loadLearningRosterLists(selectedLearningTrainingId);
                            })
                          }
                        >
                          Reload lists
                        </button>
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          disabled={actionLoading || !selectedLearningTrainingId.trim()}
                          onClick={() =>
                            runAction("List participants", async () => {
                              await loadLearningParticipantsOnly(selectedLearningTrainingId);
                            })
                          }
                        >
                          List participants
                        </button>
                      </div>
                      <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                        Participant (from API)
                        <select
                          className="input-field px-3 py-2 text-sm"
                          value={selectedLearningApiParticipantId}
                          onFocus={() => {
                            if (selectedLearningTrainingId.trim()) {
                              void loadLearningParticipantsOnly(selectedLearningTrainingId);
                            }
                          }}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSelectedLearningApiParticipantId(value);
                            setLearningAttendanceForm((p) => ({ ...p, user_id: value }));
                            setLearningScoreForm((p) => ({ ...p, user_id: value }));
                          }}
                        >
                          <option value="">Select participant</option>
                          {learningParticipantOptionsForAttendanceScores.map((emp) => (
                            <option key={`api-participant-${emp.id}`} value={emp.id}>
                              {emp.label}
                            </option>
                          ))}
                        </select>
                        {!learningParticipantOptionsForAttendanceScores.length ? (
                          <span className="text-[11px] text-wt-text-muted mt-1">
                            Click List participants to load from GET /trainings/{"{"}id{"}"}/participants.
                          </span>
                        ) : null}
                      </label>
                      <DataTable
                        title="Participants (API)"
                        columns={[
                          "id",
                          "training_id",
                          "user_id",
                          "name",
                          "email",
                          "participant_source",
                          "enrollment_status",
                        ]}
                        rows={learningRosterParticipantRows}
                        emptyLabel={
                          selectedLearningTrainingId.trim()
                            ? "No participants found for this training."
                            : "Select a training, then click List participants."
                        }
                      />
                      <div className="space-y-2 pt-2 border-t border-wt-border">
                        <p className="text-sm font-medium">Trainers</p>
                        <p className="text-[11px] text-wt-text-muted">
                          Loaded from GET /trainings/{"{"}id{"}"}/trainers for the selected training.
                        </p>
                        <DataTable
                          columns={["id", "user_id", "name", "email", "trainer_user_id"]}
                          rows={learningRosterTrainerRows}
                          emptyLabel={
                            selectedLearningTrainingId.trim()
                              ? "No trainers assigned for this training."
                              : "Select a training to load trainers."
                          }
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-3">
                      <h4 className="font-semibold">Materials, Assessments, Attendance & Scores</h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <InputField
                          label="Material Title"
                          value={learningMaterialForm.title}
                          onChange={(v) => setLearningMaterialForm((p) => ({ ...p, title: v }))}
                        />
                        <SelectField
                          label="Material Visibility"
                          value={learningMaterialForm.visibility}
                          options={["EMPLOYEE", "HR_ONLY"]}
                          onChange={(v) => setLearningMaterialForm((p) => ({ ...p, visibility: v }))}
                        />
                        <FileField label="Material PDF" accept=".pdf,application/pdf" onPick={setLearningMaterialFile} />
                      </div>
                      <button
                        type="button"
                        className="btn-primary px-3 py-2"
                        disabled={actionLoading || !selectedLearningTrainingId || !learningMaterialFile}
                        onClick={() =>
                          runAction("Upload material", async () => {
                            const materialFile = learningMaterialFile;
                            if (!materialFile) return;
                            await hrmsService.uploadTrainingMaterial(selectedLearningTrainingId, {
                              title: learningMaterialForm.title.trim(),
                              visibility: learningMaterialForm.visibility as "HR_ONLY" | "EMPLOYEE",
                              materialFile,
                            });
                            await loadLearningDetailSafe(selectedLearningTrainingId);
                          })
                        }
                      >
                        Upload Material
                      </button>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <InputField
                          label="Assessment Name"
                          value={learningAssessmentForm.name}
                          onChange={(v) => setLearningAssessmentForm((p) => ({ ...p, name: v }))}
                        />
                        <InputField
                          label="Weight Percent"
                          value={learningAssessmentForm.weight_percent}
                          onChange={(v) => setLearningAssessmentForm((p) => ({ ...p, weight_percent: v }))}
                        />
                        <InputField
                          label="Assessment Description"
                          value={learningAssessmentForm.description}
                          onChange={(v) => setLearningAssessmentForm((p) => ({ ...p, description: v }))}
                        />
                        <FileField label="Assessment PDF" accept=".pdf,application/pdf" onPick={setLearningAssessmentFile} />
                      </div>
                      <button
                        type="button"
                        className="btn-primary px-3 py-2"
                        disabled={actionLoading || !selectedLearningTrainingId || !learningAssessmentFile}
                        onClick={() =>
                          runAction("Upload assessment", async () => {
                            const assessmentFile = learningAssessmentFile;
                            if (!assessmentFile) return;
                            await hrmsService.uploadAssessment(selectedLearningTrainingId, {
                              name: learningAssessmentForm.name.trim(),
                              description: learningAssessmentForm.description.trim() || undefined,
                              weight_percent: Number(learningAssessmentForm.weight_percent || "0"),
                              assessmentFile,
                            });
                            await loadLearningDetailSafe(selectedLearningTrainingId);
                          })
                        }
                      >
                        Upload Assessment
                      </button>
                      <div className="space-y-3 border-t border-wt-border pt-3">
                        <p className="text-xs text-wt-text-muted">
                          Attendance is saved per <span className="font-medium text-wt-text">session</span>.{" "}
                          <span className="font-medium text-wt-text">Employee</span> lists for attendance and scores
                          come only from <span className="font-medium text-wt-text">training participants</span> (GET{" "}
                          <code className="text-[11px]">/trainings/{"{id}"}/participants</code>) for the selected
                          training — add people under Trainers &amp; participants, then Refresh if needed.
                        </p>
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Session (for attendance)
                          <select
                            className="input-field px-3 py-2 text-sm"
                            value={selectedLearningSessionId}
                            onChange={(e) => setSelectedLearningSessionId(e.target.value)}
                          >
                            <option value="">Select session</option>
                            {learningSessions.map((s, sidx) => {
                              const sid = String(s.id ?? "").trim();
                              const d = String(s.session_date ?? s.sessionDate ?? "").trim();
                              const st = String(s.start_time ?? s.startTime ?? "").trim();
                              const en = String(s.end_time ?? s.endTime ?? "").trim();
                              const timePart =
                                st && en ? `${st}–${en}` : st || en ? `${st}${en}` : "";
                              const label =
                                [d, timePart, sid ? `id ${sid}` : ""].filter(Boolean).join(" · ") ||
                                `Session ${sidx + 1}`;
                              return (
                                <option key={`attendance-session-${sid || sidx}`} value={sid}>
                                  {label}
                                </option>
                              );
                            })}
                          </select>
                          {selectedLearningTrainingId.trim() && !learningSessions.length ? (
                            <span className="text-[11px] text-wt-text-muted mt-1">
                              No sessions for this training yet. Add one under{" "}
                              <span className="font-medium">Sessions &amp; Trainers</span>, then pick it here.
                            </span>
                          ) : !selectedLearningTrainingId.trim() ? (
                            <span className="text-[11px] text-wt-text-muted mt-1">
                              Select a training (table or dropdowns above) to load its sessions.
                            </span>
                          ) : null}
                        </label>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                            Employee (attendance)
                            <select
                              className="input-field px-3 py-2 text-sm"
                              value={learningAttendanceForm.user_id}
                              onChange={(e) =>
                                setLearningAttendanceForm((p) => ({ ...p, user_id: e.target.value }))
                              }
                              onFocus={() => {
                                if (selectedLearningTrainingId.trim()) {
                                  void loadLearningParticipantsOnly(selectedLearningTrainingId);
                                }
                              }}
                            >
                              <option value="">Select participant</option>
                              {learningParticipantOptionsForAttendanceScores.map((emp) => (
                                <option key={`attendance-emp-${emp.id}`} value={emp.id}>
                                  {emp.label}
                                </option>
                              ))}
                            </select>
                            {selectedLearningTrainingId.trim() &&
                            !learningParticipantOptionsForAttendanceScores.length ? (
                              <span className="text-[11px] text-wt-text-muted mt-1">
                                No participants for this training. Enroll them under Trainers &amp; participants
                                (or self-enroll), then Refresh.
                              </span>
                            ) : null}
                          </label>
                          <SelectField
                            label="Attendance Status"
                            value={learningAttendanceForm.attendance_status}
                            options={["PRESENT", "ABSENT"]}
                            onChange={(v) => setLearningAttendanceForm((p) => ({ ...p, attendance_status: v }))}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          disabled={
                            actionLoading ||
                            !selectedLearningTrainingId ||
                            !selectedLearningSessionId ||
                            !learningAttendanceForm.user_id.trim()
                          }
                          onClick={() =>
                            runAction("Mark attendance", async () => {
                              const userId = await resolveLearningTrainerUserId(
                                learningAttendanceForm.user_id.trim()
                              );
                              await hrmsService.markAttendance(selectedLearningTrainingId, selectedLearningSessionId, {
                                user_id: userId,
                                attendance_status: learningAttendanceForm.attendance_status as "PRESENT" | "ABSENT",
                              });
                              await loadLearningDetailSafe(selectedLearningTrainingId, selectedLearningSessionId);
                              await loadLearningRosterLists(selectedLearningTrainingId);
                            })
                          }
                        >
                          Mark Attendance
                        </button>
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          disabled={actionLoading || !selectedLearningTrainingId || !selectedLearningSessionId}
                          onClick={() =>
                            runAction("Load attendance", async () => {
                              const res = await hrmsService.getAttendance(
                                selectedLearningTrainingId,
                                selectedLearningSessionId
                              );
                              setLearningAttendanceRows(toPagedRows(res.data ?? res));
                            })
                          }
                        >
                          Load Attendance
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Employee (scores)
                          <select
                            className="input-field px-3 py-2 text-sm"
                            value={learningScoreForm.user_id}
                            onChange={(e) => setLearningScoreForm((p) => ({ ...p, user_id: e.target.value }))}
                            onFocus={() => {
                              if (selectedLearningTrainingId.trim()) {
                                void loadLearningParticipantsOnly(selectedLearningTrainingId);
                              }
                            }}
                          >
                            <option value="">Select participant</option>
                            {learningParticipantOptionsForAttendanceScores.map((emp) => (
                              <option key={`scores-emp-${emp.id}`} value={emp.id}>
                                {emp.label}
                              </option>
                            ))}
                          </select>
                          {selectedLearningTrainingId.trim() &&
                          !learningParticipantOptionsForAttendanceScores.length ? (
                            <span className="text-[11px] text-wt-text-muted mt-1">
                              No participants for this training. Add them under Trainers &amp; participants, then
                              Refresh.
                            </span>
                          ) : null}
                        </label>
                        <InputField
                          label="Score (%)"
                          value={learningScoreForm.score_percent}
                          onChange={(v) => setLearningScoreForm((p) => ({ ...p, score_percent: v }))}
                        />
                      </div>
                      <label className="text-xs text-wt-text-muted flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={learningScoreForm.mark_completed}
                          onChange={(e) => setLearningScoreForm((p) => ({ ...p, mark_completed: e.target.checked }))}
                        />
                        Mark completed
                      </label>
                      <button
                        type="button"
                        className="btn-primary px-3 py-2"
                        disabled={
                          actionLoading ||
                          !selectedLearningTrainingId ||
                          !learningScoreForm.user_id.trim()
                        }
                        onClick={() =>
                          runAction("Submit scores", async () => {
                            const userId = await resolveLearningTrainerUserId(learningScoreForm.user_id.trim());
                            const assessId =
                              learningAssessments.length > 0
                                ? String(learningAssessments[0]?.id ?? "1").trim() || "1"
                                : "1";
                            const pct = Number(learningScoreForm.score_percent ?? "0");
                            const scoresJson: Record<string, number> = {
                              [assessId]: Number.isFinite(pct) ? pct : 0,
                            };
                            const res = await hrmsService.submitTrainingScores(selectedLearningTrainingId, {
                              user_id: userId,
                              scores_json: scoresJson,
                              mark_completed: learningScoreForm.mark_completed,
                            });
                            const scoreRow = ((res as { data?: unknown }).data ?? res) as Record<string, unknown>;
                            setLearningScores((prev) => [scoreRow, ...prev].slice(0, 20));
                            await loadLearningDetailSafe(selectedLearningTrainingId);
                            await loadLearningRosterLists(selectedLearningTrainingId);
                          })
                        }
                      >
                        Submit Scores
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className={`grid gap-4 ${hasHrAccess ? "" : "xl:grid-cols-2"}`}>
                  {!hasHrAccess ? (
                    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-3">
                      <h4 className="font-semibold">Open Trainings (Self-Enroll)</h4>
                      <p className="text-xs text-wt-text-muted">
                        Pick a training in the table above, then enroll yourself.
                      </p>
                      <DataTable
                        columns={["id", "name", "category", "type", "status", "duration_days"]}
                        rows={learningOpenTrainings}
                        emptyLabel="No open trainings."
                      />
                      <button
                        type="button"
                        className="btn-primary px-3 py-2"
                        disabled={actionLoading || !selectedLearningTrainingId}
                        onClick={() =>
                          runAction("Self-enroll training", async () => {
                            await hrmsService.selfEnrollTraining(selectedLearningTrainingId);
                            await loadLearningTrainingsSafe();
                          })
                        }
                      >
                        Enroll to Selected Training
                      </button>
                    </div>
                  ) : null}
                  <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-3">
                    <DataTable
                      title="Materials"
                      columns={["id", "training_id", "title", "material_url", "visibility"]}
                      rows={learningMaterials}
                      emptyLabel="No materials loaded."
                    />
                    <DataTable
                      title="Assessments"
                      columns={["id", "training_id", "name", "description", "file_url", "weight_percent"]}
                      rows={learningAssessments}
                      emptyLabel="No assessments loaded."
                    />
                    <DataTable
                      title="Attendance"
                      columns={["id", "training_session_id", "training_id", "user_id", "attendance_status"]}
                      rows={learningAttendanceRows}
                      emptyLabel="No attendance rows loaded."
                    />
                    <DataTable
                      title="Latest Scores"
                      columns={["id", "training_id", "user_id", "scores_json", "final_score_percent", "is_completed"]}
                      rows={learningScores}
                      emptyLabel="No scores submitted in this session."
                    />
                  </div>
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
        </div>
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
    </div>
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
