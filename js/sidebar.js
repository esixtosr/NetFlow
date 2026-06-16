const sidebarCategoryOrder = [
  'network',
  'cloudWan',
  'wireless',
  'compute',
  'servers',
  'identity',
  'security',
  'monitoring',
  'storage',
  'virtualization',
  'other'
];

const sidebarCategoryOpen = {
  network: true,
  cloudWan: true,
  wireless: true,
  compute: true,
  servers: true,
  identity: true,
  security: true,
  monitoring: true,
  storage: true,
  virtualization: true,
  other: true
};

const sidebarCategoryExpanded = {
  network: false,
  cloudWan: false,
  wireless: false,
  compute: false,
  servers: false,
  identity: false,
  security: false,
  monitoring: false,
  storage: false,
  virtualization: false,
  other: false
};

let sidebarInspectorSnapshot = null;
let sidebarInspectorDirty = false;

function cloneForInspectorSnapshot(item) {
  if (!item) return null;

  return JSON.parse(JSON.stringify(item));
}

function getSelectedInspectorItem() {
  if (state.selectedType === 'device') {
    return state.devices.find(device => Number(device.id) === Number(state.selectedId)) || null;
  }

  if (state.selectedType === 'zone') {
    return state.zones.find(zone => Number(zone.id) === Number(state.selectedId)) || null;
  }

  if (state.selectedType === 'connection') {
    return state.connections.find(connection => Number(connection.id) === Number(state.selectedId)) || null;
  }

  return null;
}

function captureInspectorSnapshot() {
  sidebarInspectorSnapshot = cloneForInspectorSnapshot(getSelectedInspectorItem());
  sidebarInspectorDirty = false;
  updateInspectorActionButtons();
}

function markInspectorDirty() {
  sidebarInspectorDirty = true;
  updateInspectorActionButtons();
}

function setInspectorButtonState(button, enabled) {
  if (!button) return;

  button.disabled = !enabled;
  button.classList.toggle('disabled', !enabled);
  button.classList.toggle('enabled', enabled);
}

function updateInspectorActionButtons() {
  const deviceSaveBtn = document.getElementById('selectedDeviceSaveBtn');
  const deviceResetBtn = document.getElementById('selectedDeviceResetBtn');

  const zoneSaveBtn = document.getElementById('selectedZoneSaveBtn');
  const zoneResetBtn = document.getElementById('selectedZoneResetBtn');

  const connectionSaveBtn = document.getElementById('selectedConnectionSaveBtn');
  const connectionResetBtn = document.getElementById('selectedConnectionResetBtn');

  const saveEnabled = Boolean(sidebarInspectorDirty && sidebarInspectorSnapshot);
  const resetEnabled = Boolean(sidebarInspectorSnapshot && state.selectedType);

  setInspectorButtonState(deviceSaveBtn, saveEnabled && state.selectedType === 'device');
  setInspectorButtonState(zoneSaveBtn, saveEnabled && state.selectedType === 'zone');
  setInspectorButtonState(connectionSaveBtn, saveEnabled && state.selectedType === 'connection');

  setInspectorButtonState(deviceResetBtn, resetEnabled && state.selectedType === 'device');
  setInspectorButtonState(zoneResetBtn, resetEnabled && state.selectedType === 'zone');
  setInspectorButtonState(connectionResetBtn, resetEnabled && state.selectedType === 'connection');
}

function showBuilderPanel() {
  const builderPanel = document.getElementById('builderPanel');
  const propertiesPanel = document.getElementById('properties');

  if (builderPanel) {
    builderPanel.style.display = 'block';
  }

  if (propertiesPanel) {
    propertiesPanel.style.display = 'none';
  }

  sidebarInspectorSnapshot = null;
  sidebarInspectorDirty = false;
  updateInspectorActionButtons();
}

function showPropertiesPanel() {
  const builderPanel = document.getElementById('builderPanel');
  const propertiesPanel = document.getElementById('properties');

  if (builderPanel) {
    builderPanel.style.display = 'none';
  }

  if (propertiesPanel) {
    propertiesPanel.style.display = 'block';
  }
}

function saveSelectedInspectorChanges() {
  const item = getSelectedInspectorItem();

  if (!item) {
    setStatus('⚠ Nothing selected to save');
    return;
  }

  sidebarInspectorSnapshot = cloneForInspectorSnapshot(item);
  sidebarInspectorDirty = false;

  updateInspectorActionButtons();

  if (state.selectedType === 'device') {
    setStatus('Device settings saved');
  } else if (state.selectedType === 'zone') {
    setStatus('VLAN settings saved');
  } else if (state.selectedType === 'connection') {
    setStatus('Connection settings saved');
  } else {
    setStatus('Settings saved');
  }
}

function resetSelectedInspectorChanges() {
  if (!sidebarInspectorSnapshot || !state.selectedType) {
    setStatus('⚠ Nothing to reset');
    return;
  }

  pushHistory();

  if (state.selectedType === 'device') {
    const index = state.devices.findIndex(device => Number(device.id) === Number(state.selectedId));

    if (index === -1) return;

    state.devices[index] = JSON.parse(JSON.stringify(sidebarInspectorSnapshot));

    if (typeof syncDevicePorts === 'function') {
      syncDevicePorts(state.devices[index], getSafePortCount(state.devices[index]));
    }

    sidebarInspectorDirty = false;
    updateInspectorActionButtons();

    selectItem('device', state.devices[index].id);
    setStatus('Device settings reset');
    return;
  }

  if (state.selectedType === 'zone') {
    const index = state.zones.findIndex(zone => Number(zone.id) === Number(state.selectedId));

    if (index === -1) return;

    state.zones[index] = JSON.parse(JSON.stringify(sidebarInspectorSnapshot));

    sidebarInspectorDirty = false;
    updateInspectorActionButtons();

    selectItem('zone', state.zones[index].id);
    setStatus('VLAN settings reset');
    return;
  }

  if (state.selectedType === 'connection') {
    const index = state.connections.findIndex(connection => Number(connection.id) === Number(state.selectedId));

    if (index === -1) return;

    state.connections[index] = JSON.parse(JSON.stringify(sidebarInspectorSnapshot));
    state.highlightedConnectionId = state.connections[index].id;
    state.highlightedPortKey = null;

    sidebarInspectorDirty = false;
    updateInspectorActionButtons();

    selectItem('connection', state.connections[index].id);
    setStatus('Connection settings reset');
  }
}

function mountSelectedColorPicker(value) {
  const input = document.createElement('input');

  input.type = 'color';
  input.className = 'selected-color-input';
  input.value = value || '#64ffda';

  input.addEventListener('input', e => {
    updateSelected('color', e.target.value);
  });

  propTitle.appendChild(input);
}

function toggleSidebar() {
  pushHistory();

  state.sidebarHidden = !state.sidebarHidden;
  updateUiState();

  if (typeof resizeCanvas === 'function') {
    setTimeout(resizeCanvas, 220);
  }

  setStatus(state.sidebarHidden ? 'Menu hidden' : 'Menu shown');
}

function sidebarEnsureSelectionState() {
  if (!Array.isArray(state.selectedItems)) {
    state.selectedItems = [];
  }
}

function sidebarIsMultiSelected(type, id) {
  sidebarEnsureSelectionState();

  return state.selectedItems.some(item =>
    item.type === type && Number(item.id) === Number(id)
  );
}

function sidebarClearMultiSelection() {
  sidebarEnsureSelectionState();

  state.selectedItems = [];

  if ('selectionBox' in state) {
    state.selectionBox = null;
  }
}

function getSafePortCount(device) {
  if (!device) return 1;

  if (Number.isFinite(Number(device.portCount)) && Number(device.portCount) > 0) {
    return Number(device.portCount);
  }

  if (Array.isArray(device.ports) && device.ports.length > 0) {
    return device.ports.length;
  }

  if (typeof getDefaultPortCount === 'function') {
    return getDefaultPortCount(device.type, device.name, device.sub);
  }

  return 1;
}

