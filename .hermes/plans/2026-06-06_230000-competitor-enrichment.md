# Competitor Enrichment — Ảnh + Giá + Specs từ creta.vn & vuhoangtelecom.vn

> **For Hermes:** Load banggia skill, then execute task-by-task. Plan mode only — confirm with user before executing.

**Goal:** Enrich BangGia product database with images, prices, and specs from competitor sites (creta.vn, vuhoangtelecom.vn) to fill data gaps: only 10% products have images, 40% have prices.

**Architecture:** Browser-based scraping via Hermes browser tools → extract data (image URL, price, specs) from search results and product detail pages → match by model code (code/SKU) → batch update MongoDB via PATCH API.

**Tech Stack:** Browser automation (browser_navigate/type/press/snapshot/console), Python batch processing (execute_code), MongoDB (backend API), existing BangGia admin infrastructure.

---

## Current State (2026-06-06)

| Metric | Value |
|--------|-------|
| Total products | 4,198 (3,202 ACTIVE, 996 PENDING_MAP) |
| Brands | DAHUA, EZVIZ, HIKVISION, IMOU, KBVISION, NETIS, RUIJIE, TP-LINK |
| Has images | 10% |
| Has prices | 40% |
| Has specs.raw | 38% |
| Has specs structured | 34% |

### Competitor Site Analysis

**creta.vn** (Nuxt SPA):
- URL: `/products/{slug}`
- Data: thumbnail image, product name, price, short description
- Search: client-side, type in search box
- Products: mainly accessories (nguồn adapter, thẻ nhớ, cáp, balun)
- Has brand tags: DAHUA, HIKVISION, KBVISION, IMOU, EZVIZ, UNV
- No cameras visible on site

**vuhoangtelecom.vn** (e-commerce):
- URL: `/{slug}.html`
- Data: full product image, SKU/mã SP, brand, current price (VAT included), original price, discount %, detailed specs (bullet points)
- Search: server-side, URL: `/?tu-khoa=xxx`
- Search results page already has rich data (image, name, price, specs summary)
- Product detail has even more: full specs section, breadcrumb category

---

## Phase 1: Match Strategy & Discovery

### Task 1.1: Sample match test — vuhoangtelecom

**Objective:** Test match rate by searching 20 sample products (across brands) on vuhoangtelecom, extracting image + price + specs from search results.

**Steps:**
1. Query DB for 20 products without images, diverse brands (5 DAHUA, 5 HIKVISION, 3 KBVISION, 3 IMOU, 2 EZVIZ, 2 RUIJIE)
2. For each product, search `code` on vuhoangtelecom (`https://vuhoangtelecom.vn/?tu-khoa={code}`)
3. From search results page, parse: product name, SKU, price, image URL, specs summary
4. Record match results: exact match / fuzzy match / no match
5. Output match rate report

**Validation:** Match rate > 30% → viable for batch. < 15% → reconsider approach.

### Task 1.2: Sample match test — creta.vn

**Objective:** Same as 1.1 but for creta.vn, focusing on accessories (nguồn, thẻ nhớ, cáp).

**Steps:**
1. Query DB for products likely on creta.vn (brands that sell accessories: DAHUA nguồn, HIKVISION thẻ nhớ, etc.)
2. For each, navigate to creta.vn, type name/code in search box, press Enter
3. Parse search results page for image + price
4. Record match rate

### Task 1.3: Product detail page data extraction — vuhoangtelecom

**Objective:** Document the full data extraction schema for a vuhoangtelecom product detail page.

**Steps:**
1. Navigate to `https://vuhoangtelecom.vn/camera-ip-starlight-4-0mp-dahua-dh-ipc-hfw2431sp-s-s2.html` (known good page)
2. Extract via browser_console all data fields:
   - Main image URL (src attribute)
   - Product name (h1 heading)
   - SKU / Mã SP
   - Brand
   - Current price (format: "1.300.000 đ")
   - Original price (format: "3.040.000 đ")
   - Discount percentage
   - Short specs (bullet points above description)
   - Full specs (Thông số kỹ thuật section)
   - Breadcrumb/category path
