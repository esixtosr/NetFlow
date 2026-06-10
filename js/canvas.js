const canvas = document.getElementById("canvas");
const wrap = document.getElementById("canvasWrap");
const ctx = canvas.getContext("2d");

let draggingBendPoint = null;
let draggingSelectionGroup = null;
let zoneMoveSnapshot = null;

let smartSnapActive = false;
let smartSnapType = "";

let selectionDragging = false;
let selectionAddMode = false;
let selectionStartX = 0;
let selectionStartY = 0;
let selectionMoved = false;

function resizeCanvas() {
  canvas.width = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function updateZoomText() {
  zoomText.textContent = Math.round(state.zoom * 100) + "%";
}

function zoomView(multiplier) {
  const mx = canvas.width / 2;
  const my = canvas.height / 2;
  const oldZoom = state.zoom;
  const newZoom = Math.min(Math.max(oldZoom * multiplier, 0.35), 2.4);

  state.viewX = mx - ((mx - state.viewX) / oldZoom) * newZoom;
  state.viewY = my - ((my - state.viewY) / oldZoom) * newZoom;
  state.zoom = newZoom;

  updateZoomText();
  setStatus("Zoom: " + Math.round(state.zoom * 100) + "%");
}

function worldFromMouse(e) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (e.clientX - rect.left - state.viewX) / state.zoom,
    y: (e.clientY - rect.top - state.viewY) / state.zoom
  };
}

function getDeviceCenter(device) {
  return {
    x: device.x + device.w / 2,
    y: device.y + device.h / 2
  };
}

function rotatePointAroundCenter(x, y, cx, cy, angleDegrees) {
  const angle = -angleDegrees * Math.PI / 180;
  const dx = x - cx;
  const dy = y - cy;

  return {
    x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: cy + dx * Math.sin(angle) + dy * Math.cos(angle)
  };
}

function getDeviceZone(device) {
  const cx = device.x + device.w / 2;
  const cy = device.y + device.h / 2;

  for (let i = state.zones.length - 1; i >= 0; i--) {
    const zone = state.zones[i];

    if (
      cx >= zone.x &&
      cx <= zone.x + zone.w &&
      cy >= zone.y &&
      cy <= zone.y + zone.h
    ) {
      return zone;
    }
  }

  return null;
}

/* =========================
   PHASE 7.5 — VLAN MOVE DETECTION
========================= */

function getCanvasZoneKey(zone) {
  if (!zone) return "none";

  if (zone.id !== undefined && zone.id !== null) {
    return "zone-" + zone.id;
  }

  if (zone.vlanId) {
    return "vlan-" + zone.vlanId;
  }

  return "zone-unknown";
}

function getCanvasZoneName(zone) {
  if (!zone) return "No VLAN";

  return zone.name || "Unnamed VLAN";
}

function getCanvasZoneByKey(key) {
  if (!key || key === "none") return null;

  return state.zones.find(zone => getCanvasZoneKey(zone) === key) || null;
}

function startZoneMoveTrackingForDevices(devices) {
  const cleanDevices = (devices || []).filter(Boolean);

  if (!cleanDevices.length) {
    zoneMoveSnapshot = null;
    return;
  }

  zoneMoveSnapshot = cleanDevices.map(device => {
    const zone = getDeviceZone(device);

    return {
      deviceId: Number(device.id),
      startZoneKey: getCanvasZoneKey(zone),
      startZoneName: getCanvasZoneName(zone)
    };
  });
}

function finishZoneMoveTracking() {
  if (!Array.isArray(zoneMoveSnapshot) || !zoneMoveSnapshot.length) {
    zoneMoveSnapshot = null;
    return;
  }

  const movedDevices = [];

  zoneMoveSnapshot.forEach(snapshot => {
    const device = state.devices.find(item => Number(item.id) === Number(snapshot.deviceId));

    if (!device) return;

    const oldZone = getCanvasZoneByKey(snapshot.startZoneKey);
    const newZone = getDeviceZone(device);
    const newZoneKey = getCanvasZoneKey(newZone);

    if (snapshot.startZoneKey === newZoneKey) return;

    const currentIp = String(device.ipAddress || "").trim();

    if (
      oldZone &&
      currentIp &&
      typeof saveCurrentIpToDeviceVlanMemory === "function"
    ) {
      saveCurrentIpToDeviceVlanMemory(device, oldZone);
    }

    const rememberedNewIp =
      newZone && typeof getRememberedIpForDevice === "function"
        ? getRememberedIpForDevice(device, newZone)
        : "";

    movedDevices.push({
      device,
      oldZoneName: snapshot.startZoneName,
      newZoneName: getCanvasZoneName(newZone),
      rememberedNewIp
    });
  });

  zoneMoveSnapshot = null;

  if (!movedDevices.length) return;

  if (movedDevices.length === 1) {
    const moved = movedDevices[0];

    if (moved.rememberedNewIp) {
      setStatus(
        moved.device.name +
        " moved " +
        moved.oldZoneName +
        " → " +
        moved.newZoneName +
        " · remembered IP available: " +
        moved.rememberedNewIp
      );
    } else {
      setStatus(
        moved.device.name +
        " moved " +
        moved.oldZoneName +
        " → " +
        moved.newZoneName
      );
    }
  } else {
    setStatus(movedDevices.length + " device(s) moved between VLAN zones");
  }

  if (
    state.selectedType === "device" &&
    typeof renderDeviceDetailsPanel === "function"
  ) {
    const selectedDevice = state.devices.find(device => Number(device.id) === Number(state.selectedId));

    if (selectedDevice) {
      renderDeviceDetailsPanel(selectedDevice);
    }
  }
}

function isNetworkInfrastructureDevice(device) {
  if (!device) return false;

  const type = String(device.type || "").toLowerCase();
  const name = String(device.name || "").toLowerCase();
  const sub = String(device.sub || "").toLowerCase();

  return (
    type === "firewall" ||
    type === "router" ||
    type === "switch" ||
    type === "ap" ||
    type === "cloud" ||

    name.includes("gateway") ||
    name.includes("router") ||
    name.includes("firewall") ||
    name.includes("switch") ||
    name.includes("access point") ||
    name.includes(" ap") ||
    name.includes("u7") ||
    name.includes("unifi") ||
    name.includes("proxmox") ||
    name.includes("vm host") ||
    name.includes("hypervisor") ||

    sub.includes("router") ||
    sub.includes("firewall") ||
    sub.includes("switch") ||
    sub.includes("access point") ||
    sub.includes("lab vms") ||
    sub.includes("hypervisor")
  );
}

function getDeviceOwnColor(device) {
  if (!device) return "#3b9eff";

  return device.baseColor || device.color || "#3b9eff";
}

function getDeviceColor(device) {
  if (!device) return "#3b9eff";

  if (isNetworkInfrastructureDevice(device)) {
    return getDeviceOwnColor(device);
  }

  const zone = getDeviceZone(device);

  return zone ? zone.color : getDeviceOwnColor(device);
}

