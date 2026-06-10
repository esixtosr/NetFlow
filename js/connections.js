function getConnectionColor(c) {
  if (c.status && c.status !== 'online') {
    return STATUS_COLOR[c.status] || '#ffffff';
  }

  const a = state.devices.find(d => d.id === c.from);
  const b = state.devices.find(d => d.id === c.to);

  if (!a && !b) return '#ffffff';
  if (a && !b) return getDeviceColor(a);
  if (!a && b) return getDeviceColor(b);

  const za = getDeviceZone(a);
  const zb = getDeviceZone(b);

  if (za && zb) {
    if (za.id === zb.id) return za.color;
    return a.id > b.id ? za.color : zb.color;
  }

  if (za && !zb) return za.color;
  if (!za && zb) return zb.color;

  return a.id > b.id ? getDeviceColor(a) : getDeviceColor(b);
}

function getDeviceById(deviceId) {
  return state.devices.find(d => d.id === Number(deviceId));
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

  if (!port) return false;
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

function getPortUsageLabel(deviceId, port, ignoreConnectionId = null) {
  const usedCount = getUsedPortConnectionCount(deviceId, port.id, ignoreConnectionId);

  if (!usedCount) return 'Available';

  if (isReusablePort(port)) {
    return usedCount + ' connection' + (usedCount === 1 ? '' : 's');
  }

  return 'In use';
}

function populatePortSelect(selectId, deviceId, selectedPortId = null, ignoreConnectionId = null) {
  const select = document.getElementById(selectId);

  if (!select) return;

  const ports = getDevicePorts(deviceId);

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

    const label = `${port.name || 'Port ' + port.id} · ${usage}${modeText}`;

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
    status: typeof connStatus !== 'undefined' ? connStatus.value : 'online'
  };
}

function updateConnectionAddButtonState() {
  const btn = document.getElementById('addConnectionBtn');
  const message = document.getElementById('connectionValidationMessage');

  if (!btn && !message) return;

  const values = getConnectionModalValues();

  if (!values) return;

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
    message.textContent = error || 'Ready to add connection';
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

  updateConnectionAddButtonState();
}

function refreshSelectedConnectionPorts() {
  if (state.selectedType !== 'connection') return;

  const connection = state.connections.find(c => c.id === state.selectedId);
  if (!connection) return;

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

  if (!fromPort || !toPort) {
    return '⚠ Select ports for both devices';
  }

  const fromDevice = getDeviceById(from);
  const toDevice = getDeviceById(to);

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

  refreshConnectionModalPorts();
  updateConnectionAddButtonState();

  connectionModal.style.display = 'flex';
}

function addConnection() {
  const from = Number(connFrom.value);
  const to = Number(connTo.value);
  const style = connStyle.value;
  const status = connStatus.value;

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
    status,
    color: '',
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

  if (fromPortObj && toPortObj && fromDevice && toDevice) {
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