// 3D 데이터가 없는 공연장(올림픽홀, 뮤즈라이브)의 2D 모드
// 좌표계(m): x = 무대를 바라볼 때 오른쪽(+), d = 무대 앞선(프로시니엄)에서 객석 쪽 거리, h = 객석 바닥 기준 눈높이
// 올림픽홀 거리·높이는 평면도(X·Y 그리드, 6m 간격) 기준 추정치, 뮤즈라이브는 좌석 간격 기준 추정치
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------- 올림픽홀 ----------------
// 좌석배치도(1670px 폭) 좌표로 그린 구역, 열 수, 앞열/뒷열 위치
const OH_ZONES = [
  { id: 'FL', label: 'Floor석(스탠딩)', floor: '1F', rows: 5, poly: [[656,666],[1012,666],[1012,906],[656,906]], p0: [0, 3, 1.6], p1: [0, 12, 1.6], unit: '구간' },
  { id: 'F1', label: 'F1구역', floor: '1F', rows: 11, poly: [[655,975],[712,975],[712,1185],[655,1185]], p0: [-7.5, 15, 1.15], p1: [-7.5, 23, 3.6] },
  { id: 'F2', label: 'F2구역', floor: '1F', rows: 11, poly: [[740,975],[930,975],[930,1185],[740,1185]], p0: [0, 15, 1.15], p1: [0, 23, 3.6] },
  { id: 'F3', label: 'F3구역', floor: '1F', rows: 11, poly: [[948,975],[1010,975],[1010,1185],[948,1185]], p0: [7.5, 15, 1.15], p1: [7.5, 23, 3.6] },
  { id: 'G', label: 'G구역', floor: '1F', rows: 14, poly: [[310,676],[430,676],[430,700],[360,760],[360,880],[310,880]], p0: [-10.5, 2, 1.6], p1: [-13, 8, 3.6] },
  { id: 'H', label: 'H구역', floor: '1F', rows: 13, poly: [[1240,676],[1355,676],[1355,880],[1305,880],[1305,760],[1240,700]], p0: [10.5, 2, 1.6], p1: [13, 8, 3.6] },
  { id: 'B1', label: 'B1구역', floor: '1F', rows: 13, poly: [[315,890],[480,808],[480,1195],[315,1045]], p0: [-10.5, 10, 1.6], p1: [-16.5, 13, 4.2] },
  { id: 'B2', label: 'B2구역', floor: '1F', rows: 11, poly: [[315,1052],[480,1205],[480,1330],[418,1390],[315,1290]], p0: [-10.5, 18, 1.6], p1: [-16.5, 23, 4.2] },
  { id: 'D1', label: 'D1구역', floor: '1F', rows: 13, poly: [[1365,890],[1200,808],[1200,1195],[1365,1045]], p0: [10.5, 10, 1.6], p1: [16.5, 13, 4.2] },
  { id: 'D2', label: 'D2구역', floor: '1F', rows: 11, poly: [[1365,1052],[1200,1205],[1200,1330],[1262,1390],[1365,1290]], p0: [10.5, 18, 1.6], p1: [16.5, 23, 4.2] },
  { id: 'A1', label: 'A1구역', floor: '2F', rows: 10, poly: [[100,676],[290,676],[290,790],[100,790]], p0: [-18, 8, 7.2], p1: [-22, 8, 8.6] },
  { id: 'A2', label: 'A2구역', floor: '2F', rows: 10, poly: [[100,814],[290,814],[290,948],[100,948]], p0: [-18, 14, 7.2], p1: [-22, 14, 8.6] },
  { id: 'A3', label: 'A3구역', floor: '2F', rows: 10, poly: [[100,971],[290,971],[290,1106],[100,1106]], p0: [-18, 20, 7.2], p1: [-22, 20, 8.6] },
  { id: 'A4', label: 'A4구역', floor: '2F', rows: 9,  poly: [[100,1129],[290,1129],[290,1286],[100,1286]], p0: [-18, 26, 7.2], p1: [-22, 26, 8.6] },
  { id: 'E1', label: 'E1구역', floor: '2F', rows: 10, poly: [[1376,676],[1566,676],[1566,790],[1376,790]], p0: [18, 8, 7.2], p1: [22, 8, 8.6] },
  { id: 'E2', label: 'E2구역', floor: '2F', rows: 10, poly: [[1376,814],[1566,814],[1566,948],[1376,948]], p0: [18, 14, 7.2], p1: [22, 14, 8.6] },
  { id: 'E3', label: 'E3구역', floor: '2F', rows: 10, poly: [[1376,971],[1566,971],[1566,1106],[1376,1106]], p0: [18, 20, 7.2], p1: [22, 20, 8.6] },
  { id: 'E4', label: 'E4구역', floor: '2F', rows: 9,  poly: [[1376,1129],[1566,1129],[1566,1286],[1376,1286]], p0: [18, 26, 7.2], p1: [22, 26, 8.6] },
  { id: 'C1', label: 'C1구역', floor: '1F·2F', rows: 12, poly: [[590,1400],[706,1426],[706,1660],[515,1660],[425,1566]], p0: [-9, 29, 1.8], p1: [-10, 39, 9.0], split: 5 },
  { id: 'C2', label: 'C2구역', floor: '1F·2F', rows: 12, poly: [[733,1426],[934,1426],[934,1660],[733,1660]], p0: [0, 29, 1.8], p1: [0, 39, 9.0], split: 5 },
  { id: 'C3', label: 'C3구역', floor: '1F·2F', rows: 12, poly: [[1080,1400],[962,1426],[962,1660],[1155,1660],[1245,1566]], p0: [9, 29, 1.8], p1: [10, 39, 9.0], split: 5 },
];
const SEATS_OH = { A1:86,A2:120,A3:120,A4:114,B1:151,B2:127,C1:183,C2:198,C3:182,D1:151,D2:127,E1:86,E2:120,E3:120,E4:114,G:41,H:40,F1:'',F2:'',F3:'',FL:'' };