3. Create a reference document: `docs/vuhoangtelecom-data-schema.md`

### Task 1.4: Product detail page data extraction — creta.vn

**Objective:** Same as 1.3 but for creta.vn product detail page.

**Steps:**
1. Navigate to `https://creta.vn/products/nguon-adapter-dahua-dh-pfm320-020en-12v-2a` (known good page)
2. Extract: image URL, name, price, description tab content
3. Create: `docs/creta-data-schema.md`

---

## Phase 2: Batch Scraping Pipeline

### Task 2.1: Build vuhoangtelecom search + extract script

**Objective:** Python script (execute_code) that takes a list of product codes, searches each on vuhoangtelecom, extracts data from search results page, outputs JSON.

**Script:** `backend/scripts/enrich-vuhoangtelecom.mjs` (or Python via execute_code)

**Logic:**
1. Read product list (code + name + brand) from JSON file
2. For each product:
   a. Navigate to `https://vuhoangtelecom.vn/?tu-khoa={encodeURIComponent(code)}`
   b. Wait for results
   c. Parse search result cards (image, name, price, SKU, specs)
   d. Determine best match: compare SKU with our code
   e. If match found, navigate to detail page for full specs
   f. Extract additional data from detail page
3. Output: `{ code, source_url, image_url, price_current, price_original, specs_text, matched_sku }`

**Rate limiting:** 1 request per 3 seconds to avoid blocking.

### Task 2.2: Build creta.vn search + extract script

**Objective:** Same as 2.1 but for creta.vn, using browser interactions (type in search box, press Enter).

**Pitfall:** creta.vn is a Nuxt SPA — search is client-side. Must use browser_type + browser_press + browser_snapshot sequence.

### Task 2.3: Build DB update pipeline

**Objective:** Take scraped JSON, match to existing products, update via PATCH API.

**Script:** `backend/scripts/apply-enrichment.mjs`

**Logic:**
1. Load scraped JSON
2. For each entry, find matching product in DB (by code, fallback fuzzy match on name)
3. If match confidence > threshold:
   - Update `images` (append new image URL if not duplicate)
   - Update `prices` (set L6 = scraped price if not already set)
   - Update `specs.raw` (set if empty, append if new source)
   - Update `specs_source` (append source URL)
   - Set `specs_updated_at`
4. If no match or low confidence → log to review file
5. Commit changes via `PATCH /products/:code`

**Validation:** Run on 20 products first, verify manually, then scale.

---

## Phase 3: Image Download & Serve

### Task 3.1: Download images locally

**Objective:** Download scraped image URLs to `backend/public/uploads/products/external/` so we don't hotlink competitor images.

**Script:** `backend/scripts/download-enrichment-images.mjs`

**Logic:**
1. Query all products with external image URLs (non-`/admin/uploads/` paths)
2. Download each image via HTTP GET
3. Save to `backend/public/uploads/products/external/{brand}/{code}_{n}.{ext}`
4. Update product.images to use local path `/admin/uploads/products/external/...`
5. Keep original image URL in `specs_source` for attribution

### Task 3.2: Add image source attribution

**Objective:** Track where each image came from.

**DB update:** When adding image from competitor, store metadata:
```js
images: [...existing, new_url],
image_sources: [...existing, { url: new_url, source: 'vuhoangtelecom.vn', fetched_at: ISODate }]
```

---

## Phase 4: Specs Enrichment (Structured)

### Task 4.1: Parse vuhoangtelecom specs to structured fields

**Objective:** vuhoangtelecom detail pages have specs in bullet-point format. Parse them into structured fields (same schema as catalog import).

**Approach:** Reuse existing structured specs parser (`backend/scripts/parse-structured-specs.mjs`) but feed it vuhoangtelecom specs text instead of catalog specs.raw.

