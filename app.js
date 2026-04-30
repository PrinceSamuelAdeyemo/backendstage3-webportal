const els = {
  apiBase: document.querySelector("#api-base"),
  status: document.querySelector("#status-pill"),
  message: document.querySelector("#message"),
  passwordTab: document.querySelector("#password-tab"),
  githubTab: document.querySelector("#github-tab"),
  passwordForm: document.querySelector("#password-form"),
  githubForm: document.querySelector("#github-form"),
  githubLogin: document.querySelector("#github-login"),
  username: document.querySelector("#username"),
  password: document.querySelector("#password"),
  currentUser: document.querySelector("#current-user"),
  currentRole: document.querySelector("#current-role"),
  profileCount: document.querySelector("#profile-count"),
  profilesBody: document.querySelector("#profiles-body"),
  searchQuery: document.querySelector("#search-query"),
  genderFilter: document.querySelector("#gender-filter"),
  loadProfiles: document.querySelector("#load-profiles"),
  refreshSession: document.querySelector("#refresh-session"),
  logout: document.querySelector("#logout"),
};

const LOCAL_API_BASE = "http://localhost:8000/api/v1";
const LIVE_API_BASE = "https://hng14stage3-backend.vercel.app/api/v1";
const LIVE_WEB_PORTAL_URL = "https://backendstage3-webportal.vercel.app/";

function defaultApiBase() {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname) ? LOCAL_API_BASE : LIVE_API_BASE;
}

function webRedirectUri() {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? `${window.location.origin}${window.location.pathname}`
    : LIVE_WEB_PORTAL_URL;
}

const storage = {
  get apiBase() {
    return localStorage.getItem("stage3_api_base") || defaultApiBase();
  },
  set apiBase(value) {
    localStorage.setItem("stage3_api_base", cleanApiBase(value));
  },
  get accessToken() {
    return localStorage.getItem("stage3_access_token");
  },
  set accessToken(value) {
    value ? localStorage.setItem("stage3_access_token", value) : localStorage.removeItem("stage3_access_token");
  },
  get refreshToken() {
    return localStorage.getItem("stage3_refresh_token");
  },
  set refreshToken(value) {
    value ? localStorage.setItem("stage3_refresh_token", value) : localStorage.removeItem("stage3_refresh_token");
  },
};

function cleanApiBase(value) {
  return value.trim().replace(/\/+$/, "");
}

function setMessage(text, isError = false) {
  els.message.textContent = text;
  els.message.classList.toggle("error", isError);
}