function ohPos(z, row) {
  const t = z.rows > 1 ? (row - 1) / (z.rows - 1) : 0;
  let h;
  if (z.split) { // C구역: 1~5열은 1층, 6열부터 2층
    h = row <= z.split ? lerp(1.8, 3.0, (row - 1) / (z.split - 1)) : lerp(6.6, 9.0, (row - z.split - 1) / (z.rows - z.split - 1));
  } else h = lerp(z.p0[2], z.p1[2], t);
  return { x: lerp(z.p0[0], z.p1[0], t), d: lerp(z.p0[1], z.p1[1], t), h };
}

// 휠체어석(좌석배치도 '장애인석 22석'): F1·F2·F3 맨 앞 줄 앞, B1·D1 무대 쪽 끝. 휠체어 앉은 눈높이 1.25m
const OH_WC = [
  { id: 'wF1', label: 'F1구역 앞 휠체어석', rect: [655, 944, 57, 24], pos: { x: -7.5, d: 14.2, h: 1.25 } },
  { id: 'wF2', label: 'F2구역 앞 휠체어석', rect: [740, 944, 190, 24], pos: { x: 0, d: 14.2, h: 1.25 } },
  { id: 'wF3', label: 'F3구역 앞 휠체어석', rect: [948, 944, 62, 24], pos: { x: 7.5, d: 14.2, h: 1.25 } },
  { id: 'wB1', label: 'B1구역 무대 쪽 휠체어석', rect: [424, 838, 50, 26], pos: { x: -10.5, d: 9.2, h: 1.7 } },
  { id: 'wD1', label: 'D1구역 무대 쪽 휠체어석', rect: [1206, 838, 50, 26], pos: { x: 10.5, d: 9.2, h: 1.7 } },
];

