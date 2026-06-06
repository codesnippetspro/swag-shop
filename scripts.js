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
    (window.CS_SWAG_CONFIG && window.CS_SWAG_CONFIG.storefrontToken) || ''
  );
  var API_BASE = 'https://storefront-api.fourthwall.com/v1';
  var CURRENCY = 'USD';
  var CART_STORAGE_KEY = 'cs_storefront_cart_id';
  var IMAGE_CACHE = {};
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

  function lowestCollectionPrice(products) {
    return (products || []).reduce(function (lowest, product) {
      (product.variants || []).forEach(function (variant) {
        var price = variant && variant.unitPrice;
        var value = price && parseFloat(price.value);
        if (!price || !isFinite(value)) return;
        if (!lowest || value < parseFloat(lowest.value)) {
          lowest = { value: value, currency: price.currency || CURRENCY };
        }
      });
      return lowest;
    }, null);
  }

  function imageUrl(image) {
    return image ? (image.transformedUrl || image.url || '') : '';
  }

  function preloadImage(url) {
    if (!url || IMAGE_CACHE[url]) return;
    var image = new Image();
    image.decoding = 'async';
    image.src = url;
    IMAGE_CACHE[url] = image;
  }

  function firstImage(product, variant) {
    var image = variant && variant.images && variant.images[0] || product.images && product.images[0];
    return imageUrl(image);
  }

  function productImagesForVariant(product, variant) {
    var seen = {};
    var images = [];

    function add(image) {
      var url = imageUrl(image);
      if (!url || seen[url]) return;
      seen[url] = true;
      images.push(url);
    }

    (variant && variant.images || []).forEach(add);
    if (!images.length) (product.images || []).forEach(add);
    images.forEach(preloadImage);
    return images;
  }

  function preloadProductImages(product) {
    (product && product.images || []).forEach(function (image) { preloadImage(imageUrl(image)); });
    (product && product.variants || []).forEach(function (variant) {
      (variant.images || []).forEach(function (image) { preloadImage(imageUrl(image)); });
    });
  }

  function preloadProductsImages(products) {
    (products || []).forEach(preloadProductImages);
  }

  function stableParam(value) {
    return String(value == null ? '' : value).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function shareSku(value) {
    return String(value == null ? '' : value).trim().toUpperCase();
  }

  function sameShareSku(left, right) {
    return stableParam(left) === stableParam(right);
  }

  function variantColor(variant) {
    var color = variant && variant.attributes && variant.attributes.color;
    return color && color.name || '';
  }

  function variantSize(variant) {
    var size = variant && variant.attributes && variant.attributes.size;
    return size && size.name || '';
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
    return selectionFromVariant(product, variant, 1);
  }

  function selectionFromVariant(product, variant, quantity) {
    return {
      productSlug: product && product.slug || '',
      productId: product && product.id || '',
      variantId: variant && variant.id || '',
      variantSku: variant && variant.sku || '',
      color: variantColor(variant),
      size: variantSize(variant),
      previewImageUrl: firstImage(product, variant),
      quantity: Math.max(1, parseInt(quantity, 10) || 1)
    };
  }

  function selectedVariant(product, selection) {
    var variants = product.variants || [];
    if (!variants.length) return null;
    if (selection.variantSku) {
      var bySku = variants.find(function (variant) { return sameShareSku(variant.sku, selection.variantSku); });
      if (bySku) return bySku;
    }
    if (selection.variantId) {
      var selectedId = stableParam(selection.variantId);
      var byId = variants.find(function (variant) { return stableParam(variant.id) === selectedId; });
      if (byId) return byId;
    }
    if (variants.length === 1) return variants[0];
    return variants.find(function (variant) {
      var color = variantColor(variant);
      var size = variantSize(variant);
      return (!selection.color || color === selection.color) && (!selection.size || size === selection.size);
    }) || variants[0];
  }

  function stockQuantity(stock) {
    if (!stock) return null;
    var fields = ['quantity', 'availableQuantity', 'available', 'count'];
    for (var index = 0; index < fields.length; index++) {
      var value = stock[fields[index]];
      if (value !== undefined && value !== null && value !== '') return parseInt(value, 10);
    }
    return null;
  }

  function variantStockStatus(variant) {
    var stock = variant && variant.stock || {};
    var type = String(stock.type || '').toUpperCase();
    var quantity = stockQuantity(stock);
    if (type === 'UNLIMITED' || quantity > 3) return { available: true, label: 'in stock' };
    if (quantity > 0 && quantity <= 3) return { available: true, label: 'Only ' + quantity + ' ' + (quantity === 1 ? 'item' : 'items') + ' left' };
    return { available: false, label: 'Sold out' };
  }

  function renderStockNote(status) {
    if (!status.available) return '<p class="cs-ship cs-ship--soldout">Sold out</p>';
    return '<p class="cs-ship">' + escapeHtml(status.label) + ' · ships in 3 to 5 days · free over $50</p>';
  }

  function renderProductOptions(product, selection) {
    var colors = uniqueColors(product);
    var sizes = uniqueSizes(product);
    var colorHtml = colors.length > 1 ? '<div class="cs-storefront__option-group"><span>Colour</span><div class="cs-storefront__swatches">' + colors.map(function (color) {
      var active = color.name === selection.color ? ' is-active' : '';
      return '<button type="button" class="cs-storefront__swatch' + active + '" data-color="' + escapeHtml(color.name) + '" title="' + escapeHtml(color.name) + '"><span style="background:' + escapeHtml(color.swatch) + '"></span>' + escapeHtml(color.name) + '</button>';
    }).join('') + '</div></div>' : '';
    var sizeHtml = sizes.length > 1 ? '<div class="cs-storefront__option-group"><span>Size</span><div class="cs-storefront__sizes">' + sizes.map(function (size) {
      var active = size === selection.size ? ' is-active' : '';
      return '<button type="button" class="cs-storefront__size' + active + '" data-size="' + escapeHtml(size) + '">' + escapeHtml(size) + '</button>';
    }).join('') + '</div></div>' : '';
    return colorHtml + sizeHtml;
  }

  function renderQuantityControl(quantity) {
    var value = Math.max(1, parseInt(quantity, 10) || 1);
    var isCustom = value >= 10;
    var options = [];
    for (var index = 1; index <= 9; index++) {
      options.push('<option value="' + index + '"' + (value === index ? ' selected' : '') + '>' + index + '</option>');
    }
    options.push('<option value="more"' + (isCustom ? ' selected' : '') + '>10+</option>');

    return '<label class="cs-qty">'
      + '<span class="cs-qty__select' + (isCustom ? ' is-hidden' : '') + '"><select aria-label="Quantity" data-qty-select>' + options.join('') + '</select><span class="cs-qty__chev" aria-hidden="true">⌄</span></span>'
      + '<span class="cs-qty__input' + (isCustom ? '' : ' is-hidden') + '"><input type="number" inputmode="numeric" pattern="[0-9]*" min="10" max="99" value="' + escapeHtml(isCustom ? value : 10) + '" aria-label="Quantity" placeholder="Qty" data-qty-input></span>'
      + '</label>';
  }


  function isHomePage() {
    var segments = window.location.pathname.split('/').filter(Boolean);
    if (!segments.length) return true;
    return segments.length === 1 && /^[a-z]{2}(?:-[a-z0-9]{2,4})?$/i.test(segments[0]);
  }

  function displayCollectionName(slug, fallback) {
    return DESIGN_COLLECTIONS[slug] || fallback || slug.replace(/-/g, ' ').replace(/\b\w/g, function (char) { return char.toUpperCase(); });
  }

  function productCountLabel(count) {
    return count === 1 ? '1 product' : count + ' products';
  }

  function designCardText(name) {
    var words = String(name || '').split(/\s+/).filter(Boolean);
    if (words.length <= 2) return words.join(' ');
    return words.slice(0, 4).join(' ');
  }

  function randomItem(items) {
    if (!items || !items.length) return null;
    var random = window.crypto && window.crypto.getRandomValues ? window.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 : Math.random();
    return items[Math.floor(random * items.length)];
  }

  function renderHome(root, state) {
    var designs = state.collections.filter(function (collection) {
      return DESIGN_COLLECTIONS[collection.slug];
    });
    var hero = randomItem(designs) || null;
    var heroName = hero ? displayCollectionName(hero.slug, hero.name || hero.title) : 'Code Snippets';
    var heroCount = hero ? state.counts[hero.slug] || hero.productsCount || hero.products_count || 0 : 0;
    var heroHref = hero ? '/collections/' + escapeHtml(hero.slug) : '#cs-designs';
    var cards = designs.map(function (collection) {
      var count = state.counts[collection.slug] || collection.productsCount || collection.products_count || 0;
      var name = displayCollectionName(collection.slug, collection.name || collection.title);
      return '<a class="cs-dcard" href="/collections/' + escapeHtml(collection.slug) + '">'
        + '<div class="cs-dcard__art"><div class="cs-meme"><div class="cs-meme__stack"><span class="cs-meme__block">' + designCardText(name) + '</span></div></div><span class="cs-dcard__count">' + escapeHtml(productCountLabel(count)) + '</span></div>'
        + '<div class="cs-dcard__info"><span class="cs-dcard__name">' + escapeHtml(name) + '</span></div><span class="cs-btn cs-btn--primary cs-btn--small cs-btn--full">View</span>'
        + '</a>';
    }).join('');

    root.innerHTML = '<section class="cs-storefront cs-storefront--home">'
      + '<section class="cs-hero"><div class="cs-wrapper cs-hero__inner"><div class="cs-hero__copy"><span class="cs-eyebrow">V3 · Configure flow</span><h1 class="cs-hero__title">Pick a design.<br>Configure the goods.</h1><p class="cs-hero__sub">Open a design, choose the product, color and size, then add it to your cart from one page.</p><div class="cs-hero__cta"><a class="cs-btn cs-btn--primary cs-btn--large" href="#cs-designs">Browse Designs</a><a class="cs-btn cs-btn--ghostlight cs-btn--large" href="' + heroHref + '">Configure a Design →</a></div></div><a class="cs-hero__art" href="' + heroHref + '"><div class="cs-hero__stage"><span class="cs-badge">' + escapeHtml(productCountLabel(heroCount)) + '</span><div class="cs-meme"><div class="cs-meme__stack"><span class="cs-meme__block">' + designCardText(heroName) + '</span></div></div></div></a></div></section>'
      + '<section class="cs-section cs-home-designs" id="cs-designs"><div class="cs-wrapper"><div class="cs-section__head"><span class="cs-eyebrow">Shop by design</span><h2 class="cs-h2">Open a design to configure it</h2><p class="cs-section__desc">Each design is a collection. Inside, a single configurator lets you choose the product, color and size. No hopping between pages.</p></div><div class="cs-grid cs-grid--4">' + cards + '</div></div></section>'
      + '</section>';
  }

  function renderProductPreview(product, variant, selection) {
    var image = selection && selection.previewImageUrl || firstImage(product, variant);
    preloadImage(image);
    return '<div class="pdfx-cfgprev">'
      + (image ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(product.name) + '" loading="eager" decoding="sync">' : '<div class="pdfx-shape pdfx-shape--lg"><span class="pdfx-shape__label">' + escapeHtml(productType(product)) + '</span></div>')
      + '<span class="pdfx-cfgprev__tag">' + escapeHtml(productType(product)) + '</span>'
      + '</div>';
  }

  function renderProductImageSlider(product, variant, selection) {
    var images = productImagesForVariant(product, variant);
    if (images.length < 2) return '<div class="pdfx-imgrail pdfx-imgrail--empty" aria-hidden="true"></div>';
    var active = selection && selection.previewImageUrl || firstImage(product, variant);
    return '<div class="pdfx-imgrail" aria-label="Product images">' + images.map(function (image, index) {
      var current = image === active ? ' is-active' : '';
      return '<button type="button" class="pdfx-imgthumb' + current + '" data-preview-image="' + escapeHtml(image) + '" aria-label="Show product image ' + escapeHtml(index + 1) + '"><img src="' + escapeHtml(image) + '" alt="" width="145" height="145" loading="eager" decoding="sync"></button>';
    }).join('') + '</div>';
  }

  function sanitizeProductHtml(html) {
    var template = document.createElement('template');
    template.innerHTML = String(html || '');
    template.content.querySelectorAll('script, style, iframe, object, embed').forEach(function (node) {
      node.remove();
    });
    template.content.querySelectorAll('*').forEach(function (node) {
      Array.prototype.slice.call(node.attributes).forEach(function (attr) {
        if (/^on/i.test(attr.name) || /javascript:/i.test(attr.value)) {
          node.removeAttribute(attr.name);
        }
      });
    });
    return template.innerHTML;
  }

  function accordionTitle(type, fallback) {
    var titles = {
      MORE_DETAILS: 'Product details',
      SIZE_AND_FIT: 'Size & fit',
      GUARANTEE_AND_RETURNS: 'Guarantee & returns'
    };
    return titles[type] || fallback || 'Product information';
  }

  function renderProductAccordion(product) {
    var rows = [];
    (product.additionalInformation || []).forEach(function (item) {
      if (!item || !item.bodyHtml) return;
      rows.push({ title: item.title || accordionTitle(item.type), body: sanitizeProductHtml(item.bodyHtml) });
    });
    if (product.sizeGuide && (product.sizeGuide.description || product.sizeGuide.previewUrl || product.sizeGuide.fileUrl || product.sizeGuide.fitGuideDescription)) {
      var sizeBody = '';
      if (product.sizeGuide.description) sizeBody += '<p>' + escapeHtml(product.sizeGuide.description) + '</p>';
      if (product.sizeGuide.fitGuideDescription) sizeBody += '<p>' + escapeHtml(product.sizeGuide.fitGuideDescription) + '</p>';
      if (product.sizeGuide.previewUrl) sizeBody += '<p><a href="' + escapeHtml(product.sizeGuide.previewUrl) + '" target="_blank" rel="noopener">View size guide preview</a></p>';
      if (product.sizeGuide.fileUrl) sizeBody += '<p><a href="' + escapeHtml(product.sizeGuide.fileUrl) + '" target="_blank" rel="noopener">Download size guide</a></p>';
      rows.push({ title: 'Size guide', body: sizeBody });
    }
    if (!rows.length && product.description) {
      rows.push({ title: 'Product details', body: sanitizeProductHtml(product.description) });
    }
    if (!rows.length) return '';
    return '<div class="pdfx-acc">' + rows.map(function (row, index) {
      return '<div class="pdfx-acc__row"><button type="button" class="pdfx-acc__head"><span class="pdfx-acc__check">✓</span><span class="pdfx-acc__title">' + escapeHtml(row.title) + '</span><span class="pdfx-acc__plus">' + (index === 0 ? '−' : '+') + '</span></button><div class="pdfx-acc__body"' + (index === 0 ? '' : ' hidden') + '>' + row.body + '</div></div>';
    }).join('') + '</div>';
  }

  function renderMediumRail(products, activeProduct) {
    return '<div class="pdfx-medrail">' + products.map(function (item) {
      var variant = (item.variants || [])[0] || null;
      var active = item.slug === activeProduct.slug;
      return '<div class="pdfx-medslot' + (active ? ' pdfx-medslot--on' : '') + '"><button type="button" class="pdfx-medcard' + (active ? ' pdfx-medcard--on' : '') + '" data-product="' + escapeHtml(item.slug) + '">'
        + '<div class="pdfx-medcard__stage">' + (active ? '<span class="pdfx-medcard__sel">Selected</span>' : '') + (firstImage(item, variant) ? '<img src="' + escapeHtml(firstImage(item, variant)) + '" alt="' + escapeHtml(item.name) + '">' : '') + '</div>'
        + '<span class="pdfx-medcard__name">' + escapeHtml(productType(item)) + '</span><span class="pdfx-medcard__meta"><b>' + escapeHtml(money(variant && variant.unitPrice)) + '</b><span>' + escapeHtml(uniqueColors(item).length ? uniqueColors(item).length + ' colors' : 'one size') + '</span></span>'
        + '</button></div>';
    }).join('') + '</div>';
  }

  function renderConfigureSection(product, variant, state, configureStep) {
    var stockStatus = variantStockStatus(variant);
    return '<section class="cs-section cs-storefront__configure"><div class="cs-wrapper"><span class="pdfx-steppill"><span class="n">' + configureStep + '</span>Configure your ' + escapeHtml(productType(product)) + '</span><div class="pdfx-stephead"><h2 class="cs-h2">Make it yours.</h2></div><div class="pdfx-cfgrid">' + renderProductPreview(product, variant, state.selection) + '<div class="pdfx-cfg">' + renderProductOptions(product, state.selection) + '<div class="cs-field"><div class="cs-buyrow">' + renderQuantityControl(state.selection.quantity) + '<div class="cs-buyrow__price">' + escapeHtml(money(variant && variant.unitPrice)) + '</div><button type="button" class="cs-btn cs-btn--primary cs-btn--large cs-btn--full cs-storefront__add" data-variant="' + escapeHtml(variant && variant.id || '') + '"' + (stockStatus.available ? '' : ' disabled') + '>' + (stockStatus.available ? 'Checkout now' : 'Sold out') + '</button></div></div>' + renderStockNote(stockStatus) + '<div class="pdfx-url" data-copy-link="' + escapeHtml(window.location.href) + '"><button type="button" aria-label="Copy link" title="Share link"><i class="gg-share" aria-hidden="true"></i></button><code>' + escapeHtml(window.location.pathname + window.location.search) + '</code></div>' + renderProductImageSlider(product, variant, state.selection) + '</div></div>' + renderProductAccordion(product) + '</div></section>';
  }

  function updateConfigureSection(root, state) {
    var product = state.products.find(function (item) { return item.slug === state.selection.productSlug || stableParam(item.id) === stableParam(state.selection.productId); }) || state.products[0];
    if (!product) return;
    var variant = selectedVariant(product, state.selection);
    var configureStep = state.products.length > 1 ? '2' : '1';
    var section = root.querySelector('.cs-storefront__configure');
    if (!section) {
      render(root, state);
      return;
    }
    var template = document.createElement('template');
    template.innerHTML = renderConfigureSection(product, variant, state, configureStep);
    section.replaceWith(template.content.firstElementChild);
  }

  function render(root, state) {
    if (state.page === 'home') {
      renderHome(root, state);
      return;
    }

    var product = state.products.find(function (item) { return item.slug === state.selection.productSlug || stableParam(item.id) === stableParam(state.selection.productId); }) || state.products[0];
    if (!product) {
      root.innerHTML = '<section class="cs-storefront"><p>No products found for this collection.</p></section>';
      return;
    }
    var variant = selectedVariant(product, state.selection);
    var collectionPrice = lowestCollectionPrice(state.products);
    var collectionName = displayCollectionName(state.collection.slug, state.collection.name || state.collection.title);
    var hasProductPicker = state.products.length > 1;
    var pickerHtml = hasProductPicker ? '<section class="cs-section cs-section--grey"><div class="cs-wrapper"><span class="pdfx-steppill"><span class="n">1</span>Pick a product</span><div class="pdfx-stephead"><h2 class="cs-h2">Same design. ' + escapeHtml(productCountLabel(state.products.length)) + '.</h2><p class="hint">Pick what you want it on. Options for each product appear below.</p></div>' + renderMediumRail(state.products, product) + '</div></section>' : '';
    var configureStep = hasProductPicker ? '2' : '1';
    var heroBlurb = hasProductPicker ? 'One design, every available product. Pick the medium, choose the variant, then hand off to the native Fourthwall checkout.' : 'Choose the variant, then hand off to the native Fourthwall checkout.';
    root.innerHTML = '<section class="cs-storefront cs-storefront--collection">'
      + '<div class="cs-wrapper cs-pdp-wrapper">'
      + '<div class="pdfx-pdp__top">'
      + '<div class="pdfx-pdpart"><span class="pdfx-pdpart__c tl">CODE SNIPPETS</span><span class="pdfx-pdpart__c tr">LIMITED</span><span class="pdfx-pdpart__c bl">' + escapeHtml(state.collection.slug || '') + '</span><span class="pdfx-pdpart__c br">est. 2026</span><div class="pdfx-pdpart__type"><span>' + designCardText(collectionName) + '</span></div></div>'
      + '<div class="pdfx-pdp__info"><span class="pdfx-eyebrowpill">Collection · ' + escapeHtml(productCountLabel(state.products.length)) + '</span><h1 class="cs-h1">' + escapeHtml(collectionName) + '</h1><div class="pdfx-pdp__rate">4.0 · 97 reviews</div><p class="pdfx-pdp__blurb">' + escapeHtml(heroBlurb) + '</p><div class="pdfx-pdp__facts"><div class="pdfx-pdp__fact"><span class="lab">From</span><b>' + escapeHtml(money(collectionPrice)) + '</b></div><div class="pdfx-pdp__fact"><span class="lab">Available on</span><b>' + escapeHtml(productCountLabel(state.products.length)) + '</b></div><div class="pdfx-pdp__fact"><span class="lab">Ships in</span><b>3 to 5 days</b></div></div></div>'
      + '</div></div>'
      + pickerHtml
      + renderConfigureSection(product, variant, state, configureStep)
      + '</section>';
  }

  function updateSelectionFromVariant(state, product, variant) {
    state.selection = selectionFromVariant(product, variant, state.selection.quantity);
  }

  function updatePreviewImage(root, url) {
    if (!url) return;
    preloadImage(url);
    var preview = root.querySelector('.pdfx-cfgprev img');
    if (preview && preview.getAttribute('src') !== url) {
      preview.src = url;
    }
    root.querySelectorAll('.pdfx-imgthumb').forEach(function (button) {
      button.classList.toggle('is-active', button.dataset.previewImage === url);
    });
  }

  function variantForOption(product, selection, optionName, optionValue) {
    var colors = uniqueColors(product);
    var sizes = uniqueSizes(product);
    var desiredColor = optionName === 'color' ? optionValue : selection.color;
    var desiredSize = optionName === 'size' ? optionValue : selection.size;
    if (colors.length <= 1) desiredColor = '';
    if (sizes.length <= 1) desiredSize = '';
    return (product.variants || []).find(function (variant) {
      var color = variantColor(variant);
      var size = variantSize(variant);
      return (!desiredColor || color === desiredColor) && (!desiredSize || size === desiredSize);
    }) || (product.variants || [])[0] || null;
  }

  function bind(root, state) {
    root.addEventListener('click', function (event) {
      var productButton = event.target.closest('[data-product]');
      var colorButton = event.target.closest('[data-color]');
      var sizeButton = event.target.closest('[data-size]');
      var addButton = event.target.closest('.cs-storefront__add');
      var previewButton = event.target.closest('[data-preview-image]');
      var copyTarget = event.target.closest('.pdfx-url[data-copy-link]');
      var accordionButton = event.target.closest('.pdfx-acc__head');
      if (productButton) {
        var product = state.products.find(function (item) { return item.slug === productButton.dataset.product; });
        state.selection = defaultSelection(product);
        syncUrl(state.selection, product, selectedVariant(product, state.selection));
        render(root, state);
      } else if (colorButton) {
        var colorProduct = state.products.find(function (item) { return item.slug === state.selection.productSlug || stableParam(item.id) === stableParam(state.selection.productId); }) || state.products[0];
        updateSelectionFromVariant(state, colorProduct, variantForOption(colorProduct, state.selection, 'color', colorButton.dataset.color));
        syncUrl(state.selection, colorProduct, selectedVariant(colorProduct, state.selection));
        updateConfigureSection(root, state);
      } else if (sizeButton) {
        var sizeProduct = state.products.find(function (item) { return item.slug === state.selection.productSlug || stableParam(item.id) === stableParam(state.selection.productId); }) || state.products[0];
        updateSelectionFromVariant(state, sizeProduct, variantForOption(sizeProduct, state.selection, 'size', sizeButton.dataset.size));
        syncUrl(state.selection, sizeProduct, selectedVariant(sizeProduct, state.selection));
        updateConfigureSection(root, state);
      } else if (addButton) {
        addSelectedToCart(addButton, state);
      } else if (previewButton) {
        state.selection.previewImageUrl = previewButton.dataset.previewImage;
        updatePreviewImage(root, state.selection.previewImageUrl);
      } else if (copyTarget) {
        shareOrCopyLink(copyTarget);
      } else if (accordionButton) {
        var body = accordionButton.parentElement && accordionButton.parentElement.querySelector('.pdfx-acc__body');
        var marker = accordionButton.querySelector('.pdfx-acc__plus');
        if (body) {
          body.hidden = !body.hidden;
          if (marker) marker.textContent = body.hidden ? '+' : '−';
        }
      }
    });
    root.addEventListener('keydown', function (event) {
      var copyTarget = event.target.closest('.pdfx-url[data-copy-link]');
      if (!copyTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      shareOrCopyLink(copyTarget);
    });
    root.addEventListener('change', function (event) {
      if (event.target.matches('[data-qty-select]')) {
        var selectValue = event.target.value;
        state.selection.quantity = selectValue === 'more' ? 10 : Math.max(1, parseInt(selectValue, 10) || 1);
        var selectProduct = state.products.find(function (item) { return item.slug === state.selection.productSlug || stableParam(item.id) === stableParam(state.selection.productId); }) || state.products[0];
        syncUrl(state.selection, selectProduct, selectedVariant(selectProduct, state.selection));
        render(root, state);
        if (selectValue === 'more') {
          var qtyInput = root.querySelector('[data-qty-input]');
          if (qtyInput) qtyInput.focus();
        }
      } else if (event.target.matches('[data-qty-input], .cs-storefront__qty input, .cs-qty input')) {
        state.selection.quantity = Math.max(1, parseInt(event.target.value, 10) || 1);
        var qtyProduct = state.products.find(function (item) { return item.slug === state.selection.productSlug || stableParam(item.id) === stableParam(state.selection.productId); }) || state.products[0];
        syncUrl(state.selection, qtyProduct, selectedVariant(qtyProduct, state.selection));
      }
    });
  }

  function shouldUseNativeShare() {
    if (!navigator.share) return false;
    return window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse), (max-width: 767px)').matches;
  }

  function shareOrCopyLink(target) {
    var value = window.location.href;
    if (shouldUseNativeShare()) {
      navigator.share({ title: document.title || 'Code Snippets Swag Shop', url: value }).catch(function (error) {
        if (error && error.name === 'AbortError') return;
        copyShareLink(target, value);
      });
      return;
    }
    copyShareLink(target, value);
  }

  function copyShareLink(target, value) {
    value = value || window.location.href;
    var button = target.querySelector('button') || target;
    var originalLabel = button.getAttribute('aria-label') || 'Copy link';

    function updateLabel(label) {
      target.setAttribute('aria-label', label);
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      target.classList.toggle('pdfx-url--copied', label === 'Copied');
      window.setTimeout(function () {
        target.setAttribute('aria-label', originalLabel);
        button.setAttribute('aria-label', originalLabel);
        button.setAttribute('title', originalLabel);
        target.classList.remove('pdfx-url--copied');
      }, 1800);
    }

    function fallbackCopy() {
      var textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', 'readonly');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      var copied = false;
      try {
        copied = document.execCommand('copy');
      } catch (error) {
        copied = false;
      }

      document.body.removeChild(textarea);
      if (copied) {
        updateLabel('Copied');
        return;
      }
      updateLabel('Copy failed');
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value).then(function () {
        updateLabel('Copied');
      }).catch(fallbackCopy);
      return;
    }

    fallbackCopy();
  }

  function syncUrl(selection, product, variant) {
    var params = new URLSearchParams();
    if (variant && variant.sku) {
      params.set('v', shareSku(variant.sku));
    } else {
      if (product && (product.id || product.slug)) params.set('p', stableParam(product.id || product.slug));
      if (variant && variant.id) params.set('v', stableParam(variant.id));
    }
    if (Math.max(1, parseInt(selection.quantity, 10) || 1) !== 1) {
      params.set('q', selection.quantity || 1);
    }
    window.history.replaceState({}, '', window.location.pathname + '?' + params.toString());
    var shareCode = qs('.pdfx-url code');
    var shareButton = qs('[data-copy-link]');
    if (shareCode) shareCode.textContent = window.location.pathname + window.location.search;
    if (shareButton) shareButton.setAttribute('data-copy-link', window.location.href);
  }

  function selectionFromUrl(products) {
    var params = new URLSearchParams(window.location.search);
    var productParam = params.get('p') || params.get('prod') || '';
    var variantParam = params.get('v') || params.get('sku') || params.get('variant') || '';
    var product = null;
    var variant = null;
    if (variantParam) {
      products.some(function (item) {
        variant = (item.variants || []).find(function (candidate) {
          return sameShareSku(candidate.sku, variantParam) || stableParam(candidate.id) === stableParam(variantParam);
        });
        if (variant) product = item;
        return !!variant;
      });
    }
    product = product || products.find(function (item) {
      return stableParam(item.id) === stableParam(productParam) || stableParam(item.slug) === stableParam(productParam) || item.slug === productParam;
    }) || products[0];
    var selection = defaultSelection(product);
    if (!variant && (params.get('color') || params.get('size') || params.get('c') || params.get('s'))) {
      selection.color = params.get('color') || params.get('c') || selection.color;
      selection.size = params.get('size') || params.get('s') || selection.size;
      variant = selectedVariant(product, selection);
    }
    if (variant) selection = selectionFromVariant(product, variant, selection.quantity);
    selection.quantity = Math.max(1, parseInt(params.get('q') || params.get('qty'), 10) || 1);
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
    var product = state.products.find(function (item) { return item.slug === state.selection.productSlug || stableParam(item.id) === stableParam(state.selection.productId); }) || state.products[0];
    var variant = selectedVariant(product, state.selection);
    var stockStatus = variantStockStatus(variant);
    if (!variant || !variant.id || !stockStatus.available) return;
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
      button.textContent = 'Checkout now';
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
    var sourceRoot = qs('root');
    var pageMain = (sourceRoot && sourceRoot.closest('.page__main')) || qs('.page__main');
    if (!pageMain && !isCollectionPage()) return null;
    pageMain = pageMain || qs('main') || document.body;

    if (!STOREFRONT_TOKEN && sourceRoot) {
      STOREFRONT_TOKEN = decodeStorefrontToken(sourceRoot.getAttribute('data-storefront-token') || '');
    }

    if (sourceRoot) {
      sourceRoot.remove();
    }

    return pageMain;
  }

  function renderTokenMissing(root) {
    root.innerHTML = '<section class="cs-storefront cs-storefront--error">'
      + '<strong>Storefront token missing.</strong>'
      + '<span>Add window.CS_SWAG_CONFIG.storefrontToken or root[data-storefront-token] in Fourthwall custom code.</span>'
      + '</section>';
  }

  function renderSkeleton(root) {
    root.innerHTML = '<section class="cs-storefront cs-storefront--loading" aria-busy="true">'
      + '<div class="cs-skeleton cs-skeleton--hero"><span></span><b></b><p></p><p></p></div>'
      + '<div class="cs-skeleton-grid"><span></span><span></span><span></span><span></span></div>'
      + '</section>';
  }

  function init() {
    var mount = ensureMountRoot();
    if (!mount || mount.dataset.csStorefrontMounted) return;
    mount.dataset.csStorefrontMounted = 'true';
    mount.classList.add('cs-storefront-mounted');
    if (!STOREFRONT_TOKEN) {
      console.warn('[swag-shop] Missing Storefront API token. Add window.CS_SWAG_CONFIG.storefrontToken or root[data-storefront-token].');
      renderTokenMissing(mount);
      return;
    }
    renderSkeleton(mount);
    var slug = currentCollectionSlug();
    var request = isHomePage() ? Promise.all([
      fetchJson('/collections', { size: 100 }),
      fetchJson('/collections/all/products', { size: 100, currency: CURRENCY })
    ]).then(function (responses) {
      var collections = responses[0].results || [];
      var counts = {};
      publicProducts(responses[1].results).forEach(function (product) {
        var key = designKey(product);
        counts[key] = (counts[key] || 0) + 1;
      });
      return { page: 'home', collections: collections, counts: counts };
    }) : Promise.all([
      fetchJson('/collections', { size: 100 }),
      loadCollectionProducts(slug)
    ]).then(function (responses) {
      var collections = responses[0].results || [];
      var collection = collections.find(function (item) { return item.slug === slug; }) || { name: DESIGN_COLLECTIONS[slug] || 'Code Snippets', slug: slug };
      var products = responses[1].products;
      return { page: 'collection', collection: collection, products: products, selection: selectionFromUrl(products) };
    });

    request.then(function (state) {
      if (state.page !== 'home') {
        preloadProductsImages(state.products);
        var initialProduct = state.products.find(function (item) { return item.slug === state.selection.productSlug || stableParam(item.id) === stableParam(state.selection.productId); }) || state.products[0];
        syncUrl(state.selection, initialProduct, selectedVariant(initialProduct, state.selection));
      }
      render(mount, state);
      if (state.page !== 'home') bind(mount, state);
      document.documentElement.classList.add('cs-storefront-ready');
      window.dispatchEvent(new CustomEvent('cs:storefront-ready', { detail: state }));
    }).catch(function (error) {
      console.error('[swag-shop] storefront failed', error);
      mount.innerHTML = '<section class="cs-storefront cs-storefront--error">Could not load products. Please refresh or use the native product list below.</section>';
      mount.classList.remove('cs-storefront-mounted');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
