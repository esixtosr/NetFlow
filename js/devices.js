function setDeviceColor(c) {
  document.getElementById('deviceColor').value = c;
}

function getDeviceSize() {
  return {
    w: BASE_DEVICE_W * (state.boxScale || 1),
    h: BASE_DEVICE_H * (state.boxScale || 1)
  };
}

function getDefaultPortCount(type, name = '', sub = '') {
  const cleanType = String(type || '').toLowerCase();
  const cleanName = String(name || '').toLowerCase();
  const cleanSub = String(sub || '').toLowerCase();
  const combined = cleanType + ' ' + cleanName + ' ' + cleanSub;

  if (
    cleanType === 'switch' ||
    combined.includes('switch') ||
    combined.includes('usw')
  ) {
    return 5;
  }

  if (
    cleanType === 'router' ||
    cleanType === 'firewall' ||
    combined.includes('router') ||
    combined.includes('gateway') ||
    combined.includes('firewall')
  ) {
    return 4;
  }

  if (
    cleanType === 'ap' ||
    cleanType === 'wifi' ||
    combined.includes('access point') ||
    combined.includes('wifi') ||
    combined.includes('ssid')
  ) {
    return 1;
  }

  if (
    cleanType === 'database' ||
    combined.includes('nas') ||
    combined.includes('truenas') ||
    combined.includes('storage')
  ) {
    return 2;
  }

  if (
    combined.includes('proxmox') ||
    combined.includes('vm host') ||
    combined.includes('hypervisor') ||
    combined.includes('esxi') ||
    combined.includes('vsphere')
  ) {
    return 4;
  }

  if (cleanType === 'server') {
    return 2;
  }

  if (cleanType === 'vm') {
    return 1;
  }

  if (
    cleanType === 'pc' ||
    combined.includes('pc') ||
    combined.includes('workstation') ||
    combined.includes('laptop') ||
    combined.includes('desktop')
  ) {
    return 1;
  }

  if (
    cleanType === 'cloud' ||
    combined.includes('internet') ||
    combined.includes('wan') ||
    combined.includes('isp') ||
    combined.includes('cloud')
  ) {
    return 1;
  }

  return 1;
}

function getDevicePortMode(device) {
  const type = String(device.type || '').toLowerCase();
  const name = String(device.name || '').toLowerCase();
  const sub = String(device.sub || '').toLowerCase();
  const combined = type + ' ' + name + ' ' + sub;

  if (
    type === 'switch' ||
    combined.includes('switch') ||
    combined.includes('usw')
  ) {
    return 'single';
  }

  if (
    type === 'router' ||
    type === 'firewall' ||
    combined.includes('router') ||
    combined.includes('gateway') ||
    combined.includes('firewall')
  ) {
    return 'trunk';
  }

  if (
    type === 'ap' ||
    type === 'wifi' ||
    combined.includes('access point') ||
    combined.includes('wifi') ||
    combined.includes('ssid')
  ) {
    return 'trunk';
  }

  if (
    combined.includes('proxmox') ||
    combined.includes('vm host') ||
    combined.includes('hypervisor') ||
    combined.includes('esxi') ||
    combined.includes('vsphere')
  ) {
    return 'trunk';
  }

  if (
    type === 'server' ||
    type === 'vm'
  ) {
    return 'multi';
  }

  return 'single';
}

function getPortNameForDevice(device, number) {
  const type = String(device.type || '').toLowerCase();
  const name = String(device.name || '').toLowerCase();
  const sub = String(device.sub || '').toLowerCase();
  const combined = type + ' ' + name + ' ' + sub;

  if (
    type === 'pc' ||
    type === 'server' ||
    type === 'vm' ||
    type === 'database' ||
    combined.includes('nas') ||
    combined.includes('truenas') ||
    combined.includes('workstation') ||
    combined.includes('desktop') ||
    combined.includes('laptop')
  ) {
    return 'NIC ' + number;
  }

  if (
    type === 'cloud' ||
    combined.includes('internet') ||
    combined.includes('wan') ||
    combined.includes('isp') ||
    combined.includes('cloud')
  ) {
    return number === 1 ? 'WAN' : 'WAN ' + number;
  }

  if (
    type === 'ap' ||
    combined.includes('access point')
  ) {
    return number === 1 ? 'Uplink' : 'Port ' + number;
  }

  return 'Port ' + number;
}

