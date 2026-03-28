/**
 * NEXUS INTERCEPTOR - Scroll Watcher
 * Detects patterns of excessive scrolling and enforces focus breaks.
 */

console.log("Nexus Interceptor: Monitoring uplink on", window.location.href);

(function () {
  let sessionStart = null;
  let lastActive = null;
  let cooldownTimer = null;

  function deployInterceptUI() {
    // Check if UI already exists to prevent duplicates
    if (document.getElementById("nexus-intercept-ui")) return;

    const shield = document.createElement("div");
    shield.id = "nexus-intercept-ui";

    shield.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(15, 23, 42, 0.98);
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: 'Inter', sans-serif;
      z-index: 2147483647;
      backdrop-filter: blur(8px);
    `;

    shield.innerHTML = `
      <div style="text-align: center; padding: 40px; border: 1px solid #22d3ee; border-radius: 20px; background: #1e293b; box-shadow: 0 0 30px rgba(34, 211, 238, 0.2);">
        <h1 style="font-size: 2.5rem; color: #22d3ee; margin-bottom: 10px;">Pattern Breach Detected</h1>
        <p style="color: #94a3b8; font-size: 1.1rem;">You've exceeded the safe scrolling threshold. Initiate reset.</p>
        <button id="nexusDismiss" style="margin-top:30px; padding:12px 30px; border:none; border-radius:8px; background:#22d3ee; color:#0f172a; font-weight:800; cursor:pointer; text-transform:uppercase; letter-spacing:1px;">Acknowledge & Reset</button>
      </div>
    `;

    const injectToDOM = () => {
      document.body.appendChild(shield);
      const btn = document.getElementById("nexusDismiss");
      if (btn) {
        btn.addEventListener("click", () => {
          shield.style.opacity = "0";
          setTimeout(() => shield.remove(), 300);
        });
      }
    };

    if (document.body) injectToDOM();
    else window.addEventListener("load", injectToDOM);
  }

  function verifyTarget(url, settings) {
    return settings.applyToAll || settings.sites.some(site => url.includes(site));
  }

  function logSessionData(duration) {
    const siteHost = new URL(window.location.href).hostname;
    const dateKey = new Date().toISOString().split("T")[0];

    chrome.storage.local.get(["scrollHistory"], (res) => {
      const logs = res.scrollHistory || {};
      if (!logs[dateKey]) logs[dateKey] = {};
      logs[dateKey][siteHost] = (logs[dateKey][siteHost] || 0) + duration;
      chrome.storage.local.set({ scrollHistory: logs });
    });
  }

  function initNexusWatchers(onTrigger) {
    const tracked = new WeakSet();
    const bindScroll = (node) => {
      if (!tracked.has(node)) {
        try {
          node.addEventListener("scroll", onTrigger, { passive: true });
          tracked.add(node);
        } catch (e) {}
      }
    };

    bindScroll(window);
    bindScroll(document);
    document.querySelectorAll("*").forEach(bindScroll);

    // Watch for dynamic content loading
    setInterval(() => {
      document.querySelectorAll("*").forEach(bindScroll);
    }, 4000);
  }

  chrome.storage.local.get({
    scrollDurationLimit: 15,
    scrollInactivityTimeout: 2,
    sites: [],
    applyToAll: true
  }, (config) => {
    if (!verifyTarget(window.location.href, config)) return;

    const limit = config.scrollDurationLimit * 1000;
    const cooldown = config.scrollInactivityTimeout * 1000;

    const monitorPattern = () => {
      const currentTime = Date.now();

      if (!sessionStart) sessionStart = currentTime;
      lastActive = currentTime;

      clearTimeout(cooldownTimer);
      cooldownTimer = setTimeout(() => {
        if (sessionStart && currentTime - sessionStart < limit) {
          logSessionData(currentTime - sessionStart);
        }
        sessionStart = null;
      }, cooldown);

      if (currentTime - sessionStart >= limit) {
        deployInterceptUI();
        logSessionData(currentTime - sessionStart);
        sessionStart = null;
      }
    };

    initNexusWatchers(monitorPattern);
  });
})();