function getDeviceCategory(device) {
  const type = (device.type || '').toLowerCase();
  const name = (device.name || '').toLowerCase();
  const sub = (device.sub || '').toLowerCase();

  if (
    name.includes('internet') ||
    name.includes('wan') ||
    name.includes('cloud') ||
    sub.includes('wan') ||
    sub.includes('isp') ||
    type === 'cloud'
  ) {
    return 'cloudWan';
  }

  if (
    type === 'firewall' ||
    type === 'router' ||
    type === 'switch' ||
    name.includes('gateway') ||
    name.includes('router') ||
    name.includes('switch') ||
    name.includes('firewall')
  ) {
    return 'network';
  }

  if (
    type === 'ap' ||
    type === 'wifi' ||
    name.includes('ssid') ||
    name.includes('wifi') ||
    name.includes('ap')
  ) {
    return 'wireless';
  }

  if (
    name.includes('dc') ||
    name.includes('domain controller') ||
    name.includes('active directory') ||
    name.includes('ad ds') ||
    sub.includes('ad ds') ||
    sub.includes('dns')
  ) {
    return 'identity';
  }

  if (
    name.includes('siem') ||
    name.includes('wazuh') ||
    name.includes('soc') ||
    sub.includes('wazuh') ||
    sub.includes('siem')
  ) {
    return 'monitoring';
  }

  if (
    type === 'database' ||
    name.includes('nas') ||
    name.includes('truenas') ||
    name.includes('storage') ||
    sub.includes('truenas')
  ) {
    return 'storage';
  }

  if (
    name.includes('proxmox') ||
    name.includes('vm host') ||
    name.includes('hypervisor') ||
    name.includes('esxi') ||
    name.includes('vsphere') ||
    sub.includes('lab vms') ||
    sub.includes('proxmox')
  ) {
    return 'virtualization';
  }

  if (
    type === 'pc' ||
    name.includes('pc') ||
    name.includes('workstation') ||
    name.includes('laptop') ||
    name.includes('desktop')
  ) {
    return 'compute';
  }

  if (
    name.includes('shield') ||
    name.includes('security') ||
    sub.includes('security')
  ) {
    return 'security';
  }

  if (
    type === 'server' ||
    type === 'vm'
  ) {
    return 'servers';
  }

  return 'other';
}

function getCategoryLabel(category) {
  const labels = {
    network: 'Network',
    cloudWan: 'Cloud / WAN',
    wireless: 'Wireless',
    compute: 'Compute / Endpoints',
    servers: 'Servers',
    identity: 'Identity / Directory',
    security: 'Security',
    monitoring: 'Monitoring / Logging',
    storage: 'Storage',
    virtualization: 'Virtualization',
    other: 'Other'
  };

  return labels[category] || 'Other';
}

function toggleDeviceCategory(category) {
  sidebarCategoryOpen[category] = !sidebarCategoryOpen[category];
  refreshSidebar();
}

function toggleCategoryShowMore(category) {
  sidebarCategoryExpanded[category] = !sidebarCategoryExpanded[category];
  refreshSidebar();
}

function getPortDisplayName(port) {
  if (!port) return 'Port';

  return port.name || 'Port ' + port.id;
}

function getRemotePortName(deviceId, portId) {
  const ports = typeof getDevicePorts === 'function'
    ? getDevicePorts(deviceId)
    : [];

  const port = ports.find(p => Number(p.id) === Number(portId));

  return getPortDisplayName(port);
}

function getDevicePortConnections(device, port) {
  if (!device || !port) return [];

  const deviceId = Number(device.id);
  const portId = Number(port.id);

  return state.connections
    .filter(connection => {
      const fromMatch =
        Number(connection.from) === deviceId &&
        Number(connection.fromPort) === portId;

      const toMatch =
        Number(connection.to) === deviceId &&
        Number(connection.toPort) === portId;

      return fromMatch || toMatch;
    })
    .map(connection => {
      const isFromSide =
        Number(connection.from) === deviceId &&
        Number(connection.fromPort) === portId;

      const remoteDeviceId = isFromSide
        ? connection.to
        : connection.from;

      const remotePortId = isFromSide
        ? connection.toPort
        : connection.fromPort;

      const remoteDevice = state.devices.find(d => Number(d.id) === Number(remoteDeviceId));

      return {
        connection,
        remoteDevice,
        remotePortId,
        remotePortName: getRemotePortName(remoteDeviceId, remotePortId)
      };
    });
}

function getDetailsPanelContent() {
  return document.getElementById('detailsPanelContent');
}

function getLineIconSvg() {
  return `
    <svg class="details-line-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
      <path d="M4 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
      <path d="M16 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
      <path d="M7.5 16.5l9 -9"></path>
    </svg>
  `;
}

function resizeCanvasAfterPanelChange() {
  if (typeof resizeCanvas === 'function') {
    setTimeout(resizeCanvas, 0);
    setTimeout(resizeCanvas, 180);
    setTimeout(resizeCanvas, 260);
  }
}

function showDetailsPanel() {
  const detailsPanel = document.getElementById('detailsPanel');

  if (detailsPanel) {
    detailsPanel.classList.remove('details-panel-empty');
  }

  resizeCanvasAfterPanelChange();
}

function hideDetailsPanel() {
  const detailsPanel = document.getElementById('detailsPanel');

  if (detailsPanel) {
    detailsPanel.classList.add('details-panel-empty');
  }

  resizeCanvasAfterPanelChange();
}

function renderDetailsEmpty() {
  const panel = getDetailsPanelContent();

  if (!panel) return;

  panel.innerHTML = '';
  hideDetailsPanel();
}

/* =========================
   PHASE 5.2 — VLAN ASSIGNMENT HELPERS
========================= */

function sidebarIsNetworkInfrastructureDevice(device) {
  if (!device) return false;

  const type = String(device.type || '').toLowerCase();
  const name = String(device.name || '').toLowerCase();
  const sub = String(device.sub || '').toLowerCase();

  return (
    type === 'firewall' ||
    type === 'router' ||
    type === 'switch' ||
    type === 'ap' ||
    type === 'cloud' ||

    name.includes('gateway') ||
    name.includes('router') ||
    name.includes('firewall') ||
    name.includes('switch') ||
    name.includes('access point') ||
    name.includes(' ap') ||
    name.includes('u7') ||
    name.includes('unifi') ||
    name.includes('proxmox') ||
    name.includes('vm host') ||
    name.includes('hypervisor') ||

    sub.includes('router') ||
    sub.includes('firewall') ||
    sub.includes('switch') ||
    sub.includes('access point') ||
    sub.includes('lab vms') ||
    sub.includes('hypervisor')
  );
}

function getConnectedDevicesForDevice(device) {
  if (!device) return [];

  const deviceId = Number(device.id);
  const devices = [];

  state.connections.forEach(connection => {
    let remoteId = null;

    if (Number(connection.from) === deviceId) {
      remoteId = Number(connection.to);
    }

    if (Number(connection.to) === deviceId) {
      remoteId = Number(connection.from);
    }

    if (!remoteId) return;

    const remoteDevice = state.devices.find(item => Number(item.id) === remoteId);

    if (remoteDevice) {
      devices.push(remoteDevice);
    }
  });

  return devices;
}

function getAssignedVlansForNetworkDevice(device) {
  if (!device) return [];

  const connectedDevices = getConnectedDevicesForDevice(device);
  const vlanMap = new Map();

  connectedDevices.forEach(remoteDevice => {
    const zone = getDeviceZone(remoteDevice);

    if (!zone) return;

    vlanMap.set(Number(zone.id), zone);
  });

  return Array.from(vlanMap.values());
}

function renderAssignedVlanChips(device) {
  const assignedVlans = getAssignedVlansForNetworkDevice(device);

  if (!assignedVlans.length) {
    return `
      <div class="assigned-vlan-empty">
        No connected VLANs detected yet
      </div>
    `;
  }

  return `
    <div class="assigned-vlan-chips">
      ${assignedVlans.map(zone => `
        <div class="assigned-vlan-chip" style="--vlan-color:${zone.color}">
          <span class="assigned-vlan-dot"></span>
          <span>${escapeHtml(zone.name || 'Unnamed VLAN')}</span>
        </div>
      `).join('')}
    </div>
  `;
}

/* =========================
   PHASE 6.1 / 6.2 — VLAN PROFILE HELPERS
========================= */

function formatDhcpValue(value) {
  return String(value) === 'false' || value === false
    ? 'Disabled'
    : 'Enabled';
}

function getZoneDisplayValue(value) {
  return value === undefined || value === null || String(value).trim() === ''
    ? '—'
    : String(value);
}

function ipv4ToNumber(ip) {
  const parts = String(ip || '').trim().split('.').map(Number);

  if (parts.length !== 4) return null;

  for (const part of parts) {
    if (!Number.isInteger(part) || part < 0 || part > 255) {
      return null;
    }
  }

  return (
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    (parts[3] >>> 0)
  ) >>> 0;
}

function numberToIpv4(value) {
  const number = Number(value) >>> 0;

  return [
    (number >>> 24) & 255,
    (number >>> 16) & 255,
    (number >>> 8) & 255,
    number & 255
  ].join('.');
}

function parseCidrSubnet(subnet) {
  const cleanSubnet = String(subnet || '').trim();
  const parts = cleanSubnet.split('/');

  if (parts.length !== 2) return null;

  const ipNumber = ipv4ToNumber(parts[0]);
  const prefix = Number(parts[1]);

  if (ipNumber === null) return null;
  if (!Number.isInteger(prefix) || prefix < 1 || prefix > 30) return null;

  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  const network = ipNumber & mask;
  const broadcast = (network | (~mask >>> 0)) >>> 0;

  return {
    network,
    broadcast,
    firstUsable: network + 1,
    lastUsable: broadcast - 1,
    prefix
  };
}