function getConnectionColor(connection) {
  if (connection.status && connection.status !== "online") {
    return STATUS_COLOR[connection.status] || "#ffffff";
  }

  const fromDevice = state.devices.find(device => device.id === connection.from);
  const toDevice = state.devices.find(device => device.id === connection.to);

  if (!fromDevice && !toDevice) return "#ffffff";
  if (fromDevice && !toDevice) return getDeviceColor(fromDevice);
  if (!fromDevice && toDevice) return getDeviceColor(toDevice);

  const fromZone = getDeviceZone(fromDevice);
  const toZone = getDeviceZone(toDevice);

  if (fromZone && toZone) {
    if (fromZone.id === toZone.id) return fromZone.color;
    return fromDevice.id > toDevice.id ? fromZone.color : toZone.color;
  }

  if (fromZone && !toZone) return fromZone.color;
  if (!fromZone && toZone) return toZone.color;

  return fromDevice.id > toDevice.id
    ? getDeviceColor(fromDevice)
    : getDeviceColor(toDevice);
}

/* =========================
   MULTI-SELECT HELPERS
========================= */

function ensureSelectionState() {
  if (!Array.isArray(state.selectedItems)) {
    state.selectedItems = [];
  }

  if (!("clipboard" in state)) {
    state.clipboard = null;
  }

  if (!("clipboardMode" in state)) {
    state.clipboardMode = "copy";
  }

  if (!("selectionBox" in state)) {
    state.selectionBox = null;
  }
}

function itemKey(type, id) {
  return type + ":" + Number(id);
}

function isMultiSelected(type, id) {
  ensureSelectionState();

  return state.selectedItems.some(item =>
    item.type === type && Number(item.id) === Number(id)
  );
}

function hasMultiSelection() {
  ensureSelectionState();
  return state.selectedItems.length > 0;
}

function clearMultiSelectionOnly() {
  ensureSelectionState();
  state.selectedItems = [];
  state.selectionBox = null;
}

