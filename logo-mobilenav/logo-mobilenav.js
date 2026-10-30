(() => {
  const addMobileLogo = () => {
    const header = document.querySelector('header');
    if (!header) return;

    const mobileNav = header.querySelector(
      '[class*="Navigation__Bar"] > [class*="Show__UntilDesktop"]'
    );

    const desktopLogo = header.querySelector(
      '[class*="Show__FromDesktop"] nav a[href="/"] img'
    );

    if (!mobileNav || !desktopLogo) return;
    if (mobileNav.querySelector('.nhv-mobile-logo')) return;

    const link = document.createElement('a');
    link.className = 'nhv-mobile-logo';
    link.href = '/';
    link.setAttribute('aria-label', 'NHVeilig - naar de homepage');

    const image = desktopLogo.cloneNode(true);
    image.alt = '';

    link.appendChild(image);
    mobileNav.prepend(link);
  };

  addMobileLogo();

  // Ondersteunt dynamische paginawisselingen in Pleio
  const observer = new MutationObserver(addMobileLogo);

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
