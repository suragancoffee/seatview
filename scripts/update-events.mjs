// 공연 목록 자동 갱신 (GitHub Actions에서 매달 실행)
//  1) 영문 공연정보 CSV (공공데이터포털 파일데이터 15149169, EUC-KR) → 최근 공연
//  2) 국문 공연정보 API (한국문화정보원 KSCperf) → 공연장별 지난 공연 기록
//  3) scripts/match.mjs 로 공연장 추정 → data/events.json
// API 키는 코드에 넣지 않고 환경변수 KCISA_KEY(깃허브 Secret)로만 받습니다.
// 어느 단계든 실패하면 기존 data/events.json 을 그대로 두고 종료합니다.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { buildEvents } from './match.mjs';

// 응답 없이 멈추는 서버 대비: 요청마다 90초 제한(GitHub Actions 기본 제한은 6시간이라 그대로 두면 오래 매달림)
const _fetch = globalThis.fetch;
const fetch = (url, opt = {}) => _fetch(url, { signal: AbortSignal.timeout(90_000), ...opt });

const OUT = new URL('../data/events.json', import.meta.url);
const EN_PK = '15149169';
const KO_ID = '3037877';
const UA = { 'User-Agent': 'Mozilla/5.0 (seatview data updater; github.com/suragancoffee/seatview)' };

// ---------- CSV ----------
export function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}

// 칸 이름이 바뀌어도 동작하도록 값의 모양으로 날짜·링크·제목 칸을 찾음
export function enRowsFromCsv(text) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
  const head = rows[0].map(h => h.trim()), body = rows.slice(1);
  const ncol = Math.max(...rows.map(r => r.length));
  const byName = re => head.findIndex(h => re.test(h));
  // 1순위: 칸 이름(공연제목·공연일자·상세주소), 2순위: 값의 모양
  const score = (test) => [...Array(ncol).keys()].map(i => body.filter(r => test((r[i] || '').trim())).length);
  const best = arr => arr.indexOf(Math.max(...arr));
  let dateCol = byName(/공연일자|일자|DATE/i); if (dateCol < 0) dateCol = best(score(v => /^\d{4}[-.\/]?\d{2}[-.\/]?\d{2}/.test(v)));
  let urlCol = byName(/상세주소|예매|URL|LINK/i); if (urlCol < 0) urlCol = best(score(v => /^https?:\/\//i.test(v)));
  let titleCol = byName(/공연제목|공연명|제목|TITLE/i);
  if (titleCol < 0) {
    const urlish = score(v => /^https?:\/\//i.test(v));
    const avgLen = [...Array(ncol).keys()].map(i => i === dateCol || urlish[i] > body.length / 2 ? -1
      : body.reduce((s, r) => s + ((r[i] || '').length), 0) / (body.length || 1));
    titleCol = best(avgLen);
  }
  return body.map(r => {
    const d = (r[dateCol] || '').trim().replace(/[.\/]/g, '-');
    const date = /^\d{8}/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d.slice(0, 10);
    return { date, title: (r[titleCol] || '').trim(), url: (r[urlCol] || '').trim() };
  });
}

// ---------- 공공데이터포털 파일데이터 내려받기 ----------
async function downloadFileData(pk) {
  const page = await (await fetch(`https://www.data.go.kr/data/${pk}/fileData.do`, { headers: UA })).text();
  const m = page.match(/uddi:[0-9a-f-]{20,}[_0-9]*/i);
  if (!m) throw new Error(`${pk}: 데이터 상세 ID(uddi)를 찾지 못함`);
  const body = new URLSearchParams({ publicDataPk: pk, publicDataDetailPk: m[0], fileDetailSn: '1' });
  const meta = await (await fetch('https://www.data.go.kr/tcs/dss/selectFileDataDownload.do', {
    method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body })).json();
  const atch = meta.atchFileId || meta?.fileDataRegistVO?.atchFileId;
  const sn = meta.fileDetailSn || meta?.fileDataRegistVO?.fileDetailSn || '1';
  if (!atch) throw new Error(`${pk}: atchFileId 없음 ` + JSON.stringify(meta).slice(0, 200));
  // 다운로드 한도 확인: 보안문자(captcha)를 요구하면 우회하지 않고 이번 갱신을 건너뜀
  try {
    const lim = await (await fetch('https://www.data.go.kr/cmm/cmm/check-limit.json', {
      method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ atchFileId: atch, fileDetailSn: sn }) })).json();
    if (lim.needCaptcha) throw new Error('보안문자 요구 — 이번 달 갱신 건너뜀');
  } catch (e) { if (/보안문자/.test(e.message)) throw e; }
  const res = await fetch(`https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=${atch}&fileDetailSn=${sn}&dataNm=d`, { headers: UA });
  if (!res.ok) throw new Error(`${pk}: CSV 다운로드 실패 ` + res.status);
  const buf = new Uint8Array(await res.arrayBuffer());
  let text = new TextDecoder('euc-kr').decode(buf);       // 이 기관 파일은 EUC-KR인 경우가 많음
  if (/\uFFFD/.test(text.slice(0, 2000))) text = new TextDecoder('utf-8').decode(buf);
  console.log(`${pk}: ${buf.length}바이트`);
  return text;
}

