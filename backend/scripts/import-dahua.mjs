// Import DAHUA catalog into BangGia DB
// Usage: node scripts/import-dahua.mjs
import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import xml2js from 'xml2js';
import Product from '../src/models/Product.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = '/tmp/T12-2025_extracted/T12-2025/DAHUA THÁNG 12.2025.xlsx';
const IMAGE_OUT_DIR = path.join(__dirname, '..', 'public', 'uploads', 'products', 'dahua');
const SPECS_SOURCE = 'DAHUA THÁNG 12.2025.xlsx';

fs.mkdirSync(IMAGE_OUT_DIR, { recursive: true });

// Connect
const MONGODB_URI = process.env.MONGODB_URI;
await mongoose.connect(MONGODB_URI);
console.log('Connected to DB');

// Parse XLSX
const xlsx = new AdmZip(XLSX_PATH);
const parser = new xml2js.Parser();

// Read shared strings
const ssXml = xlsx.readAsText('xl/sharedStrings.xml');
const ssResult = await parser.parseStringPromise(ssXml);
const siNodes = ssResult.sst?.si || [];
const strings = siNodes.map(si => {
  const t = si.t?.[0];
  if (typeof t === 'string') return t;
  if (t?._) return t._;
  const texts = [];
  for (const r of si.r || []) {
    if (r.t?.[0]) texts.push(typeof r.t[0] === 'string' ? r.t[0] : r.t[0]._ || '');
  }
  return texts.join('');
});

console.log(`Shared strings: ${strings.length}`);

// Read workbook for sheet names
const wbXml = xlsx.readAsText('xl/workbook.xml');
const wbResult = await parser.parseStringPromise(wbXml);
const sheets = wbResult.workbook?.sheets?.[0]?.sheet || [];
console.log(`Sheets: ${sheets.length}`);

// Extract all images to files
const mediaEntries = xlsx.getEntries().filter(e => e.entryName.startsWith('xl/media/'));
for (const entry of mediaEntries) {
  const fname = path.basename(entry.entryName);
  const outPath = path.join(IMAGE_OUT_DIR, fname);
  if (!fs.existsSync(outPath)) {
    fs.writeFileSync(outPath, entry.getData());
  }
}
console.log(`Extracted ${mediaEntries.length} images`);

// Parse drawing relationships to map images -> cells
async function getImageMap(sheetNum) {
  const relPath = `xl/drawings/_rels/drawing${sheetNum}.xml.rels`;
  const drawingRelsEntry = xlsx.getEntries().find(e => e.entryName === relPath);
  if (!drawingRelsEntry) return {};
  
  const relXml = xlsx.readAsText(relPath);
  const relResult = await parser.parseStringPromise(relXml);
  const relationships = relResult.Relationships?.Relationship || [];
  const imgRelMap = {};
  for (const rel of relationships) {
    const target = rel.$?.Target;
    const rId = rel.$?.Id;
    if (target && rId) {
      imgRelMap[rId] = path.basename(target);
    }
  }

  const drawingPath = `xl/drawings/drawing${sheetNum}.xml`;
  const drawingEntry = xlsx.getEntries().find(e => e.entryName === drawingPath);
  if (!drawingEntry) return {};
  
  const drawXml = xlsx.readAsText(drawingPath);
  const drawResult = await parser.parseStringPromise(drawXml);
  
  const rowImageMap = {};
  const anchors = drawResult['xdr:wsDr']?.['xdr:twoCellAnchor'] || [];
  for (const anchor of anchors) {
    const from = anchor['xdr:from']?.[0];
    const row = parseInt(from?.['xdr:row']?.[0]?._ || from?.['xdr:row']?.[0] || '0');
    const pic = anchor['xdr:pic']?.[0];
    const blip = pic?.['xdr:blipFill']?.[0]?.['a:blip']?.[0];
    const embed = blip?.$?.['r:embed'];
    const imgFile = imgRelMap[embed];
    if (imgFile && !isNaN(row)) {
      if (!rowImageMap[row]) rowImageMap[row] = [];
      rowImageMap[row].push(imgFile);
    }
  }
  
  return rowImageMap;
}

