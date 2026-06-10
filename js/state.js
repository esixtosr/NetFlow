let state = {
  devices: [],
  connections: [],
  zones: [],
  nextDeviceId: 1,
  nextConnectionId: 1,
  nextZoneId: 1,
  selectedType: null,
  selectedId: null,

  /*
    Phase 4.5:
    Multi-select support.
    This stores selected devices/zones only.
    Connections are not part of multi-select copying.
  */
  selectedItems: [],
  clipboard: null,
  clipboardMode: 'copy',
  selectionBox: null,

  viewX: 0,
  viewY: 0,
  zoom: 1,

  /*
    Phase 1:
    showPorts is now only a legacy compatibility field.
    The button and canvas labels are removed.
  */
  showPorts: false,

  packetSpeed: 0.55,
  fontSize: 16,
  boxScale: 1,
  sidebarHidden: false
};

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

function resetState() {
  state = {
    devices: [],
    connections: [],
    zones: [],
    nextDeviceId: 1,
    nextConnectionId: 1,
    nextZoneId: 1,
    selectedType: null,
    selectedId: null,

    /*
      Phase 4.5:
      Reset multi-select and clipboard state.
    */
    selectedItems: [],
    clipboard: null,
    clipboardMode: 'copy',
    selectionBox: null,

    viewX: 0,
    viewY: 0,
    zoom: 1,

    /*
      Phase 1:
      Kept only so older saved projects do not get weird.
      It no longer controls any visible UI.
    */
    showPorts: false,

    packetSpeed: 0.55,
    fontSize: 16,
    boxScale: 1,
    sidebarHidden: false
  };
}

function buildDefaultProject() {
  resetState();

  if (typeof resizeCanvas === 'function') {
    resizeCanvas();
  }

  if (typeof refreshSidebar === 'function') {
    refreshSidebar();
  }

  if (typeof updateUiState === 'function') {
    updateUiState();
  }

  if (typeof drawScene === 'function') {
    drawScene(performance.now());
  }

  if (typeof setStatus === 'function') {
    setStatus('Blank project ready');
  }
}

let dragging = null;
let resizingZone = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let panning = false;
let panStartX = 0;
let panStartY = 0;