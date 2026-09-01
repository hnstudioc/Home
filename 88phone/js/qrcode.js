/*!
 * 88Phone — 최소 QR 코드 생성기 (QR Model 2 / Byte mode / EC Level M)
 * 외부 라이브러리·CDN 의존성 없음. SVG를 직접 그려 반환한다.
 *
 * 사용법:
 *   QR88.toSVG('https://example.com', { size: 240, quiet: 4 })  ->  SVG 문자열
 *   QR88.render(document.getElementById('qr'), 'https://example.com')
 *
 * 지원 버전: 1~10 (Byte mode, EC-M 기준 최대 213바이트, UTF-8 기준)
 */
(function (global) {
  'use strict';

  /* ---------- 버전별 RS 블록 구성 (EC Level M) ----------
     [ EC codewords per block, [ [블록 수, 블록당 데이터 codeword], ... ] ] */
  var RS_BLOCKS = {
    1: [10, [[1, 16]]],
    2: [16, [[1, 28]]],
    3: [26, [[1, 44]]],
    4: [18, [[2, 32]]],
    5: [24, [[2, 43]]],
    6: [16, [[4, 27]]],
    7: [18, [[4, 31]]],
    8: [22, [[2, 38], [2, 39]]],
    9: [22, [[3, 36], [2, 37]]],
    10: [26, [[4, 43], [1, 44]]]
  };

  /* 정렬 패턴 중심 좌표 */
  var ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };

  /* ---------- GF(256) 로그 테이블 (원시 다항식 0x11D) ---------- */
  var EXP = new Array(512), LOG = new Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  /* 차수 n의 생성 다항식 */
  function rsGenerator(n) {
    var poly = [1];
    for (var i = 0; i < n; i++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  /* 데이터 codeword 배열 -> EC codeword 배열 */
  function rsEncode(data, ecLen) {
    var gen = rsGenerator(ecLen);
    var res = new Array(data.length + ecLen).fill(0);
    for (var i = 0; i < data.length; i++) res[i] = data[i];
    for (var k = 0; k < data.length; k++) {
      var factor = res[k];
      if (factor === 0) continue;
      for (var j = 0; j < gen.length; j++) {
        res[k + j] ^= gfMul(gen[j], factor);
      }
    }
    return res.slice(data.length);
  }

  /* ---------- 비트 버퍼 ---------- */
  function BitBuffer() { this.bits = []; }
  BitBuffer.prototype.put = function (value, length) {
    for (var i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  };

  /* ---------- UTF-8 인코딩 ---------- */
  function utf8Bytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) {
        out.push(c);
      } else if (c < 0x800) {
        out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
      } else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {
        var lo = str.charCodeAt(i + 1);
        var cp = 0x10000 + ((c - 0xD800) << 10) + (lo - 0xDC00);
        i++;
        out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F),
                 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
      } else {
        out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
      }
    }
    return out;
  }

  function dataCapacity(version) {
    var spec = RS_BLOCKS[version], total = 0;
    spec[1].forEach(function (g) { total += g[0] * g[1]; });
    return total;
  }

  function chooseVersion(byteLen) {
    for (var v = 1; v <= 10; v++) {
      // 모드 지시자 4비트 + 문자 수 지시자 8비트(v1~9) / 16비트(v10)
      var header = 4 + (v < 10 ? 8 : 16);
      if (dataCapacity(v) * 8 >= header + byteLen * 8) return v;
    }
    return null;
  }

  /* ---------- 데이터 codeword 생성 (블록 인터리빙 포함) ---------- */
  function buildCodewords(bytes, version) {
    var spec = RS_BLOCKS[version];
    var ecLen = spec[0];
    var capacityBits = dataCapacity(version) * 8;

    var buf = new BitBuffer();
    buf.put(0x4, 4);                              // Byte mode
    buf.put(bytes.length, version < 10 ? 8 : 16); // 문자 수
    for (var i = 0; i < bytes.length; i++) buf.put(bytes[i], 8);

    // 종단자 + 바이트 정렬
    var remain = capacityBits - buf.bits.length;
    buf.put(0, Math.min(4, remain));
    while (buf.bits.length % 8 !== 0) buf.bits.push(0);

    // 패딩 codeword
    var pad = [0xEC, 0x11], p = 0;
    while (buf.bits.length < capacityBits) {
      buf.put(pad[p++ % 2], 8);
    }

    var all = [];
    for (var b = 0; b < buf.bits.length; b += 8) {
      var v = 0;
      for (var k = 0; k < 8; k++) v = (v << 1) | buf.bits[b + k];
      all.push(v);
    }

    // 블록 분할
    var dataBlocks = [], ecBlocks = [], offset = 0;
    spec[1].forEach(function (g) {
      for (var n = 0; n < g[0]; n++) {
        var block = all.slice(offset, offset + g[1]);
        offset += g[1];
        dataBlocks.push(block);
        ecBlocks.push(rsEncode(block, ecLen));
      }
    });

    // 인터리빙
    var result = [];
    var maxData = Math.max.apply(null, dataBlocks.map(function (d) { return d.length; }));
    for (var c = 0; c < maxData; c++) {
      for (var d = 0; d < dataBlocks.length; d++) {
        if (c < dataBlocks[d].length) result.push(dataBlocks[d][c]);
      }
    }
    for (var e = 0; e < ecLen; e++) {
      for (var f = 0; f < ecBlocks.length; f++) result.push(ecBlocks[f][e]);
    }
    return result;
  }

  /* ---------- 매트릭스 ---------- */
  function makeMatrix(size) {
    var m = [];
    for (var r = 0; r < size; r++) m.push(new Array(size).fill(null));
    return m;
  }

  function placeFinder(m, reserved, row, col) {
    for (var r = -1; r <= 7; r++) {
      for (var c = -1; c <= 7; c++) {
        var rr = row + r, cc = col + c;
        if (rr < 0 || cc < 0 || rr >= m.length || cc >= m.length) continue;
        var dark =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        m[rr][cc] = dark ? 1 : 0;
        reserved[rr][cc] = 1;
      }
    }
  }

  function placeAlignment(m, reserved, version) {
    var centers = ALIGN[version], size = m.length;
    for (var i = 0; i < centers.length; i++) {
      for (var j = 0; j < centers.length; j++) {
        var cr = centers[i], cc = centers[j];
        // 파인더 패턴과 겹치는 위치는 제외
        if ((cr <= 8 && cc <= 8) ||
            (cr <= 8 && cc >= size - 9) ||
            (cr >= size - 9 && cc <= 8)) continue;
        for (var r = -2; r <= 2; r++) {
          for (var c = -2; c <= 2; c++) {
            var dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
            m[cr + r][cc + c] = dark ? 1 : 0;
            reserved[cr + r][cc + c] = 1;
          }
        }
      }
    }
  }

  function placeTiming(m, reserved) {
    var size = m.length;
    for (var i = 8; i < size - 8; i++) {
      var dark = i % 2 === 0 ? 1 : 0;
      if (reserved[6][i] !== 1) { m[6][i] = dark; reserved[6][i] = 1; }
      if (reserved[i][6] !== 1) { m[i][6] = dark; reserved[i][6] = 1; }
    }
  }

  function reserveFormat(m, reserved, version) {
    var size = m.length;
    for (var i = 0; i < 9; i++) {
      if (i !== 6) { reserved[8][i] = 1; reserved[i][8] = 1; }
    }
    reserved[8][6] = 1;
    reserved[6][8] = 1;
    for (var j = 0; j < 8; j++) {
      reserved[8][size - 1 - j] = 1;
      reserved[size - 1 - j][8] = 1;
    }
    // 항상 검은 모듈
    m[size - 8][8] = 1;
    reserved[size - 8][8] = 1;

    if (version >= 7) {
      for (var r = 0; r < 6; r++) {
        for (var c = 0; c < 3; c++) {
          reserved[r][size - 11 + c] = 1;
          reserved[size - 11 + c][r] = 1;
        }
      }
    }
  }

  /* 데이터 비트 배치: 오른쪽에서 왼쪽으로 2열씩 지그재그 */
  function placeData(m, reserved, codewords) {
    var size = m.length;
    var bitIdx = 0, total = codewords.length * 8;
    var upward = true;

    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--; // 세로 타이밍 패턴 열은 건너뜀
      for (var i = 0; i < size; i++) {
        var row = upward ? size - 1 - i : i;
        for (var k = 0; k < 2; k++) {
          var c = col - k;
          if (reserved[row][c] === 1) continue;
          var bit = 0;
          if (bitIdx < total) {
            bit = (codewords[bitIdx >> 3] >>> (7 - (bitIdx & 7))) & 1;
          }
          m[row][c] = bit;
          bitIdx++;
        }
      }
      upward = !upward;
    }
  }

  var MASKS = [
    function (r, c) { return (r + c) % 2 === 0; },
    function (r) { return r % 2 === 0; },
    function (r, c) { return c % 3 === 0; },
    function (r, c) { return (r + c) % 3 === 0; },
    function (r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; },
    function (r, c) { return ((r * c) % 2) + ((r * c) % 3) === 0; },
    function (r, c) { return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0; },
    function (r, c) { return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0; }
  ];

  function applyMask(m, reserved, maskIdx) {
    var fn = MASKS[maskIdx], size = m.length;
    var out = m.map(function (row) { return row.slice(); });
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (reserved[r][c] === 1) continue;
        if (fn(r, c)) out[r][c] ^= 1;
      }
    }
    return out;
  }

  /* 형식 정보: EC Level M(=00) + 마스크 3비트, BCH(15,5) */
  function formatBits(maskIdx) {
    var data = (0x00 << 3) | maskIdx; // Level M = 0b00
    var v = data << 10;
    for (var i = 14; i >= 10; i--) {
      if ((v >>> i) & 1) v ^= 0x537 << (i - 10);
    }
    return ((data << 10) | v) ^ 0x5412;
  }

  function placeFormat(m, maskIdx) {
    var size = m.length, bits = formatBits(maskIdx);
    for (var i = 0; i < 15; i++) {
      var bit = (bits >>> i) & 1;
      // 좌상단 세로 + 가로
      if (i < 6) m[i][8] = bit;
      else if (i < 8) m[i + 1][8] = bit;
      else if (i === 8) m[8][7] = bit;
      else m[8][14 - i] = bit;

      // 복사본 (우상단 가로 + 좌하단 세로)
      if (i < 8) m[8][size - 1 - i] = bit;
      else m[size - 15 + i][8] = bit;
    }
  }

  /* 버전 정보: BCH(18,6), 버전 7 이상 */
  function versionBits(version) {
    var v = version << 12;
    for (var i = 17; i >= 12; i--) {
      if ((v >>> i) & 1) v ^= 0x1F25 << (i - 12);
    }
    return (version << 12) | v;
  }

  function placeVersion(m, version) {
    if (version < 7) return;
    var size = m.length, bits = versionBits(version);
    for (var i = 0; i < 18; i++) {
      var bit = (bits >>> i) & 1;
      var r = Math.floor(i / 3), c = i % 3;
      m[r][size - 11 + c] = bit;
      m[size - 11 + c][r] = bit;
    }
  }

  /* ---------- 마스크 패널티 ---------- */
  function penalty(m) {
    var size = m.length, score = 0, r, c, i;

    // 규칙 1: 같은 색 5개 이상 연속
    function lineScore(get) {
      var s = 0;
      for (var a = 0; a < size; a++) {
        var run = 1;
        for (var b = 1; b < size; b++) {
          if (get(a, b) === get(a, b - 1)) {
            run++;
          } else {
            if (run >= 5) s += run - 2;
            run = 1;
          }
        }
        if (run >= 5) s += run - 2;
      }
      return s;
    }
    score += lineScore(function (a, b) { return m[a][b]; });
    score += lineScore(function (a, b) { return m[b][a]; });

    // 규칙 2: 2x2 동색 블록
    for (r = 0; r < size - 1; r++) {
      for (c = 0; c < size - 1; c++) {
        var v = m[r][c];
        if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
      }
    }

    // 규칙 3: 1:1:3:1:1 패턴 + 4모듈 공백
    var p1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var p2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function matchAt(get, a, b, pat) {
      for (var k = 0; k < 11; k++) if (get(a, b + k) !== pat[k]) return false;
      return true;
    }
    for (r = 0; r < size; r++) {
      for (c = 0; c <= size - 11; c++) {
        if (matchAt(function (x, y) { return m[x][y]; }, r, c, p1)) score += 40;
        if (matchAt(function (x, y) { return m[x][y]; }, r, c, p2)) score += 40;
      }
    }
    for (c = 0; c < size; c++) {
      for (r = 0; r <= size - 11; r++) {
        if (matchAt(function (x, y) { return m[y][x]; }, c, r, p1)) score += 40;
        if (matchAt(function (x, y) { return m[y][x]; }, c, r, p2)) score += 40;
      }
    }

    // 규칙 4: 명암 비율 편차
    var dark = 0;
    for (r = 0; r < size; r++) for (c = 0; c < size; c++) if (m[r][c]) dark++;
    var pct = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;

    return score;
  }

  /* ---------- 공개 API ---------- */
  function encode(text) {
    var bytes = utf8Bytes(String(text));
    var version = chooseVersion(bytes.length);
    if (!version) throw new Error('QR88: 데이터가 너무 깁니다 (최대 213바이트, UTF-8 기준).');

    var size = version * 4 + 17;
    var codewords = buildCodewords(bytes, version);

    var base = makeMatrix(size);
    var reserved = makeMatrix(size).map(function (row) { return row.fill(0); });

    placeFinder(base, reserved, 0, 0);
    placeFinder(base, reserved, 0, size - 7);
    placeFinder(base, reserved, size - 7, 0);
    placeAlignment(base, reserved, version);
    placeTiming(base, reserved);
    reserveFormat(base, reserved, version);
    placeData(base, reserved, codewords);

    var best = null, bestScore = Infinity, bestMask = 0;
    for (var mask = 0; mask < 8; mask++) {
      var candidate = applyMask(base, reserved, mask);
      placeFormat(candidate, mask);
      placeVersion(candidate, version);
      var s = penalty(candidate);
      if (s < bestScore) { bestScore = s; best = candidate; bestMask = mask; }
    }
    best.version = version;
    best.mask = bestMask;
    return best;
  }

  function toSVG(text, opts) {
    opts = opts || {};
    var quiet = opts.quiet == null ? 4 : opts.quiet;
    var dark = opts.dark || '#16202B';
    var light = opts.light || '#FFFFFF';
    var label = opts.label || 'QR 코드';

    var m = encode(text);
    var n = m.length;
    var total = n + quiet * 2;

    var path = [];
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (m[r][c]) path.push('M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z');
      }
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total +
      '" width="100%" height="100%" shape-rendering="crispEdges" role="img" aria-label="' +
      escapeAttr(label) + '">' +
      '<rect width="' + total + '" height="' + total + '" fill="' + light + '"/>' +
      '<path fill="' + dark + '" d="' + path.join('') + '"/>' +
      '</svg>';
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render(el, text, opts) {
    if (!el) return;
    try {
      el.innerHTML = toSVG(text, opts);
    } catch (e) {
      el.textContent = 'QR 코드를 표시할 수 없습니다.';
    }
  }

  global.QR88 = { encode: encode, toSVG: toSVG, render: render };
})(typeof window !== 'undefined' ? window : this);
