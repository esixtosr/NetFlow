function getConnectionColor(c) {
  const status = String(c.status || 'online').toLowerCase();

  if (status !== 'online') {
    return STATUS_COLOR[status] || '#ffffff';
  }

  const a = state.devices.find(d => Number(d.id) === Number(c.from));
  const b = state.devices.find(d => Number(d.id) === Number(c.to));

  if (!a && !b) return '#ffffff';
  if (a && !b) return getDeviceColor(a);
  if (!a && b) return getDeviceColor(b);

  const za = typeof getEffectiveCanvasDeviceZone === 'function'
    ? getEffectiveCanvasDeviceZone(a)
    : getDeviceZone(a);

  const zb = typeof getEffectiveCanvasDeviceZone === 'function'
    ? getEffectiveCanvasDeviceZone(b)
    : getDeviceZone(b);

  if (za && zb) {
    if (Number(za.id) === Number(zb.id)) return za.color;
    return Number(a.id) > Number(b.id) ? za.color : zb.color;
  }

  if (za && !zb) return za.color;
  if (!za && zb) return zb.color;

  return Number(a.id) > Number(b.id) ? getDeviceColor(a) : getDeviceColor(b);
}

function getDeviceById(deviceId) {
  return state.devices.find(d => d.id === Number(deviceId));
}

function isConnectionWirelessSsidDevice(device) {
  if (!device) return false;

  const type = String(device.type || '').toLowerCase();
  const name = String(device.name || '').toLowerCase();
  const sub = String(device.sub || '').toLowerCase();

  return (
    type === 'wifi' ||
    name.includes('ssid') ||
    name.includes('wi-fi') ||
    name.includes('wifi') ||
    sub.includes('ssid') ||
    sub.includes('wi-fi') ||
    sub.includes('wifi')
  );
}


function isConnectionNetworkInfrastructureDevice(device) {
  if (!device) return false;

  const type = String(device.type || '').toLowerCase();
  const name = String(device.name || '').toLowerCase();
  const sub = String(device.sub || '').toLowerCase();

  return (
    type === 'router' ||
    type === 'firewall' ||
    type === 'switch' ||
    type === 'ap' ||
    type === 'cloud' ||
    type === 'gateway' ||
    name.includes('router') ||
    name.includes('firewall') ||
    name.includes('switch') ||
    name.includes('gateway') ||
    name.includes('cloud') ||
    name.includes('wan') ||
    name.includes('internet') ||
    name.includes('access point') ||
    name.includes(' ap') ||
    name.includes('unifi') ||
    name.includes('proxmox') ||
    name.includes('vm host') ||
    name.includes('hypervisor') ||
    sub.includes('router') ||
    sub.includes('firewall') ||
    sub.includes('switch') ||
    sub.includes('gateway') ||
    sub.includes('cloud') ||
    sub.includes('wan') ||
    sub.includes('internet') ||
    sub.includes('access point') ||
    sub.includes('unifi') ||
    sub.includes('proxmox') ||
    sub.includes('vm host') ||
    sub.includes('hypervisor')
  );
}

function isConnectionAccessPointDevice(device) {
  if (!device) return false;
  if (isConnectionWirelessSsidDevice(device)) return false;

  const type = String(device.type || '').toLowerCase();
  const name = String(device.name || '').toLowerCase();
  const sub = String(device.sub || '').toLowerCase();

  return (
    type === 'ap' ||
    type === 'access-point' ||
    type === 'access point' ||
    name.includes('access point') ||
    name.includes(' ap') ||
    name.includes('u7') ||
    name.includes('u6') ||
    name.includes('unifi') ||
    sub.includes('access point') ||
    sub.includes(' ap') ||
    sub.includes('wireless access point')
  );
}

function isConnectionWirelessClientDevice(device) {
  if (!device) return false;
  if (isConnectionWirelessSsidDevice(device)) return false;
  if (isConnectionNetworkInfrastructureDevice(device)) return false;

  return true;
}



