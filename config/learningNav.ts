export const LEARNING_BASE = "/dashboard/learning-development" as const;

export const learningSubNav = [
  { href: `${LEARNING_BASE}`, label: "Dashboard", segment: "" },
  { href: `${LEARNING_BASE}/trainings`, label: "Trainings", segment: "trainings" },
  { href: `${LEARNING_BASE}/sessions`, label: "Sessions", segment: "sessions" },
  { href: `${LEARNING_BASE}/trainers`, label: "Trainers", segment: "trainers" },
  { href: `${LEARNING_BASE}/participants`, label: "Trainees", segment: "participants" },
  { href: `${LEARNING_BASE}/materials`, label: "Materials", segment: "materials" },
  { href: `${LEARNING_BASE}/assessments`, label: "Assessments", segment: "assessments" },
  { href: `${LEARNING_BASE}/attendance`, label: "Attendance", segment: "attendance" },
  { href: `${LEARNING_BASE}/scores`, label: "Scores & Completion", segment: "scores" },
  { href: `${LEARNING_BASE}/analytics`, label: "Analytics", segment: "analytics" },
] as const;
