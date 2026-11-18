/*!
 * Recent Communities v1.3.2 (Alternatief ontwerp)
 * © 2026 Lars Ossendrijver — https://larsossendrijver.com
 * Alle rechten voorbehouden. Gebruik, kopiëren of aanpassen alleen met
 * schriftelijke toestemming van de auteur.
 *
 * Iconen: Lucide (https://lucide.dev), ISC-licentie.
 */

/**
 * Recent bezochte communities — voor Pleio-platforms
 *
 * 1. Tracker: onthoudt per ingelogde gebruiker welke community-pagina's
 *    (/groups/view/<guid>/...) hij bezoekt, in localStorage.
 * 2. Renderer: vult elk element met [data-recent-communities] met die lijst.
 *    Namen, iconen, ledenaantal en status komen live uit de GraphQL-API;
 *    communities waar de gebruiker geen toegang meer toe heeft vallen weg.
 *
 * Instellingen in de HTML (op het element met data-recent-communities):
 *   data-recent-communities-limit="3"   aantal per keer; meer via de knop
 *   data-recent-communities-hide-empty  blok verbergen als de lijst leeg is
 *                                       (zet er ook `hidden` op tegen knipperen)
 * Optionele onderdelen binnen het blok:
 *   [data-recent-communities-list]   de <ul> die gevuld wordt
 *   [data-recent-communities-more]   knop om meer te tonen
 *   [data-recent-communities-empty]  tekst als de lijst leeg is
 *
 * Alle styling zit in dit script (element.style), los van het platform.
 * Laad het script op elke pagina (bijv. in het footer-HTML-blok).
 */
