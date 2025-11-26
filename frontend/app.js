const API_BASE = "http://localhost:3001";

const app = document.getElementById("app");

// ------Poor Man's Hash Based Router------
window.addEventListener("hashchange", render);
window.addEventListener("load", render);
function goTo(route) {
  location.hash = route;
}
async function render() {
  const hash = location.hash || "#login";
  const token = getToken();

  if ((hash === "#login" || hash === "#register") && token) {
    return goTo("#tips");
  }

  if (hash === "#tips" && !token) {
    return goTo("#login");
  }

  switch (hash) {
    case "#register":
      renderRegisterPage();
      break;
    case "#tips":
      renderTipsPage();
      break;
    case "#login":
    default:
      renderLoginPage();
  }
}
// ---------------------------------------

// get token from local storage (Probably better to use a cookie but fine for now)
function getToken() {
  return localStorage.getItem("token");
}

// set token into local storage
function setAuth({ token, user }) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

// get user from local storage
function getCurrentUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

// wipe user from local storage
function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

/* ---------- LOGIN PAGE 🔑 ---------- */
function renderLoginPage() {
  app.innerHTML = `
    <h1>Login</h1>
    <nav>
      <a href="#login">Login</a>
      <a href="#register">Register</a>
    </nav>
    <div class="error" id="error"></div>
    <form id="login-form">
      <input name="username" placeholder="Username" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  `;

  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const data = {
      username: form.username.value,
      password: form.password.value,
    };

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        errorEl.textContent = json.error || "Login failed";
        return;
      }

      setAuth(json);
      goTo("#tips");
    } catch (err) {
      console.error(err);
      errorEl.textContent = "Network error";
    }
  });
}

/* ---------- REGISTER PAGE 🔑 ---------- */
function renderRegisterPage() {
  app.innerHTML = `
    <h1>Register</h1>
    <nav>
      <a href="#login">Login</a>
      <a href="#register">Register</a>
    </nav>
    <div class="error" id="error"></div>
    <form id="register-form">
      <input name="username" placeholder="Username" required />
      <input name="password" type="password" placeholder="Password" required />
      <input name="profilePicture" placeholder="Profile picture URL (optional)" />
      <button type="submit">Register</button>
    </form>
  `;

  const form = document.getElementById("register-form");
  const errorEl = document.getElementById("error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const data = {
      username: form.username.value,
      password: form.password.value,
      profilePicture: form.profilePicture.value || "",
    };

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        errorEl.textContent = json.error || "Register failed";
        return;
      }

      // After registration, send them to login
      alert("Registered! Please log in.");
      goTo("#login");
    } catch (err) {
      console.error(err);
      errorEl.textContent = "Network error";
    }
  });
}

/* ---------- TIPS PAGE 📒 ---------- */
async function renderTipsPage() {
  const user = getCurrentUser();

  app.innerHTML = `
    <h1>BCITips</h1>
    <nav>
      <span>Logged in as: ${user?.username ?? "(unknown)"} </span>
      <button id="logout">Logout</button>
    </nav>
    <div class="error" id="error"></div>
    <form id="tip-form">
      <input name="title" placeholder="New tip..." required />
      <button type="submit">Add Tip</button>
    </form>
    <div id="tips-list">Loading...</div>
  `;

  document.getElementById("logout").addEventListener("click", () => {
    clearAuth();
    goTo("#login");
  });

  const tipForm = document.getElementById("tip-form");
  tipForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = tipForm.title.value.trim();
    if (!title) return;

    await createTip(title);
    tipForm.reset();
    await loadTips();
  });

  await loadTips();
}

// ------- Network Trips -------
async function loadTips() {
  const list = document.getElementById("tips-list");
  const errorEl = document.getElementById("error");
  const token = getToken();

  errorEl.textContent = "";
  list.textContent = "Loading...";

  try {
    const res = await fetch(`${API_BASE}/tips`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json();

    if (!res.ok) {
      errorEl.textContent = json.error || "Failed to load tips";
      list.textContent = "";
      return;
    }

    const tips = json.results || [];
    const currentUserId = json.currentUserId;

    if (!tips.length) {
      list.textContent = "No tips yet. Add one above!";
      return;
    }

    list.innerHTML = "";

    tips.forEach((tip) => {
      const card = document.createElement("div");
      card.className = "card";

      const left = document.createElement("div");
      left.className = "tip-left";

      // avatar
      const avatar = document.createElement("img");
      const avatarUrl =
        tip.profilePicture && tip.profilePicture.trim()
          ? tip.profilePicture
          : "https://cdn.vectorstock.com/i/500p/58/15/male-silhouette-profile-picture-vector-35845815.jpg";

      avatar.className = "avatar";
      avatar.src = avatarUrl;
      avatar.alt = tip.username || "User";

      // text container
      const textContainer = document.createElement("div");
      textContainer.className = "tip-text";

      // title
      const title = document.createElement("div");
      title.className = "tip-title";
      title.textContent = tip.title;

      // username (smaller, under title)
      const username = document.createElement("div");
      username.className = "tip-username";
      username.textContent = `by ${tip.username || "Unknown"}`;

      textContainer.appendChild(title);
      textContainer.appendChild(username);

      left.appendChild(avatar);
      left.appendChild(textContainer);

      const actions = document.createElement("div");
      actions.className = "tip-actions";

      // only show edit/delete if this is your tip
      if (tip.userId === currentUserId) {
        const editBtn = document.createElement("button");
        editBtn.textContent = "✏️";
        editBtn.title = "Edit tip";
        editBtn.addEventListener("click", async () => {
          const newTitle = prompt("Edit your tip:", tip.title);
          if (newTitle && newTitle.trim()) {
            await updateTip(tip.id, newTitle.trim());
            await loadTips();
          }
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑️";
        deleteBtn.title = "Delete tip";
        deleteBtn.addEventListener("click", async () => {
          if (confirm("Delete this tip?")) {
            await deleteTip(tip.id);
            await loadTips();
          }
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
      }

      card.appendChild(left);
      card.appendChild(actions);
      list.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    errorEl.textContent = "Network error";
    list.textContent = "";
  }
}

async function createTip(title) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/tips`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    alert(json.error || "Failed to create tip");
  }
}

async function updateTip(id, title) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/tips`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id, title }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    alert(json.error || "Failed to update tip");
  }
}

async function deleteTip(id) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/tips`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    alert(json.error || "Failed to delete tip");
  }
}