function setMultiSelection(items) {
  ensureSelectionState();

  const seen = new Set();

  state.selectedItems = items
    .filter(item => item && (item.type === "device" || item.type === "zone"))
    .filter(item => {
      const key = itemKey(item.type, item.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  state.selectedType = null;
  state.selectedId = null;
  state.highlightedConnectionId = null;
  state.highlightedPortKey = null;

  if (typeof renderDetailsEmpty === "function") {
    renderDetailsEmpty();
  }
}

function toggleMultiSelectionItem(type, id) {
  ensureSelectionState();

  const exists = isMultiSelected(type, id);

  if (exists) {
    state.selectedItems = state.selectedItems.filter(item =>
      !(item.type === type && Number(item.id) === Number(id))
    );
  } else {
    state.selectedItems.push({
      type,
      id: Number(id)
    });
  }

  state.selectedType = null;
  state.selectedId = null;
  state.highlightedConnectionId = null;
  state.highlightedPortKey = null;

  if (typeof renderDetailsEmpty === "function") {
    renderDetailsEmpty();
  }

  refreshSidebar();

  const count = state.selectedItems.length;
  setStatus(count ? count + " item(s) selected" : "Selection cleared");
}

function getSingleSelectableFromState() {
  if (state.selectedType === "device" && state.selectedId) {
    return [{ type: "device", id: state.selectedId }];
  }

  if (state.selectedType === "zone" && state.selectedId) {
    return [{ type: "zone", id: state.selectedId }];
  }

  return [];
}

function getActiveSelectableItems() {
  ensureSelectionState();

  if (state.selectedItems.length) {
    return state.selectedItems.slice();
  }

  return getSingleSelectableFromState();
}

function rectsIntersect(a, b) {
  return !(
    a.x + a.w < b.x ||
    a.x > b.x + b.w ||
    a.y + a.h < b.y ||
    a.y > b.y + b.h
  );
}

function normalizeRect(x1, y1, x2, y2) {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1)
  };
}

function getItemRect(item) {
  if (!item) return null;

  return {
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h
  };
}

function getSelectionBoxItems(box) {
  if (!box) return [];

  const selected = [];

  state.zones.forEach(zone => {
    const rect = getItemRect(zone);

    if (rect && rectsIntersect(box, rect)) {
      selected.push({
        type: "zone",
        id: zone.id
      });
    }
  });

  state.devices.forEach(device => {
    const rect = getItemRect(device);

    if (rect && rectsIntersect(box, rect)) {
      selected.push({
        type: "device",
        id: device.id
      });
    }
  });

  return selected;
}

function startSelectionBox(point, additive = false) {
  ensureSelectionState();

  selectionDragging = true;
  selectionAddMode = additive;
  selectionMoved = false;

  selectionStartX = point.x;
  selectionStartY = point.y;

  state.selectionBox = {
    x: point.x,
    y: point.y,
    w: 0,
    h: 0
  };

  if (!additive) {
    state.selectedItems = [];
  }

  state.selectedType = null;
  state.selectedId = null;
  state.highlightedConnectionId = null;
  state.highlightedPortKey = null;

  if (typeof renderDetailsEmpty === "function") {
    renderDetailsEmpty();
  }

  canvas.style.cursor = "crosshair";
}

function updateSelectionBox(point) {
  if (!selectionDragging) return;

  const box = normalizeRect(
    selectionStartX,
    selectionStartY,
    point.x,
    point.y
  );

  if (box.w > 4 || box.h > 4) {
    selectionMoved = true;
  }

  state.selectionBox = box;
}

function finishSelectionBox() {
  if (!selectionDragging) return;

  ensureSelectionState();

  const box = state.selectionBox;
  const tinyClick = !selectionMoved || !box || (box.w < 5 && box.h < 5);

  if (tinyClick) {
    const device = hitDevice(selectionStartX, selectionStartY);

    if (device) {
      state.selectionBox = null;
      selectionDragging = false;
      selectionAddMode = false;
      selectionMoved = false;

      toggleMultiSelectionItem("device", device.id);
      return;
    }

    const zone = hitZone(selectionStartX, selectionStartY);

    if (zone) {
      state.selectionBox = null;
      selectionDragging = false;
      selectionAddMode = false;
      selectionMoved = false;

      toggleMultiSelectionItem("zone", zone.id);
      return;
    }

    if (!selectionAddMode) {
      setMultiSelection([]);
    }
  } else {
    const found = getSelectionBoxItems(box);

    if (selectionAddMode && state.selectedItems.length) {
      setMultiSelection([...state.selectedItems, ...found]);
    } else {
      setMultiSelection(found);
    }
  }

  state.selectionBox = null;
  selectionDragging = false;
  selectionAddMode = false;
  selectionMoved = false;

  refreshSidebar();

  const count = state.selectedItems.length;
  setStatus(count ? count + " item(s) selected" : "Selection cleared");
}

function isCanvasItemSelected(type, id) {
  const singleSelected =
    state.selectedType === type &&
    Number(state.selectedId) === Number(id);

  return singleSelected || isMultiSelected(type, id);
}

function getSelectedSceneObjects() {
  const items = getActiveSelectableItems();

  return items
    .map(item => {
      if (item.type === "device") {
        const device = state.devices.find(d => Number(d.id) === Number(item.id));
        return device ? { type: "device", item: device } : null;
      }

      if (item.type === "zone") {
        const zone = state.zones.find(z => Number(z.id) === Number(item.id));
        return zone ? { type: "zone", item: zone } : null;
      }

      return null;
    })
    .filter(Boolean);
}

function beginDragSelectedGroup(hitItem, point) {
  const selectedObjects = getSelectedSceneObjects();

  if (!selectedObjects.length) return false;

  const hitIsSelected =
    hitItem &&
    isMultiSelected(hitItem.type, hitItem.id);

  if (!hitIsSelected || selectedObjects.length < 2) return false;

  pushHistory();

  startZoneMoveTrackingForDevices(
    selectedObjects
      .filter(entry => entry.type === "device")
      .map(entry => entry.item)
  );

  draggingSelectionGroup = {
    startX: point.x,
    startY: point.y,
    objects: selectedObjects.map(entry => ({
      type: entry.type,
      id: entry.item.id,
      startX: entry.item.x,
      startY: entry.item.y
    }))
  };

  canvas.style.cursor = "move";
  return true;
}

function updateDragSelectedGroup(point) {
  if (!draggingSelectionGroup) return false;

  const dx = point.x - draggingSelectionGroup.startX;
  const dy = point.y - draggingSelectionGroup.startY;

  draggingSelectionGroup.objects.forEach(entry => {
    const collection = entry.type === "device" ? state.devices : state.zones;
    const item = collection.find(obj => Number(obj.id) === Number(entry.id));

    if (!item) return;

    item.x = entry.startX + dx;
    item.y = entry.startY + dy;
  });

  return true;
}

function getClipboardSourceItems() {
  const selectedObjects = getSelectedSceneObjects();

  return selectedObjects.filter(entry =>
    entry.type === "device" || entry.type === "zone"
  );
}

function cloneDeviceForClipboard(device) {
  const clean = JSON.parse(JSON.stringify(device));

  delete clean.id;
  clean.ports = [];

  return clean;
}

function cloneZoneForClipboard(zone) {
  const clean = JSON.parse(JSON.stringify(zone));
  delete clean.id;
  return clean;
}

function copySelectedItems(mode = "copy") {
  const source = getClipboardSourceItems();

  if (!source.length) {
    setStatus("⚠ Select devices or zones first");
    return false;
  }

  const devices = [];
  const zones = [];

  source.forEach(entry => {
    if (entry.type === "device") {
      devices.push(cloneDeviceForClipboard(entry.item));
    }

    if (entry.type === "zone") {
      zones.push(cloneZoneForClipboard(entry.item));
    }
  });

  state.clipboard = {
    devices,
    zones,
    pasteCount: 0
  };

  state.clipboardMode = mode;

  setStatus(
    (mode === "cut" ? "Cut" : "Copied") +
    " " +
    source.length +
    " item(s)"
  );

  return true;
}

function deleteSelectedItems() {
  const selected = getActiveSelectableItems();

  if (!selected.length) {
    setStatus("⚠ Nothing selected");
    return false;
  }

  const deviceIds = selected
    .filter(item => item.type === "device")
    .map(item => Number(item.id));

  const zoneIds = selected
    .filter(item => item.type === "zone")
    .map(item => Number(item.id));

  pushHistory();

  if (deviceIds.length) {
    state.devices = state.devices.filter(device =>
      !deviceIds.includes(Number(device.id))
    );

    state.connections = state.connections.filter(connection =>
      !deviceIds.includes(Number(connection.from)) &&
      !deviceIds.includes(Number(connection.to))
    );
  }

  if (zoneIds.length) {
    state.zones = state.zones.filter(zone =>
      !zoneIds.includes(Number(zone.id))
    );
  }

  state.selectedType = null;
  state.selectedId = null;
  state.selectedItems = [];
  state.highlightedConnectionId = null;
  state.highlightedPortKey = null;

  if (typeof renderDetailsEmpty === "function") {
    renderDetailsEmpty();
  }

  refreshSidebar();

  setStatus("Deleted " + selected.length + " item(s)");
  return true;
}

function cutSelectedItems() {
  if (!copySelectedItems("cut")) return;

  deleteSelectedItems();
  state.clipboardMode = "cut";
}

function pasteClipboardItems() {
  ensureSelectionState();

  if (!state.clipboard) {
    setStatus("⚠ Clipboard is empty");
    return;
  }

  const devices = Array.isArray(state.clipboard.devices)
    ? state.clipboard.devices
    : [];

  const zones = Array.isArray(state.clipboard.zones)
    ? state.clipboard.zones
    : [];

  if (!devices.length && !zones.length) {
    setStatus("⚠ Clipboard is empty");
    return;
  }

  pushHistory();

  state.clipboard.pasteCount = Number(state.clipboard.pasteCount || 0) + 1;

  const offset = 44 * state.clipboard.pasteCount;
  const newSelection = [];

  zones.forEach(zoneTemplate => {
    const zone = JSON.parse(JSON.stringify(zoneTemplate));

    zone.id = uid("zone");
    zone.name = zone.name ? zone.name + " Copy" : "Zone Copy";
    zone.x = Number(zone.x || 0) + offset;
    zone.y = Number(zone.y || 0) + offset;

    state.zones.push(zone);

    newSelection.push({
      type: "zone",
      id: zone.id
    });
  });

  devices.forEach(deviceTemplate => {
    const device = JSON.parse(JSON.stringify(deviceTemplate));

    device.id = uid("device");
    device.name = device.name ? device.name + " Copy" : "Device Copy";
    device.x = Number(device.x || 0) + offset;
    device.y = Number(device.y || 0) + offset;

    const portCount =
      Number(device.portCount) ||
      (
        Array.isArray(device.ports) && device.ports.length
          ? device.ports.length
          : 1
      );

    device.portCount = portCount;
    device.ports = [];

    if (typeof syncDevicePorts === "function") {
      syncDevicePorts(device, portCount);
    }

    state.devices.push(device);

    newSelection.push({
      type: "device",
      id: device.id
    });
  });

  setMultiSelection(newSelection);
  refreshSidebar();

  setStatus("Pasted " + newSelection.length + " item(s)");
}

function selectAllCanvasItems() {
  const items = [
    ...state.zones.map(zone => ({
      type: "zone",
      id: zone.id
    })),
    ...state.devices.map(device => ({
      type: "device",
      id: device.id
    }))
  ];

  setMultiSelection(items);
  refreshSidebar();

  setStatus(items.length + " item(s) selected");
}

function isTypingInFormElement(e) {
  const target = e.target;

  if (!target) return false;

  const tag = String(target.tagName || "").toLowerCase();

  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}

document.addEventListener("keydown", e => {
  if (isTypingInFormElement(e)) return;

  const command = e.ctrlKey || e.metaKey;
  const key = String(e.key || "").toLowerCase();

  if (command && key === "z" && !e.shiftKey) {
    e.preventDefault();

    if (typeof undo === "function") {
      undo();
      return;
    }

    if (typeof undoHistory === "function") {
      undoHistory();
      return;
    }

    setStatus("⚠ Undo function not found");
    return;
  }

  if (command && key === "a") {
    e.preventDefault();
    selectAllCanvasItems();
    return;
  }

  if (command && key === "c") {
    e.preventDefault();
    copySelectedItems("copy");
    return;
  }

  if (command && key === "x") {
    e.preventDefault();
    cutSelectedItems();
    return;
  }

  if (command && key === "v") {
    e.preventDefault();
    pasteClipboardItems();
    return;
  }

  if (key === "delete" || key === "backspace") {
    const selected = getActiveSelectableItems();

    if (selected.length) {
      e.preventDefault();
      deleteSelectedItems();
    }

    return;
  }

  if (key === "escape") {
    e.preventDefault();
    clearSelection();
    setStatus("Selection cleared");
  }
});

/* =========================
   HIT TESTING
========================= */

function hitDevice(x, y) {
  for (let i = state.devices.length - 1; i >= 0; i--) {
    const device = state.devices[i];
    const center = getDeviceCenter(device);
    const rotation = device.rotation || 0;

    const point = rotatePointAroundCenter(
      x,
      y,
      center.x,
      center.y,
      rotation
    );

    if (
      point.x >= device.x &&
      point.x <= device.x + device.w &&
      point.y >= device.y &&
      point.y <= device.y + device.h
    ) {
      return device;
    }
  }

  return null;
}

function hitZoneResize(x, y) {
  for (let i = state.zones.length - 1; i >= 0; i--) {
    const zone = state.zones[i];

    if (
      x >= zone.x + zone.w - 20 &&
      x <= zone.x + zone.w &&
      y >= zone.y + zone.h - 20 &&
      y <= zone.y + zone.h
    ) {
      return zone;
    }
  }

  return null;
}

function hitZone(x, y) {
  for (let i = state.zones.length - 1; i >= 0; i--) {
    const zone = state.zones[i];

    if (
      x >= zone.x &&
      x <= zone.x + zone.w &&
      y >= zone.y &&
      y <= zone.y + zone.h
    ) {
      return zone;
    }
  }

  return null;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;

  if (!length) return Math.hypot(px - ax, py - ay);

  let t = ((px - ax) * dx + (py - ay) * dy) / length;
  t = Math.max(0, Math.min(1, t));

  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;

  if (!length) {
    return {
      x: ax,
      y: ay,
      t: 0,
      distance: Math.hypot(px - ax, py - ay)
    };
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / length;
  t = Math.max(0, Math.min(1, t));

  const x = ax + t * dx;
  const y = ay + t * dy;

  return {
    x,
    y,
    t,
    distance: Math.hypot(px - x, py - y)
  };
}
/* =========================
   PHASE 8.3 — SMART LINE SNAP
========================= */

function getSmartSnapThresholds() {
  return {
    snap: 14 / Math.max(state.zoom || 1, 0.35) + 4,
    release: 34 / Math.max(state.zoom || 1, 0.35) + 8
  };
}

function getConnectionStoredEndpointPoints(connection) {
  const fromDevice = state.devices.find(device => Number(device.id) === Number(connection.from));
  const toDevice = state.devices.find(device => Number(device.id) === Number(connection.to));

  if (!fromDevice || !toDevice) return null;

  const fromSide = connection.fromSide || "auto";
  const toSide = connection.toSide || "auto";

  const start = getDeviceAnchor(fromDevice, toDevice, fromSide);
  const end = getDeviceAnchor(toDevice, fromDevice, toSide);

  return {
    start: {
      x: start[0],
      y: start[1]
    },
    end: {
      x: end[0],
      y: end[1]
    }
  };
}

function getBendNeighborPoints(connection, index) {
  if (!connection || !Array.isArray(connection.points)) return null;

  const endpoints = getConnectionStoredEndpointPoints(connection);

  if (!endpoints) return null;

  const previous =
    index > 0
      ? connection.points[index - 1]
      : endpoints.start;

  const next =
    index < connection.points.length - 1
      ? connection.points[index + 1]
      : endpoints.end;

  if (!previous || !next) return null;

  return {
    previous,
    next
  };
}

function buildSmartSnapCandidates(rawPoint, neighbors) {
  const previous = neighbors.previous;
  const next = neighbors.next;

  return [
    {
      type: "right-angle previous-x next-y",
      x: previous.x,
      y: next.y,
      score: Math.max(
        Math.abs(rawPoint.x - previous.x),
        Math.abs(rawPoint.y - next.y)
      )
    },
    {
      type: "right-angle next-x previous-y",
      x: next.x,
      y: previous.y,
      score: Math.max(
        Math.abs(rawPoint.x - next.x),
        Math.abs(rawPoint.y - previous.y)
      )
    },
    {
      type: "vertical previous",
      x: previous.x,
      y: rawPoint.y,
      score: Math.abs(rawPoint.x - previous.x)
    },
    {
      type: "vertical next",
      x: next.x,
      y: rawPoint.y,
      score: Math.abs(rawPoint.x - next.x)
    },
    {
      type: "horizontal previous",
      x: rawPoint.x,
      y: previous.y,
      score: Math.abs(rawPoint.y - previous.y)
    },
    {
      type: "horizontal next",
      x: rawPoint.x,
      y: next.y,
      score: Math.abs(rawPoint.y - next.y)
    }
  ];
}

function applySmartBendSnap(rawPoint, bendDrag) {
  if (!bendDrag || !bendDrag.connection) {
    smartSnapActive = false;
    smartSnapType = "";
    return rawPoint;
  }

  const neighbors = getBendNeighborPoints(bendDrag.connection, bendDrag.index);

  if (!neighbors) {
    smartSnapActive = false;
    smartSnapType = "";
    return rawPoint;
  }

  const thresholds = getSmartSnapThresholds();
  const limit = bendDrag.snapLocked ? thresholds.release : thresholds.snap;

  const candidates = buildSmartSnapCandidates(rawPoint, neighbors)
    .filter(candidate => candidate.score <= limit)
    .sort((a, b) => a.score - b.score);

  const best = candidates[0];

  if (!best) {
    bendDrag.snapLocked = false;
    bendDrag.snapType = "";
    smartSnapActive = false;
    smartSnapType = "";
    return rawPoint;
  }

  bendDrag.snapLocked = true;
  bendDrag.snapType = best.type;

  smartSnapActive = true;
  smartSnapType = best.type;

  return {
    x: best.x,
    y: best.y
  };
}
function hitBendPoint(x, y) {
  for (let i = state.connections.length - 1; i >= 0; i--) {
    const connection = state.connections[i];

    if (!Array.isArray(connection.points)) {
      connection.points = [];
    }

    for (let p = connection.points.length - 1; p >= 0; p--) {
      const point = connection.points[p];
      const distance = Math.hypot(x - point.x, y - point.y);

      if (distance <= 12 / state.zoom + 6) {
        return {
          connection,
          index: p,
          point
        };
      }
    }
  }

  return null;
}

/* =========================
   CONNECTION ROUTING
========================= */

function getDeviceAnchor(device, otherDevice, side = "auto") {
  const cx = device.x + device.w / 2;
  const cy = device.y + device.h / 2;

  if (side === "center") return [cx, cy];
  if (side === "top") return [cx, device.y];
  if (side === "right") return [device.x + device.w, cy];
  if (side === "bottom") return [cx, device.y + device.h];
  if (side === "left") return [device.x, cy];

  const ox = otherDevice.x + otherDevice.w / 2;
  const oy = otherDevice.y + otherDevice.h / 2;

  const dx = ox - cx;
  const dy = oy - cy;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0
      ? [device.x + device.w, cy]
      : [device.x, cy];
  }

  return dy > 0
    ? [cx, device.y + device.h]
    : [cx, device.y];
}

function routePoints(fromDevice, toDevice) {
  const start = getDeviceAnchor(fromDevice, toDevice);
  const end = getDeviceAnchor(toDevice, fromDevice);

  const ax = start[0];
  const ay = start[1];
  const bx = end[0];
  const by = end[1];

  const dx = Math.abs(bx - ax);
  const dy = Math.abs(by - ay);

  if (dx > dy) {
    const midX = (ax + bx) / 2;

    return [
      [ax, ay],
      [midX, ay],
      [midX, by],
      [bx, by]
    ];
  }

  const midY = (ay + by) / 2;

  return [
    [ax, ay],
    [ax, midY],
    [bx, midY],
    [bx, by]
  ];
}

function getConnectionPoints(connection, fromDevice, toDevice) {
  const isForward = fromDevice.id === connection.from;

  const fromSide = isForward
    ? connection.fromSide || "auto"
    : connection.toSide || "auto";

  const toSide = isForward
    ? connection.toSide || "auto"
    : connection.fromSide || "auto";

  const start = getDeviceAnchor(fromDevice, toDevice, fromSide);
  const end = getDeviceAnchor(toDevice, fromDevice, toSide);

  if (!Array.isArray(connection.points)) {
    connection.points = [];
  }

  let customPoints = connection.points.map(point => [point.x, point.y]);

  if (!isForward) {
    customPoints = customPoints.reverse();
  }

  if (customPoints.length) {
    return [
      start,
      ...customPoints,
      end
    ];
  }

  return routePointsWithAnchors(start, end);
}

function routePointsWithAnchors(start, end) {
  const ax = start[0];
  const ay = start[1];
  const bx = end[0];
  const by = end[1];

  const dx = Math.abs(bx - ax);
  const dy = Math.abs(by - ay);

  if (dx > dy) {
    const midX = (ax + bx) / 2;

    return [
      [ax, ay],
      [midX, ay],
      [midX, by],
      [bx, by]
    ];
  }

  const midY = (ay + by) / 2;

  return [
    [ax, ay],
    [ax, midY],
    [bx, midY],
    [bx, by]
  ];
}

function findClosestConnectionSegment(x, y, connection) {
  const fromDevice = state.devices.find(device => device.id === connection.from);
  const toDevice = state.devices.find(device => device.id === connection.to);

  if (!fromDevice || !toDevice) return null;

  const points = getConnectionPoints(connection, fromDevice, toDevice);
  let best = null;

  for (let i = 0; i < points.length - 1; i++) {
    const hit = closestPointOnSegment(
      x,
      y,
      points[i][0],
      points[i][1],
      points[i + 1][0],
      points[i + 1][1]
    );

    if (!best || hit.distance < best.distance) {
      best = {
        segmentIndex: i,
        x: hit.x,
        y: hit.y,
        distance: hit.distance
      };
    }
  }

  return best;
}

function addBendPointToConnection(connection, x, y) {
  if (!connection) return;

  if (!Array.isArray(connection.points)) {
    connection.points = [];
  }

  const closest = findClosestConnectionSegment(x, y, connection);

  if (!closest) return;

  pushHistory();

  const insertIndex = Math.max(0, closest.segmentIndex);

  connection.points.splice(insertIndex, 0, {
    x: closest.x,
    y: closest.y
  });

  state.highlightedConnectionId = connection.id;
  state.highlightedPortKey = null;
  clearMultiSelectionOnly();

  selectItem("connection", connection.id);
  setStatus("Bend point added");
}

function deleteBendPoint(hit) {
  if (!hit || !hit.connection) return;

  pushHistory();

  hit.connection.points.splice(hit.index, 1);

  state.highlightedConnectionId = hit.connection.id;
  state.highlightedPortKey = null;
  clearMultiSelectionOnly();

  selectItem("connection", hit.connection.id);
  setStatus("Bend point deleted");
}

function hitConnection(x, y) {
  for (let i = state.connections.length - 1; i >= 0; i--) {
    const connection = state.connections[i];
    const fromDevice = state.devices.find(device => device.id === connection.from);
    const toDevice = state.devices.find(device => device.id === connection.to);

    if (!fromDevice || !toDevice) continue;

    const points = getConnectionPoints(connection, fromDevice, toDevice);

    for (let p = 0; p < points.length - 1; p++) {
      const distance = distanceToSegment(
        x,
        y,
        points[p][0],
        points[p][1],
        points[p + 1][0],
        points[p + 1][1]
      );

      if (distance <= 10 / state.zoom + 6) return connection;
    }
  }

  return null;
}

/* =========================
   CANVAS EVENTS
========================= */

canvas.addEventListener("mousedown", e => {
  if (e.button !== 0) return;

  const point = worldFromMouse(e);

  if (e.shiftKey) {
    startSelectionBox(point, e.ctrlKey || e.metaKey);
    return;
  }

  const bendHit = hitBendPoint(point.x, point.y);

  if (bendHit) {
    pushHistory();

    draggingBendPoint = {
      ...bendHit,
      startX: bendHit.point.x,
      startY: bendHit.point.y,
      snapLocked: false,
      snapType: ""
    };

    smartSnapActive = false;
    smartSnapType = "";

    state.highlightedConnectionId = bendHit.connection.id;
    state.highlightedPortKey = null;
    clearMultiSelectionOnly();

    selectItem("connection", bendHit.connection.id);
    canvas.style.cursor = "move";
    return;
  }

  const resizeTarget = hitZoneResize(point.x, point.y);

  if (resizeTarget) {
    pushHistory();

    startZoneMoveTrackingForDevices(state.devices);

    clearMultiSelectionOnly();

    resizingZone = {
      zone: resizeTarget,
      startX: e.clientX,
      startY: e.clientY,
      startW: resizeTarget.w,
      startH: resizeTarget.h
    };

    selectItem("zone", resizeTarget.id);
    return;
  }

  const device = hitDevice(point.x, point.y);

  if (device) {
    const startedGroupDrag = beginDragSelectedGroup(
      {
        type: "device",
        id: device.id
      },
      point
    );

    if (startedGroupDrag) return;

    pushHistory();

    startZoneMoveTrackingForDevices([device]);

    clearMultiSelectionOnly();

    dragging = device;
    dragOffsetX = point.x - device.x;
    dragOffsetY = point.y - device.y;

    selectItem("device", device.id);
    return;
  }

  const connection = hitConnection(point.x, point.y);

  if (connection) {
    clearMultiSelectionOnly();

    state.highlightedConnectionId = connection.id;
    state.highlightedPortKey = null;

    selectItem("connection", connection.id);
    return;
  }

  const zone = hitZone(point.x, point.y);

  if (zone) {
    const startedGroupDrag = beginDragSelectedGroup(
      {
        type: "zone",
        id: zone.id
      },
      point
    );

    if (startedGroupDrag) return;

    pushHistory();

    startZoneMoveTrackingForDevices(state.devices);

    clearMultiSelectionOnly();

    dragging = zone;
    dragOffsetX = point.x - zone.x;
    dragOffsetY = point.y - zone.y;

    selectItem("zone", zone.id);
    return;
  }

  clearSelection();

  panning = true;
  panStartX = e.clientX - state.viewX;
  panStartY = e.clientY - state.viewY;
});

canvas.addEventListener("dblclick", e => {
  const point = worldFromMouse(e);
  const connection = hitConnection(point.x, point.y);

  if (connection) {
    addBendPointToConnection(connection, point.x, point.y);
  }
});

canvas.addEventListener("contextmenu", e => {
  const point = worldFromMouse(e);
  const bendHit = hitBendPoint(point.x, point.y);

  if (bendHit) {
    e.preventDefault();
    deleteBendPoint(bendHit);
  }
});

canvas.addEventListener("mousemove", e => {
  const point = worldFromMouse(e);

  if (selectionDragging) {
    updateSelectionBox(point);
    return;
  }

  if (draggingSelectionGroup) {
    updateDragSelectedGroup(point);
    return;
  }

  if (draggingBendPoint) {
    const snappedPoint = applySmartBendSnap(point, draggingBendPoint);

    draggingBendPoint.point.x = snappedPoint.x;
    draggingBendPoint.point.y = snappedPoint.y;

    canvas.style.cursor = smartSnapActive ? "crosshair" : "move";
    return;
  }

  if (resizingZone) {
    const dx = (e.clientX - resizingZone.startX) / state.zoom;
    const dy = (e.clientY - resizingZone.startY) / state.zoom;

    resizingZone.zone.w = Math.max(140, resizingZone.startW + dx);
    resizingZone.zone.h = Math.max(100, resizingZone.startH + dy);
    return;
  }

  if (dragging) {
    dragging.x = point.x - dragOffsetX;
    dragging.y = point.y - dragOffsetY;
    return;
  }

  if (panning) {
    state.viewX = e.clientX - panStartX;
    state.viewY = e.clientY - panStartY;
    updateZoomText();
    return;
  }

  canvas.style.cursor = e.shiftKey
    ? "crosshair"
    : hitBendPoint(point.x, point.y)
      ? "move"
      : hitZoneResize(point.x, point.y)
        ? "se-resize"
        : hitDevice(point.x, point.y) || hitZone(point.x, point.y) || hitConnection(point.x, point.y)
          ? "grab"
          : "default";
});

canvas.addEventListener("mouseup", () => {
  if (selectionDragging) {
    finishSelectionBox();
  }

  finishZoneMoveTracking();

  dragging = null;
  draggingSelectionGroup = null;
  draggingBendPoint = null;
  smartSnapActive = false;
  smartSnapType = "";
  resizingZone = null;
  panning = false;

  refreshSidebar();
});

canvas.addEventListener("mouseleave", () => {
  if (selectionDragging) {
    finishSelectionBox();
  }

  finishZoneMoveTracking();

  dragging = null;
  draggingSelectionGroup = null;
  draggingBendPoint = null;
  smartSnapActive = false;
  smartSnapType = "";
  resizingZone = null;
  panning = false;
});

canvas.addEventListener(
  "wheel",
  e => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.0013);
    const oldZoom = state.zoom;
    const newZoom = Math.min(Math.max(oldZoom * factor, 0.35), 2.4);

    state.viewX = mx - ((mx - state.viewX) / oldZoom) * newZoom;
    state.viewY = my - ((my - state.viewY) / oldZoom) * newZoom;
    state.zoom = newZoom;

    updateZoomText();
    setStatus("Zoom: " + Math.round(state.zoom * 100) + "%");
  },
  { passive: false }
);

