// savedata.js
// Analyses viewing and data retrieval
async function viewSavedAnalyses() {
  try {
    const response = await fetch("/api/get-analyses");
    const data = await response.json();

    const container = document.getElementById("savedDataTable");
    if (!data || data.length === 0) {
      container.innerHTML = "<p>No saved data found.</p>";
      return;
    }

    let tableHTML = `<table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
      <tr>
        <th>Tag</th>
        <th>CCR</th>
        <th>LTCR</th>
        <th>STCR</th>
        <th>Tmin</th>
        <th>Remaining Life</th>
        <th>Schedule Date</th>
        <th>Projected Date</th>
      </tr>`;

    data.forEach(row => {
      tableHTML += `
        <tr>
          <td>${row.tagNumber || "-"}</td>
          <td>${row.ccr || "-"}</td>
          <td>${row.ltcr || "-"}</td>
          <td>${row.stcr || "-"}</td>
          <td>${row.tminVal || "-"}</td>
          <td>${row.remLife || "-"}</td>
          <td>${row.schedDate || "-"}</td>
          <td>${row.projDate || "-"}</td>
        </tr>`;
    });

    tableHTML += "</table>";
    container.innerHTML = tableHTML;
  } catch (err) {
    console.error("Error fetching saved analyses:", err);
    alert("❌ Failed to fetch saved data");
  }
}
