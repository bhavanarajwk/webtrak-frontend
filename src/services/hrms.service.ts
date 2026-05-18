import { endpoints } from "@/src/api/endpoints";
import { apiClient, type ApiEnvelope } from "@/src/api/httpClient";

export interface PagedData<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface OnboardItem {
  emp_id: string | null;
  email: string;
  name: string;
  status: string;
  user_type: string;
  department?: string | null;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type AllocationExtensionRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApiPage<T> {
  current_page: number;
  total_pages: number;
  page_size: number;
  total_elements: number;
  data: T[];
}

export interface AllocationExtensionRequestRow {
  id: number;
  employee_name: string;
  employee_email: string;
  project_code: string;
  project_name: string;
  current_end_date: string | null;
  requested_end_date: string;
  reason: string | null;
  requested_by_name: string;
  status: AllocationExtensionRequestStatus;
  created_at: string;
}

export const hrmsService = {
  getOnboardList(params: Record<string, string>) {
    return apiClient.get<ApiEnvelope<PagedData<OnboardItem>>>(endpoints.user.onboard, {
      query: params,
    });
  },

  /** GET /user?email= or empId= — contract: fetch user profile */
  getUser(params: { email?: string; empId?: string }) {
    const query: Record<string, string> = {};
    const email = params.email?.trim();
    const empId = params.empId?.trim();
    if (email) query.email = email;
    if (empId) query.empId = empId;
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.user.lookup, { query });
  },

