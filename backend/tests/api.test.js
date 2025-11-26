import test, { after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFile } from "node:fs/promises";

import handler from "../src/handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, "../database/data.json");

async function resetDb() {
  const initial = {
    users: [],
    tips: [],
  };
  await writeFile(DB_PATH, JSON.stringify(initial, null, 2), "utf-8");
}

// ---- Start the server once, before tests ----
const server = http.createServer(handler);

await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();
const baseUrl = `http://localhost:${port}`;

after(() => {
  return new Promise((resolve) => server.close(resolve));
});

// ---- Simple HTTP helper ----
async function request(method, path, body = undefined, token = undefined) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { status: res.status, body: json };
}

/* ------------------- 🔑 AUTH TESTS ------------------- */

test("auth: register a new user", async () => {
  await resetDb();

  const res = await request("POST", "/auth/register", {
    username: "alice",
    password: "password123",
  });

  assert.equal(res.status, 201);
  assert.ok(res.body.user);
  assert.ok(res.body.user.id);
  assert.equal(res.body.user.username, "alice");
});

test("auth: login returns token", async () => {
  await resetDb();

  // register first
  await request("POST", "/auth/register", {
    username: "bob",
    password: "secret",
  });

  const res = await request("POST", "/auth/login", {
    username: "bob",
    password: "secret",
  });

  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.ok(res.body.user);
  assert.equal(res.body.user.username, "bob");
});

test("auth: cannot register with an existing username", async () => {
  await resetDb();

  const body = { username: "duplicate", password: "one" };

  const first = await request("POST", "/auth/register", body);
  assert.equal(first.status, 201);

  const second = await request("POST", "/auth/register", body);
  assert.equal(second.status, 400);
  assert.ok(second.body.error);
});

test("auth: login fails with invalid credentials", async () => {
  await resetDb();

  await request("POST", "/auth/register", {
    username: "charlie",
    password: "right-password",
  });

  const res = await request("POST", "/auth/login", {
    username: "charlie",
    password: "wrong-password",
  });

  assert.equal(res.status, 401);
  assert.ok(res.body.error);
});

/* ------------------- ✅ TIP TESTS ------------------- */

test("tips: create and list tips for logged-in user", async () => {
  await resetDb();

  // 1. register + login
  await request("POST", "/auth/register", {
    username: "dev1",
    password: "pass",
  });

  const loginRes = await request("POST", "/auth/login", {
    username: "dev1",
    password: "pass",
  });

  assert.equal(loginRes.status, 200);
  const token = loginRes.body.token;
  assert.ok(token);

  // 2. create a tip
  const createRes = await request(
    "POST",
    "/tips",
    { title: "Use const where possible" },
    token
  );

  assert.equal(createRes.status, 201);
  assert.ok(createRes.body.id);

  // 3. list tips
  const listRes = await request("GET", "/tips", undefined, token);

  assert.equal(listRes.status, 200);
  assert.ok(Array.isArray(listRes.body.results));
  assert.equal(listRes.body.results.length, 1);

  const [tip] = listRes.body.results;
  assert.equal(tip.title, "Use const where possible");
  assert.equal(tip.userId, listRes.body.currentUserId);
});

test("tips: GET /tips without token returns 401", async () => {
  await resetDb();

  const res = await request("GET", "/tips");
  assert.equal(res.status, 401);
  assert.ok(res.body.error);
});

test("tips: user cannot delete someone else's tip", async () => {
  await resetDb();

  // user1
  await request("POST", "/auth/register", {
    username: "user1",
    password: "pass1",
  });
  const login1 = await request("POST", "/auth/login", {
    username: "user1",
    password: "pass1",
  });
  const token1 = login1.body.token;

  // user2
  await request("POST", "/auth/register", {
    username: "user2",
    password: "pass2",
  });
  const login2 = await request("POST", "/auth/login", {
    username: "user2",
    password: "pass2",
  });
  const token2 = login2.body.token;

  // user1 creates a tip
  const createRes = await request(
    "POST",
    "/tips",
    { title: "Only I should delete this" },
    token1
  );
  assert.equal(createRes.status, 201);
  const tipId = createRes.body.id;

  // user2 tries to delete user1's tip
  const deleteRes = await request("DELETE", "/tips", { id: tipId }, token2);

  // our API returns 404 if tip not found or not yours
  assert.equal(deleteRes.status, 404);
  assert.ok(deleteRes.body.error);

  // ensure tip still exists when user1 lists tips
  const listRes = await request("GET", "/tips", undefined, token1);
  assert.equal(listRes.status, 200);
  const found = listRes.body.results.find((t) => t.id === tipId);
  assert.ok(found);
});

test("tips: user can update their own tip", async () => {
  await resetDb();

  await request("POST", "/auth/register", {
    username: "editor",
    password: "pass",
  });

  const login = await request("POST", "/auth/login", {
    username: "editor",
    password: "pass",
  });
  const token = login.body.token;

  const createRes = await request(
    "POST",
    "/tips",
    { title: "Old title" },
    token
  );
  assert.equal(createRes.status, 201);
  const tipId = createRes.body.id;

  const updateRes = await request(
    "PUT",
    "/tips",
    { id: tipId, title: "New updated title" },
    token
  );

  assert.equal(updateRes.status, 200);
  assert.ok(updateRes.body.success);

  const listRes = await request("GET", "/tips", undefined, token);
  const updated = listRes.body.results.find((t) => t.id === tipId);
  assert.ok(updated);
  assert.equal(updated.title, "New updated title");
});

test("tips: user cannot update someone else's tip", async () => {
  await resetDb();

  // owner
  await request("POST", "/auth/register", {
    username: "owner",
    password: "pass1",
  });
  const ownerLogin = await request("POST", "/auth/login", {
    username: "owner",
    password: "pass1",
  });
  const ownerToken = ownerLogin.body.token;

  // other user
  await request("POST", "/auth/register", {
    username: "intruder",
    password: "pass2",
  });
  const intruderLogin = await request("POST", "/auth/login", {
    username: "intruder",
    password: "pass2",
  });
  const intruderToken = intruderLogin.body.token;

  // owner creates tip
  const createRes = await request(
    "POST",
    "/tips",
    { title: "Owner tip" },
    ownerToken
  );
  const tipId = createRes.body.id;

  // intruder tries to update it
  const updateRes = await request(
    "PUT",
    "/tips",
    { id: tipId, title: "Hacked title" },
    intruderToken
  );

  assert.equal(updateRes.status, 404);
  assert.ok(updateRes.body.error);

  // confirm still original title
  const listRes = await request("GET", "/tips", undefined, ownerToken);
  const tip = listRes.body.results.find((t) => t.id === tipId);
  assert.ok(tip);
  assert.equal(tip.title, "Owner tip");
});

test("tips: GET /tips returns username and profilePicture", async () => {
  await resetDb();

  await request("POST", "/auth/register", {
    username: "avatarUser",
    password: "pass",
    profilePicture: "https://example.com/avatar.png",
  });

  const login = await request("POST", "/auth/login", {
    username: "avatarUser",
    password: "pass",
  });
  const token = login.body.token;

  const createRes = await request(
    "POST",
    "/tips",
    { title: "Tip with avatar" },
    token
  );
  assert.equal(createRes.status, 201);

  const listRes = await request("GET", "/tips", undefined, token);
  assert.equal(listRes.status, 200);
  const [tip] = listRes.body.results;

  assert.equal(tip.title, "Tip with avatar");
  assert.equal(tip.username, "avatarUser");
  assert.equal(tip.profilePicture, "https://example.com/avatar.png");
});