// 영문 공연정보 CSV
async function fetchEnglishCsv() {
  const rows = enRowsFromCsv(await downloadFileData(EN_PK));
  console.log(`영문 공연정보 ${rows.length}행. 예시:`, JSON.stringify(rows.slice(0, 2)));
  return rows;
}

// ---------- 주차장 혼잡도 정보 (한국체육산업개발, 파일데이터 15164156) ----------
// 칸: 일련번호, 주차장아이디, 주차구역, 혼잡도(원활·혼잡·만차), 등록일, 등록시간
// 등록시간의 분·초가 날짜의 월·일과 같게 찍혀 있어 시간대는 쓰지 않고 '날짜' 단위로만 셈
export function parkingStats(text) {
  const rows = parseCsv(text.replace(/^\uFEFF/, '')), head = rows[0].map(h => h.trim());
  const iz = head.findIndex(h => /주차구역/.test(h)), il = head.findIndex(h => /혼잡도/.test(h)), id = head.findIndex(h => /등록일/.test(h));
  const days = {}, zones = {};
  for (const r of rows.slice(1)) {
    const d = (r[id] || '').trim(), lv = (r[il] || '').trim(), z = (r[iz] || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !lv) continue;
    const rank = lv === '만차' ? 2 : lv === '혼잡' ? 1 : 0;
    days[d] = Math.max(days[d] ?? 0, rank);
    if (z) { zones[z] ??= { n: 0, full: 0 }; zones[z].n++; if (rank === 2) zones[z].full++; }
  }
  const ds = Object.keys(days).sort(), vals = Object.values(days);
  return { pk: '15164156', days: ds.length, full: vals.filter(v => v === 2).length, busy: vals.filter(v => v === 1).length,
    from: ds[0], to: ds[ds.length - 1], zones };
}
async function fetchParking() {
  const p = parkingStats(await downloadFileData('15164156'));
  if (p.days < 10) throw new Error('주차 혼잡도 기록이 너무 적음');
  console.log(`주차 혼잡도: ${p.days}일 중 만차 ${p.full}일, 혼잡 ${p.busy}일 (${p.from}~${p.to})`);
  return p;
}

// 오류 응답에 요청 주소(serviceKey 포함)가 그대로 찍혀 나오는 API가 있어, 공개 Actions 로그에 남기 전에 키를 가림
const redact = (s, key) => !key ? s : String(s).split(key).join('***').split(encodeURIComponent(key)).join('***');

// ---------- 국문 공연정보 API ----------
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)); return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : ''; };
async function fetchKorean(key) {
  const rows = []; let total = 0;
  for (let page = 1; page <= 60; page++) {
    const url = `https://api.kcisa.kr/openapi/service/rest/meta/KSCperf?serviceKey=${encodeURIComponent(key)}&numOfRows=100&pageNo=${page}`;
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`국문 공연정보 ${page}쪽 응답 ${res.status}`);
    const xml = await res.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    if (page === 1 && !items.length) throw new Error('국문 공연정보 응답 없음: ' + redact(xml.slice(0, 200), key));
    for (const it of items) rows.push({ title: tag(it, 'title'), venue: tag(it, 'subjectKeyword'), spatial: tag(it, 'spatial'), temporalCoverage: tag(it, 'temporalCoverage') });
    total = +tag(xml, 'totalCount') || total;
    if (!items.length || rows.length >= total) break;
  }
  // 중간 쪽에서 오류 응답(호출 한도 등)이 오면 items가 비어 조용히 멈추므로, 전체 건수와 비교해 덜 받았으면 실패 처리
  if (total && rows.length < total * 0.95) throw new Error(`국문 공연정보를 ${rows.length}/${total}건만 받음 — 저장하지 않음`);
  console.log(`국문 공연정보 ${rows.length}건`);
  return rows;
}