function getWirelessAssociationDetails(from, to) {
  const fromDevice = getDeviceById(from);
  const toDevice = getDeviceById(to);

  const fromIsSsid = isConnectionWirelessSsidDevice(fromDevice);
  const toIsSsid = isConnectionWirelessSsidDevice(toDevice);

  if (fromIsSsid === toIsSsid) return null;

  const ssidDevice = fromIsSsid ? fromDevice : toDevice;
  const clientDevice = fromIsSsid ? toDevice : fromDevice;

  if (!isConnectionWirelessClientDevice(clientDevice)) return null;

  return {
    ssidDevice,
    clientDevice
  };
}

function getSsidBroadcastDetails(from, to) {
  const fromDevice = getDeviceById(from);
  const toDevice = getDeviceById(to);

  const fromIsSsid = isConnectionWirelessSsidDevice(fromDevice);
  const toIsSsid = isConnectionWirelessSsidDevice(toDevice);

  if (fromIsSsid === toIsSsid) return null;

  const ssidDevice = fromIsSsid ? fromDevice : toDevice;
  const apDevice = fromIsSsid ? toDevice : fromDevice;

  if (!isConnectionAccessPointDevice(apDevice)) return null;

  return {
    ssidDevice,
    apDevice
  };
}


function updateConnectionModalLabels(from, to) {
  const wirelessAssociation = getWirelessAssociationDetails(from, to);
  const ssidBroadcast = getSsidBroadcastDetails(from, to);
  const modalTitle = document.getElementById('connectionModalTitle');
  const modalHint = document.getElementById('connectionModalHint');
  const addButton = document.getElementById('addConnectionBtn');
  const fromLabel = document.getElementById('connFromLabel');
  const fromPortLabel = document.getElementById('connFromPortLabel');
  const toLabel = document.getElementById('connToLabel');
  const toPortLabel = document.getElementById('connToPortLabel');

  if (!wirelessAssociation && !ssidBroadcast) {
    if (modalTitle) modalTitle.textContent = 'Add Connection';
    if (modalHint) {
      modalHint.textContent = 'Select two devices to create a wired connection, SSID broadcast, or wireless association.';
    }
    if (addButton) addButton.textContent = 'Add';
    if (fromLabel) fromLabel.textContent = 'From Device';
    if (fromPortLabel) fromPortLabel.textContent = 'From Port';
    if (toLabel) toLabel.textContent = 'To Device';
    if (toPortLabel) toPortLabel.textContent = 'To Port';
    return;
  }

  if (ssidBroadcast) {
    const fromDevice = getDeviceById(from);
    const fromIsAp = isConnectionAccessPointDevice(fromDevice);

    if (modalTitle) modalTitle.textContent = 'Add SSID Broadcast';
    if (modalHint) {
      modalHint.textContent = 'Connect an access point to an SSID it broadcasts. Client devices still connect to the SSID.';
    }
    if (addButton) addButton.textContent = 'Add SSID Broadcast';

    if (fromLabel) fromLabel.textContent = fromIsAp ? 'Access Point' : 'SSID';
    if (fromPortLabel) fromPortLabel.textContent = fromIsAp ? 'AP Uplink / Radio' : 'SSID Broadcast Link';
    if (toLabel) toLabel.textContent = fromIsAp ? 'SSID' : 'Access Point';
    if (toPortLabel) toPortLabel.textContent = fromIsAp ? 'SSID Broadcast Link' : 'AP Uplink / Radio';
    return;
  }

  const fromDevice = getDeviceById(from);
  const fromIsSsid = isConnectionWirelessSsidDevice(fromDevice);

  if (modalTitle) modalTitle.textContent = 'Add Wireless Association';
  if (modalHint) {
    modalHint.textContent = 'Connect a wireless client to an SSID. SSID links can support multiple clients.';
  }
  if (addButton) addButton.textContent = 'Add Wireless Association';

  if (fromLabel) fromLabel.textContent = fromIsSsid ? 'SSID' : 'Wireless Client';
  if (fromPortLabel) fromPortLabel.textContent = fromIsSsid ? 'SSID Link' : 'Client Link';
  if (toLabel) toLabel.textContent = fromIsSsid ? 'Wireless Client' : 'SSID';
  if (toPortLabel) toPortLabel.textContent = fromIsSsid ? 'Client Link' : 'SSID Link';
}

