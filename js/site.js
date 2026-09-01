/* ============================================================
   88Phone — 공용 스크립트
   ============================================================ */
(function () {
  'use strict';

  var cfg = window.SITE_CONFIG || {};

  /* ---------- 1. 글씨 크기 조절 ---------- */
  var SIZES = ['', 'fs-large', 'fs-xlarge'];
  var STORE_KEY = 'phone88-font-size';

  function applyFontSize(level) {
    var root = document.documentElement;
    SIZES.forEach(function (cls) { if (cls) root.classList.remove(cls); });
    if (SIZES[level]) root.classList.add(SIZES[level]);
    document.querySelectorAll('.fs-btn').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(Number(btn.dataset.size) === level));
    });
    try { localStorage.setItem(STORE_KEY, String(level)); } catch (e) { /* 저장 불가 시 무시 */ }
  }

  var savedSize = 0;
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw !== null) savedSize = Math.min(2, Math.max(0, parseInt(raw, 10) || 0));
  } catch (e) { /* 읽기 불가 시 기본값 */ }
  applyFontSize(savedSize);

  document.querySelectorAll('.fs-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyFontSize(Number(btn.dataset.size));
    });
  });

  /* ---------- 2. 모바일 메뉴 ---------- */
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav-toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- 3. 현재 페이지 메뉴 강조 ---------- */
  var page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    var href = (a.getAttribute('href') || '').toLowerCase();
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ---------- 4. 자주 묻는 질문 아코디언 ---------- */
  document.querySelectorAll('.faq-item').forEach(function (item, i) {
    var q = item.querySelector('.faq-question');
    var a = item.querySelector('.faq-answer');
    if (!q || !a) return;
    var id = 'faq-answer-' + i;
    a.id = id;
    q.setAttribute('aria-controls', id);
    q.setAttribute('aria-expanded', 'false');
    q.addEventListener('click', function () {
      var open = item.classList.toggle('open');
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- 5. 설정값을 화면에 반영 ---------- */
  var released = cfg.RELEASED === true;

  // 스토어로 연결되는 모든 버튼/링크
  document.querySelectorAll('[data-store-link]').forEach(function (el) {
    if (released && cfg.PLAY_STORE_URL) {
      el.setAttribute('href', cfg.PLAY_STORE_URL);
      el.setAttribute('rel', 'noopener');
    } else {
      // 아직 등록 전 — 잘못된 주소로 보내지 않는다
      el.setAttribute('href', '#download-notice');
      el.setAttribute('aria-disabled', 'true');
      var label = el.querySelector('[data-store-label]');
      if (label) label.textContent = '출시 준비 중';
    }
  });

  // 스토어 리뷰(별점) 작성 링크
  document.querySelectorAll('[data-store-review-link]').forEach(function (el) {
    if (released && cfg.PLAY_STORE_REVIEW_URL) {
      el.setAttribute('href', cfg.PLAY_STORE_REVIEW_URL);
      el.setAttribute('rel', 'noopener');
    } else {
      el.setAttribute('href', '#review-form');
      el.setAttribute('aria-disabled', 'true');
    }
  });

  // 주소를 글자로 보여 주는 곳
  document.querySelectorAll('[data-store-url-text]').forEach(function (el) {
    el.textContent = released && cfg.PLAY_STORE_URL
      ? cfg.PLAY_STORE_URL
      : '앱 등록이 끝나면 이곳에 주소가 표시됩니다.';
  });

  // 문의 이메일
  document.querySelectorAll('[data-contact-email]').forEach(function (el) {
    if (!cfg.CONTACT_EMAIL) return;
    el.textContent = cfg.CONTACT_EMAIL;
    if (el.tagName === 'A') el.setAttribute('href', 'mailto:' + cfg.CONTACT_EMAIL);
  });

  // 출시 전 안내 배너 (등록이 끝나면 자동으로 사라짐)
  document.querySelectorAll('[data-release-notice]').forEach(function (el) {
    el.hidden = released;
  });

  /* ---------- 6. QR 코드 그리기 ---------- */
  document.querySelectorAll('[data-qr]').forEach(function (el) {
    if (!window.QR88) return;
    // 출시 전에는 홈페이지 주소를, 출시 후에는 플레이스토어 주소를 담는다.
    var target = released && cfg.PLAY_STORE_URL
      ? cfg.PLAY_STORE_URL
      : (cfg.SITE_URL || window.location.origin + '/');
    var labelEl = document.querySelector(el.dataset.qr || '');
    QR88.render(el, target, {
      dark: '#1A1A1A',
      light: '#FFFFFF',
      label: 'QR 코드: ' + target
    });
    if (labelEl) {
      labelEl.textContent = released
        ? '카메라로 비추면 설치 화면이 열립니다'
        : '카메라로 비추면 이 홈페이지가 열립니다';
    }
  });

  /* ---------- 7. 후기 · 개선요청 폼 ---------- */

  // 폼 내용을 사람이 읽기 좋은 텍스트로 정리
  function collect(form) {
    var lines = [];
    form.querySelectorAll('[data-label]').forEach(function (el) {
      var label = el.dataset.label;
      var value = '';

      if (el.type === 'radio') {
        var checked = form.querySelector('input[name="' + el.name + '"]:checked');
        if (!checked) return;
        // 같은 이름의 라디오는 한 번만 기록
        if (lines.some(function (l) { return l.indexOf(label + ':') === 0; })) return;
        value = checked.dataset.text || checked.value;
      } else {
        value = (el.value || '').trim();
      }
      if (value) lines.push(label + ': ' + value);
    });
    return lines;
  }

  function showStatus(form, type, message) {
    var box = form.querySelector('.form-status');
    if (!box) return;
    box.className = 'form-status show ' + type;
    box.textContent = message;
    box.setAttribute('role', 'status');
  }

  document.querySelectorAll('[data-mail-form]').forEach(function (form) {
    var subjectPrefix = form.dataset.mailForm || '88Phone';

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // 필수 항목 확인
      var missing = null;
      form.querySelectorAll('[data-required]').forEach(function (el) {
        if (missing) return;
        if (el.type === 'radio') {
          if (!form.querySelector('input[name="' + el.name + '"]:checked')) {
            missing = el.dataset.label;
          }
        } else if (!(el.value || '').trim()) {
          missing = el.dataset.label;
          el.focus();
        }
      });
      if (missing) {
        showStatus(form, 'err', missing + ' 항목을 입력해 주세요.');
        return;
      }

      var lines = collect(form);
      if (!lines.length) {
        showStatus(form, 'err', '내용을 입력해 주세요.');
        return;
      }

      var body = lines.join('\n') + '\n\n— 88Phone 홈페이지에서 보냄';
      var email = cfg.CONTACT_EMAIL || '';
      var href = 'mailto:' + encodeURIComponent(email) +
        '?subject=' + encodeURIComponent('[' + subjectPrefix + '] 88Phone') +
        '&body=' + encodeURIComponent(body);

      showStatus(form, 'ok',
        '메일 앱이 열립니다. 내용이 이미 적혀 있으니 그대로 "보내기"만 누르시면 됩니다. ' +
        '메일 앱이 열리지 않으면 아래 "내용 복사하기"를 눌러 주세요.');

      window.location.href = href;
    });

    // 내용 복사하기
    var copyBtn = form.querySelector('[data-copy]');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var lines = collect(form);
        if (!lines.length) {
          showStatus(form, 'err', '먼저 내용을 입력해 주세요.');
          return;
        }
        var text = lines.join('\n');
        var done = function () {
          hideManualCopy(form);
          showStatus(form, 'ok',
            '내용을 복사했습니다. 메일이나 문자에 붙여넣어 ' +
            (cfg.CONTACT_EMAIL || '문의처') + ' 로 보내 주세요.');
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done, form); });
        } else {
          fallbackCopy(text, done, form);
        }
      });
    }
  });

  /* 브라우저가 자동 복사를 막는 경우: 내용을 화면에 펼쳐 직접 복사하시게 한다 */
  function fallbackCopy(text, done, form) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) { done(); return; }
    } catch (e) { /* 아래 수동 복사 안내로 넘어감 */ }
    showManualCopy(form, text);
  }

  function showManualCopy(form, text) {
    var box = form.querySelector('.manual-copy');
    if (!box) {
      box = document.createElement('div');
      box.className = 'manual-copy';
      box.innerHTML =
        '<label class="manual-copy-label" for="manual-copy-text">' +
        '아래 내용을 길게 눌러 전체 선택한 뒤 복사해 주세요.</label>' +
        '<textarea class="textarea" id="manual-copy-text" readonly rows="6"></textarea>';
      var status = form.querySelector('.form-status');
      form.insertBefore(box, status || null);
    }
    box.hidden = false;
    var ta = box.querySelector('textarea');
    ta.value = text;
    ta.focus();
    ta.select();
    showStatus(form, 'err',
      '이 브라우저에서는 자동 복사가 막혀 있습니다. ' +
      '아래 칸의 내용을 직접 복사해 ' + (cfg.CONTACT_EMAIL || '문의처') + ' 로 보내 주세요.');
  }

  function hideManualCopy(form) {
    var box = form.querySelector('.manual-copy');
    if (box) box.hidden = true;
  }

  /* ---------- 8. 외부 폼(구글 폼 등)이 설정된 경우 ---------- */
  document.querySelectorAll('[data-external-form]').forEach(function (el) {
    var key = el.dataset.externalForm;      // 'REVIEW_FORM_URL' 또는 'FEEDBACK_FORM_URL'
    var url = cfg[key];
    if (!url) return;                       // 설정 없음 → 사이트 내 폼 그대로 사용
    el.hidden = false;
    var link = el.querySelector('a');
    if (link) { link.setAttribute('href', url); link.setAttribute('rel', 'noopener'); }
    // 외부 폼을 쓰는 경우 사이트 내 폼은 숨긴다
    document.querySelectorAll('[data-builtin-form="' + key + '"]').forEach(function (f) {
      f.hidden = true;
    });
  });

  /* ---------- 9. 올해 연도 ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
