function updateASMEForm() {
  const type = document.querySelector("#typeSelector").value;
  const tab = document.getElementById("ASMESECTIONVIIIDIV1Tab");

  // hide all forms
  ["shellForm", "dishedEndForm", "torisphericalForm", "hemiForm"].forEach(f => {
    const formEl = tab.querySelector("#" + f);
    if (formEl) formEl.style.display = "none";
  });

  // show selected
  if (type === "shell") tab.querySelector("#shellForm").style.display = "block";
  else if (type === "ellipsoidal") tab.querySelector("#dishedEndForm").style.display = "block";
  else if (type === "torispherical") tab.querySelector("#torisphericalForm").style.display = "block";
  else if (type === "hemispherical") tab.querySelector("#hemiForm").style.display = "block";

  // clear results
  tab.querySelector("#results").innerHTML = "";
}

function calculateASMEThickness() {
  const tab = document.getElementById("ASMESECTIONVIIIDIV1Tab");
  const type = tab.querySelector("#typeSelector").value;
  if (!type) return alert("⚠️ Select a component type first!");

  let values = {};

  const getNumber = (selector) => {
    const el = tab.querySelector(selector);
    if (!el) return null;
    const raw = el.value.trim();
    if (raw === "") return null;
    const val = parseFloat(raw);
    return isNaN(val) ? null : val;
  };

  if (type === "shell") {
    values = {
      P: getNumber("#pressure"),
      Punit: tab.querySelector("#pressureUnit").value,
      R: getNumber("#radius"),
      Runit: tab.querySelector("#radiusUnit").value,
      S: getNumber("#stress"),
      Sunit: tab.querySelector("#stressUnit").value,
      E: getNumber("#efficiency")
    };
  }
  else if (type === "ellipsoidal") {
    values = {
      P: getNumber("#pressureDished"),
      Punit: tab.querySelector("#pressureDishedUnit").value,
      D: getNumber("#diameterDished"),
      Dunit: tab.querySelector("#diameterDishedUnit").value,
      S: getNumber("#stressDished"),
      Sunit: tab.querySelector("#stressDishedUnit").value,
      E: getNumber("#efficiencyDished")
    };
  }
  else if (type === "torispherical") {
    values = {
      P: getNumber("#pressureTori"),
      Punit: tab.querySelector("#pressureToriUnit").value,
      D: getNumber("#diameterTori"),
      Dunit: tab.querySelector("#diameterToriUnit").value,
      S: getNumber("#stressTori"),
      Sunit: tab.querySelector("#stressToriUnit").value,
      E: getNumber("#efficiencyTori")
    };
  }
  else if (type === "hemispherical") {
    values = {
      P: getNumber("#pressureHemi"),
      Punit: tab.querySelector("#pressureHemiUnit").value,
      D: getNumber("#diameterHemi"),
      Dunit: tab.querySelector("#diameterHemiUnit").value,
      S: getNumber("#stressHemi"),
      Sunit: tab.querySelector("#stressHemiUnit").value,
      E: getNumber("#efficiencyHemi")
    };
  }

  if (Object.values(values).some(v => v === null || v === "")) {
    alert("⚠️ Invalid or missing input values");
    return;
  }

  tab.querySelector("#results").innerHTML = `
    <div style="text-align:center; padding:20px;">
      <div class="loader" style="margin: 0 auto 10px auto;"></div>
      <p style="font-size:13px; font-weight:600; color:#2563eb;">Calculating ASME Section VIII Div. 1 on Backend Server...</p>
    </div>
  `;

  fetch("/api/viiidiv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, values })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success || data.error) {
        tab.querySelector("#results").innerHTML = `
          <div style="padding:12px;background:#fef2f2;border-left:4px solid #dc2626;color:#991b1b;border-radius:4px;">
            <strong>⚠️ Calculation Error:</strong> ${data.error || "Unknown error"}
          </div>
        `;
      } else {
        const recap = data.inputRecap || {};
        tab.querySelector("#results").innerHTML = `
          <div class="simple-result" style="padding:15px; background:#fff; border-radius:8px; border:1px solid #e2e8f0;">
            <h3 style="margin-top: 0; color: #1e293b; border-bottom: 2px solid rgba(0,0,0,0.08); padding-bottom: 8px;">
              📊 ASME Sec. VIII Div. 1 Results (Backend API)
            </h3>
            
            <p style="margin:8px 0; font-size:14px;"><strong>Code Rule / Formula:</strong> <code>${data.formula}</code></p>
            
            <div style="margin: 12px 0; padding: 12px; background: rgba(37, 99, 235, 0.06); border-radius: 6px; border-left: 4px solid #2563eb;">
              <span style="font-size: 14px; font-weight: 700; color: #1e40af;">Calculated Minimum Thickness (t):</span>
              <div style="font-size: 22px; font-weight: 800; color: #1d4ed8; margin-top: 4px;">
                ${data.thickness} ${data.unit || "mm"}
              </div>
            </div>

            <table class="result-table" style="width:100%; border-collapse:collapse; margin-top:12px; font-size:13px;">
              <thead>
                <tr style="background:#f8fafc; text-align:left;">
                  <th style="padding:8px; border-bottom:1px solid #cbd5e1;">Parameter</th>
                  <th style="padding:8px; border-bottom:1px solid #cbd5e1;">Specified Input</th>
                  <th style="padding:8px; border-bottom:1px solid #cbd5e1;">Converted Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:8px; border-bottom:1px solid #f1f5f9;">Internal Pressure (P)</td>
                  <td style="padding:8px; border-bottom:1px solid #f1f5f9;">${recap.P} ${recap.Punit}</td>
                  <td style="padding:8px; border-bottom:1px solid #f1f5f9; font-weight:bold;">${recap.P_MPa?.toFixed(3)} MPa</td>
                </tr>
                <tr>
                  <td style="padding:8px; border-bottom:1px solid #f1f5f9;">${recap.dimLabel || "Dimension"}</td>
                  <td style="padding:8px; border-bottom:1px solid #f1f5f9;">${recap.dimension} mm</td>
                  <td style="padding:8px; border-bottom:1px solid #f1f5f9; font-weight:bold;">${recap.dimension} mm</td>
                </tr>
                <tr>
                  <td style="padding:8px; border-bottom:1px solid #f1f5f9;">Allowable Stress (S)</td>
                  <td style="padding:8px; border-bottom:1px solid #f1f5f9;">${recap.S} ${recap.Sunit}</td>
                  <td style="padding:8px; border-bottom:1px solid #f1f5f9; font-weight:bold;">${recap.S_MPa?.toFixed(2)} MPa</td>
                </tr>
                <tr>
                  <td style="padding:8px; border-bottom:1px solid #f1f5f9;">Joint Efficiency (E)</td>
                  <td style="padding:8px; border-bottom:1px solid #f1f5f9;" colspan="2"><strong>${recap.E}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      }
    })
    .catch(err => {
      console.error(err);
      tab.querySelector("#results").innerHTML = `
        <div style="padding:12px;background:#fef2f2;border-left:4px solid #dc2626;color:#991b1b;border-radius:4px;">
          <strong>⚠️ Connection Error:</strong> Unable to connect to backend server.
        </div>
      `;
    });
}
