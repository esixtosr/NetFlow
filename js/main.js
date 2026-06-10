buildDefaultProject();
refreshSidebar();
updateUiState();
fitView();

if (typeof updateDevicePortCountDefault === 'function') {
  updateDevicePortCountDefault();
}

requestAnimationFrame(render);
