'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  FileText,
  Save,
  RefreshCw,
  Eye,
  Palette,
  Layout,
  Type,
  Image,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
} from 'lucide-react'
import { SkeletonCard } from '@/components/ui/skeleton'

interface InvoiceTemplate {
  id: string
  name: string
  is_default: boolean
  logo_url: string | null
  company_name: string | null
  company_address: string | null
  company_phone: string | null
  company_email: string | null
  company_website: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  font_family: string
  header_text: string | null
  footer_text: string | null
  terms_and_conditions: string | null
  payment_instructions: string | null
  show_logo: boolean
  show_qr_code: boolean
  show_due_date: boolean
  show_payment_link: boolean
  show_line_item_details: boolean
  paper_size: 'letter' | 'a4' | 'legal'
  margin_top: number
  margin_bottom: number
  margin_left: number
  margin_right: number
}

const DEFAULT_TEMPLATE: Omit<InvoiceTemplate, 'id'> = {
  name: 'Default Template',
  is_default: true,
  logo_url: null,
  company_name: 'Aerial Shots Media',
  company_address: null,
  company_phone: null,
  company_email: null,
  company_website: null,
  primary_color: '#000000',
  secondary_color: '#666666',
  accent_color: '#0066cc',
  font_family: 'Inter',
  header_text: null,
  footer_text: 'Thank you for your business!',
  terms_and_conditions: null,
  payment_instructions: 'Payment is due within 30 days of invoice date.',
  show_logo: true,
  show_qr_code: false,
  show_due_date: true,
  show_payment_link: true,
  show_line_item_details: true,
  paper_size: 'letter',
  margin_top: 1,
  margin_bottom: 1,
  margin_left: 0.75,
  margin_right: 0.75,
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times-Roman', label: 'Times New Roman' },
]

const PAPER_OPTIONS = [
  { value: 'letter', label: 'Letter (8.5" x 11")' },
  { value: 'a4', label: 'A4 (210mm x 297mm)' },
  { value: 'legal', label: 'Legal (8.5" x 14")' },
]

