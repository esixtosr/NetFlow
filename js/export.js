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