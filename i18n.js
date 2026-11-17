// 한/영 전환. 화면의 한글 텍스트 노드를 지켜보다가 영어 모드에서 자동으로 바꾼다.
// 1) 문장·문구는 사전(DICT)으로 그대로, 2) 좌석 이름처럼 조합되는 말은 단어 규칙(WORDS)으로 바꾼다.
// 공연 제목처럼 원문 그대로 둘 곳은 class="notr" 로 감싼다.

const DICT = {
  '내 자리 미리보기 · 올림픽공원 공연장': 'Seat View · Olympic Park Venues',
  'KSPO 공공데이터 활용 · 실감형 콘텐츠': 'Built on KSPO public data · 3D venue models',
  '내 자리 미리보기': 'Seat View',
  '올림픽공원 공연장 3D 모델로, 예매 전에 내 좌석에서 무대가 어떻게 보이는지 확인하세요.': 'See the stage from your seat before you book, using 3D models of the Olympic Park venues.',
  '우리금융아트홀': 'Woori Financial Art Hall', '티켓링크 라이브 아레나': 'Ticketlink Live Arena', '수변무대': 'Lakeside Stage',
  '88잔디마당': '88 Lawn', '올림픽홀': 'Olympic Hall', '뮤즈라이브': 'Muse Live',
  '1,185석 · 공연장형': '1,185 seats · theater', '14,151석 · 아레나형': '14,151 seats · arena', '5,003석 · 핸드볼경기장': '5,003 seats · arena',
  '야외 · 계단식 객석': 'Outdoor · terraced seats', '야외 · 잔디 관람': 'Outdoor · lawn', '2,432석 · 3D 미개방': '2,432 seats · no 3D data', '237석 · 3D 미개방': '237 seats · no 3D data',
  '52개 구역 13,948석 + 휠체어석 82 + BOX석 121': '52 zones 13,948 seats + 82 wheelchair + 121 box seats',
  '공연장으로 찾기': 'By venue', '공연으로 찾기': 'By show',
  '무 대': 'STAGE', '무대': 'Stage', '플로어': 'Floor', '핸드볼 코트': 'Handball court',
  '위쪽이 앞열(무대 쪽)': 'Top rows are nearest the stage', '막대를 눌러 열 선택': 'Tap a bar to pick a row',
  '무대 배치': 'Stage layout', '공연마다 달라요': 'varies by show',
  '구역을 눌러 선택 · 가운데는 플로어': 'Tap a zone · center is the floor', '회색: 무대 뒤': 'Grey: behind stage',
  '구역 안 위치': 'Position in zone', '공연 형태': 'Event type',
  '안쪽: 1층 이동식석 · 바깥: 2층 고정석': 'Inner: 1F retractable · Outer: 2F fixed', '위쪽이 북측(2-3문)': 'North (Gate 2-3) is up',
  '이 공연장은 아직 3D 데이터가 공개되지 않았어요. 좌석배치도와 평면도를 바탕으로 거리와 시야를 추정해 보여드려요.':
    'No 3D data has been released for this venue yet. Distances and views are estimated from the seating chart and floor plans.',
  '구역': 'Zone', 'Floor 위치': 'Floor position',
  '무대 앞까지 거리': 'Distance to stage', '무대 가장자리까지 거리': 'Distance to stage edge', '코트 중앙까지 거리': 'Distance to court center',
  '무대 대비 시선': 'Eye line vs. stage', '코트 대비 시선': 'Eye line vs. court',
  '출연자가 보이는 크기': 'How big performers look', '선수가 보이는 크기': 'How big players look', '추천 대상': 'Good for',
  '무대에 출연자(키 175cm) 세워보기': 'Show performers (175 cm) on stage',
  '3D 공연장 불러오는 중…': 'Loading 3D venue…', '3D 모델을 불러오지 못했습니다.': 'Could not load the 3D model.',
  '시야 스케치': 'View sketch',
  '선택한 좌석 눈높이에서 본 무대를 간단한 원근도로 그렸어요. 주황색은 키 175cm 출연자예요. 거리·높이는 도면 기반 추정값이에요.':
    'A simple perspective of the stage from the selected seat. Orange figures are 175 cm performers. Distances and heights are estimates from floor plans.',
  '드래그로 둘러보기': 'Drag to look around', '드래그: 둘러보기 · 휠/핀치: 오페라글라스 확대': 'Drag: look around · Wheel/pinch: zoom in',
  '🔭 오페라글라스': '🔭 Zoom', '시선 초기화': 'Reset view',
  '크게': 'Large', '적당히': 'Medium', '작게': 'Small', '스크린 필요': 'Need the screen',
  '전체 연출·조명 감상': 'Full staging & lighting', '배우 표정·몰입감': 'Faces & immersion', '균형 잡힌 시야': 'Balanced view',
  '무대 전체 조망': 'Whole-stage view', '피크닉·여유로운 관람': 'Picnic & relaxed', '무대 근거리 착석': 'Seated, close to stage',
  '편안한 착석 관람': 'Comfortable seated view', '자유로운 스탠딩': 'Free standing', '아티스트 근거리·현장감': 'Close to the artist',
  '현장감 + 스크린 병행': 'Atmosphere + screens', '시야 제한 감수': 'Restricted view', '가성비 측면석': 'Value side seat',
  '선수 근거리·생동감': 'Close to players', '경기 흐름·전술 감상': 'Follow the game', '무대 근거리·좌석 지정': 'Close, reserved seat',
  '전체 연출·조명·떼창 분위기': 'Full staging & crowd', '아티스트 근거리·스탠딩': 'Close to the artist, standing',
  '무대 근거리 측면': 'Close side view', '몰입감 있는 근거리': 'Close & immersive', '맨 앞 근거리(간이석)': 'Front row (temporary seats)',
  '정면 몰입감': 'Straight-on & immersive', '측면 근거리': 'Close side view',
  '무대 바로 뒤쪽 구역이에요. 시야 제한석이거나 판매하지 않을 수 있어요.': 'This zone is right behind the stage. It may be restricted-view or not sold.',
  '무대 뒤쪽 구역이에요. 시야 제한석이거나 판매하지 않을 수 있어요.': 'This zone is behind the stage. It may be restricted-view or not sold.',
  '무대 측면이라 무대 일부와 스크린이 비스듬히 보여요.': 'Side of the stage: part of the stage and screens are seen at an angle.',
  '무대 바로 옆이라 무대 안쪽(반대편)이 가려질 수 있어요.': 'Right beside the stage: the far side of the stage may be hidden.',
  'A·B열은 공연에 따라 설치되는 간이 좌석이에요.': 'Rows A–B are temporary seats set up for some shows.',
  '무대를 비스듬히 보는 자리예요. 무대 한쪽 끝이 잘 안 보일 수 있어요.': 'You see the stage at an angle; one end may be hard to see.',
  '콘서트 (남측 무대)': 'Concert (south stage)', '핸드볼 경기': 'Handball match',
  '1~4구역 쪽 엔드 무대': 'End stage by zones 1–4', '5~11구역 쪽 엔드 무대': 'End stage by zones 5–11',
  '12~15구역 쪽 엔드 무대': 'End stage by zones 12–15', '16~22구역 쪽 엔드 무대': 'End stage by zones 16–22', '센터 무대(360°)': 'Center stage (360°)',
  '원형 무대를 계단식 객석이 남쪽에서 감싸는 구조': 'Round stage wrapped by terraced seats to the south',
  '중앙 원형광장에 특설무대를 둔 예시 배치(돗자리 착석 기준 눈높이)': 'Example stage on the central plaza (eye height for sitting on a mat)',
  '점선 좌석은 A·B열 간이석(가변형)': 'Dashed seats: temporary rows A–B',
  '가구역': 'Zone Ga', '나구역': 'Zone Na', '다구역': 'Zone Da',
  // 공연으로 찾기
  '공연 이름으로 검색': 'Search shows', '공연장 확인됨': 'Venue confirmed', '지난 공연 기준 추정': 'Estimated from past shows',
  '공연장 미확인': 'Venue unknown', '공연장을 골라 주세요': 'Pick the venue', '예매 페이지': 'Tickets',
  '이 공연 시야 보기': 'See the view', '선택한 공연': 'Selected show', '공연 목록으로': 'Back to shows',
  '♿ 휠체어석': '♿ Wheelchair spaces', '🔗 이 자리 링크 복사': '🔗 Copy link to this seat', '링크를 복사했어요': 'Link copied',
  '휠체어 관람': 'Wheelchair viewing', '휠체어 관람 · 무대 전체 조망': 'Wheelchair · full stage view', '휠체어 관람 · 전체 조망': 'Wheelchair · overall view',
  '좌석배치도 기준 1층 맨 뒤(A·C구역 22열 뒤) 12석': '12 spaces at the back of 1F (behind Row 22 of Zones A and C), per the seating chart',
  '좌석배치도의 장애인석 라인(5~11구역 뒤, 1층 맨 뒤 통로). 기본 무대 배치에서는 무대 정면 쪽이에요.': 'Accessible line on the seating chart (behind Zones 5–11, rear aisle of 1F). It faces the stage in the default layout.',
  '좌석배치도 기준 2층 남측 20석': '20 spaces on the south side of 2F, per the seating chart',
  '좌석배치도 기준 22석(F구역 앞, B1·D1구역 무대 쪽)': '22 spaces (in front of Zone F, stage side of Zones B1/D1), per the seating chart',
  '좌석배치도 기준 7열 끝 3곳': '3 spaces at the ends of Row 7, per the seating chart',
  '야외 공연장은 도면에 휠체어석 정보가 없어요. 현장 안내를 확인해 주세요.': 'The outdoor venue plans have no wheelchair-space information. Please check on site.',
  '도면상 휠체어석이 남측 무대 바로 뒤쪽이라 콘서트에서는 무대가 거의 보이지 않아요. 공연마다 휠체어석을 따로 마련하는 경우가 많으니 예매처에 확인해 주세요.': 'On the plans the wheelchair spaces are right behind the south stage, so the stage is barely visible at concerts. Many shows set up separate wheelchair spaces — please check with the ticket seller.',
  '휠체어 관람 · 시야 제한': 'Wheelchair · restricted view',
  '이 무대 배치에서는 휠체어석이 무대 뒤쪽이에요. 예매처에 휠체어석 위치를 꼭 확인해 주세요.': 'With this stage layout the wheelchair spaces are behind the stage. Please check the location with the ticket seller.',
  '이 무대 배치에서는 휠체어석이 무대 측면이에요.': 'With this stage layout the wheelchair spaces are at the side of the stage.',
  '2층 남서측': '2F Southwest', '2층 남동측': '2F Southeast',
  '공연 기록': 'past shows', '검색 결과가 없어요.': 'No shows found.',
  '최근 공연은 영문 공연정보(공공데이터)에서, 공연장 추정은 국문 공연정보의 지난 공연 기록에서 가져와요. 공연장이 확실하지 않으면 예매 페이지에서 확인해 주세요.':
    'Recent shows come from the English performance data; venue estimates come from past records in the Korean performance data. If unsure, check the ticket page.',
  '날짜는 데이터에 기록된 공연일자예요.': 'Dates are as recorded in the data.',
};

