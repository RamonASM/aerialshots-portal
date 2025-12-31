'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Save,
  Eye,
  Settings,
  Layers,
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Plus,
  RefreshCw,
  Undo,
  Redo,
  Play,
  Maximize2,
  Minimize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Variable,
  Palette,
  Move,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Layer types
type LayerType = 'text' | 'image' | 'shape' | 'container'

interface Layer {
  id: string
  type: LayerType
  name: string
  visible: boolean
  locked: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  rotation: number
  opacity: number
  zIndex: number
  content: {
    // Text
    text?: string
    fontFamily?: string
    fontSize?: number
    fontWeight?: number
    fontStyle?: 'normal' | 'italic'
    textAlign?: 'left' | 'center' | 'right'
    color?: string
    // Image
    url?: string
    fit?: 'cover' | 'contain' | 'fill'
    // Shape
    shape?: 'rectangle' | 'circle' | 'rounded'
    fill?: string
    stroke?: string
    strokeWidth?: number
    borderRadius?: number
    // Variable binding
    variable?: string
  }
}

interface TemplateCanvas {
  width: number
  height: number
  background: string
}

interface RenderTemplate {
  id: string
  slug: string
  name: string
  description?: string
  category: string
  version: number
  status: 'draft' | 'active' | 'archived'
  canvas: TemplateCanvas
  layers: Layer[]
  variables: Array<{
    name: string
    type: 'text' | 'number' | 'image' | 'color'
    defaultValue?: string
    source?: string
    path?: string
  }>
  is_system: boolean
  created_at: string
  updated_at: string
}

// Default fonts available
const FONT_OPTIONS = [
  'Inter',
  'Playfair Display',
  'Montserrat',
  'Roboto',
  'Poppins',
  'Open Sans',
  'Lato',
  'Oswald',
  'Raleway',
  'Merriweather',
]