function getManualIpsInZone(zone, excludeDeviceId = null) {
  if (!zone) return new Set();

  const manualIps = new Set();

  state.devices.forEach(device => {
    if (excludeDeviceId !== null && Number(device.id) === Number(excludeDeviceId)) {
      return;
    }

    const deviceZone = getDeviceZone(device);

    if (!deviceZone || Number(deviceZone.id) !== Number(zone.id)) {
      return;
    }

    const ip = String(device.ipAddress || '').trim();

    if (ip) {
      manualIps.add(ip);
    }
  });

  return manualIps;
}

function getSuggestedIpForDevice(device, zone) {
  if (!device || !zone || !zone.subnet) return '';

  const parsed = parseCidrSubnet(zone.subnet);

  if (!parsed) return '';

  const gatewayIp = String(zone.gateway || '').trim();
  const manualIps = getManualIpsInZone(zone, device.id);

  const devicesInZone = state.devices
    .filter(item => {
      const itemZone = getDeviceZone(item);
      return itemZone && Number(itemZone.id) === Number(zone.id);
    })
    .filter(item => !sidebarIsNetworkInfrastructureDevice(item))
    .sort((a, b) => Number(a.id) - Number(b.id));

  const deviceIndex = Math.max(
    0,
    devicesInZone.findIndex(item => Number(item.id) === Number(device.id))
  );

  /*
    Start at .10 when possible.
    This keeps .1 open for gateway and leaves room for infrastructure.
  */
  let candidate = parsed.network + 10 + deviceIndex;

  if (candidate < parsed.firstUsable) {
    candidate = parsed.firstUsable;
  }

  if (candidate > parsed.lastUsable) {
    candidate = parsed.firstUsable;
  }

  for (let current = candidate; current <= parsed.lastUsable; current++) {
    const ip = numberToIpv4(current);

    if (ip === gatewayIp) continue;
    if (manualIps.has(ip)) continue;

    return ip;
  }

  for (let current = parsed.firstUsable; current < candidate; current++) {
    const ip = numberToIpv4(current);

    if (ip === gatewayIp) continue;
    if (manualIps.has(ip)) continue;

    return ip;
  }

  return '';
}

function getDeviceIpDisplay(device, zone) {
  const manualIp = String(device && device.ipAddress ? device.ipAddress : '').trim();

  if (manualIp) {
    return {
      value: manualIp,
      source: 'Manual'
    };
  }

  const suggestedIp = getSuggestedIpForDevice(device, zone);

  if (suggestedIp) {
    return {
      value: suggestedIp,
      source: 'Suggested'
    };
  }

  return {
    value: '—',
    source: ''
  };
}
/* =========================
   PHASE 7.5 — PER-VLAN IP MEMORY
========================= */

function ensureDeviceIpMemory(device) {
  if (!device) return {};

  if (!device.ipMemoryByVlan || typeof device.ipMemoryByVlan !== 'object' || Array.isArray(device.ipMemoryByVlan)) {
    device.ipMemoryByVlan = {};
  }

  return device.ipMemoryByVlan;
}

function getVlanMemoryKey(zone) {
  if (!zone) return '';

  if (zone.id !== undefined && zone.id !== null) {
    return 'zone-' + zone.id;
  }

  if (zone.vlanId) {
    return 'vlan-' + zone.vlanId;
  }

  return '';
}

function getRememberedIpForDevice(device, zone) {
  if (!device || !zone) return '';

  const memory = ensureDeviceIpMemory(device);
  const key = getVlanMemoryKey(zone);

  if (!key) return '';

  return String(memory[key] || '').trim();
}

function saveCurrentIpToDeviceVlanMemory(device, zone) {
  if (!device || !zone) return '';

  const currentIp = String(device.ipAddress || '').trim();

  if (!currentIp) return '';

  const memory = ensureDeviceIpMemory(device);
  const key = getVlanMemoryKey(zone);

  if (!key) return '';

  memory[key] = currentIp;

  return currentIp;
}

function saveSelectedDeviceIpToVlanMemory() {
  if (state.selectedType !== 'device') return;

  const device = state.devices.find(item => Number(item.id) === Number(state.selectedId));
  if (!device) return;

  const zone = getDeviceZone(device);

  if (!zone) {
    setStatus('⚠ Device is not inside a VLAN zone');
    return;
  }

  const currentIp = String(device.ipAddress || '').trim();

  if (!currentIp) {
    setStatus('⚠ Add a Manual IP before saving it to this VLAN');
    return;
  }

  pushHistory();

  const savedIp = saveCurrentIpToDeviceVlanMemory(device, zone);

  renderDeviceDetailsPanel(device);
  refreshSidebar();

  setStatus('Remembered ' + savedIp + ' for ' + device.name + ' in ' + zone.name);
}

function restoreRememberedIpForSelectedDevice() {
  if (state.selectedType !== 'device') return;

  const device = state.devices.find(item => Number(item.id) === Number(state.selectedId));
  if (!device) return;

  const zone = getDeviceZone(device);

  if (!zone) {
    setStatus('⚠ Device is not inside a VLAN zone');
    return;
  }

  const rememberedIp = getRememberedIpForDevice(device, zone);

  if (!rememberedIp) {
    setStatus('⚠ No remembered IP for this device in this VLAN');
    return;
  }

  pushHistory();

  device.ipAddress = rememberedIp;

  if (typeof propDeviceIp !== 'undefined' && propDeviceIp) {
    propDeviceIp.value = rememberedIp;
  }

  renderDeviceDetailsPanel(device);
  refreshSidebar();

  setStatus('Restored remembered IP ' + rememberedIp + ' for ' + device.name);
}

function getDuplicateIpDevices(device, zone) {
  if (!device || !zone) return [];

  const ip = String(device.ipAddress || '').trim();

  if (!ip) return [];

  return state.devices.filter(otherDevice => {
    if (Number(otherDevice.id) === Number(device.id)) {
      return false;
    }

    const otherZone = getDeviceZone(otherDevice);

    if (!otherZone || Number(otherZone.id) !== Number(zone.id)) {
      return false;
    }

    return String(otherDevice.ipAddress || '').trim() === ip;
  });
}

function hasDuplicateIp(device, zone) {
  return getDuplicateIpDevices(device, zone).length > 0;
}

function renderDuplicateIpWarning(device, zone) {
  const duplicates = getDuplicateIpDevices(device, zone);

  if (!duplicates.length) return '';

  return `
    <div class="duplicate-ip-warning">
      <div class="duplicate-ip-warning-title">Duplicate IP Warning</div>
      <div class="duplicate-ip-warning-body">
        ${escapeHtml(device.ipAddress)} is also used by:
        <strong>${escapeHtml(duplicates.map(item => item.name || 'Unnamed Device').join(', '))}</strong>
      </div>
    </div>
  `;
}

function hasDeviceNetworkOverride(device) {
  if (!device) return false;

  ensureDeviceIpMemory(device);

  return Boolean(
    String(device.ipAddress || '').trim() ||
    String(device.gatewayOverride || '').trim() ||
    String(device.dnsOverride || '').trim()
  );
}

function getDeviceNetworkValue(device, zone, field) {
  if (!device) return '—';

  if (field === 'ipAddress') {
    return getZoneDisplayValue(getDeviceIpDisplay(device, zone).value);
  }

  if (field === 'gateway') {
    return getZoneDisplayValue(device.gatewayOverride || (zone ? zone.gateway : ''));
  }

  if (field === 'dns') {
    return getZoneDisplayValue(device.dnsOverride || (zone ? zone.dns : ''));
  }

  return '—';
}

function renderNetworkBadge(label) {
  const cleanLabel = String(label || '').trim();
  const cleanLower = cleanLabel.toLowerCase();

  let badgeClass = 'manual-network-badge';

  if (cleanLower === 'suggested') {
    badgeClass += ' suggested';
  }

  if (cleanLower === 'duplicate') {
    badgeClass += ' duplicate';
  }

  if (cleanLower === 'saved') {
    badgeClass += ' saved';
  }

  return `<span class="${badgeClass}">${escapeHtml(cleanLabel)}</span>`;
}

function renderManualBadge(label) {
  return renderNetworkBadge(label);
}

