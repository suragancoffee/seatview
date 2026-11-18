// 한국체육산업개발 대관정보·연계 데이터 API 응답 구조 확인용 (키는 깃허브 Secret으로만 받음)
const UA = { 'User-Agent': 'seatview data probe' };
const APIS = [
  ['대관정보', 'https://api.kcisa.kr/openapi/service/rest/meta12/getKSCD0803', process.env.KCISA_RENT_KEY],
  ['연계데이터', 'https://api.kcisa.kr/openapi/API_CPM_009/request', process.env.KCISA_LINK_KEY],
];
for (const [name, base, key] of APIS) {
  if (!key) { console.log(name, ': 키 없음'); continue; }
  for (const page of [1, 2]) {
    const url = `${base}?serviceKey=${encodeURIComponent(key)}&numOfRows=5&pageNo=${page}`;
    const res = await fetch(url, { headers: { ...UA, Accept: 'application/json' } });
    const text = await res.text();
    console.log(`\n=== ${name} page ${page}: HTTP ${res.status}, ${text.length} bytes`);
    console.log(text.slice(0, 3500));
  }
  // 전체 건수·마지막 페이지 확인
  const res = await fetch(`${base}?serviceKey=${encodeURIComponent(key)}&numOfRows=1&pageNo=1`, { headers: UA });
  const t = await res.text();
  console.log(name, 'totalCount:', (t.match(/<totalCount>(\d+)/) || t.match(/"totalCount"\s*:\s*"?(\d+)/) || [])[1]);
}
