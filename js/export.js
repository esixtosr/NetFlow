function toggleExportMenu() {
  closeSizeMenu();

  if (exportMenu.style.display === 'block') {
    exportMenu.style.display = 'none';
    return;
  }

  const btn = document.getElementById('fileBtn');
  const rect = btn.getBoundingClientRect();

  exportMenu.style.display = 'block';
  exportMenu.style.position = 'fixed';
  exportMenu.style.top = rect.bottom + 8 + 'px';
  exportMenu.style.left = rect.left + 'px';
  exportMenu.style.right = 'auto';
}

function closeExportMenu() {
  exportMenu.style.display = 'none';
}


function exportPNG() {
  closeExportMenu();
  drawScene(performance.now());

  const a = document.createElement('a');
  a.download = 'netflow-topology.png';
  a.href = canvas.toDataURL('image/png');
  a.click();

  setStatus('PNG exported');
}

function getReadonlyExportProject() {
  const clean = JSON.parse(JSON.stringify(state));

  clean.connections.forEach(connection => {
    connection.color = '';

    if (!Array.isArray(connection.points)) {
      connection.points = [];
    }
  });

  clean.viewer = {
    exportedAt: new Date().toISOString(),
    boxScale: state.boxScale || 1,
    packetSpeed: state.packetSpeed || 1,
    camera: state.camera || null,
    zoom: state.zoom || null
  };

  return clean;
}

function escapeReadonlyHtmlJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildReadonlyHtml(project) {
  const projectJson = escapeReadonlyHtmlJson(project);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>NetFlow Read-Only Viewer</title>
  <style>
    :root {
      --bg:#020b16;
      --panel:#071426;
      --panel2:#0b1b31;
      --line:#24415f;
      --text:#dbe7ff;
      --muted:#9ba8c5;
      --accent:#3b9eff;
      --cyan:#64ffda;
    }

    * { box-sizing:border-box; }

    body {
      margin:0;
      min-height:100vh;
      background:
        linear-gradient(rgba(59,158,255,.055) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59,158,255,.055) 1px, transparent 1px),
        var(--bg);
      background-size:24px 24px;
      color:var(--text);
      font-family:Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      overflow:hidden;
    }

    .viewer-shell {
      display:grid;
      grid-template-columns:1fr 380px;
      height:100vh;
    }

    .stage-wrap {
      position:relative;
      overflow:hidden;
      border-right:1px solid rgba(59,158,255,.28);
    }

    .stage-title {
      position:absolute;
      top:18px;
      left:22px;
      z-index:20;
      display:flex;
      flex-direction:column;
      gap:6px;
      pointer-events:none;
      width:min(420px, calc(100% - 44px));
      padding:14px 16px;
      border:1px solid rgba(100,255,218,.22);
      border-radius:16px;
      background:rgba(3,12,25,.72);
      box-shadow:0 18px 48px rgba(0,0,0,.22), 0 0 26px rgba(100,255,218,.06);
      backdrop-filter:blur(10px);
    }

    .stage-title .viewer-kicker {
      color:var(--cyan);
      font:900 11px "JetBrains Mono", ui-monospace, monospace;
      letter-spacing:.24em;
      text-transform:uppercase;
    }

    .stage-title strong {
      color:#e6eeff;
      font:900 20px Inter, system-ui, sans-serif;
      letter-spacing:.01em;
      line-height:1.12;
    }

    .stage-title span {
      color:var(--muted);
      font-size:12px;
      font-weight:800;
    }

    .stage-title .viewer-note {
      display:inline-flex;
      align-items:center;
      width:max-content;
      max-width:100%;
      margin-top:4px;
      padding:5px 8px;
      border:1px solid rgba(59,158,255,.25);
      border-radius:999px;
      background:rgba(59,158,255,.08);
      color:#b8c7e6;
      font:800 10px "JetBrains Mono", ui-monospace, monospace;
      letter-spacing:.08em;
      text-transform:uppercase;
    }

    .viewer-badge {
      position:absolute;
      left:22px;
      bottom:18px;
      z-index:20;
      display:flex;
      align-items:center;
      gap:10px;
      padding:10px 12px;
      border:1px solid rgba(59,158,255,.22);
      border-radius:999px;
      background:rgba(3,12,25,.72);
      box-shadow:0 16px 42px rgba(0,0,0,.22), 0 0 24px rgba(59,158,255,.06);
      backdrop-filter:blur(10px);
      color:#c7d2fe;
      pointer-events:none;
    }

    .viewer-badge-mark {
      display:grid;
      place-items:center;
      width:26px;
      height:26px;
      border-radius:50%;
      border:1px solid rgba(100,255,218,.24);
      background:rgba(100,255,218,.08);
      color:var(--cyan);
      font:900 13px "JetBrains Mono", ui-monospace, monospace;
    }

    .viewer-badge-copy {
      display:flex;
      flex-direction:column;
      gap:2px;
    }

    .viewer-badge-copy strong {
      color:#e6eeff;
      font:900 11px "JetBrains Mono", ui-monospace, monospace;
      letter-spacing:.12em;
      text-transform:uppercase;
    }

    .viewer-badge-copy span {
      color:var(--muted);
      font-size:11px;
      font-weight:800;
    }

    .stage {
      position:absolute;
      inset:0;
      transform-origin:0 0;
    }

    svg.connections {
      position:absolute;
      inset:0;
      width:100%;
      height:100%;
      overflow:visible;
      pointer-events:none;
      z-index:3;
    }

    .connection-hit {
      pointer-events:stroke;
      cursor:pointer;
      stroke:transparent;
      stroke-width:22;
      fill:none;
    }

    .connection-line-glow {
      pointer-events:none;
      stroke-width:9;
      fill:none;
      opacity:.16;
      stroke-linecap:round;
      stroke-linejoin:round;
      filter:blur(1px);
    }

    .connection-line {
      pointer-events:none;
      stroke-width:3.4;
      fill:none;
      opacity:.94;
      stroke-linecap:round;
      stroke-linejoin:round;
      filter:drop-shadow(0 0 5px rgba(59,158,255,.18));
    }

    .connection-line.dashed,
    .connection-line-glow.dashed {
      stroke-dasharray:12 9;
    }

    .zone {
      position:absolute;
      border:1.5px dashed var(--zone-color, var(--accent));
      background:color-mix(in srgb, var(--zone-color, var(--accent)) 12%, transparent);
      border-radius:14px;
      z-index:1;
      cursor:pointer;
      overflow:hidden;
    }

    .zone::before {
      content:attr(data-name);
      position:absolute;
      top:8px;
      left:10px;
      color:var(--zone-color, var(--accent));
      font:900 10px "JetBrains Mono", ui-monospace, monospace;
      letter-spacing:.12em;
      text-transform:uppercase;
    }

    .device {
      position:absolute;
      z-index:5;
      width:190px;
      min-height:76px;
      border:1.5px solid var(--device-color, var(--accent));
      border-radius:14px;
      background:
        radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--device-color, var(--accent)) 18%, transparent), transparent 34%),
        linear-gradient(180deg, rgba(14,31,55,.96), rgba(8,18,34,.96));
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.05),
        0 16px 42px rgba(0,0,0,.24),
        0 0 22px color-mix(in srgb, var(--device-color, var(--accent)) 28%, transparent);
      cursor:pointer;
      padding:14px 14px 13px 62px;
      user-select:none;
      transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease;
    }

    .device:hover,
    .device.active {
      transform:translateY(-1px);
      border-color:color-mix(in srgb, var(--device-color, var(--accent)) 82%, white);
      box-shadow:
        0 0 0 2px color-mix(in srgb, var(--device-color, var(--accent)) 42%, transparent),
        0 18px 52px rgba(0,0,0,.34),
        0 0 34px color-mix(in srgb, var(--device-color, var(--accent)) 44%, transparent);
    }

    .zone:hover,
    .zone.active {
      box-shadow:0 0 0 2px color-mix(in srgb, var(--zone-color, var(--accent)) 48%, transparent), 0 0 34px color-mix(in srgb, var(--zone-color, var(--accent)) 28%, transparent);
    }

    .device-icon {
      position:absolute;
      left:14px;
      top:14px;
      width:36px;
      height:36px;
      border:1px solid color-mix(in srgb, var(--device-color, var(--accent)) 64%, transparent);
      border-radius:11px;
      display:grid;
      place-items:center;
      color:var(--device-color, var(--accent));
      background:rgba(2,12,27,.42);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.05), 0 0 18px color-mix(in srgb, var(--device-color, var(--accent)) 18%, transparent);
      font-size:18px;
      font-weight:900;
    }

    .device-name {
      color:#e6eeff;
      font-size:14px;
      font-weight:950;
      line-height:1.12;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
      letter-spacing:.01em;
    }

    .device-subtitle {
      color:var(--muted);
      font-size:10.5px;
      font-weight:800;
      margin-top:6px;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .device-status {
      position:absolute;
      top:9px;
      right:9px;
      width:9px;
      height:9px;
      border-radius:50%;
      background:#22c55e;
      box-shadow:0 0 12px #22c55e;
    }

    .device-status.offline { background:#64748b; box-shadow:none; }
    .device-status.warning { background:#f59e0b; box-shadow:0 0 10px #f59e0b; }
    .device-status.blocked { background:#ef4444; box-shadow:0 0 10px #ef4444; }

    .inspector {
      height:100vh;
      overflow:auto;
      background:
        radial-gradient(circle at 50% 0%, rgba(59,158,255,.10), transparent 34%),
        rgba(3,12,25,.96);
      padding:22px;
    }

    .inspector-card {
      border:1px solid rgba(59,158,255,.28);
      background:linear-gradient(180deg, rgba(11,27,49,.86), rgba(5,16,31,.86));
      border-radius:18px;
      padding:20px;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.04), 0 18px 58px rgba(0,0,0,.28);
    }

    .eyebrow {
      display:inline-flex;
      width:max-content;
      max-width:100%;
      color:var(--cyan);
      font:900 11px "JetBrains Mono", ui-monospace, monospace;
      letter-spacing:.2em;
      text-transform:uppercase;
      margin-bottom:12px;
      padding:6px 9px;
      border:1px solid rgba(100,255,218,.18);
      border-radius:999px;
      background:rgba(100,255,218,.06);
    }

    h1 {
      font-size:26px;
      line-height:1.12;
      margin:0 0 8px;
      letter-spacing:-.02em;
      color:#eef4ff;
    }

    .subtitle {
      color:var(--muted);
      font-weight:800;
      font-size:13px;
      line-height:1.45;
      margin-bottom:18px;
    }

    .meta-row {
      display:grid;
      grid-template-columns:132px 1fr;
      gap:14px;
      align-items:center;
      padding:12px 0;
      border-top:1px solid rgba(148,163,184,.14);
      color:var(--muted);
      font-weight:850;
      font-size:12px;
    }

    .meta-row span {
      color:#8ea0c2;
      font:900 10.5px "JetBrains Mono", ui-monospace, monospace;
      letter-spacing:.12em;
      text-transform:uppercase;
    }

    .meta-row strong {
      color:#dbe7ff;
      text-align:right;
      font-size:13px;
      line-height:1.35;
      word-break:break-word;
    }

    .status-pill {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:5px 9px;
      border-radius:999px;
      border:1px solid rgba(34,197,94,.32);
      background:rgba(34,197,94,.10);
      color:#86efac;
      font:900 10px "JetBrains Mono", ui-monospace, monospace;
      letter-spacing:.08em;
      text-transform:uppercase;
    }

    .status-pill.offline {
      border-color:rgba(100,116,139,.35);
      background:rgba(100,116,139,.12);
      color:#cbd5e1;
    }

    .status-pill.warning {
      border-color:rgba(245,158,11,.35);
      background:rgba(245,158,11,.12);
      color:#fcd34d;
    }

    .status-pill.blocked {
      border-color:rgba(239,68,68,.35);
      background:rgba(239,68,68,.12);
      color:#fca5a5;
    }

    .empty {
      color:var(--muted);
      line-height:1.6;
      font-weight:750;
      padding:14px;
      border:1px solid rgba(148,163,184,.14);
      border-radius:14px;
      background:rgba(15,23,42,.38);
    }

    @media (max-width: 980px) {
      body { overflow:auto; }
      .viewer-shell { grid-template-columns:1fr; height:auto; }
      .stage-wrap { height:70vh; border-right:0; border-bottom:1px solid rgba(59,158,255,.28); }
      .inspector { height:auto; min-height:30vh; }
    }
  </style>
</head>
<body>
  <div class="viewer-shell">
    <main class="stage-wrap">
      <div class="stage-title">
        <div class="viewer-kicker">NetFlow Viewer</div>
        <strong>Mini Server Rack Network Diagram</strong>
        <span>Read-only interactive NetFlow topology</span>
        <div class="viewer-note">Exported portfolio view</div>
      </div>
      <div id="stage" class="stage">
        <svg id="connectionsSvg" class="connections"></svg>
      </div>
      <div class="viewer-badge">
        <div class="viewer-badge-mark">N</div>
        <div class="viewer-badge-copy">
          <strong>Built with NetFlow</strong>
          <span>Read-only portfolio viewer</span>
        </div>
      </div>
    </main>

    <aside class="inspector">
      <div id="inspector" class="inspector-card">
        <div class="eyebrow">NetFlow Export</div>
        <h1>Network Diagram</h1>
        <div class="subtitle">Click a device, VLAN, or connection to view details.</div>
        <div class="empty">This is a read-only portfolio viewer. Editing is disabled.</div>
      </div>
    </aside>
  </div>

  <script id="netflow-project" type="application/json">${projectJson}</script>
  <script>
    const project = JSON.parse(document.getElementById('netflow-project').textContent);
    const stage = document.getElementById('stage');
    const svg = document.getElementById('connectionsSvg');
    const inspector = document.getElementById('inspector');

    function esc(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]));
    }

    function byId(list, id) {
      return (list || []).find(item => Number(item.id) === Number(id));
    }

    function getX(item) { return Number(item.x ?? item.left ?? 0); }
    function getY(item) { return Number(item.y ?? item.top ?? 0); }
    function getW(item) { return Number(item.w ?? item.width ?? 170); }
    function getH(item) { return Number(item.h ?? item.height ?? 66); }

    function statusClass(value) {
      const status = String(value || 'online').toLowerCase();
      if (status === 'offline') return 'offline';
      if (status === 'warning') return 'warning';
      if (status === 'blocked') return 'blocked';
      return '';
    }

    function colorForDevice(device) {
      const zone = findZoneForDevice(device);

      return device.color || (zone && zone.color) || '#3b9eff';
    }

    function colorForConnection(connection) {
      const from = byId(project.devices, connection.from);
      const to = byId(project.devices, connection.to);
      if (!from && !to) return '#3b9eff';
      if (from && !to) return colorForDevice(from);
      if (!from && to) return colorForDevice(to);
      return colorForDevice(to);
    }

    function iconFor(device) {
      const type = String(device.type || '').toLowerCase();
      if (type.includes('wifi') || type.includes('ssid') || type.includes('ap')) return '◉';
      if (type.includes('switch')) return '⇄';
      if (type.includes('router') || type.includes('firewall')) return '◈';
      if (type.includes('server') || type.includes('nas')) return '▣';
      if (type.includes('internet') || type.includes('cloud') || type.includes('wan')) return '☁';
      return '▢';
    }

    function deviceTypeText(device) {
      return String((device && (device.type || device.category || device.kind)) || '').toLowerCase();
    }

    function isWirelessDevice(device) {
      const type = deviceTypeText(device);
      const name = String((device && device.name) || '').toLowerCase();
      return type.includes('wifi') || type.includes('wireless') || type.includes('ssid') || type.includes('ap') || name.includes('ssid');
    }

    function getDeviceConnections(device) {
      return (project.connections || []).filter(c => Number(c.from) === Number(device.id) || Number(c.to) === Number(device.id));
    }

    function getConnectedDeviceNames(device) {
      return getDeviceConnections(device)
        .map(connection => {
          const otherId = Number(connection.from) === Number(device.id) ? connection.to : connection.from;
          const other = byId(project.devices, otherId);
          return other && other.name ? other.name : 'Unknown';
        })
        .filter(Boolean)
        .join(', ');
    }

    function getWirelessClients(device) {
      if (!isWirelessDevice(device)) return [];

      return getDeviceConnections(device)
        .map(connection => {
          const otherId = Number(connection.from) === Number(device.id) ? connection.to : connection.from;
          return byId(project.devices, otherId);
        })
        .filter(other => other && !isWirelessDevice(other));
    }

    function findZoneForDevice(device) {
      return (project.zones || []).find(z => {
        const x = getX(device) + getW(device) / 2;
        const y = getY(device) + getH(device) / 2;
        return x >= getX(z) && x <= getX(z) + getW(z) && y >= getY(z) && y <= getY(z) + getH(z);
      });
    }

    function row(label, value) {
      return '<div class="meta-row"><span>' + esc(label) + '</span><strong>' + (value == null ? '—' : value) + '</strong></div>';
    }

    function statusPill(value) {
      const status = String(value || 'online').toLowerCase();
      return '<span class="status-pill ' + esc(status) + '">' + esc(status.toUpperCase()) + '</span>';
    }

    function formatIpMode(value) {
      const mode = String(value || '').toLowerCase();
      if (mode === 'dhcp') return 'DHCP';
      if (mode === 'static') return 'Static';
      if (mode === 'reserved') return 'Reserved';
      return '—';
    }

    function formatPortLabel(device, portId) {
      if (!portId || portId === '—') return '—';

      const ports = Array.isArray(device && device.ports) ? device.ports : [];
      const port = ports.find(item => String(item.id) === String(portId));

      if (port && port.name) {
        return port.name;
      }

      return String(portId);
    }

    function formatStyleLabel(value) {
      const style = String(value || 'solid').toLowerCase();
      if (style === 'dashed') return 'Dashed';
      if (style === 'dotted') return 'Dotted';
      return 'Solid';
    }

    function showDevice(device) {
      const connections = getDeviceConnections(device);
      const zone = findZoneForDevice(device);
      const wirelessClients = getWirelessClients(device);
      const connectedNames = getConnectedDeviceNames(device);
      const portCount = Array.isArray(device.ports) ? device.ports.length : (device.portCount || '—');
      const wirelessClientNames = wirelessClients.map(client => client.name || 'Unnamed Client').join(', ');

      inspector.innerHTML =
        '<div class="eyebrow">Selected Device</div>' +
        '<h1>' + esc(device.name || 'Unnamed Device') + '</h1>' +
        '<div class="subtitle">' + esc(device.subtitle || device.type || 'Device') + '</div>' +
        row('Type', esc(device.type || 'Device')) +
        row('Status', statusPill(device.status)) +
        row('Zone / VLAN', esc(zone ? zone.name || 'Unnamed VLAN' : '—')) +
        row('VLAN ID', esc(zone ? zone.vlanId || '—' : '—')) +
        row('IP Mode', esc(formatIpMode(device.ipMode))) +
        row('IP Address', esc(device.ipAddress || '—')) +
        row('Gateway', esc(device.gatewayOverride || device.gateway || '—')) +
        row('DNS', esc(device.dnsOverride || device.dns || '—')) +
        row('Ports', esc(portCount)) +
        row('Links', esc(connections.length)) +
        (connectedNames ? row('Connected To', esc(connectedNames)) : '') +
        (isWirelessDevice(device) ? row('Wireless Clients', esc(wirelessClients.length)) : '') +
        (wirelessClientNames ? row('Client Names', esc(wirelessClientNames)) : '');
    }

    function showZone(zone) {
      inspector.innerHTML =
        '<div class="eyebrow">Selected VLAN Zone</div>' +
        '<h1>' + esc(zone.name || 'Unnamed VLAN') + '</h1>' +
        '<div class="subtitle">Read-only VLAN details</div>' +
        row('VLAN ID', zone.vlanId || '—') +
        row('Subnet', zone.subnet || '—') +
        row('Gateway', zone.gateway || '—') +
        row('DNS', zone.dns || '—') +
        row('VLAN DHCP', zone.dhcp === false ? 'Disabled' : zone.dhcp === true ? 'Enabled' : zone.dhcp || '—');
    }

    function showConnection(connection) {
      const from = byId(project.devices, connection.from);
      const to = byId(project.devices, connection.to);
      const fromPort = formatPortLabel(from, connection.fromPort);
      const toPort = formatPortLabel(to, connection.toPort);
      const wirelessLink = Boolean(from && to && (isWirelessDevice(from) || isWirelessDevice(to)) && connection.style === 'dashed');

      inspector.innerHTML =
        '<div class="eyebrow">Selected Connection</div>' +
        '<h1>' + esc((from && from.name || 'Unknown') + ' → ' + (to && to.name || 'Unknown')) + '</h1>' +
        '<div class="subtitle">Read-only connection details</div>' +
        row('From', esc(from && from.name || 'Unknown')) +
        row('From Type', esc(from && from.type || '—')) +
        row('From Port', esc(fromPort)) +
        row('To', esc(to && to.name || 'Unknown')) +
        row('To Type', esc(to && to.type || '—')) +
        row('To Port', esc(toPort)) +
        row('Link Type', esc(wirelessLink ? 'Wireless association' : 'Wired connection')) +
        row('Style', esc(formatStyleLabel(connection.style))) +
        row('Status', statusPill(connection.status));
    }

    function clearActive() {
      document.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    }

    function renderZones() {
      (project.zones || []).forEach(zone => {
        const el = document.createElement('div');
        el.className = 'zone';
        el.dataset.name = zone.name || 'VLAN';
        el.style.left = getX(zone) + 'px';
        el.style.top = getY(zone) + 'px';
        el.style.width = getW(zone) + 'px';
        el.style.height = getH(zone) + 'px';
        el.style.setProperty('--zone-color', zone.color || '#3b9eff');
        el.addEventListener('click', event => {
          event.stopPropagation();
          clearActive();
          el.classList.add('active');
          showZone(zone);
        });
        stage.appendChild(el);
      });
    }

    function renderDevices() {
      (project.devices || []).forEach(device => {
        const el = document.createElement('div');
        el.className = 'device';
        el.style.left = getX(device) + 'px';
        el.style.top = getY(device) + 'px';
        el.style.width = getW(device) + 'px';
        el.style.minHeight = getH(device) + 'px';
        el.style.setProperty('--device-color', colorForDevice(device));
        el.innerHTML =
          '<div class="device-icon">' + esc(iconFor(device)) + '</div>' +
          '<div class="device-status ' + statusClass(device.status) + '"></div>' +
          '<div class="device-name">' + esc(device.name || 'Device') + '</div>' +
          '<div class="device-subtitle">' + esc(device.subtitle || device.type || '') + '</div>';
        el.addEventListener('click', event => {
          event.stopPropagation();
          clearActive();
          el.classList.add('active');
          showDevice(device);
        });
        stage.appendChild(el);
      });
    }

    function renderConnections() {
      svg.innerHTML = '';

      (project.connections || []).forEach(connection => {
        const from = byId(project.devices, connection.from);
        const to = byId(project.devices, connection.to);
        if (!from || !to) return;

        const x1 = getX(from) + getW(from) / 2;
        const y1 = getY(from) + getH(from) / 2;
        const x2 = getX(to) + getW(to) / 2;
        const y2 = getY(to) + getH(to) / 2;
        const color = colorForConnection(connection);

        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        glow.setAttribute('x1', x1);
        glow.setAttribute('y1', y1);
        glow.setAttribute('x2', x2);
        glow.setAttribute('y2', y2);
        glow.setAttribute('stroke', color);
        glow.setAttribute('class', 'connection-line-glow ' + (connection.style === 'dashed' ? 'dashed' : ''));
        svg.appendChild(glow);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', color);
        line.setAttribute('class', 'connection-line ' + (connection.style === 'dashed' ? 'dashed' : ''));
        svg.appendChild(line);

        const hit = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        hit.setAttribute('x1', x1);
        hit.setAttribute('y1', y1);
        hit.setAttribute('x2', x2);
        hit.setAttribute('y2', y2);
        hit.setAttribute('class', 'connection-hit');
        hit.addEventListener('click', event => {
          event.stopPropagation();
          clearActive();
          showConnection(connection);
        });
        svg.appendChild(hit);
      });
    }

    function fitStage() {
      const all = [...(project.devices || []), ...(project.zones || [])];
      if (!all.length) return;

      const minX = Math.min(...all.map(getX)) - 90;
      const minY = Math.min(...all.map(getY)) - 90;
      const maxX = Math.max(...all.map(item => getX(item) + getW(item))) + 90;
      const maxY = Math.max(...all.map(item => getY(item) + getH(item))) + 90;
      const wrap = document.querySelector('.stage-wrap');
      const scale = Math.min(
        1,
        wrap.clientWidth / Math.max(1, maxX - minX),
        wrap.clientHeight / Math.max(1, maxY - minY)
      );

      stage.style.transform = 'translate(' + (-minX * scale) + 'px,' + (-minY * scale) + 'px) scale(' + scale + ')';
      svg.style.width = Math.max(2000, maxX + 300) + 'px';
      svg.style.height = Math.max(1400, maxY + 300) + 'px';
    }

    stage.addEventListener('click', () => clearActive());
    window.addEventListener('resize', fitStage);

    renderZones();
    renderConnections();
    renderDevices();
    fitStage();
  </script>
