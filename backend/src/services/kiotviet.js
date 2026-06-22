const KIOTVIET_TOKEN_URL = 'https://id.kiotviet.vn/connect/token';
const KIOTVIET_API_URL = 'https://public.kiotapi.com';

let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) return cachedToken;

  const resp = await fetch(KIOTVIET_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      scopes: 'PublicApi.Access',
      grant_type: 'client_credentials',
      client_id: process.env.KIOTVIET_CLIENT_ID,
      client_secret: process.env.KIOTVIET_CLIENT_SECRET,
    }),
  });

  if (!resp.ok) throw new Error(`KiotViet auth failed: HTTP ${resp.status}`);
  const data = await resp.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 86400) * 1000;
  return cachedToken;
}

async function kiotVietGet(path, params = {}) {
  const token = await getToken();
  const url = new URL(`${KIOTVIET_API_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const resp = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Retailer: process.env.KIOTVIET_RETAILER,
    },
  });

  if (!resp.ok) throw new Error(`KiotViet API error: HTTP ${resp.status} for ${path}`);
  return resp.json();
}

export async function fetchAllProducts() {
  const BATCH = 100;
  let all = [];
  let currentItem = 0;
  let total = null;

  while (true) {
    const data = await kiotVietGet('/products', {
      pageSize: BATCH,
      currentItem,
      includeInventory: 'false',
      includePricebook: 'false',
    });
    if (total === null) total = data.total || 0;
    all = all.concat(data.data || []);
    console.log(`[KiotViet] Fetched ${all.length}/${total} products`);
    if (all.length >= total) break;
    currentItem += BATCH;
  }
  return all;
}

export async function searchProducts(query) {
  if (!query || query.length < 2) return [];
  try {
    const data = await kiotVietGet('/products', {
      name: query,
      pageSize: 10,
      includeInventory: 'false',
      includePricebook: 'false',
    });
    return (data.data || []).map(p => ({
      id: p.id,
      code: p.code || '',
      name: p.name || '',
      basePrice: p.basePrice || 0,
      categoryName: p.categoryName || '',
      unit: p.unit || '',
    }));
  } catch (e) {
    console.error('[KiotViet] Search error:', e.message);
    return [];
  }
}

export async function fetchLatestImportPrices(fromDate = null) {
  const priceMap = new Map();
  const BATCH = 100;
  const CONCURRENCY = 5;
  let currentItem = 0;
  let total = null;
  let processed = 0;
  const MAX_UNIQUE = 500;

  async function fetchDetail(orderId) {
    try {
      const detail = await kiotVietGet(`/purchaseorders/${orderId}`);
      return { id: orderId, detail };
    } catch (e) {
      console.error(`[KiotViet] Error fetching order ${orderId}: ${e.message}`);
      return null;
    }
  }

  const baseParams = {
    pageSize: BATCH,
    currentItem,
    orderBy: 'purchaseDate',
    orderDirection: 'DESC',
  };
  if (fromDate) baseParams.fromPurchaseDate = fromDate;

  while (true) {
    const data = await kiotVietGet('/purchaseorders', {
      ...baseParams,
      currentItem,
    });

    if (total === null) total = data.total || 0;
    const orders = data.data || [];

    if (orders.length === 0) break;

    for (let i = 0; i < orders.length; i += CONCURRENCY) {
      const slice = orders.slice(i, i + CONCURRENCY);
      const results = await Promise.all(slice.map(o => fetchDetail(o.id)));

      for (const result of results) {
        if (!result) continue;
        const items = result.detail.purchaseOrderDetails || [];
        const purchaseDate = result.detail.purchaseDate || new Date().toISOString();
        for (const d of items) {
          const code = d.productCode?.trim();
          if (code && d.price > 0) {
            if (!priceMap.has(code)) priceMap.set(code, []);
            priceMap.get(code).push({ price: d.price, purchaseDate });
          }
          if (priceMap.size >= MAX_UNIQUE) break;
        }
        if (priceMap.size >= MAX_UNIQUE) break;
      }

      if (priceMap.size >= MAX_UNIQUE) break;
      await new Promise(r => setTimeout(r, 200));
    }

    processed += orders.length;
    console.log(`[KiotViet] Processed ${processed}/${total} orders, ${priceMap.size} products with prices`);

    if (processed >= total || priceMap.size >= MAX_UNIQUE || orders.length < BATCH) break;
    currentItem += BATCH;
  }

  return priceMap;
}