// 조합되는 이름용 단어 규칙(긴 것 먼저)
const WORDS = [
  [/(\d)층/g, '$1F'], [/([0-9A-Z~]+)구역/g, 'Zone $1'], [/([0-9A-Z]+)열/g, 'Row $1'], [/(\d+)번/g, 'Seat $1'],
  [/([\d,]+)석/g, '$1 seats'], [/(\d+)건/g, '$1'],
  [/이동식석/g, 'retractable'], [/고정석/g, 'fixed'], [/계단석/g, 'Terrace'], [/무대 앞 스탠딩/g, 'Front standing'],
  [/상단 산책로/g, 'Upper walkway'], [/잔디/g, 'Lawn'], [/북동측/g, 'Northeast'], [/남동측/g, 'Southeast'], [/남서측/g, 'Southwest'],
  [/북서측/g, 'Northwest'], [/북측/g, 'North'], [/동측/g, 'East'], [/남측/g, 'South'], [/서측/g, 'West'], [/중앙/g, 'Center'],
  [/남쪽/g, 'south'], [/북쪽/g, 'north'], [/동쪽/g, 'east'], [/서쪽/g, 'west'],
  [/북동/g, 'NE'], [/남동/g, 'SE'], [/남서/g, 'SW'], [/북서/g, 'NW'], [/^북$/g, 'N'], [/^동$/g, 'E'], [/^남$/g, 'S'], [/^서$/g, 'W'],
  [/앞쪽/g, 'front'], [/가운데/g, 'middle'], [/뒤쪽/g, 'back'], [/맨 앞/g, 'very front'], [/맨 뒤/g, 'very back'],
  [/플로어/g, 'Floor'], [/\(간이석\)/g, '(temporary)'], [/\(1층\)/g, '(1F)'], [/\(2층\)/g, '(2F)'],
  [/Floor석\(스탠딩\)/g, 'Floor (standing)'], [/Zone 가/g, 'Zone Ga'], [/Zone 나/g, 'Zone Na'], [/Zone 다/g, 'Zone Da'],
  [/가구역/g, 'Zone Ga'], [/나구역/g, 'Zone Na'], [/다구역/g, 'Zone Da'],
  [/눈높이 /g, 'Eye level '], [/내려다봄 /g, 'Looking down '], [/올려다봄 /g, 'Looking up '],
  [/ 3D 모델 불러오는 중…/g, ': loading 3D model…'],
  [/휠체어석/g, 'wheelchair space'], [/ 뒤( |$)/g, ' (behind)$1'], [/ 앞( |$)/g, ' (front)$1'], [/무대 쪽/g, 'stage side'],
];
const NAMES = ['우리금융아트홀', '티켓링크 라이브 아레나', '수변무대', '88잔디마당', '올림픽홀', '뮤즈라이브'];

