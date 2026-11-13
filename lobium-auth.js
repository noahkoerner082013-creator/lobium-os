
/*
 LOBIUM OS — FIREBASE LOGIN ADD-ON
 Keeps the existing website and design.
*/

(function () {
  "use strict";

  const API = "https://lobium-backend.vercel.app";
  const TOKEN_KEY = "lobiumFirebaseToken";

  let authenticated = false;
  let busy = false;

  const oldLogout = window.logout;

  function authError(message) {
    const element = document.getElementById("authError");
    if (element) element.textContent = message;
  }

  function showLogin() {
    document.getElementById("home").style.display = "none";
    document.getElementById("app").style.display = "none";
    document.getElementById("auth").style.display = "block";
  }

  function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("lobiumSession");
    authenticated = false;
    user = "";
  }

  function openAuthenticatedApp(username) {
    user = username;
    authenticated = true;

    // Compatibility with existing Lobium functions.
    localStorage.setItem("lobiumSession", username);

    document.getElementById("password").value = "";
    start();
  }

  // Replace the old browser-only login.
  window.enter = async function () {
    if (busy) return;

    const username = document
      .getElementById("username").value.trim();

    const password = document
      .getElementById("password").value;

    const action = mode === "signup"
      ? "register"
      : "login";

    authError("");

    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      authError("Username must be 3-20 characters.");
      return;
    }

    if (password.length < 8) {
      authError("Password must be at least 8 characters.");
      return;
    }

    busy = true;
    authError("Connecting to Lobium...");

    try {
      const response = await fetch(API + "/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          username,
          password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.token) {
        authError(data.error || "Login failed.");
        return;
      }

      sessionStorage.setItem(TOKEN_KEY, data.token);

      openAuthenticatedApp(data.username);

      console.log("Lobium Firebase login successful");

    } catch (error) {
      console.error("Lobium login failed:", error);
      authError("Cannot reach the account server.");
    } finally {
      busy = false;
    }
  };

  // Protect normal navigation from old local sessions.
  window.openDM = function () {
    if (authenticated) {
      document.getElementById("home").style.display =
        "none";
      start();
    } else {
      showLogin();
    }
  };

  // Log out on both the browser and backend.
  window.logout = async function () {
    const token = sessionStorage.getItem(TOKEN_KEY);

    clearSession();

    if (typeof oldLogout === "function") {
      oldLogout();
    } else {
      showLogin();
    }

    if (token) {
      try {
        await fetch(API + "/api/session", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + token
          }
        });
      } catch (error) {
        console.warn("Server logout request failed.");
      }
    }
  };

  // Verify saved sessions when the page reloads.
  async function restoreSession() {
    const token = sessionStorage.getItem(TOKEN_KEY);

    user = "";

    if (!token) {
      clearSession();
      return;
    }

    try {
      const response = await fetch(API + "/api/session", {
        headers: {
          "Authorization": "Bearer " + token
        }
      });

      if (!response.ok) {
        clearSession();
        return;
      }

      const data = await response.json();

      if (data.authenticated && data.username) {
        user = data.username;
        authenticated = true;
        localStorage.setItem(
          "lobiumSession",
          data.username
        );
        console.log("Lobium session verified");
      } else {
        clearSession();
      }

    } catch (error) {
      // Do not erase a session just because
      // the connection is temporarily unavailable.
      console.warn("Session check unavailable.");
    }
  }

  restoreSession();

  console.log("Lobium Firebase Auth add-on loaded");
})();
