/* Чистые функции без DOM. Работают и в браузере (window.MNE_LIB), и в Node (тесты, tools/render-html.js). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MNE_LIB = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var NBSP = '\u00A0';
  var WA_PHONE = '79060072420';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatRub(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP) + NBSP + '₽';
  }

  function plural(n, forms) {
    var a = Math.abs(n) % 100;
    var b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  }

  function waLink(text) {
    return 'https://wa.me/' + WA_PHONE + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  // Минимальная цена категории. Пустые ячейки (null) и строки-добавки не считаются.
  function fromPrice(cat) {
    var min = null;
    (cat.rows || []).forEach(function (r) {
      if (r.addon) return;
      (r.values || []).forEach(function (v) {
        if (typeof v === 'number' && isFinite(v) && (min === null || v < min)) min = v;
      });
    });
    return min;
  }

  // Что делать по клику на кнопку «Узнать свободное время»: открыть виджет записи (если он подключён и загрузился) или пойти по ссылке в WhatsApp.
  function bookingTarget(widgetReady, label) {
    if (widgetReady) return { kind: 'widget' };
    return { kind: 'link', href: waLink('Здравствуйте! Хочу узнать свободное время' + (label ? ': ' + label : '')) };
  }

  // Режим примеров (?demo=1) включается только на своём компьютере: с диска (file:) или с localhost.
  // На опубликованном сайте флаг игнорируется: примеры с выдуманным рейтингом и «работами» не должны быть видны из интернета.
  function demoEnabled(search, loc) {
    try {
      if (typeof search !== 'string' || !/[?&]demo=1(&|$)/.test(search)) return false;
      if (!loc || typeof loc !== 'object') return false;
      return loc.protocol === 'file:' || loc.hostname === 'localhost' || loc.hostname === '127.0.0.1' || loc.hostname === '[::1]';
    } catch (e) {
      return false;
    }
  }

  // Настоящие элементы плюс (только при ?demo=1) примеры с пометкой demo.
  function withDemo(real, demo, showDemo) {
    var list = Array.isArray(real) ? real.slice() : [];
    if (showDemo && Array.isArray(demo)) {
      demo.forEach(function (d) {
        list.push(Object.assign({}, d, { demo: true }));
      });
    }
    return list;
  }

  function pickRating(real, demo, showDemo) {
    if (real) return real;
    return showDemo && demo ? Object.assign({}, demo, { demo: true }) : null;
  }

  // Плитка направления: фото с названием и ценой «от X ₽» поверх (tile-overlay), под фото короткое описание (видно всегда, в том числе на телефоне)
  // и одна кнопка «Посмотреть цены»: она открывает нужную вкладку прайса и не торопит с записью.
  function renderTile(cat, tile) {
    var from = fromPrice(cat);
    return (
      '<article class="tile">' +
      '<div class="tile-media">' +
      '<img class="tile-img" src="' + esc(tile.img) + '" alt="" loading="lazy" decoding="async">' +
      '<div class="tile-overlay">' +
      '<h3 class="tile-title">' + esc(tile.title) + '</h3>' +
      (from === null ? '' : '<p class="tile-price">от' + NBSP + formatRub(from) + '</p>') +
      '</div></div>' +
      '<p class="tile-text">' + esc(tile.text) + '</p>' +
      '<div class="tile-actions">' +
      '<a class="btn btn-primary btn-sm" href="#price" data-open-tab="' + esc(cat.id) + '">Посмотреть цены</a>' +
      '</div></article>'
    );
  }

  // Короткое пояснение к названию процедуры (hints: [{ match: 'Мокрый эффект', text: '…' }]): первое совпадение по вхождению в название.
  function hintFor(name, hints) {
    var list = Array.isArray(hints) ? hints : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && typeof list[i].match === 'string' && String(name).indexOf(list[i].match) !== -1) return list[i].text;
    }
    return '';
  }

  // Таблица прайса одной категории. На телефоне CSS превращает строки в карточки (по data-label).
  function renderPriceTable(cat, hints) {
    var head =
      '<tr><th scope="col">Процедура</th>' +
      cat.columns.map(function (c) { return '<th scope="col" class="num">' + esc(c) + '</th>'; }).join('') +
      '<th scope="col" class="act"><span class="sr-only">Запись</span></th></tr>';
    var body = cat.rows.map(function (r) {
      var cells = r.values.map(function (v, i) {
        return '<td class="num" data-label="' + esc(cat.columns[i]) + '">' + formatRub(v) + '</td>';
      }).join('');
      var hint = hintFor(r.name, hints);
      return (
        '<tr><th scope="row"><span class="p-name">' + esc(r.name) + '</span>' +
        (r.note ? '<span class="p-note">' + esc(r.note) + '</span>' : '') +
        (hint ? '<span class="p-note p-hint">' + esc(hint) + '</span>' : '') + '</th>' + cells +
        '<td class="act"><a class="btn btn-outline btn-sm" href="' + esc(waLink('Здравствуйте! Хочу узнать свободное время: ' + r.name)) + '" data-book data-book-label="' + esc(r.name) + '">Узнать свободное время</a></td></tr>'
      );
    }).join('');
    return '<table class="price-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>';
  }

  function renderTabs(prices) {
    return prices.map(function (c, i) {
      return (
        '<button type="button" role="tab" class="tab" id="tab-' + esc(c.id) + '" aria-controls="panel-' + esc(c.id) +
        '" aria-selected="' + (i === 0 ? 'true' : 'false') + '" tabindex="' + (i === 0 ? 0 : -1) + '">' + esc(c.tab) + '</button>'
      );
    }).join('\n');
  }

  function renderPanels(prices, hints) {
    return prices.map(function (c, i) {
      return (
        '<div role="tabpanel" class="price-panel" id="panel-' + esc(c.id) + '" aria-labelledby="tab-' + esc(c.id) + '"' +
        (i === 0 ? '' : ' hidden') + '>' +
        '<h3 class="panel-title">' + esc(c.tab) + '</h3>' + renderPriceTable(c, hints) + '</div>'
      );
    }).join('\n');
  }

  var api = {
    esc: esc,
    formatRub: formatRub,
    plural: plural,
    waLink: waLink,
    fromPrice: fromPrice,
    bookingTarget: bookingTarget,
    demoEnabled: demoEnabled,
    withDemo: withDemo,
    pickRating: pickRating,
    renderTile: renderTile,
    renderPriceTable: renderPriceTable,
    renderTabs: renderTabs,
    renderPanels: renderPanels
  };
  function ribbon(item) {
    return item && item.demo ? '<span class="ribbon">ПРИМЕР</span>' : '';
  }

  function renderWork(w) {
    return (
      '<figure class="work">' +
      '<img src="' + esc(w.img) + '" alt="' + esc(w.caption) + '" loading="lazy" decoding="async">' +
      '<figcaption>' + esc(w.caption) + '</figcaption>' + ribbon(w) + '</figure>'
    );
  }

  function renderReview(r) {
    return (
      '<blockquote class="review">' + ribbon(r) +
      '<p>' + esc(r.text) + '</p>' +
      '<footer>' + esc(r.author) + (r.topic ? ' · ' + esc(r.topic) : '') + '</footer></blockquote>'
    );
  }

  // Рейтинг: «★★★★★ 5,0 на Яндекс Картах · 157 отзывов» и, если есть url, ссылка на все отзывы.
  function renderRating(r) {
    if (!r || typeof r.value !== 'number' || !isFinite(r.value)) return '';
    var stars = Math.max(0, Math.min(5, Math.round(r.value)));
    var count = typeof r.count === 'number' && isFinite(r.count) ? ' · ' + r.count + ' ' + plural(r.count, ['отзыв', 'отзыва', 'отзывов']) : '';
    return (
      '<p class="rating">' + ribbon(r) +
      '<span class="stars" aria-hidden="true">' + '★★★★★'.slice(0, stars) + '☆☆☆☆☆'.slice(0, 5 - stars) + '</span> ' +
      '<b>' + r.value.toFixed(1).replace('.', ',') + '</b>' +
      (r.place ? ' на ' + esc(r.place) : '') + count +
      (r.url ? ' <a class="link-arrow" href="' + esc(r.url) + '" target="_blank" rel="noopener">Читать все отзывы</a>' : '') +
      '</p>'
    );
  }

  api.renderWork = renderWork;
  api.renderReview = renderReview;
  api.renderRating = renderRating;
  api.hintFor = hintFor;
  return api;
});
