const NETFLOW_STORAGE_KEY = 'netflow-project';

function getProjectPathFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('project') || '';
}

async function loadProjectFromUrl() {
  const projectPath = getProjectPathFromUrl();

  if (!projectPath) return false;

  try {
    const response = await fetch(projectPath, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error('Could not load project file: ' + projectPath);
    }

    const project = await response.json();

    state = normalizeProject(project);
    refreshSidebar();
    updateUiState();
    setStatus('Network diagram loaded');

    return true;
  } catch (error) {
    console.error(error);
    setStatus('⚠ Could not load network diagram');
    return false;
  }
}

window.addEventListener('load', () => {
  loadProjectFromUrl();
});

function saveProject() {
  const clean = JSON.parse(JSON.stringify(state));

  /*
    Keep saved projects clean:
    connection colors are NOT saved manually.
    They are recalculated live every frame.

    Phase 1:
    Connection label/note values may still exist in old projects,
    but the current UI no longer edits or displays them.

    Phase 2:
    Devices now save portCount and ports.

    Phase 3:
    Connections now save fromPort and toPort.
  */
  clean.devices.forEach(d => {
    if (!Number.isFinite(Number(d.portCount)) || Number(d.portCount) < 1) {
      d.portCount = Array.isArray(d.ports) && d.ports.length
        ? d.ports.length
        : 1;
    }

    d.portCount = Math.max(1, Math.min(96, Math.round(Number(d.portCount) || 1)));

    if (!Array.isArray(d.ports)) {
      d.ports = [];
    }

    d.ports = d.ports.map((port, index) => ({
      id: Number(port.id || index + 1),
      name: port.name || 'Port ' + (index + 1),
      type: port.type || 'ethernet',
      mode: port.mode || 'single',
      connectedTo: Array.isArray(port.connectedTo) ? port.connectedTo : [],
      vlan: port.vlan || '',
      ip: port.ip || '',
      subnet: port.subnet || '',
      dhcp: typeof port.dhcp === 'boolean' ? port.dhcp : true,
      speed: port.speed || ''
    }));
  });

  clean.connections.forEach(c => {
    c.color = '';

    if (!Array.isArray(c.points)) {
      c.points = [];
    }

    c.label = c.label || '';
    c.note = c.note || '';

    /*
      Phase 3:
      Store actual port selections on the connection.
      The device ports stay clean; port usage is calculated from connections.
    */
    c.fromPort = c.fromPort ? Number(c.fromPort) : null;
    c.toPort = c.toPort ? Number(c.toPort) : null;
  });

  localStorage.setItem(NETFLOW_STORAGE_KEY, JSON.stringify(clean));
  setStatus('Project saved locally');
}

async function loadProject() {
  const loadedFromUrl = await loadProjectFromUrl();

  if (loadedFromUrl) return;

  const saved = localStorage.getItem(NETFLOW_STORAGE_KEY);

  if (!saved) return setStatus('⚠ No saved project found');

  try {
    pushHistory();
    state = normalizeProject(JSON.parse(saved));
    refreshSidebar();
    updateUiState();
    setStatus('Project loaded');
  } catch (error) {
    console.error(error);
    setStatus('⚠ Could not load saved project');
  }
}

