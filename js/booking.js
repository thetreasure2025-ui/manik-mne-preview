/* Запись. Пока адрес виджета не задан (MNE_DATA.booking.widgetSrc в data/content.js пуст), никакого окна записи на странице нет:
   кнопки «Узнать свободное время» и «Записаться» остаются обычными ссылками на WhatsApp с готовым сообщением.
   Если задать адрес виджета (YCLIENTS второй студии и подобные), он подгрузится, и клик по любой [data-book] откроет окно записи:
   виджет создаёт скрытую кнопку .yButton, мы кликаем её. Не загрузился (блокировщик, нет сети): остаётся ссылка на WhatsApp.
   Важно: с виджетом подписи кнопок нужно сменить на «Посмотреть свободное время»: окно показывает настоящее время, а не переписку. */
(function () {
  'use strict';

  var L = window.MNE_LIB;
  var cfg = (window.MNE_DATA || {}).booking || {};
  var SRC = typeof cfg.widgetSrc === 'string' ? cfg.widgetSrc : '';
  var failed = false;

  function yButton() {
    return document.querySelector('.yButton');
  }

  function load() {
    if (!SRC || document.querySelector('script[data-yclients]')) return;
    var s = document.createElement('script');
    s.src = SRC;
    s.charset = 'UTF-8';
    s.async = true;
    s.setAttribute('data-yclients', '');
    s.onerror = function () {
      failed = true;
    };
    document.body.appendChild(s);
  }

  document.addEventListener('click', function (e) {
    if (!SRC || !L) return;
    var el = e.target.closest ? e.target.closest('[data-book]') : null;
    if (!el) return;
    var target = L.bookingTarget(!failed && !!yButton(), el.getAttribute('data-book-label'));
    if (target.kind === 'widget') {
      e.preventDefault();
      yButton().click();
    }
  });

  load();
})();
