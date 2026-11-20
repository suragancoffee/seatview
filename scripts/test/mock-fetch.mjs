// update-events.mjs 시험용 가짜 fetch. 시나리오는 환경변수 MOCK으로 고름
const S = process.env.MOCK || 'normal';
const KEY = process.env.KCISA_KEY;

const enRows = n => {
  const artists = ['BTS', 'SEVENTEEN', 'IU', 'NEWJEANS', 'AESPA', 'STRAYKIDS', 'TWICE', 'ZEROBASEONE', 'TREASURE', 'ENHYPEN'];
  const out = ['DATE,TITLE,URL'];
  for (let i = 0; i < n; i++) out.push(`2026-0${1 + (i % 9)}-1${i % 10},${artists[i % artists.length]} WORLD TOUR ${i},https://tickets.example/${i}`);
  return out.join('\n');
};
const PARK = ['일련번호,주차장아이디,주차구역,혼잡도,등록일,등록시간'];
for (let d = 1; d <= 30; d++) PARK.push(`${d},P1,1주차장,${d % 3 ? '만차' : '원활'},2026-09-${String(d).padStart(2, '0')},2026-09-${String(d).padStart(2, '0')}`);
const VEN = ['KspoDome', '핸드볼경기장', '올림픽홀', '우리금융아트홀', '뮤즈라이브'];
const ART = ['BTS', 'SEVENTEEN', 'IU', 'NEWJEANS', 'AESPA', 'STRAYKIDS', 'TWICE', 'ZEROBASEONE', 'TREASURE', 'ENHYPEN'];
const TOTAL = S === 'ko-shrunk' ? 1000 : 2500;
const koPage = page => {
  const items = [];
  for (let i = (page - 1) * 100; i < Math.min(TOTAL, page * 100); i++)
    items.push(`<item><title>${ART[i % ART.length]} 콘서트 ${i}</title><subjectKeyword>${VEN[i % VEN.length]}</subjectKeyword><spatial>올림픽공원</spatial></item>`);
  return `<response><body><items>${items.join('')}</items><totalCount>${TOTAL}</totalCount></body></response>`;
};
const ok = (body, type = 'text/plain') => new Response(body, { status: 200, headers: { 'content-type': type } });

globalThis.fetch = async (url, opt = {}) => {
  url = String(url);
  if (S === 'hang' && /KSCperf/.test(url)) return new Promise((_, rej) => opt.signal?.addEventListener('abort', () => rej(opt.signal.reason)));
  if (/fileData\.do/.test(url)) return ok('<html>uddi:12345678-aaaa-bbbb-cccc-1234567890ab</html>');
  if (/selectFileDataDownload/.test(url)) { const pk = new URLSearchParams(String(opt.body)).get('publicDataPk'); return ok(JSON.stringify({ atchFileId: 'F' + pk }), 'application/json'); }
  if (/check-limit/.test(url)) return ok(JSON.stringify({ needCaptcha: S === 'captcha' }), 'application/json');
  if (/fileDownload/.test(url)) {
    if (/F15164156/.test(url)) { if (S === 'parking-fail') return new Response('err', { status: 500 }); return ok(new TextEncoder().encode(PARK.join('\n'))); }
    return ok(new TextEncoder().encode(enRows(S === 'en-few' ? 5 : 160)));
  }
  if (/KSCperf/.test(url)) {
    const page = +new URL(url).searchParams.get('pageNo');
    if (S === 'ko-empty') return ok(`<response><header><resultMsg>SERVICE KEY IS NOT REGISTERED ${url}</resultMsg></header></response>`);
    if (S === 'ko-500' && page === 3) return new Response('busy', { status: 500 });
    if (S === 'ko-errxml' && page === 3) return ok('<response><header><resultCode>22</resultCode><resultMsg>LIMITED NUMBER OF SERVICE REQUESTS EXCEEDS ERROR</resultMsg></header></response>');
    return ok(koPage(page));
  }
  throw new Error('예상 못 한 요청 ' + url);
};
