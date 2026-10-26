function drawCylinderVisualization(diameter, length, fillPercent, volume) {
  const canvas = document.getElementById("cylinderCanvas");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const centerX = 100;
  const centerY = canvas.height / 2;
  const cylinderLength = 300;
  const cylinderRadius = 60;
  const fillHeight = cylinderRadius * 2 * fillPercent;

  // Cylinder outline
  ctx.fillStyle = "#f4b400";
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.fillRect(centerX, centerY - cylinderRadius, cylinderLength, cylinderRadius * 2);
  ctx.strokeRect(centerX, centerY - cylinderRadius, cylinderLength, cylinderRadius * 2);

  // Fluid fill
  ctx.fillStyle = "#007bff";
  ctx.fillRect(centerX, centerY + cylinderRadius - fillHeight, cylinderLength, fillHeight);

  // End caps
  ctx.beginPath();
  ctx.arc(centerX, centerY, cylinderRadius, 0.5 * Math.PI, 1.5 * Math.PI);
  ctx.fillStyle = "#ffcc00";
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX + cylinderLength, centerY, cylinderRadius, 1.5 * Math.PI, 0.5 * Math.PI);
  ctx.fillStyle = "#ffcc00";
  ctx.fill();
  ctx.stroke();

  // Labels
  ctx.fillStyle = "#000";
  ctx.font = "14px sans-serif";
  ctx.fillText(`Diameter: ${diameter.toFixed(2)} m`, 20, 20);
  ctx.fillText(`Length: ${length.toFixed(2)} m`, 20, 40);
  ctx.fillText(`Fill %: ${(fillPercent * 100).toFixed(1)}%`, 20, 60);
  ctx.fillText(`Volume: ${volume.toFixed(2)} m³`, 20, 80);
}