export default function InvoiceTemplatePage() {
  const [template, setTemplate] = useState<InvoiceTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['branding', 'colors', 'content', 'layout'])
  )

  const fetchTemplate = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/templates/invoice')
      if (!response.ok) {
        if (response.status === 404) {
          // No template exists, use default
          setTemplate({ id: '', ...DEFAULT_TEMPLATE })
          return
        }
        throw new Error('Failed to fetch template')
      }
      const data = await response.json()
      setTemplate(data.template)
    } catch (err) {
      console.error('Error fetching template:', err)
      setError('Failed to load template')
      setTemplate({ id: '', ...DEFAULT_TEMPLATE })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  const handleSave = async () => {
    if (!template) return

    try {
      setSaving(true)
      setError(null)
      const response = await fetch('/api/admin/templates/invoice', {
        method: template.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      })

      if (!response.ok) throw new Error('Failed to save template')

      const data = await response.json()
      setTemplate(data.template)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Error saving template:', err)
      setError('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = async () => {
    try {
      const response = await fetch('/api/admin/templates/invoice/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      })

      if (!response.ok) throw new Error('Failed to generate preview')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      console.error('Error generating preview:', err)
      setError('Failed to generate preview')
    }
  }

  const updateTemplate = (updates: Partial<InvoiceTemplate>) => {
    setTemplate((prev) => (prev ? { ...prev, ...updates } : null))
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-400">Failed to load template</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                Invoice Template
              </h1>
              <p className="text-sm text-neutral-500">
                Customize your invoice branding and layout
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePreview}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        {/* Editor Column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Branding Section */}
          <CollapsibleSection
            title="Branding"
            icon={<Image className="h-4 w-4" />}
            isExpanded={expandedSections.has('branding')}
            onToggle={() => toggleSection('branding')}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Company Name
                </label>
                <input
                  type="text"
                  value={template.company_name || ''}
                  onChange={(e) => updateTemplate({ company_name: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="Your Company Name"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Logo URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={template.logo_url || ''}
                    onChange={(e) => updateTemplate({ logo_url: e.target.value })}
                    className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                    placeholder="https://example.com/logo.png"
                  />
                  <button className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400">
                    <Upload className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Company Email
                  </label>
                  <input
                    type="email"
                    value={template.company_email || ''}
                    onChange={(e) => updateTemplate({ company_email: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                    placeholder="billing@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Company Phone
                  </label>
                  <input
                    type="tel"
                    value={template.company_phone || ''}
                    onChange={(e) => updateTemplate({ company_phone: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Company Address
                </label>
                <textarea
                  value={template.company_address || ''}
                  onChange={(e) => updateTemplate({ company_address: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="123 Main St, City, State 12345"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Company Website
                </label>
                <input
                  type="url"
                  value={template.company_website || ''}
                  onChange={(e) => updateTemplate({ company_website: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Colors Section */}
          <CollapsibleSection
            title="Colors & Typography"
            icon={<Palette className="h-4 w-4" />}
            isExpanded={expandedSections.has('colors')}
            onToggle={() => toggleSection('colors')}
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <ColorPicker
                  label="Primary Color"
                  value={template.primary_color}
                  onChange={(color) => updateTemplate({ primary_color: color })}
                />
                <ColorPicker
                  label="Secondary Color"
                  value={template.secondary_color}
                  onChange={(color) => updateTemplate({ secondary_color: color })}
                />
                <ColorPicker
                  label="Accent Color"
                  value={template.accent_color}
                  onChange={(color) => updateTemplate({ accent_color: color })}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Font Family
                </label>
                <select
                  value={template.font_family}
                  onChange={(e) => updateTemplate({ font_family: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CollapsibleSection>

          {/* Content Section */}
          <CollapsibleSection
            title="Content"
            icon={<Type className="h-4 w-4" />}
            isExpanded={expandedSections.has('content')}
            onToggle={() => toggleSection('content')}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Header Text
                </label>
                <textarea
                  value={template.header_text || ''}
                  onChange={(e) => updateTemplate({ header_text: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="Optional text at the top of the invoice"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Footer Text
                </label>
                <textarea
                  value={template.footer_text || ''}
                  onChange={(e) => updateTemplate({ footer_text: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="Thank you for your business!"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Payment Instructions
                </label>
                <textarea
                  value={template.payment_instructions || ''}
                  onChange={(e) => updateTemplate({ payment_instructions: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="Payment is due within 30 days of invoice date."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Terms & Conditions
                </label>
                <textarea
                  value={template.terms_and_conditions || ''}
                  onChange={(e) => updateTemplate({ terms_and_conditions: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="Enter your terms and conditions..."
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Layout Section */}
          <CollapsibleSection
            title="Layout & Display Options"
            icon={<Layout className="h-4 w-4" />}
            isExpanded={expandedSections.has('layout')}
            onToggle={() => toggleSection('layout')}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Paper Size
                </label>
                <select
                  value={template.paper_size}
                  onChange={(e) =>
                    updateTemplate({ paper_size: e.target.value as 'letter' | 'a4' | 'legal' })
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                >
                  {PAPER_OPTIONS.map((paper) => (
                    <option key={paper.value} value={paper.value}>
                      {paper.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <MarginInput
                  label="Top"
                  value={template.margin_top}
                  onChange={(v) => updateTemplate({ margin_top: v })}
                />
                <MarginInput
                  label="Bottom"
                  value={template.margin_bottom}
                  onChange={(v) => updateTemplate({ margin_bottom: v })}
                />
                <MarginInput
                  label="Left"
                  value={template.margin_left}
                  onChange={(v) => updateTemplate({ margin_left: v })}
                />
                <MarginInput
                  label="Right"
                  value={template.margin_right}
                  onChange={(v) => updateTemplate({ margin_right: v })}
                />
              </div>

              <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
                <h4 className="text-sm font-medium text-neutral-900 dark:text-white">
                  Display Options
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ToggleOption
                    label="Show Logo"
                    checked={template.show_logo}
                    onChange={(v) => updateTemplate({ show_logo: v })}
                  />
                  <ToggleOption
                    label="Show Due Date"
                    checked={template.show_due_date}
                    onChange={(v) => updateTemplate({ show_due_date: v })}
                  />
                  <ToggleOption
                    label="Show Payment Link"
                    checked={template.show_payment_link}
                    onChange={(v) => updateTemplate({ show_payment_link: v })}
                  />
                  <ToggleOption
                    label="Show Line Item Details"
                    checked={template.show_line_item_details}
                    onChange={(v) => updateTemplate({ show_line_item_details: v })}
                  />
                  <ToggleOption
                    label="Show QR Code"
                    checked={template.show_qr_code}
                    onChange={(v) => updateTemplate({ show_qr_code: v })}
                  />
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Preview Column */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium text-neutral-900 dark:text-white">Preview</h3>
                <button
                  onClick={handlePreview}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </button>
              </div>
              <div
                className="aspect-[8.5/11] rounded-lg bg-white p-4 shadow-lg"
                style={{ transform: 'scale(0.95)' }}
              >
                {/* Mini Preview */}
                <div className="flex justify-between border-b pb-2">
                  <div>
                    {template.logo_url && (
                      <div
                        className="mb-1 h-6 w-16 rounded"
                        style={{ backgroundColor: template.primary_color + '20' }}
                      />
                    )}
                    <p
                      className="text-xs font-semibold"
                      style={{ color: template.primary_color }}
                    >
                      {template.company_name || 'Company Name'}
                    </p>
                    <p className="text-[8px]" style={{ color: template.secondary_color }}>
                      {template.company_email || 'email@example.com'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-sm font-bold"
                      style={{ color: template.primary_color }}
                    >
                      INVOICE
                    </p>
                    <p className="text-[8px]" style={{ color: template.secondary_color }}>
                      INV-2024-00001
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="mb-3">
                    <p className="text-[7px] font-semibold uppercase tracking-wide">
                      Bill To
                    </p>
                    <p className="text-[8px]">Customer Name</p>
                  </div>
                  <div
                    className="mb-2 flex justify-between p-1 text-[7px] text-white"
                    style={{ backgroundColor: template.primary_color }}
                  >
                    <span>Description</span>
                    <span>Total</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between border-b border-neutral-100 py-1 text-[7px]">
                      <span>Photography Package</span>
                      <span>$399.00</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-100 py-1 text-[7px]">
                      <span>Drone Footage</span>
                      <span>$149.00</span>
                    </div>
                  </div>
                  <div className="mt-3 text-right">
                    <div className="flex justify-end gap-4 text-[8px]">
                      <span style={{ color: template.secondary_color }}>Total:</span>
                      <span
                        className="font-semibold"
                        style={{ color: template.accent_color }}
                      >
                        $548.00
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}: {
  title: string
  icon: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-neutral-100 p-2 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {icon}
          </div>
          <span className="font-medium text-neutral-900 dark:text-white">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-neutral-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-neutral-400" />
        )}
      </button>
      {isExpanded && <div className="border-t border-neutral-200 p-4 dark:border-neutral-700">{children}</div>}
    </div>
  )
}

// Color Picker Component
function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-lg border border-neutral-200 dark:border-neutral-700"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-mono uppercase focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
        />
      </div>
    </div>
  )
}

// Margin Input Component
function MarginInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label} (in)
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={0.25}
        min={0}
        max={2}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
      />
    </div>
  )
}

// Toggle Option Component
function ToggleOption({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`h-5 w-9 rounded-full transition-colors ${
            checked ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-600'
          }`}
        />
        <div
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform shadow ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </div>
      <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
    </label>
  )
}
