// KSPO DOME 좌석 매핑
// 좌석배치도(7874x8368 원본을 1316px로 축소한 이미지) 위 구역 라벨 좌표 → 3D 모델 좌표
// 배치도는 모델 대비 90° 회전되어 있음: 배치도 오른쪽(5~11구역) = 모델 -z 방향
const CHART_CENTER = [626, 680];
const MODEL_CENTER = [105, -72];

// 구역 라벨 위치(축소 배치도 픽셀)
const LABELS = {
  1:[532,375],2:[609,368],3:[679,368],4:[752,388],5:[858,470],6:[909,533],7:[930,615],8:[950,680],
  9:[935,770],10:[911,840],11:[868,910],12:[752,985],13:[681,1010],14:[605,1015],15:[532,995],
  16:[393,900],17:[347,840],18:[316,765],19:[304,680],20:[316,610],21:[340,530],22:[385,465],
  23:[375,265],24:[480,222],25:[578,206],26:[674,197],27:[771,220],28:[866,252],29:[942,315],
  30:[1013,380],31:[1072,470],32:[1105,550],33:[1122,650],34:[1123,745],35:[1100,845],36:[1060,930],
  37:[1012,1015],38:[945,1085],39:[860,1135],40:[771,1170],41:[680,1180],42:[580,1170],43:[444,1170],
  44:[345,1130],45:[237,1040],46:[178,925],47:[140,840],48:[135,745],49:[130,655],50:[151,565],
  51:[193,480],52:[253,385],
};
export const SEATS = { // 구역별 좌석 수(배치도 표)
  1:282,2:282,3:282,4:282,5:292,6:292,7:292,8:292,9:292,10:292,11:292,12:282,13:282,14:282,15:282,16:310,
  17:310,18:311,19:311,20:312,21:310,22:308,23:417,24:270,25:236,26:217,27:248,28:247,29:244,30:259,
  31:306,32:326,33:250,34:245,35:326,36:306,37:269,38:241,39:248,40:248,41:219,42:244,43:277,44:288,
  45:329,46:221,47:206,48:116,49:104,50:176,51:160,52:233,
};

// 배치도 화면 각도(도, 오른쪽=0, 위=+)
export function chartAngle(zone) {
  const [x, y] = LABELS[zone];
  return Math.atan2(-(y - CHART_CENTER[1]), x - CHART_CENTER[0]) * 180 / Math.PI;
}
// 배치도 각도 → 모델 좌표 (반지름 r m)
export function toModel(chartDeg, r) {
  const t = (chartDeg + 90) * Math.PI / 180;
  return [MODEL_CENTER[0] + r * Math.cos(t), MODEL_CENTER[1] - r * Math.sin(t)];
}
export const ring = z => (z <= 22 ? 'lower' : 'upper');

// 객석 바닥 높이(레이캐스트로 측정한 단면)
function floorY(r) {
  if (r < 24) return 0;
  if (r <= 45) return (r - 24) * 0.24;
  return 5.5 + (r - 46) * 0.42;
}
const RADII = { lower: { front: 26, mid: 34, back: 42.5 }, upper: { front: 47.5, mid: 51.5, back: 55.5 } };

export function seatEye(zone, depth) {
  const r = RADII[ring(zone)][depth];
  const [x, z] = toModel(chartAngle(zone), r);
  return [x, floorY(r) + 1.15, z];
}

// 무대 배치 프리셋: 배치도 각도 기준 방향
export const STAGES = {
  end1:  { label: '1~4구역 쪽 엔드 무대',   deg: 90 },
  end5:  { label: '5~11구역 쪽 엔드 무대',  deg: 0 },
  end12: { label: '12~15구역 쪽 엔드 무대', deg: -90 },
  end16: { label: '16~22구역 쪽 엔드 무대', deg: 180 },
  center:{ label: '센터 무대(360°)',        deg: null },
};

// 플로어(스탠딩/지정석) 위치: 무대 기준 거리
export function floorEye(stageKey, depth) {
  const st = STAGES[stageKey];
  if (st.deg === null) { // 센터 무대: 무대에서 바깥쪽(5~11구역 방향)으로
    const r = { front: 9, mid: 14, back: 20 }[depth];
    const [x, z] = toModel(0, r); return [x, 1.6, z];
  }
  const r = { front: 7, mid: -2, back: -14 }[depth]; // 무대 반대편으로 갈수록 음수
  const [x, z] = toModel(st.deg, r); return [x, 1.6, z];
}

export const ZONE_LIST = Object.keys(LABELS).map(Number);
export { MODEL_CENTER };