function renderInheritedNetworkProfileCard(device, zone) {
  const hasOverride = hasDeviceNetworkOverride(device);
  const ipDisplay = getDeviceIpDisplay(device, zone);
  const duplicateIp = hasDuplicateIp(device, zone);
  const rememberedIp = getRememberedIpForDevice(device, zone);

  if (!zone) {
    return `
      <div class="details-meta-card inherited-network-card">
        <div class="assigned-vlan-title">Network Profile</div>
        <div class="assigned-vlan-sub">No VLAN zone detected</div>

        <div class="details-meta-row" style="margin-top:10px;">
          <span>Inherited From</span>
          <strong>None</strong>
        </div>

        <div class="details-meta-row">
          <span>Manual IP</span>
          <strong>
            ${escapeHtml(getZoneDisplayValue(device ? device.ipAddress : ''))}
            ${device && device.ipAddress ? renderNetworkBadge('Manual') : ''}
          </strong>
        </div>

        <div class="details-meta-row">
          <span>Manual Gateway</span>
          <strong>
            ${escapeHtml(getZoneDisplayValue(device ? device.gatewayOverride : ''))}
            ${device && device.gatewayOverride ? renderNetworkBadge('Manual') : ''}
          </strong>
        </div>

        <div class="details-meta-row">
          <span>Manual DNS</span>
          <strong>
            ${escapeHtml(getZoneDisplayValue(device ? device.dnsOverride : ''))}
            ${device && device.dnsOverride ? renderNetworkBadge('Manual') : ''}
          </strong>
        </div>
      </div>
    `;
  }

  return `
    <div class="details-meta-card inherited-network-card">
      <div class="assigned-vlan-title">Network Profile</div>
      <div class="assigned-vlan-sub">
        ${hasOverride
          ? 'Inherited from ' + escapeHtml(zone.name || 'Unnamed VLAN') + ' with manual override'
          : 'Inherited from ' + escapeHtml(zone.name || 'Unnamed VLAN')}
      </div>

      <div class="details-meta-row" style="margin-top:10px;">
        <span>Zone / VLAN</span>
        <strong>${escapeHtml(zone.name || 'Unnamed VLAN')}</strong>
      </div>

      <div class="details-meta-row">
        <span>VLAN ID</span>
        <strong>${escapeHtml(getZoneDisplayValue(zone.vlanId))}</strong>
      </div>

      <div class="details-meta-row">
        <span>Subnet</span>
        <strong>${escapeHtml(getZoneDisplayValue(zone.subnet))}</strong>
      </div>

      <div class="details-meta-row ip-address-row ${duplicateIp ? 'has-duplicate-ip' : ''}">
        <span>IP Address</span>
        <strong>
          ${escapeHtml(getZoneDisplayValue(ipDisplay.value))}
          ${ipDisplay.source ? renderNetworkBadge(ipDisplay.source) : ''}
          ${duplicateIp ? renderNetworkBadge('Duplicate') : ''}
        </strong>
      </div>

      ${renderDuplicateIpWarning(device, zone)}

      ${ipDisplay.source === 'Suggested' ? `
        <button
          class="use-suggested-ip-btn"
          onclick="useSuggestedIpForSelectedDevice()"
          type="button"
        >
          Use Suggested IP
          <span>${escapeHtml(ipDisplay.value)}</span>
        </button>
      ` : ''}

      ${device && device.ipAddress ? `
        <button
          class="remember-ip-btn"
          onclick="saveSelectedDeviceIpToVlanMemory()"
          type="button"
        >
          Remember IP for this VLAN
          <span>${escapeHtml(device.ipAddress)}</span>
        </button>
      ` : ''}

      ${rememberedIp ? `
        <div class="details-meta-row remembered-ip-row">
          <span>Remembered IP</span>
          <strong>
            ${escapeHtml(rememberedIp)}
            ${renderNetworkBadge('Saved')}
          </strong>
        </div>

        ${String(device.ipAddress || '').trim() !== rememberedIp ? `
          <button
            class="restore-remembered-ip-btn"
            onclick="restoreRememberedIpForSelectedDevice()"
            type="button"
          >
            Restore Remembered IP
            <span>${escapeHtml(rememberedIp)}</span>
          </button>
        ` : ''}
      ` : ''}

      <div class="details-meta-row">
        <span>Gateway</span>
        <strong>
          ${escapeHtml(getDeviceNetworkValue(device, zone, 'gateway'))}
          ${device && device.gatewayOverride ? renderNetworkBadge('Manual') : ''}
        </strong>
      </div>

      <div class="details-meta-row">
        <span>DNS</span>
        <strong>
          ${escapeHtml(getDeviceNetworkValue(device, zone, 'dns'))}
          ${device && device.dnsOverride ? renderNetworkBadge('Manual') : ''}
        </strong>
      </div>

      <div class="details-meta-row">
        <span>DHCP</span>
        <strong>${escapeHtml(formatDhcpValue(zone.dhcp))}</strong>
      </div>
    </div>
  `;
}

function renderDeviceNetworkMetaCard(device, zone) {
  const isNetworkDevice = sidebarIsNetworkInfrastructureDevice(device);

  if (isNetworkDevice) {
    const assignedCount = getAssignedVlansForNetworkDevice(device).length;

    return `
      ${renderInheritedNetworkProfileCard(device, zone)}

      <div class="details-meta-card assigned-vlan-card">
        <div class="assigned-vlan-head">
          <div>
            <div class="assigned-vlan-title">Accessible VLANs</div>
            <div class="assigned-vlan-sub">
              ${assignedCount
                ? assignedCount + ' VLAN' + (assignedCount === 1 ? '' : 's') + ' detected from connected devices'
                : 'Based on connected endpoint zones and port connections'}
            </div>
          </div>
        </div>

        ${renderAssignedVlanChips(device)}
      </div>
    `;
  }

  return renderInheritedNetworkProfileCard(device, zone);
}

function renderZoneDetailsPanel(zone) {
  const panel = getDetailsPanelContent();

  if (!panel) return;

  if (!zone) {
    renderDetailsEmpty();
    return;
  }

  showDetailsPanel();

  const color = zone.color || '#7a8899';

  panel.innerHTML = `
    <div class="details-inspector" style="--device-accent:${color}">
      <div class="details-device-header">
        <div class="details-device-icon" style="border-color:${color}; color:${color}">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M14 20a2 2 0 1 0 -4 0a2 2 0 0 0 4 0" />
            <path d="M14 4a2 2 0 1 0 -4 0a2 2 0 0 0 4 0" />
            <path d="M6 12a2 2 0 1 0 -4 0a2 2 0 0 0 4 0" />
            <path d="M22 12a2 2 0 1 0 -4 0a2 2 0 0 0 4 0" />
            <path d="M14 12a2 2 0 1 0 -4 0a2 2 0 0 0 4 0" />
            <path d="M6 12h4" />
            <path d="M14 12h4" />
            <path d="M12 6v4" />
            <path d="M12 14v4" />
          </svg>
        </div>

        <div class="details-device-main">
          <div class="details-eyebrow">Selected VLAN Zone</div>
          <div class="details-device-name">${escapeHtml(zone.name || 'Unnamed VLAN')}</div>
          <div class="details-device-sub">
            ${zone.vlanId ? 'VLAN ' + escapeHtml(zone.vlanId) : 'VLAN profile'}
          </div>
        </div>
      </div>

      <div class="details-meta-card vlan-profile-card">
        <div class="details-meta-row">
          <span>VLAN ID</span>
          <strong>${escapeHtml(getZoneDisplayValue(zone.vlanId))}</strong>
        </div>
        <div class="details-meta-row">
          <span>Subnet</span>
          <strong>${escapeHtml(getZoneDisplayValue(zone.subnet))}</strong>
        </div>
        <div class="details-meta-row">
          <span>Gateway</span>
          <strong>${escapeHtml(getZoneDisplayValue(zone.gateway))}</strong>
        </div>
        <div class="details-meta-row">
          <span>DNS</span>
          <strong>${escapeHtml(getZoneDisplayValue(zone.dns))}</strong>
        </div>
        <div class="details-meta-row">
          <span>DHCP</span>
          <strong>${escapeHtml(formatDhcpValue(zone.dhcp))}</strong>
        </div>
      </div>
    </div>
  `;
}

function clearConnectionHighlight() {
  state.highlightedConnectionId = null;
  state.highlightedPortKey = null;

  if (state.selectedType === 'device') {
    const selectedDevice = state.devices.find(device => device.id === state.selectedId);

    if (selectedDevice) {
      renderDeviceDetailsPanel(selectedDevice);
    }
  }

  if (state.selectedType === 'connection') {
    renderActiveDetailsPanel();
  }

  setStatus('Connection highlight cleared');
}

function highlightPortConnection(deviceId, portId, connectionId) {
  const nextPortKey = deviceId + ':' + portId;
  const nextConnectionId = connectionId || null;

  const samePort =
    state.highlightedPortKey === nextPortKey &&
    Number(state.highlightedConnectionId || 0) === Number(nextConnectionId || 0);

  if (samePort) {
    state.highlightedConnectionId = null;
    state.highlightedPortKey = null;

    const device = state.devices.find(d => Number(d.id) === Number(deviceId));
    if (device) renderDeviceDetailsPanel(device);

    setStatus('Connection highlight cleared');
    return;
  }

  state.highlightedConnectionId = nextConnectionId;
  state.highlightedPortKey = nextPortKey;

  const device = state.devices.find(d => Number(d.id) === Number(deviceId));
  const connection = state.connections.find(c => Number(c.id) === Number(connectionId));

  if (device) {
    renderDeviceDetailsPanel(device);
  }

  if (connection) {
    const a = state.devices.find(d => Number(d.id) === Number(connection.from));
    const b = state.devices.find(d => Number(d.id) === Number(connection.to));

    setStatus(
      'Highlighted connection: ' +
      (a ? a.name : 'Device') +
      ' → ' +
      (b ? b.name : 'Device')
    );
  } else {
    setStatus('Highlighted available port');
  }
}

