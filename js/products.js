/* ============================================================
   HaNull Studio 포털 — 제품 목록
   ------------------------------------------------------------
   새 앱이나 서비스를 만들면
     1) 저장소 최상위에 폴더를 하나 만들어 사이트를 넣고
     2) 아래 목록에 항목 하나를 추가하면
   포털 첫 화면에 카드가 자동으로 생깁니다.

   순서를 바꾸고 싶으면 아래 배열의 순서만 바꾸면 됩니다.
   ============================================================ */

window.PRODUCTS = [

  {
    id: '88phone',
    name: '88Phone',
    tagline: '어르신을 위한 큰 글씨 스마트폰 앱',
    description:
      '글씨와 버튼을 큼직하게 키운 안드로이드 홈 화면 앱입니다. ' +
      '자주 쓰는 기능만 남겨 스마트폰을 다시 쉽게 만듭니다.',
    audience: '시니어 · 안드로이드',
    url: '88phone/',
    logo: '88phone/image/logo.svg',
    accent: '#0B57A4',
    /* status: 배지를 없애려면 null 로 두세요.
       tone 은 'live'(초록) · 'pending'(주황) · 'archived'(회색) 중 하나 */
    status: { label: '출시 준비 중', tone: 'pending' }
  },

  {
    id: 'alphawiz',
    name: 'AlphaWiz',
    tagline: 'AI 기반 주식 분석 서비스',
    description:
      '코스피·코스닥과 미국 증시를 대상으로 기술적 분석과 펀더멘탈 분석을 ' +
      'AI가 정리해 주는 웹 서비스입니다.',
    audience: '개인투자자 · 웹',
    url: 'alphawiz/',
    logo: 'alphawiz/image/logo.svg',
    accent: '#6B5BFF',
    status: { label: '서비스 준비 중', tone: 'pending' }
  },

  {
    id: 'screeneagle',
    name: 'ScreenEagle',
    tagline: '화면 움직임 감지 알림 유틸리티',
    description:
      '윈도우 화면에 움직임이 생기면 알려 주는 프로그램입니다. ' +
      '디스코드·텔레그램·슬랙, 그리고 카카오톡 알림톡으로 알림을 보냅니다.',
    audience: 'Windows · 데스크톱',
    url: 'screeneagle/',
    logo: 'image/product-screeneagle.png',
    accent: '#E5A50A',
    /* 현재 판매·지원 상태를 몰라 배지를 비워 두었습니다.
       판매 중이면  { label: '서비스 중',   tone: 'live' }
       종료했다면   { label: '지원 종료',   tone: 'archived' }  로 바꾸세요. */
    status: null
  }

];
