/* Оживление страницы: высота липкой шапки, вкладки прайса, блоки «Работы / Отзывы»,
   ссылка на портфолио, ссылки кнопок сертификата. */
(function () {
  'use strict';

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  // высота шапки нужна липким вкладкам и якорям (--header-h)
  function setHeaderHeight() {
    var h = document.querySelector('.site-header');
    if (h) document.documentElement.style.setProperty('--header-h', h.offsetHeight + 'px');
  }

  // После клика по вкладке из глубины длинной панели страница остаётся прокрученной, а новая панель короче:
  // она оказалась бы выше экрана, и полоса вкладок отлипла бы. Поднимаем начало панели под липкую полосу.
  function keepPanelInView() {
    var panels = document.getElementById('price-panels');
    var header = document.querySelector('.site-header');
    var strip = document.getElementById('price-tabs');
    if (!panels || !header || !strip) return;
    var gap = panels.getBoundingClientRect().top - (header.offsetHeight + strip.offsetHeight);
    if (gap < 0) window.scrollBy({ top: gap, behavior: 'instant' });
  }

  // keepInView: только для клика и стрелок по самим вкладкам; переход с плитки прокручивает страницу сам (якорь #price)
  function openTab(id, keepInView) {
    var active = document.getElementById('tab-' + id);
    // неизвестный id (нет вкладки или панели): ничего не меняем, иначе скрылись бы все панели
    if (!active || !document.getElementById('panel-' + id)) return;
    $$('.tab').forEach(function (b) {
      var on = b.id === 'tab-' + id;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    $$('.price-panel').forEach(function (p) {
      p.hidden = p.id !== 'panel-' + id;
    });
    // на телефоне полоса вкладок длиннее экрана: прокручиваем её так, чтобы выбранная вкладка была по центру
    var box = document.getElementById('price-tabs');
    if (box) box.scrollLeft = active.offsetLeft - (box.clientWidth - active.offsetWidth) / 2;
    if (keepInView) keepPanelInView();
  }

  document.addEventListener('click', function (e) {
    var tab = e.target.closest ? e.target.closest('.tab') : null;
    if (tab) {
      openTab(tab.id.replace('tab-', ''), true);
      return;
    }
    var opener = e.target.closest ? e.target.closest('[data-open-tab]') : null;
    if (opener) openTab(opener.getAttribute('data-open-tab'));
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var tab = e.target.closest ? e.target.closest('.tab') : null;
    if (!tab) return;
    var tabs = $$('.tab');
    var step = e.key === 'ArrowRight' ? 1 : tabs.length - 1;
    var next = tabs[(tabs.indexOf(tab) + step) % tabs.length];
    next.focus();
    openTab(next.id.replace('tab-', ''), true);
    e.preventDefault();
  });

  // --- Работы / Отзывы: только из data/content.js; пусто → блок и пункт меню скрыты. Блока мастеров на сайте нет и не будет. ---
  var L = window.MNE_LIB;
  var D = window.MNE_DATA || {};
  var demo = D.demo || {};
  // ?demo=1 работает только локально (file: или localhost): на опубликованном сайте примеров нет
  var showDemo = L && typeof L.demoEnabled === 'function' ? L.demoEnabled(location.search, location) : false;

  // Один блок за раз. Кривая запись в content.js (null, не тот тип) роняет только свой блок:
  // он считается пустым (скрыт вместе с пунктом меню), остальные блоки и страница работают дальше.
  function fill(key, getItems, render, extra) {
    var sec = document.querySelector('[data-block="' + key + '"]');
    if (!sec) return;
    var list = sec.querySelector('[data-list]');
    var items = [];
    try {
      items = getItems();
      if (list) list.innerHTML = items.map(render).join('');
      if (extra) extra(sec);
    } catch (e) {
      items = [];
      if (list) list.innerHTML = '';
      if (window.console && console.warn) console.warn('content.js: блок «' + key + '» не выведен:', e && e.message);
    }
    sec.hidden = items.length === 0;
    $$('[data-needs="' + key + '"]').forEach(function (a) {
      a.hidden = items.length === 0;
    });
  }

  function fillBlocks() {
    var rev = D.reviews || {};
    var drev = demo.reviews || {};
    fill('works', function () { return L.withDemo(D.works, demo.works, showDemo); }, L.renderWork);
    fill('reviews', function () { return L.withDemo(rev.items, drev.items, showDemo); }, L.renderReview, function (sec) {
      var box = sec.querySelector('[data-rating]');
      if (box) box.innerHTML = L.renderRating(L.pickRating(rev.rating, drev.rating, showDemo));
    });
    // «Посмотреть ещё работы» ведёт только на настоящую страницу портфолио (D.portfolioUrl); без ссылки кнопки нет
    $$('[data-portfolio-link]').forEach(function (a) {
      var url = typeof D.portfolioUrl === 'string' ? D.portfolioUrl : '';
      if (url) a.href = url;
      a.hidden = !url;
    });
  }

  // нет lib.js (не загрузился): блоки остаются скрытыми, остальная страница работает
  if (L) fillBlocks();

  // --- Сертификат: кнопки номиналов открывают WhatsApp с готовым текстом ---
  if (L) {
    $$('[data-cert-amount]').forEach(function (a) {
      a.href = L.waLink('Здравствуйте! Хочу подарочный сертификат на ' + L.formatRub(+a.getAttribute('data-cert-amount')));
    });
    $$('[data-cert-other]').forEach(function (a) {
      a.href = L.waLink('Здравствуйте! Хочу подарочный сертификат');
    });
  }

  // высота шапки меняется не только с окном: после подмены шрифта строки меню могут перенестись
  window.addEventListener('resize', setHeaderHeight);
  var siteHeader = document.querySelector('.site-header');
  if (window.ResizeObserver && siteHeader) new ResizeObserver(setHeaderHeight).observe(siteHeader);
  setHeaderHeight();
})();
