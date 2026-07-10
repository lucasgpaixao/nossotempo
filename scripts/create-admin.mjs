import fs from "fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password>");
  process.exit(1);
}

async function main() {
  const createRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
    }),
  });
  const createBody = await createRes.json();
  console.log("create_status", createRes.status);

  let userId = createBody.id;
  if (!userId) {
    console.log("create_body", JSON.stringify(createBody));
    const listRes = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=50`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const listBody = await listRes.json();
    const found = (listBody.users || []).find((u) => u.email === email);
    if (!found) {
      console.error("USER_NOT_FOUND_AND_CREATE_FAILED");
      process.exit(1);
    }
    userId = found.id;
    console.log("existing_user", userId);
    const upd = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password, email_confirm: true }),
    });
    console.log("update_status", upd.status);
  } else {
    console.log("created_user", userId);
  }

  const ins = await fetch(`${url}/rest/v1/admin_users`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({ user_id: userId }),
  });
  console.log("admin_users_status", ins.status);
  console.log("admin_users_body", await ins.text());

  const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await login.json();
  console.log("login_status", login.status);
  console.log("login_ok", Boolean(loginBody.access_token));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