/* =========================
   DRAWING HELPERS
========================= */

function drawGrid() {
  const size = 30 * state.zoom;
  const xStart = state.viewX % size;
  const yStart = state.viewY % size;

  ctx.save();
  ctx.strokeStyle = "#172234";
  ctx.lineWidth = 0.6;

  for (let x = xStart; x < canvas.width; x += size) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = yStart; y < canvas.height; y += size) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.restore();
}

function pointAlong(points, t) {
  let lengths = [];
  let total = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const length = Math.hypot(
      points[i + 1][0] - points[i][0],
      points[i + 1][1] - points[i][1]
    );

    lengths.push(length);
    total += length;
  }

  if (!total) return points[0];

  let target = total * t;
  let passed = 0;

  for (let i = 0; i < lengths.length; i++) {
    if (passed + lengths[i] >= target) {
      const k = (target - passed) / lengths[i];

      return [
        points[i][0] + (points[i + 1][0] - points[i][0]) * k,
        points[i][1] + (points[i + 1][1] - points[i][1]) * k
      ];
    }

    passed += lengths[i];
  }

  return points[points.length - 1];
}

function drawPolyline(points) {
  ctx.beginPath();

  points.forEach((point, i) => {
    if (i) {
      ctx.lineTo(point[0], point[1]);
    } else {
      ctx.moveTo(point[0], point[1]);
    }
  });

  ctx.stroke();
}

