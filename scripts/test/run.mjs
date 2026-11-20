// 공연 목록 갱신(update-events.mjs)의 안전장치 시험
// 실제 공공데이터 서버 대신 가짜 응답(mock-fetch.mjs)을 넣고, 시나리오마다
// 임시 폴더에 스크립트와 현재 data/events.json 을 복사해 돌린 뒤
// "종료 코드"와 "파일이 저장됐는지"가 기대와 같은지 확인한다.
// 실행: node scripts/test/run.mjs   (API 키 필요 없음, 네트워크 사용 안 함)
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const MOCK = pathToFileURL(join(HERE, 'mock-fetch.mjs')).href;

// [시나리오, 기대 종료 코드, 파일 저장 여부, 설명]
const CASES = [
  ['normal',       0, true,  '정상 응답 → 저장'],
  ['ko-500',       1, false, '국문 공연정보 3쪽이 HTTP 500 → 저장 안 함'],
  ['ko-errxml',    1, false, '3쪽에 호출 한도 오류 XML(200/2500건만 받음) → 저장 안 함'],
  ['ko-empty',     1, false, '국문 공연정보 응답에 항목 없음(키 오류 등) → 저장 안 함'],
  ['ko-shrunk',    1, false, '국문 기록이 지난번의 절반 미만 → 저장 안 함'],
  ['en-few',       1, false, '영문 공연정보가 5건뿐 → 저장 안 함'],
  ['captcha',      0, false, '보안문자 요구 → 경고만 하고 이번 달 건너뜀'],
  ['parking-fail', 0, true,  '주차 데이터만 실패 → 공연은 저장, 주차는 지난 값 유지'],
];

let fail = 0;
for (const [name, wantCode, wantSaved, desc] of CASES) {
  const dir = mkdtempSync(join(tmpdir(), 'seatview-test-'));
  mkdirSync(join(dir, 'scripts')); mkdirSync(join(dir, 'data'));
  for (const f of ['update-events.mjs', 'match.mjs']) copyFileSync(join(ROOT, 'scripts', f), join(dir, 'scripts', f));
  copyFileSync(join(ROOT, 'data', 'events.json'), join(dir, 'data', 'events.json'));
  const before = readFileSync(join(dir, 'data', 'events.json'), 'utf8');
  const r = spawnSync(process.execPath, ['--import', MOCK, join(dir, 'scripts', 'update-events.mjs')], {
    cwd: dir, encoding: 'utf8', timeout: 120_000,
    env: { ...process.env, MOCK: name, KCISA_KEY: 'TEST-KEY', KCISA_RENT_KEY: '' },
  });
  const after = readFileSync(join(dir, 'data', 'events.json'), 'utf8');
  const saved = before !== after;
  let ok = r.status === wantCode && saved === wantSaved;
  // 주차만 실패한 경우: 지난 주차 값이 그대로 남아 있어야 함
  if (ok && name === 'parking-fail') ok = JSON.stringify(JSON.parse(after).parking) === JSON.stringify(JSON.parse(before).parking);
  // 오류 메시지에 API 키가 찍히면 안 됨
  if (ok && /TEST-KEY/.test(r.stdout + r.stderr)) ok = false;
  const last = (r.stdout + r.stderr).trim().split('\n').filter(l => !/예시:/.test(l)).pop() || '';
  console.log(`${ok ? '통과' : '실패'}  ${name.padEnd(13)} ${desc}\n      종료 ${r.status}, ${saved ? '저장됨' : '그대로'} | ${last.slice(0, 110)}`);
  if (!ok) fail++;
  rmSync(dir, { recursive: true, force: true });
}
console.log(fail ? `\n${fail}개 실패` : `\n${CASES.length}개 모두 통과`);
process.exit(fail ? 1 : 0);
