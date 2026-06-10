// app.js
// Main shared utility functions only.
// Most logic has been split into separate files.

function setStatus(message) {
  document.getElementById('status').textContent = message;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function uid(prefix) {
  if (prefix === 'device') return state.nextDeviceId++;
  if (prefix === 'connection') return state.nextConnectionId++;
  if (prefix === 'zone') return state.nextZoneId++;
}

function getDeviceSize() {
  return {
    w: BASE_DEVICE_W * (state.boxScale || 1),
    h: BASE_DEVICE_H * (state.boxScale || 1)
  };
}

function resetProject() {
  if (!confirm('Reset and load the starter topology? This will replace the current diagram.')) {
    return;
  }

  pushHistory();

  buildDefaultProject();
  refreshSidebar();
  updateUiState();
  fitView();

  setStatus('Starter diagram loaded');
}

function setPacketSpeed(value) {
  pushHistory();

  state.packetSpeed = Number(value);

  updateUiState();
  setStatus('Bubble speed: ' + state.packetSpeed.toFixed(2) + 'x');
}

function setFontSize(value) {
  pushHistory();

  state.fontSize = Number(value);

  updateUiState();
  setStatus('Diagram font size: ' + state.fontSize + 'pt');
}

function setBoxScale(value) {
  pushHistory();

  const oldScale = state.boxScale || 1;
  state.boxScale = Number(value);

  const ratio = state.boxScale / oldScale;

  state.devices.forEach(device => {
    const centerX = device.x + device.w / 2;
    const centerY = device.y + device.h / 2;

    device.w *= ratio;
    device.h *= ratio;
    device.x = centerX - device.w / 2;
    device.y = centerY - device.h / 2;
  });

  updateUiState();
  setStatus('Box / line scale: ' + state.boxScale.toFixed(2) + 'x');
}

function resetDiagramSizing() {
  pushHistory();

  state.fontSize = 16;

  const oldScale = state.boxScale || 1;
  state.boxScale = 1;

  const ratio = 1 / oldScale;

  state.devices.forEach(device => {
    const centerX = device.x + device.w / 2;
    const centerY = device.y + device.h / 2;

    device.w *= ratio;
    device.h *= ratio;
    device.x = centerX - device.w / 2;
    device.y = centerY - device.h / 2;
  });

  updateUiState();
  setStatus('Diagram sizing reset');
}