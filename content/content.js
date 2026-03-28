(() => {
let nexusActive = false;
let sessionStart = null;
let nexusWrapper = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Nexus Shield: Signal received -", request.action);

  if (request.action === "disrupt" && !nexusActive) {
    console.log("Nexus Shield: Engaging disruption protocols. Priority:", request.urgency);
    engageShield(request.urgency, request.siteContext, request.behaviorData, request.pageAnalysis);
    sendResponse({ status: "shield_engaged" });
  } else {
    sendResponse({ status: "shield_standby", active: nexusActive });
  }
  return true;
});

function engageShield(urgency = 'low', context = 'general', behavior = {}, analysis = {}) {
  if (nexusActive) return;
  
  nexusActive = true;
  sessionStart = Date.now();

  injectNexusStyles();
  
  const shieldOverlay = createShield(urgency, context, behavior, analysis);
  document.body.appendChild(shieldOverlay);
  
  // Unique wrapper ID to avoid detection
  if (!document.getElementById('nexus-view-container')) {
    const wrapper = document.createElement('div');
    wrapper.id = 'nexus-view-container';
    Array.from(document.body.children)
      .filter(child => !child.classList.contains('nexus-overlay-gate'))
      .forEach(child => wrapper.appendChild(child));
    document.body.appendChild(wrapper);
  }
  
  nexusWrapper = document.getElementById('nexus-view-container');
  if (nexusWrapper) {
    nexusWrapper.style.filter = "blur(15px) grayscale(50%)";
    nexusWrapper.style.pointerEvents = "none";
    nexusWrapper.style.transition = "all 0.6s ease";
    nexusWrapper.style.transform = "scale(0.98)";
  }
}

function injectNexusStyles() {
  if (document.querySelector('#nexusCoreStyles')) return;
  
  const style = document.createElement('style');
  style.id = 'nexusCoreStyles';
  style.textContent = `
    @keyframes nexusIn {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes nexusOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-30px); }
    }
    
    @keyframes nexusGlowPulse {
      0%, 100% { box-shadow: 0 0 20px rgba(34, 211, 238, 0.2); }
      50% { box-shadow: 0 0 40px rgba(129, 140, 248, 0.4); }
    }

    .nexus-overlay-gate * {
      box-sizing: border-box;
      transition: all 0.2s ease;
    }
  `;
  document.head.appendChild(style);
}

function createShield(urgency, context, behavior, analysis) {
  const overlay = document.createElement("div");
  overlay.className = "nexus-overlay-gate";
  
  const bg = urgency === 'high' 
    ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(244, 63, 94, 0.95))'
    : 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(34, 211, 238, 0.95))';
  
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: ${bg};
    backdrop-filter: blur(12px);
    z-index: 2147483647;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    animation: nexusIn 0.5s ease-out;
  `;

  overlay.innerHTML = getShieldContent(urgency);
  
  const btn = overlay.querySelector('#nexusContinue');
  if (btn) {
    btn.addEventListener('click', () => {
      nexusActive = false;
      overlay.style.animation = 'nexusOut 0.4s ease-in';
      setTimeout(() => {
        overlay.remove();
        if (nexusWrapper) {
          nexusWrapper.style.filter = "";
          nexusWrapper.style.pointerEvents = "auto";
          nexusWrapper.style.transform = "scale(1)";
        }
      }, 400);
    });
  }
  
  return overlay;
}

function getShieldContent(urgency) {
  const isHigh = urgency === 'high';
  const accent = isHigh ? '#f43f5e' : '#22d3ee';
  
  return `
    <div style="
      max-width: 420px;
      background: #1e293b;
      border: 1px solid ${accent}44;
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      animation: nexusGlowPulse 4s infinite;
    ">
      <div style="font-size: 50px; margin-bottom: 20px;">${isHigh ? '🛑' : '⚡'}</div>
      <h1 style="color: white; font-size: 28px; margin-bottom: 15px; font-weight: 800;">NEXUS INTERCEPT</h1>
      <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
        ${isHigh 
          ? 'Deep work boundary breached. Patterns suggest mindless activity. Reset your focus now.' 
          : 'Focus session complete. Take a 60-second neural reset before proceeding.'}
      </p>
      <button id="nexusContinue" style="
        background: ${accent};
        color: ${isHigh ? 'white' : '#0f172a'};
        border: none;
        padding: 14px 40px;
        font-size: 14px;
        font-weight: 800;
        border-radius: 10px;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 1px;
      ">Resume Session</button>
    </div>
  `;
}
})();