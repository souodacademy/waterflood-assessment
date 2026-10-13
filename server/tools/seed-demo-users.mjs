#!/usr/bin/env node

const fs = await import("node:fs/promises");

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running the seed.");
  process.exit(1);
}

const accounts = [
  { role: "operator", email: process.env.DEMO_OPERATOR_EMAIL ?? "operator@waterflood.demo" },
  { role: "engineer", email: process.env.DEMO_ENGINEER_EMAIL ?? "engineer@waterflood.demo" },
  { role: "admin", email: process.env.DEMO_ADMIN_EMAIL ?? "admin@waterflood.demo" },
];

const passwords = {
  operator: process.env.DEMO_OPERATOR_PASSWORD ?? "WaterfloodOperator-2026!",
  engineer: process.env.DEMO_ENGINEER_PASSWORD ?? "WaterfloodEngineer-2026!",
  admin: process.env.DEMO_ADMIN_PASSWORD ?? "WaterfloodAdmin-2026!",
};
const request = async (path, init = {}) => {
  const response = await fetch(`${url.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${path}: ${body}`);
  return body ? JSON.parse(body) : undefined;
};

const credentials = [];
const existingUsers = await request("/auth/v1/admin/users?page=1&per_page=1000");
for (const account of accounts) {
  const accountPassword = passwords[account.role];
  const existingUser = existingUsers.users?.find(
    (candidate) => candidate.email?.toLowerCase() === account.email.toLowerCase(),
  );
  const user = existingUser
    ? await request(`/auth/v1/admin/users/${existingUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          password: accountPassword,
          email_confirm: true,
          user_metadata: { demo_role: account.role },
        }),
      })
    : await request("/auth/v1/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: account.email,
          password: accountPassword,
          email_confirm: true,
          user_metadata: { demo_role: account.role },
        }),
      });
  await request("/rest/v1/user_roles?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: user.id, role: account.role }),
  });
  credentials.push({ role: account.role, email: account.email, password: accountPassword });
}

const output = ["# Local demo credentials", "", "| Role | Username | Password |", "| --- | --- | --- |", ...credentials.map((item) => `| ${item.role} | ${item.email} | ${item.password} |`), ""].join("\n");
await fs.writeFile(".demo-credentials.local.md", `${output}\n`, { mode: 0o600 });
console.log(output);
console.log("Saved to .demo-credentials.local.md (ignored; do not commit).");