(() => {
  'use strict';

  if (window.__recentCommunities) return;
  window.__recentCommunities = true;

  // --- Instellingen ---

  const STORAGE_PREFIX = 'recent-communities'; // per project aanpasbaar
  const MAX_ITEMS = 8; // zoveel recente bezoeken worden onthouden
  const DEFAULT_LIMIT = 3;
  const DEBUG = true; // op false zetten als het live staat
  const GROUP_PATH = /^\/groups\/view\/([0-9a-f-]{36})(?:\/|$)/i;

  // Waarden uit Figma (NHVeilig, frame 203:895).
  const COLOR = {
    card: '#ffffff',
    title: '#003a40',
    name: '#6f6f6f',
    meta: 'rgba(0, 0, 0, 0.55)',
    icon: '#949494',
    avatar: '#f5f5f5',
  };

  const STYLES = {
    // position + z-index: boven de absolute leader-afbeelding in dezelfde kolom.
    container: { position: 'relative', zIndex: '1', background: COLOR.card, borderRadius: '4px', overflow: 'hidden' },
    title: { margin: '0', padding: '16px', color: COLOR.title, fontSize: '18px', lineHeight: '1', fontWeight: '700' },
    list: { listStyle: 'none', margin: '14px 0 0', padding: '0', display: 'grid', gap: '4px' },
    item: { display: 'flex', alignItems: 'flex-start', padding: '16px 20px' },
    avatarWrap: { flex: 'none', width: '60px', padding: '4px 20px 0 0', boxSizing: 'border-box' },
    avatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: COLOR.avatar,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      display: 'grid',
      placeItems: 'center',
      color: '#000',
      fontSize: '18px',
      lineHeight: '24px',
      fontWeight: '700',
    },
    content: { flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '8px' },
    header: { display: 'flex', alignItems: 'flex-start', gap: '8px' },
    name: {
      flex: '1',
      minWidth: '0',
      color: COLOR.name,
      fontSize: '17.5px',
      lineHeight: '28px',
      fontWeight: '700',
      textDecoration: 'none',
      overflowWrap: 'break-word',
    },
    info: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '32px' },
    meta: { color: COLOR.meta, fontSize: '13.1px', lineHeight: '20px', whiteSpace: 'nowrap' },
    status: { display: 'flex', alignItems: 'center' },
    iconBox: {
      display: 'grid',
      placeItems: 'center',
      flex: 'none',
      width: '32px',
      height: '32px',
      padding: '0',
      border: '0',
      background: 'none',
      color: COLOR.icon,
    },
    more: {
      display: 'block',
      margin: '0 auto 16px',
      padding: '8px 16px',
      border: '0',
      background: 'none',
      color: COLOR.title,
      font: 'inherit',
      fontWeight: '700',
      cursor: 'pointer',
    },
    empty: { margin: '0', padding: '0 16px 16px' },
    note: { margin: '0', padding: '0 16px 16px', color: COLOR.meta, fontSize: '13.1px', lineHeight: '20px' },
  };

  // pinOff, lock en eyeOff komen uit het Figma-ontwerp; pin (vastgepind) uit Lucide.
  const ICONS = {
    pinOff: {
      width: 24, height: 24,
      body: '<path fill="currentColor" d="M3.707 2.293C3.317 1.902 2.683 1.902 2.293 2.293C1.902 2.683 1.902 3.317 2.293 3.707L3 3L3.707 2.293M20.293 21.707C20.683 22.098 21.317 22.098 21.707 21.707C22.098 21.317 22.098 20.683 21.707 20.293L21 21L20.293 21.707M15.707 5.207C16.098 4.817 16.098 4.183 15.707 3.793C15.317 3.402 14.683 3.402 14.293 3.793L15 4.5L15.707 5.207M11.044 7.042C10.653 7.432 10.653 8.066 11.044 8.456C11.434 8.847 12.068 8.847 12.458 8.456L11.751 7.749L11.044 7.042M9.532 10.118C10.049 9.924 10.311 9.348 10.117 8.831C9.923 8.314 9.347 8.052 8.83 8.246L9.181 9.182L9.532 10.118M7 10L6.649 9.064C6.515 9.114 6.394 9.192 6.293 9.293L7 10M5.5 11.5L4.793 10.793C4.402 11.183 4.402 11.817 4.793 12.207L5.5 11.5M12.5 18.5L11.793 19.207C12.183 19.598 12.817 19.598 13.207 19.207L12.5 18.5M14 17L14.707 17.707C14.808 17.606 14.886 17.485 14.936 17.351L14 17M15.756 15.165C15.95 14.648 15.688 14.072 15.171 13.878C14.654 13.684 14.078 13.946 13.884 14.463L14.82 14.814L15.756 15.165M15.543 11.544C15.152 11.935 15.152 12.568 15.543 12.958C15.934 13.349 16.567 13.349 16.957 12.958L16.25 12.251L15.543 11.544M20.207 9.707C20.598 9.316 20.598 8.683 20.207 8.293C19.816 7.902 19.183 7.902 18.793 8.293L19.5 9L20.207 9.707M9.707 15.707C10.098 15.317 10.098 14.683 9.707 14.293C9.317 13.902 8.683 13.902 8.293 14.293L9 15L9.707 15.707M3.793 18.793C3.402 19.183 3.402 19.817 3.793 20.207C4.183 20.598 4.817 20.598 5.207 20.207L4.5 19.5L3.793 18.793M15.207 3.293C14.817 2.902 14.183 2.902 13.793 3.293C13.402 3.683 13.402 4.317 13.793 4.707L14.5 4L15.207 3.293M19.293 10.207C19.683 10.598 20.317 10.598 20.707 10.207C21.098 9.817 21.098 9.183 20.707 8.793L20 9.5L19.293 10.207M3 3L2.293 3.707L20.293 21.707L21 21L21.707 20.293L3.707 2.293L3 3M15 4.5L14.293 3.793L11.044 7.042L11.751 7.749L12.458 8.456L15.707 5.207L15 4.5M9.181 9.182L8.83 8.246L6.649 9.064L7 10L7.351 10.936L9.532 10.118L9.181 9.182M7 10L6.293 9.293L4.793 10.793L5.5 11.5L6.207 12.207L7.707 10.707L7 10M5.5 11.5L4.793 12.207L11.793 19.207L12.5 18.5L13.207 17.793L6.207 10.793L5.5 11.5M12.5 18.5L13.207 19.207L14.707 17.707L14 17L13.293 16.293L11.793 17.793L12.5 18.5M14 17L14.936 17.351L15.756 15.165L14.82 14.814L13.884 14.463L13.064 16.649L14 17M16.25 12.251L16.957 12.958L20.207 9.707L19.5 9L18.793 8.293L15.543 11.544L16.25 12.251M9 15L8.293 14.293L3.793 18.793L4.5 19.5L5.207 20.207L9.707 15.707L9 15M14.5 4L13.793 4.707L19.293 10.207L20 9.5L20.707 8.793L15.207 3.293L14.5 4"/>',
    },
    pin: {
      width: 24, height: 24,
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></g>',
    },
    lock: {
      width: 12, height: 18,
      body: '<path fill="currentColor" d="M6 0.25C6.995 0.25 7.948 0.645 8.652 1.348C9.355 2.052 9.75 3.005 9.75 4L9.75 5.25L10 5.25C10.439 5.25 10.862 5.415 11.185 5.713C11.508 6.01 11.708 6.418 11.744 6.856L11.75 7L11.75 14C11.75 14.464 11.566 14.909 11.237 15.237C10.909 15.566 10.464 15.75 10 15.75L2 15.75C1.536 15.75 1.091 15.566 0.763 15.237C0.434 14.909 0.25 14.464 0.25 14L0.25 7C0.25 6.034 1.034 5.25 2 5.25L2.25 5.25L2.25 4C2.25 3.04 2.618 2.117 3.278 1.42C3.939 0.723 4.841 0.306 5.8 0.255L6 0.25M10 6.75L2 6.75C1.934 6.75 1.87 6.776 1.823 6.823C1.776 6.87 1.75 6.934 1.75 7L1.75 14C1.75 14.138 1.862 14.25 2 14.25L10 14.25C10.066 14.25 10.13 14.224 10.177 14.177C10.224 14.13 10.25 14.066 10.25 14L10.25 7C10.25 6.934 10.224 6.87 10.177 6.823C10.13 6.776 10.066 6.75 10 6.75M6 9C6.398 9 6.779 9.158 7.061 9.439C7.342 9.721 7.5 10.102 7.5 10.5C7.5 10.898 7.342 11.279 7.061 11.561C6.779 11.842 6.398 12 6 12C5.602 12 5.221 11.842 4.939 11.561C4.658 11.279 4.5 10.898 4.5 10.5C4.5 10.102 4.658 9.721 4.939 9.439C5.221 9.158 5.602 9 6 9M6 1.75C5.403 1.75 4.831 1.987 4.409 2.409C3.987 2.831 3.75 3.403 3.75 4L3.75 5.25L8.25 5.25L8.25 4C8.25 3.43 8.034 2.881 7.645 2.464C7.256 2.048 6.723 1.794 6.154 1.755L6 1.75"/>',
    },
    eyeOff: {
      width: 20, height: 18,
      body: '<path fill="currentColor" d="M10 13C8.889 13 7.944 12.611 7.167 11.834C6.389 11.056 6 10.111 6 9C6 7.89 6.389 6.946 7.167 6.168C7.944 5.389 8.889 5 10 5C11.111 5 12.056 5.389 12.833 6.167C13.611 6.945 14 7.889 14 9C14 10.11 13.611 11.055 12.833 11.834C12.055 12.612 11.111 13.001 10 13M10 16C7.788 16 5.773 15.366 3.955 14.099C2.136 12.831 0.818 11.131 0 9C0.818 6.869 2.136 5.17 3.955 3.902C5.721 2.65 7.835 1.985 10 2C12.212 2 14.227 2.634 16.045 3.902C17.864 5.17 19.182 6.869 20 9C19.182 11.13 17.864 12.83 16.045 14.099C14.279 15.35 12.164 16.015 10 16M10 14C11.712 14 13.284 13.549 14.716 12.648C16.131 11.764 17.269 10.5 18 9C17.269 7.5 16.131 6.237 14.716 5.353C13.306 4.459 11.669 3.989 10 4C8.288 4 6.716 4.451 5.284 5.353C3.869 6.237 2.731 7.5 2 9C2.731 10.5 3.869 11.764 5.284 12.648C6.694 13.541 8.331 14.011 10 14"/><path fill="' + COLOR.card + '" d="M2.221 1.222L3.635 -0.192L18.485 14.657L17.071 16.071L2.221 1.222"/><path fill="currentColor" d="M0.807 2.636L2.221 1.222L17.071 16.071L15.656 17.486L0.807 2.636"/>',
    },
  };

  const log = (...args) => DEBUG && console.log('[recent-communities]', ...args);
  const applyStyle = (el, style) => el && Object.assign(el.style, style);

  // `hidden` alleen werkt niet als er inline een display staat, dus beide zetten.
  const setVisible = (el, visible, display) => {
    if (!el) return;
    el.hidden = !visible;
    el.style.display = visible ? display : 'none';
  };

  // --- Opslag (per gebruiker) ---

  const user = document.body?.dataset.authenticatedUser;
  if (!user) {
    log('niet ingelogd, script doet niets');
    return;
  }

  const hash = (str) => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  };
  const RECENT_KEY = `${STORAGE_PREFIX}:${hash(user)}`;
  const PINNED_KEY = `${RECENT_KEY}:pinned`;

  const read = (key) => {
    try {
      const list = JSON.parse(localStorage.getItem(key));
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  };

  const write = (key, list) => {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      // opslag vol of geblokkeerd: dan maar geen geschiedenis
    }
  };

  // Vastgepinde communities eerst, daarna de recente.
  const orderedGuids = () => {
    const pinned = read(PINNED_KEY);
    return [...pinned, ...read(RECENT_KEY).filter((g) => !pinned.includes(g))];
  };

  // --- 1. Tracker ---

  let lastPath = null;

  const track = () => {
    const path = location.pathname;
    if (path === lastPath) return;
    lastPath = path;

    const match = path.match(GROUP_PATH);
    if (!match) return;

    const guid = match[1].toLowerCase();
    write(RECENT_KEY, [guid, ...read(RECENT_KEY).filter((g) => g !== guid)].slice(0, MAX_ITEMS));
    log('bezoek opgeslagen', guid);
  };

  // Pleio is een single-page app: URL-wissels gaan via history.pushState.
  if ('navigation' in window) {
    navigation.addEventListener('navigatesuccess', track);
  } else {
    for (const method of ['pushState', 'replaceState']) {
      const original = history[method];
      history[method] = function (...args) {
        const result = original.apply(this, args);
        track();
        return result;
      };
    }
    window.addEventListener('popstate', track);
  }
  track();
  log('tracker actief');

  // --- 2. Renderer ---

  const fetchData = async (guids) => {
    // Eén query: per community een alias (geen toegang geeft null) plus of de
    // gebruiker beheerder is.
    const fields = guids
      .map((g, i) => `g${i}: entity(guid: "${g}") { guid ... on Group { name url memberCount isClosed isHidden icon { download } } }`)
      .join('\n');

    const response = await fetch('/graphql', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `query RecentCommunities {\nviewer { guid isAdmin }\n${fields}\n}` }),
    });
    const { data } = await response.json();

    return {
      groups: guids.map((_, i) => data?.[`g${i}`]).filter((group) => group?.name),
      isAdmin: Boolean(data?.viewer?.isAdmin),
    };
  };

  const icon = (name, label) => {
    const { width, height, body } = ICONS[name];
    const span = document.createElement('span');
    span.style.display = 'block';
    span.style.lineHeight = '0';
    span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" focusable="false" ${
      label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'
    }>${label ? `<title>${label}</title>` : ''}${body}</svg>`;
    return span;
  };

  // :hover en :focus-visible kunnen niet inline, dus via events.
  const underlineOnInteraction = (link) => {
    const set = (on) => { link.style.textDecoration = on ? 'underline' : 'none'; };
    link.addEventListener('mouseenter', () => set(true));
    link.addEventListener('mouseleave', () => set(link.matches(':focus-visible')));
    link.addEventListener('focus', () => set(link.matches(':focus-visible')));
    link.addEventListener('blur', () => set(link.matches(':hover')));
  };

  const renderItem = (group, isPinned, onTogglePin) => {
    const groupName = group.name.trim();

    const li = document.createElement('li');
    li.dataset.guid = group.guid;
    applyStyle(li, STYLES.item);

    const avatarWrap = document.createElement('span');
    applyStyle(avatarWrap, STYLES.avatarWrap);
    const avatar = document.createElement('span');
    avatar.setAttribute('aria-hidden', 'true');
    applyStyle(avatar, STYLES.avatar);
    if (group.icon?.download) {
      avatar.style.backgroundImage = `url("${group.icon.download.replace(/"/g, '%22')}?size=80")`;
    } else {
      avatar.textContent = groupName.charAt(0).toUpperCase();
    }
    avatarWrap.append(avatar);

    const name = document.createElement('a');
    name.href = group.url;
    name.textContent = groupName;
    applyStyle(name, STYLES.name);
    underlineOnInteraction(name);

    const pin = document.createElement('button');
    pin.type = 'button';
    pin.dataset.pin = '';
    pin.setAttribute('aria-pressed', String(isPinned));
    pin.setAttribute('aria-label', `${groupName} vastpinnen`);
    pin.title = isPinned ? 'Losmaken' : 'Vastpinnen';
    applyStyle(pin, { ...STYLES.iconBox, cursor: 'pointer', ...(isPinned && { color: COLOR.title }) });
    pin.append(icon(isPinned ? 'pin' : 'pinOff'));
    pin.addEventListener('click', () => onTogglePin(group.guid));

    const header = document.createElement('div');
    applyStyle(header, STYLES.header);
    header.append(name, pin);

    const meta = document.createElement('span');
    meta.textContent = `${group.memberCount} ${group.memberCount === 1 ? 'lid' : 'leden'}`;
    applyStyle(meta, STYLES.meta);

    const status = document.createElement('span');
    applyStyle(status, STYLES.status);
    for (const [show, iconName, label] of [
      [group.isClosed, 'lock', 'Besloten community'],
      [group.isHidden, 'eyeOff', 'Verborgen community'],
    ]) {
      if (!show) continue;
      const box = document.createElement('span');
      applyStyle(box, STYLES.iconBox);
      box.append(icon(iconName, label));
      status.append(box);
    }

    const info = document.createElement('div');
    applyStyle(info, STYLES.info);
    info.append(meta, status);

    const content = document.createElement('div');
    applyStyle(content, STYLES.content);
    content.append(header, info);

    li.append(avatarWrap, content);

    // Hele item klikbaar (behalve het speldje); de naam blijft de echte link,
    // zodat toetsenbord en schermlezers één duidelijke link per community hebben.
    li.style.cursor = 'pointer';
    li.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;
      if (event.metaKey || event.ctrlKey) window.open(name.href, '_blank');
      else name.click();
    });
    li.addEventListener('mouseenter', () => { name.style.textDecoration = 'underline'; });
    li.addEventListener('mouseleave', () => {
      if (!name.matches(':focus-visible')) name.style.textDecoration = 'none';
    });
    return li;
  };

  // Melding voor beheerders/redacteuren als het blok voor gebruikers verborgen is.
  const editorNote = (container) => {
    let note = container.querySelector('[data-recent-communities-note]');
    if (!note) {
      note = document.createElement('p');
      note.dataset.recentCommunitiesNote = '';
      note.textContent =
        'Alleen zichtbaar voor beheerders: gebruikers zien dit blok pas als ze een community hebben bezocht.';
      applyStyle(note, STYLES.note);
      container.append(note);
    }
    return note;
  };

  const render = async (container, { focusPinOf } = {}) => {
    container.dataset.recentCommunitiesReady = '';
    const list = container.querySelector('[data-recent-communities-list]') || container;
    const more = container.querySelector('[data-recent-communities-more]');
    const empty = container.querySelector('[data-recent-communities-empty]');
    const limit = Number(container.dataset.recentCommunitiesLimit) || DEFAULT_LIMIT;

    applyStyle(container, STYLES.container);
    applyStyle(container.querySelector('h2, h3'), STYLES.title);
    applyStyle(list, STYLES.list);
    applyStyle(more, STYLES.more);
    applyStyle(empty, STYLES.empty);

    const guids = orderedGuids();
    let groups;
    let isAdmin;
    try {
      ({ groups, isAdmin } = await fetchData(guids));
    } catch (error) {
      console.warn('[recent-communities] ophalen mislukt', error);
      return;
    }

    // Communities zonder toegang meteen uit de opslag halen.
    if (groups.length !== guids.length) {
      const available = groups.map((g) => g.guid);
      write(RECENT_KEY, read(RECENT_KEY).filter((g) => available.includes(g)));
      write(PINNED_KEY, read(PINNED_KEY).filter((g) => available.includes(g)));
    }

    const pinned = read(PINNED_KEY);
    const togglePin = (guid) => {
      write(PINNED_KEY, pinned.includes(guid) ? pinned.filter((g) => g !== guid) : [...pinned, guid]);
      render(container, { focusPinOf: guid });
    };

    const items = groups.map((group) => renderItem(group, pinned.includes(group.guid), togglePin));

    // Bij opnieuw renderen evenveel tonen als de gebruiker al had opengeklapt.
    let shown = Math.max(limit, Number(container.dataset.recentCommunitiesShown) || 0);
    const update = () => {
      items.forEach((item, i) => setVisible(item, i < shown, STYLES.item.display));
      container.dataset.recentCommunitiesShown = shown;
      setVisible(more, shown < items.length, STYLES.more.display);
    };

    list.replaceChildren(...items);
    update();

    if (more) {
      more.onclick = () => {
        const firstNew = items[shown];
        shown += limit;
        update();
        firstNew?.querySelector('a')?.focus();
      };
    }

    if (focusPinOf) list.querySelector(`[data-guid="${focusPinOf}"] [data-pin]`)?.focus();

    // Beheerders en redacteuren zien het blok altijd, ook als het leeg is,
    // zodat het in de bewerkmodus niet verdwijnt.
    const hideEmpty = 'recentCommunitiesHideEmpty' in container.dataset;
    const canEdit = isAdmin || Boolean(document.querySelector('[aria-label^="Bewerkmodus"]'));
    const isEmpty = groups.length === 0;
    setVisible(empty, isEmpty, 'block');
    if (hideEmpty) {
      setVisible(editorNote(container), isEmpty && canEdit, 'block');
      setVisible(container, !isEmpty || canEdit, 'block');
    }
    log(`${groups.length} communities, ${Math.min(shown, groups.length)} zichtbaar`);
  };

  // React kan het blok opnieuw opbouwen (ook na terugnavigeren naar home),
  // dus elke nieuwe container die verschijnt wordt gevuld.
  const scan = () => {
    document
      .querySelectorAll('[data-recent-communities]:not([data-recent-communities-ready])')
      .forEach((container) => render(container));
  };

  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
})();