function getDeviceConnectionCount(device) {
  if (!device) return 0;

  return state.connections.filter(connection =>
    Number(connection.from) === Number(device.id) ||
    Number(connection.to) === Number(device.id)
  ).length;
}

function renderDevicePortRows(device) {
  const ports = typeof getDevicePorts === 'function'
    ? getDevicePorts(device.id)
    : (Array.isArray(device.ports) ? device.ports : []);

  if (!ports.length) {
    return '<div class="ports-table-empty">No ports assigned</div>';
  }

  return ports.map(port => {
    const connections = getDevicePortConnections(device, port);
    const portKey = device.id + ':' + port.id;
    const isPortHighlighted = state.highlightedPortKey === portKey;

    if (!connections.length) {
      return `
        <button
          class="ports-table-row ${isPortHighlighted ? 'is-highlighted' : ''}"
          onclick="highlightPortConnection(${device.id}, ${port.id}, null)"
          type="button"
        >
          <div class="ports-table-cell port-name">${escapeHtml(getPortDisplayName(port))}</div>
          <div class="ports-table-cell muted">Available</div>
          <div class="ports-table-cell muted">—</div>
          <div class="ports-table-cell muted">—</div>
        </button>
      `;
    }

    return connections.map((item, index) => {
      const remoteColor = item.remoteDevice
        ? getDeviceColor(item.remoteDevice)
        : '#7a8899';

      const isConnectionHighlighted =
        Number(state.highlightedConnectionId) === Number(item.connection.id);

      const rowHighlighted = isPortHighlighted || isConnectionHighlighted;

      return `
        <button
          class="ports-table-row connected ${rowHighlighted ? 'is-highlighted' : ''}"
          onclick="highlightPortConnection(${device.id}, ${port.id}, ${item.connection.id})"
          type="button"
        >
          <div class="ports-table-cell port-name">
            ${index === 0 ? escapeHtml(getPortDisplayName(port)) : '<span class="muted">↳</span>'}
          </div>
          <div class="ports-table-cell connected-device">
            <span class="ports-device-dot" style="background:${remoteColor}"></span>
            <span>${escapeHtml(item.remoteDevice ? item.remoteDevice.name : 'Missing device')}</span>
          </div>
          <div class="ports-table-cell">${escapeHtml(item.remotePortName || 'Port')}</div>
          <div class="ports-table-cell status">${escapeHtml(item.connection.status || 'online')}</div>
        </button>
      `;
    }).join('');
  }).join('');
}

function getHighlightedConnection() {
  if (!state.highlightedConnectionId) return null;

  return state.connections.find(connection =>
    Number(connection.id) === Number(state.highlightedConnectionId)
  );
}

function renderHighlightedConnectionCard(connection) {
  if (!connection) return '';

  const fromDevice = state.devices.find(device => Number(device.id) === Number(connection.from));
  const toDevice = state.devices.find(device => Number(device.id) === Number(connection.to));

  const fromPort = getRemotePortName(connection.from, connection.fromPort);
  const toPort = getRemotePortName(connection.to, connection.toPort);
  const color = getConnectionColor(connection);

  return `
    <div class="inline-connection-card" style="--device-accent:${color}">
      <div class="inline-connection-head">
        <div class="inline-connection-icon">
          ${getLineIconSvg()}
        </div>
        <div>
          <div class="details-eyebrow">Port Connection</div>
          <div class="inline-connection-title">
            ${escapeHtml(fromDevice ? fromDevice.name : 'Missing device')}
            <span>→</span>
            ${escapeHtml(toDevice ? toDevice.name : 'Missing device')}
          </div>
        </div>
      </div>

      <div class="inline-connection-grid">
        <div>
          <span>From</span>
          <strong>${escapeHtml(fromPort)}</strong>
        </div>
        <div>
          <span>To</span>
          <strong>${escapeHtml(toPort)}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>${escapeHtml(connection.status || 'online')}</strong>
        </div>
        <div>
          <span>Style</span>
          <strong>${escapeHtml(connection.style || 'solid')}</strong>
        </div>
      </div>
    </div>
  `;
}
function getDetailsDeviceIconKey(device) {
  if (!device) return '';

  if (device.iconLeft && device.iconLeft !== 'auto') {
    return device.iconLeft;
  }

  const type = String(device.type || '').toLowerCase();
  const name = String(device.name || '').toLowerCase();
  const sub = String(device.sub || '').toLowerCase();

  if (type === 'firewall' || name.includes('firewall') || sub.includes('firewall')) return 'shield-lock';
  if (type === 'router' || name.includes('gateway') || name.includes('router')) return 'network';
  if (type === 'switch' || name.includes('switch')) return 'switch-horizontal';
  if (type === 'cloud' || name.includes('internet') || name.includes('cloud') || sub.includes('wan')) return 'cloud';
  if (type === 'database' || name.includes('nas') || name.includes('truenas')) return 'database';
  if (type === 'pc' || name.includes('pc') || name.includes('workstation')) return 'desktop';
  if (type === 'wifi' || name.includes('ssid') || name.includes('wifi')) return 'wifi';
  if (type === 'ap' || name.includes('ap') || name.includes('access point')) return 'antenna-bars-5';
  if (type === 'vm') return 'desktop';
  if (type === 'server') return 'server';

  return 'server';
}

function getDetailsDeviceIconSvg(device) {
  const iconKey = getDetailsDeviceIconKey(device);

  const icons = {
    'wall': `
      <svg class="details-device-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 4h16v16h-16z"/>
        <path d="M4 9h16"/>
        <path d="M4 15h16"/>
        <path d="M9 4v5"/>
        <path d="M15 9v6"/>
        <path d="M9 15v5"/>
      </svg>
    `,

    'shield-lock': `
      <svg class="details-device-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 3l8 4v5c0 5 -3.5 9 -8 10c-4.5 -1 -8 -5 -8 -10v-5l8 -4"/>
        <path d="M9.5 12.5v-1a2.5 2.5 0 0 1 5 0v1"/>
        <path d="M9 12.5h6v4h-6z"/>
      </svg>
    `,

    'network': `
      <svg class="details-device-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M6 9a3 3 0 1 0 0 -6a3 3 0 0 0 0 6z"/>
        <path d="M18 9a3 3 0 1 0 0 -6a3 3 0 0 0 0 6z"/>
        <path d="M12 21a3 3 0 1 0 0 -6a3 3 0 0 0 0 6z"/>
        <path d="M8.5 7.5l2.5 7"/>
        <path d="M15.5 7.5l-2.5 7"/>
      </svg>
    `,

    'switch-horizontal': `
      <svg class="details-device-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 8h16a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2v-4a2 2 0 0 1 2 -2z"/>
        <path d="M7 12h.01"/>
        <path d="M11 12h.01"/>
        <path d="M15 12h.01"/>
        <path d="M19 12h.01"/>
      </svg>
    `,

    'cloud': `
      <svg class="details-device-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M6.5 18a4.5 4.5 0 0 1 -.5 -8.97a6 6 0 0 1 11.79 1.42a3.5 3.5 0 0 1 -.79 6.95h-10.5"/>
      </svg>
    `,

    'server': `
      <svg class="details-device-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 5a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"/>
        <path d="M4 15a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"/>
        <path d="M7 7h.01"/>
        <path d="M7 17h.01"/>
      </svg>
    `,

    'devices-2': `
      <svg class="details-device-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M13 9a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2z"/>
        <path d="M3 5a2 2 0 0 1 2 -2h6a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2z"/>
        <path d="M7 18h.01"/>
        <path d="M17 18h.01"/>
      </svg>
    `,

    'desktop': `
      <svg class="details-device-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M3 4h18v12h-18z"/>
        <path d="M7 20h10"/>
        <path d="M9 16v4"/>
        <path d="M15 16v4"/>
      </svg>
    `,

    'wifi': `
      <svg class="details-device-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M5 13a10 10 0 0 1 14 0"/>
        <path d="M8.5 16.5a5 5 0 0 1 7 0"/>
        <path d="M12 20h.01"/>
      </svg>
    `,

    'antenna-bars-5': `
      <svg class="details-device-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M6 18v-3"/>
        <path d="M10 18v-6"/>
        <path d="M14 18v-9"/>
        <path d="M18 18v-12"/>
      </svg>
    `,

    'database': `
      <svg class="details-device-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 6c4.418 0 8 -1.343 8 -3s-3.582 -3 -8 -3s-8 1.343 -8 3s3.582 3 8 3z" transform="translate(0 3)"/>
        <path d="M4 6v6c0 1.657 3.582 3 8 3s8 -1.343 8 -3v-6"/>
        <path d="M4 12v6c0 1.657 3.582 3 8 3s8 -1.343 8 -3v-6"/>
      </svg>
    `
  };

  if (icons[iconKey]) {
    return icons[iconKey];
  }

  return escapeHtml((device.name || '?').slice(0, 1).toUpperCase());
}


