// 연계 데이터(API_CPM_009) 구조 확인 (키는 깃허브 Secret으로만 받음)
const UA = { 'User-Agent': 'seatview data probe', Accept: 'application/json' };
const LINK = process.env.KCISA_LINK_KEY;
const get = async (url, ms = 90000) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { headers: UA, signal: c.signal }); return [r.status, await r.text()]; } catch (e) { return [0, String(e)]; } finally { clearTimeout(t); } };
let all = [], total;
for (let p = 1; p <= 4; p++) {
  const [s, t] = await get(`https://api.kcisa.kr/openapi/API_CPM_009/request?serviceKey=${LINK}&numOfRows=500&pageNo=${p}&keyword=`);
  if (s !== 200) { console.log('page', p, s, t.slice(0, 200)); continue; }
  const b = JSON.parse(t).response.body; total = b.totalCount; const it = b.items?.item || []; all.push(...it);
  console.log('page', p, it.length, 'total', total);
}
console.log('필드', JSON.stringify(Object.keys(all[0] || {})));
const kinds = {}; for (const i of all) { const k = (i.TITLE || '').replace(/^\d{8}\s*/, ''); kinds[k] = (kinds[k] || 0) + 1; }
console.log('제목 유형', JSON.stringify(kinds));
for (const k of Object.keys(kinds)) { const ex = all.find(i => (i.TITLE || '').replace(/^\d{8}\s*/, '') === k); console.log('\n예시', k, JSON.stringify(ex).slice(0, 1500)); }
const longest = all.filter(i => i.DESCRIPTION).sort((a, b) => b.DESCRIPTION.length - a.DESCRIPTION.length)[0];
console.log('\nDESCRIPTION 최장', longest ? longest.DESCRIPTION.slice(0, 2500) : '없음');
