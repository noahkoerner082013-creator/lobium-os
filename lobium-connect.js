
/* LOBIUM OS — BACKEND CONNECTION */

const LOBIUM_BACKEND =
  "https://lobium-backend.vercel.app";

window.LobiumAPI = {
  backend: LOBIUM_BACKEND,

  async testConnection() {
    try {
      const response = await fetch(
        LOBIUM_BACKEND + "/api/index"
      );

      if (!response.ok) {
        throw new Error(
          "Backend error: " + response.status
        );
      }

      const data = await response.json();

      if (data.status === "Firebase connected") {
        console.log("Lobium backend connected!");
        return true;
      }

      console.warn("Backend returned:", data);
      return false;

    } catch (error) {
      console.error(
        "Lobium connection error:",
        error
      );
      return false;
    }
  }
};

window.addEventListener(
  "DOMContentLoaded",
  async () => {
    await window.LobiumAPI.testConnection();
  }
);
