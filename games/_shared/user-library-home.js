/* Injects saved "Your data" entries into the landing page before arcade.js
   builds the list. Reads the synchronous localStorage index written by the
   cabinets; the file bytes themselves live in IndexedDB. */
(() => {
  'use strict';

  const lib = window.ArcadeUserLibrary;
  const grid = document.getElementById('cabinet-grid');
  if (!lib || !grid) return;

  const COVER = 'assets/user-data.svg';
  const KIND_LABEL = {
    gba: 'GBA ROM',
    flash: 'Flash SWF',
    dos: 'DOS bundle',
  };

  const records = lib.listSync().filter((record) =>
    record && (record.kind === 'gba' || record.kind === 'flash' || record.kind === 'dos'));

  if (!records.length) return;

  function formatSize(bytes) {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const fragment = document.createDocumentFragment();

  records.forEach((record, index) => {
    const kind = record.kind;
    const label = KIND_LABEL[kind] || 'Your data';
    const title = String(record.name || 'Saved game').replace(/\.[^.]+$/, '');
    const href = `games/${kind}/?user=${encodeURIComponent(record.id)}`;

    const article = element('article', 'cabinet user-cabinet');
    article.dataset.game = `user-${record.id}`;
    article.dataset.kind = 'data';
    article.dataset.userKind = kind;
    article.style.setProperty('--i', String(90 + index));

    const link = element('a', 'cabinet-link');
    link.href = href;
    link.setAttribute('aria-label', `Open ${title}`);

    const art = element('div', 'art');
    const image = document.createElement('img');
    image.src = COVER;
    image.alt = `${label} saved from your device`;
    image.width = 800;
    image.height = 500;
    image.loading = 'lazy';
    art.append(image);
    art.append(element('span', 'art-index', '＋'));
    art.lastChild.setAttribute('aria-hidden', 'true');
    art.append(element('span', 'art-tag', `Your data · ${label}`));
    const badge = element('span', 'play-badge', '▶');
    badge.setAttribute('aria-hidden', 'true');
    art.append(badge);

    const body = element('div', 'body');
    const titleRow = element('div', 'title-row');
    titleRow.append(element('h2', '', title));
    titleRow.append(element('span', 'chip data', 'Your data'));
    body.append(titleRow);
    body.append(element('p', '', `${record.name} · saved from your device and remembered in this browser.`));

    const foot = element('div', 'card-foot');
    foot.append(element('span', 'progress', `Saved locally · ${formatSize(record.size)}`));
    const cta = element('span', 'cta', 'Play ');
    const arrow = element('span', '', '→');
    arrow.setAttribute('aria-hidden', 'true');
    cta.append(arrow);
    foot.append(cta);
    body.append(foot);

    link.append(art, body);

    const forget = element('button', 'data-help', 'Forget this file');
    forget.type = 'button';
    forget.dataset.forgetUser = record.id;

    article.append(link, forget);
    fragment.append(article);
  });

  grid.append(fragment);

  grid.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-forget-user]');
    if (!button) return;
    const id = button.dataset.forgetUser;
    if (!id) return;
    if (!window.confirm('Remove this saved file from the arcade list?')) return;
    button.disabled = true;
    try {
      await lib.remove(id);
      // The landing page's card/list indexes are built once at startup, so a
      // reload is the cleanest way to drop the entry everywhere.
      window.location.reload();
    } catch (error) {
      console.error('Unable to forget the saved file:', error);
      button.disabled = false;
      window.alert('That file could not be removed. Try again.');
    }
  });
})();
