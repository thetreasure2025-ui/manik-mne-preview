/* Запись онлайн: виджет YCLIENTS студии. Тот же механизм, что на действующем сайте:
   виджет создаёт скрытую кнопку .yButton, мы кликаем её по нажатию на любой [data-book].
   Если виджет не загрузился (блокировщик, нет сети), остаётся href из разметки: WhatsApp. */
(function () {
  'use strict';

  var L = window.MNE_LIB;
  var SRC = 'https://w1243462.yclients.com/widgetJS';
  var failed = false;

  function yButton() {
    return document.querySelector('.yButton');
  }

  function load() {
    if (document.querySelector('script[data-yclients]')) return;
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
