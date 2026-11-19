// 티켓링크 라이브 아레나(핸드볼경기장) 좌석 매핑
// 모델 좌표: 북쪽 = -z, 동쪽 = +x. 좌석배치도와 방향이 같음(위가 2-3문, 북측).
import * as THREE from "./vendor/three.module.js";

export const C = [1.8, 0];          // 경기장 바닥 중심
export const FLOOR_Y = -1.3;
const OUT = [29.3, 23.8];           // 이동식 의자 수납 시 바닥 반경(59.6 x 48.3m 도면과 일치)
const IN = [21.05, 15.6];           // 이동식 의자 인출 시 바닥 반경(42.1 x 31.2m)

export const MODES = {
  concert: { label: '콘서트 (남측 무대)', lower: ['N', 'E', 'W'] },
  sports:  { label: '핸드볼 경기',        lower: ['N', 'E', 'S', 'W'] },
};
const DIR = { N: 90, E: 0, S: -90, W: 180, NE: 45, SE: -45, SW: -135, NW: 135 };
const NAME = { N: '북측', E: '동측', S: '남측', W: '서측', NE: '북동측', SE: '남동측', SW: '남서측', NW: '북서측' };
const LOWER_SPAN = { N: [58, 122], S: [-122, -58], E: [-32, 32], W: [148, 212] };

export const SECTORS = [
  ...['N', 'E', 'S', 'W'].map(k => ({ id: 'L' + k, ring: 'lower', dir: k, deg: DIR[k], name: `1층 ${NAME[k]} 이동식석` })),
  // 동·서 정중앙에는 출입구 부스가 있어 좌석 블록 중심(±13°)으로 이동
  ...['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(k => ({ id: 'U' + k, ring: 'upper', dir: k, deg: DIR[k] + ({ E: 13, W: -13 }[k] || 0), name: `2층 ${NAME[k]} 고정석` })),
];

// 각도(동=0, 북=90) 방향의 타원 반경
function ellR([a, b], deg) { const t = deg * Math.PI / 180; return a * b / Math.hypot(b * Math.cos(t), a * Math.sin(t)); }
function at(deg, r) { const t = deg * Math.PI / 180; return [C[0] + r * Math.cos(t), C[1] - r * Math.sin(t)]; }

const DEPTH = { front: 0.15, mid: 0.5, back: 0.85 };
const ADJ = { UN: { front: [4, 2.5], back: [4, 9.5] }, UE: { front: [4, 3.5] }, US: { back: [20, 10.5] } };
export function seatEye(sector, depth) {
  const s = SECTORS.find(x => x.id === sector);
  if (s.ring === 'lower') {
    const r0 = ellR(IN, s.deg), r1 = ellR(OUT, s.deg), f = DEPTH[depth];
    const [x, z] = at(s.deg, r0 + (r1 - r0) * f);
    return [x, FLOOR_Y + stepTop(f) + 0.45 + 0.75, z];
  }
  // 모델에서 바로 앞이 벽·출입구·구조물에 막히는 자리는 몇 도 옆 / 한두 줄 앞으로 옮김(삼각형 광선 검사 + 렌더링으로 확인)
  const [da, dd] = (ADJ[sector] || {})[depth] || [0, null];
  const d = dd ?? { front: 3.5, mid: 7.5, back: 11.5 }[depth];
  const [x, z] = at(s.deg + da, ellR(OUT, s.deg + da) + d);
  return [x, 2.1 + Math.max(0, d - 1.5) * 0.47 + 1.15, z];
}
export function floorEye(depth) { // 콘서트 플로어(무대 앞)
  const z = { front: 3, mid: -4, back: -12 }[depth]; return [C[0], FLOOR_Y + 1.6, z];
}

// 이동식 좌석 단: 바닥에서 2층 콘코스 높이까지 10단
const STEPS = 10, RISE = 3.6;
function stepTop(f) { return Math.min(STEPS, Math.floor(f * STEPS) + 1) * RISE / STEPS; }

export function buildRetractable(sides) {
  const g = new THREE.Group();
  const top = new THREE.MeshStandardMaterial({ color: 0x8a93a3, roughness: .9, side: THREE.DoubleSide });
  const riser = new THREE.MeshStandardMaterial({ color: 0x59657c, roughness: .9, side: THREE.DoubleSide });
  const back = new THREE.MeshStandardMaterial({ color: 0x2f62c9, roughness: .7, side: THREE.DoubleSide });
  for (const k of sides) {
    const [d0, d1] = LOWER_SPAN[k], N = 24;
    for (let i = 0; i < STEPS; i++) {
      const f0 = i / STEPS, f1 = (i + 1) / STEPS, y = FLOOR_Y + (i + 1) * RISE / STEPS;
      const pos = [], idx = [], rpos = [], ridx = [], bpos = [];
      for (let j = 0; j <= N; j++) {
        const deg = d0 + (d1 - d0) * j / N, r0 = ellR(IN, deg), r1 = ellR(OUT, deg);
        const [ax, az] = at(deg, r0 + (r1 - r0) * f0), [bx, bz] = at(deg, r0 + (r1 - r0) * f1);
        pos.push(ax, y, az, bx, y, bz);
        rpos.push(ax, y - RISE / STEPS, az, ax, y, az);
        const [sx, sz] = at(deg, r0 + (r1 - r0) * (f0 + 0.75 / STEPS)); bpos.push(sx, y, sz, sx, y + 0.5, sz); // 등받이 줄
        if (j) { const o = (j - 1) * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); ridx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
      }
      for (const [p, ix, m] of [[pos, idx, top], [rpos, ridx, riser], [bpos, ridx, back]]) {
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.setIndex(ix); geo.computeVertexNormals();
        g.add(new THREE.Mesh(geo, m));
      }
    }
  }
  return g;
}

export function buildCourt() {
  const g = new THREE.Group();
  const wood = new THREE.Mesh(new THREE.PlaneGeometry(44, 24), new THREE.MeshStandardMaterial({ color: 0xc89a5e, roughness: .7 }));
  wood.rotation.x = -Math.PI / 2; wood.position.set(C[0], FLOOR_Y + 0.02, C[1]); g.add(wood);
  const line = new THREE.LineBasicMaterial({ color: 0xffffff });
  const rect = (w, h) => { const p = [[-w,-h],[w,-h],[w,h],[-w,h],[-w,-h]].map(([x, z]) => new THREE.Vector3(C[0] + x, FLOOR_Y + 0.04, C[1] + z)); return new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), line); };
  g.add(rect(20, 10));
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(C[0], FLOOR_Y + .04, -10), new THREE.Vector3(C[0], FLOOR_Y + .04, 10)]), line));
  for (const s of [-1, 1]) { // 6m 골 에어리어
    const pts = []; for (let i = 0; i <= 32; i++) { const t = -Math.PI / 2 + Math.PI * i / 32; pts.push(new THREE.Vector3(C[0] + s * (20 - 6 * Math.cos(t)), FLOOR_Y + .04, C[1] + 1.5 * Math.sign(Math.sin(t)) + 6 * Math.sin(t) * 0.75)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), line));
  }
  return g;
}

export function name(sector) { return SECTORS.find(x => x.id === sector).name; }
export { ellR, at, OUT, IN };
