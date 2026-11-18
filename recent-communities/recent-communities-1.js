/*!
 * Recent Communities v1.0.1 (eenvoudige variant)
 * © 2026 Lars Ossendrijver — https://larsossendrijver.com
 * Alle rechten voorbehouden. Gebruik, kopiëren of aanpassen alleen met
 * schriftelijke toestemming van de auteur.
 */

/**
 * Recent bezochte communities — voor Pleio-platforms
 *
 * 1. Tracker: onthoudt per ingelogde gebruiker welke community-pagina's
 *    (/groups/view/<guid>/...) hij bezoekt, in localStorage.
 * 2. Renderer: vult elk element met [data-recent-communities] met die lijst.
 *    Met [data-recent-communities-hide-empty] verdwijnt het blok als de lijst
 *    leeg is (zet er ook `hidden` op, dan knippert het niet tijdens het laden).
 *    Namen, iconen en links komen live uit de GraphQL-API, zodat ze actueel zijn
 *    en communities waar de gebruiker geen toegang meer toe heeft wegvallen.
 *
 * Alle styling zit in dit script (element.style), los van het platform.
 * Laad het script op elke pagina (bijv. in het footer-HTML-blok).
 */
(() => {
  'use strict';

  if (window.__recentCommunities) return; // niet dubbel initialiseren
  window.__recentCommunities = true;

  const STORAGE_PREFIX = 'recent-communities'; // per project aanpasbaar
  const MAX_ITEMS = 8;
  const DEBUG = true; // zet op false als het live staat
  const GROUP_PATH = /^\/groups\/view\/([0-9a-f-]{36})(?:\/|$)/i;

  const STYLES = {
    container: { background: '#fff', borderRadius: '8px', padding: '32px' },
    title: { margin: '0 0 24px' },
    list: { listStyle: 'none', margin: '0', padding: '0', display: 'grid', gap: '12px' },
    link: { display: 'flex', alignItems: 'center', gap: '16px', color: 'inherit', textDecoration: 'none' },
    avatar: {
      flex: 'none',
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      backgroundColor: '#f1f1f1',
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      display: 'grid',
      placeItems: 'center',
      fontWeight: '700',
    },
    empty: { margin: '0' },
  };

  const log = (...args) => DEBUG && console.log('[recent-communities]', ...args);
  const applyStyle = (el, style) => el && Object.assign(el.style, style);

  // --- Opslag (per gebruiker, zodat een gedeelde pc geen lijsten mengt) ---

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
  const STORAGE_KEY = `${STORAGE_PREFIX}:${hash(user)}`;

  const read = () => {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  };

  const write = (list) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // opslag vol of geblokkeerd: dan maar geen geschiedenis
    }
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
    write([guid, ...read().filter((g) => g !== guid)].slice(0, MAX_ITEMS));
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

  const fetchGroups = async (guids) => {
    // Eén query met een alias per community; geen toegang geeft null terug.
    const fields = guids
      .map((g, i) => `g${i}: entity(guid: "${g}") { guid ... on Group { name url icon { download } } }`)
      .join('\n');

    const response = await fetch('/graphql', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `query RecentCommunities {\n${fields}\n}` }),
    });
    const { data } = await response.json();

    return guids.map((_, i) => data?.[`g${i}`]).filter((group) => group?.name);
  };

  // :hover en :focus-visible kunnen niet inline, dus via events.
  const underlineOnInteraction = (link, name) => {
    const set = (on) => { name.style.textDecoration = on ? 'underline' : 'none'; };
    link.addEventListener('mouseenter', () => set(true));
    link.addEventListener('mouseleave', () => set(link.matches(':focus-visible')));
    link.addEventListener('focus', () => set(link.matches(':focus-visible')));
    link.addEventListener('blur', () => set(link.matches(':hover')));
  };

  const renderItem = (group) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = group.url;
    applyStyle(a, STYLES.link);

    const avatar = document.createElement('span');
    avatar.setAttribute('aria-hidden', 'true');
    applyStyle(avatar, STYLES.avatar);
    if (group.icon?.download) {
      avatar.style.backgroundImage = `url("${group.icon.download.replace(/"/g, '%22')}?size=96")`;
    } else {
      avatar.textContent = group.name.trim().charAt(0).toUpperCase();
    }

    const name = document.createElement('span');
    name.textContent = group.name.trim();

    underlineOnInteraction(a, name);
    a.append(avatar, name);
    li.append(a);
    return li;
  };

  const render = async (container) => {
    container.dataset.recentCommunitiesReady = '';
    const list = container.querySelector('[data-recent-communities-list]') || container;
    const empty = container.querySelector('[data-recent-communities-empty]');

    applyStyle(container, STYLES.container);
    applyStyle(container.querySelector('h2, h3'), STYLES.title);
    applyStyle(list, STYLES.list);
    applyStyle(empty, STYLES.empty);

    const guids = read();
    let groups = [];
    if (guids.length) {
      try {
        groups = await fetchGroups(guids);
      } catch (error) {
        console.warn('[recent-communities] ophalen mislukt', error);
      }
    }

    // Communities zonder toegang meteen uit de opslag halen.
    if (groups.length !== guids.length) write(groups.map((g) => g.guid));

    list.replaceChildren(...groups.map(renderItem));
    if (empty) empty.hidden = groups.length > 0;
    if ('recentCommunitiesHideEmpty' in container.dataset) container.hidden = groups.length === 0;
    log(`${groups.length} communities getoond`);
  };

  // React kan het blok opnieuw opbouwen (ook na terugnavigeren naar home),
  // dus elke nieuwe container die verschijnt wordt gevuld.
  const scan = () => {
    document
      .querySelectorAll('[data-recent-communities]:not([data-recent-communities-ready])')
      .forEach(render);
  };

  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
})();
