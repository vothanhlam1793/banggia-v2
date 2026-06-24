'use client'

import { useState } from 'react'
import { Button } from '@mantine/core'
import { IconCopy, IconCheck } from '@tabler/icons-react'

export default function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const url = `https://banggia.creta.vn/${code}`
    window.umami?.track('copy-link', { code })
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  return (
    <Button
      variant="light"
      color={copied ? 'green' : 'gray'}
      size="xs"
      leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
      onClick={handleCopy}
      ml="auto"
    >
      {copied ? 'Đã copy' : 'Copy link'}
    </Button>
  )
}
