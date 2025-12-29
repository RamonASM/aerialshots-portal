'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  QrCode,
  Download,
  Copy,
  Check,
  Loader2,
  Palette,
  Link2,
} from 'lucide-react'

interface QRCodeStyle {
  foreground: string
  background: string
  size: number
}

interface QRCodeGeneratorProps {
  defaultUrl?: string
  defaultTitle?: string
  qrType?: 'listing' | 'portfolio' | 'contact' | 'review' | 'social' | 'custom'
  agentId?: string
  listingId?: string
  onGenerated?: (qrCode: GeneratedQRCode) => void
}

interface GeneratedQRCode {
  id: string
  code: string
  target_url: string
  dataUrl: string
}

export function QRCodeGenerator({
  defaultUrl = '',
  defaultTitle = '',
  qrType = 'custom',
  agentId,
  listingId,
  onGenerated,
}: QRCodeGeneratorProps) {
  const [url, setUrl] = useState(defaultUrl)
  const [title, setTitle] = useState(defaultTitle)
  const [style, setStyle] = useState<QRCodeStyle>({
    foreground: '#000000',
    background: '#ffffff',
    size: 256,
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQR, setGeneratedQR] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generateQRCode = useCallback(async () => {
    if (!url) return

    setIsGenerating(true)

    try {
      const response = await fetch('/api/marketing/qr-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_url: url,
          title,
          qr_type: qrType,
          agent_id: agentId,
          listing_id: listingId,
          style,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate QR code')
      }

      const data = await response.json()
      setGeneratedQR(data.dataUrl)

      if (onGenerated) {
        onGenerated(data)
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [url, title, qrType, agentId, listingId, style, onGenerated])

  const downloadQRCode = useCallback(() => {
    if (!generatedQR) return

    const link = document.createElement('a')
    link.href = generatedQR
    link.download = `qr-code-${title || 'download'}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [generatedQR, title])

  const copyToClipboard = useCallback(async () => {
    if (!generatedQR) return

    try {
      // Convert data URL to blob
      const response = await fetch(generatedQR)
      const blob = await response.blob()

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])

      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: copy data URL
      await navigator.clipboard.writeText(generatedQR)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [generatedQR])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Target URL *</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 123 Main St Listing"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select
                value={style.size.toString()}
                onValueChange={(value) =>
                  setStyle((s) => ({ ...s, size: parseInt(value) }))
                }
              >
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="128">Small (128px)</SelectItem>
                  <SelectItem value="256">Medium (256px)</SelectItem>
                  <SelectItem value="512">Large (512px)</SelectItem>
                  <SelectItem value="1024">Extra Large (1024px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="foreground" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  QR Color
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="foreground"
                    type="color"
                    value={style.foreground}
                    onChange={(e) =>
                      setStyle((s) => ({ ...s, foreground: e.target.value }))
                    }
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={style.foreground}
                    onChange={(e) =>
                      setStyle((s) => ({ ...s, foreground: e.target.value }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="background">Background</Label>
                <div className="flex gap-2">
                  <Input
                    id="background"
                    type="color"
                    value={style.background}
                    onChange={(e) =>
                      setStyle((s) => ({ ...s, background: e.target.value }))
                    }
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={style.background}
                    onChange={(e) =>
                      setStyle((s) => ({ ...s, background: e.target.value }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={generateQRCode}
              disabled={!url || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Generate QR Code
                </>
              )}
            </Button>
          </div>

          {/* Preview */}
          <div className="flex flex-col items-center justify-center p-6 bg-muted/50 rounded-lg min-h-[300px]">
            {generatedQR ? (
              <div className="space-y-4 text-center">
                <div
                  className="inline-block p-4 bg-white rounded-lg shadow-sm"
                  style={{ backgroundColor: style.background }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={generatedQR}
                    alt="Generated QR Code"
                    className="max-w-full"
                    style={{ width: Math.min(style.size, 256) }}
                  />
                </div>

                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={downloadQRCode}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <QrCode className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Enter a URL and click Generate to create your QR code</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
