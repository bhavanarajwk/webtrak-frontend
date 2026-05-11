const api = "/api/v1";

export const endpoints = {
  health: "/health",

  auth: {
    googleSignIn: `${api}/google-signin`,
    googleCallback: `${api}/auth/google/callback`,
    refresh: `${api}/auth/refresh`,
    logout: `${api}/auth/logout`,
    oauthBypass: (email: string) => `${api}/oauth/bypass/${encodeURIComponent(email)}`,
  },

  user: {
    onboard: `${api}/user/onboard`,
    offboard: (empId: string) => `${api}/user/offboard/${encodeURIComponent(empId)}`,
    lookup: `${api}/user`,
    batch: `${api}/user/batch`,
  },

  profile: {
    self: `${api}/profile`,
    employeeById: (empId: string) => `${api}/employee-profile/${encodeURIComponent(empId)}`,
  },

  upload: {
    leave: `${api}/upload`,
    allocation: `${api}/upload-allocation`,
    userData: `${api}/upload/user-data`,
    allocationBatch: `${api}/allocation/batch`,
  },

  allocation: {
    root: `${api}/allocation`,
    byId: (allocationId: string) => `${api}/allocation/${encodeURIComponent(allocationId)}`,
    updateLegacy: `${api}/allocation/update`,
    roles: `${api}/allocation/roles`,
    user: `${api}/allocation/user`,
    forecasting: `${api}/allocation/forecasting`,
    extensionRequest: `${api}/allocation-extension-request`,
    extensionStatus: `${api}/allocation-extension-request/status`,
    managerExtensionStatus: `${api}/manager/allocation-extension-status`,
  },

  project: {
    createOne: `${api}/project`,
    createBulk: `${api}/projects`,
    list: `${api}/projects`,
    listAll: `${api}/projects/all`,
    getOne: `${api}/project`,
    managerProjects: `${api}/manager-projects`,
    managerProjectsWithRoles: `${api}/manager-projects-with-roles`,
    assignedToUser: `${api}/project-assigned-to-user`,
  },

  timelog: {
    root: `${api}/timelog`,
    byId: (timelogId: string) => `${api}/timelog/${encodeURIComponent(timelogId)}`,
    legacyGetByDate: (empEmail: string, logDate: string) =>
      `${api}/timelog/get/${encodeURIComponent(empEmail)}/${encodeURIComponent(logDate)}`,
    legacyEntry: `${api}/timelog/entry`,
    status: `${api}/timelog/status`,
    statusBatch: `${api}/timelog/status/batch`,
    export: `${api}/export/timelogs`,
  },

  userRequest: {
    root: `${api}/userRequest`,
    getRange: (fromDate: string, toDate: string, requestType: string) =>
      `${api}/userRequest/get/${encodeURIComponent(fromDate)}/${encodeURIComponent(toDate)}/${encodeURIComponent(requestType)}`,
    getByEmployees: (empEmails: string, fromDate: string, toDate: string, requestType: string) =>
      `${api}/userRequest/get/${encodeURIComponent(empEmails)}/${encodeURIComponent(fromDate)}/${encodeURIComponent(toDate)}/${encodeURIComponent(requestType)}`,
    status: `${api}/userRequest/status`,
    leaveSummary: `${api}/leave-summary`,
  },

  learning: {
    trainings: `${api}/trainings`,
    trainingById: (trainingId: string | number) => `${api}/trainings/${encodeURIComponent(String(trainingId))}`,
    trainers: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/trainers`,
    trainerById: (trainingId: string | number, trainerUserId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/trainers/${encodeURIComponent(String(trainerUserId))}`,
    sessions: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/sessions`,
    participants: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/participants`,
    participantByUserId: (trainingId: string | number, userId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/participants/${encodeURIComponent(String(userId))}`,
    enroll: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/enroll`,
    open: `${api}/trainings/open`,
    materials: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/materials`,
    attendance: (trainingId: string | number, sessionId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/sessions/${encodeURIComponent(String(sessionId))}/attendance`,
    assessments: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/assessments`,
    scores: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/scores`,
    analytics: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/analytics`,
  },

  notifications: {
    root: `${api}/notifications`,
    readById: (notificationId: string) =>
      `${api}/notifications/${encodeURIComponent(notificationId)}/read`,
    readAll: `${api}/notifications/read-all`,
    announcement: `${api}/notifications/announcement`,
    deleteRead: `${api}/notifications/delete`,
    subscribe: `${api}/notifications/subscribe`,
  },

  masters: {
    bands: `${api}/masters/bands`,
    departments: `${api}/masters/departments`,
    designations: `${api}/masters/designations`,
    kpiDefinitions: `${api}/masters/kpi-definitions`,
    kpiDefinitionById: (kpiId: string) =>
      `${api}/masters/kpi-definitions/${encodeURIComponent(kpiId)}`,
    webknotValues: `${api}/masters/webknot-values`,
    webknotValueById: (rowId: string) =>
      `${api}/masters/webknot-values/${encodeURIComponent(rowId)}`,
    submissionCycles: `${api}/masters/submission-cycles`,
    submissionCycleByKey: `${api}/masters/submission-cycles/by-key`,
    submissionCycleById: (cycleId: string) =>
      `${api}/masters/submission-cycles/${encodeURIComponent(cycleId)}`,
  },

  roleAdmin: {
    assignRole: `${api}/roles/assign`,
    assignRoleLegacy: `${api}/assign-role`,
    schedulerRunAll: `${api}/scheduler/run-all`,
  },

  hrReports: {
    headcountDistribution: `${api}/reports/workforce/headcount-distribution`,
    roleBilling: `${api}/reports/workforce/role-wise-billed`,
    experienceBands: `${api}/reports/workforce/experience`,
    utilizationByDepartment: `${api}/reports/utilization/utilization-by-department`,
    benchAging: `${api}/reports/utilization/bench-aging`,
    attritionOverallPercent: `${api}/reports/attrition/overall-percent`,
    attritionVoluntaryInvoluntary: `${api}/reports/attrition/voluntary-involuntary`,
    attritionRoleWise: `${api}/reports/attrition/role-wise`,
    attritionManagerWise: `${api}/reports/attrition/manager-wise`,
    attritionCriticalSkill: `${api}/reports/attrition/critical-skill`,
    attritionRegretted: `${api}/reports/attrition/regretted`,
    attritionAverageTenure: `${api}/reports/attrition/average-tenure`,
    attritionUpsert: (empId: string) => `${api}/reports/attrition/${encodeURIComponent(empId)}`,
    skillInventory: `${api}/reports/skill-capacity/skill-inventory`,
    contractDistribution: `${api}/reports/compliance/contract-distribution`,
    bgvDashboard: `${api}/reports/bgv`,
    bgvByEmployee: (empId: string) => `${api}/reports/bgv/${encodeURIComponent(empId)}`,
  },
} as const;

export type EndpointRegistry = typeof endpoints;
