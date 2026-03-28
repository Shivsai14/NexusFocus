/**
 * NEXUS ANALYTICS - Neural Telemetry Processor
 * Processes stored scroll data and renders visual telemetry cards.
 */

document.addEventListener("DOMContentLoaded", () => {
  
  // Format milliseconds into a professional digital readout
  function formatNeuralTime(ms) {
    if (!ms || isNaN(ms)) return "0m 0s";
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  chrome.storage.local.get("scrollHistory", (result) => {
    const telemetryData = result.scrollHistory || {};
    const tbody = document.getElementById("statsBody");
    const metricsContainer = document.getElementById("metrics");

    let totalGlobalTime = 0;
    let nodeTotals = {}; // Tracks site-specific totals
    const daysActive = Object.keys(telemetryData).length;

    // Clear existing table content
    tbody.innerHTML = "";

    // Process daily logs
    for (const [date, nodes] of Object.entries(telemetryData)) {
      let dailyTotal = 0;

      for (const [node, time] of Object.entries(nodes)) {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td class="timestamp-cell">${date}</td>
          <td class="node-cell">${node}</td>
          <td class="time-cell">${formatNeuralTime(time)}</td>
        `;
        tbody.appendChild(row);

        totalGlobalTime += time;
        dailyTotal += time;
        nodeTotals[node] = (nodeTotals[node] || 0) + time;
      }

      // Add Daily Summary Row
      const summaryRow = document.createElement("tr");
      summaryRow.className = "summary-row";
      summaryRow.innerHTML = `
        <td>${date}</td>
        <td>DAILY TOTAL</td>
        <td>${formatNeuralTime(dailyTotal)}</td>
      `;
      tbody.appendChild(summaryRow);
    }

    // Calculate Core Metrics
    const sortedNodes = Object.entries(nodeTotals).sort((a, b) => b[1] - a[1]);
    const peakNode = sortedNodes[0];
    const dailyAvg = daysActive > 0 ? totalGlobalTime / daysActive : 0;

    // Render Metric Cards
    metricsContainer.innerHTML = `
      <div class="metric-card">
        <div class="metric-title">Critical Node (Top Site)</div>
        <div class="metric-value">${peakNode ? peakNode[0] : "None"}</div>
        <div class="metric-subtitle">Total Exposure: ${peakNode ? formatNeuralTime(peakNode[1]) : "0m 0s"}</div>
      </div>

      <div class="metric-card">
        <div class="metric-title">Neural Avg. / Day</div>
        <div class="metric-value">${formatNeuralTime(dailyAvg)}</div>
        <div class="metric-subtitle">Based on ${daysActive} days of telemetry</div>
      </div>

      <div class="metric-card">
        <div class="metric-title">Total Intercept Time</div>
        <div class="metric-value">${formatNeuralTime(totalGlobalTime)}</div>
        <div class="metric-subtitle">Cumulative focus protection</div>
      </div>
    `;
  });
});