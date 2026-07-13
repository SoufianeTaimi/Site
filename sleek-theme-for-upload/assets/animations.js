/* ============================================================
   animations.js — Sleek Theme for Shopify
   Scroll-based reveal animations using IntersectionObserver
   Vanilla JS — No dependencies.
   ============================================================ */

(function() {
  'use strict';

  /**
   * ScrollReveal — Manages scroll-triggered reveal animations.
   *
   * Usage:
   *   <div class="reveal">          ← slide-up (default)
   *   <div class="reveal--fade-in">  ← fade-in only
   *   <div class="reveal--scale-in"> ← scale-in
   *
   * Stagger children:
   *   <div class="stagger-children">
   *     <div class="reveal">...</div> ← auto-delay applied
   *   </div>
   *
   * Custom delay:
   *   <div class="reveal" style="--reveal-delay: 0.3s">
   */
  class ScrollReveal {
    constructor(options = {}) {
      this.options = {
        threshold: 0.15,
        rootMargin: '0px 0px -60px 0px',
        once: true,
        ...options
      };

      this.observer = null;
      this.animatableElements = new Map();
      this.init();
    }

    /**
     * Initialize the IntersectionObserver
     */
    init() {
      // Respect prefers-reduced-motion
      if (this.prefersReducedMotion()) {
        this.revealAll();
        return;
      }

      this.observer = new IntersectionObserver(
        (entries) => this.onIntersect(entries),
        {
          threshold: this.options.threshold,
          rootMargin: this.options.rootMargin
        }
      );

      this.observeElements();
    }

    /**
     * Check if user prefers reduced motion
     */
    prefersReducedMotion() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Observe all elements with reveal classes
     */
    observeElements() {
      const selectors = [
        '.reveal',
        '.reveal--fade-in',
        '.reveal--scale-in',
        '.stagger-children > .reveal',
        '.stagger-children > .reveal--fade-in',
        '.stagger-children > .reveal--scale-in'
      ];

      const elements = document.querySelectorAll(selectors.join(','));

      elements.forEach((el, index) => {
        if (this.observer) {
          this.observer.observe(el);
        }

        // Store computed delay for stagger
        const parent = el.parentElement;
        if (parent && parent.classList.contains('stagger-children')) {
          const childIndex = Array.from(parent.children).indexOf(el);
          const baseDelay = parseFloat(getComputedStyle(el).getPropertyValue('--reveal-delay')) || 0;
          const staggerDelay = childIndex * 0.1; // 100ms per child
          el.style.setProperty('--reveal-actual-delay', `${baseDelay + staggerDelay}s`);
        }
      });

      // Also observe section elements for section-level animations
      const sections = document.querySelectorAll('.section, .image-with-text, .email-signup');
      sections.forEach(section => {
        if (this.observer) {
          this.observer.observe(section);
        }
      });
    }

    /**
     * Handle intersection events
     */
    onIntersect(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.revealElement(entry.target);

          if (this.options.once) {
            this.observer.unobserve(entry.target);
          }
        } else if (!this.options.once) {
          this.hideElement(entry.target);
        }
      });
    }

    /**
     * Reveal a single element
     */
    revealElement(element) {
      // Add visible class with optional delay
      const delay = element.style.getPropertyValue('--reveal-actual-delay') ||
                    element.style.getPropertyValue('--reveal-delay') ||
                    '0s';

      if (parseFloat(delay) > 0) {
        element.style.transitionDelay = delay;
      }

      // Trigger reveal
      requestAnimationFrame(() => {
        element.classList.add('reveal--visible');

        // If this is a parent with stagger children, reveal them too
        if (element.classList.contains('stagger-children')) {
          this.revealStaggerChildren(element);
        }
      });

      // Dispatch custom event for other scripts
      element.dispatchEvent(new CustomEvent('reveal:visible', {
        bubbles: true,
        detail: { element }
      }));
    }

    /**
     * Hide element (for repeat animations)
     */
    hideElement(element) {
      element.classList.remove('reveal--visible');
      element.style.transitionDelay = '';
    }

    /**
     * Reveal stagger children within a container
     */
    revealStaggerChildren(container) {
      const children = container.querySelectorAll(':scope > .reveal, :scope > .reveal--fade-in, :scope > .reveal--scale-in');

      children.forEach((child, index) => {
        const delay = index * 0.1;
        child.style.transitionDelay = `${delay}s`;

        requestAnimationFrame(() => {
          child.classList.add('reveal--visible');
        });
      });
    }

    /**
     * Reveal all elements immediately (reduced motion)
     */
    revealAll() {
      document.querySelectorAll('.reveal, .reveal--fade-in, .reveal--scale-in').forEach(el => {
        el.classList.add('reveal--visible');
      });

      document.querySelectorAll('.stagger-children > .reveal, .stagger-children > .reveal--fade-in, .stagger-children > .reveal--scale-in').forEach(el => {
        el.classList.add('reveal--visible');
      });
    }

    /**
     * Refresh — observe new elements (call after dynamic content load)
     */
    refresh() {
      if (this.observer) {
        this.observeElements();
      }
    }

    /**
     * Destroy the observer
     */
    destroy() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }
  }

  /**
   * ParallaxEffect — Subtle parallax scrolling for hero images
   */
  class ParallaxEffect {
    constructor() {
      this.elements = document.querySelectorAll('[data-parallax]');
      if (!this.elements.length || window.innerWidth < 750) return;

      window.addEventListener('scroll', () => this.update(), { passive: true });
      this.update();
    }

    update() {
      const scrollY = window.scrollY;
      this.elements.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.3;
        const rect = el.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

        if (isVisible) {
          const offset = scrollY * speed;
          el.style.transform = `translateY(${offset}px)`;
        }
      });
    }
  }

  /**
   * ImageReveal — Image reveal-on-scroll effect (clip-path animation)
   */
  class ImageReveal {
    constructor() {
      this.images = document.querySelectorAll('[data-image-reveal]');
      if (!this.images.length) return;

      this.observer = new IntersectionObserver(
        (entries) => this.onIntersect(entries),
        { threshold: 0.2 }
      );

      this.images.forEach(img => {
        // Wrap in a container if not already
        if (!img.parentElement.classList.contains('image-reveal-wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'image-reveal-wrapper';
          wrapper.style.cssText = 'overflow:hidden;display:block;';
          img.parentNode.insertBefore(wrapper, img);
          wrapper.appendChild(img);
        }
        this.observer.observe(img);
      });
    }

    onIntersect(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('image-reveal--visible');
          entry.target.style.animation = 'imageReveal 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
          this.observer.unobserve(entry.target);
        }
      });
    }
  }

  /**
   * Counter Animation — Animate numbers (for stats sections)
   */
  class CounterAnimation {
    constructor() {
      this.counters = document.querySelectorAll('[data-counter]');
      if (!this.counters.length) return;

      this.observer = new IntersectionObserver(
        (entries) => this.onIntersect(entries),
        { threshold: 0.5 }
      );

      this.counters.forEach(counter => this.observer.observe(counter));
    }

    onIntersect(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animate(entry.target);
          this.observer.unobserve(entry.target);
        }
      });
    }

    animate(element) {
      const target = parseInt(element.dataset.counter) || parseInt(element.textContent.replace(/[^0-9]/g, '')) || 0;
      const duration = parseInt(element.dataset.counterDuration) || 2000;
      const suffix = element.dataset.counterSuffix || '';
      const prefix = element.dataset.counterPrefix || '';
      const startTime = performance.now();

      const update = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);

        element.textContent = `${prefix}${current.toLocaleString()}${suffix}`;

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          element.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
        }
      };

      requestAnimationFrame(update);
    }
  }

  /**
   * LazyLoad — IntersectionObserver-based image lazy loading
   */
  class LazyLoad {
    constructor() {
      this.images = document.querySelectorAll('img[loading="lazy"]');
      if (!this.images.length || !('IntersectionObserver' in window)) {
        // Fallback: load all
        this.images.forEach(img => {
          if (img.dataset.src) img.src = img.dataset.src;
        });
        return;
      }

      this.observer = new IntersectionObserver(
        (entries) => this.onIntersect(entries),
        { rootMargin: '200px 0px' }
      );

      this.images.forEach(img => this.observer.observe(img));
    }

    onIntersect(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
            img.removeAttribute('data-srcset');
          }
          this.observer.unobserve(img);

          img.addEventListener('load', () => {
            img.classList.add('lazy-loaded');
            img.dispatchEvent(new CustomEvent('lazy:loaded'));
          });
        }
      });
    }
  }

  /* ========================================================
     Initialize All Animation Modules
     ======================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    // Main scroll reveal
    window.sleekReveal = new ScrollReveal({
      threshold: 0.15,
      rootMargin: '0px 0px -60px 0px',
      once: true
    });

    // Parallax (if any elements with data-parallax)
    if (document.querySelector('[data-parallax]')) {
      window.sleekParallax = new ParallaxEffect();
    }

    // Image reveal effect
    if (document.querySelector('[data-image-reveal]')) {
      window.sleekImageReveal = new ImageReveal();
    }

    // Counter animations
    if (document.querySelector('[data-counter]')) {
      window.sleekCounter = new CounterAnimation();
    }

    // Lazy loading enhancement
    window.sleekLazy = new LazyLoad();
  });

  // Re-initialize on Shopify section load
  document.addEventListener('shopify:section:load', () => {
    if (window.sleekReveal) {
      window.sleekReveal.refresh();
    }
    if (document.querySelector('[data-counter]')) {
      window.sleekCounter = new CounterAnimation();
    }
    window.sleekLazy = new LazyLoad();
  });

  document.addEventListener('shopify:section:reorder', () => {
    if (window.sleekReveal) {
      window.sleekReveal.refresh();
    }
  });

})();
