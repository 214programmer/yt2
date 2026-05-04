// Admins can edit this list directly. Keep codes server-side; do not expose them in the UI.
export const ACCESS_CODES = [
  "DEMO-2026",
  "CLIENT-ACCESS",
  "YOUTUBE-PRODUCER",
  "Alexey_Shestakov",
];

export function isValidAccessCode(code) {
  const normalized = String(code || "").trim();
  return ACCESS_CODES.includes(normalized);
}