function drawConnection(connection, index, timestamp) {
  const fromDevice = state.devices.find(device => device.id === connection.from);
  const toDevice = state.devices.find(device => device.id === connection.to);

  if (!fromDevice || !toDevice || connection.from === connection.to) return;

  const selected =
    state.selectedType === "connection" && state.selectedId === connection.id;

  const highlighted =
    Number(state.highlightedConnectionId) === Number(connection.id);

  const active = selected || highlighted;

  const points = getConnectionPoints(connection, fromDevice, toDevice);
  const color = getConnectionColor(connection);
  const scale = state.boxScale || 1;

  if (highlighted) {
    const pulse = 0.55 + Math.sin(timestamp / 180) * 0.18;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = pulse;
    ctx.lineWidth = 8.5 * scale;
    ctx.shadowColor = color;
    ctx.shadowBlur = 24 * scale;

    if (connection.style === "dashed" || connection.status === "blocked") {
      ctx.setLineDash([8 * scale, 7 * scale]);
    }

    drawPolyline(points);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 3.2 * scale;

    if (connection.style === "dashed" || connection.status === "blocked") {
      ctx.setLineDash([8 * scale, 7 * scale]);
    }

    drawPolyline(points);
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha =
    active
      ? 0.95
      : connection.status === "down"
        ? 0.5
        : 0.4;

  ctx.lineWidth =
    (
      active
        ? 3.8
        : connection.status === "warning"
          ? 2.7
          : 2
    ) * scale;

  if (connection.style === "dashed" || connection.status === "blocked") {
    ctx.setLineDash([7 * scale, 6 * scale]);
  }

  if (active) {
    ctx.shadowColor = color;
    ctx.shadowBlur = highlighted ? 18 * scale : 12 * scale;
  }

  drawPolyline(points);
  ctx.restore();

  if (active && Array.isArray(connection.points)) {
    connection.points.forEach(point => {
      ctx.save();
      ctx.fillStyle = "#020c1b";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * scale;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10 * scale;

      ctx.beginPath();
      ctx.arc(point.x, point.y, 7 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    });
  }
}

/* =========================
   PACKET ANIMATION
========================= */

function findWanDevice() {
  return state.devices.find(device => {
    const name = device.name.toLowerCase();
    const sub = (device.sub || "").toLowerCase();

    return (
      name.includes("internet") ||
      name.includes("wan") ||
      sub.includes("wan") ||
      sub.includes("isp")
    );
  });
}

function getConnectionBetween(aId, bId) {
  return state.connections.find(connection =>
    (connection.from === aId && connection.to === bId) ||
    (connection.from === bId && connection.to === aId)
  );
}

function getDeviceNeighbors(deviceId) {
  return state.connections
    .filter(connection =>
      connection.status !== "down" &&
      connection.status !== "blocked" &&
      (connection.from === deviceId || connection.to === deviceId)
    )
    .map(connection => connection.from === deviceId ? connection.to : connection.from);
}

function findPathToWan(startId, wanId) {
  const queue = [[startId]];
  const visited = new Set([startId]);

  while (queue.length) {
    const path = queue.shift();
    const current = path[path.length - 1];

    if (current === wanId) return path;

    const neighbors = getDeviceNeighbors(current);

    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push([...path, neighborId]);
      }
    });
  }

  return null;
}

