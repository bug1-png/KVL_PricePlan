// เปิดเว็บเซิร์ฟเวอร์ดูแอปผ่านเบราว์เซอร์ (คนอื่นในวงเดียวกันเปิดผ่าน IP ของเครื่องนี้ได้)
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..');
const PORT = +process.env.PORT || 5173;
const TYPES = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css' };
http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || p.startsWith('/tools') || p.startsWith('/data/')) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end('Not found'); } else { r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); r.end(d); } });
}).listen(PORT, '0.0.0.0', () => {
  console.log('KAVALON พร้อมใช้งาน');
  console.log('  เครื่องนี้ : http://localhost:' + PORT);
  Object.values(os.networkInterfaces()).flat().filter(i => i.family === 'IPv4' && !i.internal).forEach(i => console.log('  เครื่องอื่น: http://' + i.address + ':' + PORT));
});
