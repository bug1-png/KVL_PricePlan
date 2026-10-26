// อัปเดต data.js จากไฟล์ Excel ในโฟลเดอร์ data/
//   1) data/Kavalon_Pricelist_Promotion.xlsx  (ชีท Pricelist_090225(Master)) -> ราคา โปรโมชั่น สถานะห้อง พื้นที่ขาย
//   2) data/KAVALON_DeedArea.xlsx             (ไม่บังคับ)                     -> พื้นที่โฉนด
// ตำแหน่ง/กรอบห้องบนแปลนอ่านจาก data/geometry.json (ไม่ต้องแก้)
const fs = require('fs');
const path = require('path');
const XLSX = require('./node_modules/xlsx');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const PRICE_SHEET = 'Pricelist_090225(Master)';
const PRICE_FILE = process.argv[2] || 'Kavalon_Pricelist_Promotion.xlsx';
const DEED_FILE = 'KAVALON_DeedArea.xlsx';

const numOrNull = v => { if (v == null || v === '') return null; const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? null : n; };
const num = v => (typeof v === 'number' ? v : (v == null || v === '' ? 0 : +v || 0));
const str = v => (v == null ? '' : String(v).trim());

function readSheet(file, sheet) {
  const wb = XLSX.readFile(file);
  const name = sheet && wb.SheetNames.includes(sheet) ? sheet : wb.SheetNames[0];
  if (sheet && name !== sheet) console.log(`! ไม่พบชีท "${sheet}" ใช้ชีท "${name}" แทน`);
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true });
}

const priceFile = path.join(DATA, PRICE_FILE);
if (!fs.existsSync(priceFile)) { console.error('ไม่พบไฟล์ ' + priceFile); process.exit(1); }
const geo = JSON.parse(fs.readFileSync(path.join(DATA, 'geometry.json'), 'utf8'));

// พื้นที่โฉนด
const deed = {};
const deedFile = path.join(DATA, DEED_FILE);
if (fs.existsSync(deedFile)) {
  readSheet(deedFile).slice(1).forEach(r => {
    const c = str(r[0]);
    const v = r[2];
    if (/^[A-I]\d{4}$/.test(c) && v !== null && v !== '' && !isNaN(+v)) deed[c] = +v;
  });
  console.log('พื้นที่โฉนด: อ่านได้ ' + Object.keys(deed).length + ' ห้อง');
} else {
  console.log('ไม่พบ ' + DEED_FILE + ' (ข้ามพื้นที่โฉนด)');
}

const rows = readSheet(priceFile, PRICE_SHEET).slice(2).filter(r => /^[A-I]\d{4}$/.test(r[2] || ''));
const units = [], seen = new Set(), noGeo = [];
for (const r of rows) {
  const c = r[2];
  if (seen.has(c)) continue;      // แถวซ้ำท้ายตาราง ใช้แถวแรก
  seen.add(c);
  const g = geo.units[c];
  if (!g) { noGeo.push(c); continue; }
  const total = num(r[16]) + num(r[17]) + num(r[18]) + num(r[19]);
  let status = str(r[9]);
  if (/^sold$/i.test(status)) status = 'SOLD';   // sold / Sold / SOLD -> SOLD
  const u = {
    c, t: c[0], f: g.f, type: r[5], dir: r[6], area: numOrNull(r[7]), view: r[8], status,
    avail: status.startsWith('แปลงว่าง'), lto: status.includes('Lease'),
    detail: r[10], open: str(r[1]),
    price: num(r[12]), base: num(r[13]), var: num(r[14]),
    p1: num(r[16]), p2: num(r[17]), p21: num(r[18]), p3: num(r[19]),
    total, net: num(r[12]) - total,
    pro4: str(r[22]), free: num(r[23]), event: r[24], evdate: r[25],
    x: g.x, y: g.y, r: g.r, ap: g.ap
  };
  if (deed[c] !== undefined) u.area = deed[c];
  units.push(u);
}

fs.writeFileSync(path.join(ROOT, 'data.js'), 'window.KAV=' + JSON.stringify({ w: geo.w, h: geo.h, units }) + ';');

const avail = units.filter(u => u.avail).length;
console.log(`เสร็จแล้ว: ${units.length} ห้อง (ว่าง ${avail} / ไม่ว่าง ${units.length - avail})`);
if (noGeo.length) console.log(`! ห้องใหม่ที่ยังไม่มีตำแหน่งบนแปลน ${noGeo.length} ห้อง (ไม่แสดง): ${noGeo.join(', ')}`);
const missing = Object.keys(geo.units).filter(c => !seen.has(c));
if (missing.length) console.log(`! ห้องที่หายจาก Excel ${missing.length} ห้อง (ไม่แสดง): ${missing.join(', ')}`);
