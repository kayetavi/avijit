let volumeChart;

function drawVolumeChart(filled, empty, total, shape, dLabel, lLabel) {
  const ctx = document.getElementById("volumeChart").getContext("2d");

  if (volumeChart) volumeChart.destroy();

  const shapeLabel = shape ? shape.toUpperCase() : "-";
  const totalLabel = isNaN(total) ? "-" : `${total.toFixed(2)} m³`;

  volumeChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Inventory Volume"],
      datasets: [
        {
          label: "Filled Volume (m³)",
          data: [filled],
          backgroundColor: "#007bff"
        },
        {
          label: "Empty Volume (m³)",
          data: [empty],
          backgroundColor: "#cccccc"
        }
      ]
    },
    options: {
      responsive: true,
      indexAxis: "y",
      plugins: {
        legend: { position: "top" },
        title: {
          display: true,
          text: [
            `Shape: ${shapeLabel}`,
            `Diameter: ${dLabel} | Length/Height: ${lLabel}`,
            `Total Volume: ${totalLabel}`
          ]
        }
      },
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: "Volume (m³)"
          }
        },
        y: {
          stacked: true
        }
      }
    }
  });

  document.getElementById("chartContainer").style.display = "block";
}
