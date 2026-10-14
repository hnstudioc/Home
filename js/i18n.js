/* ============================================================
   www.hanullstudio.com — 다국어 (포털 + 88폰 공용)
   ------------------------------------------------------------
   · HTML 안의 한국어가 원문이다. 다른 언어는 i18n/<lang>.json 을 읽어
     data-i18n / data-i18n-attr 가 붙은 요소에 끼워 넣는다.
   · 언어 고르는 순서:  ?lang=  →  localStorage  →  브라우저 언어  →  ko
   · 언어를 바꾸면 ?lang=xx 를 붙여 같은 쪽을 다시 연다.
   · 쪽마다 <html data-i18n-base="i18n/">  처럼 사전 폴더의 상대 경로를 적는다.
     (404.html 만 절대 경로 "/i18n/")
   · 사전 파일을 고치면 아래 VERSION 을 올려야 브라우저 캐시가 갱신된다.
   ============================================================ */
(function () {
  'use strict';

  var VERSION = '1';

  /* 앱이 지원하는 14개 언어. 순서는 앱의 언어 고르기 화면과 같다. */
  var LANGS = [
    ['ko', '한국어'],
    ['en', 'English'],
    ['ja', '日本語'],
    ['zh', '中文'],
    ['es', 'Español'],
    ['fr', 'Français'],
    ['it', 'Italiano'],
    ['de', 'Deutsch'],
    ['hi', 'हिन्दी'],
    ['pt', 'Português'],
    ['ru', 'Русский'],
    ['vi', 'Tiếng Việt'],
    ['th', 'ไทย'],
    ['id', 'Bahasa Indonesia']
  ];
  var CODES = LANGS.map(function (l) { return l[0]; });

  /* Noto Sans KR 이 못 그리는 글자는 같은 Noto 계열을 따로 받는다.
     (한국어·영어·유럽어·러시아어는 Noto Sans KR 안에 들어 있다) */
  var FONT = {
    ja: ['Noto Sans JP', 'Noto+Sans+JP'],
    zh: ['Noto Sans SC', 'Noto+Sans+SC'],
    th: ['Noto Sans Thai', 'Noto+Sans+Thai'],
    hi: ['Noto Sans Devanagari', 'Noto+Sans+Devanagari'],
    vi: ['Noto Sans', 'Noto+Sans']
  };
  var HTML_LANG = { zh: 'zh-Hans' };

  var root = document.documentElement;
  var base = root.getAttribute('data-i18n-base') || 'i18n/';
  var STORE = 'hanull.lang';

  function norm(code) {
    code = String(code || '').toLowerCase();
    var two = code.split(/[-_]/)[0];
    return CODES.indexOf(two) >= 0 ? two : null;
  }

  function pick() {
    var m = location.search.match(/[?&]lang=([a-zA-Z_-]+)/);
    if (m) {
      var q = norm(m[1]);
      if (q) { try { localStorage.setItem(STORE, q); } catch (e) {} return q; }
    }
    try {
      var s = localStorage.getItem(STORE);
      if (s && CODES.indexOf(s) >= 0) return s;
    } catch (e) {}
    var list = (navigator.languages && navigator.languages.length)
      ? navigator.languages : [navigator.language || 'ko'];
    for (var i = 0; i < list.length; i++) {
      var n = norm(list[i]);
      if (n) return n;
    }
    return 'ko';
  }

  var lang = pick();
  var dict = {}, fallback = {};

  function format(s, vars) {
    if (!vars) return s;
    return String(s).replace(/\{(\w+)\}/g, function (m, k) {
      return vars[k] != null ? vars[k] : m;
    });
  }

  /* t(키, 한국어 기본값, {치환}) */
  function t(key, def, vars) {
    var v = dict[key];
    if (v == null) v = fallback[key];
    if (v == null) v = def;
    return v == null ? null : format(v, vars);
  }

  function apply(scope) {
    scope = scope || document;
    var els = scope.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var v = t(el.getAttribute('data-i18n'));
      if (v == null) continue;
      var tag = el.tagName;
      if (tag === 'TITLE' || tag === 'OPTION' || tag === 'TEXTAREA') el.textContent = v;
      else el.innerHTML = v;
    }
    var attrEls = scope.querySelectorAll('[data-i18n-attr]');
    for (var j = 0; j < attrEls.length; j++) {
      var ael = attrEls[j];
      var pairs = ael.getAttribute('data-i18n-attr').split(',');
      for (var k = 0; k < pairs.length; k++) {
        var p = pairs[k].split(':');
        if (p.length < 2) continue;
        var val = t(p[1].trim());
        if (val != null) ael.setAttribute(p[0].trim(), val);
      }
    }
  }

  function setHtmlLang(code) {
    root.setAttribute('lang', HTML_LANG[code] || code);
    root.className = root.className.replace(/\blang-[a-z]+\b/g, '').trim();
    root.classList.add('lang-' + code);
  }

  function loadFont(code) {
    var f = FONT[code];
    if (!f) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + f[1] +
      ':wght@400;500;700;900&display=swap';
    document.head.appendChild(link);
    var cur = getComputedStyle(root).getPropertyValue('--font') || 'sans-serif';
    root.style.setProperty('--font', '"' + f[0] + '", ' + cur.trim());
  }

  function urlWithLang(code) {
    var u = location.pathname;
    var q = location.search.replace(/([?&])lang=[^&]*(&|$)/, function (m, a, b) {
      return b ? a : '';
    }).replace(/[?&]$/, '');
    q += (q ? '&' : '?') + 'lang=' + code;
    return u + q + location.hash;
  }

  function buildSwitchers() {
    var spots = document.querySelectorAll('[data-lang-switcher]');
    for (var i = 0; i < spots.length; i++) {
      var spot = spots[i];
      var label = document.createElement('label');
      label.className = 'lang-switch';
      var sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = t('c.lang', '언어');
      var sel = document.createElement('select');
      sel.className = 'lang-select';
      sel.setAttribute('aria-label', t('c.lang', '언어'));
      for (var j = 0; j < LANGS.length; j++) {
        var o = document.createElement('option');
        o.value = LANGS[j][0];
        o.textContent = LANGS[j][1];
        o.lang = HTML_LANG[LANGS[j][0]] || LANGS[j][0];
        if (LANGS[j][0] === lang) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener('change', function (e) {
        var code = e.target.value;
        try { localStorage.setItem(STORE, code); } catch (err) {}
        location.assign(urlWithLang(code));
      });
      label.appendChild(sr);
      label.appendChild(sel);
      spot.innerHTML = '';
      spot.appendChild(label);
    }
  }

  function fetchDict(code) {
    return fetch(base + code + '.json?v=' + VERSION, { cache: 'force-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  setHtmlLang(lang);

  /* 이 스크립트는 <head> 에서 읽히므로, DOM 을 만지는 일은 본문이 다 그려진 뒤로 미룬다 */
  var domReady = new Promise(function (resolve) {
    if (document.readyState !== 'loading') resolve();
    else document.addEventListener('DOMContentLoaded', function () { resolve(); });
  });

  var needFallback = root.getAttribute('data-i18n-fallback');
  var dictReady;

  if (lang === 'ko') {
    dictReady = Promise.resolve();
  } else {
    root.classList.add('i18n-pending');
    loadFont(lang);
    var jobs = [fetchDict(lang)];
    if (needFallback && needFallback !== lang) jobs.push(fetchDict(needFallback));
    dictReady = Promise.all(jobs).then(function (res) {
      dict = res[0] || {};
      fallback = res[1] || {};
    }).catch(function (err) {
      /* 사전을 못 읽으면 한국어 그대로 보여 준다 */
      if (window.console) console.warn('i18n: ' + lang + ' 사전을 읽지 못했습니다', err);
      lang = 'ko';
      setHtmlLang('ko');
    });
  }

  var unveil = function () { root.classList.remove('i18n-pending'); };
  var guard = setTimeout(unveil, 1500);

  var ready = Promise.all([dictReady, domReady]).then(function () {
    if (lang !== 'ko') apply();
    clearTimeout(guard);
    unveil();
    buildSwitchers();
    window.I18N.lang = lang;
    root.dispatchEvent(new CustomEvent('i18n:ready', { detail: { lang: lang } }));
  });

  window.I18N = {
    lang: lang,
    langs: LANGS,
    t: t,
    apply: apply,
    ready: ready,
    url: urlWithLang
  };
})();
