/**
 * NEXUS FOCUS - Configuration Sync Logic
 * Manages neural threshold limits and firewall domain vaults.
 */

document.addEventListener("DOMContentLoaded", () => {
  const siteInput = document.getElementById("siteInput");
  const siteTagsContainer = document.getElementById("siteTags");
  const applyAllCheckbox = document.getElementById("applyAll");
  const saveBtn = document.getElementById("saveBtn");

  let telemetryVault = [];

  // Renders the visual tags for monitored domains
  function refreshVaultDisplay() {
    siteTagsContainer.innerHTML = "";
    telemetryVault.forEach((domain, index) => {
      const tag = document.createElement("span");
      tag.className = "site-tag";
      tag.textContent = domain;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "×";
      removeBtn.title = `Remove ${domain}`;
      removeBtn.onclick = () => {
        telemetryVault.splice(index, 1);
        refreshVaultDisplay();
      };

      tag.appendChild(removeBtn);
      siteTagsContainer.appendChild(tag);
    });
  }

  function updateInputState() {
    const isGlobal = applyAllCheckbox.checked;
    siteInput.disabled = isGlobal;
    siteTagsContainer.style.opacity = isGlobal ? 0.3 : 1;
    siteInput.style.opacity = isGlobal ? 0.5 : 1;
  }

  // Handle Domain Entry
  siteInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = siteInput.value.trim().toLowerCase();
      // Simple validation to ensure it looks like a domain
      if (val && val.includes('.') && !telemetryVault.includes(val)) {
        telemetryVault.push(val);
        refreshVaultDisplay();
        siteInput.value = "";
      }
    }
  });

  applyAllCheckbox.addEventListener("change", updateInputState);

  // Load Existing Neural Configuration
  chrome.storage.local.get({
    scrollDurationLimit: 15,
    scrollInactivityTimeout: 2,
    sites: [],
    applyToAll: true
  }, (config) => {
    document.getElementById("scrollLimit").value = config.scrollDurationLimit;
    document.getElementById("resetLimit").value = config.scrollInactivityTimeout;
    applyAllCheckbox.checked = config.applyToAll;
    telemetryVault = config.sites || [];
    
    refreshVaultDisplay();
    updateInputState();
  });

  // Sync Configuration to Local Storage
  saveBtn.addEventListener("click", () => {
    const scrollDurationLimit = parseInt(document.getElementById("scrollLimit").value, 10);
    const scrollInactivityTimeout = parseInt(document.getElementById("resetLimit").value, 10);
    const applyToAll = applyAllCheckbox.checked;

    // Visual feedback on button
    const originalText = saveBtn.textContent;
    saveBtn.textContent = "SYNCING...";
    saveBtn.disabled = true;

    chrome.storage.local.set({
      scrollDurationLimit,
      scrollInactivityTimeout,
      sites: telemetryVault,
      applyToAll
    }, () => {
      setTimeout(() => {
        saveBtn.textContent = "SUCCESS";
        saveBtn.style.background = "#38a169"; // Green success color
        
        setTimeout(() => {
          saveBtn.textContent = originalText;
          saveBtn.style.background = ""; // Revert to CSS default
          saveBtn.disabled = false;
        }, 1500);
      }, 500);
    });
  });
});