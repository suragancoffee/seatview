// 영문 공연정보(날짜·제목·예매링크, 공연장 없음) + 국문 공연정보(제목·공연장, ~2024년)
// + 올림픽공원 대관정보(행사명·장소, 2013~2022년)를 엮어
// 공연마다 공연장을 정한다. 브라우저와 Node(GitHub Actions) 양쪽에서 같은 코드로 돈다.

// 국문 공연정보의 공연장 표기 → 사이트의 공연장 키
export function venueOfKo(r) {
  const v = r.venue || '', s = r.spatial || '';
  if (/KspoDome|체조/i.test(v)) return 'kspo';
  if (/핸드볼/.test(v)) return 'hb';
  if (/올림픽홀/.test(v)) return 'oh';
  if (/우리금융|K-?아트홀/.test(v)) return 'woori';   // K아트홀(K-아트홀)은 우리금융아트홀의 옛 이름
  if (/뮤즈라이브/.test(v)) return 'muse';
  const a = /88\s*잔디/.test(s), b = /수변/.test(s);
  if (!/,/.test(s)) { if (a && !b) return 'g88'; if (b && !a) return 'lake'; }
  return null;   // 기타시설·여러 공연장 동시 사용 등
}

// 영문 제목에 공연장 이름이 들어 있으면 그대로 사용
const TITLE_VENUE = [
  [/KSPO\s*DOME|GYMNASTICS ARENA/i, 'kspo'],
  [/TICKETLINK LIVE ARENA|HANDBALL/i, 'hb'],
  [/OLYMPIC HALL/i, 'oh'],
  [/WOORI\s*(FINANCIAL\s*)?ART\s*HALL|K-ART HALL/i, 'woori'],
  [/MUSE\s*LIVE/i, 'muse'],
  [/88\s*(JANDI|LAWN|GRASS)/i, 'g88'],
  [/LAKESIDE|SUBYEON|WATERSIDE STAGE/i, 'lake'],
];

const STOP = new Set(('TOUR WORLD CONCERT CONCERTS SEOUL IN THE LIVE FAN FANS MEETING FANMEETING FANCON CON ASIA ENCORE OF AND ' +
  'WITH SPECIAL FINAL FINALE SHOW FESTIVAL KOREA A ON TO FOR AT BY MY YOUR OUR NEW BEST PART VOL ' +
  'ST ND RD TH 1ST 2ND 3RD 4TH 5TH 6TH 7TH 8TH 9TH 10TH ANNIVERSARY OFFICIAL GLOBAL ARENA NIGHT DAY ' +
  '콘서트 서울 투어 전국투어 앵콜 단독 팬미팅 내한공연 공연 팬콘서트 서울공연').split(' '));

// 이 단어로 시작하는 제목은 첫 단어만으로 아티스트를 특정할 수 없어 두 단어까지 같아야 인정
const GENERIC = new Set(('SUPER BEAUTIFUL SEOUL PARK JAZZ MUSIC GRAND SOMEDAY LOVE POP KPOP K-POP JTN MBC SBS KBS EBS ' +
  'NCT KIM LEE CHOI JUNG JEONG YOON KANG CHO HAN SONG JANG LIM SHIN OH SEO KWON YOO HWANG AHN').split(' '));

export function tokens(title) {
  return String(title).toUpperCase()
    .replace(/&#X27;|&#39;|&QUOT;|&AMP;/g, ' ')
    .replace(/[^0-9A-Z가-힣]+/g, ' ')
    .split(' ')
    .filter(t => t && !STOP.has(t) && !/^\d+$/.test(t) && !/^\d+(ST|ND|RD|TH)$/.test(t) && !(/^[A-Z]$/.test(t)));
}

// 아티스트 키 = 제목 앞쪽의 의미 있는 단어 1~2개
export function artistKey(title) { return tokens(title).slice(0, 2); }

export function buildIndex(koRows) {
  return koRows.map(r => ({ v: venueOfKo(r), k: artistKey(r.title), title: r.title })).filter(r => r.v && r.k.length);
}

export function guessVenue(title, index) {
  for (const [re, v] of TITLE_VENUE) if (re.test(title)) return { venue: v, basis: 'title' };
  const key = artistKey(title);
  if (!key.length || key.join('').length < 3) return { venue: null, basis: null };
  // 제목 맨 앞의 아티스트 이름이 같은 지난 공연만 인정(중간 단어가 우연히 겹치는 오매칭 방지)
  if (key[0].length < 3) return { venue: null, basis: null };
  const generic = GENERIC.has(key[0]);
  if (generic && key.length < 2) return { venue: null, basis: null };
  const hits = index.filter(r => r.k[0] === key[0] && (!generic || r.k[1] === key[1]));
  if (!hits.length) return { venue: null, basis: null };
  const count = {};
  for (const h of hits) count[h.v] = (count[h.v] || 0) + 1;
  const [venue, n] = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  return { venue, basis: 'history', n, of: hits.length, example: hits[0].title };
}

export function decode(s) {
  return String(s).replace(/&#x27;|&#39;/gi, "'").replace(/&quot;/gi, '"').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

// 최종 산출물: 최근 공연 목록 + 공연장별 이력 통계
export function buildEvents(enRows, koRows, { since = '2025-01-01' } = {}) {
  const index = buildIndex(koRows);
  const events = cleanEvents(enRows
    .filter(e => e.date >= since)
    .map(e => {
      const title = decode(e.title), g = guessVenue(title, index);
      return { date: e.date, title, url: e.url, venue: g.venue, basis: g.basis, ...(g.basis === 'history' ? { n: g.n, of: g.of } : {}) };
    }));
  const history = {};
  for (const r of koRows) { const v = venueOfKo(r); if (v) history[v] = (history[v] || 0) + 1; }
  return { events, history, totalKo: koRows.length };
}

// 제목 칸에 URL만 들어간 행 제거, 같은 공연(제목 기준)이 여러 번 실린 경우 가장 최근 날짜 하나만 남김
export function cleanEvents(events) {
  const seen = new Map();
  for (const e of events) {
    if (!e.title || /^https?:\/\//i.test(e.title) || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) continue;
    const k = e.title.toUpperCase().replace(/[^0-9A-Z가-힣]/g, '');
    const prev = seen.get(k);
    if (!prev || e.date > prev.date) seen.set(k, e);
  }
  return [...seen.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}