</body>
</html>`;
}

function exportReadonlyHtml() {
  closeExportMenu();

  const project = getReadonlyExportProject();
  const html = buildReadonlyHtml(project);
  const blob = new Blob([html], {
    type: 'text/html;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.download = 'netflow-viewer.html';
  a.href = url;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 5000);

  setStatus('Viewer HTML exported');
}

/* =========================
   VIDEO EXPORT SETTINGS
========================= */

let pendingVideoFormat = 'webm';

function ensureVideoExportModal() {
  if (document.getElementById('videoExportModal')) return;

  const modal = document.createElement('div');
  modal.id = 'videoExportModal';
  modal.className = 'video-export-modal';

  modal.innerHTML = `
    <div class="video-export-card">
      <div class="video-export-head">
        <div>
          <div class="video-export-eyebrow">Export Video</div>
          <div class="video-export-title">Recording Settings</div>
        </div>
        <button class="video-export-close" onclick="closeVideoExportModal()" type="button">×</button>
      </div>

      <div class="video-export-format">
        <span>Format</span>
        <strong id="videoExportFormatLabel">WebM</strong>
      </div>

      <div class="video-export-section">
        <div class="video-export-section-title">Recording Mode</div>

        <label class="video-export-option">
          <input type="radio" name="videoMode" value="quick" checked onchange="toggleVideoCustomSettings()">
          <div>
            <strong>Quick 30 second video</strong>
            <span>30 seconds · 30 FPS · high quality</span>
          </div>
        </label>

        <label class="video-export-option">
          <input type="radio" name="videoMode" value="custom" onchange="toggleVideoCustomSettings()">
          <div>
            <strong>Custom video</strong>
            <span>Choose length, frame rate, and quality</span>
          </div>
        </label>
      </div>

      <div id="videoCustomSettings" class="video-export-section video-export-custom" style="display:none;">
        <div class="video-export-grid">
          <label>
            <span>Length</span>
            <div class="video-number-control">
              <input id="videoDurationInput" type="number" min="5" max="120" value="30">
              <div class="video-number-buttons">
                <button type="button" onclick="stepVideoDuration(1)" aria-label="Increase duration">⌃</button>
                <button type="button" onclick="stepVideoDuration(-1)" aria-label="Decrease duration">⌄</button>
              </div>
            </div>
            <small>seconds</small>
          </label>

          <label>
            <span>Frame Rate</span>
            <select id="videoFpsInput">
              <option value="24">24 FPS</option>
              <option value="30" selected>30 FPS</option>
              <option value="60">60 FPS</option>
            </select>
          </label>

          <label>
            <span>Quality</span>
            <select id="videoQualityInput">
              <option value="standard">Standard</option>
              <option value="high" selected>High</option>
              <option value="ultra">Ultra</option>
            </select>
          </label>
        </div>
      </div>

      <div class="video-export-actions">
        <button class="video-export-secondary" onclick="closeVideoExportModal()" type="button">Cancel</button>
        <button class="video-export-primary" onclick="startConfiguredVideoExport()" type="button">Start Recording</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const style = document.createElement('style');
  style.id = 'videoExportModalStyles';
  style.textContent = `
    .video-export-modal {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(2, 12, 27, 0.72);
      backdrop-filter: blur(10px);
    }

    .video-export-card {
      width: min(520px, calc(100vw - 32px));
      max-height: calc(100vh - 40px);
      overflow: auto;
      background: linear-gradient(180deg, #0b1728, #07111f);
      border: 1px solid rgba(100, 255, 218, 0.22);
      border-radius: 18px;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
      color: #dbe7ff;
      padding: 18px;
    }

    .video-export-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    }

    .video-export-eyebrow {
      color: #64ffda;
      font: 700 11px "JetBrains Mono", monospace;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .video-export-title {
      font: 800 22px "Inter", sans-serif;
      color: #e6eeff;
    }

    .video-export-close {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: rgba(15, 23, 42, 0.65);
      color: #dbe7ff;
      font-size: 22px;
      cursor: pointer;
    }

    .video-export-close:hover {
      color: #64ffda;
      border-color: rgba(100, 255, 218, 0.35);
      background: rgba(100, 255, 218, 0.08);
    }

    .video-export-format {
      margin-top: 14px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(59, 158, 255, 0.25);
      background: rgba(15, 23, 42, 0.55);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .video-export-format span,
    .video-export-section-title,
    .video-export-grid label span {
      color: #9ba8c5;
      font: 700 11px "JetBrains Mono", monospace;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }

    .video-export-format strong {
      color: #64ffda;
      font: 800 13px "JetBrains Mono", monospace;
      text-transform: uppercase;
    }

    .video-export-section {
      margin-top: 16px;
      padding: 14px;
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      background: rgba(8, 18, 34, 0.72);
    }

    .video-export-section-title {
      margin-bottom: 10px;
      color: #c7d2fe;
    }

    .video-export-option {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 11px;
      border-radius: 13px;
      cursor: pointer;
      border: 1px solid rgba(148, 163, 184, 0.12);
      background: rgba(15, 23, 42, 0.42);
      margin-top: 8px;
    }

    .video-export-option:hover {
      border-color: rgba(100, 255, 218, 0.25);
      background: rgba(100, 255, 218, 0.05);
    }

    .video-export-option input {
      margin-top: 3px;
      accent-color: #64ffda;
    }

    .video-export-option strong {
      display: block;
      color: #e6eeff;
      font: 800 13px "Inter", sans-serif;
      margin-bottom: 4px;
    }

    .video-export-option span {
      color: #9ba8c5;
      font: 600 12px "Inter", sans-serif;
      line-height: 1.45;
    }

    .video-export-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }

    .video-export-grid label {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .video-export-grid input,
    .video-export-grid select {
      width: 100%;
      height: 38px;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: #10213c;
      color: #e6eeff;
      padding: 0 10px;
      font: 700 13px "Inter", sans-serif;
      outline: none;
    }

    .video-export-grid select {
      cursor: pointer;
    }

    .video-export-grid input:focus,
    .video-export-grid select:focus {
      border-color: rgba(100, 255, 218, 0.45);
      box-shadow: 0 0 0 3px rgba(100, 255, 218, 0.08);
    }

    .video-number-control {
      display: grid;
      grid-template-columns: 1fr 34px;
      height: 38px;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: #10213c;
      overflow: hidden;
    }

    .video-number-control:focus-within {
      border-color: rgba(100, 255, 218, 0.45);
      box-shadow: 0 0 0 3px rgba(100, 255, 218, 0.08);
    }

    .video-number-control input {
      width: 100%;
      height: 100%;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      color: #e6eeff;
      padding: 0 10px;
      font: 700 13px "Inter", sans-serif;
      outline: none;
      appearance: textfield;
      -moz-appearance: textfield;
    }

    .video-number-control input::-webkit-outer-spin-button,
    .video-number-control input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .video-number-buttons {
      display: grid;
      grid-template-rows: 1fr 1fr;
      border-left: 1px solid rgba(148, 163, 184, 0.18);
    }

    .video-number-buttons button {
      border: 0;
      background: rgba(15, 23, 42, 0.55);
      color: #9ba8c5;
      font: 800 12px "JetBrains Mono", monospace;
      cursor: pointer;
      line-height: 1;
      padding: 0;
    }

    .video-number-buttons button:first-child {
      border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    }

    .video-number-buttons button:hover {
      color: #64ffda;
      background: rgba(100, 255, 218, 0.08);
    }

    .video-export-grid small {
      color: #718096;
      font: 600 11px "Inter", sans-serif;
    }

    .video-export-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 18px;
    }

    .video-export-secondary,
    .video-export-primary {
      height: 40px;
      border-radius: 12px;
      padding: 0 16px;
      font: 800 13px "Inter", sans-serif;
      cursor: pointer;
    }

    .video-export-secondary {
      color: #cbd5e1;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(148, 163, 184, 0.24);
    }

    .video-export-secondary:hover {
      border-color: rgba(148, 163, 184, 0.42);
      background: rgba(30, 41, 59, 0.8);
    }

    .video-export-primary {
      color: #001b18;
      background: #64ffda;
      border: 1px solid #64ffda;
    }

    .video-export-primary:hover {
      filter: brightness(1.08);
      box-shadow: 0 0 18px rgba(100, 255, 218, 0.22);
    }

    @media (max-width: 640px) {
      .video-export-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

function openVideoExportModal(format) {
  closeExportMenu();
  ensureVideoExportModal();

  pendingVideoFormat = format === 'mp4' ? 'mp4' : 'webm';

  const label = document.getElementById('videoExportFormatLabel');
  const modal = document.getElementById('videoExportModal');

  if (label) {
    label.textContent = pendingVideoFormat.toUpperCase();
  }

  if (modal) {
    modal.style.display = 'flex';
  }

  toggleVideoCustomSettings();
}

function closeVideoExportModal() {
  const modal = document.getElementById('videoExportModal');

  if (modal) {
    modal.style.display = 'none';
  }
}

function toggleVideoCustomSettings() {
  const mode = getSelectedVideoMode();
  const custom = document.getElementById('videoCustomSettings');

  if (custom) {
    custom.style.display = mode === 'custom' ? 'block' : 'none';
  }
}

function stepVideoDuration(amount) {
  const input = document.getElementById('videoDurationInput');

  if (!input) return;

  const min = Number(input.min || 5);
  const max = Number(input.max || 120);
  const current = Number(input.value || 30);
  const next = Math.min(max, Math.max(min, current + amount));

  input.value = next;
}

function getSelectedVideoMode() {
  const checked = document.querySelector('input[name="videoMode"]:checked');
  return checked ? checked.value : 'quick';
}

function getVideoBitrate(quality) {
  if (quality === 'ultra') return 18000000;
  if (quality === 'standard') return 6000000;
  return 12000000;
}

function getVideoExportSettings() {
  const mode = getSelectedVideoMode();

  if (mode === 'quick') {
    return {
      format: pendingVideoFormat,
      fps: 30,
      durationMs: 30000,
      bitrate: 12000000
    };
  }

  const durationInput = document.getElementById('videoDurationInput');
  const fpsInput = document.getElementById('videoFpsInput');
  const qualityInput = document.getElementById('videoQualityInput');

  const seconds = Math.min(
    120,
    Math.max(5, Math.round(Number(durationInput ? durationInput.value : 30) || 30))
  );

  const fps = Math.min(
    60,
    Math.max(24, Math.round(Number(fpsInput ? fpsInput.value : 30) || 30))
  );

  const quality = qualityInput ? qualityInput.value : 'high';

  return {
    format: pendingVideoFormat,
    fps,
    durationMs: seconds * 1000,
    bitrate: getVideoBitrate(quality)
  };
}

function getBestMimeType(format) {
  if (format === 'mp4') {
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
      return 'video/mp4;codecs=h264';
    }

    if (MediaRecorder.isTypeSupported('video/mp4')) {
      return 'video/mp4';
    }

    return '';
  }

  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
    return 'video/webm;codecs=vp9';
  }

  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
    return 'video/webm;codecs=vp8';
  }

  if (MediaRecorder.isTypeSupported('video/webm')) {
    return 'video/webm';
  }

  return '';
}

function getVideoExtension(format, mimeType) {
  if (format === 'mp4' && mimeType.includes('mp4')) return 'mp4';
  return 'webm';
}

function recordStreamToFile(stream, settings) {
  const mimeType = getBestMimeType(settings.format);

  if (!mimeType) {
    if (settings.format === 'mp4') {
      alert('MP4 recording is not supported in this browser. Export WebM instead, then convert it to MP4.');
      setStatus('MP4 not supported. Use WebM export.');
    } else {
      alert('WebM recording is not supported in this browser.');
      setStatus('WebM export not supported.');
    }

    return;
  }

  const chunks = [];
  const options = {
    mimeType,
    videoBitsPerSecond: settings.bitrate
  };

  const rec = new MediaRecorder(stream, options);

  rec.ondataavailable = e => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  rec.onstop = () => {
    const blob = new Blob(chunks, {
      type: mimeType
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const extension = getVideoExtension(settings.format, mimeType);

    a.href = url;
    a.download = 'netflow-recording-' + settings.durationMs / 1000 + 's.' + extension;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 5000);

    stream.getTracks().forEach(track => track.stop());

    recDot.style.display = 'none';
    setStatus(extension.toUpperCase() + ' exported');
  };

  rec.onerror = error => {
    console.error(error);

    stream.getTracks().forEach(track => track.stop());

    recDot.style.display = 'none';
    setStatus(settings.format.toUpperCase() + ' export failed');
  };

  recDot.style.display = 'inline-block';
  setStatus(
    'Recording ' +
    settings.format.toUpperCase() +
    ' for ' +
    settings.durationMs / 1000 +
    ' seconds at ' +
    settings.fps +
    ' FPS...'
  );

  rec.start();

  setTimeout(() => {
    if (rec.state !== 'inactive') {
      rec.stop();
    }
  }, settings.durationMs);
}

function startCanvasOnlyVideoExport(settings) {
  drawScene(performance.now());

  const stream = canvas.captureStream(settings.fps);

  recordStreamToFile(stream, settings);
}

function startConfiguredVideoExport() {
  if (!window.MediaRecorder) {
    return alert('MediaRecorder is not supported in this browser.');
  }

  const settings = getVideoExportSettings();

  closeVideoExportModal();

  startCanvasOnlyVideoExport(settings);
}

/* Existing menu functions now open the recording settings modal */

function exportMP4() {
  openVideoExportModal('mp4');
}

function exportWebM() {
  openVideoExportModal('webm');
}

/* =========================
   JSON EXPORT / IMPORT
========================= */

function openJsonModal() {
  const clean = JSON.parse(JSON.stringify(state));

  clean.connections.forEach(c => {
    c.color = '';

    if (!Array.isArray(c.points)) {
      c.points = [];
    }
  });

  jsonBox.value = JSON.stringify(clean, null, 2);
  jsonModal.style.display = 'flex';
}

function copyJson() {
  jsonBox.select();
  document.execCommand('copy');
  setStatus('JSON copied');
}

function importJson() {
  try {
    const p = JSON.parse(jsonBox.value);

    if (!p.devices || !p.connections || !p.zones) {
      throw Error();
    }

    pushHistory();

    state = normalizeProject(p);

    closeModal('jsonModal');
    refreshSidebar();
    updateUiState();

    setStatus('JSON imported');
  } catch {
    setStatus('⚠ Invalid JSON');
  }
}