export let lang = 'ko';
const HANGUL = /[가-힣]/;

export function t(s) {
  if (lang === 'ko' || !s || !HANGUL.test(s)) return s;
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), core = m[2];
  if (DICT[core] != null) return m[1] + DICT[core] + m[3];
  let out = core;
  for (const n of NAMES) out = out.split(n).join(DICT[n]);
  for (const [re, rep] of WORDS) out = out.replace(re, rep);
  return m[1] + out + m[3];
}

// 텍스트 노드 단위로 번역 + 원문 보관(한국어로 돌아갈 때 복원)
const ORIG = new WeakMap();
function skip(node) { const p = node.parentElement; return !p || p.closest('script,style,.notr'); }
function apply(node) {
  if (skip(node)) return;
  const cur = node.nodeValue;
  if (lang === 'en') {
    if (!HANGUL.test(cur)) return;
    const out = t(cur);
    if (out !== cur) { ORIG.set(node, cur); node.nodeValue = out; }
  } else if (ORIG.has(node)) { node.nodeValue = ORIG.get(node); ORIG.delete(node); }
}
function walk(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) apply(n);
  if (root.querySelectorAll) for (const el of root.querySelectorAll('[title],[placeholder]')) for (const a of ['title', 'placeholder']) {
    const v = el.getAttribute(a); if (!v) continue;
    const key = 'data-ko-' + a;
    if (lang === 'en' && HANGUL.test(v)) { el.setAttribute(key, v); el.setAttribute(a, t(v)); }
    else if (lang === 'ko' && el.hasAttribute(key)) { el.setAttribute(a, el.getAttribute(key)); el.removeAttribute(key); }
  }
}

let observer = null;
export function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  document.title = l === 'en' ? DICT['내 자리 미리보기 · 올림픽공원 공연장'] : '내 자리 미리보기 · 올림픽공원 공연장';
  walk(document.body);
  if (!observer) {
    observer = new MutationObserver(muts => {
      if (lang !== 'en') return;
      for (const m of muts) {
        if (m.type === 'characterData') apply(m.target);
        else for (const n of m.addedNodes) n.nodeType === 3 ? apply(n) : n.nodeType === 1 && walk(n);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  }
  try { localStorage.setItem('seatview-lang', l); } catch (e) {}
}
export function savedLang() {
  try { const s = localStorage.getItem('seatview-lang'); if (s) return s; } catch (e) {}
  return /^ko\b/i.test(navigator.language || 'ko') ? 'ko' : 'en';
}