function endpoint(path) {
  return `${cleanApiBase(els.apiBase.value)}${path}`;
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (storage.accessToken) {
    headers.set("Authorization", `Bearer ${storage.accessToken}`);
  }
  const response = await fetch(endpoint(path), { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof data === "object" ? data.message || "Request failed" : data;
    throw new Error(message);
  }
  return data;
}

function saveTokens(data) {
  storage.accessToken = data.access_token;
  storage.refreshToken = data.refresh_token;
}

function setSignedIn(user = null) {
  const signedIn = Boolean(storage.accessToken);
  els.status.textContent = signedIn ? "Signed in" : "Signed out";
  els.status.classList.toggle("signed-in", signedIn);
  if (user) {
    els.currentUser.textContent = user.github_login || user.username || "-";
    els.currentRole.textContent = user.role || "-";
  } else if (!signedIn) {
    els.currentUser.textContent = "-";
    els.currentRole.textContent = "-";
    els.profileCount.textContent = "0";
  }
}

function switchTab(tab) {
  const github = tab === "github";
  els.githubTab.classList.toggle("active", github);
  els.passwordTab.classList.toggle("active", !github);
  els.githubForm.classList.toggle("hidden", !github);
  els.passwordForm.classList.toggle("hidden", github);
}

async function loadMe() {
  const data = await apiFetch("/me");
  setSignedIn(data.user);
}

async function loadProfiles() {
  const query = els.searchQuery.value.trim();
  const params = new URLSearchParams({ page: "1", limit: "20" });
  if (els.genderFilter.value) {
    params.set("gender", els.genderFilter.value);
  }
  const path = query ? `/profiles/search?q=${encodeURIComponent(query)}&${params}` : `/profiles?${params}`;
  const data = await apiFetch(path);
  renderProfiles(data.data || []);
  els.profileCount.textContent = String(data.pagination?.total || data.total || data.data?.length || 0);
}

function renderProfiles(profiles) {
  if (!profiles.length) {
    els.profilesBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No profiles found.</td></tr>`;
    return;
  }
  els.profilesBody.innerHTML = profiles.map((profile) => `
    <tr>
      <td>${escapeHtml(profile.name)}</td>
      <td>${escapeHtml(profile.gender)}</td>
      <td>${profile.age}</td>
      <td>${escapeHtml(profile.age_group)}</td>
      <td>${escapeHtml(profile.country_name)} (${escapeHtml(profile.country_id)})</td>
    </tr>
  `).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

async function handlePasswordLogin(event) {
  event.preventDefault();
  storage.apiBase = els.apiBase.value;
  setMessage("Signing in...");
  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: els.username.value,
        password: els.password.value,
      }),
    });
    saveTokens(data);
    await loadMe();
    await loadProfiles();
    setMessage("Signed in successfully.");
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function startGithubLogin() {
  storage.apiBase = els.apiBase.value;
  setMessage("Opening GitHub...");
  try {
    const redirectUri = webRedirectUri();
    const data = await apiFetch(`/auth/github/?client=web&redirect_uri=${encodeURIComponent(redirectUri)}`);
    sessionStorage.setItem("stage3_code_verifier", data.code_verifier);
    window.location.href = data.authorize_url;
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function finishGithubLogin() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) {
    return;
  }
  setMessage("Finishing GitHub sign in...");
  try {
    const verifier = sessionStorage.getItem("stage3_code_verifier") || "";
    const data = await apiFetch(`/auth/github/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&code_verifier=${encodeURIComponent(verifier)}`);
    saveTokens(data);
    window.history.replaceState({}, document.title, window.location.pathname);
    await loadMe();
    await loadProfiles();
    setMessage("Signed in with GitHub.");
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function refreshSession() {
  if (!storage.refreshToken) {
    setMessage("No refresh token saved.", true);
    return;
  }
  setMessage("Refreshing session...");
  try {
    const data = await apiFetch("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: storage.refreshToken }),
    });
    saveTokens(data);
    await loadMe();
    setMessage("Session refreshed.");
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function logout() {
  try {
    if (storage.refreshToken) {
      await apiFetch("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: storage.refreshToken }),
      });
    }
  } catch {
    // Local logout should still clear saved credentials if the server token is already invalid.
  }
  storage.accessToken = "";
  storage.refreshToken = "";
  setSignedIn();
  renderProfiles([]);
  setMessage("Signed out.");
}

els.apiBase.value = storage.apiBase;
els.apiBase.addEventListener("change", () => {
  storage.apiBase = els.apiBase.value;
});
els.passwordTab.addEventListener("click", () => switchTab("password"));
els.githubTab.addEventListener("click", () => switchTab("github"));
els.passwordForm.addEventListener("submit", handlePasswordLogin);
els.githubLogin.addEventListener("click", startGithubLogin);
els.loadProfiles.addEventListener("click", async () => {
  try {
    await loadProfiles();
    setMessage("Profiles loaded.");
  } catch (error) {
    setMessage(error.message, true);
  }
});
els.refreshSession.addEventListener("click", refreshSession);
els.logout.addEventListener("click", logout);

setSignedIn();
finishGithubLogin().then(async () => {
  if (storage.accessToken && !new URLSearchParams(window.location.search).get("code")) {
    try {
      await loadMe();
      await loadProfiles();
    } catch (error) {
      setMessage(error.message, true);
    }
  }
});
