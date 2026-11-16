// 야외 공연장(수변무대, 88잔디마당) 관람 위치 매핑
// 각도: 동=0, 북=90 (모델 -z가 북쪽)
export const OUTDOOR = {
  lake: {
    title: '수변무대', file: ['lake.b64.txt'],
    center: [-1.0, -0.7], stageY: -1.8, stageR: 8.8, buildStage: false,
    note: '원형 무대를 계단식 객석이 남쪽에서 감싸는 구조',
    zones: [
      { id: 'TW', label: '계단석 서측', deg: 235, r: [12.8, 14.6, 16.3], eye: 1.15, ray: true, svg: [40, 70, 16] },
      { id: 'TC', label: '계단석 중앙', deg: 270, r: [12.8, 14.6, 16.3], eye: 1.15, ray: true, svg: [40, 70, 16] },
      { id: 'TE', label: '계단석 동측', deg: 305, r: [12.8, 14.6, 16.3], eye: 1.15, ray: true, svg: [40, 70, 16] },
      { id: 'P',  label: '무대 앞 스탠딩', deg: 270, r: [9.8, 10.8, 11.6], eye: 1.6, ray: false, svg: [26, 38, 52] },
      { id: 'U',  label: '상단 산책로', deg: 270, r: [19.5, 21.5, 23.5], eye: 1.6, ray: true, svg: [74, 96, 52] },
    ],
  },
  g88: {
    title: '88잔디마당', file: ['g88.b64.txt'],
    center: [0, 0.25], stageY: -1.8, stageR: 7, buildStage: true,
    note: '중앙 원형광장에 특설무대를 둔 예시 배치(돗자리 착석 기준 눈높이)',
    zones: ['남', '동', '서', '북'].map((n, i) => ({
      id: 'L' + i, label: `잔디 ${n}쪽`, deg: [270, 0, 180, 90][i], r: [16, 26, 36], eye: 0.9, ray: true, svg: [36, 100, 40],
    })),
  },
};

export function at(v, deg, r) {
  const t = deg * Math.PI / 180;
  return [v.center[0] + r * Math.cos(t), v.center[1] - r * Math.sin(t)];
}
export function eyeOf(v, zoneId, depth) {
  const z = v.zones.find(x => x.id === zoneId), r = z.r[{ front: 0, mid: 1, back: 2 }[depth]];
  const [x, zz] = at(v, z.deg, r);
  return { pos: [x, v.stageY, zz], eye: z.eye, ray: z.ray };
}
