/* ============================================================
   global.js — Sleek Theme for Shopify
   Main JavaScript: Cart, Header, Slideshow, Product, etc.
   Vanilla JS — No dependencies.
   ============================================================ */

(function() {
  'use strict';

  /* ========================================================
     Utility Helpers
     ======================================================== */
  const utils = {
    /** Debounce function */
    debounce(fn, delay) {
      let timer;
      return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    /** Throttle function */
    throttle(fn, limit) {
      let inThrottle = false;
      return function(...args) {
        if (!inThrottle) {
          fn.apply(this, args);
          inThrottle = true;
          setTimeout(() => { inThrottle = false; }, limit);
        }
      };
    },

    /** Get Shopify section data */
    getSectionData(sectionId) {
      const element = document.getElementById(`shopify-section-${sectionId}`);
      if (!element) return {};
      try {
        return JSON.parse(element.querySelector('script[type="application/json"]')?.textContent || '{}');
      } catch {
        return {};
      }
    },

    /** AJAX fetch with timeout */
    async fetchJSON(url, options = {}) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    },

    /** Trap focus within element */
    trapFocus(element) {
      const focusableEls = element.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableEls[0];
      const lastFocusable = focusableEls[focusableEls.length - 1];
      const KEYCODE_TAB = 9;

      function handleKeyDown(e) {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }

      element.addEventListener('keydown', handleKeyDown);
      if (firstFocusable) firstFocusable.focus();
      return () => element.removeEventListener('keydown', handleKeyDown);
    },

    /** Get breakpoint status */
    get breakpoint() {
      return {
        isMobile: window.innerWidth < 750,
        isTablet: window.innerWidth >= 750 && window.innerWidth <= 990,
        isDesktop: window.innerWidth > 990
      };
    }
  };

  /* ========================================================
     Announcement Bar
     ======================================================== */
  const AnnouncementBar = {
    init() {
      this.closeBtn = document.querySelector('.announcement-bar__close');
      this.bar = document.querySelector('.announcement-bar');
      if (!this.closeBtn || !this.bar) return;

      // Check if user previously dismissed
      if (localStorage.getItem('sleek-announcement-hidden') === 'true') {
        this.bar.style.display = 'none';
        return;
      }

      this.closeBtn.addEventListener('click', () => this.close());
    },

    close() {
      this.bar.style.display = 'none';
      localStorage.setItem('sleek-announcement-hidden', 'true');
      // Dispatch event so header can re-calculate position
      document.dispatchEvent(new CustomEvent('announcement:closed'));
    }
  };

  /* ========================================================
     Header — Scroll Behavior
     ======================================================== */
  const Header = {
    init() {
      this.header = document.querySelector('.header');
      this.headerWrapper = document.querySelector('.header-wrapper');
      this.lastScrollY = window.scrollY;
      this.scrollThreshold = 200;
      this.isHidden = false;

      if (!this.header) return;

      // Handle sticky header hide/show on scroll
      if (!this.header.classList.contains('header--transparent')) {
        window.addEventListener('scroll', utils.throttle(() => this.handleScroll(), 100));
      }

      // Add shadow on scroll
      window.addEventListener('scroll', utils.throttle(() => this.toggleShadow(), 100));

      // Listen for announcement bar close
      document.addEventListener('announcement:closed', () => this.recalcPosition());

      // Initial recalc
      this.recalcPosition();
    },

    handleScroll() {
      const currentScrollY = window.scrollY;

      if (currentScrollY > this.scrollThreshold) {
        if (currentScrollY > this.lastScrollY && !this.isHidden) {
          // Scrolling down — hide header
          this.header.style.transform = 'translateY(-100%)';
          this.isHidden = true;
        } else if (currentScrollY < this.lastScrollY && this.isHidden) {
          // Scrolling up — show header
          this.header.style.transform = 'translateY(0)';
          this.isHidden = false;
        }
      } else {
        // Near top — always show
        this.header.style.transform = 'translateY(0)';
        this.isHidden = false;
      }

      this.lastScrollY = currentScrollY;
    },

    toggleShadow() {
      if (!this.header) return;
      if (window.scrollY > 10) {
        this.header.classList.add('header--shadow');
      } else {
        this.header.classList.remove('header--shadow');
      }
    },

    recalcPosition() {
      const annBar = document.querySelector('.announcement-bar');
      if (this.header) {
        const topOffset = annBar && annBar.style.display !== 'none' ? annBar.offsetHeight : 0;
        this.header.style.top = `${topOffset}px`;
      }
    }
  };

  /* ========================================================
     Mobile Menu
     ======================================================== */
  const MobileMenu = {
    init() {
      this.toggleBtn = document.querySelector('.header__menu-toggle');
      this.menu = document.querySelector('.mobile-menu');
      this.overlay = document.querySelector('.mobile-menu__overlay');
      this.closeBtn = document.querySelector('.mobile-menu__close');
      this.isOpen = false;

      if (!this.toggleBtn || !this.menu) return;

      this.toggleBtn.addEventListener('click', () => this.toggle());
      if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
      if (this.overlay) this.overlay.addEventListener('click', () => this.close());

      // Submenu accordions
      this.setupAccordions();

      // Close on escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) this.close();
      });
    },

    toggle() {
      this.isOpen ? this.close() : this.open();
    },

    open() {
      this.isOpen = true;
      this.menu.classList.add('mobile-menu--open');
      if (this.overlay) this.overlay.classList.add('mobile-menu__overlay--visible');
      document.body.classList.add('overflow-hidden');
      utils.trapFocus(this.menu);
    },

    close() {
      this.isOpen = false;
      this.menu.classList.remove('mobile-menu--open');
      if (this.overlay) this.overlay.classList.remove('mobile-menu__overlay--visible');
      document.body.classList.remove('overflow-hidden');
      if (this.toggleBtn) this.toggleBtn.focus();
    },

    setupAccordions() {
      const items = this.menu?.querySelectorAll('.mobile-menu__item');
      if (!items) return;

      items.forEach(item => {
        const link = item.querySelector('.mobile-menu__link');
        const submenu = item.querySelector('.mobile-menu__submenu');
        const arrow = item.querySelector('.mobile-menu__arrow');

        if (submenu && link) {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            const isOpen = submenu.classList.contains('mobile-menu__submenu--open');

            // Close all other submenus
            items.forEach(other => {
              const otherSub = other.querySelector('.mobile-menu__submenu');
              const otherArrow = other.querySelector('.mobile-menu__arrow');
              if (otherSub && otherSub !== submenu) {
                otherSub.classList.remove('mobile-menu__submenu--open');
                if (otherArrow) otherArrow.classList.remove('mobile-menu__arrow--open');
              }
            });

            submenu.classList.toggle('mobile-menu__submenu--open');
            if (arrow) arrow.classList.toggle('mobile-menu__arrow--open');
          });
        }
      });
    }
  };

  /* ========================================================
     Cart Drawer
     ======================================================== */
  const CartDrawer = {
    init() {
      this.drawer = document.querySelector('.cart-drawer');
      this.overlay = document.querySelector('.cart-drawer__overlay');
      this.openTriggers = document.querySelectorAll('[data-cart-toggle]');
      this.closeTriggers = document.querySelectorAll('[data-cart-close]');
      this.isOpen = false;

      if (!this.drawer) return;

      this.openTriggers.forEach(el =>
        el.addEventListener('click', (e) => {
          e.preventDefault();
          this.open();
        })
      );

      this.closeTriggers.forEach(el =>
        el.addEventListener('click', (e) => {
          e.preventDefault();
          this.close();
        })
      );

      if (this.overlay) this.overlay.addEventListener('click', () => this.close());

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) this.close();
      });

      // Listen for Shopify cart updates
      document.addEventListener('cart:updated', (e) => {
        if (e.detail) this.renderCart(e.detail);
      });
    },

    open() {
      this.isOpen = true;
      this.drawer.classList.add('cart-drawer--open');
      if (this.overlay) this.overlay.classList.add('cart-drawer__overlay--visible');
      document.body.classList.add('overflow-hidden');
      this.updateShippingBar();
      utils.trapFocus(this.drawer);
    },

    close() {
      this.isOpen = false;
      this.drawer.classList.remove('cart-drawer--open');
      if (this.overlay) this.overlay.classList.remove('cart-drawer__overlay--visible');
      document.body.classList.remove('overflow-hidden');
    },

    async updateCartQuantity(change) {
      if (!window.Shopify?.API?.cart?.update) return;
      try {
        const cart = await window.Shopify.API.cart.update(change);
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
        this.updateHeaderCount(cart.item_count);
      } catch (err) {
        console.error('Cart update failed:', err);
      }
    },

    updateHeaderCount(count) {
      const badges = document.querySelectorAll('.header__cart-count');
      badges.forEach(badge => {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
      });
    },

    updateShippingBar() {
      const bar = this.drawer?.querySelector('.cart-drawer__shipping-bar');
      if (!bar) return;
      // This would be driven by actual cart data — calculate progress
      const fill = bar.querySelector('.cart-drawer__shipping-progress-fill');
      const text = bar.querySelector('.cart-drawer__shipping-bar-text');
      if (!fill || !text) return;

      // Example: free shipping at $50
      const threshold = 5000; // $50 in cents
      const currentTotal = parseFloat(this.currentTotal || 0);
      const percentage = Math.min((currentTotal / threshold) * 100, 100);

      fill.style.width = `${percentage}%`;

      if (currentTotal >= threshold) {
        text.innerHTML = 'You\'ve unlocked <strong>free shipping</strong>!';
        fill.style.width = '100%';
      } else {
        const remaining = ((threshold - currentTotal) / 100).toFixed(2);
        text.innerHTML = `Spend <strong>$${remaining}</strong> more for free shipping`;
      }
    },

    renderCart(cart) {
      if (!this.drawer) return;
      const itemsContainer = this.drawer.querySelector('.cart-drawer__items');
      const footer = this.drawer.querySelector('.cart-drawer__footer');
      const subtotalValue = this.drawer.querySelector('.cart-drawer__subtotal-value');
      const emptyState = this.drawer.querySelector('.cart-drawer__empty');

      if (!itemsContainer) return;

      if (!cart || !cart.items || cart.items.length === 0) {
        // Show empty state
        if (emptyState) emptyState.style.display = 'block';
        if (itemsContainer) itemsContainer.innerHTML = '';
        if (subtotalValue) subtotalValue.textContent = '$0.00';
        if (footer) footer.style.display = 'none';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';
      if (footer) footer.style.display = 'block';
      if (subtotalValue) {
        subtotalValue.textContent = `$${(cart.total_price / 100).toFixed(2)}`;
      }

      // Build items HTML
      let itemsHtml = '';
      cart.items.forEach(item => {
        const imageUrl = item.image?.src || '';
        const variantInfo = item.variant_title ? ` - ${item.variant_title}` : '';
        itemsHtml += `
          <div class="cart-drawer__item" data-key="${item.key}">
            <img class="cart-drawer__item-image" src="${imageUrl}" alt="${item.title}" loading="lazy">
            <div class="cart-drawer__item-details">
              <a href="${item.url}" class="cart-drawer__item-title">${item.product_title}</a>
              <div class="cart-drawer__item-variant">${variantInfo}</div>
              <div class="cart-drawer__item-price">$${(item.line_price / 100).toFixed(2)}</div>
              <div class="quantity" data-key="${item.key}">
                <button class="quantity__button" data-qty-change="-1" aria-label="Decrease quantity">−</button>
                <input class="quantity__input" type="number" value="${item.quantity}" min="0" readonly aria-label="Quantity">
                <button class="quantity__button" data-qty-change="1" aria-label="Increase quantity">+</button>
              </div>
              <button class="quantity__remove" data-key="${item.key}">Remove</button>
            </div>
          </div>
        `;
      });

      itemsContainer.innerHTML = itemsHtml;

      // Attach quantity handlers
      itemsContainer.querySelectorAll('.quantity__button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const change = parseInt(e.currentTarget.dataset.qtyChange);
          const key = e.currentTarget.closest('.quantity')?.dataset.key || e.currentTarget.closest('.cart-drawer__item')?.dataset.key;
          if (key) this.handleQuantityChange(key, change);
        });
      });

      itemsContainer.querySelectorAll('.quantity__remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const key = e.currentTarget.dataset.key;
          if (key) this.handleQuantityChange(key, -999);
        });
      });

      this.currentTotal = cart.total_price;
      this.updateShippingBar();
    },

    async handleQuantityChange(key, change) {
      if (!window.Shopify?.API?.cart?.update) return;
      try {
        const cart = await window.Shopify.API.cart.update({
          key,
          quantity: (item) => {
            const currentQty = item.quantity;
            const newQty = currentQty + change;
            return Math.max(0, newQty);
          }
        });
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
        this.updateHeaderCount(cart.item_count);
      } catch (err) {
        console.error('Quantity update failed:', err);
      }
    }
  };

  /* ========================================================
     Slideshow
     ======================================================== */
  const Slideshow = {
    init() {
      this.slideshows = document.querySelectorAll('.slideshow');
      if (!this.slideshows.length) return;

      this.slideshows.forEach(slideshow => this.initSlideshow(slideshow));
    },

    initSlideshow(container) {
      const slides = container.querySelectorAll('.slideshow__slide');
      const dots = container.querySelectorAll('.slideshow__dot');
      const prevBtn = container.querySelector('.slideshow__arrow--prev');
      const nextBtn = container.querySelector('.slideshow__arrow--next');
      let currentIndex = 0;
      let autoplayInterval = null;
      const autoplaySpeed = parseInt(container.dataset.autoplaySpeed) || 5000;
      const autoplay = container.dataset.autoplay !== 'false';
      let touchStartX = 0;
      let touchEndX = 0;

      if (!slides.length) return;

      // Show first slide
      this.goToSlide(container, slides, dots, 0);

      // Dot navigation
      dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
          this.goToSlide(container, slides, dots, index);
          this.resetAutoplay();
        });
      });

      // Arrow navigation
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          currentIndex = this.getPrevIndex(slides, currentIndex);
          this.goToSlide(container, slides, dots, currentIndex);
          this.resetAutoplay();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          currentIndex = this.getNextIndex(slides, currentIndex);
          this.goToSlide(container, slides, dots, currentIndex);
          this.resetAutoplay();
        });
      }

      // Touch/swipe support
      container.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      container.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            currentIndex = this.getNextIndex(slides, currentIndex);
          } else {
            currentIndex = this.getPrevIndex(slides, currentIndex);
          }
          this.goToSlide(container, slides, dots, currentIndex);
          this.resetAutoplay();
        }
      }, { passive: true });

      // Keyboard navigation
      container.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
          currentIndex = this.getPrevIndex(slides, currentIndex);
          this.goToSlide(container, slides, dots, currentIndex);
          this.resetAutoplay();
        } else if (e.key === 'ArrowRight') {
          currentIndex = this.getNextIndex(slides, currentIndex);
          this.goToSlide(container, slides, dots, currentIndex);
          this.resetAutoplay();
        }
      });

      // Start autoplay
      if (autoplay && slides.length > 1) {
        this.startAutoplay(container, slides, dots, autoplaySpeed);
      }

      // Store methods for reset
      container._slideshowData = {
        slides,
        dots,
        currentIndex,
        autoplaySpeed,
        goToSlide: (index) => {
          currentIndex = index;
          this.goToSlide(container, slides, dots, currentIndex);
        },
        startAutoplay: () => {
          this.startAutoplay(container, slides, dots, autoplaySpeed);
        },
        stopAutoplay: () => {
          this.stopAutoplay(container);
        }
      };
    },

    goToSlide(container, slides, dots, index) {
      slides.forEach((slide, i) => {
        slide.classList.toggle('slideshow__slide--active', i === index);
        slide.style.position = i === index ? 'relative' : 'absolute';
      });

      dots.forEach((dot, i) => {
        dot.classList.toggle('slideshow__dot--active', i === index);
        dot.setAttribute('aria-current', i === index ? 'true' : 'false');
      });

      // Update current index on container
      container.dataset.currentSlide = index;
    },

    getNextIndex(slides, current) {
      return (current + 1) % slides.length;
    },

    getPrevIndex(slides, current) {
      return (current - 1 + slides.length) % slides.length;
    },

    startAutoplay(container, slides, dots, speed) {
      this.stopAutoplay(container);
      container._autoplayInterval = setInterval(() => {
        let current = parseInt(container.dataset.currentSlide || 0);
        current = this.getNextIndex(slides, current);
        this.goToSlide(container, slides, dots, current);
      }, speed);
    },

    stopAutoplay(container) {
      if (container._autoplayInterval) {
        clearInterval(container._autoplayInterval);
        container._autoplayInterval = null;
      }
    },

    resetAutoplay() {
      this.slideshows.forEach(slideshow => {
        if (slideshow.dataset.autoplay !== 'false') {
          const data = slideshow._slideshowData;
          if (data) {
            this.stopAutoplay(slideshow);
            this.startAutoplay(slideshow, data.slides, data.dots, data.autoplaySpeed);
          }
        }
      });
    }
  };

  /* ========================================================
     Product Page — Variant Selector
     ======================================================== */
  const ProductVariants = {
    init() {
      this.forms = document.querySelectorAll('[data-product-form]');
      if (!this.forms.length) return;

      this.forms.forEach(form => {
        this.initForm(form);
      });
    },

    initForm(form) {
      const radioInputs = form.querySelectorAll('.product__variant-radio');
      const priceEl = form.querySelector('[data-product-price]');
      const comparePriceEl = form.querySelector('[data-product-compare-price]');
      const mainImage = form.querySelector('[data-product-main-image]');
      const addToCartBtn = form.querySelector('[data-add-to-cart]');
      const submitBtn = form.querySelector('[data-product-submit]');

      radioInputs.forEach(input => {
        input.addEventListener('change', () => {
          this.updateVariant(form, {
            priceEl,
            comparePriceEl,
            mainImage,
            addToCartBtn,
            submitBtn,
            radioInputs
          });
        });
      });

      // Form submit
      if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.addToCart(form);
        });
      }
    },

    updateVariant(form, elements) {
      const selectedOptions = {};
      const variantGroups = {};

      elements.radioInputs.forEach(input => {
        const name = input.name;
        if (input.checked) {
          selectedOptions[name] = input.value;
        }
      });

      // Find matching variant from JSON data
      const jsonData = form.querySelector('script[type="application/json"]');
      if (!jsonData) return;

      try {
        const data = JSON.parse(jsonData.textContent);
        const variants = data.variants || [];

        const matchedVariant = variants.find(v => {
          return v.options.every(opt => {
            // Map option position to option name
            const optionName = `option${v.options.indexOf(opt) + 1}`;
            const selected = selectedOptions[optionName] || selectedOptions[Object.keys(selectedOptions)[v.options.indexOf(opt)]];
            return opt === selected;
          });
        });

        if (matchedVariant) {
          // Update price
          if (elements.priceEl) {
            elements.priceEl.textContent = `$${(matchedVariant.price / 100).toFixed(2)}`;
            elements.priceEl.classList.toggle('product__price--sale', matchedVariant.compare_at_price > matchedVariant.price);
          }

          if (elements.comparePriceEl) {
            if (matchedVariant.compare_at_price > matchedVariant.price) {
              elements.comparePriceEl.textContent = `$${(matchedVariant.compare_at_price / 100).toFixed(2)}`;
              elements.comparePriceEl.style.display = '';
            } else {
              elements.comparePriceEl.style.display = 'none';
            }
          }

          // Update image
          if (elements.mainImage && matchedVariant.featured_image?.src) {
            elements.mainImage.src = matchedVariant.featured_image.src;
          }

          // Update availability
          if (elements.addToCartBtn) {
            const isAvailable = matchedVariant.available;
            elements.addToCartBtn.disabled = !isAvailable;
            elements.addToCartBtn.querySelector('span').textContent = isAvailable ? 'Add to Cart' : 'Sold Out';
          }
        }
      } catch (e) {
        console.error('Variant update error:', e);
      }
    },

    async addToCart(form) {
      if (!window.Shopify?.API?.cart?.add) return;

      const variantId = form.querySelector('[data-variant-id]')?.value;
      const quantity = form.querySelector('[data-quantity-input]')?.value || 1;

      if (!variantId) return;

      const submitBtn = form.querySelector('[data-product-submit]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.querySelector('span').textContent = 'Adding…';
      }

      try {
        const cart = await window.Shopify.API.cart.add({
          items: [{ id: parseInt(variantId), quantity: parseInt(quantity) }]
        });
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
        CartDrawer.updateHeaderCount(cart.item_count);
        CartDrawer.open();
      } catch (err) {
        console.error('Add to cart failed:', err);
        alert('Could not add item to cart. Please try again.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.querySelector('span').textContent = 'Add to Cart';
        }
      }
    }
  };

  /* ========================================================
     Quantity Selector
     ======================================================== */
  const QuantitySelector = {
    init() {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.quantity__button');
        if (!btn) return;

        const container = btn.closest('.quantity');
        if (!container) return;

        const input = container.querySelector('.quantity__input');
        if (!input) return;

        const change = parseInt(btn.dataset.qtyChange) || (btn.textContent.trim() === '+' ? 1 : -1);
        let currentValue = parseInt(input.value) || 1;
        let newValue = Math.max(1, currentValue + change);
        input.value = newValue;

        // Trigger change event
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
  };

  /* ========================================================
     Collapsible Tabs (Product Page)
     ======================================================== */
  const CollapsibleTabs = {
    init() {
      const tabHeaders = document.querySelectorAll('.product__tab-header');
      tabHeaders.forEach(header => {
        header.addEventListener('click', () => {
          const tab = header.closest('.product__tab');
          const content = tab?.querySelector('.product__tab-content');
          const icon = header.querySelector('.product__tab-icon');

          if (!content) return;

          const isOpen = content.classList.contains('product__tab-content--open');

          // Close all tabs within same container
          const container = tab.closest('.product__tabs');
          if (container) {
            container.querySelectorAll('.product__tab-content--open').forEach(c => {
              if (c !== content) {
                c.classList.remove('product__tab-content--open');
                c.closest('.product__tab')?.querySelector('.product__tab-icon')?.classList.remove('product__tab-icon--open');
              }
            });
          }

          content.classList.toggle('product__tab-content--open');
          if (icon) icon.classList.toggle('product__tab-icon--open');
        });
      });
    }
  };

  /* ========================================================
     Product Share
     ======================================================== */
  const ProductShare = {
    init() {
      const shareBtn = document.querySelector('[data-share-button]');
      if (!shareBtn) return;

      shareBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const url = window.location.href;

        if (navigator.share) {
          try {
            await navigator.share({
              title: document.title,
              url: url
            });
          } catch (err) {
            if (err.name !== 'AbortError') {
              this.copyToClipboard(url);
            }
          }
        } else {
          this.copyToClipboard(url);
        }
      });

      // Social share links
      document.querySelectorAll('[data-share-link]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const platform = link.dataset.shareLink;
          const url = encodeURIComponent(window.location.href);
          const title = encodeURIComponent(document.title);
          let shareUrl = '';

          switch (platform) {
            case 'facebook':
              shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
              break;
            case 'twitter':
              shareUrl = `https://twitter.com/intent/tweet?text=${title}&url=${url}`;
              break;
            case 'pinterest':
              shareUrl = `https://pinterest.com/pin/create/button/?url=${url}&description=${title}`;
              break;
            case 'copy':
              this.copyToClipboard(window.location.href);
              return;
          }

          if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
          }
        });
      });
    },

    copyToClipboard(text) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          this.showToast('Link copied to clipboard!');
        }).catch(() => {
          this.fallbackCopy(text);
        });
      } else {
        this.fallbackCopy(text);
      }
    },

    fallbackCopy(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showToast('Link copied to clipboard!');
    },

    showToast(message) {
      const existing = document.querySelector('.notification');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'notification notification--visible';
      toast.innerHTML = `<div class="notification__title">${message}</div>`;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.classList.remove('notification--visible');
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    }
  };

  /* ========================================================
     Ask a Question Modal
     ======================================================== */
  const AskQuestion = {
    init() {
      const trigger = document.querySelector('[data-ask-question]');
      if (!trigger) return;

      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal();
      });
    },

    openModal() {
      // Create modal dynamically
      const existing = document.querySelector('.modal--question');
      if (existing) {
        existing.classList.add('modal--open');
        return;
      }

      const modal = document.createElement('div');
      modal.className = 'modal modal--question';
      modal.innerHTML = `
        <div class="modal__overlay" data-modal-close></div>
        <div class="modal__content">
          <button class="modal__close" data-modal-close aria-label="Close">&times;</button>
          <div class="modal__header">
            <h3 class="modal__title">Ask a Question</h3>
          </div>
          <form class="contact__form" data-question-form>
            <div class="field field--full">
              <label class="field__label" for="question-name">Name</label>
              <input class="field__input" type="text" id="question-name" name="name" required>
            </div>
            <div class="field field--full">
              <label class="field__label" for="question-email">Email</label>
              <input class="field__input" type="email" id="question-email" name="email" required>
            </div>
            <div class="field field--full">
              <label class="field__label" for="question-message">Question</label>
              <textarea class="field__input field__input--textarea" id="question-message" name="message" rows="4" required></textarea>
            </div>
            <div class="field field--full">
              <button type="submit" class="button button--primary button--full">Send Question</button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(modal);

      // Force reflow before adding open class
      requestAnimationFrame(() => {
        modal.classList.add('modal--open');
      });

      // Close handlers
      modal.querySelectorAll('[data-modal-close]').forEach(el => {
        el.addEventListener('click', () => modal.classList.remove('modal--open'));
      });

      modal.querySelector('[data-question-form]').addEventListener('submit', async (e) => {
        e.preventDefault();
        // Form submission logic would go here with Shopify API
        modal.classList.remove('modal--open');
        ProductShare.showToast('Question sent! We\'ll get back to you soon.');
      });
    }
  };

  /* ========================================================
     Back to Top Button
     ======================================================== */
  const BackToTop = {
    init() {
      this.btn = document.querySelector('.back-to-top');
      if (!this.btn) return;

      window.addEventListener('scroll', utils.throttle(() => this.toggle(), 200));

      this.btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    },

    toggle() {
      if (!this.btn) return;
      if (window.scrollY > 500) {
        this.btn.classList.add('back-to-top--visible');
      } else {
        this.btn.classList.remove('back-to-top--visible');
      }
    }
  };

  /* ========================================================
     Testimonial Slider
     ======================================================== */
  const TestimonialSlider = {
    init() {
      this.sliders = document.querySelectorAll('.testimonials');
      if (!this.sliders.length) return;

      this.sliders.forEach(slider => this.initSlider(slider));
    },

    initSlider(container) {
      const slides = container.querySelectorAll('.testimonials__slide');
      const dots = container.querySelectorAll('.testimonials__dot');
      let currentIndex = 0;
      let interval;

      if (!slides.length) return;

      const showSlide = (index) => {
        slides.forEach((s, i) => s.classList.toggle('testimonials__slide--active', i === index));
        dots.forEach((d, i) => d.classList.toggle('testimonials__dot--active', i === index));
        currentIndex = index;
      };

      dots.forEach(dot => {
        dot.addEventListener('click', () => {
          showSlide(parseInt(dot.dataset.index));
          clearInterval(interval);
        });
      });

      // Auto-rotate
      if (slides.length > 1) {
        interval = setInterval(() => {
          showSlide((currentIndex + 1) % slides.length);
        }, 5000);
      }

      showSlide(0);
    }
  };

  /* ========================================================
     Product Card Image Hover
     ======================================================== */
  const ProductCardHover = {
    init() {
      // Handled via CSS — secondary image appears on hover
      // This module ensures the image swap works on touch devices
      if ('ontouchstart' in window) {
        document.querySelectorAll('.product-card').forEach(card => {
          card.addEventListener('click', function() {
            // On tap, briefly show secondary image
            const secondary = this.querySelector('.product-card__image--secondary');
            if (secondary) {
              const wasVisible = secondary.style.opacity === '1';
              secondary.style.opacity = wasVisible ? '0' : '1';
              setTimeout(() => {
                secondary.style.opacity = '0';
              }, 1500);
            }
          });
        });
      }
    }
  };

  /* ========================================================
     Collection Filter / Sort
     ======================================================== */
  const CollectionFilters = {
    init() {
      this.form = document.querySelector('[data-collection-filters]');
      this.sortSelect = document.querySelector('[data-collection-sort]');
      this.mobileToggle = document.querySelector('[data-mobile-filter-toggle]');
      this.sidebar = document.querySelector('.collection__sidebar');

      if (this.sortSelect) {
        this.sortSelect.addEventListener('change', () => this.handleSort());
      }

      if (this.mobileToggle && this.sidebar) {
        this.mobileToggle.addEventListener('click', () => {
          this.sidebar.classList.toggle('collection__sidebar--open');
          document.body.classList.toggle('overflow-hidden');
        });
      }

      // Filter accordions
      document.querySelectorAll('.collection__filter-header').forEach(header => {
        header.addEventListener('click', () => {
          const list = header.nextElementSibling;
          const arrow = header.querySelector('.collection__filter-arrow');
          if (list) list.classList.toggle('collection__filter-list--collapsed');
          if (arrow) arrow.classList.toggle('collection__filter-arrow--open');
        });
      });

      // Clear all filters
      const clearBtn = document.querySelector('[data-clear-filters]');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.form?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
          this.submitForm();
        });
      }

      // Active filter remove
      document.querySelectorAll('[data-filter-remove]').forEach(el => {
        el.addEventListener('click', () => {
          const value = el.dataset.filterRemove;
          const checkbox = this.form?.querySelector(`input[value="${value}"]`);
          if (checkbox) {
            checkbox.checked = false;
            this.submitForm();
          }
        });
      });
    },

    handleSort() {
      if (this.sortSelect) {
        window.location = this.sortSelect.value;
      }
    },

    submitForm() {
      if (this.form) {
        this.form.submit();
      }
    }
  };

  /* ========================================================
     Free Shipping Progress Bar
     ======================================================== */
  const ShippingBar = {
    init() {
      // Handled within CartDrawer
    },

    calculate(cartTotal, threshold = 5000) {
      const remaining = Math.max(0, threshold - cartTotal);
      const percentage = Math.min((cartTotal / threshold) * 100, 100);
      return { remaining, percentage, isFree: cartTotal >= threshold };
    }
  };

  /* ========================================================
     FAQ Accordion
     ======================================================== */
  const FAQAccordion = {
    init() {
      document.querySelectorAll('.faq__question').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = btn.closest('.faq__item');
          if (!item) return;
          const answer = item.querySelector('.faq__answer');
          const icon = btn.querySelector('.faq__icon');
          const isOpen = answer?.classList.contains('faq__answer--open');

          // Close all others
          const container = item.closest('.faq__list');
          if (container) {
            container.querySelectorAll('.faq__answer--open').forEach(a => {
              if (a !== answer) {
                a.classList.remove('faq__answer--open');
                a.closest('.faq__item')?.querySelector('.faq__icon')?.classList.remove('faq__icon--open');
              }
            });
          }

          if (answer) answer.classList.toggle('faq__answer--open');
          if (icon) icon.classList.toggle('faq__icon--open');
        });
      });
    }
  };

  /* ========================================================
     Initialization
     ======================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    AnnouncementBar.init();
    Header.init();
    MobileMenu.init();
    CartDrawer.init();
    Slideshow.init();
    ProductVariants.init();
    QuantitySelector.init();
    CollapsibleTabs.init();
    ProductShare.init();
    AskQuestion.init();
    BackToTop.init();
    TestimonialSlider.init();
    ProductCardHover.init();
    CollectionFilters.init();
    FAQAccordion.init();

    // Dispatch init complete event
    document.dispatchEvent(new CustomEvent('sleek:init-complete'));
  });

  // Re-init on Shopify section reload
  document.addEventListener('shopify:section:load', () => {
    Slideshow.init();
    TestimonialSlider.init();
    ProductVariants.init();
    CollapsibleTabs.init();
    CollectionFilters.init();
  });

  // Re-init on Shopify section re-render
  document.addEventListener('shopify:section:reorder', () => {
    Slideshow.init();
    TestimonialSlider.init();
  });

})();