### Task 4.2: Fill missing specs for PENDING_MAP products

**Objective:** Many PENDING_MAP products lack specs. Use vuhoangtelecom specs to fill these gaps.

**Priority:** Products with status PENDING_MAP that have NO specs.raw at all (~368 products).

---

## Phase 5: Admin UI Updates

### Task 5.1: Add "enrich" button to product detail page

**Objective:** Let admin manually trigger enrichment for a single product.

**UI:** Button "Tìm trên VHT" / "Tìm trên Creta" that:
1. Searches the competitor site for this product's code
2. Shows scraped data in a modal
3. Admin can accept/reject each field (image, price, specs)
4. On accept → PATCH API to save

### Task 5.2: Add enrichment source filter to product list

**Objective:** Filter products by enrichment status.

**Filters:**
- "Có ảnh" / "Thiếu ảnh"
- "Có giá" / "Thiếu giá"
- "Đã enrich từ VHT" / "Đã enrich từ Creta"
- "Chưa enrich"

---

## Phase 6: Price Completeness

### Task 6.1: Map competitor prices to BangGia price levels

**Objective:** Decide which price level scraped prices go to.

**Proposal:**
- vuhoangtelecom "Giá website" (original) → `prices.L6` (giá tham khảo)
- vuhoangtelecom "Giá hiện tại" (discounted) → `prices.L5` (giá thị trường)
- creta.vn price → `prices.L6`

→ **Needs user decision.** Present options before implementing.

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `docs/vuhoangtelecom-data-schema.md` | Reference: data fields available on VHT |
| `docs/creta-data-schema.md` | Reference: data fields available on Creta |
| `docs/competitor-enrichment-strategy.md` | Strategy doc: match approach, rate limits, attribution |
| `backend/scripts/enrich-vuhoangtelecom.mjs` | Node.js scraper for VHT (or Python via execute_code) |
| `backend/scripts/enrich-creta.mjs` | Node.js scraper for Creta |
| `backend/scripts/apply-enrichment.mjs` | DB update pipeline |
| `backend/scripts/download-enrichment-images.mjs` | Image downloader |
| `backend/src/models/Product.js` | Add `image_sources: [{url, source, fetched_at}]` field |
| `backend/src/routes/products.js` | Whitelist `image_sources` in PATCH allowed fields |
| `admin/app/products/[code]/page.tsx` | Add "Enrich" button + source attribution badges |

---

## Risks & Open Questions

1. **Rate limiting / blocking**: vuhoangtelecom and creta.vn may block repeated automated requests. Mitigation: 3s delay, rotate user-agent, limit batch size.
2. **Match accuracy**: Model code variations (DH-IPC-HFW2431S vs DH-IPC-HFW2431SP-S-S2) may cause false matches. Need fuzzy matching with confidence threshold.
3. **Image hotlinking**: Downloading images to local storage is essential — don't hotlink competitor images.
4. **Legal / terms of service**: Scraping competitor sites may violate their ToS. User should confirm this is acceptable.
5. **Data freshness**: Prices change. Need periodic re-enrichment (cron job?).
6. **creta.vn limited product range**: If creta.vn truly has no cameras, it's only useful for accessories. Verify this assumption.

---

## Validation Strategy

After each phase:
1. Manual spot-check: open 5 enriched products in admin, verify images load, prices look correct
2. Automated: run `GET /products?hasImages=true&hasPrices=true` count before/after
3. Backfill rate: target 50%+ products with images, 70%+ with prices after Phase 1-2

## Execution Order

```
Phase 1 (Discovery) → user review match rates → decide which site is primary
Phase 2 (Pipeline)  → scrape 100 products → user review quality → scale to all
Phase 3 (Images)    → download + serve locally
Phase 4 (Specs)     → parse structured specs from VHT
Phase 5 (Admin UI)  → manual enrichment tools
Phase 6 (Prices)    → after user decides price level mapping
```
