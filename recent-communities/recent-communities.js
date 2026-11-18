/*!
 * Recent Communities v2.12.1
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
 *
 *   WEERGAVE
 *   data-recent-communities-variant="detailed"  Figma-ontwerp (ledenaantal,
 *                                       status-iconen, knop). Weglaten of
 *                                       "default" = eenvoudige lijst
 *   data-recent-communities-hide-status  slotje en oogje niet tonen
 *   data-recent-communities-limit="3"   aantal per keer + knop "Laad meer", die
 *                                       er telkens evenveel bij laadt; de knop
 *                                       komt er vanzelf bij (weglaten = alles)
 *   data-recent-communities-more-label="Toon meer"  tekst van die knop
 *   data-recent-communities-max-height="448"  maximale hoogte (px of CSS-lengte
 *                                       zoals "60vh"); de lijst scrolt
 *   data-recent-communities-height="fixed"  kaart altijd op max-height, ook bij
 *                                       een korte lijst ("auto" = meegroeien)
 *   data-recent-communities-overflow="fade"  onderkant vervaagt zoals in Figma;
 *                                       "hard" (standaard) = strakke rand
 *   data-recent-communities-fallback="memberships"  nog niets bezocht? Dan de
 *                                       communities tonen waar je lid van bent
 *   data-recent-communities-fallback-title="Jouw communities"  kop die dan
 *                                       getoond wordt (weglaten = kop blijft)
 *   data-recent-communities-cleared-label="…"  melding als de laatste community
 *                                       is weggeklikt (daarna verdwijnt het blok)
 *   data-recent-communities-hide-empty  blok verbergen als de lijst leeg is
 *                                       (geen `hidden` erbij: dan is het blok in
 *                                       de editor onbereikbaar)
 *
 *   KNOP PER COMMUNITY (alleen bij variant="detailed")
 *   1. Opslag  data-recent-communities-storage
 *        "local" (standaard)  alleen in deze browser
 *        "favorite"           als Pleio-favoriet: per account op de server,
 *                             op elk apparaat gelijk (alleen bij communities
 *                             waar je lid van bent)
 *   2. Gedrag  data-recent-communities-action
 *        "remove"  uit deze lijst halen   (standaard bij storage="local")
 *        "pin"     vastzetten             (standaard bij storage="favorite")
 *        "none"    geen knop
 *      data-recent-communities-pin-mode  (alleen bij action="pin")
 *        "top" (standaard)  vastgezette communities staan bovenaan
 *        "keep"             volgorde van bezoek, maar vallen nooit uit de lijst
 *   3. Icoon   data-recent-communities-icon
 *        "x"     kruisje    (standaard bij action="remove")
 *        "star"  ster       (standaard bij action="pin" + storage="favorite")
 *        "pin"   speldje    (standaard bij action="pin" + storage="local")
 *
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
  const FADE_HEIGHT = 44; // px, hoogte van het verloop (uit Figma)
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

  const STYLES_DETAILED = {
    // position + z-index 0: boven de absolute leader-afbeelding in dezelfde kolom,
    // maar onder elementen in blokken met z-index 1 (zoals de knop "Hulp nodig?").
    container: { position: 'relative', zIndex: '0', background: COLOR.card, borderRadius: '4px', overflow: 'hidden' },
    title: { margin: '0', padding: '16px', color: COLOR.title, fontSize: '18px', lineHeight: '1', fontWeight: '700' },
    // Compacter dan Figma (14 / 16 / 8 px): items stonden live te ver uit elkaar.
    list: { listStyle: 'none', margin: '4px 0 0', padding: '0', display: 'grid', gap: '0' },
    item: { display: 'flex', alignItems: 'flex-start', padding: '12px 20px' },
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
    content: { flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '4px' },
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
    cleared: { margin: '0', padding: '12px 16px 16px', color: COLOR.meta, fontSize: '14px', lineHeight: '20px' },
  };

  // Eenvoudige lijst (de oorspronkelijke opmaak).
  const STYLES_DEFAULT = {
    container: { position: 'relative', zIndex: '0', background: COLOR.card, borderRadius: '8px', padding: '32px' },
    title: { margin: '0 0 24px' },
    list: { listStyle: 'none', margin: '0', padding: '0', display: 'grid', gap: '12px' },
    item: { display: 'block' },
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
    more: { ...STYLES_DETAILED.more, margin: '16px auto 0' },
    empty: { margin: '0' },
    cleared: { margin: '0', color: COLOR.meta, fontSize: '14px', lineHeight: '20px' },
  };

  const STYLES = { default: STYLES_DEFAULT, detailed: STYLES_DETAILED };

  // pinOff, lock en eyeOff uit het Figma-ontwerp; ster en kruisje van Pleio; pin en pinned uit Lucide.
  const ICONS = {
    pinOff: {
      width: 24, height: 24,
      body: '<path fill="currentColor" d="M3.707 2.293C3.317 1.902 2.683 1.902 2.293 2.293C1.902 2.683 1.902 3.317 2.293 3.707L3 3L3.707 2.293M20.293 21.707C20.683 22.098 21.317 22.098 21.707 21.707C22.098 21.317 22.098 20.683 21.707 20.293L21 21L20.293 21.707M15.707 5.207C16.098 4.817 16.098 4.183 15.707 3.793C15.317 3.402 14.683 3.402 14.293 3.793L15 4.5L15.707 5.207M11.044 7.042C10.653 7.432 10.653 8.066 11.044 8.456C11.434 8.847 12.068 8.847 12.458 8.456L11.751 7.749L11.044 7.042M9.532 10.118C10.049 9.924 10.311 9.348 10.117 8.831C9.923 8.314 9.347 8.052 8.83 8.246L9.181 9.182L9.532 10.118M7 10L6.649 9.064C6.515 9.114 6.394 9.192 6.293 9.293L7 10M5.5 11.5L4.793 10.793C4.402 11.183 4.402 11.817 4.793 12.207L5.5 11.5M12.5 18.5L11.793 19.207C12.183 19.598 12.817 19.598 13.207 19.207L12.5 18.5M14 17L14.707 17.707C14.808 17.606 14.886 17.485 14.936 17.351L14 17M15.756 15.165C15.95 14.648 15.688 14.072 15.171 13.878C14.654 13.684 14.078 13.946 13.884 14.463L14.82 14.814L15.756 15.165M15.543 11.544C15.152 11.935 15.152 12.568 15.543 12.958C15.934 13.349 16.567 13.349 16.957 12.958L16.25 12.251L15.543 11.544M20.207 9.707C20.598 9.316 20.598 8.683 20.207 8.293C19.816 7.902 19.183 7.902 18.793 8.293L19.5 9L20.207 9.707M9.707 15.707C10.098 15.317 10.098 14.683 9.707 14.293C9.317 13.902 8.683 13.902 8.293 14.293L9 15L9.707 15.707M3.793 18.793C3.402 19.183 3.402 19.817 3.793 20.207C4.183 20.598 4.817 20.598 5.207 20.207L4.5 19.5L3.793 18.793M15.207 3.293C14.817 2.902 14.183 2.902 13.793 3.293C13.402 3.683 13.402 4.317 13.793 4.707L14.5 4L15.207 3.293M19.293 10.207C19.683 10.598 20.317 10.598 20.707 10.207C21.098 9.817 21.098 9.183 20.707 8.793L20 9.5L19.293 10.207M3 3L2.293 3.707L20.293 21.707L21 21L21.707 20.293L3.707 2.293L3 3M15 4.5L14.293 3.793L11.044 7.042L11.751 7.749L12.458 8.456L15.707 5.207L15 4.5M9.181 9.182L8.83 8.246L6.649 9.064L7 10L7.351 10.936L9.532 10.118L9.181 9.182M7 10L6.293 9.293L4.793 10.793L5.5 11.5L6.207 12.207L7.707 10.707L7 10M5.5 11.5L4.793 12.207L11.793 19.207L12.5 18.5L13.207 17.793L6.207 10.793L5.5 11.5M12.5 18.5L13.207 19.207L14.707 17.707L14 17L13.293 16.293L11.793 17.793L12.5 18.5M14 17L14.936 17.351L15.756 15.165L14.82 14.814L13.884 14.463L13.064 16.649L14 17M16.25 12.251L16.957 12.958L20.207 9.707L19.5 9L18.793 8.293L15.543 11.544L16.25 12.251M9 15L8.293 14.293L3.793 18.793L4.5 19.5L5.207 20.207L9.707 15.707L9 15M14.5 4L13.793 4.707L19.293 10.207L20 9.5L20.707 8.793L15.207 3.293L14.5 4"/>',
    },
    // Niet vastgepind: open speldje. Vastgepind: gevuld speldje.
    pin: {
      width: 24, height: 24,
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></g>',
    },
    pinned: {
      width: 24, height: 24,
      body: '<g fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></g>',
    },
    // Ster: hetzelfde icoon als de favorietenknop van Pleio zelf.
    star: {
      width: 22, height: 22,
      body: '<path fill="currentColor" d="M11.39 2.08a1 1 0 0 1 .531.531l1.788 4.231a1 1 0 0 0 .835.607l4.616.4a1 1 0 0 1 .569 1.753l-3.49 3.026a1 1 0 0 0-.32.98l1.04 4.498a1 1 0 0 1-1.49 1.082l-3.952-2.385a1 1 0 0 0-1.034 0l-3.952 2.385a1 1 0 0 1-1.49-1.082l1.04-4.497a1 1 0 0 0-.32-.981l-3.49-3.026A1 1 0 0 1 2.84 7.85l4.616-.4a1 1 0 0 0 .835-.608l1.788-4.231a1 1 0 0 1 1.31-.532M11 5.311l-.184.429L9.338 9.18l-3.718.331-.467.042.353.308 2.827 2.47-.84 3.643-.106.46.404-.244L11 14.255l3.209 1.96.405.248-.106-.463-.841-3.668 2.827-2.444.357-.309-.47-.042-3.72-.331-1.476-3.464z"/>',
    },
    starFilled: {
      width: 22, height: 22,
      body: '<path fill="currentColor" d="m11.004 2.77.916 2.15.184.43 1.241 2.913 3.124.278.47.042 2.35.21-1.785 1.542-.357.31-2.373 2.049.708 3.083.636 2.778-2.026-1.238-.406-.248-2.692-1.644-2.686 1.621-.405.244-2.021 1.22.53-2.301.107-.46.704-3.06-2.375-2.075-.353-.308-1.763-1.542 2.333-.208.466-.041 3.123-.278 1.243-2.89.185-.43z"/><path fill="currentColor" d="M11.39 2.08a1 1 0 0 1 .531.531l1.788 4.231a1 1 0 0 0 .835.607l4.616.4a1 1 0 0 1 .569 1.753l-3.49 3.026a1 1 0 0 0-.32.98l1.04 4.498a1 1 0 0 1-1.49 1.082l-3.952-2.385a1 1 0 0 0-1.034 0l-3.952 2.385a1 1 0 0 1-1.49-1.082l1.04-4.497a1 1 0 0 0-.32-.981l-3.49-3.026A1 1 0 0 1 2.84 7.85l4.616-.4a1 1 0 0 0 .835-.608l1.788-4.231a1 1 0 0 1 1.31-.532"/>',
    },
    // Kruisje: hetzelfde icoon als de sluitknoppen van Pleio zelf.
    remove: {
      width: 12, height: 12, viewBox: '0 0 10 10',
      body: '<path fill="currentColor" d="M8.535.05 9.95 1.464 6.414 5l3.535 3.535L8.535 9.95 5 6.414 1.464 9.949.05 8.535 3.586 5 .05 1.464 1.464.05 5 3.586z"/>',
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
  // Elke account heeft een eigen lijst (sleutel = hash van het account), dus een
  // andere gebruiker op hetzelfde apparaat ziet nooit iemand anders' communities.

  const user = document.body?.dataset.authenticatedUser;
  if (!user) {
    // Niet ingelogd: het blok nooit tonen, ook niet als het later verschijnt.
    const hideAll = () => document
      .querySelectorAll('[data-recent-communities]')
      .forEach((block) => setVisible(block, false, 'block'));
    new MutationObserver(hideAll).observe(document.body, { childList: true, subtree: true });
    hideAll();
    log('niet ingelogd, blok verborgen');
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
    // Vastgepinde communities vallen nooit af; de rest tot MAX_ITEMS.
    const pinned = read(PINNED_KEY);
    let unpinned = 0;
    const list = [guid, ...read(RECENT_KEY).filter((g) => g !== guid)].filter(
      (g) => pinned.includes(g) || ++unpinned <= MAX_ITEMS,
    );
    write(RECENT_KEY, list);
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

  // GraphQL-aanroep zoals Pleio die zelf doet (CSRF-cookie als header mee).
  const gql = async (query, variables) => {
    const token = document.cookie.match(/(?:^|;\s*)CSRF_TOKEN=([^;]+)/)?.[1];
    const response = await fetch('/graphql', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(token && { 'X-CSRF-Token': token }) },
      body: JSON.stringify({ query, variables }),
    });
    const result = await response.json();
    // Losse fouten (bijv. één community zonder toegang) mogen; zonder data niet.
    if (!result.data) throw new Error(result.errors?.map((e) => e.message).join(' / ') || 'Geen data');
    if (result.errors?.length) log('GraphQL-meldingen', result.errors);
    return result.data;
  };

  const GROUP_FIELDS = 'guid name url memberCount isMembershipOnRequest isClosed membership isFavorite icon { download }';

  const fetchData = async (guids, { withFavorites = false } = {}) => {
    // Eén query: per community een alias (geen toegang geeft null) en
    // eventueel de Pleio-favorieten van de gebruiker.
    const fields = guids
      .map((g, i) => `g${i}: entity(guid: "${g}") { guid ... on Group { ${GROUP_FIELDS} } }`)
      .join('\n');
    const favorites = withFavorites
      ? `favorites: groups(isFavorite: true, offset: 0, limit: 50) { edges { ${GROUP_FIELDS} } }`
      : '';

    // Niets te vragen (geen bezoeken, geen favorieten): geen lege query sturen.
    if (!fields && !favorites) return { groups: [], favorites: [] };

    const data = await gql(`query RecentCommunities {\n${favorites}\n${fields}\n}`);

    return {
      groups: guids.map((_, i) => data?.[`g${i}`]).filter((group) => group?.name),
      favorites: (data?.favorites?.edges || []).filter((group) => group?.name),
    };
  };

  // Communities waar de gebruiker lid van is (zelfde vraag als Pleio zelf stelt).
  const fetchMemberships = async () => {
    const viewer = await gql('query RecentCommunitiesViewer { viewer { guid user { guid } } }');
    const userGuid = viewer?.viewer?.user?.guid;
    if (!userGuid) return [];
    const data = await gql(
      `query RecentCommunitiesMemberships($userGuid: String) { groups(userGuid: $userGuid, offset: 0, limit: ${MAX_ITEMS}) { edges { ${GROUP_FIELDS} } } }`,
      { userGuid },
    );
    return (data?.groups?.edges || []).filter((group) => group?.name && group.membership === 'joined');
  };

  const setFavorite = async (groupGuid, favorite) => {
    const data = await gql(
      'mutation UpdateMembershipFavorite($input: UpdateMembershipFavoriteInput!) { updateMembershipFavorite(input: $input) { success } }',
      { input: { groupGuid, favorite } },
    );
    if (!data?.updateMembershipFavorite?.success) throw new Error('Pleio gaf geen bevestiging');
  };

  const icon = (name, label) => {
    const { width, height, body, viewBox = `0 0 ${width} ${height}` } = ICONS[name];
    const span = document.createElement('span');
    span.style.display = 'block';
    span.style.lineHeight = '0';
    span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" focusable="false" ${
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

  const renderDefaultItem = (group) => {
    const S = STYLES_DEFAULT;
    const li = document.createElement('li');
    li.dataset.guid = group.guid;
    applyStyle(li, S.item);

    const a = document.createElement('a');
    a.href = group.url;
    applyStyle(a, S.link);

    const avatar = document.createElement('span');
    avatar.setAttribute('aria-hidden', 'true');
    applyStyle(avatar, S.avatar);
    if (group.icon?.download) {
      avatar.style.backgroundImage = `url("${group.icon.download.replace(/"/g, '%22')}?size=96")`;
    } else {
      avatar.textContent = group.name.trim().charAt(0).toUpperCase();
    }

    const name = document.createElement('span');
    name.textContent = group.name.trim();

    // :hover en :focus-visible kunnen niet inline, dus via events.
    const set = (on) => { name.style.textDecoration = on ? 'underline' : 'none'; };
    a.addEventListener('mouseenter', () => set(true));
    a.addEventListener('mouseleave', () => set(a.matches(':focus-visible')));
    a.addEventListener('focus', () => set(a.matches(':focus-visible')));
    a.addEventListener('blur', () => set(a.matches(':hover')));

    a.append(avatar, name);
    li.append(a);
    return li;
  };

  // Tooltip in de stijl van Pleio (zwart label onder het icoon), bij hover en focus.
  let tooltipEl = null;
  const showTooltip = (target, text) => {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.setAttribute('role', 'tooltip');
      tooltipEl.id = 'recent-communities-tooltip';
      applyStyle(tooltipEl, {
        position: 'fixed',
        zIndex: '10000',
        padding: '6px 10px',
        borderRadius: '6px',
        background: '#000',
        color: '#fff',
        fontSize: '14px',
        fontWeight: '700',
        lineHeight: '20px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      });
      document.body.append(tooltipEl);
    }
    tooltipEl.textContent = text;
    tooltipEl.hidden = false;
    const r = target.getBoundingClientRect();
    const w = tooltipEl.offsetWidth;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${r.bottom + 8}px`;
  };
  const hideTooltip = () => { if (tooltipEl) tooltipEl.hidden = true; };
  window.addEventListener('scroll', hideTooltip, { passive: true, capture: true });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTooltip(); });

  const withTooltip = (el, text) => {
    el.addEventListener('mouseenter', () => showTooltip(el, text));
    el.addEventListener('mouseleave', hideTooltip);
    el.addEventListener('focus', () => showTooltip(el, text));
    el.addEventListener('blur', hideTooltip);
    el.addEventListener('click', hideTooltip);
  };

  const renderDetailedItem = (group, { action, iconStyle, isPinned, onAction, showStatus }) => {
    const groupName = group.name.trim();

    const li = document.createElement('li');
    li.dataset.guid = group.guid;
    applyStyle(li, STYLES_DETAILED.item);

    const avatarWrap = document.createElement('span');
    applyStyle(avatarWrap, STYLES_DETAILED.avatarWrap);
    const avatar = document.createElement('span');
    avatar.setAttribute('aria-hidden', 'true');
    applyStyle(avatar, STYLES_DETAILED.avatar);
    if (group.icon?.download) {
      avatar.style.backgroundImage = `url("${group.icon.download.replace(/"/g, '%22')}?size=80")`;
    } else {
      avatar.textContent = groupName.charAt(0).toUpperCase();
    }
    avatarWrap.append(avatar);

    const name = document.createElement('a');
    name.href = group.url;
    name.textContent = groupName;
    applyStyle(name, STYLES_DETAILED.name);
    underlineOnInteraction(name);

    const header = document.createElement('div');
    applyStyle(header, STYLES_DETAILED.header);
    header.append(name);

    if (action === 'pin' || action === 'remove') {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = '';
      applyStyle(button, { ...STYLES_DETAILED.iconBox, cursor: 'pointer' });

      // Per icoon: [normaal, actief, hover bij actief] en de tooltip-teksten.
      const ICON_STATES = {
        star: ['star', 'starFilled', 'starFilled'],
        pin: ['pin', 'pinned', 'pinOff'],
        x: ['remove', 'remove', 'remove'],
      };
      const PIN_LABELS = {
        star: ['Toevoegen aan favorieten', 'Verwijderen uit favorieten'],
        pin: ['Vastpinnen', 'Losmaken'],
        x: ['Vastzetten', 'Losmaken'],
      };
      const [normal, active, activeHover] = ICON_STATES[iconStyle];

      if (action === 'pin') {
        const label = PIN_LABELS[iconStyle][isPinned ? 1 : 0];
        button.setAttribute('aria-pressed', String(isPinned));
        button.setAttribute('aria-label', `${groupName}: ${PIN_LABELS[iconStyle][0].toLowerCase()}`);
        button.append(icon(isPinned ? active : normal));
        if (isPinned) {
          button.style.color = COLOR.title;
          if (activeHover !== active) {
            // Bij hover/focus het "losmaken"-icoon, zodat duidelijk is wat een klik doet.
            const swap = (name) => () => button.replaceChildren(icon(name));
            button.addEventListener('mouseenter', swap(activeHover));
            button.addEventListener('focus', swap(activeHover));
            button.addEventListener('mouseleave', swap(active));
            button.addEventListener('blur', swap(active));
          }
        }
        withTooltip(button, label);
      } else {
        button.setAttribute('aria-label', `${groupName} uit deze lijst halen`);
        button.append(icon(normal));
        withTooltip(button, 'Uit deze lijst halen');
      }
      button.addEventListener('click', () => onAction(group.guid));
      header.append(button);
    }

    const meta = document.createElement('span');
    meta.textContent = `${group.memberCount} ${group.memberCount === 1 ? 'lid' : 'leden'}`;
    applyStyle(meta, STYLES_DETAILED.meta);

    const status = document.createElement('span');
    applyStyle(status, STYLES_DETAILED.status);
    // Zelfde iconen en teksten als op de communities-pagina van Pleio.
    const statusIcons = [
      [group.isMembershipOnRequest, 'lock', 'Lid na goedkeuring'],
      [group.isClosed, 'eyeOff', 'Content alleen zichtbaar voor leden'],
    ];
    for (const [show, iconName, label] of showStatus ? statusIcons : []) {
      if (!show) continue;
      const box = document.createElement('span');
      box.tabIndex = 0;
      box.dataset.status = '';
      applyStyle(box, STYLES_DETAILED.iconBox);
      box.append(icon(iconName, label));
      withTooltip(box, label);
      status.append(box);
    }

    const info = document.createElement('div');
    applyStyle(info, STYLES_DETAILED.info);
    info.append(meta, status);

    const content = document.createElement('div');
    applyStyle(content, STYLES_DETAILED.content);
    content.append(header, info);

    li.append(avatarWrap, content);

    // Hele item klikbaar (behalve het speldje); de naam blijft de echte link,
    // zodat toetsenbord en schermlezers één duidelijke link per community hebben.
    li.style.cursor = 'pointer';
    li.addEventListener('click', (event) => {
      // Knoppen, links en de status-iconen (tooltip) openen de community niet.
      if (event.target.closest('a, button, [data-status]')) return;
      if (event.metaKey || event.ctrlKey) window.open(name.href, '_blank');
      else name.click();
    });
    li.addEventListener('mouseenter', () => { name.style.textDecoration = 'underline'; });
    li.addEventListener('mouseleave', () => {
      if (!name.matches(':focus-visible')) name.style.textDecoration = 'none';
    });
    return li;
  };

  // Maximale hoogte: titel en knop blijven staan, de lijst scrolt.
  // Bij "fade" vervaagt de onderkant van de kaart, tot je onderaan bent.
  const fadeUpdaters = new WeakMap();
  const setupOverflow = (container, list, more) => {
    const maxHeight = container.dataset.recentCommunitiesMaxHeight;
    if (!maxHeight) return () => {};

    const size = /^\d+(\.\d+)?$/.test(maxHeight) ? `${maxHeight}px` : maxHeight;
    applyStyle(container, {
      display: 'flex',
      flexDirection: 'column',
      maxHeight: size,
      // "fixed": de kaart is altijd zo hoog, ook als de lijst korter is.
      height: container.dataset.recentCommunitiesHeight === 'fixed' ? size : '',
    });
    applyStyle(container.querySelector('h2, h3'), { flex: 'none' });
    applyStyle(more, { flex: 'none' });
    applyStyle(list, { flex: '1 1 auto', minHeight: '0', overflowY: 'auto', overscrollBehavior: 'contain' });

    if (container.dataset.recentCommunitiesOverflow !== 'fade') return () => {};
    if (fadeUpdaters.has(container)) return fadeUpdaters.get(container);

    const setMask = (el, mask) => {
      el.style.maskImage = mask;
      el.style.webkitMaskImage = mask;
    };
    const updateFade = () => {
      const atEnd = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
      const mask = atEnd ? 'none' : `linear-gradient(to bottom, #000 calc(100% - ${FADE_HEIGHT}px), transparent)`;
      // Staat de knop "Laad meer" er, dan vervaagt alleen de lijst (naar wit),
      // zodat de knop leesbaar blijft. Anders vervaagt de hele kaart in de hero.
      const buttonVisible = more && more.isConnected && !more.hidden;
      setMask(buttonVisible ? list : container, mask);
      setMask(buttonVisible ? container : list, 'none');
    };
    list.addEventListener('scroll', updateFade, { passive: true });
    new ResizeObserver(updateFade).observe(list);
    fadeUpdaters.set(container, updateFade);
    return updateFade;
  };

  // Melding nadat iemand de laatste community uit de lijst heeft gehaald.
  const CLEARED_TIME = 5000; // ms zichtbaar voordat het blok verdwijnt
  const showCleared = (container, list, S, { hide, display }) => {
    const message = document.createElement('p');
    message.dataset.recentCommunitiesCleared = '';
    message.setAttribute('role', 'status');
    message.tabIndex = -1;
    message.textContent = container.dataset.recentCommunitiesClearedLabel
      || 'Je hebt alle recente communities uit de lijst gehaald. Dit blok komt terug zodra je weer een community bezoekt.';
    applyStyle(message, { ...S.cleared, outline: 'none' }); // focusdoel, geen knop
    list.replaceChildren();
    list.style.display = 'none'; // melding direct onder de titel
    list.after(message);
    setVisible(container, true, display);
    message.focus(); // de knop is weg; focus naar de melding
    if (!hide) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const fadeTime = reduceMotion ? 0 : 400;
    setTimeout(() => {
      // Intussen weer iets bezocht en opnieuw gevuld? Dan niet verbergen.
      if (!message.isConnected || list.children.length) return;
      container.style.transition = `opacity ${fadeTime}ms ease`;
      container.style.opacity = '0';
      setTimeout(() => {
        setVisible(container, false, display);
        container.style.transition = '';
        container.style.opacity = '';
        message.remove();
      }, fadeTime);
    }, CLEARED_TIME);
  };

  const render = async (container, { focusAction, cleared = false } = {}) => {
    container.dataset.recentCommunitiesReady = '';
    container.querySelector('[data-recent-communities-cleared]')?.remove();
    const listEl = container.querySelector('[data-recent-communities-list]');
    if (listEl?.style.display === 'none') listEl.style.display = '';
    const list = container.querySelector('[data-recent-communities-list]') || container;
    const empty = container.querySelector('[data-recent-communities-empty]');
    const limit = Number(container.dataset.recentCommunitiesLimit) || Infinity;

    // Met een limiet maakt het script zelf de knop "Laad meer" aan, tenzij die
    // al in de HTML staat. Tekst aanpasbaar met data-recent-communities-more-label.
    let more = container.querySelector('[data-recent-communities-more]');
    if (!more && limit !== Infinity) {
      more = document.createElement('button');
      more.type = 'button';
      more.dataset.recentCommunitiesMore = '';
      more.hidden = true;
      more.textContent = container.dataset.recentCommunitiesMoreLabel || 'Laad meer';
      list.after(more);
    }
    const variant = container.dataset.recentCommunitiesVariant === 'detailed' ? 'detailed' : 'default';
    const S = STYLES[variant];

    applyStyle(container, S.container);
    applyStyle(container.querySelector('h2, h3'), S.title);
    applyStyle(list, S.list);
    applyStyle(more, S.more);
    applyStyle(empty, S.empty);
    const updateFade = setupOverflow(container, list, more);
    const containerDisplay = container.dataset.recentCommunitiesMaxHeight ? 'flex' : 'block';

    // Vastpinnen bestaat alleen in de uitgebreide variant.
    // Knop: opslag -> gedrag -> icoon, elk met een logische standaard.
    const ds = container.dataset;
    const storage = (ds.recentCommunitiesStorage || ds.recentCommunitiesPinStorage || '').startsWith('favorite')
      ? 'favorite'
      : 'local';
    const action = variant !== 'detailed'
      ? 'none'
      : ['pin', 'remove', 'none'].includes(ds.recentCommunitiesAction)
        ? ds.recentCommunitiesAction
        : storage === 'favorite' ? 'pin' : 'remove';
    const iconStyle = ['star', 'pin', 'x'].includes(ds.recentCommunitiesIcon)
      ? ds.recentCommunitiesIcon
      : action === 'remove' ? 'x' : storage === 'favorite' ? 'star' : 'pin';
    const showStatus = !('recentCommunitiesHideStatus' in container.dataset);
    // Vastgepinde communities staan alleen bovenaan als vastpinnen aan staat.
    const pinMode = container.dataset.recentCommunitiesPinMode === 'keep' ? 'keep' : 'top';
    const useFavorites = action === 'pin' && storage === 'favorite';
    const recent = read(RECENT_KEY);
    let guids = recent;
    if (action === 'pin' && !useFavorites && pinMode === 'top') guids = orderedGuids();
    if (action === 'pin' && !useFavorites && pinMode === 'keep') {
      guids = [...recent, ...read(PINNED_KEY).filter((g) => !recent.includes(g))];
    }
    const hideEmpty = 'recentCommunitiesHideEmpty' in container.dataset;

    // Zonder opgeslagen bezoeken weten we nu al dat de lijst leeg is: meteen
    // verbergen, zodat er geen leeg blok knippert. Het blok staat dus níet op
    // `hidden` in de HTML, zodat het in de editor (waar dit script niet draait)
    // gewoon zichtbaar en bereikbaar blijft. Op de site zelf is het leeg blok
    // voor iedereen verborgen, ook voor beheerders.
    // (Met favorieten kan de lijst ook zonder bezoeken gevuld zijn.)
    const fallback = ds.recentCommunitiesFallback === 'memberships';
    if (hideEmpty && guids.length === 0 && !useFavorites && !fallback && !cleared) {
      setVisible(container, false, containerDisplay);
    }
    let groups;
    let favorites;
    try {
      ({ groups, favorites } = await fetchData(guids, { withFavorites: useFavorites }));
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

    // Favorieten (van de server) samenvoegen met de recente bezoeken.
    if (useFavorites) {
      const favoriteGuids = favorites.map((g) => g.guid);
      const notFavorite = groups.filter((g) => !favoriteGuids.includes(g.guid));
      const recentGuids = groups.map((g) => g.guid);
      groups = pinMode === 'top'
        ? [...favorites, ...notFavorite]
        : [...groups, ...favorites.filter((g) => !recentGuids.includes(g.guid))];
    }

    // Nog niets bezocht: eventueel de communities tonen waar je lid van bent.
    let isFallback = false;
    if (groups.length === 0 && fallback) {
      try {
        groups = await fetchMemberships();
        isFallback = groups.length > 0;
      } catch (error) {
        console.warn('[recent-communities] lidmaatschappen ophalen mislukt', error);
      }
    }

    // Titel: bij de lidmaatschappen eventueel een andere kop.
    const titleEl = container.querySelector('h2, h3');
    if (titleEl) {
      titleEl.dataset.recentCommunitiesTitle ??= titleEl.textContent;
      titleEl.textContent = isFallback && ds.recentCommunitiesFallbackTitle
        ? ds.recentCommunitiesFallbackTitle
        : titleEl.dataset.recentCommunitiesTitle;
    }

    const pinned = useFavorites ? groups.filter((g) => g.isFavorite).map((g) => g.guid) : read(PINNED_KEY);
    const onAction = async (guid) => {
      const index = groups.findIndex((g) => g.guid === guid);
      if (action === 'pin' && useFavorites) {
        try {
          await setFavorite(guid, !pinned.includes(guid));
        } catch (error) {
          console.warn('[recent-communities] favoriet opslaan mislukt', error);
        }
        render(container, { focusAction: { guid } });
      } else if (action === 'pin') {
        write(PINNED_KEY, pinned.includes(guid) ? pinned.filter((g) => g !== guid) : [...pinned, guid]);
        render(container, { focusAction: { guid } });
      } else {
        write(RECENT_KEY, read(RECENT_KEY).filter((g) => g !== guid));
        write(PINNED_KEY, pinned.filter((g) => g !== guid));
        render(container, { focusAction: { index }, cleared: groups.length === 1 });
      }
    };

    const items = groups.map((group) =>
      variant === 'detailed'
        ? renderDetailedItem(group, {
          // Pleio-favorieten bestaan alleen voor communities waar je lid van bent.
          // Uit de lijst halen kan niet bij lidmaatschappen (die zijn niet bezocht).
          action: (useFavorites && group.membership !== 'joined') || (isFallback && action === 'remove')
            ? 'none'
            : action,
          iconStyle,
          isPinned: pinned.includes(group.guid),
          onAction,
          showStatus,
        })
        : renderDefaultItem(group));

    // Bij opnieuw renderen evenveel tonen als de gebruiker al had opengeklapt.
    let shown = Math.max(limit, Number(container.dataset.recentCommunitiesShown) || 0);
    const update = () => {
      items.forEach((item, i) => setVisible(item, i < shown, S.item.display));
      container.dataset.recentCommunitiesShown = shown;
      setVisible(more, shown < items.length, S.more.display);
      updateFade();
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

    // Focus terugzetten na een klik op de knop (toetsenbord blijft op zijn plek).
    if (focusAction?.guid) {
      list.querySelector(`[data-guid="${focusAction.guid}"] [data-action]`)?.focus();
    } else if (focusAction && items.length) {
      const next = items[Math.min(focusAction.index, items.length - 1)];
      (next.querySelector('[data-action]') || next.querySelector('a'))?.focus();
    }

    const isEmpty = groups.length === 0;
    if (cleared && isEmpty) {
      showCleared(container, list, S, { hide: hideEmpty, display: containerDisplay });
      return;
    }
    setVisible(empty, isEmpty, 'block');
    if (hideEmpty) setVisible(container, !isEmpty, containerDisplay);
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