function getPacketStartDevices(wanId) {
  const degree = {};

  state.devices.forEach(device => {
    degree[device.id] = 0;
  });

  state.connections.forEach(connection => {
    if (connection.status === "down" || connection.status === "blocked") return;

    degree[connection.from] = (degree[connection.from] || 0) + 1;
    degree[connection.to] = (degree[connection.to] || 0) + 1;
  });

  return state.devices.filter(device => {
    if (device.id === wanId) return false;

    const name = device.name.toLowerCase();
    const type = (device.type || "").toLowerCase();

    if (name.includes("internet")) return false;
    if (name.includes("wan")) return false;
    if (name.includes("switch")) return false;
    if (name.includes("gateway")) return false;
    if (name.includes("router")) return false;

    if (type.includes("switch")) return false;
    if (type.includes("firewall")) return false;
    if (type.includes("router")) return false;

    return degree[device.id] >= 1;
  });
}

function flattenRouteSegments(path) {
  const segments = [];

  for (let i = 0; i < path.length - 1; i++) {
    const fromDevice = state.devices.find(device => device.id === path[i]);
    const toDevice = state.devices.find(device => device.id === path[i + 1]);
    const connection = getConnectionBetween(path[i], path[i + 1]);

    if (!fromDevice || !toDevice || !connection) continue;

    const routedPoints = getConnectionPoints(connection, fromDevice, toDevice);
    const color = getConnectionColor(connection);

    const fromCenter = [
      fromDevice.x + fromDevice.w / 2,
      fromDevice.y + fromDevice.h / 2
    ];

    const toCenter = [
      toDevice.x + toDevice.w / 2,
      toDevice.y + toDevice.h / 2
    ];

    const points = [
      fromCenter,
      ...routedPoints,
      toCenter
    ];

    for (let p = 0; p < points.length - 1; p++) {
      const from = points[p];
      const to = points[p + 1];
      const length = Math.hypot(to[0] - from[0], to[1] - from[1]);

      if (length > 0) {
        segments.push({
          from,
          to,
          length,
          color
        });
      }
    }
  }

  return segments;
}