export default function TemplateEditorPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.templateId as string

  const [template, setTemplate] = useState<RenderTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [showVariablesDialog, setShowVariablesDialog] = useState(false)

  const selectedLayer = template?.layers.find(l => l.id === selectedLayerId)

  const fetchTemplate = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/v1/render/template/${templateId}`, {
        headers: { 'X-ASM-Secret': 'internal-admin' },
      })
      if (!res.ok) throw new Error('Failed to fetch template')
      const data = await res.json()
      setTemplate(data.template)
    } catch (error) {
      console.error('Error fetching template:', error)
      toast.error('Failed to load template')
    } finally {
      setLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  const handleSave = async () => {
    if (!template) return

    try {
      setSaving(true)
      const res = await fetch(`/api/v1/render/template/${templateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-ASM-Secret': 'internal-admin',
        },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          canvas: template.canvas,
          layers: template.layers,
          variables: template.variables,
        }),
      })

      if (!res.ok) throw new Error('Failed to save')
      toast.success('Template saved')
      fetchTemplate()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const addLayer = (type: LayerType) => {
    if (!template) return

    const id = `layer-${Date.now()}`
    const newLayer: Layer = {
      id,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${template.layers.length + 1}`,
      visible: true,
      locked: false,
      position: { x: 100, y: 100 },
      size: {
        width: type === 'text' ? 200 : 150,
        height: type === 'text' ? 50 : 150,
      },
      rotation: 0,
      opacity: 1,
      zIndex: template.layers.length,
      content: type === 'text'
        ? {
            text: 'New Text',
            fontFamily: 'Inter',
            fontSize: 24,
            fontWeight: 400,
            textAlign: 'left',
            color: '#000000',
          }
        : type === 'image'
          ? {
              url: '',
              fit: 'cover',
            }
          : {
              shape: 'rectangle',
              fill: '#e5e5e5',
              borderRadius: 0,
            },
    }

    setTemplate({
      ...template,
      layers: [...template.layers, newLayer],
    })
    setSelectedLayerId(id)
  }

  const updateLayer = (layerId: string, updates: Partial<Layer>) => {
    if (!template) return

    setTemplate({
      ...template,
      layers: template.layers.map(l =>
        l.id === layerId ? { ...l, ...updates } : l
      ),
    })
  }

  const updateLayerContent = (layerId: string, contentUpdates: Partial<Layer['content']>) => {
    if (!template) return

    setTemplate({
      ...template,
      layers: template.layers.map(l =>
        l.id === layerId ? { ...l, content: { ...l.content, ...contentUpdates } } : l
      ),
    })
  }

  const deleteLayer = (layerId: string) => {
    if (!template) return

    setTemplate({
      ...template,
      layers: template.layers.filter(l => l.id !== layerId),
    })
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null)
    }
  }

  const duplicateLayer = (layerId: string) => {
    if (!template) return

    const layer = template.layers.find(l => l.id === layerId)
    if (!layer) return

    const newLayer: Layer = {
      ...layer,
      id: `layer-${Date.now()}`,
      name: `${layer.name} (Copy)`,
      position: {
        x: layer.position.x + 20,
        y: layer.position.y + 20,
      },
      zIndex: template.layers.length,
    }

    setTemplate({
      ...template,
      layers: [...template.layers, newLayer],
    })
    setSelectedLayerId(newLayer.id)
  }

  const moveLayer = (layerId: string, direction: 'up' | 'down') => {
    if (!template) return

    const layers = [...template.layers]
    const index = layers.findIndex(l => l.id === layerId)
    if (index === -1) return

    if (direction === 'up' && index < layers.length - 1) {
      [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]]
    } else if (direction === 'down' && index > 0) {
      [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]]
    }

    // Update zIndex values
    layers.forEach((l, i) => { l.zIndex = i })

    setTemplate({ ...template, layers })
  }

  const updateCanvas = (updates: Partial<TemplateCanvas>) => {
    if (!template) return
    setTemplate({
      ...template,
      canvas: { ...template.canvas, ...updates },
    })
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p className="text-neutral-500">Template not found</p>
        <Link href="/admin/render-templates">
          <Button variant="link" className="mt-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to templates
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-4">
            <Link href="/admin/render-templates">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-neutral-900 dark:text-white">
                {template.name}
              </h1>
              <p className="text-xs text-neutral-500">{template.slug}</p>
            </div>
            <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
              {template.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border bg-neutral-50 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom(Math.max(25, zoom - 25))}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <span className="min-w-[3rem] text-center text-sm">{zoom}%</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom(Math.min(200, zoom + 25))}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={previewMode ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  <Eye className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preview</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowVariablesDialog(true)}
                >
                  <Variable className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Variables</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6" />

            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Layers */}
          <aside className="w-64 flex-shrink-0 overflow-y-auto border-r bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-neutral-900 dark:text-white">Layers</h2>
                <div className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => addLayer('text')}>
                        <Type className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add Text</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => addLayer('image')}>
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add Image</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => addLayer('shape')}>
                        <Square className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add Shape</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Layer List */}
              <div className="space-y-1">
                {[...template.layers].reverse().map((layer, index) => (
                  <div
                    key={layer.id}
                    className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${
                      selectedLayerId === layer.id
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                    onClick={() => setSelectedLayerId(layer.id)}
                  >
                    <div className="flex-shrink-0">
                      {layer.type === 'text' && <Type className="h-4 w-4 text-neutral-500" />}
                      {layer.type === 'image' && <ImageIcon className="h-4 w-4 text-neutral-500" />}
                      {layer.type === 'shape' && <Square className="h-4 w-4 text-neutral-500" />}
                    </div>
                    <span className="flex-1 truncate text-sm">{layer.name}</span>
                    <div className="hidden gap-0.5 group-hover:flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'up') }}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'down') }}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {template.layers.length === 0 && (
                <p className="py-8 text-center text-sm text-neutral-400">
                  No layers yet. Add a text, image, or shape to get started.
                </p>
              )}
            </div>
          </aside>

          {/* Canvas */}
          <main className="flex-1 overflow-auto bg-neutral-100 p-8 dark:bg-neutral-950">
            <div
              className="relative mx-auto shadow-lg"
              style={{
                width: template.canvas.width * (zoom / 100),
                height: template.canvas.height * (zoom / 100),
                backgroundColor: template.canvas.background,
                transform: `scale(1)`,
                transformOrigin: 'top left',
              }}
            >
              {/* Render Layers */}
              {template.layers.map((layer) => (
                <div
                  key={layer.id}
                  className={`absolute cursor-move ${
                    selectedLayerId === layer.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  style={{
                    left: layer.position.x * (zoom / 100),
                    top: layer.position.y * (zoom / 100),
                    width: layer.size.width * (zoom / 100),
                    height: layer.size.height * (zoom / 100),
                    opacity: layer.opacity,
                    transform: `rotate(${layer.rotation}deg)`,
                    zIndex: layer.zIndex,
                    display: layer.visible ? 'block' : 'none',
                  }}
                  onClick={() => setSelectedLayerId(layer.id)}
                >
                  {layer.type === 'text' && (
                    <div
                      style={{
                        fontFamily: layer.content.fontFamily,
                        fontSize: (layer.content.fontSize || 16) * (zoom / 100),
                        fontWeight: layer.content.fontWeight,
                        fontStyle: layer.content.fontStyle,
                        textAlign: layer.content.textAlign,
                        color: layer.content.color,
                        width: '100%',
                        height: '100%',
                      }}
                    >
                      {layer.content.text}
                    </div>
                  )}
                  {layer.type === 'image' && layer.content.url && (
                    <img
                      src={layer.content.url}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: layer.content.fit,
                      }}
                    />
                  )}
                  {layer.type === 'image' && !layer.content.url && (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-200 dark:bg-neutral-700">
                      <ImageIcon className="h-8 w-8 text-neutral-400" />
                    </div>
                  )}
                  {layer.type === 'shape' && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: layer.content.fill,
                        borderRadius: layer.content.shape === 'circle'
                          ? '50%'
                          : layer.content.borderRadius,
                        border: layer.content.stroke
                          ? `${layer.content.strokeWidth || 1}px solid ${layer.content.stroke}`
                          : undefined,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </main>

          {/* Right Panel - Properties */}
          <aside className="w-72 flex-shrink-0 overflow-y-auto border-l bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <Tabs defaultValue="layer" className="h-full">
              <TabsList className="w-full justify-start rounded-none border-b px-4">
                <TabsTrigger value="layer">Layer</TabsTrigger>
                <TabsTrigger value="canvas">Canvas</TabsTrigger>
              </TabsList>

              <TabsContent value="layer" className="p-4">
                {selectedLayer ? (
                  <div className="space-y-6">
                    {/* Layer Info */}
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={selectedLayer.name}
                        onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })}
                      />
                    </div>

                    {/* Position & Size */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Move className="h-4 w-4" />
                        Position & Size
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-neutral-500">X</Label>
                          <Input
                            type="number"
                            value={selectedLayer.position.x}
                            onChange={(e) => updateLayer(selectedLayer.id, {
                              position: { ...selectedLayer.position, x: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-neutral-500">Y</Label>
                          <Input
                            type="number"
                            value={selectedLayer.position.y}
                            onChange={(e) => updateLayer(selectedLayer.id, {
                              position: { ...selectedLayer.position, y: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-neutral-500">Width</Label>
                          <Input
                            type="number"
                            value={selectedLayer.size.width}
                            onChange={(e) => updateLayer(selectedLayer.id, {
                              size: { ...selectedLayer.size, width: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-neutral-500">Height</Label>
                          <Input
                            type="number"
                            value={selectedLayer.size.height}
                            onChange={(e) => updateLayer(selectedLayer.id, {
                              size: { ...selectedLayer.size, height: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Opacity */}
                    <div className="space-y-2">
                      <Label>Opacity</Label>
                      <Slider
                        value={[selectedLayer.opacity * 100]}
                        onValueChange={([v]) => updateLayer(selectedLayer.id, { opacity: v / 100 })}
                        max={100}
                        step={1}
                      />
                    </div>

                    {/* Text Properties */}
                    {selectedLayer.type === 'text' && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <Label className="flex items-center gap-2">
                            <Type className="h-4 w-4" />
                            Text Properties
                          </Label>

                          <div>
                            <Label className="text-xs text-neutral-500">Content</Label>
                            <Input
                              value={selectedLayer.content.text}
                              onChange={(e) => updateLayerContent(selectedLayer.id, { text: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-neutral-500">Font</Label>
                            <Select
                              value={selectedLayer.content.fontFamily}
                              onValueChange={(v) => updateLayerContent(selectedLayer.id, { fontFamily: v })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FONT_OPTIONS.map(font => (
                                  <SelectItem key={font} value={font}>{font}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-neutral-500">Size</Label>
                              <Input
                                type="number"
                                value={selectedLayer.content.fontSize}
                                onChange={(e) => updateLayerContent(selectedLayer.id, { fontSize: parseInt(e.target.value) || 16 })}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-neutral-500">Weight</Label>
                              <Select
                                value={String(selectedLayer.content.fontWeight)}
                                onValueChange={(v) => updateLayerContent(selectedLayer.id, { fontWeight: parseInt(v) })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="300">Light</SelectItem>
                                  <SelectItem value="400">Regular</SelectItem>
                                  <SelectItem value="500">Medium</SelectItem>
                                  <SelectItem value="600">Semibold</SelectItem>
                                  <SelectItem value="700">Bold</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs text-neutral-500">Align</Label>
                            <div className="flex gap-1">
                              {['left', 'center', 'right'].map(align => (
                                <Button
                                  key={align}
                                  variant={selectedLayer.content.textAlign === align ? 'secondary' : 'ghost'}
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateLayerContent(selectedLayer.id, { textAlign: align as 'left' | 'center' | 'right' })}
                                >
                                  {align === 'left' && <AlignLeft className="h-4 w-4" />}
                                  {align === 'center' && <AlignCenter className="h-4 w-4" />}
                                  {align === 'right' && <AlignRight className="h-4 w-4" />}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs text-neutral-500">Color</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={selectedLayer.content.color}
                                onChange={(e) => updateLayerContent(selectedLayer.id, { color: e.target.value })}
                                className="h-10 w-14 p-1"
                              />
                              <Input
                                value={selectedLayer.content.color}
                                onChange={(e) => updateLayerContent(selectedLayer.id, { color: e.target.value })}
                                className="flex-1"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Image Properties */}
                    {selectedLayer.type === 'image' && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <Label className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Image Properties
                          </Label>

                          <div>
                            <Label className="text-xs text-neutral-500">Image URL</Label>
                            <Input
                              value={selectedLayer.content.url || ''}
                              onChange={(e) => updateLayerContent(selectedLayer.id, { url: e.target.value })}
                              placeholder="https://..."
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-neutral-500">Fit</Label>
                            <Select
                              value={selectedLayer.content.fit}
                              onValueChange={(v) => updateLayerContent(selectedLayer.id, { fit: v as 'cover' | 'contain' | 'fill' })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cover">Cover</SelectItem>
                                <SelectItem value="contain">Contain</SelectItem>
                                <SelectItem value="fill">Fill</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs text-neutral-500">Variable Binding</Label>
                            <Input
                              value={selectedLayer.content.variable || ''}
                              onChange={(e) => updateLayerContent(selectedLayer.id, { variable: e.target.value })}
                              placeholder="property.heroImage"
                            />
                            <p className="mt-1 text-xs text-neutral-500">
                              Bind to a data variable
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Shape Properties */}
                    {selectedLayer.type === 'shape' && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <Label className="flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            Shape Properties
                          </Label>

                          <div>
                            <Label className="text-xs text-neutral-500">Fill Color</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={selectedLayer.content.fill}
                                onChange={(e) => updateLayerContent(selectedLayer.id, { fill: e.target.value })}
                                className="h-10 w-14 p-1"
                              />
                              <Input
                                value={selectedLayer.content.fill}
                                onChange={(e) => updateLayerContent(selectedLayer.id, { fill: e.target.value })}
                                className="flex-1"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs text-neutral-500">Border Radius</Label>
                            <Slider
                              value={[selectedLayer.content.borderRadius || 0]}
                              onValueChange={([v]) => updateLayerContent(selectedLayer.id, { borderRadius: v })}
                              max={100}
                              step={1}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* Layer Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => duplicateLayer(selectedLayer.id)}
                      >
                        <Copy className="mr-1 h-4 w-4" />
                        Duplicate
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteLayer(selectedLayer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-neutral-500">
                    <Layers className="mx-auto h-12 w-12 opacity-20" />
                    <p className="mt-2">Select a layer to edit its properties</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="canvas" className="p-4">
                <div className="space-y-6">
                  <div>
                    <Label>Template Name</Label>
                    <Input
                      value={template.name}
                      onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Input
                      value={template.description || ''}
                      onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Canvas Settings
                    </Label>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-neutral-500">Width</Label>
                        <Input
                          type="number"
                          value={template.canvas.width}
                          onChange={(e) => updateCanvas({ width: parseInt(e.target.value) || 1080 })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-neutral-500">Height</Label>
                        <Input
                          type="number"
                          value={template.canvas.height}
                          onChange={(e) => updateCanvas({ height: parseInt(e.target.value) || 1080 })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-neutral-500">Background</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={template.canvas.background}
                          onChange={(e) => updateCanvas({ background: e.target.value })}
                          className="h-10 w-14 p-1"
                        />
                        <Input
                          value={template.canvas.background}
                          onChange={(e) => updateCanvas({ background: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    {/* Common Presets */}
                    <div>
                      <Label className="text-xs text-neutral-500">Presets</Label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {[
                          { label: 'Instagram', w: 1080, h: 1080 },
                          { label: 'Story', w: 1080, h: 1920 },
                          { label: 'Facebook', w: 1200, h: 630 },
                          { label: 'Twitter', w: 1200, h: 675 },
                        ].map(preset => (
                          <Button
                            key={preset.label}
                            variant="outline"
                            size="sm"
                            onClick={() => updateCanvas({ width: preset.w, height: preset.h })}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </aside>
        </div>

        {/* Variables Dialog */}
        <Dialog open={showVariablesDialog} onOpenChange={setShowVariablesDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Variable className="h-5 w-5" />
                Template Variables
              </DialogTitle>
              <DialogDescription>
                Define variables that can be bound to layer content
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {template.variables.length === 0 ? (
                <p className="py-4 text-center text-neutral-500">
                  No variables defined yet
                </p>
              ) : (
                template.variables.map((variable, index) => (
                  <div key={index} className="flex items-center gap-2 rounded-lg border p-3">
                    <code className="text-sm font-mono text-blue-600">{'{{'}{variable.name}{'}}'}</code>
                    <Badge variant="secondary">{variable.type}</Badge>
                    {variable.source && (
                      <span className="text-xs text-neutral-500">
                        from {variable.source}.{variable.path}
                      </span>
                    )}
                  </div>
                ))
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setTemplate({
                    ...template,
                    variables: [
                      ...template.variables,
                      { name: 'newVariable', type: 'text', defaultValue: '' },
                    ],
                  })
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Variable
              </Button>
            </div>

            <DialogFooter>
              <Button onClick={() => setShowVariablesDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