// Parse price string to number
function parsePrice(str) {
  if (!str || str === 'LIÊN HỆ' || str === 'LH') return null;
  const cleaned = str.replace(/[.,\sđVND]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

// PR code counter
let prCounter = null;
async function nextPrCode() {
  if (prCounter === null) {
    const last = await Product.findOne({ prCode: { $exists: true } })
      .sort({ prCode: -1 }).select('prCode');
    const match = last?.prCode?.match(/PR(\d+)/);
    prCounter = match ? parseInt(match[1]) : 0;
  }
  prCounter++;
  return `PR${String(prCounter).padStart(6, '0')}`;
}

// Process each sheet
let totalUpdated = 0;
let totalCreated = 0;
const skippedSheets = [];

for (let i = 0; i < sheets.length; i++) {
  const sheetName = sheets[i].$?.name || `Sheet${i+1}`;
  const sheetNum = i + 1;
  
  try {
    const sheetXml = xlsx.readAsText(`xl/worksheets/sheet${sheetNum}.xml`);
    const sheetResult = await parser.parseStringPromise(sheetXml);
    const rows = sheetResult.worksheet?.sheetData?.[0]?.row || [];
    
    const rowImages = await getImageMap(sheetNum);
    
    // Find header row
    let headerRowNum = 0;
    for (const row of rows) {
      const cells = row.c || [];
      const texts = cells.map(c => {
        const v = c.v?.[0];
        const t = c.$?.t;
        if (v && t === 's') return strings[parseInt(v, 10)] || '';
        return v || '';
      });
      const full = texts.join(' ').toLowerCase();
      if (full.includes('mã sản phẩm') || full.includes('model')) {
        headerRowNum = parseInt(row.$.r);
        break;
      }
    }
    
    if (!headerRowNum) {
      skippedSheets.push(`${sheetName} (no header)`);
      continue;
    }
    
    console.log(`\nSheet ${sheetNum}: "${sheetName}" - ${rows.length} rows`);
    
    let sheetUpdated = 0, sheetCreated = 0;
    
    for (const row of rows) {
      const rowNum = parseInt(row.$.r);
      if (rowNum <= headerRowNum) continue;
      
      const cells = row.c || [];
      const values = {};
      for (const c of cells) {
        const ref = c.$?.r || '';
        const col = ref.replace(/\d/g, '');
        const v = c.v?.[0];
        const t = c.$?.t;
        if (v !== undefined) {
          values[col] = t === 's' ? (strings[parseInt(v, 10)] || '') : v;
        }
      }
      
      const code = (values['B'] || '').trim();
      const specs = (values['C'] || '').trim();
      const priceStr = (values['D'] || '').trim();
      const images = rowImages[rowNum] || [];
      
      if (!code || code.length < 3) continue;
      if (code.includes('Mã sản') || code.includes('Model')) continue;
      // Skip section headers (all caps descriptions)
      if (/^[A-ZĐ\s]{10,}$/.test(code)) continue;
      
      const price = parsePrice(priceStr);
      const imageUrls = images.map(img => `/uploads/products/dahua/${img}`);
      
      // Match by name (model code)
      let product = await Product.findOne({ name: code });
      
      if (product) {
        const update = { specs_source: SPECS_SOURCE };
        if (specs) update.specs = { raw: specs };
        if (price !== null) {
          update['prices.L6'] = price;
          if (!product.priceUpdatedAt) update.priceUpdatedAt = new Date();
        }
        // Add new images
        if (imageUrls.length > 0) {
          const existingImages = product.images || [];
          const newImages = imageUrls.filter(u => !existingImages.includes(u));
          if (newImages.length > 0) {
            update['$push'] = { images: { $each: newImages } };
            if (!product.imageUrl) update.imageUrl = newImages[0];
          }
        }
        await Product.updateOne({ _id: product._id }, { $set: update });
        sheetUpdated++;
        totalUpdated++;
      } else {
        await Product.create({
          code,
          name: code,
          prCode: await nextPrCode(),
          brand: 'DAHUA',
          group: 'CAMERA IP',
          prices: price !== null ? { L6: price } : {},
          specs: specs ? { raw: specs } : {},
          specs_source: SPECS_SOURCE,
          images: imageUrls,
          imageUrl: imageUrls[0] || '',
          status: 'PENDING_MAP',
          priceUpdatedAt: price !== null ? new Date() : null,
        });
        sheetCreated++;
        totalCreated++;
      }
    }
    
    console.log(`  Updated: ${sheetUpdated}, Created: ${sheetCreated}`);
  } catch (err) {
    skippedSheets.push(`${sheetName} (${err.message})`);
  }
}

console.log(`\n========== DONE ==========`);
console.log(`Total updated: ${totalUpdated}`);
console.log(`Total created: ${totalCreated}`);
if (skippedSheets.length) {
  console.log(`Skipped: ${skippedSheets.join(', ')}`);
}

await mongoose.disconnect();
