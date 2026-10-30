(() => {
  const openers = new WeakMap();

  // Bouwt de header: titel (uit data-modal-title) links, sluitknop rechts.
  // Opbouw: .modal__header > .modal__title + .modal__close
  const addHeader = (dialog, index) => {
    let header = dialog.querySelector(':scope > .modal__header');
    const created = !header;

    if (!header) {
      header = document.createElement('div');
      header.className = 'modal__header';
    }

    // Titel: <h2> als eerste in de header, en als naam van de dialog
    const text = dialog.dataset.modalTitle;
    if (text && !header.querySelector('.modal__title')) {
      const id = `${dialog.id || `modal-${index}`}-title`;
      const h2 = document.createElement('h2');
      h2.className = 'modal__title';
      h2.id = id;
      h2.textContent = text;
      header.prepend(h2);

      if (!dialog.hasAttribute('aria-labelledby')) {
        dialog.setAttribute('aria-labelledby', id);
      }
    }

    // Sluitknop: laatste in de header
    if (!header.querySelector('.modal__close')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'modal__close';
      btn.setAttribute('data-modal-close', '');
      btn.setAttribute('aria-label', dialog.dataset.modalCloseLabel || 'Sluiten');

      const icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '\u00d7'; // ×

      btn.append(icon);
      header.append(btn);
    }

    if (created) dialog.prepend(header);
  };

  // Laadt iframes met data-src bij openen, en leegt ze bij sluiten (stopt ook video/audio)
  const setEmbeds = (dialog, active) => {
    dialog.querySelectorAll('iframe[data-src]').forEach((frame) => {
      frame.src = active ? frame.dataset.src : 'about:blank';
    });
  };

const open = (dialog, opener = null) => {
  if (dialog.open) return;
  openers.set(dialog, opener);
  setEmbeds(dialog, true);

  // NIEUW: H3 automatisch programmatisch focusbaar maken
  const heading = dialog.querySelector('.modal__body h3');

  if (heading && !heading.hasAttribute('tabindex')) {
    heading.setAttribute('tabindex', '-1');
  }

  dialog.showModal();

  // NIEUW: initiële focus op de H3
  heading?.focus();
};

  // Dialogs voorbereiden: header, close-event en sluitknoppen koppelen
  document.querySelectorAll('dialog[data-modal]').forEach((dialog, index) => {
    addHeader(dialog, index);

    // Het close-event vuurt ook bij Escape af
    dialog.addEventListener('close', () => {
      setEmbeds(dialog, false);
      openers.get(dialog)?.focus(); // focus terug naar de openknop (indien aanwezig)
    });

    dialog.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => dialog.close());
    });
  });

  // Handmatig openen via een knop
  document.querySelectorAll('[data-modal-open]').forEach((trigger) => {
    const dialog = document.getElementById(trigger.dataset.modalOpen);
    if (dialog) trigger.addEventListener('click', () => open(dialog, trigger));
  });

 // Automatisch openen: standaard één keer per bezoeker,
// met data-modal-always bij elk paginabezoek
document.querySelectorAll('dialog[data-modal][data-modal-auto]').forEach((dialog) => {
  if (!dialog.hasAttribute('data-modal-always')) {
    const key = `modal-seen:${dialog.dataset.modalAuto || dialog.id}`;
    try {
      if (localStorage.getItem(key)) {
        console.log(`modal auto: niet geopend, al gezien (${key})`);
        return;
      }
      localStorage.setItem(key, '1');
    } catch {
      console.log('modal auto: niet geopend, localStorage niet beschikbaar');
      return;
    }
  }

  open(dialog);
  console.log(`modal auto: geopend (${dialog.id})`);
});

  console.log(
    'modal ready',
    document.querySelectorAll('dialog[data-modal]').length, 'dialog(s),',
    document.querySelectorAll('[data-modal-open]').length, 'knop(pen)'
  );
})();
