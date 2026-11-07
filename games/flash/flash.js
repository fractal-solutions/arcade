(() => {
  'use strict';

  const form = document.getElementById('swf-form');
  const fileInput = document.getElementById('swf-file');
  const fileName = document.getElementById('file-name');
  const loadButton = document.getElementById('load-button');
  const clearButton = document.getElementById('clear-button');
  const fullscreenButton = document.getElementById('fullscreen-button');
  const status = document.getElementById('player-status');
  const playerTitle = document.getElementById('player-title');
  const playerContainer = document.getElementById('player-container');
  let player = null;

  function report(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    fileName.textContent = file ? file.name : 'Nothing selected';
    loadButton.disabled = !file;
    if (file) report('Ready to load. Your SWF stays on this device.');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      report('Choose an SWF file first.', true);
      return;
    }
    if (!/\.swf$/i.test(file.name)) {
      report('That file does not have a .swf extension.', true);
      return;
    }
    if (!window.RufflePlayer || typeof window.RufflePlayer.newest !== 'function') {
      report('Ruffle could not start. Check that the local runtime files are being served, then reload this page.', true);
      return;
    }

    loadButton.disabled = true;
    report(`Loading ${file.name}…`);
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const signature = String.fromCharCode(...data.subarray(0, 3));
      if (data.length < 8 || !['FWS', 'CWS', 'ZWS'].includes(signature)) {
        throw new Error('This file does not have a valid SWF header.');
      }

      if (player) player.remove();
      player = window.RufflePlayer.newest().createPlayer();
      player.classList.add('ruffle-player');
      playerContainer.replaceChildren(player);
      playerTitle.textContent = file.name;
      clearButton.disabled = false;
      fullscreenButton.disabled = false;

      await player.ruffle().load({ data });
      report(`Loaded ${file.name}. If the screen stays blank, this game may need unsupported features or extra files.`);
    } catch (error) {
      console.error('Unable to load the selected SWF:', error);
      report(error instanceof Error ? error.message : 'The SWF could not be loaded.', true);
    } finally {
      loadButton.disabled = !(fileInput.files && fileInput.files[0]);
    }
  });

  clearButton.addEventListener('click', () => {
    if (player) player.remove();
    player = null;
    playerContainer.innerHTML = '<div class="empty-state"><span class="empty-mark" aria-hidden="true">▶</span><p>Your game will appear here</p></div>';
    playerTitle.textContent = 'FLASH PLAYER';
    clearButton.disabled = true;
    fullscreenButton.disabled = true;
    fileInput.value = '';
    fileName.textContent = 'Nothing selected';
    loadButton.disabled = true;
    report('Player cleared. Choose another SWF when you are ready.');
  });

  fullscreenButton.addEventListener('click', async () => {
    try {
      if (!player) return;
      if (!document.fullscreenElement) {
        await playerContainer.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Unable to change Flash player fullscreen mode:', error);
      report('Fullscreen is unavailable in this browser.', true);
    }
  });
})();