function pointAlongSegments(segments, t) {
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);

  if (!total || !segments.length) return null;

  let target = total * t;
  let passed = 0;

  for (const segment of segments) {
    if (passed + segment.length >= target) {
      const k = (target - passed) / segment.length;

      return {
        x: segment.from[0] + (segment.to[0] - segment.from[0]) * k,
        y: segment.from[1] + (segment.to[1] - segment.from[1]) * k,
        color: segment.color
      };
    }

    passed += segment.length;
  }

  const last = segments[segments.length - 1];

  return {
    x: last.to[0],
    y: last.to[1],
    color: last.color
  };
}

function drawNetworkPackets(timestamp = 0) {
  const wanDevice = findWanDevice();

  if (!wanDevice) return;

  const startDevices = getPacketStartDevices(wanDevice.id);
  const scale = state.boxScale || 1;

  startDevices.forEach((device, index) => {
    const path = findPathToWan(device.id, wanDevice.id);

    if (!path || path.length < 2) return;

    const segments = flattenRouteSegments(path);

    if (!segments.length) return;

    const baseSpeed = 9000;
    const speed = baseSpeed / Math.max(state.packetSpeed || 0.55, 0.05);
    const raw = ((timestamp + index * 950) % speed) / speed;

    const t = raw < 0.5 ? raw * 2 : 2 - raw * 2;

    const eased =
      t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const pos = pointAlongSegments(segments, eased);

    if (!pos) return;

    ctx.save();

    ctx.globalAlpha = 0.95;
    ctx.shadowBlur = 16 * scale;
    ctx.shadowColor = pos.color;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 4.4 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = pos.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 14 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

/* =========================
   ZONES / DEVICES
========================= */

function applyZoneLineStyle(zone) {
  const style = zone.borderStyle || "dashed";
  const scale = state.boxScale || 1;

  if (style === "solid") ctx.setLineDash([]);
  if (style === "dashed") ctx.setLineDash([7 * scale, 5 * scale]);
  if (style === "dotted") ctx.setLineDash([2 * scale, 6 * scale]);
}

function drawZone(zone) {
  const selected = isCanvasItemSelected("zone", zone.id);
  const color = zone.color;
  const scale = state.boxScale || 1;
  const borderWidth = (zone.borderWidth || 1.5) * scale;
  const opacity = zone.opacity ?? 0.06;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = selected ? borderWidth + 1.4 : borderWidth;
  applyZoneLineStyle(zone);
  ctx.globalAlpha = selected ? 0.95 : 0.45;

  if (selected) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 * scale;
  }

  roundRect(zone.x, zone.y, zone.w, zone.h, 14 * scale);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = selected ? Math.min(opacity + 0.07, 0.32) : opacity;
  ctx.fillStyle = color;

  roundRect(zone.x, zone.y, zone.w, zone.h, 14 * scale);
  ctx.fill();

  ctx.setLineDash([]);
  ctx.globalAlpha = selected ? 0.95 : 0.72;
  ctx.fillStyle = color;
  ctx.font = "700 " + Math.max(10, state.fontSize * 0.75) + "px \"JetBrains Mono\", monospace";
  ctx.textAlign = "left";
  ctx.fillText(zone.name.toUpperCase(), zone.x + 14 * scale, zone.y + 22 * scale);

  ctx.globalAlpha = selected ? 0.8 : 0.28;
  ctx.beginPath();
  ctx.moveTo(zone.x + zone.w - 18 * scale, zone.y + zone.h);
  ctx.lineTo(zone.x + zone.w, zone.y + zone.h);
  ctx.lineTo(zone.x + zone.w, zone.y + zone.h - 18 * scale);
  ctx.fill();

  ctx.restore();
}

function drawDevice(device) {
  const selected = isCanvasItemSelected("device", device.id);

  const color = getDeviceColor(device);
  const statusColor = STATUS_COLOR[device.status] || color;
  const scale = state.boxScale || 1;
  const rotation = device.rotation || 0;

  const centerX = device.x + device.w / 2;
  const centerY = device.y + device.h / 2;

  ctx.save();

  ctx.translate(centerX, centerY);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.translate(-centerX, -centerY);

  if (selected) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 18 * scale;
  }

  ctx.fillStyle = "#0d1117";
  roundRect(device.x, device.y, device.w, device.h, 12 * scale);
  ctx.fill();

  ctx.strokeStyle = selected ? color : color + "aa";
  ctx.lineWidth = selected ? 2.7 * scale : 1.5 * scale;
  roundRect(device.x, device.y, device.w, device.h, 12 * scale);
  ctx.stroke();

  ctx.globalAlpha = selected ? 0.14 : 0.08;
  ctx.fillStyle = color;
  roundRect(device.x, device.y, device.w, device.h, 12 * scale);
  ctx.fill();
  ctx.globalAlpha = 1;

  drawIconTile(device, color);

  const hasRightIcon = Boolean(device.iconRight);
  const textMax = hasRightIcon ? device.w - 170 * scale : device.w - 105 * scale;

  ctx.fillStyle = color;
  ctx.font = "700 " + state.fontSize + "px \"Inter\", sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(device.name, device.x + 88 * scale, device.y + device.h / 2 - 9 * scale, textMax);

  if (device.sub) {
    ctx.fillStyle = color + "cc";
    ctx.font = "500 " + Math.max(10, state.fontSize * 0.75) + "px \"Inter\", sans-serif";
    ctx.fillText(
      device.sub.slice(0, hasRightIcon ? 30 : 44),
      device.x + 88 * scale,
      device.y + device.h / 2 + 17 * scale,
      textMax
    );
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = statusColor;
  ctx.beginPath();
  ctx.arc(device.x + device.w - 14 * scale, device.y + 14 * scale, 5 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawIconTile(device, color) {
  const scale = state.boxScale || 1;
  const tileX = device.x + 18 * scale;
  const tileY = device.y + 19 * scale;
  const tileSize = 58 * scale;
  const icon = getDeviceIconLeft(device);

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.035)";
  ctx.strokeStyle = color + "cc";
  ctx.lineWidth = 1.3 * scale;

  roundRect(tileX, tileY, tileSize, tileSize, 13 * scale);
  ctx.fill();
  ctx.stroke();

  drawTablerIcon(icon, tileX + 14 * scale, tileY + 14 * scale, 30 * scale, color);
  ctx.restore();

  if (device.iconRight) {
    drawRightIconTile(device, device.iconRight, color);
  }
}

function drawRightIconTile(device, icon, color) {
  const scale = state.boxScale || 1;
  const tileSize = 44 * scale;
  const tileX = device.x + device.w - tileSize - 18 * scale;
  const tileY = device.y + 24 * scale;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.025)";
  ctx.strokeStyle = color + "99";
  ctx.lineWidth = 1.2 * scale;

  roundRect(tileX, tileY, tileSize, tileSize, 11 * scale);
  ctx.fill();
  ctx.stroke();

  drawTablerIcon(icon, tileX + 10 * scale, tileY + 10 * scale, 24 * scale, color);
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawSelectionBox() {
  if (!state.selectionBox) return;

  const box = state.selectionBox;

  ctx.save();
  ctx.fillStyle = "rgba(100, 255, 218, 0.08)";
  ctx.strokeStyle = "#64ffda";
  ctx.lineWidth = 1.4 / state.zoom;
  ctx.setLineDash([8 / state.zoom, 5 / state.zoom]);
  ctx.shadowColor = "#64ffda";
  ctx.shadowBlur = 10 / state.zoom;

  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function isConnectionActiveOnCanvas(connection) {
  const selected =
    state.selectedType === "connection" &&
    Number(state.selectedId) === Number(connection.id);

  const highlighted =
    Number(state.highlightedConnectionId) === Number(connection.id);

  return selected || highlighted;
}

function drawScene(timestamp = 0) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#020c1b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();

  ctx.save();
  ctx.translate(state.viewX, state.viewY);
  ctx.scale(state.zoom, state.zoom);

  state.zones.forEach(drawZone);

  state.connections
    .filter(connection => !isConnectionActiveOnCanvas(connection))
    .forEach((connection, index) =>
      drawConnection(connection, index, timestamp)
    );

  state.connections
    .filter(connection => isConnectionActiveOnCanvas(connection))
    .forEach((connection, index) =>
      drawConnection(connection, index, timestamp)
    );

  drawNetworkPackets(timestamp);

  state.devices.forEach(drawDevice);

  drawSelectionBox();

  ctx.restore();
}

function render(timestamp = 0) {
  requestAnimationFrame(render);
  drawScene(timestamp);
}

/* =========================
   LAYOUT / FIT
========================= */

function autoLayout() {
  if (!state.devices.length) return;

  pushHistory();

  const cx = (canvas.width / 2 - state.viewX) / state.zoom;
  const cy = (canvas.height / 2 - state.viewY) / state.zoom;

  const degree = {};

  state.devices.forEach(device => {
    degree[device.id] = 0;
  });

  state.connections.forEach(connection => {
    degree[connection.from] = (degree[connection.from] || 0) + 1;
    degree[connection.to] = (degree[connection.to] || 0) + 1;
  });

  const root = [...state.devices].sort(
    (a, b) => degree[b.id] - degree[a.id]
  )[0];

  root.x = cx - root.w / 2;
  root.y = cy - 300;

  const placed = new Set([root.id]);
  const queue = [root];

  while (queue.length) {
    const current = queue.shift();

    const neighbors = state.connections
      .filter(connection => connection.from === current.id || connection.to === current.id)
      .map(connection => connection.from === current.id ? connection.to : connection.from)
      .filter(id => !placed.has(id))
      .map(id => state.devices.find(device => device.id === id))
      .filter(Boolean);

    const spread = Math.max(neighbors.length * 300 * (state.boxScale || 1), 430);

    neighbors.forEach((child, i) => {
      placed.add(child.id);

      child.x =
        cx -
        spread / 2 +
        i * (spread / Math.max(neighbors.length - 1, 1)) -
        child.w / 2;

      child.y = current.y + 210 * (state.boxScale || 1);

      queue.push(child);
    });
  }

  state.devices
    .filter(device => !placed.has(device.id))
    .forEach((device, i) => {
      device.x = cx + Math.cos(i * 1.5) * 430 - device.w / 2;
      device.y = cy + Math.sin(i * 1.5) * 320 - device.h / 2;
    });

  setStatus("Auto layout applied");
}

function getDiagramBounds() {
  const items = [...state.devices, ...state.zones];

  if (!items.length) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  items.forEach(item => {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.w);
    maxY = Math.max(maxY, item.y + item.h);
  });

  return {
    minX,
    minY,
    w: maxX - minX,
    h: maxY - minY
  };
}

function fitView() {
  const bounds = getDiagramBounds();

  if (!bounds) return;

  const padding = 120;
  const scaleX = canvas.width / (bounds.w + padding * 2);
  const scaleY = canvas.height / (bounds.h + padding * 2);

  state.zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.6);
  state.viewX = canvas.width / 2 - (bounds.minX + bounds.w / 2) * state.zoom;
  state.viewY = canvas.height / 2 - (bounds.minY + bounds.h / 2) * state.zoom;

  updateZoomText();
  setStatus("Fit diagram to view");
}

if (typeof zoomText !== "undefined" && zoomText) {
  zoomText.addEventListener("dblclick", () => {
    fitView();
  });
}