function renderDeviceDetailsPanel(device) {
  const panel = getDetailsPanelContent();

  if (!panel) return;

  if (!device) {
    renderDetailsEmpty();
    return;
  }

  showDetailsPanel();

  const selectedColor = getDeviceColor(device);
  const portCount = getSafePortCount(device);
  const connectionCount = getDeviceConnectionCount(device);
  const typeLabel = TYPE_LABEL[device.type] || device.type || 'Device';
  const zone = getDeviceZone(device);
  const highlightedConnection = getHighlightedConnection();

  const rows = renderDevicePortRows(device);
  const connectionCard = renderHighlightedConnectionCard(highlightedConnection);
  const networkMetaCard = renderDeviceNetworkMetaCard(device, zone);

  panel.innerHTML = `
    <div class="details-inspector" style="--device-accent:${selectedColor}">
      <div class="details-device-header">
        <div class="details-device-icon" style="border-color:${selectedColor}; color:${selectedColor}">
          ${getDetailsDeviceIconSvg(device)}
        </div>

        <div class="details-device-main">
          <div class="details-eyebrow">Selected Device</div>
          <div class="details-device-name">${escapeHtml(device.name || 'Unnamed Device')}</div>
          <div class="details-device-sub">${escapeHtml(device.sub || typeLabel)}</div>
        </div>
      </div>

      <div class="details-stats-grid">
        <div class="details-stat">
          <span>Type</span>
          <strong>${escapeHtml(typeLabel)}</strong>
        </div>
        <div class="details-stat">
          <span>Status</span>
          <strong>${escapeHtml(device.status || 'online')}</strong>
        </div>
        <div class="details-stat">
          <span>Ports</span>
          <strong>${portCount}</strong>
        </div>
        <div class="details-stat">
          <span>Links</span>
          <strong>${connectionCount}</strong>
        </div>
      </div>

      ${networkMetaCard}

      <div class="ports-section">
        <div class="ports-section-head">
          <div>
            <div class="ports-section-title">Ports</div>
            <div class="ports-section-sub">${portCount} port${portCount === 1 ? '' : 's'} assigned</div>
          </div>
        </div>

        <div class="ports-table">
          <div class="ports-table-header">
            <div>Port</div>
            <div>Connected Device</div>
            <div>Remote Port</div>
            <div>Status</div>
          </div>

          ${rows}
        </div>
      </div>

      <div id="inlineConnectionDetails">
        ${connectionCard}
      </div>
    </div>
  `;
}

function renderConnectionDetailsPanel(connection) {
  const panel = getDetailsPanelContent();

  if (!panel) return;

  if (!connection) {
    renderDetailsEmpty();
    return;
  }

  showDetailsPanel();

  const fromDevice = state.devices.find(device => Number(device.id) === Number(connection.from));
  const toDevice = state.devices.find(device => Number(device.id) === Number(connection.to));

  const fromPort = getRemotePortName(connection.from, connection.fromPort);
  const toPort = getRemotePortName(connection.to, connection.toPort);
  const color = getConnectionColor(connection);

  panel.innerHTML = `
    <div class="details-inspector" style="--device-accent:${color}">
      <div class="details-device-header">
        <div class="details-device-icon line-icon" style="border-color:${color}; color:${color}">
          ${getLineIconSvg()}
        </div>

        <div class="details-device-main">
          <div class="details-eyebrow">Selected Connection</div>
          <div class="details-device-name">${escapeHtml(fromDevice ? fromDevice.name : 'Missing device')}</div>
          <div class="details-device-sub">to ${escapeHtml(toDevice ? toDevice.name : 'Missing device')}</div>
        </div>
      </div>

      <div class="details-meta-card">
        <div class="details-meta-row">
          <span>From</span>
          <strong>${escapeHtml(fromDevice ? fromDevice.name : 'Missing device')} · ${escapeHtml(fromPort)}</strong>
        </div>
        <div class="details-meta-row">
          <span>To</span>
          <strong>${escapeHtml(toDevice ? toDevice.name : 'Missing device')} · ${escapeHtml(toPort)}</strong>
        </div>
        <div class="details-meta-row">
          <span>Status</span>
          <strong>${escapeHtml(connection.status || 'online')}</strong>
        </div>
        <div class="details-meta-row">
          <span>Style</span>
          <strong>${escapeHtml(connection.style || 'solid')}</strong>
        </div>
      </div>
    </div>
  `;
}

function renderMultiSelectDetailsPanel() {
  const panel = getDetailsPanelContent();

  if (!panel) return;

  renderDetailsEmpty();

  const count = Array.isArray(state.selectedItems) ? state.selectedItems.length : 0;

  if (count > 0) {
    setStatus(count + ' item(s) selected');
  }
}

function renderActiveDetailsPanel() {
  sidebarEnsureSelectionState();

  if (state.selectedItems.length) {
    renderMultiSelectDetailsPanel();
    return;
  }

  if (state.selectedType === 'device') {
    const device = state.devices.find(item => Number(item.id) === Number(state.selectedId));
    renderDeviceDetailsPanel(device);
    return;
  }

  if (state.selectedType === 'connection') {
    const connection = state.connections.find(item => Number(item.id) === Number(state.selectedId));
    renderConnectionDetailsPanel(connection);
    return;
  }

  if (state.selectedType === 'zone') {
    const zone = state.zones.find(item => Number(item.id) === Number(state.selectedId));
    renderZoneDetailsPanel(zone);
    return;
  }

  renderDetailsEmpty();
}

function deviceHasIpConflict(device) {
  if (!device) return false;

  const zone = getDeviceZone(device);

  if (!zone) return false;

  return hasDuplicateIp(device, zone);
}

function renderDeviceItem(device) {
  const div = document.createElement('div');

  const selected =
    (state.selectedType === 'device' && state.selectedId === device.id) ||
    sidebarIsMultiSelected('device', device.id);

  const ipConflict = deviceHasIpConflict(device);

  div.className =
    'item' +
    (selected ? ' selected' : '') +
    (sidebarIsMultiSelected('device', device.id) ? ' multi-selected' : '') +
    (ipConflict ? ' ip-conflict' : '');

  div.onclick = () => {
    sidebarClearMultiSelection();
    selectItem('device', device.id);
  };

  const rightIconText = device.iconRight ? ' · 2 ICONS' : '';
  const zone = getDeviceZone(device);
  const zoneText = zone ? ' · ' + zone.name.toUpperCase() : '';
  const portCount = getSafePortCount(device);
  const portText = ' · ' + portCount + ' port' + (portCount === 1 ? '' : 's');
  const ipText = device.ipAddress ? ' · ' + device.ipAddress : '';
  const conflictText = ipConflict ? ' · IP CONFLICT' : '';

  div.innerHTML = `
    <div class="dot" style="background:${ipConflict ? '#ff6b7a' : getDeviceColor(device)}"></div>
    <div class="item-main">
      <div class="item-name">
        ${escapeHtml(device.name)}
        ${ipConflict ? '<span class="sidebar-conflict-badge">Conflict</span>' : ''}
      </div>
      <div class="item-sub">
        ${escapeHtml(TYPE_LABEL[device.type] || device.type)}${portText}${rightIconText}${zoneText}${ipText}${conflictText} · ${escapeHtml(device.status)}
      </div>
    </div>
    <button class="delete-mini" onclick="event.stopPropagation();removeDevice(${device.id})">×</button>
  `;

  return div;
}

function renderZoneItem(zone) {
  const div = document.createElement('div');

  const selected =
    (state.selectedType === 'zone' && state.selectedId === zone.id) ||
    sidebarIsMultiSelected('zone', zone.id);

  div.className =
    'item' +
    (selected ? ' selected' : '') +
    (sidebarIsMultiSelected('zone', zone.id) ? ' multi-selected' : '');

  div.onclick = () => {
    sidebarClearMultiSelection();
    selectItem('zone', zone.id);
  };

  const vlanText = zone.vlanId ? 'VLAN ' + zone.vlanId : 'No VLAN ID';
  const subnetText = zone.subnet ? ' · ' + zone.subnet : '';

  div.innerHTML = `
    <div class="dot" style="background:${zone.color};border-radius:2px"></div>
    <div class="item-main">
      <div class="item-name">${escapeHtml(zone.name)}</div>
      <div class="item-sub">${escapeHtml(vlanText + subnetText)}</div>
    </div>
    <button class="delete-mini" onclick="event.stopPropagation();removeZone(${zone.id})">×</button>
  `;

  return div;
}

