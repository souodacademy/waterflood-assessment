import type { Role } from "./waterflood";

const demoAccounts: Record<string, { password: string; role: Role }> = {
  "operator@waterflood.demo": {
    password: "WaterfloodOperator-2026!",
    role: "operator",
  },
  "engineer@waterflood.demo": {
    password: "WaterfloodEngineer-2026!",
    role: "engineer",
  },
  "admin@waterflood.demo": {
    password: "WaterfloodAdmin-2026!",
    role: "admin",
  },
};

const storageKey = "waterflood-demo-role";

export function getDemoRole(): Role | null {
  if (typeof window === "undefined") return null;
  const role = window.localStorage.getItem(storageKey);
  return role === "operator" || role === "engineer" || role === "admin" ? role : null;
}

export function signInDemo(email: string, password: string): Role | null {
  const account = demoAccounts[email.trim().toLowerCase()];
  if (!account || account.password !== password) return null;
  window.localStorage.setItem(storageKey, account.role);
  return account.role;
}

export function signOutDemo() {
  if (typeof window !== "undefined") window.localStorage.removeItem(storageKey);
}
