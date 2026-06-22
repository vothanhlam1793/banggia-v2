/**
 * parse-structured-specs.mjs
 * Batch parse specs.raw → structured specs fields in MongoDB
 * Reads ALL products with specs.raw, extracts structured fields,
 * updates MongoDB in bulkWrite batches.
 */
import { MongoClient } from 'mongodb';

// ── Connection ──────────────────────────────────────────────────
const URI = 'mongodb://black:***@127.0.0.1:27044/banggiasi-v3?authSource=admin';
const BATCH_SIZE = 200;

// ── Parser functions (mirror Python) ────────────────────────────

function reMatch(text, ...patterns) {
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) return m;
  }
  return null;
}

function parseResolution(text) {
  const m = reMatch(text,
    /(?:độ\s*phân\s*giải|phân\s*giải)\s*(?:hỗ\s*trợ\s*(?:lên\s*đến\s*)?)?(\d+(?:\.\d+)?)\s*(?:Megapixel|MP)\b/i,
    /(\d+(?:\.\d+)?)\s*Megapixel/i,
    /(\d+(?:\.\d+)?)\s*MP\b/i
  );
  return m ? { value: parseFloat(m[1]), unit: 'MP' } : null;
}

function parseLens(text) {
  const m = text.match(/ống\s*kính\s*(?:cố\s*định\s*|zoom\s*(?:quang\s*học\s*)?|motorized\s*)?(\d+(?:\.\d+)?)\s*mm/i);
  return m ? { focal: parseFloat(m[1]), unit: 'mm' } : null;
}

function parseIRRange(text) {
  const m = reMatch(text,
    /(?:tầm\s*xa\s*)?hồng\s*ngoại\s+(\d+(?:\.\d+)?)\s*m\b/i,
    /(?:tầm\s*nhìn\s*ban\s*đêm|đèn\s*trợ\s*sáng)\s+(\d+(?:\.\d+)?)\s*m\b/i
  );
  return m ? { value: parseFloat(m[1]), unit: 'm' } : null;
}

function parseProtection(text) {
  const m = text.match(/\bIP(\d{2})\b/i);
  return m ? `IP${m[1]}` : null;
}

function parseWDR(text) {
  return /\bWDR\b|chống\s*ngược\s*sáng|True\s*WDR/i.test(text) ? true : null;
}

