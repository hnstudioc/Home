/* ============================================================
   88폰 — 공용 스크립트
   ------------------------------------------------------------
   화면에 찍는 문장은 전부 t('키', '한국어') 로 감싼다.
   한국어가 아닐 때는 ../js/i18n.js 가 i18n/<lang>.json 에서 같은 키를 찾아 바꿔 준다.
   ============================================================ */
(function () {
  'use strict';

  var cfg = window.SITE_CONFIG || {};
  var released = cfg.RELEASED === true;

  function t(key, def, vars) {
    if (window.I18N && I18N.t) {
      var v = I18N.t(key, def, vars);
      if (v != null) return v;
    }
    if (vars) def = String(def).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return def;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {

  /* ---------- 1. 현재 쪽 메뉴 강조 ---------- */
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.head-links a').forEach(function (a) {
    var href = (a.getAttribute('href') || '').toLowerCase();
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ---------- 2. 자주 묻는 질문 ---------- */
  document.querySelectorAll('.faq-item').forEach(function (item, i) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    if (!q || !a) return;
    a.id = 'faq-a-' + i;
    q.setAttribute('aria-controls', a.id);
    q.setAttribute('aria-expanded', 'false');
    q.addEventListener('click', function () {
      var open = item.classList.toggle('open');
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- 3. 설정값을 화면에 반영 ---------- */

  // 스토어 버튼
  document.querySelectorAll('[data-store-link]').forEach(function (el) {
    if (released && cfg.PLAY_STORE_URL) {
      el.setAttribute('href', cfg.PLAY_STORE_URL);
      el.setAttribute('rel', 'noopener');
      el.removeAttribute('aria-disabled');
    } else {
      el.setAttribute('aria-disabled', 'true');
      var label = el.querySelector('[data-store-label]');
      if (label) label.textContent = t('s.soon', '곧 열립니다');
    }
  });

  // 스토어 리뷰 링크
  document.querySelectorAll('[data-store-review-link]').forEach(function (el) {
    if (released && cfg.PLAY_STORE_REVIEW_URL) {
      el.setAttribute('href', cfg.PLAY_STORE_REVIEW_URL);
      el.setAttribute('rel', 'noopener');
      el.removeAttribute('aria-disabled');
    } else {
      el.setAttribute('href', '#review-form');
      el.setAttribute('aria-disabled', 'true');
    }
  });

  // 스토어 주소를 글자로
  document.querySelectorAll('[data-store-url-text]').forEach(function (el) {
    el.textContent = released && cfg.PLAY_STORE_URL
      ? cfg.PLAY_STORE_URL
      : t('s.storeUrlPending', '스토어 등록이 끝나면 이곳에 주소가 나타납니다.');
  });

  // 출시 전 안내
  document.querySelectorAll('[data-release-notice]').forEach(function (el) {
    el.hidden = released;
  });

  // 값 (한국어는 config 의 '8,800원', 다른 언어는 사전의 s.price 예: '₩8,800')
  document.querySelectorAll('[data-price]').forEach(function (el) {
    if (cfg.UNLOCK_PRICE) el.textContent = t('s.price', cfg.UNLOCK_PRICE);
  });

  // 문의 메일
  document.querySelectorAll('[data-support-email]').forEach(function (el) {
    if (!cfg.SUPPORT_EMAIL) return;
    el.setAttribute('href', 'mailto:' + cfg.SUPPORT_EMAIL);
    if (el.dataset.supportEmail === 'text') el.textContent = cfg.SUPPORT_EMAIL;
  });

  // 개인정보처리방침 시행일
  document.querySelectorAll('[data-privacy-date]').forEach(function (el) {
    if (cfg.PRIVACY_DATE) el.textContent = t('s.privacyDate', cfg.PRIVACY_DATE);
  });

  // 올해
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- 4. 전자상거래 사업자 정보 ----------
     유료 결제가 있으므로 바닥글에 표기해야 한다.
     아직 값을 받지 못했으면 지어내지 않고 "준비 중"으로 둔다. */
  var biz = cfg.BUSINESS || {};
  var bizRows = [
    [t('s.biz.name', '상호'), biz.name],
    [t('s.biz.ceo', '대표자'), biz.ceo],
    [t('s.biz.regNo', '사업자등록번호'), biz.regNo],
    [t('s.biz.mailOrder', '통신판매업 신고번호'),
      biz.mailOrder && biz.mailOrderBy
        ? biz.mailOrder + ' (' + biz.mailOrderBy + ')'
        : biz.mailOrder],
    [t('s.biz.address', '주소'), biz.address],
    [t('s.biz.phone', '전화'), biz.phone]
  ].filter(function (r) { return r[1]; });

  document.querySelectorAll('[data-business]').forEach(function (el) {
    var html = '<h4>' + esc(t('s.biz.title', '사업자 정보')) + '</h4>';
    if (bizRows.length) {
      html += '<dl>';
      bizRows.forEach(function (r) {
        html += '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>';
      });
      if (cfg.SUPPORT_EMAIL) {
        html += '<dt>' + esc(t('s.biz.email', '이메일')) + '</dt><dd>' + esc(cfg.SUPPORT_EMAIL) + '</dd>';
      }
      html += '</dl>';
    } else {
      html += '<p class="todo">' + esc(t('s.biz.pending', '사업자 정보 등록 준비 중입니다.')) +
              (cfg.SUPPORT_EMAIL ? ' ' + esc(t('s.biz.pendingContact', '문의는 {email} 로 주세요.', { email: cfg.SUPPORT_EMAIL })) : '') +
              '</p>';
    }
    el.innerHTML = html;
  });

  // 개인정보처리방침 8조 문의처
  document.querySelectorAll('[data-privacy-contact]').forEach(function (el) {
    var lines = [];
    if (biz.name) lines.push(esc(biz.name) + (biz.ceo ? ' / ' + esc(t('s.biz.ceo', '대표자')) + ' ' + esc(biz.ceo) : ''));
    if (biz.address) lines.push(esc(biz.address));
    if (cfg.SUPPORT_EMAIL) lines.push(esc(t('s.biz.email', '이메일')) + ': ' + esc(cfg.SUPPORT_EMAIL));
    el.innerHTML = lines.length
      ? '<p>' + lines.join('<br>') + '</p>'
      : '<p>' + esc(t('s.biz.email', '이메일')) + ': ' + esc(cfg.SUPPORT_EMAIL || '') + '<br>' +
        '<span style="color:#8E2F08">' + esc(t('s.priv.pendingNote', '※ 상호·대표자·주소는 사업자 정보 확정 후 기재합니다.')) + '</span></p>';
  });

  /* ---------- 5. QR 코드 ---------- */
  document.querySelectorAll('[data-qr]').forEach(function (el) {
    if (!window.QR88) return;
    var target = released && cfg.PLAY_STORE_URL
      ? cfg.PLAY_STORE_URL
      : (cfg.SITE_URL || location.origin + '/');
    QR88.render(el, target, { dark: '#241A10', light: '#FFFFFF', label: t('s.qr.label', 'QR 코드: ') + target });
    var cap = document.querySelector(el.dataset.qr || '');
    if (cap) {
      cap.textContent = released
        ? t('s.qr.capReleased', '카메라로 비추면 설치 화면이 열립니다')
        : t('s.qr.capPending', '카메라로 비추면 이 쪽이 열립니다');
    }
  });

  /* ---------- 6. 후기 · 개선 요청 폼 ---------- */

  function collect(form) {
    var lines = [];
    form.querySelectorAll('[data-label]').forEach(function (el) {
      var label = el.dataset.label, value = '';
      if (el.type === 'radio') {
        var c = form.querySelector('input[name="' + el.name + '"]:checked');
        if (!c) return;
        if (lines.some(function (l) { return l.indexOf(label + ':') === 0; })) return;
        value = c.dataset.text || c.value;
      } else {
        value = (el.value || '').trim();
      }
      if (value) lines.push(label + ': ' + value);
    });
    return lines;
  }

  function showStatus(form, type, msg) {
    var box = form.querySelector('.status');
    if (!box) return;
    box.className = 'status show ' + type;
    box.textContent = msg;
  }

  function hideManual(form) {
    var box = form.querySelector('.manual-copy');
    if (box) box.hidden = true;
  }

  function showManual(form, text) {
    var box = form.querySelector('.manual-copy');
    if (!box) {
      box = document.createElement('div');
      box.className = 'manual-copy';
      box.innerHTML =
        '<label class="manual-copy-label" for="manual-copy-text">' +
        esc(t('s.form.manualLabel', '아래 내용을 길게 눌러 전체 선택한 뒤 복사해 주세요.')) + '</label>' +
        '<textarea class="textarea" id="manual-copy-text" readonly rows="6"></textarea>';
      form.insertBefore(box, form.querySelector('.status') || null);
    }
    box.hidden = false;
    var ta = box.querySelector('textarea');
    ta.value = text; ta.focus(); ta.select();
    showStatus(form, 'err',
      t('s.form.manualErr',
        '이 브라우저에서는 자동 복사가 막혀 있습니다. 아래 칸의 내용을 직접 복사해 {email} 로 보내 주세요.',
        { email: cfg.SUPPORT_EMAIL || t('s.form.fallbackContact', '문의처') }));
  }

  function fallbackCopy(text, done, form) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) { done(); return; }
    } catch (e) { /* 아래 수동 복사로 */ }
    showManual(form, text);
  }

  document.querySelectorAll('[data-mail-form]').forEach(function (form) {
    var subject = form.dataset.mailForm || '88폰';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var missing = null;
      form.querySelectorAll('[data-required]').forEach(function (el) {
        if (missing) return;
        if (el.type === 'radio') {
          if (!form.querySelector('input[name="' + el.name + '"]:checked')) missing = el.dataset.label;
        } else if (!(el.value || '').trim()) {
          missing = el.dataset.label; el.focus();
        }
      });
      if (missing) { showStatus(form, 'err', t('s.form.missing', '{field} 항목을 채워 주세요.', { field: missing })); return; }

      var lines = collect(form);
      if (!lines.length) { showStatus(form, 'err', t('s.form.empty', '내용을 채워 주세요.')); return; }

      var langTag = (window.I18N && I18N.lang && I18N.lang !== 'ko') ? '\n' + 'Language: ' + I18N.lang : '';
      var body = lines.join('\n') + '\n\n' + t('s.form.sentFrom', '— 88폰 홈페이지에서 보냄') + langTag;
      var href = 'mailto:' + encodeURIComponent(cfg.SUPPORT_EMAIL || '') +
        '?subject=' + encodeURIComponent('[' + subject + '] 88폰') +
        '&body=' + encodeURIComponent(body);

      showStatus(form, 'ok',
        t('s.form.opening',
          '메일 앱이 열립니다. 내용이 이미 적혀 있으니 그대로 보내기만 누르시면 됩니다. ' +
          '메일 앱이 열리지 않으면 아래 "내용 복사하기"를 눌러 주세요.'));
      location.href = href;
    });

    var copyBtn = form.querySelector('[data-copy]');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var lines = collect(form);
        if (!lines.length) { showStatus(form, 'err', t('s.form.fillFirst', '먼저 내용을 채워 주세요.')); return; }
        var text = lines.join('\n');
        var done = function () {
          hideManual(form);
          showStatus(form, 'ok',
            t('s.form.copied', '내용을 복사했습니다. 메일이나 문자에 붙여넣어 {email} 로 보내 주세요.',
              { email: cfg.SUPPORT_EMAIL || t('s.form.fallbackContact', '문의처') }));
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done, form); });
        } else {
          fallbackCopy(text, done, form);
        }
      });
    }
  });

  /* ---------- 7. 외부 폼(구글 폼 등)을 쓸 때 ---------- */
  document.querySelectorAll('[data-external-form]').forEach(function (el) {
    var url = cfg[el.dataset.externalForm];
    if (!url) return;
    el.hidden = false;
    var link = el.querySelector('a');
    if (link) { link.setAttribute('href', url); link.setAttribute('rel', 'noopener'); }
    document.querySelectorAll('[data-builtin-form="' + el.dataset.externalForm + '"]')
      .forEach(function (f) { f.hidden = true; });
  });

  /* ---------- 8. 번역본 안내 (개인정보처리방침) ---------- */
  document.querySelectorAll('.only-i18n').forEach(function (el) {
    var lang = (window.I18N && I18N.lang) || 'ko';
    el.hidden = (lang === 'ko') || !el.innerHTML.trim();
  });

  /* ---------- 9. 소개 동영상 ----------
     언어마다 영상이 따로 있다. 보시는 언어의 것을 골라 둔다.
     누르기 전에는 표지 그림뿐이라 유튜브로 아무 요청도 가지 않는다 —
     광고도 추적도 없다고 적어 둔 앱이니 소개 페이지도 그래야 한다. */
  var PROMO = {
    ko: '5uWU-0spupw', en: 'oVmXeo_tLKw', ja: '0iKlwDJJ7Ns', zh: 'Tz0aa9iq1Rc',
    es: 'zPavR7s4S3k', fr: 'Yo_IrY5Fjg4', de: '1AHCnOzkIqU', it: '7Zi2FT0O4sY',
    pt: 'p2nZVn64s3Q', ru: '0D1f9ibp-sI', hi: 'ZdaagPPTcZ4', th: 'AhM1BOAKF3Y',
    vi: 'j_TcKFZ6554', id: 'jGytHR1SVfE'
  };
  (function () {
    var btn = document.getElementById('video-play');
    if (!btn) return;
    var lang = (window.I18N && I18N.lang) || 'ko';
    if (!PROMO[lang]) lang = 'en';
    var poster = document.getElementById('video-poster');
    if (poster) poster.src = 'image/promo-' + lang + '.jpg';

    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      /* nocookie 쪽으로 부른다. 재생하기 전까지는 쿠키가 남지 않는다. */
      f.src = 'https://www.youtube-nocookie.com/embed/' + PROMO[lang] +
              '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
      f.title = t('p88.video.h2', '13초만 보시면 압니다');
      f.allow = 'autoplay; encrypted-media; picture-in-picture';
      f.allowFullscreen = true;
      f.setAttribute('loading', 'lazy');
      btn.replaceWith(f);
    }, { once: true });
  })();

  } /* init */

  /* 사전을 다 읽은 뒤에 그린다. i18n.js 가 없으면 바로 그린다. */
  if (window.I18N && I18N.ready) I18N.ready.then(init);
  else init();
})();
