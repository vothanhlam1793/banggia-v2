'use client';

import { notifications } from '@mantine/notifications';

export function toast(msg: string, type: 'success' | 'error' = 'success') {
  notifications.show({
    message: msg,
    color: type === 'success' ? 'green' : 'red',
    withBorder: true,
    autoClose: 3000,
  });
}

// No more ToastContainer needed — Mantine Notifications provider handles it
export function ToastContainer() {
  return null;
}
