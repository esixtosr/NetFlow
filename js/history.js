let historyStack = [];
let redoStack = [];
let suppressHistory = false;

function snapshot() {
  return JSON.stringify({
    devices: state.devices,
    connections: state.connections,
    zones: state.zones,
    nextDeviceId: state.nextDeviceId,
    nextConnectionId: state.nextConnectionId,
    nextZoneId: state.nextZoneId,
    viewX: state.viewX,
    viewY: state.viewY,
    zoom: state.zoom,

    /*
      Phase 1:
      showPorts is now legacy only.
      Keep it in snapshots so older state objects do not break,
      but it no longer controls visible canvas labels.
    */
    showPorts: false,

    packetSpeed: state.packetSpeed,
    fontSize: state.fontSize,
    boxScale: state.boxScale,
    sidebarHidden: state.sidebarHidden
  });
}

function pushHistory() {
  if (suppressHistory) return;

  historyStack.push(snapshot());

  if (historyStack.length > 80) {
    historyStack.shift();
  }

  redoStack = [];
}

function restoreSnapshot(data) {
  const p = JSON.parse(data);

  Object.assign(state, {
    devices: p.devices || [],
    connections: p.connections || [],
    zones: p.zones || [],
    nextDeviceId: p.nextDeviceId || 1,
    nextConnectionId: p.nextConnectionId || 1,
    nextZoneId: p.nextZoneId || 1,
    viewX: p.viewX || 0,
    viewY: p.viewY || 0,
    zoom: p.zoom || 1,

    /*
      Phase 1:
      Force legacy port labels off when undo/redo restores a snapshot.
    */
    showPorts: false,

    packetSpeed: p.packetSpeed || 0.55,
    fontSize: p.fontSize || 16,
    boxScale: p.boxScale || 1,
    sidebarHidden: p.sidebarHidden || false,
    selectedType: null,
    selectedId: null
  });

  /*
    Phase 3:
    normalizeProject keeps undo/redo safe for port-aware connections.
    It restores/validates:
    - device ports
    - connection fromPort
    - connection toPort
  */
  normalizeProject(state);

  refreshSidebar();
  updateUiState();
}

function undo() {
  if (!historyStack.length) {
    return setStatus('Nothing to undo');
  }

  redoStack.push(snapshot());

  suppressHistory = true;
  restoreSnapshot(historyStack.pop());
  suppressHistory = false;

  setStatus('Undo');
}

function redo() {
  if (!redoStack.length) {
    return setStatus('Nothing to redo');
  }

  historyStack.push(snapshot());

  suppressHistory = true;
  restoreSnapshot(redoStack.pop());
  suppressHistory = false;

  setStatus('Redo');
}