function updateSelectedConnectionLabels(connection) {
  const wirelessAssociation = getWirelessAssociationDetails(
    connection ? connection.from : null,
    connection ? connection.to : null
  );
  const ssidBroadcast = getSsidBroadcastDetails(
    connection ? connection.from : null,
    connection ? connection.to : null
  );

  const fromLabel = document.getElementById('propConnFromLabel');
  const fromPortLabel = document.getElementById('propConnFromPortLabel');
  const toLabel = document.getElementById('propConnToLabel');
  const toPortLabel = document.getElementById('propConnToPortLabel');

  if ((!wirelessAssociation && !ssidBroadcast) || !connection) {
    if (fromLabel) fromLabel.textContent = 'From Device';
    if (fromPortLabel) fromPortLabel.textContent = 'From Port';
    if (toLabel) toLabel.textContent = 'To Device';
    if (toPortLabel) toPortLabel.textContent = 'To Port';
    return;
  }

  if (ssidBroadcast) {
    const fromDevice = getDeviceById(connection.from);
    const fromIsAp = isConnectionAccessPointDevice(fromDevice);

    if (fromLabel) fromLabel.textContent = fromIsAp ? 'Access Point' : 'SSID';
    if (fromPortLabel) fromPortLabel.textContent = fromIsAp ? 'AP Uplink / Radio' : 'SSID Broadcast Link';
    if (toLabel) toLabel.textContent = fromIsAp ? 'SSID' : 'Access Point';
    if (toPortLabel) toPortLabel.textContent = fromIsAp ? 'SSID Broadcast Link' : 'AP Uplink / Radio';
    return;
  }

  const fromDevice = getDeviceById(connection.from);
  const fromIsSsid = isConnectionWirelessSsidDevice(fromDevice);

  if (fromLabel) fromLabel.textContent = fromIsSsid ? 'SSID' : 'Wireless Client';
  if (fromPortLabel) fromPortLabel.textContent = fromIsSsid ? 'SSID Link' : 'Client Link';
  if (toLabel) toLabel.textContent = fromIsSsid ? 'Wireless Client' : 'SSID';
  if (toPortLabel) toPortLabel.textContent = fromIsSsid ? 'Client Link' : 'SSID Link';
}


function connectionInvolvesWirelessSsid(from, to) {
  return Boolean(
    getWirelessAssociationDetails(from, to) ||
    getSsidBroadcastDetails(from, to)
  );
}

function applyWirelessConnectionDefaults(from, to) {
  if (!connectionInvolvesWirelessSsid(from, to)) return;

  if (typeof connStyle !== 'undefined' && connStyle) {
    connStyle.value = 'dashed';
  }

  if (typeof connShape !== 'undefined' && connShape && !connShape.value) {
    connShape.value = 'smart';
  }
}

function getConnectionStyleValue(from, to, requestedStyle) {
  if (connectionInvolvesWirelessSsid(from, to)) {
    return 'dashed';
  }

  return requestedStyle || 'solid';
}

function getDevicePorts(deviceId) {
  const device = getDeviceById(deviceId);

  if (!device) return [];

  if (typeof syncDevicePorts === 'function') {
    const count =
      Number(device.portCount) ||
      (Array.isArray(device.ports) ? device.ports.length : 1) ||
      1;

    syncDevicePorts(device, count);
  }

  return Array.isArray(device.ports) ? device.ports : [];
}

function getPortById(deviceId, portId) {
  const ports = getDevicePorts(deviceId);
  return ports.find(port => Number(port.id) === Number(portId));
}

function isReusablePort(port) {
  if (!port) return false;

  const mode = String(port.mode || 'single').toLowerCase();

  return (
    mode === 'multi' ||
    mode === 'trunk' ||
    mode === 'wireless' ||
    mode === 'virtual'
  );
}

