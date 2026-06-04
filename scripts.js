/* Code Snippets Swag Shop custom scripts. */

(function () {
  'use strict';

  function markAlpineReady() {
    if (!window.Alpine) return;

    document.documentElement.classList.add('cs-alpine-ready');
    window.dispatchEvent(new CustomEvent('cs:alpine-ready', {
      detail: { Alpine: window.Alpine }
    }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markAlpineReady, { once: true });
  } else {
    markAlpineReady();
  }
}());

/* Code Snippets Storefront shell. */
(function () {
  'use strict';

  function decodeStorefrontToken(value) {
    value = (value || '').trim();
    if (!value) return '';
    var tokenPrefix = 'pt' + 'kn_';
    if (value.indexOf(tokenPrefix) === 0) return value;

    try {
      var decoded = window.atob(value);
      return decoded.indexOf(tokenPrefix) === 0 ? decoded : value;
    } catch (error) {
      return value;
    }
  }

  var STOREFRONT_TOKEN = decodeStorefrontToken(
    (window.CS_SWAG_CONFIG && window.CS_SWAG_CONFIG.storefrontToken)
      || (qs('root') && qs('root').getAttribute('data-storefront-token'))
      || ''
  );
  var API_BASE = 'https://storefront-api.fourthwall.com/v1';
  var CURRENCY = 'USD';
  var CART_STORAGE_KEY = 'cs_storefront_cart_id';
  var DESIGN_COLLECTIONS = {
    'brain-100-focus-0': 'Brain 100% • Focus 0%',
    'coder': 'Coder',
    'emoji-code': 'Emoji Code',
    'error-404': 'Error 404',
    'im-this-old': "I'm this old",
    'in-a-relationship': 'In a relationship',
    'make-it-work': 'Make it work',
    'my-therapist-says': 'My therapist says',
    'powered-by-coffee': 'Powered by coffee',
    'snippet': 'Snippet',
    'snippet-activated': 'Snippet Activated',
    'tabs-over-spaces': 'Tabs over spaces'
  };

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function apiUrl(path, params) {
    var query = new URLSearchParams(params || {});
    query.set('storefront_token', STOREFRONT_TOKEN);
    return API_BASE + path + '?' + query.toString();
  }

  function fetchJson(path, params, options) {
    return fetch(apiUrl(path, params), Object.assign({
      headers: { 'Accept': 'application/json' }
    }, options || {})).then(function (response) {
      if (!response.ok) {
        throw new Error('Fourthwall API ' + response.status + ' for ' + path);
      }
      return response.json();
    });
  }

  function currentCollectionSlug() {
    var match = window.location.pathname.match(/\/collections\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : 'staff-pick';
  }

  function designKey(product) {
    var slug = (product.slug || '').toLowerCase();
    var checks = [
      ['make-it-work', 'make-it-work'],
      ['tabs-over-spaces', 'tabs-over-spaces'],
      ['powered-by-coffee', 'powered-by-coffee'],
      ['powered-by', 'powered-by-coffee'],
      ['emoji-code', 'emoji-code'],
      ['snippet-activated', 'snippet-activated'],
      ['snippet', 'snippet'],
      ['im-this-old', 'im-this-old'],
      ['in-a-relationship', 'in-a-relationship'],
      ['brain-100-focus-0', 'brain-100-focus-0'],
      ['error-404', 'error-404'],
      ['coder', 'coder'],
      ['my-therapist-says', 'my-therapist-says']
    ];
    for (var i = 0; i < checks.length; i++) {
      if (slug.indexOf(checks[i][0]) === 0) return checks[i][1];
    }
    return slug;
  }

  function productType(product) {
    var value = ((product.name || '') + ' ' + (product.slug || '')).toLowerCase();
    if (value.indexOf('woman') !== -1) return 'Woman fit tee';
    if (value.indexOf('unisex') !== -1 || value.indexOf('tee') !== -1 || value.indexOf('t-shirt') !== -1) return 'Unisex tee';
    if (value.indexOf('travel') !== -1 && value.indexOf('mug') !== -1) return 'Travel mug';
    if (value.indexOf('mug') !== -1) return 'Mug';
    if (value.indexOf('coaster') !== -1) return 'Coaster';
    if (value.indexOf('desk mat') !== -1) return 'Desk mat';
    if (value.indexOf('pillow') !== -1) return 'Pillow';
    if (value.indexOf('sleeve') !== -1) return 'Laptop sleeve';
    if (value.indexOf('bottle') !== -1) return 'Bottle';
    if (value.indexOf('sock') !== -1) return 'Socks';
    if (value.indexOf('towel') !== -1) return 'Towel';
    return 'Product';
  }

  function money(price) {
    if (!price) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency || CURRENCY
    }).format(price.value || 0);
  }

  function firstImage(product, variant) {
    var image = variant && variant.images && variant.images[0] || product.images && product.images[0];
    return image ? (image.transformedUrl || image.url) : '';
  }

  function uniqueColors(product) {
    var seen = {};
    return (product.variants || []).reduce(function (colors, variant) {
      var color = variant.attributes && variant.attributes.color;
      if (color && color.name && !seen[color.name]) {
        seen[color.name] = true;
        colors.push({ name: color.name, swatch: color.swatch || '#ddd' });
      }
      return colors;
    }, []);
  }

  function uniqueSizes(product) {
    var seen = {};
    return (product.variants || []).reduce(function (sizes, variant) {
      var size = variant.attributes && variant.attributes.size;
      if (size && size.name && !seen[size.name]) {
        seen[size.name] = true;
        sizes.push(size.name);
      }
      return sizes;
    }, []);
  }

  function defaultSelection(product) {
    var variant = (product.variants || [])[0] || null;
    var attrs = variant && variant.attributes || {};
    return {
      productSlug: product.slug,
      color: attrs.color && attrs.color.name || '',
      size: attrs.size && attrs.size.name || '',
      quantity: 1
    };
  }

  function selectedVariant(product, selection) {
    var variants = product.variants || [];
    if (variants.length === 1) return variants[0];
    return variants.find(function (variant) {
      var attrs = variant.attributes || {};
      var color = attrs.color && attrs.color.name || '';
      var size = attrs.size && attrs.size.name || '';
      return (!selection.color || color === selection.color) && (!selection.size || size === selection.size);
    }) || variants[0];
  }

  function renderProductOptions(product, selection) {
    var colors = uniqueColors(product);
    var sizes = uniqueSizes(product);
    var colorHtml = colors.length ? '<div class="cs-storefront__option-group"><span>Colour</span><div class="cs-storefront__swatches">' + colors.map(function (color) {
      var active = color.name === selection.color ? ' is-active' : '';
      return '<button type="button" class="cs-storefront__swatch' + active + '" data-color="' + escapeHtml(color.name) + '" title="' + escapeHtml(color.name) + '"><span style="background:' + escapeHtml(color.swatch) + '"></span>' + escapeHtml(color.name) + '</button>';
    }).join('') + '</div></div>' : '';
    var sizeHtml = sizes.length ? '<div class="cs-storefront__option-group"><span>Size</span><div class="cs-storefront__sizes">' + sizes.map(function (size) {
      var active = size === selection.size ? ' is-active' : '';
      return '<button type="button" class="cs-storefront__size' + active + '" data-size="' + escapeHtml(size) + '">' + escapeHtml(size) + '</button>';
    }).join('') + '</div></div>' : '';
    return colorHtml + sizeHtml;
  }

  function render(root, state) {
    var product = state.products.find(function (item) { return item.slug === state.selection.productSlug; }) || state.products[0];
    if (!product) {
      root.innerHTML = '<section class="cs-storefront"><p>No products found for this collection.</p></section>';
      return;
    }
    var variant = selectedVariant(product, state.selection);
    var image = firstImage(product, variant);
    root.innerHTML = '<section class="cs-storefront" aria-live="polite">'
      + '<div class="cs-storefront__eyebrow">Code Snippets Store</div>'
      + '<div class="cs-storefront__grid">'
      + '<div class="cs-storefront__media">' + (image ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(product.name) + '">' : '') + '</div>'
      + '<div class="cs-storefront__panel">'
      + '<p class="cs-storefront__collection">' + escapeHtml(state.collection.name) + '</p>'
      + '<h1>' + escapeHtml(product.name) + '</h1>'
      + '<p class="cs-storefront__type">' + escapeHtml(productType(product)) + '</p>'
      + '<p class="cs-storefront__price">' + escapeHtml(money(variant && variant.unitPrice)) + '</p>'
      + '<div class="cs-storefront__products" role="listbox" aria-label="Products">' + state.products.map(function (item) {
        var active = item.slug === product.slug ? ' is-active' : '';
        return '<button type="button" class="cs-storefront__product' + active + '" data-product="' + escapeHtml(item.slug) + '">' + escapeHtml(productType(item)) + '</button>';
      }).join('') + '</div>'
      + renderProductOptions(product, state.selection)
      + '<label class="cs-storefront__qty">Qty <input type="number" min="1" max="99" value="' + escapeHtml(state.selection.quantity) + '"></label>'
      + '<button type="button" class="cs-storefront__add" data-variant="' + escapeHtml(variant && variant.id || '') + '">Add to cart</button>'
      + '<p class="cs-storefront__note">Uses Fourthwall cart and native checkout.</p>'
      + '</div></div></section>';
  }

  function bind(root, state) {
    root.addEventListener('click', function (event) {
      var productButton = event.target.closest('[data-product]');
      var colorButton = event.target.closest('[data-color]');
      var sizeButton = event.target.closest('[data-size]');
      var addButton = event.target.closest('.cs-storefront__add');
      if (productButton) {
        var product = state.products.find(function (item) { return item.slug === productButton.dataset.product; });
        state.selection = defaultSelection(product);
        syncUrl(state.selection);
        render(root, state);
      } else if (colorButton) {
        state.selection.color = colorButton.dataset.color;
        syncUrl(state.selection);
        render(root, state);
      } else if (sizeButton) {
        state.selection.size = sizeButton.dataset.size;
        syncUrl(state.selection);
        render(root, state);
      } else if (addButton) {
        addSelectedToCart(addButton, state);
      }
    });
    root.addEventListener('change', function (event) {
      if (event.target.matches('.cs-storefront__qty input')) {
        state.selection.quantity = Math.max(1, parseInt(event.target.value, 10) || 1);
        syncUrl(state.selection);
      }
    });
  }

  function syncUrl(selection) {
    var params = new URLSearchParams(window.location.search);
    params.set('prod', selection.productSlug);
    if (selection.color) params.set('color', selection.color); else params.delete('color');
    if (selection.size) params.set('size', selection.size); else params.delete('size');
    params.set('qty', selection.quantity || 1);
    window.history.replaceState({}, '', window.location.pathname + '?' + params.toString());
  }

  function selectionFromUrl(products) {
    var params = new URLSearchParams(window.location.search);
    var product = products.find(function (item) { return item.slug === params.get('prod'); }) || products[0];
    var selection = defaultSelection(product);
    if (params.get('color')) selection.color = params.get('color');
    if (params.get('size')) selection.size = params.get('size');
    if (params.get('qty')) selection.quantity = Math.max(1, parseInt(params.get('qty'), 10) || 1);
    return selection;
  }

  function getCartId() {
    return window.localStorage.getItem(CART_STORAGE_KEY);
  }

  function setCartId(cartId) {
    window.localStorage.setItem(CART_STORAGE_KEY, cartId);
  }

  function createCart(variantId, quantity) {
    return fetchJson('/carts', { currency: CURRENCY }, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: [{ variantId: variantId, quantity: quantity }], metadata: { source: 'cs_storefront' } })
    });
  }

  function addCartItem(cartId, variantId, quantity) {
    return fetchJson('/carts/' + encodeURIComponent(cartId) + '/items', {}, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ variantId: variantId, quantity: quantity })
    });
  }

  function addSelectedToCart(button, state) {
    var product = state.products.find(function (item) { return item.slug === state.selection.productSlug; }) || state.products[0];
    var variant = selectedVariant(product, state.selection);
    if (!variant || !variant.id) return;
    var quantity = Math.max(1, state.selection.quantity || 1);
    button.disabled = true;
    button.textContent = 'Adding…';
    var cartId = getCartId();
    var request = cartId ? addCartItem(cartId, variant.id, quantity).catch(function () {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return createCart(variant.id, quantity);
    }) : createCart(variant.id, quantity);
    request.then(function (cart) {
      if (cart && cart.id) setCartId(cart.id);
      button.textContent = 'Added';
      window.location.href = '/cart/checkout?cartId=' + encodeURIComponent(cart.id) + '&currency=' + encodeURIComponent(CURRENCY);
    }).catch(function (error) {
      console.error('[swag-shop] add to cart failed', error);
      button.disabled = false;
      button.textContent = 'Add to cart';
      window.location.href = '/products/' + encodeURIComponent(product.slug);
    });
  }

  function publicProducts(products) {
    return (products || []).filter(function (product) {
      return product.access && product.access.type === 'PUBLIC' && product.state && product.state.type === 'AVAILABLE';
    });
  }

  function productMatchesDesign(product, slug) {
    return designKey(product) === slug || (product.slug || '').indexOf(slug + '-') === 0;
  }

  function loadCollectionProducts(slug) {
    return fetchJson('/collections/' + encodeURIComponent(slug) + '/products', { size: 100, currency: CURRENCY })
      .then(function (response) {
        return { products: publicProducts(response.results), source: slug };
      })
      .catch(function () {
        if (!DESIGN_COLLECTIONS[slug]) throw new Error('Collection products unavailable for ' + slug);

        return fetchJson('/collections/all/products', { size: 100, currency: CURRENCY })
          .then(function (response) {
            return {
              products: publicProducts(response.results).filter(function (product) {
                return productMatchesDesign(product, slug);
              }),
              source: 'all-filtered'
            };
          });
      });
  }

  function isCollectionPage() {
    return /\/collections\/[^/?#]+/.test(window.location.pathname);
  }

  function ensureMountRoot() {
    var root = qs('root');
    if (root) return root;
    if (!isCollectionPage()) return null;

    var main = qs('.page__main') || qs('main') || document.body;
    root = document.createElement('root');
    root.setAttribute('data-cs-auto-root', 'true');
    main.insertBefore(root, main.firstChild);
    return root;
  }

  function renderTokenMissing(root) {
    root.innerHTML = '<section class="cs-storefront cs-storefront--error">'
      + '<strong>Storefront token missing.</strong>'
      + '<span>Add window.CS_SWAG_CONFIG.storefrontToken or root[data-storefront-token] in Fourthwall custom code.</span>'
      + '</section>';
  }

  function init() {
    var root = ensureMountRoot();
    if (!root || root.dataset.csStorefrontMounted) return;
    root.dataset.csStorefrontMounted = 'true';
    var main = root.closest('.page__main') || qs('.page__main');
    if (main) main.classList.add('cs-storefront-mounted');
    if (!STOREFRONT_TOKEN) {
      console.warn('[swag-shop] Missing Storefront API token. Add window.CS_SWAG_CONFIG.storefrontToken or root[data-storefront-token].');
      renderTokenMissing(root);
      return;
    }
    root.innerHTML = '<section class="cs-storefront cs-storefront--loading">Loading products…</section>';
    var slug = currentCollectionSlug();
    Promise.all([
      fetchJson('/collections', { size: 100 }),
      loadCollectionProducts(slug)
    ]).then(function (responses) {
      var collections = responses[0].results || [];
      var collection = collections.find(function (item) { return item.slug === slug; }) || { name: DESIGN_COLLECTIONS[slug] || 'Code Snippets', slug: slug };
      var products = responses[1].products;
      var state = { collection: collection, products: products, selection: selectionFromUrl(products) };
      render(root, state);
      bind(root, state);
      document.documentElement.classList.add('cs-storefront-ready');
      window.dispatchEvent(new CustomEvent('cs:storefront-ready', { detail: { collection: collection, products: products } }));
    }).catch(function (error) {
      console.error('[swag-shop] storefront failed', error);
      root.innerHTML = '<section class="cs-storefront cs-storefront--error">Could not load products. Please refresh or use the native product list below.</section>';
      if (main) main.classList.remove('cs-storefront-mounted');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
