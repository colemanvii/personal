/* Native forms are deliberately untouched. Shopify remains the commerce authority. */
(() => {
  if (customElements.get('cole-artwork')) return;

  class ColeArtwork extends HTMLElement {
    connectedCallback() {
      this.events?.abort();
      this.events = new AbortController();
      const options = { signal: this.events.signal };
      this.addEventListener('click', (event) => this.onClick(event), options);
      this.addEventListener('submit', (event) => {
        // Never submit the previous variant while a new server-rendered state loads.
        if (this.request && event.target.matches('.cc-gallery__form')) event.preventDefault();
      }, options);
      window.addEventListener('popstate', () => window.location.reload(), options);
      this.setupMedia();
    }

    disconnectedCallback() {
      this.events?.abort();
      this.request?.abort();
    }

    setupMedia() {
      this.plates = [...this.querySelectorAll('[data-media-id]')];
      const lead = this.querySelector('[data-lead]') || this.plates[0];
      if (lead) this.showImage(lead.dataset.mediaId);
      const nav = this.querySelector('[data-image-nav]');
      if (nav) nav.hidden = false;
      const dialog = this.querySelector('[data-dialog]');
      if (dialog) dialog.addEventListener('close', () => this.opener?.focus(), { signal: this.events.signal });
    }

    showImage(id) {
      this.plates.forEach((plate) => { plate.hidden = plate.dataset.mediaId !== id; });
      this.querySelectorAll('[data-show-image]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.showImage === id));
      });
    }

    onClick(event) {
      const imageButton = event.target.closest('[data-show-image]');
      if (imageButton) {
        this.showImage(imageButton.dataset.showImage);
        this.querySelector('[data-announcement]').textContent = imageButton.getAttribute('aria-label').replace('Show', 'Showing');
        return;
      }
      const link = event.target.closest('a');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.hasAttribute('data-enlarge')) {
        const dialog = this.querySelector('[data-dialog]');
        if (!dialog || typeof dialog.showModal !== 'function') return;
        event.preventDefault();
        this.opener = link;
        const source = link.querySelector('img');
        const image = dialog.querySelector('[data-dialog-image]');
        image.src = link.href;
        image.alt = source.alt;
        image.width = source.naturalWidth || source.width;
        image.height = source.naturalHeight || source.height;
        dialog.showModal();
      } else if (link.hasAttribute('data-option-link')) {
        const url = new URL(link.href);
        // Combined listings and external links retain normal document navigation.
        if (url.origin !== location.origin || url.pathname !== location.pathname) return;
        event.preventDefault();
        if (link.getAttribute('aria-current') === 'true' && !this.request) return;
        this.selectOption(url, link.dataset.optionId);
      }
    }

    async selectOption(url, optionId) {
      this.request?.abort();
      const request = new AbortController();
      this.request = request;
      // Preserve preview and market parameters, without carrying a stale variant ID.
      new URL(location.href).searchParams.forEach((value, key) => {
        if (!['variant', 'option_values', 'section_id', 'sections'].includes(key) && !url.searchParams.has(key)) url.searchParams.set(key, value);
      });
      const endpoint = new URL(url);
      endpoint.searchParams.set('section_id', this.dataset.sectionId);
      this.setAttribute('aria-busy', 'true');
      const buy = this.querySelector('.cc-gallery__buy');
      if (buy) buy.disabled = true;
      this.querySelector('[data-announcement]').textContent = 'Updating artwork options…';
      const timeout = setTimeout(() => request.abort(), 12000);
      try {
        const response = await fetch(endpoint, { signal: request.signal, credentials: 'same-origin' });
        if (!response.ok) throw new Error('Section unavailable');
        const document = new DOMParser().parseFromString(await response.text(), 'text/html');
        const next = document.getElementById(this.id);
        if (!next || !next.querySelector('[data-purchase]')) throw new Error('Missing product section');
        if (this.request !== request || !this.isConnected) return;
        // Replace only product content. Keep navigation, live region and root listeners.
        const product = this.querySelector('.cc-gallery__product');
        product.replaceWith(next.querySelector('.cc-gallery__product'));
        this.setupMedia();
        history.pushState({}, '', url);
        this.querySelector(`[data-option-id="${CSS.escape(optionId)}"]`)?.focus({ preventScroll: true });
        const price = this.querySelector('[data-price]').textContent.trim();
        const availability = this.querySelector('[data-availability]').textContent.trim();
        this.querySelector('[data-announcement]').textContent = `${price}. ${availability}.`;
      } catch (error) {
        // A failed enhancement always falls back to the real, usable product URL.
        if (this.request === request && this.isConnected) location.assign(url.href);
      } finally {
        clearTimeout(timeout);
        if (this.request === request) {
          this.request = null;
          this.removeAttribute('aria-busy');
        }
      }
    }
  }
  customElements.define('cole-artwork', ColeArtwork);
})();