function refreshSidebar() {
  sidebarEnsureSelectionState();

  if (!state.selectedType && (!Array.isArray(state.selectedItems) || !state.selectedItems.length)) {
    showBuilderPanel();
  } else {
    showPropertiesPanel();
  }

  updateInspectorActionButtons();

  deviceCount.textContent = state.devices.length;
  zoneCount.textContent = state.zones.length;

  deviceList.innerHTML = '';
  zoneList.innerHTML = '';

  const categories = {
    network: [],
    cloudWan: [],
    wireless: [],
    compute: [],
    servers: [],
    identity: [],
    security: [],
    monitoring: [],
    storage: [],
    virtualization: [],
    other: []
  };

  state.devices.forEach(device => {
    const category = getDeviceCategory(device);
    categories[category].push(device);
  });

  sidebarCategoryOrder.forEach(category => {
    const devices = categories[category];

    if (!devices.length) return;

    const categoryWrap = document.createElement('div');
    categoryWrap.className = 'device-category';

    const header = document.createElement('button');
    header.className = 'device-category-header';
    header.onclick = () => toggleDeviceCategory(category);

    header.innerHTML = `
      <span>${sidebarCategoryOpen[category] ? '▾' : '▸'} ${getCategoryLabel(category)}</span>
      <span>${devices.length}</span>
    `;

    categoryWrap.appendChild(header);

    if (sidebarCategoryOpen[category]) {
      const expanded = sidebarCategoryExpanded[category];
      const visibleDevices = expanded ? devices : devices.slice(0, 4);

      visibleDevices.forEach(device => {
        categoryWrap.appendChild(renderDeviceItem(device));
      });

      if (devices.length > 4) {
        const moreBtn = document.createElement('button');
        moreBtn.className = 'show-more-btn';
        moreBtn.onclick = () => toggleCategoryShowMore(category);
        moreBtn.textContent = expanded
          ? 'Show less'
          : `Show ${devices.length - 4} more`;

        categoryWrap.appendChild(moreBtn);
      }
    }

    deviceList.appendChild(categoryWrap);
  });

  state.zones.forEach(zone => {
    zoneList.appendChild(renderZoneItem(zone));
  });

  renderActiveDetailsPanel();
}

function selectItem(type, id) {
  sidebarClearMultiSelection();

  state.selectedType = type;
  state.selectedId = id;

  showPropertiesPanel();

  commonProps.style.display = 'block';
  deviceOnlyProps.style.display = 'none';
  zoneOnlyProps.style.display = 'none';
  connectionOnlyProps.style.display = 'none';
  properties.style.display = 'block';

  if (type === 'device') {
    const item = state.devices.find(device => device.id === id);
    if (!item) return;

    const portCount = getSafePortCount(item);

    ensureDeviceIpMemory(item);

    if (typeof syncDevicePorts === 'function') {
      syncDevicePorts(item, portCount);
    }

    propTitle.innerHTML = '<span>Selected Device</span>';
    mountSelectedColorPicker(item.baseColor || item.color);

    propName.value = item.name;
    propSub.value = item.sub || '';

    propType.value = item.type;
    propIconLeft.value = item.iconLeft || 'auto';
    propIconRight.value = item.iconRight || '';
    propStatus.value = item.status;
    
    if (typeof propPortCount !== 'undefined' && propPortCount) {
      propPortCount.value = item.portCount || portCount;
    }

    if (typeof propDeviceIp !== 'undefined' && propDeviceIp) {
      propDeviceIp.value = item.ipAddress || '';
    }

    if (typeof propDeviceGateway !== 'undefined' && propDeviceGateway) {
      propDeviceGateway.value = item.gatewayOverride || '';
    }

    if (typeof propDeviceDns !== 'undefined' && propDeviceDns) {
      propDeviceDns.value = item.dnsOverride || '';
    }

    commonProps.style.display = 'block';
    deviceOnlyProps.style.display = 'block';

    renderDeviceDetailsPanel(item);
  }

  if (type === 'zone') {
    const item = state.zones.find(zone => zone.id === id);
    if (!item) return;

    propTitle.innerHTML = '<span>Selected VLAN Zone</span>';
    mountSelectedColorPicker(item.color);

    propName.value = item.name;
    propSub.value = item.sub || '';

    propZoneBorderStyle.value = item.borderStyle || 'dashed';
    propZoneBorderWidth.value = item.borderWidth || 1.5;
    zoneBorderWidthValue.textContent = Number(item.borderWidth || 1.5).toFixed(2);

    propZoneOpacity.value = item.opacity ?? 0.06;
    zoneOpacityValue.textContent = Number(item.opacity ?? 0.06).toFixed(2);

    if (typeof propZoneVlanId !== 'undefined' && propZoneVlanId) {
      propZoneVlanId.value = item.vlanId || '';
    }

    if (typeof propZoneSubnet !== 'undefined' && propZoneSubnet) {
      propZoneSubnet.value = item.subnet || '';
    }

    if (typeof propZoneGateway !== 'undefined' && propZoneGateway) {
      propZoneGateway.value = item.gateway || '';
    }

    if (typeof propZoneDns !== 'undefined' && propZoneDns) {
      propZoneDns.value = item.dns || '';
    }

    if (typeof propZoneDhcp !== 'undefined' && propZoneDhcp) {
      propZoneDhcp.value = String(item.dhcp !== false);
    }

    commonProps.style.display = 'block';
    zoneOnlyProps.style.display = 'block';

    renderZoneDetailsPanel(item);
  }

  if (type === 'connection') {
    const item = state.connections.find(connection => connection.id === id);
    if (!item) return;

    state.highlightedConnectionId = item.id;
    state.highlightedPortKey = null;

    propTitle.innerHTML = '<span>Selected Connection</span>';

    /*
      Phase 1:
      Connections no longer use the shared Name / Label
      or Subtitle / Notes fields. Those fields still exist
      for devices and zones only.
    */
    commonProps.style.display = 'none';

    populateConnectionSelects('propConnFrom', 'propConnTo');

    propConnFrom.value = item.from;
    propConnTo.value = item.to;
    propConnStyle.value = item.style;
    propConnStatus.value = item.status;

    if (typeof refreshSelectedConnectionPorts === 'function') {
      refreshSelectedConnectionPorts();
    }

    if (typeof propConnFromSide !== 'undefined') {
      propConnFromSide.value = item.fromSide || 'auto';
    }

    if (typeof propConnToSide !== 'undefined') {
      propConnToSide.value = item.toSide || 'auto';
    }

    connectionOnlyProps.style.display = 'block';

    renderConnectionDetailsPanel(item);

    const bendCount = Array.isArray(item.points) ? item.points.length : 0;

    setStatus(
      bendCount
        ? `Connection selected · ${bendCount} bend point(s) · drag dots to reshape`
        : 'Connection selected · double-click line to add bend point'
    );
  }

  captureInspectorSnapshot();
  refreshSidebar();
}

function clearSelection() {
  state.selectedType = null;
  state.selectedId = null;
  state.highlightedConnectionId = null;
  state.highlightedPortKey = null;

  sidebarClearMultiSelection();

  showBuilderPanel();

  renderDetailsEmpty();
  refreshSidebar();
}

