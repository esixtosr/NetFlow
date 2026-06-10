function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

function toggleExportMenu() {
  closeSizeMenu();
  exportMenu.style.display = exportMenu.style.display === 'block' ? 'none' : 'block';
}

function closeExportMenu() {
  exportMenu.style.display = 'none';
}

function toggleSizeMenu() {
  closeExportMenu();

  if (sizeMenu.style.display === 'block') {
    sizeMenu.style.display = 'none';
    return;
  }

  const btn = document.getElementById('sizeBtn');
  const rect = btn.getBoundingClientRect();

  sizeMenu.style.display = 'block';
  sizeMenu.style.position = 'fixed';
  sizeMenu.style.top = rect.bottom + 8 + 'px';
  sizeMenu.style.left = rect.left + 'px';
  sizeMenu.style.right = 'auto';
}

function closeSizeMenu() {
  sizeMenu.style.display = 'none';
}

document.addEventListener('click', e => {
  if (
    !exportMenu.contains(e.target) &&
    !e.target.closest('[onclick="toggleExportMenu()"]')
  ) {
    exportMenu.style.display = 'none';
  }

  if (
    !sizeMenu.contains(e.target) &&
    !e.target.closest('[onclick="toggleSizeMenu()"]')
  ) {
    sizeMenu.style.display = 'none';
  }
});