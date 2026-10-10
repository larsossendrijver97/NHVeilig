(() => {
  const openers = new WeakMap();

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

  document.querySelectorAll('dialog[data-modal]').forEach((dialog) => {
    // Het close-event vuurt ook bij Escape af
    dialog.addEventListener('close', () => {
      setEmbeds(dialog, false);
      openers.get(dialog)?.focus(); // focus terug naar de openknop (indien aanwezig)
    });

    dialog.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => dialog.close());
    });
  });

  document.querySelectorAll('[data-modal-open]').forEach((trigger) => {
    const dialog = document.getElementById(trigger.dataset.modalOpen);
    if (dialog) trigger.addEventListener('click', () => open(dialog, trigger));
  });

  // Automatisch openen, één keer per bezoeker
  document.querySelectorAll('dialog[data-modal][data-modal-auto]').forEach((dialog) => {
    const key = `modal-seen:${dialog.dataset.modalAuto || dialog.id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch {
      return; // opslag geblokkeerd: liever niet tonen dan bij elk bezoek
    }
    open(dialog);
  });
  
  console.log('modal gereed');
})();