  createOnboard(payload: Record<string, unknown>) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.user.onboard, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  completeMyOnboarding(formData: FormData) {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.user.onboard, {
      body: formData,
    });
  },

  offboardEmployee(
    empId: string,
    payload: {
      last_working_day: string;
      separation_type: "VOLUNTARY" | "INVOLUNTARY";
      resignation_date?: string;
      reason?: string;
      critical_skill?: string;
      is_regretted?: boolean;
    }
  ) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.user.offboard(empId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  getMyProfile() {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.profile.self);
  },

  updateMyProfile(fd: FormData) {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.profile.self, { body: fd });
  },

  getEmployeeProfile(empId: string) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.profile.employeeById(empId));
  },

  updateEmployeeProfile(empId: string, payload: Record<string, unknown>) {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.profile.employeeById(empId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  getAllocations(params: Record<string, string>) {
    return apiClient.get<ApiEnvelope<PagedData<unknown>>>(endpoints.allocation.root, { query: params });
  },

  getMyAllocations() {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.allocation.user);
  },

  getAllocationRoles(params: Record<string, string> = {}) {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.allocation.roles, { query: params });
  },

  /** ROLE_HR */
  getAllocationForecasting(params: { days?: number } = {}) {
    const days = Number.isFinite(params.days) ? String(params.days) : "14";
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.allocation.forecasting, {
      query: { days },
    });
  },

  createAllocation(payload: Record<string, unknown>) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.allocation.root, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  updateAllocation(allocationId: string, payload: Record<string, unknown>) {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.allocation.byId(allocationId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  deleteAllocation(allocationId: string) {
    return apiClient.delete<ApiEnvelope<unknown>>(endpoints.allocation.byId(allocationId));
  },

  getProjects(params: Record<string, string>) {
    return apiClient.get<ApiEnvelope<PagedData<unknown>>>(endpoints.project.list, { query: params });
  },

  getAllProjects(params: Record<string, string> = {}) {
    return apiClient.get<ApiEnvelope<PagedData<unknown>>>(endpoints.project.listAll, { query: params });
  },

  getAssignedProjects() {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.project.assignedToUser);
  },

  createProject(payload: Record<string, unknown>) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.project.createOne, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  /** GET /project?projectCode= — HR */
  getProjectByCode(projectCode: string) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.project.getOne, {
      query: { projectCode },
    });
  },

  /** POST /projects — body: CreateProjectRequest[] — ROLE_ADMIN per contract */
  createProjectsBulk(payload: Array<Record<string, unknown>>) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.project.createBulk, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  /** ROLE_MANAGER */
  getManagerProjects() {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.project.managerProjects);
  },

  getManagerProjectsWithRoles() {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.project.managerProjectsWithRoles);
  },

  getTimelogs(params: Record<string, string>) {
    return apiClient.get<ApiEnvelope<PagedData<unknown>>>(endpoints.timelog.root, { query: params });
  },

  getLeaveSummary(params: Record<string, string>) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.userRequest.leaveSummary, { query: params });
  },

  getNotifications(params: Record<string, string>) {
    return apiClient.get<ApiEnvelope<PagedData<NotificationItem>>>(endpoints.notifications.root, {
      query: params,
    });
  },

  markAllNotificationsRead() {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.notifications.readAll);
  },

  uploadFile(url: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return apiClient.post<ApiEnvelope<unknown>>(url, { body: fd });
  },

  getBands() {
    return apiClient.get<unknown>(endpoints.masters.bands);
  },

  getDepartments() {
    return apiClient.get<unknown>(endpoints.masters.departments);
  },

  getDesignations(params: { band_id: string; department: string }) {
    return apiClient.get<unknown>(endpoints.masters.designations, {
      query: params,
    });
  },

  getKpis(params: Record<string, string>) {
    return apiClient.get<unknown>(endpoints.masters.kpiDefinitions, { query: params });
  },

  assignRole(payload: { target_email: string; role: string }) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.roleAdmin.assignRole, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  triggerScheduler() {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.roleAdmin.schedulerRunAll);
  },

  createAllocationExtensionRequest(payload: {
    userEmail?: string;
    projectCode?: string;
    requestedEndDate?: string;
    reason?: string;
    user_email?: string;
    project_code?: string;
    requested_end_date?: string;
  }) {
    return apiClient.post<ApiEnvelope<number>>(endpoints.allocation.extensionRequest, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  /** ROLE_HR / ROLE_ADMIN */
  listAllocationExtensionRequests(params: {
    page?: number;
    size?: number;
    search?: string;
    status?: AllocationExtensionRequestStatus;
  }) {
    return apiClient.get<ApiEnvelope<ApiPage<AllocationExtensionRequestRow>>>(
      endpoints.allocation.extensionRequest,
      { query: params }
    );
  },

  /** ROLE_HR / ROLE_ADMIN */
  updateAllocationExtensionRequestStatus(payload: {
    requestId?: number;
    request_id?: number;
    status: Exclude<AllocationExtensionRequestStatus, "PENDING">;
  }) {
    return apiClient.put<ApiEnvelope<number>>(endpoints.allocation.extensionStatus, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  /** ROLE_MANAGER (also allowed for HR/Admin per backend contract) */
  listManagerAllocationExtensionStatus(params: {
    page?: number;
    size?: number;
    search?: string;
    projectCode?: string;
  }) {
    return apiClient.get<ApiEnvelope<ApiPage<AllocationExtensionRequestRow>>>(
      endpoints.allocation.managerExtensionStatus,
      { query: params }
    );
  },

  getWorkforceHeadcountDistribution(params: {
    page?: number;
    size?: number;
    search?: string;
  } = {}) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.headcountDistribution, {
      query: params,
    });
  },

  getWorkforceRoleBilling(params: {
    page?: number;
    size?: number;
    search?: string;
  } = {}) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.roleBilling, {
      query: params,
    });
  },

  getWorkforceExperienceBands(params: {
    page?: number;
    size?: number;
    search?: string;
  } = {}) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.experienceBands, {
      query: params,
    });
  },

  getUtilizationByDepartment(params: {
    page?: number;
    size?: number;
    search?: string;
    as_of?: string;
  } = {}) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.utilizationByDepartment, {
      query: params,
    });
  },

  getBenchAging(params: {
    page?: number;
    size?: number;
    search?: string;
    as_of?: string;
  } = {}) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.benchAging, {
      query: params,
    });
  },

  getAttritionOverallPercent(params: { fy_start_year: number }) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.attritionOverallPercent, {
      query: params,
    });
  },

  getAttritionVoluntaryInvoluntary(params: { fy_start_year: number }) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.attritionVoluntaryInvoluntary, {
      query: params,
    });
  },

  getAttritionRoleWise(params: { fy_start_year: number }) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.attritionRoleWise, {
      query: params,
    });
  },

  getAttritionManagerWise(params: { fy_start_year: number }) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.attritionManagerWise, {
      query: params,
    });
  },

  getAttritionCriticalSkill(params: { fy_start_year: number }) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.attritionCriticalSkill, {
      query: params,
    });
  },

  getAttritionRegretted(params: { fy_start_year: number }) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.attritionRegretted, {
      query: params,
    });
  },

  getAttritionAverageTenure(params: { fy_start_year: number }) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.attritionAverageTenure, {
      query: params,
    });
  },

  upsertAttritionRecord(
    empId: string,
    payload: {
      separation_type: "VOLUNTARY" | "INVOLUNTARY";
      reason?: string;
      critical_skill?: string;
      is_regretted?: boolean;
      last_working_day: string;
    }
  ) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.hrReports.attritionUpsert(empId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  getSkillInventory(params: {
    page?: number;
    size?: number;
    search?: string;
  } = {}) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.skillInventory, {
      query: params,
    });
  },

  getContractDistribution(params: {
    page?: number;
    size?: number;
  } = {}) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.contractDistribution, {
      query: params,
    });
  },

  getBgvDashboard(params: {
    page?: number;
    size?: number;
    search?: string;
    overall_status?: string;
    employment_status?: string;
    reference_status?: string;
  } = {}) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.bgvDashboard, {
      query: params,
    });
  },

  upsertBgvRecord(
    empId: string,
    payload: {
      consent_form_signed: boolean;
      identity: string;
      employment_status: string;
      reference_status: string;
      mail_id_verified: string;
      onboarding_form_status: string;
      overall_status: string;
      remarks?: string;
    }
  ) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.hrReports.bgvByEmployee(empId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  getBgvRecord(empId: string) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.bgvByEmployee(empId));
  },

  // Learning & Development
  createTraining(payload: Record<string, unknown>) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.trainings, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  updateTraining(trainingId: string, payload: Record<string, unknown>) {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.learning.trainingById(trainingId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  getTrainings() {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.trainings);
  },

  getTrainingById(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.learning.trainingById(trainingId));
  },

  assignTrainers(trainingId: string, trainerUserIds: number[]) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.trainers(trainingId), {
      contentType: "application/json",
      body: JSON.stringify({ trainer_user_ids: trainerUserIds }),
    });
  },

  getTrainingTrainers(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.trainers(trainingId));
  },

  removeTrainer(trainingId: string, trainerUserId: string) {
    return apiClient.delete<ApiEnvelope<unknown>>(endpoints.learning.trainerById(trainingId, trainerUserId));
  },

  createTrainingSession(trainingId: string, payload: Record<string, unknown>) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.sessions(trainingId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  getTrainingSessions(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.sessions(trainingId));
  },

  addTrainingParticipants(trainingId: string, payload: Record<string, unknown>) {
    return apiClient.post<ApiEnvelope<unknown[]>>(endpoints.learning.participants(trainingId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  getTrainingParticipants(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.participants(trainingId));
  },

  removeTrainingParticipant(trainingId: string, userId: string) {
    return apiClient.delete<ApiEnvelope<unknown>>(endpoints.learning.participantByUserId(trainingId, userId));
  },

  updateTrainingParticipantStatus(trainingId: string, userId: string, enrollmentStatus: "WITHDRAWN" | "COMPLETED") {
    return apiClient.patch<ApiEnvelope<unknown>>(endpoints.learning.participantByUserId(trainingId, userId), {
      contentType: "application/json",
      body: JSON.stringify({ enrollment_status: enrollmentStatus }),
    });
  },

  selfEnrollTraining(trainingId: string) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.enroll(trainingId));
  },

  getOpenTrainings() {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.open);
  },

  uploadTrainingMaterial(trainingId: string, payload: {
    title: string;
    visibility?: "HR_ONLY" | "EMPLOYEE";
    materialFile: File;
  }) {
    const fd = new FormData();
    fd.append("title", payload.title);
    fd.append("visibility", payload.visibility ?? "EMPLOYEE");
    fd.append("material_file", payload.materialFile);
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.materials(trainingId), { body: fd });
  },

  getTrainingMaterials(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.materials(trainingId));
  },

  markAttendance(trainingId: string, sessionId: string, payload: {
    user_id: number;
    attendance_status: "PRESENT" | "ABSENT";
  }) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.attendance(trainingId, sessionId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  getAttendance(trainingId: string, sessionId: string) {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.attendance(trainingId, sessionId));
  },

  uploadAssessment(trainingId: string, payload: {
    name: string;
    description?: string;
    weight_percent: number;
    assessmentFile: File;
  }) {
    const fd = new FormData();
    fd.append("name", payload.name);
    fd.append("description", payload.description ?? "");
    fd.append("weight_percent", String(payload.weight_percent));
    fd.append("assessment_file", payload.assessmentFile);
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.assessments(trainingId), { body: fd });
  },

  getAssessments(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.assessments(trainingId));
  },

  submitTrainingScores(trainingId: string, payload: {
    user_id: number;
    scores_json: Record<string, number>;
    mark_completed?: boolean;
  }) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.scores(trainingId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  getTrainingAnalytics(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.learning.analytics(trainingId));
  },
};
