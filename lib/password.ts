/**
 * Default password rule: first 5 letters of the name (lowercase, spaces/symbols skipped) + "@" + the digits of the employee code.
 *   "Snehal Singh" + "EMP1023"  →  "sneha@1023"
 *   "Om Prakash"   + "E5501"    →  "ompra@5501"
 * If the code has no digits, the whole code is used in lowercase ("Rahul" + "ABC" → "rahul@abc").
 */
export function defaultPassword(fullName: string, empCode: string): string {
  const letters = (fullName ?? "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 5);
  const code = (empCode ?? "").trim();
  const digits = code.replace(/\D/g, "") || code.toLowerCase().replace(/\s+/g, "");
  return letters && digits ? `${letters}@${digits}` : "";
}

/** Employee codes are stored trimmed and in capitals ("emp1023 " → "EMP1023"). */
export const normalizeEmpCode = (v: unknown) => String(v ?? "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 30);
