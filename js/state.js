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

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  function device(name, sub, type, color, x, y, status = 'online', iconLeft = 'auto', iconRight = '', portCountOverride = null) {
    const size = getDeviceSize();

    const portCount =
      portCountOverride ||
      (
        typeof getDefaultPortCount === 'function'
          ? getDefaultPortCount(type, name, sub)
          : 1
      );

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
        Phase 2:
        Starter devices include generated ports.
        Starter connections may still need to be re-added for exact port assignments.
      */
      portCount,
      ports: [],

      x,
      y,
      w: size.w,
      h: size.h
    };

    if (typeof syncDevicePorts === 'function') {
      syncDevicePorts(newDevice, portCount);
    }

    state.devices.push(newDevice);
    return newDevice;
  }

  function vlanZone(name, color, x, y, w, h, vlanId, subnet, gateway, dns, dhcp = true, opacity = 0.06) {
    return {
      id: uid('zone'),
      name,
      sub: '',
      color,
      borderStyle: 'dashed',
      borderWidth: 1.5,
      opacity,

      /*
        Phase 6.1:
        VLAN network profile fields.
      */
      vlanId,
      subnet,
      gateway,
      dns,
      dhcp,

      x,
      y,
      w,
      h
    };
  }

  const wan = device(
    'Internet',
    'WAN / ISP Uplink',
    'cloud',
    '#3b9eff',
    centerX - 145,
    centerY - 360,
    'online',
    'cloud',
    '',
    1
  );

  const gateway = device(
    'Cloud GW Fiber',
    'Router / Firewall',
    'firewall',
    '#3b9eff',
    centerX - 145,
    centerY - 205,
    'online',
    'network',
    'shield-lock',
    4
  );

  const ap = device(
    'U7 Pro AP',
    'Wireless Access Point',
    'ap',
    '#3b9eff',
    centerX - 450,
    centerY - 55,
    'online',
    'antenna-bars-5',
    '',
    1
  );

  const sw = device(
    'USW Flex 2.5G',
    'Core Switch',
    'switch',
    '#b388ff',
    centerX + 105,
    centerY - 55,
    'online',
    'switch-horizontal',
    '',
    5
  );

  const pc = device(
    'Win 11 PC',
    'Wired Endpoint',
    'pc',
    '#3b9eff',
    centerX - 450,
    centerY + 150,
    'online',
    'devices-2',
    '',
    1
  );

  const ssid1 = device(
    'CIA SSID',
    'Main WiFi',
    'wifi',
    '#3b9eff',
    centerX - 765,
    centerY + 115,
    'online',
    'wifi',
    '',
    1
  );

  const ssid2 = device(
    'FBI SSID',
    'IoT WiFi',
    'wifi',
    '#00d4aa',
    centerX - 765,
    centerY + 285,
    'online',
    'wifi',
    '',
    1
  );

  const dc = device(
    'US-M-DC01',
    'AD DS · DNS · 10.20.20.10',
    'server',
    '#39d353',
    centerX - 40,
    centerY + 155,
    'online',
    'server',
    '',
    2
  );

  const siem = device(
    'US-M-SIEM01',
    'Wazuh · 10.20.20.40',
    'vm',
    '#39d353',
    centerX + 355,
    centerY + 155,
    'online',
    'desktop',
    'shield-lock',
    1
  );

  const nas = device(
    'US-M-NAS01',
    'TrueNAS · 10.20.20.50',
    'database',
    '#7a8899',
    centerX + 750,
    centerY + 155,
    'online',
    'database',
    '',
    2
  );

  const proj = device(
    'Project VM Host',
    'Lab VMs',
    'server',
    '#ff9f43',
    centerX + 355,
    centerY + 345,
    'online',
    'server',
    'desktop',
    4
  );

  state.zones.push(
    vlanZone(
      'Default VLAN',
      '#3b9eff',
      centerX - 820,
      centerY + 80,
      740,
      195,
      '10',
      '192.168.1.0/24',
      '192.168.1.1',
      '192.168.1.1',
      true,
      0.06
    ),
    vlanZone(
      'IoT VLAN',
      '#00d4aa',
      centerX - 820,
      centerY + 270,
      430,
      160,
      '30',
      '10.30.30.0/24',
      '10.30.30.1',
      '10.30.30.1',
      true,
      0.07
    ),
    vlanZone(
      'Enterprise VLAN',
      '#39d353',
      centerX - 75,
      centerY + 120,
      780,
      210,
      '20',
      '10.20.20.0/26',
      '10.20.20.1',
      '10.20.20.10, 10.20.20.20',
      false,
      0.06
    ),
    vlanZone(
      'Management VLAN',
      '#7a8899',
      centerX + 720,
      centerY + 120,
      430,
      210,
      '10',
      '10.10.10.0/24',
      '10.10.10.1',
      '10.10.10.1',
      false,
      0.06
    ),
    vlanZone(
      'Projects VLAN',
      '#ff9f43',
      centerX + 330,
      centerY + 320,
      430,
      180,
      '40',
      '10.40.40.0/24',
      '10.40.40.1',
      '10.40.40.1',
      true,
      0.06
    )
  );

  function wire(fromDevice, toDevice, style = 'solid', status = 'online') {
    state.connections.push({
      id: uid('connection'),
      from: fromDevice.id,
      to: toDevice.id,

      /*
        Compatibility fields.
        Connections created through the modal use real fromPort/toPort values.
      */
      fromPort: null,
      toPort: null,

      label: '',
      note: '',

      style,
      status,
      color: '',
      points: [],
      fromSide: 'auto',
      toSide: 'auto'
    });
  }

  wire(wan, gateway);
  wire(gateway, ap);
  wire(gateway, sw);
  wire(gateway, pc);
  wire(ap, ssid1, 'dashed');
  wire(ap, ssid2, 'dashed');
  wire(sw, dc);
  wire(sw, siem);
  wire(sw, nas);
  wire(sw, proj);
}

let dragging = null;
let resizingZone = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let panning = false;
let panStartX = 0;
let panStartY = 0;