// ---------- 올림픽공원 대관정보 API (행사명·장소, 날짜 없음) ----------
// 1초에 1번 미만으로 호출해야 해서 쉬어 가며 받음
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fetchRental(key) {
  const rows = [];
  for (let page = 1; page <= 20; page++) {
    if (page > 1) await sleep(2500);
    const res = await fetch(`https://api.kcisa.kr/openapi/service/rest/meta12/getKSCD0803?serviceKey=${encodeURIComponent(key)}&numOfRows=100&pageNo=${page}`,
      { headers: { ...UA, Accept: 'application/json' } });
    if (!res.ok) throw new Error('대관정보 응답 ' + res.status);
    const items = JSON.parse(await res.text()).response.body.items?.item || [];
    for (const it of items) rows.push({ title: it.title || '', venue: it.spatial || '', spatial: '', source: 'rent' });
    if (items.length < 100) break;
  }
  console.log(`대관정보 ${rows.length}건`);
  return rows;
}

async function main() {
  const key = process.env.KCISA_KEY;
  if (!key) throw new Error('KCISA_KEY 환경변수가 없습니다 (깃허브 Settings → Secrets 에 등록)');
  const rentKey = process.env.KCISA_RENT_KEY;
  const [en, ko, rent] = await Promise.all([fetchEnglishCsv(), fetchKorean(key), rentKey ? fetchRental(rentKey) : Promise.resolve([])]);
  // 같은 행사가 두 데이터에 모두 있으면 한 번만 셈(제목 정규화 + 공연장)
  const seen = new Set(ko.map(r => r.title.replace(/\s+/g, '').toUpperCase()));
  const rentNew = rent.filter(r => !seen.has(r.title.replace(/\s+/g, '').toUpperCase()));
  const out = buildEvents(en, [...ko, ...rentNew], { since: '2025-01-01' });
  out.totalRent = rent.length;
  // 주차 혼잡도는 실패해도 공연 목록 갱신은 계속(지난 값 유지)
  const prevAll = JSON.parse(await readFile(OUT, 'utf8').catch(() => '{}'));
  try { out.parking = await fetchParking(); } catch (e) { console.log('::warning::주차 혼잡도 건너뜀: ' + e.message); if (prevAll.parking) out.parking = prevAll.parking; }
  if (out.events.length < 20) throw new Error(`공연이 ${out.events.length}개뿐 — 데이터 형식이 바뀐 것 같아 저장하지 않음`);
  const histTotal = Object.values(out.history).reduce((a, b) => a + b, 0);
  if (histTotal < (ko.length) * 0.5) throw new Error(`공연장 기록이 ${histTotal}건뿐 — 국문 데이터 형식이 바뀐 것 같아 저장하지 않음`);
  // 지난번보다 국문 기록이 절반 넘게 줄었으면(API가 일부만 내려준 경우 등) 저장하지 않음. 국문 데이터는 2024년까지라 줄어들 일이 거의 없음
  if (prevAll.totalKo && ko.length < prevAll.totalKo * 0.5) throw new Error(`국문 기록이 ${prevAll.totalKo}건 → ${ko.length}건으로 크게 줄어 저장하지 않음`);
  const prev = prevAll;
  const next = { generated: new Date().toISOString().slice(0, 10), sources: { en: EN_PK, ko: KO_ID, rent: '15015212', parking: '15164156' }, ...out };
  const same = JSON.stringify({ ...prev, generated: 0 }) === JSON.stringify({ ...next, generated: 0 });
  if (same) { console.log('변경 없음'); return; }
  await writeFile(OUT, JSON.stringify(next));
  const c = b => out.events.filter(e => e.basis === b).length;
  console.log(`저장: 공연 ${out.events.length}개 (공연명 확인 ${c('title')}, 지난 공연 추정 ${c('history')}, 미확인 ${c(null)}), 국문 기록 ${out.totalKo}건`);
}

// 직접 실행했을 때만 main() — 경로에 공백·한글이 있으면 file:// 문자열 비교가 어긋나 아무것도 안 하고 끝나므로 pathToFileURL로 비교
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => {
  // 실패해도 기존 data/events.json 은 그대로 — 보안문자 요구는 경고만, 그 밖의 오류는 실패로 표시해 알림을 받음
  const msg = redact(redact(e.message, process.env.KCISA_KEY), process.env.KCISA_RENT_KEY);
  if (/보안문자/.test(msg)) { console.log('::warning::' + msg); return; }
  console.error('갱신 실패:', msg); process.exit(1);
});
