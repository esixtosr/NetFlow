function openZoneModal() {
  zoneModal.style.display = 'flex';
}

function readZoneDhcpValue(value) {
  return String(value) !== 'false';
}

function addZone() {
  pushHistory();

  const name = zoneName.value.trim() || 'VLAN Zone';
  const color = zoneColor.value;
  const borderStyle = zoneBorderStyle.value;

  const vlanId = typeof zoneVlanId !== 'undefined' && zoneVlanId
    ? zoneVlanId.value.trim()
    : '';

  const subnet = typeof zoneSubnet !== 'undefined' && zoneSubnet
    ? zoneSubnet.value.trim()
    : '';

  const gateway = typeof zoneGateway !== 'undefined' && zoneGateway
    ? zoneGateway.value.trim()
    : '';

  const dns = typeof zoneDns !== 'undefined' && zoneDns
    ? zoneDns.value.trim()
    : '';

  const dhcp = typeof zoneDhcp !== 'undefined' && zoneDhcp
    ? readZoneDhcpValue(zoneDhcp.value)
    : true;

  const cx = (canvas.width / 2 - state.viewX) / state.zoom;
  const cy = (canvas.height / 2 - state.viewY) / state.zoom;

  state.zones.push({
    id: uid('zone'),
    name,
    sub: '',
    color,
    borderStyle,
    borderWidth: 1.5,
    opacity: .06,

    /*
      Phase 6.1:
      VLAN network profile fields.
    */
    vlanId,
    subnet,
    gateway,
    dns,
    dhcp,

    x: cx - 190,
    y: cy - 125,
    w: 380,
    h: 250
  });

  zoneName.value = '';

  if (typeof zoneVlanId !== 'undefined' && zoneVlanId) zoneVlanId.value = '';
  if (typeof zoneSubnet !== 'undefined' && zoneSubnet) zoneSubnet.value = '';
  if (typeof zoneGateway !== 'undefined' && zoneGateway) zoneGateway.value = '';
  if (typeof zoneDns !== 'undefined' && zoneDns) zoneDns.value = '';
  if (typeof zoneDhcp !== 'undefined' && zoneDhcp) zoneDhcp.value = 'true';

  closeModal('zoneModal');
  refreshSidebar();
  setStatus('Added VLAN zone: ' + name);
}

function removeZone(id) {
  pushHistory();

  state.zones = state.zones.filter(z => z.id !== id);

  if (state.selectedType === 'zone' && state.selectedId === id) {
    clearSelection();
  }

  refreshSidebar();
}

function getDeviceZone(d) {
  const cx = d.x + d.w / 2;
  const cy = d.y + d.h / 2;

  for (let i = state.zones.length - 1; i >= 0; i--) {
    const z = state.zones[i];

    if (
      cx >= z.x &&
      cx <= z.x + z.w &&
      cy >= z.y &&
      cy <= z.y + z.h
    ) {
      return z;
    }
  }

  return null;
}