function parseSensor(text) {
  const m1 = text.match(/cảm\s*biến\s+(?:STARVIS[™]?\s*)?(?:CMOS|Sony)?\s*([\d.]+\/\d+(?:\.\d+)?["\"])/i);
  if (m1) return m1[1].trim();
  return /(?:CMOS|STARVIS|Sony\s*Stavis)/i.test(text) ? 'CMOS' : null;
}

function parseCompression(text) {
  const comps = [];
  if (/H\.265\+/i.test(text)) comps.push('H.265+');
  else if (/H\.265\b/i.test(text)) comps.push('H.265');
  if (/H\.264\+/i.test(text)) comps.push('H.264+');
  else if (/H\.264\b/i.test(text)) comps.push('H.264');
  return comps.length ? comps : null;
}

function parseStorage(text) {
  const m = text.match(/(?:thẻ\s*nhớ\s*)?Micro\s*SD\s*(?:lên\s*đến\s*)?(\d+)\s*(GB|Gb|TB)/i);
  if (!m) return null;
  const unit = m[2].toUpperCase().replace('GB', 'GB').replace('TB', 'TB');
  return [{ type: 'microSD', max: parseInt(m[1]), unit: ['GB','TB'].includes(unit) ? unit : 'GB' }];
}

function parseAudio(text) {
  if (/đàm\s*thoại\s*2\s*chiều|two.?way/i.test(text)) return '2way';
  if (/tích\s*hợp\s*mic|micro|cắm\s*míc/i.test(text)) return 'mic_only';
  return null;
}

function parseAIFeatures(text) {
  const map = {
    'nhận\\s*diện\\s*khuôn\\s*mặt': 'face_detect',
    'phát\\s*hiện\\s*khuôn\\s*mặt': 'face_detect',
    'phát\\s*hiện\\s*con\\s*người': 'human_detect',
    'phát\\s*hiện\\s*chuyển\\s*động': 'motion_detect',
    'phát\\s*hiện\\s*âm\\s*thanh': 'sound_detect',
    'theo\\s*dõi\\s*đối\\s*tượng|smart\\s*tracking': 'smart_tracking',
    'hàng\\s*rào\\s*ảo|bảo\\s*vệ\\s*vành\\s*đai|bảo\\s*vệ\\s*chu\\s*vi|\\bIVS\\b': 'ivs',
    'đếm\\s*người': 'people_counting',
    'phát\\s*hiện\\s*đồ\\s*bỏ\\s*quên': 'abandoned_object',
    'phát\\s*hiện\\s*thay\\s*đổi\\s*hiện\\s*trường': 'scene_change',
    'chế\\s*độ\\s*riêng\\s*tư|privacy': 'privacy_mode',
    'ANPR|nhận\\s*diện\\s*biển\\s*số': 'anpr',
    'SMD\\s*[Pp]lus': 'smd_plus',
    'đèn\\s*nháy|cảnh\\s*báo\\s*chủ\\s*động|còi\\s*hú|đèn\\s*chớp': 'active_deterrent',
  };
  const features = [];
  for (const [pattern, feature] of Object.entries(map)) {
    if (new RegExp(pattern, 'i').test(text)) features.push(feature);
  }
  return features.length ? [...new Set(features)] : null;
}

function parsePower(text) {
  const result = {};
  const m = text.match(/(?:nguồn|điện\s*áp)\s*(?:DC\s*)?(\d+(?:\.\d+)?\s*V)/i);
  if (m) result.power = m[1].trim();
  if (/\bPoE\b|Power\s*over\s*Ethernet|Hi-PoE/i.test(text)) result.poe = true;
  return Object.keys(result).length ? result : null;
}

function parsePowerConsumption(text) {
  const m = reMatch(text,
    /(?:công\s*suất|Power\s*Consumption)\s*[:≤]?\s*(\d+(?:\.\d+)?)\s*W/i,
    /(\d+(?:\.\d+)?)\s*W\b/i
  );
  return m ? { value: parseFloat(m[1]), unit: 'W' } : null;
}

function parseWifi(text) {
  if (!/Wi-?Fi|wifi|wireless|802\.11/i.test(text)) return null;
  const result = {};
  if (/2\s*băng\s*tần|dual\s*band|2\.4GHz.*5GHz|5GHz.*2\.4GHz/i.test(text)) result.band = 'dual';
  else if (/5GHz/i.test(text)) result.band = '5GHz';
  else if (/2\.4GHz/i.test(text)) result.band = '2.4GHz';
  const m = text.match(/(?:chuẩn\s*)?(802\.11\s*[a-zA-Z/]+(?:\s*Wave\s*\d)?)/i);
  if (m) result.standard = m[1].trim();
  return Object.keys(result).length ? result : true;
}

function parseEthernetPorts(text) {
  const ports = {};
  const m1 = text.match(/(\d+)\s*(?:Gigabit\s*Ethernet|GE)\s*(?:copper|port)/i);
  if (m1) ports.copper = parseInt(m1[1]);
  const m2 = text.match(/(\d+)\s*(?:10[ -]?Gigabit|SFP\+?|fiber)\s*(?:Ethernet\s*)?(?:fiber\s*)?port/i);
  if (m2) ports.fiber = parseInt(m2[1]);
  const m3 = text.match(/(\d+)\s*cổng\s*(?:10\/100\/1000|Gigabit|10\/100M?|LAN|WAN)/i);
  if (m3) ports.total = parseInt(m3[1]);
  return Object.keys(ports).length ? ports : null;
}

function parseDimensions(text) {
  const m = text.match(/[Φφ]?(\d+(?:\.\d+)?)\s*mm?\s*[×xX]\s*(\d+(?:\.\d+)?)\s*mm?\s*[×xX]\s*(\d+(?:\.\d+)?)\s*mm/i);
  return m ? { w: parseFloat(m[1]), h: parseFloat(m[2]), d: parseFloat(m[3]), unit: 'mm' } : null;
}

function parseWeight(text) {
  const m = text.match(/(?:trọng\s*lượng|khối\s*lượng)\s*(\d+(?:\.\d+)?)\s*(kg|g)/i);
  return m ? { value: parseFloat(m[1]), unit: m[2].toLowerCase() } : null;
}

function parseManaged(text) {
  return /quản\s*lý|managed|Layer\s*[23]|VLAN|SNMP/i.test(text) ? true : null;
}

function parsePoeBudget(text) {
  const m = text.match(/PoE\s*(?:budget|ngân\s*sách)?\s*[:≤]?\s*(\d+(?:\.\d+)?)\s*W/i);
  return m ? { value: parseFloat(m[1]), unit: 'W' } : null;
}

function parseOperatingTemp(text) {
  const m = text.match(/(?:nhiệt\s*độ\s*hoạt\s*động|môi\s*trường\s*làm\s*việc)\s*(?:từ\s*)?([-]?\d+)\s*[º°]\s*C\s*[~–-]\s*([-]?\d+)\s*[º°]\s*C/i);
  return m ? { min: parseInt(m[1]), max: parseInt(m[2]), unit: '°C' } : null;
}

// ── Main parser ──────────────────────────────────────────────

function parseSpecs(text) {
  const structured = {};

  function set(key, val) { if (val != null) structured[key] = val; }

  set('resolution', parseResolution(text));
  set('lens', parseLens(text));
  set('ir_range', parseIRRange(text));
  set('protection', parseProtection(text));
  set('hdr', parseWDR(text));
  set('sensor', parseSensor(text));
  set('compression', parseCompression(text));
  set('storage', parseStorage(text));
  set('audio', parseAudio(text));
  set('ai_features', parseAIFeatures(text));

  const power = parsePower(text);
  if (power) {
    if (power.power) set('power', power.power);
    if (power.poe) set('poe', true);
  }

  set('power_consumption', parsePowerConsumption(text));
  set('wifi', parseWifi(text));
  set('ports', parseEthernetPorts(text));
  set('managed', parseManaged(text));
  set('poe_budget', parsePoeBudget(text));
  set('dimensions', parseDimensions(text));
  set('weight', parseWeight(text));
  set('operating_temp', parseOperatingTemp(text));

  return structured;
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('[parse-structured-specs] Connecting to MongoDB...');
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db();
  const products = db.collection('products');

  // Count products with specs.raw
  const total = await products.countDocuments({
    'specs.raw': { $exists: true, $ne: '' }
  });
  console.log(`[parse-structured-specs] Found ${total} products with specs.raw`);

  if (total === 0) {
    console.log('[parse-structured-specs] Nothing to do.');
    await client.close();
    return;
  }

  // Process in batches
  let cursor = products.find(
    { 'specs.raw': { $exists: true, $ne: '' } },
    { projection: { _id: 1, code: 1, specs: 1, brand: 1, group: 1 } }
  );

  let batchOps = [];
  let processed = 0;
  let parsed = 0;

  for await (const doc of cursor) {
    const raw = doc.specs?.raw;
    if (!raw || !raw.trim()) continue;

    const structured = parseSpecs(raw);
    if (Object.keys(structured).length === 0) {
      processed++;
      continue;
    }

    parsed++;
    batchOps.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            ...Object.entries(structured).reduce((acc, [k, v]) => {
              acc[`specs.${k}`] = v;
              return acc;
            }, {}),
            specs_updated_at: new Date()
          }
        }
      }
    });

    processed++;

    if (batchOps.length >= BATCH_SIZE) {
      const result = await products.bulkWrite(batchOps);
      console.log(`  Batch: ${processed}/${total} (${parsed} parsed) ... upserted=${result.nUpserted} modified=${result.nModified}`);
      batchOps = [];
    }
  }

  // Final batch
  if (batchOps.length) {
    const result = await products.bulkWrite(batchOps);
    console.log(`  Final batch: ${processed}/${total} (${parsed} parsed) ... upserted=${result.nUpserted} modified=${result.nModified}`);
  }

  console.log(`\n[DONE] Processed ${processed} products, ${parsed} with parsed specs.`);
  await client.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
