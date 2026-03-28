/**
 * NEXUS FOCUS - Core Engine Script
 * Handles UI updates, timer synchronization, and firewall settings.
 */

function formatTime(totalSeconds) {
  const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

function updateNexusUI(activeSession, remainingSeconds) {
  const timerSection = document.getElementById("timerSection");
  const timerLabel = document.getElementById("timerLabel");
  const timerDisplay = document.getElementById("timerDisplay");
  const stopBtn = document.getElementById("stopTimerBtn");

  if (activeSession && remainingSeconds > 0) {
    timerSection.style.display = "block";
    stopBtn.style.display = "inline-block";
    timerLabel.textContent = `Active Session: ${activeSession}`;
    timerDisplay.textContent = formatTime(remainingSeconds);
  } else {
    timerSection.style.display = "none";
  }
}

// --- Nexus Focus Variables ---
let focusInterval = null;
const nexusDefaultSites = ["facebook.com", "instagram.com", "youtube.com", "twitter.com", "tiktok.com", "reddit.com"];
let vaultSites = [];
let isNexusReady = false;

// Prevent multiple initialization
function initializeNexus() {
  if (isNexusReady) return;
  isNexusReady = true;

  console.log("Nexus Engine: Initializing System...");

  setupNexusListeners();
  loadNeuralProgress();
  syncTimerState();
  initFirewallMode();
}

function setupNexusListeners() {
  const hours = document.getElementById("hours");
  const minutes = document.getElementById("minutes");
  const seconds = document.getElementById("seconds");

  // Timer controls
  const startTimerBtn = document.getElementById("startTimerBtn");
  if (startTimerBtn) {
    startTimerBtn.addEventListener("click", () => {
      const h = parseInt(hours.value || 0);
      const m = parseInt(minutes.value || 0);
      const s = parseInt(seconds.value || 0);
      const total = h * 3600 + m * 60 + s;

      if (total > 0) {
        chrome.runtime.sendMessage({
          action: "startTimer",
          duration: total,
          timerName: "Deep Work"
        });
      }
    });
  }

  const stopTimerBtn = document.getElementById("stopTimerBtn");
  if (stopTimerBtn) {
    stopTimerBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "stopTimer" });
    });
  }

  const focusModeBtn = document.getElementById("focusModeBtn");
  if (focusModeBtn) {
    focusModeBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        action: "startTimer",
        duration: 25 * 60,
        timerName: "Focus Mode"
      });
    });
  }

  const quickBreakBtn = document.getElementById("quickBreakBtn");
  if (quickBreakBtn) {
    quickBreakBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        action: "startTimer",
        duration: 5 * 60,
        timerName: "Recovery Break"
      });
    });
  }

  const viewStatsBtn = document.getElementById("viewStats");
  if (viewStatsBtn) {
    viewStatsBtn.addEventListener("click", () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL("pages/dashboard.html")
      });
    });
  }

  const openSettingsBtn = document.getElementById("openSettings");
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // Firewall toggle
  const focusToggle = document.getElementById('focusToggle');
  if (focusToggle) {
    focusToggle.addEventListener('change', handleFirewallToggle);
  }

  // Vault sites management
  const addSiteBtn = document.getElementById('addSiteBtn');
  const addSiteInput = document.getElementById('addSiteInput');
  
  if (addSiteBtn) {
    addSiteBtn.addEventListener('click', handleVaultAddition);
  }

  if (addSiteInput) {
    addSiteInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleVaultAddition();
      }
    });
  }
}

function syncTimerState() {
  chrome.runtime.sendMessage({ action: "requestTimerState" }, (res) => {
    if (chrome.runtime.lastError) {
      return;
    }
    if (res?.activeTimer && res?.remainingSeconds >= 0) {
      updateNexusUI(res.activeTimer, res.remainingSeconds);
    }
  });
}

function initFirewallMode() {
  chrome.runtime.sendMessage({ action: 'requestFocusState' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      resetToSystemDefaults();
      return;
    }

    setFirewallUI(response.focusModeActive);

    vaultSites = response.socialSites && response.socialSites.length > 0 
      ? [...response.socialSites] 
      : [...nexusDefaultSites];
    
    refreshVaultDisplay();

    if (response.focusModeActive && response.focusStartTime) {
      runNeuralClock(response.focusStartTime);
    } else {
      killNeuralClock();
    }
  });
}

// --- Firewall Toggle ---
let isSwitching = false;

