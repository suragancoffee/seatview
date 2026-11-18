// 주차장 혼잡도 정보(15164156, 파일데이터) 구조 확인
const UA = { 'User-Agent': 'Mozilla/5.0 (seatview data probe)' };
const PK = '15164156';
const page = await (await fetch(`https://www.data.go.kr/data/${PK}/fileData.do`, { headers: UA })).text();
const ids = [...new Set(page.match(/uddi:[0-9a-f-]{20,}[_0-9]*/gi) || [])]; console.log('uddi', ids);
const meta = await (await fetch('https://www.data.go.kr/tcs/dss/selectFileDataDownload.do', { method: 'POST',
  headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ publicDataPk: PK, publicDataDetailPk: ids[0], fileDetailSn: '1' }) })).json();
const atch = meta.atchFileId || meta?.fileDataRegistVO?.atchFileId, sn = meta.fileDetailSn || meta?.fileDataRegistVO?.fileDetailSn || '1';
console.log('atch', atch, sn);
const lim = await (await fetch('https://www.data.go.kr/cmm/cmm/check-limit.json', { method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ atchFileId: atch, fileDetailSn: sn }) })).json().catch(() => ({}));
if (lim.needCaptcha) { console.log('보안문자 요구 — 중단'); process.exit(0); }
const buf = new Uint8Array(await (await fetch(`https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=${atch}&fileDetailSn=${sn}&dataNm=p`, { headers: UA })).arrayBuffer());
let text = new TextDecoder('euc-kr').decode(buf); if (/�/.test(text.slice(0, 2000))) text = new TextDecoder('utf-8').decode(buf);
const lines = text.split(/\r?\n/).filter(Boolean);
console.log('bytes', buf.length, 'lines', lines.length); console.log(lines.slice(0, 8).join('\n')); console.log('...'); console.log(lines.slice(-5).join('\n'));
const cols = lines[0].split(','); const by = (i) => { const m = {}; for (const l of lines.slice(1)) { const v = l.split(',')[i]; m[v] = (m[v] || 0) + 1; } return m; };
for (let i = 0; i < cols.length; i++) { const m = by(i); const k = Object.keys(m); console.log(cols[i], '고유값', k.length, k.length < 40 ? JSON.stringify(m) : k.slice(0, 5).join(' / ')); }