function ensureDeviceNetworkOverrideFields(device) {
  if (!device) return;

  if (device.ipAddress === undefined || device.ipAddress === null) {
    device.ipAddress = '';
  }

  if (device.gatewayOverride === undefined || device.gatewayOverride === null) {
    device.gatewayOverride = '';
  }

  if (device.dnsOverride === undefined || device.dnsOverride === null) {
    device.dnsOverride = '';
  }

  /*
    Phase 7.5:
    Stores remembered manual IPs per VLAN zone.
    Example:
    {
      "zone-123": "10.20.20.40",
      "zone-456": "192.168.1.10"
    }
  */
  if (
    !device.ipMemoryByVlan ||
    typeof device.ipMemoryByVlan !== 'object' ||
    Array.isArray(device.ipMemoryByVlan)
  ) {
    device.ipMemoryByVlan = {};
  }
}

function ensureDeviceWirelessFields(device) {
  if (!device) return;

  const type = String(device.type || '').toLowerCase();
  const name = String(device.name || '').toLowerCase();
  const sub = String(device.sub || '').toLowerCase();

  const isWifiOrSsid =
    type === 'wifi' ||
    name.includes('ssid') ||
    name.includes('wi-fi') ||
    name.includes('wifi') ||
    sub.includes('ssid') ||
    sub.includes('wi-fi') ||
    sub.includes('wifi');

  if (!isWifiOrSsid) {
    if (device.wifiBands === undefined) {
      device.wifiBands = null;
    }

    return;
  }

  if (!device.wifiBands || typeof device.wifiBands !== 'object' || Array.isArray(device.wifiBands)) {
    device.wifiBands = {
      ghz24: true,
      ghz5: true,
      ghz6: false
    };
    return;
  }

  device.wifiBands.ghz24 = Boolean(device.wifiBands.ghz24);
  device.wifiBands.ghz5 = Boolean(device.wifiBands.ghz5);
  device.wifiBands.ghz6 = Boolean(device.wifiBands.ghz6);
}

