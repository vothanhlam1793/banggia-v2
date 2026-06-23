'use client';

import { useState, useEffect } from 'react';
import {
  Modal, Stack, Image, Card, Text, SimpleGrid, Group, Badge, Button,
} from '@mantine/core';
import { IconPackage, IconCopy, IconCheck } from '@tabler/icons-react';
import { fmt, PRICE_LABELS, renderStructuredSpecs } from './lib';

// --- Module-level store ---
let _modalProduct: any = null;
let _modalOpen = false;
let _modalListeners: (() => void)[] = [];

function showLoadingSpinner() {
  let el = document.getElementById('__modal_spinner');
  if (!el) {
    el = document.createElement('div');
    el.id = '__modal_spinner';
    el.innerHTML = `<div style="position:fixed;inset:0;z-index:199;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.25)"><div style="width:36px;height:36px;border:3px solid #dde4ef;border-top-color:#3366ff;border-radius:50%;animation:__mspin .6s linear infinite"></div></div>`;
    document.body.appendChild(el);
    const s = document.createElement('style');
    s.textContent = '@keyframes __mspin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  } else {
    el.style.display = 'flex';
  }
}

function hideLoadingSpinner() {
  const el = document.getElementById('__modal_spinner');
  if (el) el.style.display = 'none';
}

export function openModal(p: any) {
  _modalProduct = p;
  _modalOpen = true;
  showLoadingSpinner();
  _modalListeners.forEach(f => f());
}

export function closeModal() {
  _modalOpen = false;
  hideLoadingSpinner();
  _modalListeners.forEach(f => f());
}

export default function ProductDetailModal() {
  const [, tick] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fn = () => tick(x => x + 1);
    _modalListeners.push(fn);
    return () => { _modalListeners = _modalListeners.filter(f => f !== fn); };
  }, []);

  useEffect(() => {
    if (_modalOpen) hideLoadingSpinner();
  });

  const product = _modalProduct;

  function handleCopy() {
    if (!product?.code) return;
    const url = `https://banggia.besen.vn/${product.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <Modal opened={_modalOpen} onClose={closeModal} title={product?.name} size="lg" centered>
      {product && (
        <Stack gap="md">
          {/* Gallery */}
          {(() => {
            const allImages = (product.images && product.images.length > 0)
              ? product.images
              : product.imageUrl ? [product.imageUrl] : [];

            if (allImages.length === 0) {
              return (
                <div style={{
                  height: 200, borderRadius: 'var(--mantine-radius-md)',
                  background: 'var(--mantine-color-gray-1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconPackage size={64} color="var(--mantine-color-gray-5)" />
                </div>
              );
            }

            return (
              <Stack gap="sm">
                <Image
                  src={allImages[0]}
                  alt={product.name}
                  height={250}
                  fit="contain"
                  radius="md"
                  fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'%3E%3Crect fill='%23f1f3f5' width='400' height='250'/%3E%3Ctext x='200' y='135' text-anchor='middle' fill='%23adb5bd' font-size='48'%3E📦%3C/text%3E%3C/svg%3E"
                  id="main-gallery-img"
                />
                {allImages.length > 1 && (
                  <Group gap="xs" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
                    {allImages.map((url: string, idx: number) => (
                      <Image
                        key={idx}
                        src={url}
                        alt={`${product.name} ${idx + 1}`}
                        w={60}
                        h={60}
                        radius="sm"
                        fit="cover"
                        style={{ cursor: 'pointer', border: idx === 0 ? '2px solid var(--mantine-color-blue-5)' : '2px solid transparent', flexShrink: 0 }}
                        onClick={() => {
                          const main = document.getElementById('main-gallery-img') as HTMLImageElement;
                          if (main) main.src = url;
                          const thumbs = document.querySelectorAll('[data-gallery-thumb]');
                          thumbs.forEach((t, i) => {
                            (t as HTMLElement).style.border = i === idx ? '2px solid var(--mantine-color-blue-5)' : '2px solid transparent';
                          });
                        }}
                        data-gallery-thumb
                        fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect fill='%23f1f3f5' width='60' height='60'/%3E%3Ctext x='30' y='38' text-anchor='middle' fill='%23adb5bd' font-size='20'%3E📷%3C/text%3E%3C/svg%3E"
                      />
                    ))}
                  </Group>
                )}
              </Stack>
            );
          })()}

          {/* Meta info */}
          <Card withBorder>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <div>
                <Text size="xs" c="dimmed">Mã sản phẩm</Text>
                <Text ff="monospace" fw={500}>{product.code}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Hãng</Text>
                <Text fw={500}>{product.brand || '—'}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Nhóm</Text>
                <Text fw={500}>{product.group || '—'}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Danh mục</Text>
                <Text fw={500}>{product.category || '—'}</Text>
              </div>
            </SimpleGrid>
          </Card>

          {/* Prices */}
          {product.prices && Object.keys(product.prices).length > 0 && (
            <Card withBorder>
              <Text fw={600} mb="sm">Bảng giá</Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                {Object.entries(product.prices).map(([level, price]) => (
                  <Group key={level} justify="space-between">
                    <Text size="sm" c="dimmed">
                      {PRICE_LABELS[level] || level}
                    </Text>
                    <Text fw={600} c="blue">{fmt(price as number)}</Text>
                  </Group>
                ))}
              </SimpleGrid>
            </Card>
          )}

          {/* Description */}
          {product.description && (
            <Card withBorder>
              <Text fw={600} mb="xs">Mô tả</Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{product.description}</Text>
            </Card>
          )}

          {/* Structured Specs */}
          {renderStructuredSpecs(product.specs)}

          {/* Campaigns */}
          {product.campaigns && product.campaigns.length > 0 && (
            <Card withBorder>
              <Text fw={600} mb="xs">Chương trình</Text>
              <Group gap={8} wrap="wrap">
                {product.campaigns.map((c: any) => (
                  <div key={c._id || c.name} style={{
                    display: 'inline-flex', flexDirection: 'column', gap: '4px',
                    background: 'var(--mantine-color-orange-0)', borderRadius: '8px',
                    padding: '8px 14px', border: '1px solid var(--mantine-color-orange-2)',
                  }}>
                    <Text fw={600} size="sm" c="orange">{c.name}</Text>
                    {c.targetCustomer && <Text size="xs" c="dimmed">KH: {c.targetCustomer}</Text>}
                    {c.targetMargin != null && <Text size="xs" c="dimmed">Margin: {c.targetMargin}%</Text>}
                    {c.note && <Text size="xs" c="dimmed">{c.note}</Text>}
                  </div>
                ))}
              </Group>
            </Card>
          )}

          {/* Tags */}
          {(product.tags || []).length > 0 && (
            <Group gap={4}>
              {(product.tags || []).map((t: string) => (
                <Badge key={t} variant="light" color={t === 'khuyen-mai' ? 'red' : 'gray'}>{t}</Badge>
              ))}
            </Group>
          )}

          {/* Copy link */}
          <Button
            variant="light"
            color={copied ? 'green' : 'gray'}
            size="sm"
            leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            onClick={handleCopy}
            fullWidth
          >
            {copied ? 'Đã copy link' : 'Sao chép link sản phẩm'}
          </Button>
        </Stack>
      )}
    </Modal>
  );
}
