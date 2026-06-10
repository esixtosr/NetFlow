function drawTablerIcon(icon, x, y, size, color) {
  const paths = TABLER_PATHS[icon] || TABLER_PATHS['shield-lock'];
  const scale = size / 24;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  paths.forEach(path => ctx.stroke(new Path2D(path)));

  ctx.restore();
}

function getDeviceIconLeft(device) {
  return device.iconLeft && device.iconLeft !== 'auto'
    ? device.iconLeft
    : (TYPE_ICON[device.type] || 'shield-lock');
}

function getDeviceIconRight(device) {
  return device.iconRight || '';
}