export const OH = {
  key: 'oh', title: '올림픽홀', seats: '2,432석', viewBox: '40 470 1590 1210',
  stage: { w: 18, hgt: 10, floor: 1.0, depthBehind: 12, svg: [[620,480],[1062,480],[1062,565],[620,565]] },
  mode: 'zone',
  zones: OH_ZONES,
  info: z => (SEATS_OH[z.id] ? `${SEATS_OH[z.id]}석 · ` : '') + z.floor,
  wheelchair: OH_WC,
  pos: (zoneId, row) => ohPos(OH_ZONES.find(z => z.id === zoneId), row),
  rowLabel: (z, row) => z.id === 'FL' ? ['맨 앞', '앞쪽', '가운데', '뒤쪽', '맨 뒤'][row - 1] : `${row}열${z.split ? (row <= z.split ? ' (1층)' : ' (2층)') : ''}`,
};

// ---------------- 뮤즈라이브 ----------------
// 좌석배치도(2353px 폭)를 좌석 단위로 재현
const MUSE = [
  // 열, 구역, 1번 좌석 중심 x, 열 중심 y, 좌석 수
  ['A','가',455,616,4],['A','나',950,616,10],['A','다',1745,616,4],
  ['B','가',405,675,5],['B','나',925,675,11],['B','다',1745,675,5],
  ['1','가',355,828,6],['1','나',912,828,12],['1','다',1745,828,6],
  ['2','가',355,887,6],['2','나',887,887,13],['2','다',1745,887,6],
  ['3','가',305,945,7],['3','나',860,945,14],['3','다',1745,945,7],
  ['4','가',255,1004,8],['4','나',835,1004,15],['4','다',1745,1004,8],
  ['5','가',255,1062,8],['5','나',810,1062,16],['5','다',1745,1062,8],
  ['6','가',255,1121,8],['6','나',785,1121,17],['6','다',1745,1121,8],
  ['7','가',305,1180,5],['7','나',760,1180,15],['7','다',1845,1180,5],
];
const ROW_INDEX = { A: 0, B: 1, 1: 2.4, 2: 3.4, 3: 4.4, 4: 5.4, 5: 6.4, 6: 7.4, 7: 8.4 };
export const MUSE_SEATS = [];
for (const [row, zone, x0, y, n] of MUSE) for (let i = 0; i < n; i++) {
  const cx = x0 + i * 50.5, ri = ROW_INDEX[row], raked = row !== 'A' && row !== 'B';
  MUSE_SEATS.push({
    id: `${zone}-${row}-${i + 1}`, label: `${zone}구역 ${row}열 ${i + 1}번`, zone, row, cx, cy: y, temp: !raked,
    pos: { x: (cx - 1176) / 100, d: 1.6 + ri * 0.92, h: 1.15 + (raked ? (ri - 1.4) * 0.2 : 0) },
  });
}
// 휠체어석 3곳(좌석배치도 7열 끝의 휠체어 표시). 7열 바닥 높이 + 휠체어 앉은 눈높이 1.25m
for (const [zone, cx] of [['가', 573], ['나', 1549], ['다', 1786]]) {
  const ri = ROW_INDEX[7] + 0.3;
  MUSE_SEATS.push({ id: `${zone}-wc`, label: `${zone}구역 7열 휠체어석`, zone, row: '7', cx, cy: 1186, temp: false, wc: true,
    pos: { x: (cx - 1176) / 100, d: 1.6 + ri * 0.92, h: 1.25 + (ROW_INDEX[7] - 1.4) * 0.2 } });
}
export const MUSE_INFO = {
  key: 'muse', title: '뮤즈라이브', seats: '237석(가변석 포함)', viewBox: '200 120 1960 1180',
  stage: { w: 11, hgt: 4.5, floor: 0.6, depthBehind: 6, arc: true },
  mode: 'seat',
};