async function handleFirewallToggle(event) {
  if (isSwitching) {
    event.target.checked = !event.target.checked;
    return;
  }

  const status = event.target.checked;
  isSwitching = true;

  try {
    const response = await dispatchSecureMessage({
      action: "updateState",
      focusModeActive: status
    }, 3000);

    if (response?.status !== "state_updated") {
      event.target.checked = !status;
      triggerAlert("System update failed.");
    }
  } catch (error) {
    event.target.checked = !status;
    triggerAlert("Nexus Link Lost.");
  } finally {
    setTimeout(() => { isSwitching = false; }, 200);
  }
}

function dispatchSecureMessage(message, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    try {
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    } catch (e) {
      clearTimeout(timeout);
      reject(e);
    }
  });
}

function resetToSystemDefaults() {
  setFirewallUI(false);
  vaultSites = [...nexusDefaultSites];
  refreshVaultDisplay();
  killNeuralClock();
}

function setFirewallUI(active) {
  const toggle = document.getElementById('focusToggle');
  if (toggle && toggle.checked !== active) {
    toggle.checked = active;
  }
}

// --- Neural Clock Display ---
function runNeuralClock(startTime) {
  killNeuralClock();
  syncNeuralDisplay(startTime);
  focusInterval = setInterval(() => syncNeuralDisplay(startTime), 1000);
}

function killNeuralClock() {
  if (focusInterval) {
    clearInterval(focusInterval);
    focusInterval = null;
  }
  const display = document.getElementById('focusTimerDisplay');
  if (display) display.textContent = "Focus Time: 0m 0s";
}

function syncNeuralDisplay(startTime) {
  const display = document.getElementById('focusTimerDisplay');
  if (display) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    display.textContent = `Focus Session: ${m}m ${s}s`;
  }
}

// --- Vault Management ---
function handleVaultAddition() {
  const input = document.getElementById('addSiteInput');
  const site = sanitizeDomain(input.value.trim());
  
  if (!site || !site.includes('.')) {
    triggerAlert('Enter a valid domain.');
    return;
  }

  if (vaultSites.some(s => s.toLowerCase() === site.toLowerCase())) {
    triggerAlert('Domain already in vault.');
    return;
  }

  vaultSites.push(site);
  chrome.runtime.sendMessage({ action: "updateSocialSites", socialSites: vaultSites });
  refreshVaultDisplay();
  input.value = '';
}

function refreshVaultDisplay() {
  const list = document.getElementById('siteList');
  if (!list) return;

  list.innerHTML = '';

  if (vaultSites.length === 0) {
    list.innerHTML = '<p style="font-size: 11px; color: #64748b; text-align:center;">Firewall empty.</p>';
    return;
  }

  vaultSites.forEach(domain => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${domain}</span><button class="remove-btn">✖</button>`;
    
    li.querySelector('button').addEventListener('click', () => {
      vaultSites = vaultSites.filter(s => s !== domain);
      chrome.runtime.sendMessage({ action: "updateSocialSites", socialSites: vaultSites });
      refreshVaultDisplay();
    });

    list.appendChild(li);
  });
}

// --- Utilities ---
function triggerAlert(msg) {
  const err = document.getElementById('errorMessage');
  if (err) {
    err.textContent = msg;
    err.style.display = 'block';
    setTimeout(() => err.style.display = 'none', 3000);
  }
}

function sanitizeDomain(input) {
  return input.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
}

async function loadNeuralProgress() {
  try {
    const data = await chrome.storage.local.get(['reflections']);
    const countEl = document.getElementById('reflectionsCount');
    if (countEl) countEl.textContent = (data.reflections || []).length;
  } catch (e) {
    console.warn("Nexus Neural Cache unavailable.");
  }
}

// --- Global Signal Listener ---
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "updateTimerDisplay") {
    updateNexusUI(msg.activeTimer, msg.remainingSeconds);
  } else if (msg.action === "timerCompletedUI") {
    const display = document.getElementById("timerDisplay");
    const stopBtn = document.getElementById("stopTimerBtn");
    if (display) display.textContent = "DONE";
    if (stopBtn) stopBtn.style.display = "none";
  } else if (msg.action === "updateFocusTimerDisplay") {
    setFirewallUI(msg.focusModeActive);
    if (msg.focusModeActive) {
      runNeuralClock(Date.now() - (msg.minutesFocused * 60 * 1000));
    } else {
      killNeuralClock();
    }
  }
});

document.addEventListener("DOMContentLoaded", initializeNexus);