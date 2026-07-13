/* ============================================================
   predictive-search.js — Sleek Theme for Shopify
   Shopify Predictive Search integration with dropdown results
   Vanilla JS — No dependencies.
   ============================================================ */

(function() {
  'use strict';

  /**
   * PredictiveSearch — Handles search input with predictive results dropdown.
   *
   * Expected HTML structure:
   *   <div class="header__search" data-predictive-search>
   *     <form action="/search" method="get">
   *       <input type="text" name="q" placeholder="Search..." autocomplete="off">
   *       <button type="submit">Search</button>
   *     </form>
   *     <div class="predictive-search">
   *       <div class="predictive-search__results">...</div>
   *     </div>
   *   </div>
   */
  class PredictiveSearch {
    constructor(options = {}) {
      this.options = {
        debounceTime: 300,
        minQueryLength: 2,
        maxResults: 10,
        APIendpoint: '/search/suggest.json',
        searchResultsUrl: '/search',
        resourceTypes: ['product', 'article', 'page', 'collection'],
        ...options
      };

      this.searchContainers = [];
      this.activeSearch = null;
      this.abortController = null;

      this.init();
    }

    /**
     * Initialize all predictive search containers
     */
    init() {
      const containers = document.querySelectorAll('[data-predictive-search]');

      if (!containers.length) {
        // Fallback: find search forms within header
        const headerSearch = document.querySelector('.header__search');
        const searchForms = document.querySelectorAll('form[action*="/search"]');

        searchForms.forEach(form => {
          const parent = form.parentElement;
          if (parent && !parent.hasAttribute('data-predictive-search')) {
            parent.dataset.predictiveSearch = '';
            containers.push(parent);
          }
        });
      }

      containers.forEach(container => this.setupContainer(container));

      // Close on click outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('[data-predictive-search]')) {
          this.closeAll();
        }
      });

      // Close on escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeAll();
        }
      });
    }

    /**
     * Setup a single search container
     */
    setupContainer(container) {
      const input = container.querySelector('input[name="q"], input[type="search"]');
      const form = container.querySelector('form');
      const resultsContainer = container.querySelector('.predictive-search');

      if (!input) return;

      const searchInstance = {
        container,
        input,
        form,
        resultsContainer,
        isOpen: false,
        selectedIndex: -1
      };

      // Create results container if it doesn't exist
      if (!searchInstance.resultsContainer) {
        const div = document.createElement('div');
        div.className = 'predictive-search';
        container.appendChild(div);
        searchInstance.resultsContainer = div;
      }

      // Add aria attributes
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-controls', `predictive-search-results-${this.searchContainers.length}`);
      input.setAttribute('aria-expanded', 'false');
      searchInstance.resultsContainer.id = `predictive-search-results-${this.searchContainers.length}`;
      searchInstance.resultsContainer.setAttribute('role', 'listbox');
      searchInstance.resultsContainer.setAttribute('aria-label', 'Search suggestions');

      // Event listeners
      input.addEventListener('input', this.debounce((e) => {
        this.handleInput(searchInstance, e);
      }, this.options.debounceTime));

      input.addEventListener('focus', (e) => {
        if (input.value.length >= this.options.minQueryLength) {
          this.handleInput(searchInstance, e);
        }
      });

      input.addEventListener('keydown', (e) => {
        this.handleKeyboard(searchInstance, e);
      });

      // Form submit
      if (form) {
        form.addEventListener('submit', (e) => {
          if (input.value.trim().length === 0) {
            e.preventDefault();
          }
        });
      }

      this.searchContainers.push(searchInstance);
    }

    /**
     * Handle input changes
     */
    async handleInput(searchInstance, event) {
      const query = searchInstance.input.value.trim();

      if (query.length < this.options.minQueryLength) {
        this.close(searchInstance);
        return;
      }

      try {
        const results = await this.fetchResults(query);
        this.renderResults(searchInstance, results, query);
        this.open(searchInstance);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Predictive search error:', err.message);
          this.showError(searchInstance);
        }
      }
    }

    /**
     * Fetch predictive search results from Shopify
     */
    async fetchResults(query) {
      // Cancel previous request
      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();

      const params = new URLSearchParams({
        q: query,
        resources: JSON.stringify({
          type: this.options.resourceTypes.join(','),
          limit: this.options.maxResults,
          options: {
            unavailable_products: 'last',
            fields: ['title', 'product_type', 'variants', 'featured_image', 'price', 'available']
          }
        }),
        section_id: 'predictive-search'
      });

      const url = `${this.options.APIendpoint}?${params}`;

      try {
        const response = await fetch(url, {
          signal: this.abortController.signal,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        throw err;
      }
    }

    /**
     * Render search results into the container
     */
    renderResults(searchInstance, data, query) {
      const container = searchInstance.resultsContainer;
      if (!container) return;

      const resources = data?.resources || data || {};
      const products = resources.results?.products || resources.products || [];
      const articles = resources.results?.articles || resources.articles || [];
      const pages = resources.results?.pages || resources.pages || [];
      const collections = resources.results?.collections || resources.collections || [];

      // If no results and no products
      if (!products.length && !articles.length && !pages.length && !collections.length) {
        container.innerHTML = `
          <div class="predictive-search__results">
            <div class="predictive-search__no-results">
              <p>No results found for "<strong>${this.escapeHTML(query)}</strong>"</p>
            </div>
            <a href="${this.options.searchResultsUrl}?q=${encodeURIComponent(query)}" class="predictive-search__view-all">
              View all results →
            </a>
          </div>
        `;
        return;
      }

      let html = '<div class="predictive-search__results">';

      // Products
      if (products.length) {
        html += `
          <div class="predictive-search__heading">Products</div>
          <div class="predictive-search__products" role="group" aria-label="Products">
            ${products.map((product, index) => this.renderProduct(product, index)).join('')}
          </div>
        `;
      }

      // Collections
      if (collections.length) {
        html += `
          <div class="predictive-search__heading">Collections</div>
          <div class="predictive-search__suggestions" role="group" aria-label="Collections">
            ${collections.map(col => `
              <a href="${col.url}" class="predictive-search__suggestion" role="option">
                ${this.escapeHTML(col.title)}
              </a>
            `).join('')}
          </div>
        `;
      }

      // Articles
      if (articles.length) {
        html += `
          <div class="predictive-search__heading">Articles</div>
          <div class="predictive-search__suggestions" role="group" aria-label="Articles">
            ${articles.map(article => `
              <a href="${article.url}" class="predictive-search__suggestion" role="option">
                ${this.escapeHTML(article.title)}
              </a>
            `).join('')}
          </div>
        `;
      }

      // Pages
      if (pages.length) {
        html += `
          <div class="predictive-search__heading">Pages</div>
          <div class="predictive-search__suggestions" role="group" aria-label="Pages">
            ${pages.map(page => `
              <a href="${page.url}" class="predictive-search__suggestion" role="option">
                ${this.escapeHTML(page.title)}
              </a>
            `).join('')}
          </div>
        `;
      }

      // View all link
      html += `
        <a href="${this.options.searchResultsUrl}?q=${encodeURIComponent(query)}" class="predictive-search__view-all" role="option">
          View all results →
        </a>
      </div>`;

      container.innerHTML = html;

      // Update ARIA attributes for product results
      const productLinks = container.querySelectorAll('.predictive-search__product');
      productLinks.forEach((link, index) => {
        link.setAttribute('tabindex', '-1');
        link.setAttribute('role', 'option');
        link.id = `predictive-search-option-${index}`;
      });
    }

    /**
     * Render a single product result
     */
    renderProduct(product, index) {
      const imageUrl = product.featured_image?.src || product.image || '';
      const price = product.price || product.variants?.[0]?.price || 0;
      const comparePrice = product.compare_at_price || product.variants?.[0]?.compare_at_price;
      const formattedPrice = price ? `$${(price / 100).toFixed(2)}` : '';
      const formattedCompare = comparePrice ? `$${(comparePrice / 100).toFixed(2)}` : '';
      const vendor = product.vendor || '';

      return `
        <a href="${product.url}" class="predictive-search__product" tabindex="-1" role="option">
          <img class="predictive-search__product-image"
               src="${imageUrl ? this.imageSize(imageUrl, 'small') : ''}"
               alt="${this.escapeHTML(product.title)}"
               loading="lazy"
               onerror="this.style.display='none'">
          <div class="predictive-search__product-info">
            ${vendor ? `<span class="predictive-search__product-vendor">${this.escapeHTML(vendor)}</span>` : ''}
            <span class="predictive-search__product-title">${this.escapeHTML(product.title)}</span>
            <span class="predictive-search__product-price">
              ${formattedCompare ? `<span style="text-decoration:line-through;color:#999;margin-right:4px;">${formattedCompare}</span>` : ''}
              ${formattedPrice}
            </span>
          </div>
        </a>
      `;
    }

    /**
     * Open search results
     */
    open(searchInstance) {
      if (searchInstance.isOpen) return;
      searchInstance.isOpen = true;
      searchInstance.resultsContainer.classList.add('predictive-search--open');
      searchInstance.input.setAttribute('aria-expanded', 'true');

      // Close other search instances
      this.searchContainers.forEach(sc => {
        if (sc !== searchInstance && sc.isOpen) {
          this.close(sc);
        }
      });
    }

    /**
     * Close search results
     */
    close(searchInstance) {
      if (!searchInstance.isOpen) return;
      searchInstance.isOpen = false;
      searchInstance.resultsContainer.classList.remove('predictive-search--open');
      searchInstance.input.setAttribute('aria-expanded', 'false');
      searchInstance.selectedIndex = -1;
    }

    /**
     * Close all search instances
     */
    closeAll() {
      this.searchContainers.forEach(sc => this.close(sc));
    }

    /**
     * Handle keyboard navigation within results
     */
    handleKeyboard(searchInstance, event) {
      const results = searchInstance.resultsContainer.querySelectorAll('.predictive-search__product, .predictive-search__suggestion, .predictive-search__view-all');
      let index = searchInstance.selectedIndex;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (results.length) {
            index = (index + 1) % results.length;
            this.setActiveOption(searchInstance, results, index);
          }
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (results.length) {
            index = (index - 1 + results.length) % results.length;
            this.setActiveOption(searchInstance, results, index);
          }
          break;

        case 'Enter':
          event.preventDefault();
          if (index >= 0 && results[index]) {
            results[index].click();
          } else {
            // Submit the search form
            searchInstance.form?.submit();
          }
          break;

        case 'Escape':
          event.preventDefault();
          this.close(searchInstance);
          searchInstance.input.blur();
          break;

        default:
          return;
      }
    }

    /**
     * Set active option in results
     */
    setActiveOption(searchInstance, results, index) {
      // Remove previous active
      if (searchInstance.selectedIndex >= 0 && results[searchInstance.selectedIndex]) {
        results[searchInstance.selectedIndex].classList.remove('predictive-search__product--active');
        results[searchInstance.selectedIndex].removeAttribute('aria-selected');
      }

      searchInstance.selectedIndex = index;

      if (results[index]) {
        results[index].classList.add('predictive-search__product--active');
        results[index].setAttribute('aria-selected', 'true');
        results[index].scrollIntoView({ block: 'nearest' });

        // Update input value with selected item
        const title = results[index].querySelector('.predictive-search__product-title')?.textContent ||
                      results[index].textContent?.trim();
        if (title) {
          searchInstance.input.setAttribute('aria-activedescendant', results[index].id || '');
        }
      }
    }

    /**
     * Show error state
     */
    showError(searchInstance) {
      if (!searchInstance.resultsContainer) return;
      searchInstance.resultsContainer.innerHTML = `
        <div class="predictive-search__results">
          <div class="predictive-search__no-results">
            <p>Something went wrong. Please try again.</p>
          </div>
        </div>
      `;
      this.open(searchInstance);
    }

    /**
     * Helper: Change image size parameter
     */
    imageSize(url, size) {
      if (!url) return '';
      return url.replace(/(\.jpg|\.png|\.jpeg|\.webp)/, `_${size}$1`)
                .replace(/(_small|_medium|_large|_compact)/, `_${size}`);
    }

    /**
     * Helper: Escape HTML entities
     */
    escapeHTML(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    /**
     * Debounce utility
     */
    debounce(fn, delay) {
      let timer;
      return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    }

    /**
     * Refresh — re-initialize for newly added search forms
     */
    refresh() {
      this.init();
    }

    /**
     * Destroy — clean up
     */
    destroy() {
      if (this.abortController) {
        this.abortController.abort();
      }
      this.searchContainers = [];
    }
  }

  /* ========================================================
     Initialize
     ======================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    window.sleekPredictiveSearch = new PredictiveSearch({
      debounceTime: 300,
      minQueryLength: 2,
      maxResults: 10,
      resourceTypes: ['product', 'article', 'page', 'collection']
    });
  });

  // Re-init on Shopify section load
  document.addEventListener('shopify:section:load', () => {
    if (window.sleekPredictiveSearch) {
      window.sleekPredictiveSearch.refresh();
    } else {
      window.sleekPredictiveSearch = new PredictiveSearch();
    }
  });

  // Re-init on section re-render
  document.addEventListener('shopify:section:reorder', () => {
    if (window.sleekPredictiveSearch) {
      window.sleekPredictiveSearch.refresh();
    }
  });

})();