function getUsedPortConnectionCount(deviceId, portId, ignoreConnectionId = null) {
  const id = Number(deviceId);
  const port = Number(portId);

  return state.connections.filter(connection => {
    if (ignoreConnectionId && connection.id === ignoreConnectionId) {
      return false;
    }

    return (
      (Number(connection.from) === id && Number(connection.fromPort) === port) ||
      (Number(connection.to) === id && Number(connection.toPort) === port)
    );
  }).length;
}

function isPortAvailable(deviceId, portId, ignoreConnectionId = null) {
  const port = getPortById(deviceId, portId);
  const device = getDeviceById(deviceId);

  if (!port) return false;
  if (isConnectionWirelessSsidDevice(device)) return true;
  if (isReusablePort(port)) return true;

  return getUsedPortConnectionCount(deviceId, portId, ignoreConnectionId) === 0;
}

function isSameConnectionPair(connection, from, fromPort, to, toPort) {
  const cFrom = Number(connection.from);
  const cTo = Number(connection.to);
  const cFromPort = Number(connection.fromPort);
  const cToPort = Number(connection.toPort);

  const nFrom = Number(from);
  const nTo = Number(to);
  const nFromPort = Number(fromPort);
  const nToPort = Number(toPort);

  const sameDirection =
    cFrom === nFrom &&
    cFromPort === nFromPort &&
    cTo === nTo &&
    cToPort === nToPort;

  const reverseDirection =
    cFrom === nTo &&
    cFromPort === nToPort &&
    cTo === nFrom &&
    cToPort === nFromPort;

  return sameDirection || reverseDirection;
}


function connectionPairExists(from, fromPort, to, toPort, ignoreConnectionId = null) {
  return state.connections.some(connection => {
    if (ignoreConnectionId && connection.id === ignoreConnectionId) {
      return false;
    }

    return isSameConnectionPair(connection, from, fromPort, to, toPort);
  });
}

function wirelessClientAssociationExists(clientDeviceId, ignoreConnectionId = null) {
  const clientId = Number(clientDeviceId);

  return state.connections.some(connection => {
    if (ignoreConnectionId && Number(connection.id) === Number(ignoreConnectionId)) {
      return false;
    }

    const details = getWirelessAssociationDetails(connection.from, connection.to);

    return Boolean(
      details &&
      details.clientDevice &&
      Number(details.clientDevice.id) === clientId
    );
  });
}

function getPortUsageLabel(deviceId, port, ignoreConnectionId = null) {
  const usedCount = getUsedPortConnectionCount(deviceId, port.id, ignoreConnectionId);
  const device = getDeviceById(deviceId);

  if (!usedCount) return 'Available';

  if (isConnectionWirelessSsidDevice(device)) {
    return usedCount + ' wireless client' + (usedCount === 1 ? '' : 's');
  }

  if (isReusablePort(port)) {
    return usedCount + ' connection' + (usedCount === 1 ? '' : 's');
  }

  return 'In use';
}

function populatePortSelect(selectId, deviceId, selectedPortId = null, ignoreConnectionId = null) {
  const select = document.getElementById(selectId);

  if (!select) return;

  const ports = getDevicePorts(deviceId);
  const device = getDeviceById(deviceId);
  const isWirelessSsid = isConnectionWirelessSsidDevice(device);

  if (!ports.length) {
    select.innerHTML = '<option value="">No ports</option>';
    return;
  }

  const currentSelected = selectedPortId ? Number(selectedPortId) : null;

  select.innerHTML = ports.map(port => {
    const available = isPortAvailable(deviceId, port.id, ignoreConnectionId);
    const isCurrent = currentSelected === Number(port.id);
    const usage = getPortUsageLabel(deviceId, port, ignoreConnectionId);

    /*
      Keep the current port selectable when editing an existing connection.
      Otherwise, block used single-use ports.
      Trunk/multi ports remain selectable because they may allow different valid connections.
    */
    const disabled = !available && !isCurrent ? 'disabled' : '';

    const modeText = port.mode && port.mode !== 'single'
      ? ' · ' + port.mode
      : '';

    const portName = isWirelessSsid
      ? 'Wireless Link ' + port.id
      : port.name || 'Port ' + port.id;

    const label = `${portName} · ${usage}${modeText}`;

    return `<option value="${port.id}" ${disabled}>${escapeHtml(label)}</option>`;
  }).join('');

  const preferredPort = ports.find(port => Number(port.id) === currentSelected);

  if (preferredPort) {
    select.value = String(preferredPort.id);
    return;
  }

  const firstAvailable = ports.find(port => isPortAvailable(deviceId, port.id, ignoreConnectionId));

  if (firstAvailable) {
    select.value = String(firstAvailable.id);
  } else {
    select.value = String(ports[0].id);
  }
}