// ---------------- 시야 스케치(간이 원근 투영) ----------------
// 반환: SVG 요소 문자열. 무대 바닥, 프로시니엄 틀, 출연자 실루엣을 그린다.
export function sketch(stage, p, W = 640, H = 360, fovDeg = 55) {
  const E = [p.x, p.h, p.d];
  const T = [0, stage.floor + 1.6, -3];
  const f = norm(sub(T, E)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  const k = (H / 2) / Math.tan(fovDeg * Math.PI / 360);
  const proj = P => { const v = sub(P, E), z = dot(v, f); if (z < 0.1) return null; return [W / 2 + dot(v, r) / z * k, H / 2 - dot(v, u) / z * k]; };
  const poly = (pts, attrs) => { const q = pts.map(proj); if (q.some(x => !x)) return ''; return `<polygon points="${q.map(([a, b]) => a.toFixed(1) + ',' + b.toFixed(1)).join(' ')}" ${attrs}/>`; };
  const w = stage.w / 2, sf = stage.floor, back = -stage.depthBehind;
  let out = '';
  out += poly([[-w - 6, 0, 2], [w + 6, 0, 2], [w + 6, 0, p.d + 1], [-w - 6, 0, p.d + 1]], 'fill="#2a2f3a"'); // 객석 바닥
  out += poly([[-w, sf, back], [w, sf, back], [w, stage.hgt + sf, back], [-w, stage.hgt + sf, back]], 'fill="#3b4256"'); // 무대 뒷벽
  out += poly([[-w, 0, 0], [w, 0, 0], [w, sf, 0], [-w, sf, 0]], 'fill="#1b1f27"'); // 무대 앞면
  out += poly([[-w, sf, 0], [w, sf, 0], [w, sf, back], [-w, sf, back]], 'fill="#6b5340"'); // 무대 바닥
  out += poly([[-w - 3, 0, 0], [-w, 0, 0], [-w, stage.hgt + sf + 3, 0], [-w - 3, stage.hgt + sf + 3, 0]], 'fill="#0f1218"'); // 프로시니엄 좌
  out += poly([[w, 0, 0], [w + 3, 0, 0], [w + 3, stage.hgt + sf + 3, 0], [w, stage.hgt + sf + 3, 0]], 'fill="#0f1218"'); // 우
  out += poly([[-w - 3, stage.hgt + sf, 0], [w + 3, stage.hgt + sf, 0], [w + 3, stage.hgt + sf + 3, 0], [-w - 3, stage.hgt + sf + 3, 0]], 'fill="#0f1218"'); // 상단
  for (const px of [-2.2, 0, 2.2]) { // 출연자(키 175cm)
    const feet = proj([px, sf, -3]), head = proj([px, sf + 1.75, -3]);
    if (feet && head) { const hh = feet[1] - head[1], ww = hh * 0.26;
      out += `<rect x="${(feet[0] - ww / 2).toFixed(1)}" y="${(head[1] + hh * 0.14).toFixed(1)}" width="${ww.toFixed(1)}" height="${(hh * 0.86).toFixed(1)}" rx="${(ww / 2).toFixed(1)}" fill="#f28c18"/>`;
      out += `<circle cx="${feet[0].toFixed(1)}" cy="${(head[1] + hh * 0.07).toFixed(1)}" r="${(hh * 0.075).toFixed(1)}" fill="#ffd9b0"/>`; }
  }
  return out;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(...a); return a.map(v => v / l); };

// 공통 통계
export function stats(stage, p) {
  const dist = Math.hypot(Math.max(0, Math.abs(p.x) - stage.w / 2), p.d); // 무대 앞선(폭 w)까지 최단거리
  const head = [0, stage.floor + 1.6, -3];
  const horiz = Math.hypot(p.x - head[0], p.d - head[2]);
  const ang = Math.atan2(p.h - head[1], horiz) * 180 / Math.PI;
  const toActor = Math.hypot(p.x, p.h - head[1], p.d + 3);
  const apparent = 2 * Math.atan(0.875 / toActor) * 180 / Math.PI;
  const side = Math.abs(Math.atan2(p.x, p.d + 3) * 180 / Math.PI);
  return { dist, ang, apparent, side };
}
