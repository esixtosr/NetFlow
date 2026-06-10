const STATUS_COLOR = {
  online: '#39d353',
  warning: '#f0c040',
  down: '#ff5566',
  blocked: '#ff5566'
};

const TYPE_ICON = {
  firewall: 'wall',
  router: 'network',
  switch: 'switch-horizontal',
  server: 'server',
  vm: 'desktop',
  pc: 'devices-2',
  ap: 'antenna-bars-5',
  wifi: 'wifi',
  cloud: 'cloud',
  database: 'database',
  other: 'shield-lock'
};

const TYPE_LABEL = {
  firewall: 'FIREWALL',
  router: 'ROUTER/GATEWAY',
  switch: 'SWITCH',
  server: 'SERVER',
  vm: 'VM',
  pc: 'PC',
  ap: 'AP',
  wifi: 'WIFI',
  cloud: 'WAN/CLOUD',
  database: 'DATABASE/NAS',
  other: 'DEVICE'
};

const TABLER_PATHS = {
  wall: [
    'M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12',
    'M4 8h16',
    'M20 12h-16',
    'M4 16h16',
    'M9 4v4',
    'M14 8v4',
    'M8 12v4',
    'M16 12v4',
    'M11 16v4'
  ],

  'switch-horizontal': [
    'M16 3l4 4l-4 4',
    'M10 7l10 0',
    'M8 13l-4 4l4 4',
    'M4 17l9 0'
  ],

  cloud: [
    'M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878'
  ],

  server: [
    'M3 7a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3',
    'M3 15a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3l0 -2',
    'M7 8l0 .01',
    'M7 16l0 .01'
  ],

  'devices-2': [
    'M10 15h-6a1 1 0 0 1 -1 -1v-8a1 1 0 0 1 1 -1h6',
    'M13 5a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1l0 -14',
    'M7 19l3 0',
    'M17 8l0 .01',
    'M16 16a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
    'M9 15l0 4'
  ],

  desktop: [
    'M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10',
    'M7 20h10',
    'M9 16v4',
    'M15 16v4'
  ],

  wifi: [
    'M12 18l.01 0',
    'M9.172 15.172a4 4 0 0 1 5.656 0',
    'M6.343 12.343a8 8 0 0 1 11.314 0',
    'M3.515 9.515c4.686 -4.687 12.284 -4.687 17 0'
  ],

  'antenna-bars-5': [
    'M6 18l0 -3',
    'M10 18l0 -6',
    'M14 18l0 -9',
    'M18 18l0 -12'
  ],

  database: [
    'M4 6a8 3 0 1 0 16 0a8 3 0 1 0 -16 0',
    'M4 6v6a8 3 0 0 0 16 0v-6',
    'M4 12v6a8 3 0 0 0 16 0v-6'
  ],

  'shield-lock': [
    'M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3',
    'M11 11a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
    'M12 12l0 2.5'
  ],

  network: [
    'M6 9a6 6 0 1 0 12 0a6 6 0 0 0 -12 0',
    'M12 3c1.333 .333 2 2.333 2 6s-.667 5.667 -2 6',
    'M12 3c-1.333 .333 -2 2.333 -2 6s.667 5.667 2 6',
    'M6 9h12',
    'M3 20h7',
    'M14 20h7',
    'M10 20a2 2 0 1 0 4 0a2 2 0 0 0 -4 0',
    'M12 15v3'
  ],

  line: [
    'M4 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
    'M16 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
    'M7.5 16.5l9 -9'
  ]
};

const BASE_DEVICE_W = 290;
const BASE_DEVICE_H = 106;