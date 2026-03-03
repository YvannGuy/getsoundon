export const DEPT_LABELS: Record<string, string> = {
  "75": "Paris",
  "77": "Seine-et-Marne",
  "78": "Yvelines",
  "91": "Essonne",
  "92": "Hauts-de-Seine",
  "93": "Seine-Saint-Denis",
  "94": "Val-de-Marne",
  "95": "Val-d'Oise",
};

export const DEPT_COVER_LOCAL_PATHS: Record<string, string> = {
  "75": "/images/departments/75.png",
  "77": "/images/departments/77.jpg",
  "78": "/images/departments/78.png",
  "91": "/images/departments/91.png",
  "92": "/images/departments/92.png",
  "93": "/images/departments/93.png",
  "94": "/images/departments/94.png",
  "95": "/images/departments/95.png",
  default: "/images/departments/default.png",
};

export function getDepartmentCoverUrl(dept: string): string {
  const normalized = String(dept || "").trim();
  const localPath = DEPT_COVER_LOCAL_PATHS[normalized] ?? DEPT_COVER_LOCAL_PATHS.default;
  return localPath;
}

