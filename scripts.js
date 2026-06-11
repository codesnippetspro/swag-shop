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

  function isSupportedCurrency(value) {
    return ['USD', 'EUR', 'GBP', 'CAD', 'AUD'].indexOf(String(value || '').toUpperCase()) !== -1;
  }

  function requestedCurrency() {
    var params = new URLSearchParams(window.location.search || '');
    var explicit = (params.get('currency') || '').toUpperCase();
    if (isSupportedCurrency(explicit)) return explicit;

    var localeMatch = window.location.pathname.match(/^\/en-([a-z]{3})(?:\/|$)/i);
    var localeCurrency = localeMatch ? localeMatch[1].toUpperCase() : '';
    if (isSupportedCurrency(localeCurrency)) return localeCurrency;

    var cookieMatch = document.cookie.match(/(?:^|;\s*)currency=([^;]+)/i);
    var cookieCurrency = cookieMatch ? decodeURIComponent(cookieMatch[1]).toUpperCase() : '';
    if (isSupportedCurrency(cookieCurrency)) return cookieCurrency;

    return 'USD';
  }

  var STOREFRONT_TOKEN = decodeStorefrontToken(
    (window.CS_SWAG_CONFIG && window.CS_SWAG_CONFIG.storefrontToken) || ''
  );
  var API_BASE = 'https://storefront-api.fourthwall.com/v1';
  var CURRENCY = requestedCurrency();
  var CART_STORAGE_KEY = 'cs_storefront_cart_id';
  var IMAGE_CACHE = {};
  var RESERVED_COLLECTION_SLUGS = { all: true };
  var COLLECTION_COVER_IMAGES = {
    'brain-100-focus-0': 'brain-100-focus-0.webp',
    'coder': 'coder.webp',
    'emoji-code': 'emoji-code.webp',
    'error-404': 'error-404.webp',
    'im-this-old': 'im-this-old.webp',
    'in-a-relationship': 'in-a-relationship.webp',
    'make-it-work': 'make-it-work-1.webp',
    'make-it-work-1': 'make-it-work-1.webp',
    'make-it-work-2': 'make-it-work-2.webp',
    'my-therapist-says': 'my-therapist-says.webp',
    'powered-by-coffee': 'powered-by-coffee.webp',
    'the-snippers': 'snippers.webp',
    'snippet-activated': 'snippet-activated.webp',
    'tabs-over-spaces': 'tabs-over-spaces.webp'
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

  function currentProductSlug() {
    var match = window.location.pathname.match(/\/products\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function isVisibleCollection(collection) {
    return collection && collection.slug && !RESERVED_COLLECTION_SLUGS[collection.slug];
  }

  function visibleCollections(collections) {
    return (collections || []).filter(isVisibleCollection);
  }

  function collectionsBySpecificSlug(collections) {
    return visibleCollections(collections).slice().sort(function (left, right) {
      return String(right.slug || '').length - String(left.slug || '').length;
    });
  }

  function designKey(product, collections) {
    var slug = (product.slug || '').toLowerCase();
    var matches = collectionsBySpecificSlug(collections);
    for (var i = 0; i < matches.length; i++) {
      var collectionSlug = String(matches[i].slug || '').toLowerCase();
      if (slug === collectionSlug || slug.indexOf(collectionSlug + '-') === 0) return matches[i].slug;
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

  function assetUrl(path) {
    return 'https://codesnippetspro.github.io/swag-shop/' + path.replace(/^\//, '');
  }

  function collectionCoverImage(collection) {
    var direct = imageUrl(collection && (collection.image || collection.thumbnail || collection.coverImage));
    if (direct) return direct;
    var file = collection && COLLECTION_COVER_IMAGES[collection.slug];
    return file ? assetUrl('assets/collections/' + file) : '';
  }

  function collectionArtHtml(collection, name, count, className, loading) {
    var cover = collectionCoverImage(collection);
    if (cover) {
      preloadImage(cover);
      return '<div class="' + className + ' ' + className + '--image"><img class="cs-collection-image" src="' + escapeHtml(cover) + '" alt="' + escapeHtml(name) + '" width="700" height="700" loading="' + (loading || 'lazy') + '" decoding="async"><span class="cs-dcard__count">' + escapeHtml(productCountLabel(count)) + '</span></div>';
    }
    return '<div class="' + className + '"><div class="cs-meme"><div class="cs-meme__stack"><span class="cs-meme__block">' + escapeHtml(name) + '</span></div></div><span class="cs-dcard__count">' + escapeHtml(productCountLabel(count)) + '</span></div>';
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
    return '<p class="cs-ship">' + escapeHtml(status.label) + ' · ships in 3 to 5 days</p>';
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

  function isAllCollectionsPage() {
    var segments = window.location.pathname.split('/').filter(Boolean);
    if (segments.length === 2) {
      return segments[0] === 'collections' && segments[1] === 'all';
    }
    return segments.length === 3 && /^[a-z]{2}(?:-[a-z0-9]{2,4})?$/i.test(segments[0]) && segments[1] === 'collections' && segments[2] === 'all';
  }

  function redirectAllCollectionsToDesigns() {
    window.location.replace(window.location.origin + '/#cs-designs');
  }

  function scrollToHashTarget() {
    if (window.location.hash !== '#cs-designs') return;
    window.requestAnimationFrame(function () {
      var target = qs('#cs-designs');
      if (target) target.scrollIntoView({ block: 'start' });
    });
  }

  function displayCollectionName(slug, fallback) {
    return fallback || slug.replace(/-/g, ' ').replace(/\b\w/g, function (char) { return char.toUpperCase(); });
  }

  function productCountLabel(count) {
    return count === 1 ? '1 product' : count + ' products';
  }

  function randomItem(items) {
    if (!items || !items.length) return null;
    var random = window.crypto && window.crypto.getRandomValues ? window.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 : Math.random();
    return items[Math.floor(random * items.length)];
  }

  function renderHome(root, state) {
    var designs = visibleCollections(state.collections);
    var hero = randomItem(designs) || null;
    var heroName = hero ? displayCollectionName(hero.slug, hero.name || hero.title) : 'Code Snippets';
    var heroCount = hero ? state.counts[hero.slug] || hero.productsCount || hero.products_count || 0 : 0;
    var heroHref = hero ? '/collections/' + escapeHtml(hero.slug) : '#cs-designs';
    var heroArt = hero ? collectionArtHtml(hero, heroName, heroCount, 'cs-hero__stage', 'eager') : '<div class="cs-hero__stage"><span class="cs-badge">' + escapeHtml(productCountLabel(heroCount)) + '</span><div class="cs-meme"><div class="cs-meme__stack"><span class="cs-meme__block">' + escapeHtml(heroName) + '</span></div></div></div>';
    var cards = designs.map(function (collection) {
      var count = state.counts[collection.slug] || collection.productsCount || collection.products_count || 0;
      var name = displayCollectionName(collection.slug, collection.name || collection.title);
      return '<a class="cs-dcard" href="/collections/' + escapeHtml(collection.slug) + '">'
        + collectionArtHtml(collection, name, count, 'cs-dcard__art')
        + '<div class="cs-dcard__info"><span class="cs-dcard__name">' + escapeHtml(name) + '</span></div><span class="cs-btn cs-btn--primary cs-btn--small cs-btn--full">View</span>'
        + '</a>';
    }).join('');

    root.innerHTML = '<section class="cs-storefront cs-storefront--home">'
      + '<section class="cs-hero"><div class="cs-wrapper cs-hero__inner"><div class="cs-hero__copy"><span class="cs-eyebrow">We make it work</span><h1 class="cs-hero__title">Pick a design.<br>Configure the goods.</h1><p class="cs-hero__sub">Open a design, choose the product, color and size, then add it to your cart from one page.</p><div class="cs-hero__cta"><a class="cs-btn cs-btn--primary cs-btn--large" href="#cs-designs">Browse Designs</a><a class="cs-btn cs-btn--secondary cs-btn--large" href="' + heroHref + '">Configure a Design →</a></div></div><a class="cs-hero__art" href="' + heroHref + '">' + heroArt + '</a></div></section>'
      + '<section class="cs-section cs-home-designs" id="cs-designs"><div class="cs-wrapper"><div class="cs-section__head"><span class="cs-eyebrow">Shop by design</span><h2 class="cs-h2">Open a design to configure it</h2><p class="cs-section__desc">Each design is a collection. Inside, a single configurator lets you choose the product, color and size. No hopping between pages.</p></div><div class="cs-grid cs-grid--4">' + cards + '</div></div></section>'
      + '</section>';
  }

  function renderProductPreview(product, variant, selection) {
    var image = selection && selection.previewImageUrl || firstImage(product, variant);
    preloadImage(image);
    return '<div class="pdfx-cfgprev">'
      + (image ? '<button type="button" class="pdfx-cfgprev__open" data-lightbox-open="' + escapeHtml(image) + '" aria-label="Open product image gallery"><img class="cs-product-image" src="' + escapeHtml(image) + '" alt="' + escapeHtml(product.name) + '" width="720" height="960" loading="eager" decoding="sync"></button>' : '<div class="pdfx-shape pdfx-shape--lg"><span class="pdfx-shape__label">' + escapeHtml(productType(product)) + '</span></div>')
      + '<span class="pdfx-cfgprev__tag">' + escapeHtml(productType(product)) + '</span>'
      + '</div>';
  }

  function renderProductImageSlider(product, variant, selection) {
    var images = productImagesForVariant(product, variant);
    if (images.length < 2) return '<div class="pdfx-imgrail pdfx-imgrail--empty" aria-hidden="true"></div>';
    var active = selection && selection.previewImageUrl || firstImage(product, variant);
    return '<div class="pdfx-imgrail" aria-label="Product images">' + images.map(function (image, index) {
      var current = image === active ? ' is-active' : '';
      return '<button type="button" class="pdfx-imgthumb' + current + '" data-preview-image="' + escapeHtml(image) + '" aria-label="Show product image ' + escapeHtml(index + 1) + '"><img class="cs-product-image" src="' + escapeHtml(image) + '" alt="" width="720" height="960" loading="eager" decoding="sync"></button>';
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
    if (product.description) {
      rows.push({ title: 'Description', body: sanitizeProductHtml(product.description) });
    }
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
        + '<div class="pdfx-medcard__stage">' + (active ? '<span class="pdfx-medcard__sel">Selected</span>' : '') + (firstImage(item, variant) ? '<img class="cs-product-image" src="' + escapeHtml(firstImage(item, variant)) + '" alt="' + escapeHtml(item.name) + '" width="720" height="960" loading="eager" decoding="async">' : '') + '</div>'
        + '<span class="pdfx-medcard__name">' + escapeHtml(productType(item)) + '</span><span class="pdfx-medcard__meta"><b>' + escapeHtml(money(variant && variant.unitPrice)) + '</b><span>' + escapeHtml(uniqueColors(item).length ? uniqueColors(item).length + ' colors' : 'one size') + '</span></span>'
        + '</button></div>';
    }).join('') + '</div>';
  }

  function cartIconHtml() {
    var icon = qs('#fw-section-header a[href$="/cart"] svg') || qs('#fw-section-header a[href$="/cart"] img') || qs('a[href$="/cart"] svg') || qs('a[href$="/cart"] img');
    if (!icon) return '<span aria-hidden="true">Cart</span>';
    return icon.outerHTML;
  }

  function cartWidgetHtml() {
    var widget = qs('header [data-cart-widget="widget"]');
    if (widget) return widget.outerHTML;
    return '<span data-cart-widget="quantity" class="cart-widget__items">0</span>' + cartIconHtml();
  }

  function proHeaderLink(label, href, className) {
    return '<a class="cs-pro-header__link ' + (className || '') + '" href="' + href + '">' + label + '</a>';
  }

  function initProHeader() {
    var header = qs('header.header');
    if (!header || header.dataset.csProHeader === 'true') return;

    var logo = qs('.header__logo img', header);
    var logoHtml = logo ? logo.outerHTML : '<span class="cs-pro-header__fallback-logo">Code Snippets</span>';
    var cartHtml = cartWidgetHtml();

    header.dataset.csProHeader = 'true';
    header.classList.add('cs-pro-header');
    header.innerHTML = '<div class="cs-pro-header__wrap">'
      + '<div class="cs-pro-header__bar">'
      + '<a class="cs-pro-header__logo" href="/" aria-label="Swag Shop Homepage">' + logoHtml + '</a>'
      + '<nav class="cs-pro-header__nav" aria-label="Menu">'
      + '<ul class="cs-pro-header__list">'
      + '<li>' + proHeaderLink('Home', 'https://codesnippets.pro/') + '</li>'
      + '<li>' + proHeaderLink('Pricing', 'https://codesnippets.pro/pricing/') + '</li>'
      + '<li class="cs-pro-header__item cs-pro-header__item--has-submenu">'
      + '<a class="cs-pro-header__link cs-pro-header__link--resources" href="https://codesnippets.pro/#" aria-haspopup="true" aria-expanded="false">Resources<span class="cs-pro-header__caret" aria-hidden="true">⌄</span></a>'
      + '<ul class="cs-pro-header__submenu" aria-label="Resources submenu">'
      + '<li><a href="https://codesnippets.pro/docs/">Documentation</a></li>'
      + '<li><a href="https://codesnippets.pro/partners/">Partners</a></li>'
      + '<li><a href="https://codesnippets.pro/support/">Support</a></li>'
      + '<li><a href="https://codesnippets.pro/blog/">Blog</a></li>'
      + '</ul>'
      + '</li>'
      + '<li>' + proHeaderLink('Snippet Search', 'https://codesnippets.cloud/search') + '</li>'
      + '<li>' + proHeaderLink('Login', 'https://codesnippets.pro/login/') + '</li>'
      + '</ul>'
      + '</nav>'
      + '<div class="cs-pro-header__actions">'
      + '<a class="cs-pro-header__cta" href="https://codesnippets.pro/pricing/">Get Started</a>'
      + '<a class="cs-pro-header__cart" href="/cart" aria-label="Cart">' + cartHtml + '</a>'
      + '</div>'
      + '<button class="cs-pro-header__toggle" type="button" aria-label="Toggle menu" aria-expanded="false" data-cs-header-toggle><span></span><span></span><span></span></button>'
      + '</div>'
      + '</div>';

    header.addEventListener('click', function (event) {
      var toggle = event.target.closest('[data-cs-header-toggle]');
      if (!toggle) return;
      var isOpen = header.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  function renderConfigureSection(product, variant, state, configureStep) {
    var stockStatus = variantStockStatus(variant);
    return '<section class="cs-section cs-storefront__configure"><div class="cs-wrapper"><div class="pdfx-cfgrid"><div class="pdfx-cfgleft"><span class="pdfx-steppill"><span class="n">' + configureStep + '</span>Configure your ' + escapeHtml(productType(product)) + '</span>' + renderProductPreview(product, variant, state.selection) + '</div><div class="pdfx-cfg"><h2 class="pdfx-cfg__title">' + escapeHtml(product.name) + '</h2>' + renderProductOptions(product, state.selection) + '<div class="cs-field"><div class="cs-buyrow">' + renderQuantityControl(state.selection.quantity) + '<div class="cs-buyrow__price">' + escapeHtml(money(variant && variant.unitPrice)) + '</div><button type="button" class="cs-btn cs-btn--carticon cs-storefront__cart" data-variant="' + escapeHtml(variant && variant.id || '') + '" aria-label="Add to cart" title="Add to cart"' + (stockStatus.available ? '' : ' disabled') + '>' + cartIconHtml() + '</button><button type="button" class="cs-btn cs-btn--primary cs-btn--large cs-btn--full cs-storefront__add" data-variant="' + escapeHtml(variant && variant.id || '') + '"' + (stockStatus.available ? '' : ' disabled') + '>' + (stockStatus.available ? 'Checkout now' : 'Sold out') + '</button></div></div>' + renderStockNote(stockStatus) + '<div class="pdfx-url" data-copy-link="' + escapeHtml(window.location.href) + '"><button type="button" aria-label="Copy link" title="Share link"><i class="gg-share" aria-hidden="true"></i></button><code>' + escapeHtml(window.location.pathname + window.location.search) + '</code></div>' + renderProductImageSlider(product, variant, state.selection) + '</div></div>' + renderProductAccordion(product) + '</div></section>';
  }

  function preserveRailScroll(root) {
    var positions = [];
    root.querySelectorAll('.pdfx-medrail, .pdfx-imgrail').forEach(function (rail) {
      var selector = rail.classList.contains('pdfx-medrail') ? '.pdfx-medrail' : '.pdfx-imgrail';
      var siblings = Array.prototype.slice.call(root.querySelectorAll(selector));
      positions.push({
        rail: rail,
        selector: selector,
        index: Math.max(0, siblings.indexOf(rail)),
        left: rail.scrollLeft,
        top: rail.scrollTop
      });
    });
    return function () {
      positions.forEach(function (item) {
        var target = item.rail && item.rail.isConnected ? item.rail : root.querySelectorAll(item.selector)[item.index];
        if (!target) return;
        target.scrollLeft = item.left;
        target.scrollTop = item.top;
      });
    };
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
    var restoreRailScroll = preserveRailScroll(root);
    var template = document.createElement('template');
    template.innerHTML = renderConfigureSection(product, variant, state, configureStep);
    section.replaceWith(template.content.firstElementChild);
    restoreRailScroll();
    window.requestAnimationFrame(restoreRailScroll);
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
    var collectionDescription = sanitizeProductHtml(state.collection.description || '');
    var collectionArt = collectionArtHtml(state.collection, collectionName, state.products.length, 'pdfx-pdpart', 'eager');
    root.innerHTML = '<section class="cs-storefront cs-storefront--collection">'
      + '<div class="cs-wrapper">'
      + '<div class="pdfx-pdp__top">'
      + collectionArt
      + '<div class="pdfx-pdp__info"><span class="pdfx-eyebrowpill">Collection · ' + escapeHtml(productCountLabel(state.products.length)) + '</span><h1 class="cs-h1">' + escapeHtml(collectionName) + '</h1><div class="pdfx-pdp__blurb">' + collectionDescription + '</div><div class="pdfx-pdp__facts"><div class="pdfx-pdp__fact"><span class="lab">From</span><b>' + escapeHtml(money(collectionPrice)) + '</b></div><div class="pdfx-pdp__fact"><span class="lab">Available on</span><b>' + escapeHtml(productCountLabel(state.products.length)) + '</b></div><div class="pdfx-pdp__fact"><span class="lab">Ships in</span><b>3 to 5 days</b></div></div></div>'
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
    var opener = root.querySelector('.pdfx-cfgprev__open');
    if (preview && preview.getAttribute('src') !== url) {
      preview.src = url;
    }
    if (opener) opener.dataset.lightboxOpen = url;
    root.querySelectorAll('.pdfx-imgthumb').forEach(function (button) {
      button.classList.toggle('is-active', button.dataset.previewImage === url);
    });
  }

  function activeProductForState(state) {
    return state.products.find(function (item) {
      return item.slug === state.selection.productSlug || stableParam(item.id) === stableParam(state.selection.productId);
    }) || state.products[0];
  }

  var lightboxScrollY = 0;
  var lightboxBodyStyles = null;

  function setPageScrollLocked(locked) {
    if (locked) {
      lightboxScrollY = window.scrollY || window.pageYOffset || 0;
      lightboxBodyStyles = {
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        right: document.body.style.right,
        width: document.body.style.width
      };
      document.documentElement.classList.add('cs-lightbox-open');
      document.body.classList.add('cs-lightbox-open');
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + lightboxScrollY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      return;
    }

    document.documentElement.classList.remove('cs-lightbox-open');
    document.body.classList.remove('cs-lightbox-open');
    if (lightboxBodyStyles) {
      document.body.style.position = lightboxBodyStyles.position;
      document.body.style.top = lightboxBodyStyles.top;
      document.body.style.left = lightboxBodyStyles.left;
      document.body.style.right = lightboxBodyStyles.right;
      document.body.style.width = lightboxBodyStyles.width;
      lightboxBodyStyles = null;
    }
    window.scrollTo(0, lightboxScrollY || 0);
  }

  function closeProductLightbox() {
    var lightbox = qs('.cs-lightbox');
    if (!lightbox && !document.body.classList.contains('cs-lightbox-open')) return;
    if (lightbox) lightbox.remove();
    setPageScrollLocked(false);
  }

  function renderProductLightbox(images, index, background) {
    if (!images.length) return '';
    index = Math.max(0, Math.min(index || 0, images.length - 1));
    background = background || '#F5F0E8';
    var image = images[index];
    var thumbs = images.map(function (url, thumbIndex) {
      return '<button type="button" class="cs-lightbox__thumb' + (thumbIndex === index ? ' is-active' : '') + '" data-lightbox-index="' + thumbIndex + '" aria-label="Show image ' + escapeHtml(thumbIndex + 1) + '"><img src="' + escapeHtml(url) + '" alt="" loading="eager" decoding="sync"></button>';
    }).join('');
    return '<div class="cs-lightbox" role="dialog" aria-modal="true" aria-label="Product image gallery" data-lightbox-current="' + index + '" style="--cs-lightbox-bg:' + escapeHtml(background) + '">'
      + '<button type="button" class="cs-lightbox__backdrop" data-lightbox-close aria-label="Close image gallery"></button>'
      + '<div class="cs-lightbox__panel">'
      + '<button type="button" class="cs-lightbox__close" data-lightbox-close aria-label="Close image gallery">×</button>'
      + '<button type="button" class="cs-lightbox__nav cs-lightbox__nav--prev" data-lightbox-prev aria-label="Previous image">‹</button>'
      + '<button type="button" class="cs-lightbox__nav cs-lightbox__nav--next" data-lightbox-next aria-label="Next image">›</button>'
      + '<button type="button" class="cs-lightbox__zoom" data-lightbox-zoom aria-label="Zoom in">Zoom in</button>'
      + '<div class="cs-lightbox__stage"><img class="cs-lightbox__image" src="' + escapeHtml(image) + '" alt="Product image ' + escapeHtml(index + 1) + '" draggable="false"></div>'
      + '<div class="cs-lightbox__meta">' + escapeHtml(index + 1) + ' / ' + escapeHtml(images.length) + '</div>'
      + '<div class="cs-lightbox__thumbs">' + thumbs + '</div>'
      + '</div></div>';
  }

  function updateLightboxZoomLabel(lightbox) {
    if (!lightbox) return;
    var zoomButton = lightbox.querySelector('[data-lightbox-zoom]');
    var zoomed = lightbox.classList.contains('is-zoomed');
    if (!zoomButton) return;
    zoomButton.textContent = zoomed ? 'Zoom out' : 'Zoom in';
    zoomButton.setAttribute('aria-label', zoomed ? 'Zoom out' : 'Zoom in');
  }

  function updateLightbox(lightbox, images, index) {
    var zoomed = lightbox.classList.contains('is-zoomed');
    var background = lightbox.style.getPropertyValue('--cs-lightbox-bg') || '#F5F0E8';
    var template = document.createElement('template');
    template.innerHTML = renderProductLightbox(images, index, background);
    var next = template.content.firstElementChild;
    if (zoomed && next) next.classList.add('is-zoomed');
    updateLightboxZoomLabel(next);
    lightbox.replaceWith(next);
  }

  function openProductLightbox(state, startUrl) {
    var product = activeProductForState(state);
    if (!product) return;
    var variant = selectedVariant(product, state.selection);
    var images = productImagesForVariant(product, variant);
    if (!images.length) return;
    var index = Math.max(0, images.indexOf(startUrl || state.selection.previewImageUrl || firstImage(product, variant)));
    var backgroundNode = qs('.pdfx-medcard--on .pdfx-medcard__stage') || qs('.pdfx-cfgprev') || qs('.pdfx-imgthumb.is-active');
    var background = backgroundNode ? window.getComputedStyle(backgroundNode).backgroundColor : '#F5F0E8';
    closeProductLightbox();
    var template = document.createElement('template');
    template.innerHTML = renderProductLightbox(images, index, background);
    document.body.appendChild(template.content.firstElementChild);
    setPageScrollLocked(true);
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
      var cartButton = event.target.closest('.cs-storefront__cart');
      var previewButton = event.target.closest('[data-preview-image]');
      var lightboxOpen = event.target.closest('[data-lightbox-open]');
      var copyTarget = event.target.closest('.pdfx-url[data-copy-link]');
      var accordionButton = event.target.closest('.pdfx-acc__head');
      if (productButton) {
        var product = state.products.find(function (item) { return item.slug === productButton.dataset.product; });
        var restoreRailScroll = preserveRailScroll(root);
        state.selection = defaultSelection(product);
        syncUrl(state.selection, product, selectedVariant(product, state.selection));
        render(root, state);
        restoreRailScroll();
        window.requestAnimationFrame(restoreRailScroll);
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
        addSelectedToCart(addButton, state, true);
      } else if (cartButton) {
        addSelectedToCart(cartButton, state, false);
      } else if (previewButton) {
        state.selection.previewImageUrl = previewButton.dataset.previewImage;
        updatePreviewImage(root, state.selection.previewImageUrl);
      } else if (lightboxOpen) {
        openProductLightbox(state, lightboxOpen.dataset.lightboxOpen);
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
    document.addEventListener('click', function (event) {
      var lightbox = event.target.closest('.cs-lightbox');
      if (!lightbox) return;
      var product = activeProductForState(state);
      var variant = product && selectedVariant(product, state.selection);
      var images = product ? productImagesForVariant(product, variant) : [];
      var current = parseInt(lightbox.dataset.lightboxCurrent, 10) || 0;
      if (event.target.closest('[data-lightbox-close]')) {
        closeProductLightbox();
      } else if (event.target.closest('[data-lightbox-zoom]') || event.target.closest('.cs-lightbox__image')) {
        lightbox.classList.toggle('is-zoomed');
        updateLightboxZoomLabel(lightbox);
      } else if (event.target.closest('[data-lightbox-prev]') && images.length) {
        updateLightbox(lightbox, images, (current - 1 + images.length) % images.length);
      } else if (event.target.closest('[data-lightbox-next]') && images.length) {
        updateLightbox(lightbox, images, (current + 1) % images.length);
      } else {
        var thumb = event.target.closest('[data-lightbox-index]');
        if (thumb && images.length) updateLightbox(lightbox, images, parseInt(thumb.dataset.lightboxIndex, 10) || 0);
      }
    });
    document.addEventListener('keydown', function (event) {
      var lightbox = qs('.cs-lightbox');
      if (!lightbox) return;
      var product = activeProductForState(state);
      var variant = product && selectedVariant(product, state.selection);
      var images = product ? productImagesForVariant(product, variant) : [];
      var current = parseInt(lightbox.dataset.lightboxCurrent, 10) || 0;
      if (event.key === 'Escape') closeProductLightbox();
      if (event.key === 'ArrowLeft' && images.length) updateLightbox(lightbox, images, (current - 1 + images.length) % images.length);
      if (event.key === 'ArrowRight' && images.length) updateLightbox(lightbox, images, (current + 1) % images.length);
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
    var existingCurrency = (new URLSearchParams(window.location.search || '').get('currency') || '').toUpperCase();
    if (isSupportedCurrency(existingCurrency)) params.set('currency', existingCurrency);
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

  function addNativeCartItem(variantId, quantity) {
    return fetch('/cart/add.js' + window.location.search, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: [{ id: variantId, quantity: quantity }] })
    }).then(function (response) {
      if (!response.ok) {
        throw new Error('Fourthwall native cart ' + response.status);
      }
      return response.json();
    });
  }

  function updateNativeCartState(cart) {
    var itemCount = cart && cart.item_count || cart && cart.cart && cart.cart.item_count;
    var cartLink = qs('#fw-section-header a[href$="/cart"]') || qs('a[href$="/cart"]') || qs('#fw-section-header a[href*="cart"]');
    if (cartLink) cartLink.setAttribute('href', '/cart');
    document.querySelectorAll('[data-cart-widget="quantity"]').forEach(function (node) {
      node.textContent = itemCount || 0;
    });
    document.querySelectorAll('[data-cart-widget="widget"]').forEach(function (node) {
      node.classList.toggle('empty', !itemCount);
    });
    window.currentCart = cart && cart.cart ? cart.cart : cart;
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: window.currentCart }));
  }

  function updateNativeCartLink(cartId) {
    if (!cartId) return;
    var cartLink = qs('#fw-section-header a[href$="/cart"]') || qs('a[href$="/cart"]');
    if (cartLink) {
      cartLink.setAttribute('href', '/cart?cartId=' + encodeURIComponent(cartId) + '&currency=' + encodeURIComponent(CURRENCY));
    }
  }

  function goToNativeCheckout() {
    var form = document.createElement('form');
    var input = document.createElement('input');
    form.method = 'post';
    form.action = '/cart';
    input.type = 'hidden';
    input.name = 'checkout';
    input.value = 'checkout';
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  }

  function addSelectedToCart(button, state, goToCheckout) {
    var product = state.products.find(function (item) { return item.slug === state.selection.productSlug || stableParam(item.id) === stableParam(state.selection.productId); }) || state.products[0];
    var variant = selectedVariant(product, state.selection);
    var stockStatus = variantStockStatus(variant);
    if (!variant || !variant.id || !stockStatus.available) return;
    var quantity = Math.max(1, state.selection.quantity || 1);
    var isIconButton = button.classList.contains('cs-storefront__cart');
    var originalHtml = button.dataset.originalHtml || button.innerHTML;
    var originalLabel = button.getAttribute('aria-label') || 'Add to cart';
    button.dataset.originalHtml = originalHtml;
    button.disabled = true;
    if (isIconButton) {
      button.classList.add('is-loading');
      button.setAttribute('aria-label', 'Adding to cart');
      button.setAttribute('title', 'Adding to cart');
    } else {
      button.textContent = 'Adding…';
    }
    var request = addNativeCartItem(variant.id, quantity);
    request.then(function (cart) {
      updateNativeCartState(cart);
      if (goToCheckout) {
        button.textContent = 'Added';
        goToNativeCheckout();
        return;
      }
      button.disabled = false;
      button.classList.remove('is-loading');
      button.classList.add('is-added');
      button.setAttribute('aria-label', 'Added to cart');
      button.setAttribute('title', 'Added to cart');
      window.setTimeout(function () {
        button.classList.remove('is-added');
        button.setAttribute('aria-label', originalLabel);
        button.setAttribute('title', originalLabel);
        button.innerHTML = originalHtml;
      }, 1800);
    }).catch(function (error) {
      console.error('[swag-shop] add to cart failed', error);
      button.disabled = false;
      if (isIconButton) {
        button.classList.remove('is-loading');
        button.setAttribute('aria-label', originalLabel);
        button.setAttribute('title', originalLabel);
        button.innerHTML = originalHtml;
      } else {
        button.textContent = 'Checkout now';
        window.location.href = '/products/' + encodeURIComponent(product.slug);
      }
    });
  }

  function publicProducts(products) {
    return (products || []).filter(function (product) {
      return product.access && product.access.type === 'PUBLIC' && product.state && product.state.type === 'AVAILABLE';
    });
  }

  function productMatchesDesign(product, slug, collections) {
    return designKey(product, collections) === slug || (product.slug || '').indexOf(slug + '-') === 0;
  }

  function findCollectionSlugForProduct(product, collections) {
    var inferredSlug = designKey(product, collections);
    if (inferredSlug && inferredSlug !== (product.slug || '').toLowerCase()) return Promise.resolve(inferredSlug);

    return Promise.all(visibleCollections(collections).map(function (collection) {
      return fetchJson('/collections/' + encodeURIComponent(collection.slug) + '/products', { size: 100, currency: CURRENCY })
        .then(function (response) {
          var match = publicProducts(response.results).some(function (candidate) {
            return candidate.slug === product.slug || stableParam(candidate.id) === stableParam(product.id);
          });
          return match ? collection.slug : null;
        })
        .catch(function () { return null; });
    })).then(function (slugs) {
      return slugs.find(Boolean) || inferredSlug;
    });
  }

  function loadCollectionProducts(slug, collections) {
    return fetchJson('/collections/' + encodeURIComponent(slug) + '/products', { size: 100, currency: CURRENCY })
      .then(function (response) {
        return { products: publicProducts(response.results), source: slug };
      })
      .catch(function () {
        return fetchJson('/collections/all/products', { size: 100, currency: CURRENCY })
          .then(function (response) {
            return {
              products: publicProducts(response.results).filter(function (product) {
                return productMatchesDesign(product, slug, collections);
              }),
              source: 'all-filtered'
            };
          });
      });
  }

  function isCollectionPage() {
    return /\/collections\/[^/?#]+/.test(window.location.pathname);
  }

  function isProductPage() {
    return /\/products\/[^/?#]+/.test(window.location.pathname);
  }

  function isManagedStorefrontPage() {
    return isHomePage() || isCollectionPage() || isProductPage();
  }

  function ensureMountRoot() {
    if (!isManagedStorefrontPage()) return null;
    var sourceRoot = qs('root');
    if (!sourceRoot) return null;

    var pageMain = sourceRoot.closest('.page__main') || qs('.page__main');
    if (!pageMain) return null;

    if (!STOREFRONT_TOKEN) {
      STOREFRONT_TOKEN = decodeStorefrontToken(sourceRoot.getAttribute('data-storefront-token') || '');
    }

    sourceRoot.remove();
    if (!STOREFRONT_TOKEN) return null;

    return pageMain;
  }

  function renderSkeleton(root) {
    root.innerHTML = '<section class="cs-storefront cs-storefront--loading" aria-busy="true">'
      + '<div class="cs-skeleton cs-skeleton--hero"><span></span><b></b><p></p><p></p></div>'
      + '<div class="cs-skeleton-grid"><span></span><span></span><span></span><span></span></div>'
      + '</section>';
  }

  function redirectProductToCollection() {
    var productSlug = currentProductSlug();
    return Promise.all([
      fetchJson('/collections', { size: 100 }),
      fetchJson('/collections/all/products', { size: 100, currency: CURRENCY })
    ]).then(function (responses) {
      var collections = responses[0].results || [];
      var product = publicProducts(responses[1].results).find(function (item) { return item.slug === productSlug; });
      if (!product) throw new Error('Product not found for direct link: ' + productSlug);
      return findCollectionSlugForProduct(product, collections).then(function (collectionSlug) {
        var params = new URLSearchParams(window.location.search);
        var variantParam = params.get('v') || params.get('sku') || params.get('variant') || '';
        var variant = null;
        if (variantParam) {
          variant = (product.variants || []).find(function (candidate) {
            return sameShareSku(candidate.sku, variantParam) || stableParam(candidate.id) === stableParam(variantParam);
          });
        }
        variant = variant || (product.variants || [])[0] || null;
        var nextParams = new URLSearchParams();
        if (variant && variant.sku) {
          nextParams.set('v', shareSku(variant.sku));
        } else if (variant && variant.id) {
          nextParams.set('v', stableParam(variant.id));
        }
        var quantity = Math.max(1, parseInt(params.get('q') || params.get('qty'), 10) || 1);
        if (quantity !== 1) nextParams.set('q', quantity);
        window.location.replace('/collections/' + encodeURIComponent(collectionSlug) + (nextParams.toString() ? '?' + nextParams.toString() : ''));
      });
    });
  }

  function init() {
    initProHeader();

    if (isAllCollectionsPage()) {
      redirectAllCollectionsToDesigns();
      return;
    }

    var mount = ensureMountRoot();
    if (!mount || mount.dataset.csStorefrontMounted) return;
    mount.dataset.csStorefrontMounted = 'true';
    mount.classList.add('cs-storefront-mounted');
    if (isProductPage()) {
      redirectProductToCollection().catch(function (error) {
        console.error('[swag-shop] product redirect failed', error);
        mount.classList.remove('cs-storefront-mounted');
        mount.removeAttribute('data-cs-storefront-mounted');
      });
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
        var key = designKey(product, collections);
        counts[key] = (counts[key] || 0) + 1;
      });
      return { page: 'home', collections: collections, counts: counts };
    }) : fetchJson('/collections', { size: 100 }).then(function (response) {
      var collections = response.results || [];
      return Promise.all([
        loadCollectionProducts(slug, collections),
        fetchJson('/collections/' + encodeURIComponent(slug), {}).catch(function () { return null; })
      ]).then(function (responses) {
        var collectionResponse = responses[0];
        var collectionDetail = responses[1];
        var collection = collectionDetail || collections.find(function (item) { return item.slug === slug; }) || { name: 'Code Snippets', slug: slug };
        var products = collectionResponse.products;
        return { page: 'collection', collection: collection, products: products, selection: selectionFromUrl(products) };
      });
    });

    request.then(function (state) {
      if (state.page !== 'home') {
        preloadProductsImages(state.products);
        var initialProduct = state.products.find(function (item) { return item.slug === state.selection.productSlug || stableParam(item.id) === stableParam(state.selection.productId); }) || state.products[0];
        syncUrl(state.selection, initialProduct, selectedVariant(initialProduct, state.selection));
      }
      render(mount, state);
      scrollToHashTarget();
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