function updateSelected(field, value) {
  pushHistory();

  let item = null;

  if (state.selectedType === 'device') {
    item = state.devices.find(device => device.id === state.selectedId);
    if (!item) return;

    if (field === 'name') item.name = value;
    if (field === 'sub') item.sub = value;

    if (field === 'color') {
      item.baseColor = value;
      item.color = value;
    }

    if (field === 'iconLeft') item.iconLeft = value;
    if (field === 'iconRight') item.iconRight = value;

    if (field === 'type') {
      item.type = value;

      if (typeof syncDevicePorts === 'function') {
        syncDevicePorts(item, getSafePortCount(item));
      }
    }
    if (field === 'status') item.status = value;

    if (field === 'ipAddress') {
      ensureDeviceIpMemory(item);
      item.ipAddress = value.trim();
    }
    if (field === 'gatewayOverride') item.gatewayOverride = value.trim();
    if (field === 'dnsOverride') item.dnsOverride = value.trim();

    if (field === 'portCount') {
      const count = Math.max(1, Math.min(96, Math.round(Number(value) || 1)));

      item.portCount = count;

      if (typeof syncDevicePorts === 'function') {
        syncDevicePorts(item, count);
      }

      if (typeof propPortCount !== 'undefined' && propPortCount) {
        propPortCount.value = count;
      }

      setStatus(item.name + ' now has ' + count + ' port(s)');
    }

    renderDeviceDetailsPanel(item);
  }

  if (state.selectedType === 'zone') {
    item = state.zones.find(zone => zone.id === state.selectedId);
    if (!item) return;

    if (field === 'name') item.name = value;
    if (field === 'sub') item.sub = value;
    if (field === 'color') item.color = value;
    if (field === 'borderStyle') item.borderStyle = value;

    if (field === 'borderWidth') {
      item.borderWidth = Number(value);
      zoneBorderWidthValue.textContent = Number(value).toFixed(2);
    }

    if (field === 'opacity') {
      item.opacity = Number(value);
      zoneOpacityValue.textContent = Number(value).toFixed(2);
    }

    if (field === 'vlanId') item.vlanId = value;
    if (field === 'subnet') item.subnet = value;
    if (field === 'gateway') item.gateway = value;
    if (field === 'dns') item.dns = value;
    if (field === 'dhcp') item.dhcp = String(value) !== 'false';

    renderZoneDetailsPanel(item);
  }

  if (state.selectedType === 'connection') {
    item = state.connections.find(connection => connection.id === state.selectedId);
    if (!item) return;

    /*
      Phase 1:
      Do not update connection label or connection notes anymore.
      Existing saved label/note values can remain in old JSON files,
      but the current UI no longer edits or displays them.
    */

    if (field === 'from') {
      const newFrom = Number(value);

      if (newFrom === item.to) {
        setStatus('⚠ Connection cannot point to itself');
        refreshSidebar();
        return;
      }

      item.from = newFrom;

      const nextPort = typeof getSelectedPortValue === 'function'
        ? getSelectedPortValue('propConnFromPort', item.from)
        : null;

      item.fromPort = nextPort;

      if (typeof refreshSelectedConnectionPorts === 'function') {
        refreshSelectedConnectionPorts();
      }
    }

    if (field === 'to') {
      const newTo = Number(value);

      if (item.from === newTo) {
        setStatus('⚠ Connection cannot point to itself');
        refreshSidebar();
        return;
      }

      item.to = newTo;

      const nextPort = typeof getSelectedPortValue === 'function'
        ? getSelectedPortValue('propConnToPort', item.to)
        : null;

      item.toPort = nextPort;

      if (typeof refreshSelectedConnectionPorts === 'function') {
        refreshSelectedConnectionPorts();
      }
    }

    if (field === 'fromPort') {
      const newPort = Number(value);

      if (typeof validateConnectionPorts === 'function') {
        const error = validateConnectionPorts(
          item.from,
          newPort,
          item.to,
          item.toPort,
          item.id
        );

        if (error) {
          setStatus(error);
          if (typeof refreshSelectedConnectionPorts === 'function') {
            refreshSelectedConnectionPorts();
          }
          refreshSidebar();
          return;
        }
      }

      item.fromPort = newPort;
    }

    if (field === 'toPort') {
      const newPort = Number(value);

      if (typeof validateConnectionPorts === 'function') {
        const error = validateConnectionPorts(
          item.from,
          item.fromPort,
          item.to,
          newPort,
          item.id
        );

        if (error) {
          setStatus(error);
          if (typeof refreshSelectedConnectionPorts === 'function') {
            refreshSelectedConnectionPorts();
          }
          refreshSidebar();
          return;
        }
      }

      item.toPort = newPort;
    }

    if (field === 'style') item.style = value;
    if (field === 'status') item.status = value;
    if (field === 'fromSide') item.fromSide = value;
    if (field === 'toSide') item.toSide = value;

    item.color = '';
    state.highlightedConnectionId = item.id;
    state.highlightedPortKey = null;

    renderConnectionDetailsPanel(item);

    if (item.from === item.to) {
      setStatus('⚠ Connection cannot point to itself');
    }
  }

  markInspectorDirty();
  refreshSidebar();
}

function useSuggestedIpForSelectedDevice() {
  if (state.selectedType !== 'device') return;

  const device = state.devices.find(item => Number(item.id) === Number(state.selectedId));
  if (!device) return;

  const zone = getDeviceZone(device);

  if (!zone) {
    setStatus('⚠ Device is not inside a VLAN zone');
    return;
  }

  const suggestedIp = getSuggestedIpForDevice(device, zone);

  if (!suggestedIp) {
    setStatus('⚠ No suggested IP available for this VLAN');
    return;
  }

  pushHistory();

  device.ipAddress = suggestedIp;

  if (typeof propDeviceIp !== 'undefined' && propDeviceIp) {
    propDeviceIp.value = suggestedIp;
  }

  renderDeviceDetailsPanel(device);
  refreshSidebar();

  setStatus('Assigned suggested IP ' + suggestedIp + ' to ' + device.name);
}

function resetSelectedDeviceNetworkOverride() {
  if (state.selectedType !== 'device') return;

  pushHistory();

  const device = state.devices.find(item => item.id === state.selectedId);
  if (!device) return;

  device.ipAddress = '';
  device.gatewayOverride = '';
  device.dnsOverride = '';

  if (typeof propDeviceIp !== 'undefined' && propDeviceIp) {
    propDeviceIp.value = '';
  }

  if (typeof propDeviceGateway !== 'undefined' && propDeviceGateway) {
    propDeviceGateway.value = '';
  }

  if (typeof propDeviceDns !== 'undefined' && propDeviceDns) {
    propDeviceDns.value = '';
  }

  renderDeviceDetailsPanel(device);
  refreshSidebar();

  setStatus('Manual network override reset for ' + device.name);
}
function startPacketAnimation() {
  state.animationMode = 'running';

  updateUiState();

  if (typeof drawScene === 'function') {
    drawScene(performance.now());
  }

  setStatus('Animation started');
}

function pausePacketAnimation() {
  state.animationMode = 'paused';

  updateUiState();

  if (typeof drawScene === 'function') {
    drawScene(performance.now());
  }

  setStatus('Animation paused');
}

function stopPacketAnimation() {
  state.animationMode = 'stopped';

  if (typeof resetPacketAnimationClock === 'function') {
    resetPacketAnimationClock();
  }

  updateUiState();

  if (typeof drawScene === 'function') {
    drawScene(performance.now());
  }

  setStatus('Animation stopped');
}

function updateAnimationButtons() {
  const startBtn = document.getElementById('animationStartBtn');
  const pauseBtn = document.getElementById('animationPauseBtn');
  const stopBtn = document.getElementById('animationStopBtn');

  if (!startBtn || !pauseBtn || !stopBtn) return;

  const mode = state.animationMode || 'running';

  const isRunning = mode === 'running';
  const isPaused = mode === 'paused';
  const isStopped = mode === 'stopped';

  startBtn.classList.toggle('is-active', !isRunning);
  startBtn.classList.toggle('is-disabled', isRunning);
  startBtn.disabled = isRunning;

  pauseBtn.classList.toggle('is-active', isRunning);
  pauseBtn.classList.toggle('is-disabled', !isRunning);
  pauseBtn.disabled = !isRunning;

  stopBtn.classList.toggle('is-active', !isStopped);
  stopBtn.classList.toggle('is-disabled', isStopped);
  stopBtn.disabled = isStopped;
}
function setFontSize(value) {
  state.fontSize = Number(value);

  fontSizeInput.value = state.fontSize;
  fontSizeValue.textContent = state.fontSize + 'pt';

  setStatus('Diagram font size: ' + state.fontSize + 'pt');
}

function setBoxScale(value) {
  const newScale = Number(value);
  const oldScale = state.boxScale || 1;

  if (newScale === oldScale) return;

  pushHistory();

  state.boxScale = newScale;

  state.devices.forEach(device => {
    const centerX = device.x + device.w / 2;
    const centerY = device.y + device.h / 2;

    device.w = BASE_DEVICE_W * state.boxScale;
    device.h = BASE_DEVICE_H * state.boxScale;

    device.x = centerX - device.w / 2;
    device.y = centerY - device.h / 2;
  });

  boxScaleInput.value = state.boxScale;
  boxScaleValue.textContent = state.boxScale.toFixed(2) + 'x';

  setStatus('Box / line scale: ' + state.boxScale.toFixed(2) + 'x');
}

function resetDiagramSizing() {
  pushHistory();

  state.fontSize = 16;
  state.boxScale = 1;

  state.devices.forEach(device => {
    const centerX = device.x + device.w / 2;
    const centerY = device.y + device.h / 2;

    device.w = BASE_DEVICE_W;
    device.h = BASE_DEVICE_H;

    device.x = centerX - device.w / 2;
    device.y = centerY - device.h / 2;
  });

  updateUiState();

  setStatus('Diagram sizing reset');
}

function updateUiState() {
  /*
    Phase 1:
    The Ports On/Off button was removed from index.html,
    so this function no longer references portToggleBtn.
  */

  packetSpeedInput.value = state.packetSpeed;
  packetSpeedValue.textContent = state.packetSpeed.toFixed(2) + 'x';

  fontSizeInput.value = state.fontSize;
  fontSizeValue.textContent = state.fontSize + 'pt';

  boxScaleInput.value = state.boxScale;
  boxScaleValue.textContent = state.boxScale.toFixed(2) + 'x';

  document.body.classList.toggle('sidebar-hidden', Boolean(state.sidebarHidden));
  menuToggleBtn.setAttribute('aria-label', state.sidebarHidden ? 'Show menu' : 'Hide menu');

  updateZoomText();

  if (typeof resizeCanvas === 'function') {
    setTimeout(resizeCanvas, 0);
  }
  
  if (typeof applySidebarSectionState === 'function') {
    applySidebarSectionState();
  }

  updateAnimationButtons();

  updateInspectorActionButtons();
}

function updateZoomText() {
  zoomText.textContent = Math.round(state.zoom * 100) + '%';
}