function isDeviceNetworkInfrastructure(device) {
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

function createPort(device, number) {
  return {
    id: number,
    name: getPortNameForDevice(device, number),
    type: 'ethernet',
    mode: getDevicePortMode(device),

    /*
      Phase 2:
      These fields are placeholders.
      Actual active connections are stored in state.connections.
    */
    connectedTo: [],
    vlan: '',
    ip: '',
    subnet: '',
    dhcp: true,
    speed: ''
  };
}

function generatePortsForDevice(device, portCount) {
  const count = Math.max(1, Number(portCount) || 1);
  const ports = [];

  for (let i = 1; i <= count; i++) {
    ports.push(createPort(device, i));
  }

  return ports;
}

function syncDevicePorts(device, portCount) {
  const count = Math.max(1, Number(portCount) || 1);

  ensureDeviceNetworkOverrideFields(device);
  ensureDeviceWirelessFields(device);

  if (!Array.isArray(device.ports)) {
    device.ports = [];
  }

  const existingPorts = device.ports;

  while (existingPorts.length < count) {
    existingPorts.push(createPort(device, existingPorts.length + 1));
  }

  if (existingPorts.length > count) {
    existingPorts.length = count;
  }

  existingPorts.forEach((port, index) => {
    const number = index + 1;

    port.id = port.id || number;
    port.name = port.name || getPortNameForDevice(device, number);
    port.type = port.type || 'ethernet';
    port.mode = port.mode || getDevicePortMode(device);
    port.connectedTo = Array.isArray(port.connectedTo) ? port.connectedTo : [];
    port.vlan = port.vlan || '';
    port.ip = port.ip || '';
    port.subnet = port.subnet || '';
    port.dhcp = typeof port.dhcp === 'boolean' ? port.dhcp : true;
    port.speed = port.speed || '';
  });

  device.portCount = count;
  device.ports = existingPorts;

  return device.ports;
}

function getDevicePortCountInputValue(type, name, sub) {
  /*
    Phase 2:
    index.html has a devicePortCount input.
    This fallback keeps devices.js from crashing if that input is missing.
  */

  if (typeof devicePortCount !== 'undefined' && devicePortCount) {
    const value = Number(devicePortCount.value);

    if (Number.isFinite(value) && value > 0) {
      return Math.max(1, Math.min(96, Math.round(value)));
    }
  }

  return getDefaultPortCount(type, name, sub);
}

function updateDevicePortCountDefault() {
  /*
    Auto-fills the recommended port count when device type changes.
  */

  if (typeof devicePortCount === 'undefined' || !devicePortCount) return;

  const name = typeof deviceName !== 'undefined' ? deviceName.value.trim() : '';
  const sub = typeof deviceSub !== 'undefined' ? deviceSub.value.trim() : '';
  const type = typeof deviceType !== 'undefined' ? deviceType.value : 'server';

  devicePortCount.value = getDefaultPortCount(type, name, sub);
}

function addDevice() {
  const name = deviceName.value.trim();
  const sub = deviceSub.value.trim();
  const type = deviceType.value;
  const status = deviceStatus.value;
  const color = deviceColor.value;
  const iconLeft = deviceIconLeft.value;
  const iconRight = deviceIconRight.value;
  const portCount = getDevicePortCountInputValue(type, name, sub);

  if (!name) {
    return setStatus('⚠ Enter a device name first');
  }

  pushHistory();

  const cx = (canvas.width / 2 - state.viewX) / state.zoom;
  const cy = (canvas.height / 2 - state.viewY) / state.zoom;
  const s = getDeviceSize();

  const newDevice = {
    id: uid('device'),
    name,
    sub,
    type,
    status,
    color,
    baseColor: color,
    iconLeft,
    iconRight,
    rotation: 0,

    /*
      Phase 8.1:
      WiFi / SSID devices can advertise supported bands.
      These bands describe what the SSID broadcasts overall;
      individual wireless clients do not need per-device band assignments.
    */
    wifiBands: type === 'wifi'
      ? {
          ghz24: true,
          ghz5: true,
          ghz6: false
        }
      : null,

    /*
      Phase 6.3:
      Manual network override fields.
      Blank means the device uses inherited VLAN network data.
    */
    ipAddress: '',
    gatewayOverride: '',
    dnsOverride: '',

    /*
      Phase 7.5:
      Stores remembered manual IPs by VLAN zone.
    */
    ipMemoryByVlan: {},

    /*
      Phase 2:
      Devices understand their own port count.
    */
    portCount,
    ports: [],

    x: cx - s.w / 2 + Math.random() * 70,
    y: cy - s.h / 2 + Math.random() * 70,
    w: s.w,
    h: s.h
  };

  ensureDeviceWirelessFields(newDevice);
  syncDevicePorts(newDevice, portCount);

  state.devices.push(newDevice);

  deviceName.value = '';
  deviceSub.value = '';
  deviceIconLeft.value = 'auto';
  deviceIconRight.value = '';

  if (typeof devicePortCount !== 'undefined' && devicePortCount) {
    devicePortCount.value = getDefaultPortCount(deviceType.value, '', '');
  }

  refreshSidebar();
  setStatus('Added device: ' + name + ' · ' + portCount + ' port(s)');
}

function removeDevice(id) {
  pushHistory();

  state.devices = state.devices.filter(d => d.id !== id);
  state.connections = state.connections.filter(c => c.from !== id && c.to !== id);

  if (state.selectedType === 'device' && state.selectedId === id) {
    clearSelection();
  }

  refreshSidebar();
}

function getDeviceZone(d) {
  const cx = d.x + d.w / 2;
  const cy = d.y + d.h / 2;

  for (let i = state.zones.length - 1; i >= 0; i--) {
    const z = state.zones[i];

    if (cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h) {
      return z;
    }
  }

  return null;
}

function getDeviceColor(d) {
  if (isDeviceNetworkInfrastructure(d)) {
    return d.baseColor || d.color || '#3b9eff';
  }

  const z = getDeviceZone(d);

  return z ? z.color : (d.baseColor || d.color || '#3b9eff');
}

function getDeviceIconLeft(d) {
  return d.iconLeft && d.iconLeft !== 'auto'
    ? d.iconLeft
    : (TYPE_ICON[d.type] || 'shield-lock');
}

function getDeviceIconRight(d) {
  return d.iconRight || '';
}

function rotateSelectedDevice(direction = 1) {
  if (state.selectedType !== 'device') return;

  const device = state.devices.find(d => d.id === state.selectedId);
  if (!device) return;

  pushHistory();

  ensureDeviceNetworkOverrideFields(device);
  ensureDeviceWirelessFields(device);

  device.rotation = ((device.rotation || 0) + direction * 90) % 360;

  if (device.rotation < 0) {
    device.rotation += 360;
  }

  refreshSidebar();
  setStatus('Device rotated to ' + device.rotation + '°');
}