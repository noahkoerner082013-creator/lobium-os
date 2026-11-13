
/*
 LOBIUM OS — GLOBAL MULTIPLAYER CHAT
 Separate Neocities add-on.
 Keeps existing Lobium OS and private rooms.
*/

(function () {
  "use strict";

  const API = "https://lobium-backend.vercel.app";
  const TOKEN_KEY = "lobiumFirebaseToken";
  const REFRESH_TIME = 2500;
  const COOLDOWN = 3000;

  const originalDrawChat = window.drawChat;

  let refreshTimer = null;
  let lastSent = 0;

  function stopRefreshing() {
    if (refreshTimer !== null) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  function create(tag, className, content) {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (content !== undefined) {
      element.textContent = content;
    }

    return element;
  }

  function displayMessages(area, messages) {
    const nearBottom =
      area.scrollHeight - area.scrollTop -
      area.clientHeight < 100;

    area.textContent = "";

    messages.forEach(function (message) {
      const username = String(
        message.username || "Unknown"
      );

      const row = create("div", "lobium-message");

      const avatar = create(
        "div",
        "lobium-avatar",
        username.charAt(0).toUpperCase()
      );

      const content = create(
        "div",
        "lobium-message-content"
      );

      const name = create(
        "strong",
        "",
        username
      );

      const body = create(
        "p",
        "lobium-message-text",
        String(message.text || "")
      );

      content.appendChild(name);
      content.appendChild(body);

      row.appendChild(avatar);
      row.appendChild(content);
      area.appendChild(row);
    });

    if (nearBottom) {
      area.scrollTop = area.scrollHeight;
    }
  }

  async function loadMessages(area, status) {
    if (!area.isConnected) {
      stopRefreshing();
      return;
    }

    try {
      const response = await fetch(
        API + "/api/messages",
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(
          "HTTP " + response.status
        );
      }

      const data = await response.json();

      if (!area.isConnected) return;

      if (!Array.isArray(data.messages)) {
        throw new Error("Invalid message response");
      }

      displayMessages(area, data.messages);

      status.textContent =
        "🟢 Connected to Lobium Global Chat";

    } catch (error) {
      if (!area.isConnected) return;

      status.textContent =
        "🔴 Cannot refresh messages. Retrying...";

      console.error(
        "Lobium chat loading error:",
        error.message
      );
    }
  }

  async function sendMessage(text) {
    const token = sessionStorage.getItem(
      TOKEN_KEY
    );

    if (!token) {
      throw new Error(
        "Please log in to your Firebase account."
      );
    }

    const response = await fetch(
      API + "/api/send-message",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
          text: text
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Message could not be sent"
      );
    }

    return data;
  }

  function multiplayerChat(id, title) {
    // Keep existing local private rooms unchanged.
    if (id !== "global") {
      stopRefreshing();
      return originalDrawChat(id, title);
    }

    stopRefreshing();

    window.room = id;

    const screen = document.getElementById(
      "screen"
    );

    screen.textContent = "";

    const heading = create(
      "h2",
      "",
      "🌐 " + title
    );

    const area = create("div");
    area.id = "messages";

    const form = create("form", "row");

    const input = create("input");
    input.placeholder = "Write a message...";
    input.maxLength = 500;
    input.required = true;
    input.style.flex = "1";

    const button = create(
      "button",
      "",
      "Send"
    );
    button.type = "submit";

    const status = create(
      "p",
      "lobium-status",
      "Connecting to Global Chat..."
    );

    form.appendChild(input);
    form.appendChild(button);

    screen.appendChild(heading);
    screen.appendChild(area);
    screen.appendChild(form);
    screen.appendChild(status);

    let sending = false;

    form.onsubmit = async function (event) {
      event.preventDefault();

      if (sending) return;

      const text = input.value.trim();

      // LOBIUM OWNER COMMAND FIX
      // Handle owner commands locally, not as chat messages.
      if (/^\/give(?:crate|coin)\b/i.test(text)) {
        const currentUser = String(
          localStorage.getItem("lobiumSession") || ""
        );

        if (currentUser.toLowerCase() !== "lord-of-blocks13") {
          status.textContent = "Owner permission required.";
          return;
        }

        const match = text.match(
          /^\/give(crate|coin)\s+me\s+(\d+)$/i
        );

        if (!match) {
          status.textContent =
            "Use /givecrate me 5 or /givecoin me 50";
          return;
        }

        const action = match[1].toLowerCase();
        const amount = Number(match[2]);

        if (!Number.isSafeInteger(amount) ||
            amount < 1 || amount > 100) {
          status.textContent = "Enter an amount from 1 to 100.";
          return;
        }

        if (action === "crate") {
          if (typeof stats !== "function" ||
              typeof putStats !== "function") {
            status.textContent = "Crate inventory unavailable.";
            return;
          }

          const s = stats();
          const before = Number(s.credits) || 0;

          s.credits = before + amount;
          putStats(s);

          const after = Number(stats().credits);

          if (after !== before + amount) {
            status.textContent = "Unable to save crates.";
            return;
          }

          status.textContent =
            "✅ Added " + amount +
            " crates. Total: " + after;

          if (typeof drawCrates === "function") {
            drawCrates();
          }
        } else {
          status.textContent =
            "Coin command needs its shop-wallet connection.";
          return;
        }

        input.value = "";
        return;
      }
      // END LOBIUM OWNER COMMAND FIX

      if (!text) return;

      const remaining =
        COOLDOWN - (Date.now() - lastSent);

      if (remaining > 0) {
        status.textContent =
          "⏱️ Wait " +
          Math.ceil(remaining / 1000) +
          " seconds";
        return;
      }

      sending = true;
      button.disabled = true;
      button.textContent = "Sending...";

      try {
        await sendMessage(text);
        // LOBIUM CRATE MESSAGE PROGRESS FIX
        if (
          typeof stats === "function" &&
          typeof putStats === "function"
        ) {
          var crateProgress = stats();

          crateProgress.messages =
            (Number(crateProgress.messages) || 0) + 1;

          putStats(crateProgress);

          console.log(
            "Crate qualification:",
            crateProgress.messages + "/15"
          );
        }
        // END CRATE MESSAGE FIX


        lastSent = Date.now();
        input.value = "";

        await loadMessages(area, status);

      } catch (error) {
        status.textContent =
          "⚠️ " + error.message;

        console.error(
          "Lobium sending error:",
          error.message
        );

      } finally {
        sending = false;

        if (button.isConnected) {
          button.disabled = false;
          button.textContent = "Send";
        }
      }
    };

    loadMessages(area, status);

    refreshTimer = setInterval(function () {
      if (!area.isConnected) {
        stopRefreshing();
        return;
      }

      loadMessages(area, status);
    }, REFRESH_TIME);
  }

  if (typeof originalDrawChat !== "function") {
    console.error(
      "Lobium multiplayer: original chat not found"
    );
    return;
  }

  // Replace only the chat display function.
  // Private chat still uses the original code.
  window.drawChat = multiplayerChat;

  console.log(
    "Lobium Global Multiplayer add-on loaded!"
  );

})();
