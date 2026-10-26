// 🔁 Global chart instance
let corrosionChart;

// 📊 Function to draw professional corrosion chart
function drawChart(rates, labels) {
  const canvas = document.getElementById('myChart');
  if (!canvas || typeof Chart === 'undefined') return;

  // Safely destroy existing chart instances
  if (corrosionChart) {
    try { corrosionChart.destroy(); } catch (_) {}
    corrosionChart = null;
  }
  if (typeof Chart.getChart === 'function') {
    const existing = Chart.getChart(canvas);
    if (existing) {
      try { existing.destroy(); } catch (_) {}
    }
  }

  canvas.style.width = '100%';
  canvas.style.height = '100%';
  const ctx = canvas.getContext('2d');

  // Create new professional chart
  corrosionChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Corrosion Rate (mm/year)',
        data: rates,
        backgroundColor: 'rgba(37, 99, 235, 0.78)',
        borderColor: 'rgba(37, 99, 235, 1)',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 400,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 14,
            boxHeight: 14,
            usePointStyle: true,
            font: { size: 11.5, weight: '600' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          titleColor: '#ffffff',
          bodyColor: '#f1f5f9',
          padding: 10,
          cornerRadius: 8,
          usePointStyle: true
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Corrosion Rate (mm/year)',
            font: { size: 11.5, weight: '600' }
          },
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: { font: { size: 10.5 } }
        },
        x: {
          title: {
            display: true,
            text: 'Operating Parameter / Temperature',
            font: { size: 11.5, weight: '600' }
          },
          grid: { display: false },
          ticks: { font: { size: 10.5 } }
        }
      }
    }
  });
}
