(() => {
  // Laadt iframes met data-src bij openen, en leegt ze bij sluiten (stopt ook video/audio)
  const setEmbeds = (dialog, active) => {
    dialog.querySelectorAll('iframe[data-src]').forEach((frame) => {
      frame.src = active ? frame.dataset.src : 'about:blank';
    });
  };

  document.querySelectorAll('[data-modal-open]').forEach((trigger) => {
    const dialog = document.getElementById(trigger.dataset.modalOpen);
    if (!dialog) return;

    trigger.addEventListener('click', () => {
      setEmbeds(dialog, true);
      dialog.showModal();
    });

    // Het close-event vuurt ook bij Escape af
    dialog.addEventListener('close', () => {
      setEmbeds(dialog, false);
      trigger.focus(); // focus terug naar de openknop
    });
  });

  document.querySelectorAll('dialog[data-modal]').forEach((dialog) => {
    dialog.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => dialog.close());
    });
  });
})();