function normalizeProject(p) {
  p.nextDeviceId = p.nextDeviceId || 1;
  p.nextConnectionId = p.nextConnectionId || 1;
  p.nextZoneId = p.nextZoneId || 1;

  p.selectedType = null;
  p.selectedId = null;

  p.viewX = p.viewX || 0;
  p.viewY = p.viewY || 0;
  p.zoom = p.zoom || 1;

  /*
    Phase 1:
    showPorts is now a legacy compatibility field.
    The Ports On/Off button is removed, and canvas labels are no longer drawn.
  */
  p.showPorts = false;

  p.packetSpeed = p.packetSpeed || 0.55;
  p.fontSize = p.fontSize || 16;
  p.boxScale = p.boxScale || 1;
  p.sidebarHidden = p.sidebarHidden || false;

  p.devices = p.devices || [];
  p.connections = p.connections || [];
  p.zones = p.zones || [];

  p.devices.forEach(d => {
    const size = {
      w: BASE_DEVICE_W * (p.boxScale || 1),
      h: BASE_DEVICE_H * (p.boxScale || 1)
    };

    d.id = d.id || p.nextDeviceId++;
    d.name = d.name || 'Device';
    d.sub = d.sub || '';
    d.type = d.type || 'server';

    d.x = Number.isFinite(d.x) ? d.x : 0;
    d.y = Number.isFinite(d.y) ? d.y : 0;
    d.w = d.w || size.w;
    d.h = d.h || size.h;

    d.status = d.status || 'online';
    d.color = d.color || '#3b9eff';
    d.baseColor = d.baseColor || d.color;

    d.iconLeft = d.iconLeft || 'auto';
    d.iconRight = d.iconRight || '';

    /*
      Rotation support.
      Devices rotate in 90 degree steps.
    */
    d.rotation = Number(d.rotation || 0);

    if (![0, 90, 180, 270].includes(d.rotation)) {
      d.rotation = 0;
    }

    /*
      Phase 2:
      Upgrade every old/new loaded device so it has real ports.
    */
    const fallbackPortCount =
      Array.isArray(d.ports) && d.ports.length
        ? d.ports.length
        : (
            typeof getDefaultPortCount === 'function'
              ? getDefaultPortCount(d.type, d.name, d.sub)
              : 1
          );

    d.portCount = Math.max(
      1,
      Math.min(
        96,
        Math.round(Number(d.portCount || fallbackPortCount) || 1)
      )
    );

    if (typeof syncDevicePorts === 'function') {
      syncDevicePorts(d, d.portCount);
    } else {
      d.ports = Array.isArray(d.ports) ? d.ports : [];

      while (d.ports.length < d.portCount) {
        const number = d.ports.length + 1;

        d.ports.push({
          id: number,
          name: 'Port ' + number,
          type: 'ethernet',
          mode: 'single',
          connectedTo: [],
          vlan: '',
          ip: '',
          subnet: '',
          dhcp: true,
          speed: ''
        });
      }

      if (d.ports.length > d.portCount) {
        d.ports.length = d.portCount;
      }
    }

    /*
      Final safety pass for loaded port objects.
    */
    d.ports = Array.isArray(d.ports) ? d.ports : [];

    d.ports = d.ports.map((port, index) => ({
      id: Number(port.id || index + 1),
      name: port.name || 'Port ' + (index + 1),
      type: port.type || 'ethernet',
      mode: port.mode || 'single',
      connectedTo: Array.isArray(port.connectedTo) ? port.connectedTo : [],
      vlan: port.vlan || '',
      ip: port.ip || '',
      subnet: port.subnet || '',
      dhcp: typeof port.dhcp === 'boolean' ? port.dhcp : true,
      speed: port.speed || ''
    }));
  });

  function findLoadedDevice(deviceId) {
    return p.devices.find(device => Number(device.id) === Number(deviceId));
  }

  function findLoadedPort(deviceId, portId) {
    const device = findLoadedDevice(deviceId);

    if (!device || !Array.isArray(device.ports)) return null;

    return device.ports.find(port => Number(port.id) === Number(portId));
  }

  function loadedPortIsReusable(port) {
    if (!port) return false;

    const mode = String(port.mode || 'single').toLowerCase();

    return (
      mode === 'multi' ||
      mode === 'trunk' ||
      mode === 'wireless' ||
      mode === 'virtual'
    );
  }

  function loadedPortUseCount(deviceId, portId, ignoreConnectionId = null) {
    const id = Number(deviceId);
    const port = Number(portId);

    return p.connections.filter(connection => {
      if (ignoreConnectionId && connection.id === ignoreConnectionId) {
        return false;
      }

      return (
        (Number(connection.from) === id && Number(connection.fromPort) === port) ||
        (Number(connection.to) === id && Number(connection.toPort) === port)
      );
    }).length;
  }

  function loadedPortAvailable(deviceId, portId, ignoreConnectionId = null) {
    const port = findLoadedPort(deviceId, portId);

    if (!port) return false;
    if (loadedPortIsReusable(port)) return true;

    return loadedPortUseCount(deviceId, portId, ignoreConnectionId) === 0;
  }

  function chooseLoadedPort(deviceId, ignoreConnectionId = null) {
    const device = findLoadedDevice(deviceId);

    if (!device || !Array.isArray(device.ports) || !device.ports.length) {
      return null;
    }

    const available = device.ports.find(port =>
      loadedPortAvailable(deviceId, port.id, ignoreConnectionId)
    );

    if (available) return Number(available.id);

    /*
      If everything is used, keep the first port as a fallback.
      The UI will still show that it is in use.
    */
    return Number(device.ports[0].id);
  }

  p.connections.forEach(c => {
    c.id = c.id || p.nextConnectionId++;
    c.from = c.from || null;
    c.to = c.to || null;
    c.fromSide = c.fromSide || 'auto';
    c.toSide = c.toSide || 'auto';

    /*
      Phase 1:
      Keep these fields only so older saved projects remain compatible.
      They are no longer shown in the connection modal, sidebar, or canvas.
    */
    c.label = c.label || '';
    c.note = c.note || '';

    /*
      Phase 3:
      Normalize actual port references.
      Old projects without ports get assigned safe defaults.
    */
    c.fromPort = c.fromPort ? Number(c.fromPort) : null;
    c.toPort = c.toPort ? Number(c.toPort) : null;

    if (!findLoadedPort(c.from, c.fromPort)) {
      c.fromPort = chooseLoadedPort(c.from, c.id);
    }

    if (!findLoadedPort(c.to, c.toPort)) {
      c.toPort = chooseLoadedPort(c.to, c.id);
    }

    /*
      If a saved project somehow has a duplicate single-use port,
      try to move it to the next available port.
    */
    if (c.fromPort && !loadedPortAvailable(c.from, c.fromPort, c.id)) {
      c.fromPort = chooseLoadedPort(c.from, c.id);
    }

    if (c.toPort && !loadedPortAvailable(c.to, c.toPort, c.id)) {
      c.toPort = chooseLoadedPort(c.to, c.id);
    }

    c.style = c.style || 'solid';
    c.status = c.status || 'online';

    /*
      Custom bend points for manually angled lines.
    */
    c.points = Array.isArray(c.points)
      ? c.points
          .filter(point => point && Number.isFinite(point.x) && Number.isFinite(point.y))
          .map(point => ({
            x: point.x,
            y: point.y
          }))
      : [];

    /*
      Kill old saved connection colors.
      This fixes older projects where a connection stayed blue forever.
    */
    c.color = '';
  });

  p.zones.forEach(z => {
    z.id = z.id || p.nextZoneId++;
    z.name = z.name || 'Zone';
    z.sub = z.sub || '';

    z.x = Number.isFinite(z.x) ? z.x : 0;
    z.y = Number.isFinite(z.y) ? z.y : 0;
    z.w = z.w || 300;
    z.h = z.h || 200;

    z.color = z.color || '#64ffda';
    z.borderStyle = z.borderStyle || 'dashed';
    z.borderWidth = z.borderWidth || 1.5;
    z.opacity = z.opacity ?? 0.06;
  });

  return p;
}