function populateConnectionSelects(a, b) {
  const opts = state.devices
    .map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`)
    .join('');

  document.getElementById(a).innerHTML = opts;
  document.getElementById(b).innerHTML = opts;
}

function getConnectionModalValues() {
  if (
    typeof connFrom === 'undefined' ||
    typeof connTo === 'undefined'
  ) {
    return null;
  }

  const from = Number(connFrom.value);
  const to = Number(connTo.value);

  const fromPort =
    typeof connFromPort !== 'undefined'
      ? getSelectedPortValue('connFromPort', from)
      : null;

  const toPort =
    typeof connToPort !== 'undefined'
      ? getSelectedPortValue('connToPort', to)
      : null;

  return {
    from,
    fromPort,
    to,
    toPort,
    style: typeof connStyle !== 'undefined' ? connStyle.value : 'solid',
    shape: typeof connShape !== 'undefined' ? connShape.value : 'smart',
    status: typeof connStatus !== 'undefined' ? connStatus.value : 'online'
  };
}

function updateConnectionAddButtonState() {
  const btn = document.getElementById('addConnectionBtn');
  const message = document.getElementById('connectionValidationMessage');

  if (!btn && !message) return;

  const values = getConnectionModalValues();

  if (!values) return;

  updateConnectionModalLabels(values.from, values.to);
  applyWirelessConnectionDefaults(values.from, values.to);

  let error = '';

  if (values.from === values.to) {
    error = '⚠ Cannot connect a device to itself';
  } else if (typeof connFromPort !== 'undefined' && typeof connToPort !== 'undefined') {
    error = validateConnectionPorts(
      values.from,
      values.fromPort,
      values.to,
      values.toPort
    );
  }

  if (btn) {
    btn.disabled = Boolean(error);
    btn.classList.toggle('disabled', Boolean(error));
  }

  if (message) {
    message.textContent = error || (
      connectionInvolvesWirelessSsid(values.from, values.to)
        ? 'Ready to add wireless association'
        : 'Ready to add connection'
    );
    message.classList.toggle('warning', Boolean(error));
  }
}

function refreshConnectionModalPorts() {
  if (
    typeof connFrom === 'undefined' ||
    typeof connTo === 'undefined'
  ) {
    return;
  }

  const from = Number(connFrom.value);
  const to = Number(connTo.value);

  const currentFromPort =
    typeof connFromPort !== 'undefined' && connFromPort
      ? Number(connFromPort.value)
      : null;

  const currentToPort =
    typeof connToPort !== 'undefined' && connToPort
      ? Number(connToPort.value)
      : null;

  populatePortSelect('connFromPort', from, currentFromPort, null);
  populatePortSelect('connToPort', to, currentToPort, null);

  updateConnectionModalLabels(from, to);
  updateConnectionAddButtonState();
}

function refreshSelectedConnectionPorts() {
  if (state.selectedType !== 'connection') return;

  const connection = state.connections.find(c => c.id === state.selectedId);
  if (!connection) return;

  updateSelectedConnectionLabels(connection);

  populatePortSelect(
    'propConnFromPort',
    connection.from,
    connection.fromPort,
    connection.id
  );

  populatePortSelect(
    'propConnToPort',
    connection.to,
    connection.toPort,
    connection.id
  );
}

function getSelectedPortValue(selectId, deviceId) {
  const select = document.getElementById(selectId);

  if (select && select.value) {
    return Number(select.value);
  }

  const ports = getDevicePorts(deviceId);
  const firstAvailable = ports.find(port => isPortAvailable(deviceId, port.id));

  return firstAvailable ? Number(firstAvailable.id) : null;
}

function validateConnectionPorts(from, fromPort, to, toPort, ignoreConnectionId = null) {
  if (Number(from) === Number(to)) {
    return '⚠ Cannot connect a device to itself';
  }

  const wirelessAssociation = getWirelessAssociationDetails(from, to);
  const ssidBroadcast = getSsidBroadcastDetails(from, to);

  const fromDevice = getDeviceById(from);
  const toDevice = getDeviceById(to);
  const fromIsSsid = isConnectionWirelessSsidDevice(fromDevice);
  const toIsSsid = isConnectionWirelessSsidDevice(toDevice);

  if (fromIsSsid || toIsSsid) {
    if (!wirelessAssociation && !ssidBroadcast) {
      return '⚠ SSID links require either an access point broadcast or one endpoint client. Routers, switches, and gateways stay wired.';
    }

    if (wirelessAssociation && wirelessClientAssociationExists(wirelessAssociation.clientDevice.id, ignoreConnectionId)) {
      return '⚠ ' + wirelessAssociation.clientDevice.name + ' is already connected to another SSID. Disconnect it before joining a new SSID.';
    }
  }

  if (!fromPort || !toPort) {
    return '⚠ Select ports for both devices';
  }

  const fromPortObj = getPortById(from, fromPort);
  const toPortObj = getPortById(to, toPort);

  if (!fromDevice || !toDevice) {
    return '⚠ Selected device was not found';
  }

  if (!fromPortObj || !toPortObj) {
    return '⚠ Selected port was not found';
  }

  /*
    Important Phase 3 rule:
    Even if a port is trunk/multi/reusable, the exact same connection
    cannot be added twice, including the reverse direction.
  */
  if (connectionPairExists(from, fromPort, to, toPort, ignoreConnectionId)) {
    if (wirelessAssociation) {
      return (
        '⚠ Wireless association already exists: ' +
        wirelessAssociation.ssidDevice.name +
        ' ↔ ' +
        wirelessAssociation.clientDevice.name
      );
    }

    if (ssidBroadcast) {
      return (
        '⚠ SSID broadcast already exists: ' +
        ssidBroadcast.apDevice.name +
        ' ↔ ' +
        ssidBroadcast.ssidDevice.name
      );
    }

    return (
      '⚠ Connection already exists: ' +
      fromDevice.name +
      ' ' +
      fromPortObj.name +
      ' ↔ ' +
      toDevice.name +
      ' ' +
      toPortObj.name
    );
  }

  if (!isPortAvailable(from, fromPort, ignoreConnectionId)) {
    return '⚠ ' + fromDevice.name + ' ' + fromPortObj.name + ' is already in use';
  }

  if (!isPortAvailable(to, toPort, ignoreConnectionId)) {
    return '⚠ ' + toDevice.name + ' ' + toPortObj.name + ' is already in use';
  }

  return '';
}

function openConnectionModal() {
  if (state.devices.length < 2) {
    return setStatus('⚠ Add at least two devices first');
  }

  populateConnectionSelects('connFrom', 'connTo');

  if (state.selectedType === 'device') {
    connFrom.value = state.selectedId;

    const other = state.devices.find(d => d.id !== state.selectedId);
    if (other) connTo.value = other.id;
  } else if (state.devices.length > 1) {
    connFrom.value = state.devices[0].id;
    connTo.value = state.devices[1].id;
  }

  if (typeof connShape !== 'undefined' && connShape) {
    connShape.value = 'smart';
  }

  refreshConnectionModalPorts();
  applyWirelessConnectionDefaults(Number(connFrom.value), Number(connTo.value));
  updateConnectionAddButtonState();

  connectionModal.style.display = 'flex';
}

function addConnection() {
  const from = Number(connFrom.value);
  const to = Number(connTo.value);
  const requestedStyle = typeof connStyle !== 'undefined' && connStyle ? connStyle.value : 'solid';
  const style = getConnectionStyleValue(from, to, requestedStyle);
  const shape = typeof connShape !== 'undefined' ? connShape.value : 'smart';
  const status = String(connStatus.value || 'online').toLowerCase();
  const wirelessAssociation = getWirelessAssociationDetails(from, to);
  const ssidBroadcast = getSsidBroadcastDetails(from, to);

  if (from === to) {
    updateConnectionAddButtonState();
    return setStatus('⚠ Cannot connect a device to itself');
  }

  /*
    Phase 3:
    If the new port dropdowns exist, use them.
    If index.html has not been updated yet, keep connection creation safe.
  */
  const fromPort =
    typeof connFromPort !== 'undefined'
      ? getSelectedPortValue('connFromPort', from)
      : null;

  const toPort =
    typeof connToPort !== 'undefined'
      ? getSelectedPortValue('connToPort', to)
      : null;

  if (typeof connFromPort !== 'undefined' && typeof connToPort !== 'undefined') {
    const portError = validateConnectionPorts(from, fromPort, to, toPort);

    if (portError) {
      updateConnectionAddButtonState();
      return setStatus(portError);
    }
  }

  pushHistory();

  state.connections.push({
    id: uid('connection'),
    from,
    to,

    /*
      Phase 3:
      The connection now knows which ports it uses.
      The device ports themselves stay clean; usage is calculated from connections.
    */
    fromPort,
    toPort,

    /*
      Phase 1:
      Label and note stay as empty compatibility fields only.
      They are no longer edited in the modal/sidebar or drawn on the canvas.
    */
    label: '',
    note: '',

    style,
    shape,
    status,
    linkType: ssidBroadcast ? 'ssid-broadcast' : wirelessAssociation ? 'wireless-client' : 'wired',
    color: getConnectionColor({ from, to, style, status }),
    points: [],
    fromSide: 'auto',
    toSide: 'auto'
  });

  closeModal('connectionModal');
  refreshSidebar();

  const fromDevice = getDeviceById(from);
  const toDevice = getDeviceById(to);
  const fromPortObj = getPortById(from, fromPort);
  const toPortObj = getPortById(to, toPort);

  if (ssidBroadcast) {
    setStatus(
      'SSID broadcast added: ' +
      ssidBroadcast.apDevice.name +
      ' broadcasts ' +
      ssidBroadcast.ssidDevice.name
    );
  } else if (wirelessAssociation) {
    setStatus(
      'Wireless association added: ' +
      wirelessAssociation.ssidDevice.name +
      ' ↔ ' +
      wirelessAssociation.clientDevice.name
    );
  } else if (fromPortObj && toPortObj && fromDevice && toDevice) {
    setStatus(
      'Connection added: ' +
      fromDevice.name +
      ' ' +
      fromPortObj.name +
      ' → ' +
      toDevice.name +
      ' ' +
      toPortObj.name
    );
  } else {
    setStatus('Connection added');
  }
}

function removeConnection(id) {
  pushHistory();

  state.connections = state.connections.filter(c => c.id !== id);

  if (state.selectedType === 'connection' && state.selectedId === id) {
    clearSelection();
  }

  refreshSidebar();
}

function deleteSelectedConnection() {
  if (state.selectedType !== 'connection') return;

  removeConnection(state.selectedId);
  setStatus('Connection deleted');
}

function clearSelectedConnectionBends() {
  if (state.selectedType !== 'connection') {
    setStatus('⚠ Select a connection first');
    return;
  }

  const connection = state.connections.find(c => c.id === state.selectedId);
  if (!connection) return;

  pushHistory();

  connection.points = [];

  refreshSidebar();
  setStatus('Connection reshape points cleared');
}