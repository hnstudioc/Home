/* ============================================================
   HaNull Studio 포털 — 제품 카드 그리기
   js/products.js 의 목록을 읽어 카드를 만든다.
   ============================================================ */
(function () {
  'use strict';

  var list = window.PRODUCTS || [];
  var grid = document.getElementById('product-grid');
  if (!grid) return;

  var ARROW =
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 10h11M11 5.5 15.5 10 11 14.5"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var html = list.map(function (p) {
    var badge = '';
    if (p.status && p.status.label) {
      var tone = p.status.tone || 'archived';
      badge =
        '<div class="product-badges">' +
        '<span class="badge badge-' + esc(tone) + '">' + esc(p.status.label) + '</span>' +
        '</div>';
    }

    var logo = p.logo
      ? '<img class="product-logo" src="' + esc(p.logo) + '" alt="" width="46" height="46">'
      : '';

    return '' +
      '<li>' +
        '<a class="product-card" href="' + esc(p.url) + '"' +
           ' style="--accent:' + esc(p.accent || '#2A2F7A') + '">' +
          badge +
          '<div class="product-top">' +
            logo +
            '<div>' +
              '<h3 class="product-name">' + esc(p.name) + '</h3>' +
              '<p class="product-tagline">' + esc(p.tagline) + '</p>' +
            '</div>' +
          '</div>' +
          '<p class="product-desc">' + esc(p.description) + '</p>' +
          '<div class="product-foot">' +
            '<span class="product-audience">' + esc(p.audience) + '</span>' +
            '<span class="product-go">바로가기 ' + ARROW + '</span>' +
          '</div>' +
        '</a>' +
      '</li>';
  }).join('');

  grid.innerHTML = html;

  var count = document.getElementById('product-count');
  if (count) count.textContent = list.length + '개';

  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
