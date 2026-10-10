(() => {
  const openers = new WeakMap();

  // Voegt een sluitknop toe aan de dialog, tenzij die er al is
  const addCloseButton = (dialog) => {
    if (dialog.querySelector(':scope > .modal__close')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'modal__close';
    btn.setAttribute('data-modal-close', '');
    btn.setAttribute('aria-label', dialog.dataset.modalCloseLabel || 'Sluiten');

    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '\u00d7'; // ×

    btn.append(icon);
    dialog.prepend(btn);
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
    dialog.showModal();
  };

  // Dialogs voorbereiden: sluitknop, close-event en sluitknoppen koppelen
  document.querySelectorAll('dialog[data-modal]').forEach((dialog) => {
    addCloseButton(dialog);

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

  // Automatisch openen, één keer per bezoeker
  document.querySelectorAll('dialog[data-modal][data-modal-auto]').forEach((dialog) => {
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
    open(dialog);
    console.log(`modal auto: geopend (${dialog.id})`);
  });

  console.log(
    'modal ready',
    document.querySelectorAll('dialog[data-modal]').length, 'dialog(s),',
    document.querySelectorAll('[data-modal-open]').length, 'knop(pen)'
  );
})();
