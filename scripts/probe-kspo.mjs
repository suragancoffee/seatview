// 한국체육산업개발 대관정보·연계 데이터 API 응답 구조 확인용 (키는 깃허브 Secret으로만 받음)
const UA = { 'User-Agent': 'seatview data probe', Accept: 'application/json' };
const RENT = process.env.KCISA_RENT_KEY, LINK = process.env.KCISA_LINK_KEY;
const get = async (url, ms = 60000) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { headers: UA, signal: c.signal }); return [r.status, await r.text()]; } catch (e) { return [0, String(e)]; } finally { clearTimeout(t); } };
// 1) 대관정보 전체
const all = [];
for (let p = 1; p <= 10; p++) {
  const [s, t] = await get(`https://api.kcisa.kr/openapi/service/rest/meta12/getKSCD0803?serviceKey=${RENT}&numOfRows=100&pageNo=${p}`);
  if (s !== 200) { console.log('rent page', p, s); break; }
  const items = JSON.parse(t).response.body.items?.item || []; all.push(...items.map(i => ({ title: i.title, spatial: i.spatial, regDate: i.regDate, url: i.url })));
  if (items.length < 100) break;
}
console.log('대관정보', all.length, '건');
const cnt = {}; for (const i of all) cnt[i.spatial] = (cnt[i.spatial] || 0) + 1; console.log('장소별', JSON.stringify(cnt));
console.log('연도 표기 분포', JSON.stringify(all.reduce((m, i) => { const y = (i.title.match(/20\d\d/) || ['없음'])[0]; m[y] = (m[y] || 0) + 1; return m; }, {})));
console.log('마지막 40건:'); for (const i of all.slice(-40)) console.log('  ', i.spatial, '|', i.title);
console.log('url 종류', JSON.stringify([...new Set(all.map(i => i.url))].slice(0, 5)));
// 2) 연계 데이터 (시간 초과가 잦아 여러 형태로 재시도)
for (const q of ['numOfRows=5&pageNo=1', 'numOfRows=5&pageNo=1&keyword=', 'numOfRows=2&pageNo=1&keyword=']) {
  const [s, t] = await get(`https://api.kcisa.kr/openapi/API_CPM_009/request?serviceKey=${LINK}&${q}`, 90000);
  console.log('\n연계', q, s, t.slice(0, 3000)); if (s === 200) break;
}
