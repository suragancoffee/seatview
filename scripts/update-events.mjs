// 공연 목록 자동 갱신 (GitHub Actions에서 매달 실행)
//  1) 영문 공연정보 CSV (공공데이터포털 파일데이터 15149169, EUC-KR) → 최근 공연
//  2) 국문 공연정보 API (한국문화정보원 KSCperf) → 공연장별 지난 공연 기록
//  3) scripts/match.mjs 로 공연장 추정 → data/events.json
// API 키는 코드에 넣지 않고 환경변수 KCISA_KEY(깃허브 Secret)로만 받습니다.
// 어느 단계든 실패하면 기존 data/events.json 을 그대로 두고 종료합니다.
import { readFile, writeFile } from 'node:fs/promises';
import { buildEvents } from './match.mjs';

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

// ---------- 영문 공연정보 CSV 내려받기 (공공데이터포털 파일데이터 다운로드 절차) ----------
async function fetchEnglishCsv() {
  const page = await (await fetch(`https://www.data.go.kr/data/${EN_PK}/fileData.do`, { headers: UA })).text();
  const m = page.match(/uddi:[0-9a-f-]{20,}/i);
  if (!m) throw new Error('데이터 상세 ID(uddi)를 찾지 못함');
  const body = new URLSearchParams({ publicDataPk: EN_PK, publicDataDetailPk: m[0], fileDetailSn: '1' });
  const meta = await (await fetch('https://www.data.go.kr/tcs/dss/selectFileDataDownload.do', {
    method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body })).json();
  const atch = meta.atchFileId || meta?.fileDataRegistVO?.atchFileId;
  const sn = meta.fileDetailSn || meta?.fileDataRegistVO?.fileDetailSn || '1';
  if (!atch) throw new Error('atchFileId 없음: ' + JSON.stringify(meta).slice(0, 200));
  // 다운로드 한도 확인: 보안문자(captcha)를 요구하면 우회하지 않고 이번 갱신을 건너뜀
  try {
    const lim = await (await fetch('https://www.data.go.kr/cmm/cmm/check-limit.json', {
      method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ atchFileId: atch, fileDetailSn: sn }) })).json();
    if (lim.needCaptcha) throw new Error('보안문자 요구 — 이번 달 갱신 건너뜀');
  } catch (e) { if (/보안문자/.test(e.message)) throw e; }
  const res = await fetch(`https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=${atch}&fileDetailSn=${sn}&dataNm=en`, { headers: UA });
  if (!res.ok) throw new Error('CSV 다운로드 실패 ' + res.status);
  const buf = new Uint8Array(await res.arrayBuffer());
  let text = new TextDecoder('euc-kr').decode(buf);       // 이 파일은 EUC-KR
  if (/�/.test(text.slice(0, 2000))) text = new TextDecoder('utf-8').decode(buf);
  const rows = enRowsFromCsv(text);
  console.log(`영문 CSV ${buf.length}바이트, ${rows.length}행. 앞부분:`, JSON.stringify(text.slice(0, 300)));
  console.log('예시 행:', JSON.stringify(rows.slice(0, 3)));
  return rows;
}

// ---------- 국문 공연정보 API ----------
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)); return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : ''; };
async function fetchKorean(key) {
  const rows = [];
  for (let page = 1; page <= 60; page++) {
    const url = `https://api.kcisa.kr/openapi/service/rest/meta/KSCperf?serviceKey=${encodeURIComponent(key)}&numOfRows=100&pageNo=${page}`;
    const xml = await (await fetch(url, { headers: UA })).text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    if (page === 1 && !items.length) throw new Error('국문 공연정보 응답 없음: ' + xml.slice(0, 200));
    for (const it of items) rows.push({ title: tag(it, 'title'), subjectKeyword: tag(it, 'subjectKeyword'), spatial: tag(it, 'spatial'), temporalCoverage: tag(it, 'temporalCoverage') });
    const total = +tag(xml, 'totalCount') || 0;
    if (!items.length || rows.length >= total) break;
  }
  console.log(`국문 공연정보 ${rows.length}건`);
  return rows;
}

async function main() {
  const key = process.env.KCISA_KEY;
  if (!key) throw new Error('KCISA_KEY 환경변수가 없습니다 (깃허브 Settings → Secrets 에 등록)');
  const [en, ko] = await Promise.all([fetchEnglishCsv(), fetchKorean(key)]);
  const out = buildEvents(en, ko, { since: '2025-01-01' });
  if (out.events.length < 20) throw new Error(`공연이 ${out.events.length}개뿐 — 데이터 형식이 바뀐 것 같아 저장하지 않음`);
  const prev = JSON.parse(await readFile(OUT, 'utf8').catch(() => '{}'));
  const next = { generated: new Date().toISOString().slice(0, 10), sources: { en: EN_PK, ko: KO_ID }, ...out };
  const same = JSON.stringify({ ...prev, generated: 0 }) === JSON.stringify({ ...next, generated: 0 });
  if (same) { console.log('변경 없음'); return; }
  await writeFile(OUT, JSON.stringify(next));
  const c = b => out.events.filter(e => e.basis === b).length;
  console.log(`저장: 공연 ${out.events.length}개 (공연명 확인 ${c('title')}, 지난 공연 추정 ${c('history')}, 미확인 ${c(null)}), 국문 기록 ${out.totalKo}건`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => {
  // 실패해도 기존 data/events.json 은 그대로 — 보안문자 요구는 경고만, 그 밖의 오류는 실패로 표시해 알림을 받음
  if (/보안문자/.test(e.message)) { console.log('::warning::' + e.message); return; }
  console.error('갱신 실패:', e.message); process.exit(1);
});
