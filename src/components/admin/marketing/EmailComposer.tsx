'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Link,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Eye,
  Code,
  Variable,
  Send,
  Save,
  ChevronDown,
} from 'lucide-react'

interface EmailComposerProps {
  initialSubject?: string
  initialBody?: string
  onSave?: (subject: string, body: string) => Promise<void>
  onSend?: (subject: string, body: string) => Promise<void>
  onPreview?: (subject: string, body: string) => void
  saving?: boolean
  sending?: boolean
}

const VARIABLES = [
  { key: '{{name}}', label: 'Agent Name', description: 'The agent\'s full name' },
  { key: '{{email}}', label: 'Email', description: 'The agent\'s email address' },
  { key: '{{company}}', label: 'Company', description: 'The agent\'s company/brokerage' },
  { key: '{{last_order_date}}', label: 'Last Order Date', description: 'Date of their last order' },
  { key: '{{total_orders}}', label: 'Total Orders', description: 'Number of orders placed' },
]

export function EmailComposer({
  initialSubject = '',
  initialBody = '',
  onSave,
  onSend,
  onPreview,
  saving = false,
  sending = false,
}: EmailComposerProps) {
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [showVariables, setShowVariables] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showHtml, setShowHtml] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  // Execute formatting command
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }, [])

  // Insert variable at cursor
  const insertVariable = useCallback((variable: string) => {
    execCommand('insertText', variable)
    setShowVariables(false)
  }, [execCommand])

  // Handle editor input
  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      setBody(editorRef.current.innerHTML)
    }
  }, [])

  // Personalize preview content
  const getPreviewContent = () => {
    return body
      .replace(/\{\{name\}\}/g, 'John Smith')
      .replace(/\{\{email\}\}/g, 'john@example.com')
      .replace(/\{\{company\}\}/g, 'Smith Realty')
      .replace(/\{\{last_order_date\}\}/g, 'December 15, 2024')
      .replace(/\{\{total_orders\}\}/g, '12')
  }

  return (
    <div className="space-y-4">
      {/* Subject Line */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Subject Line
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter email subject..."
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-neutral-500">
          {subject.length}/50 characters (recommended)
        </p>
      </div>

      {/* Toolbar */}
      <div className="border border-neutral-300 rounded-t-lg bg-neutral-50 p-2 flex flex-wrap items-center gap-1">
        {/* Text formatting */}
        <div className="flex items-center gap-1 pr-2 border-r border-neutral-300">
          <button
            type="button"
            onClick={() => execCommand('bold')}
            className="p-1.5 rounded hover:bg-neutral-200"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('italic')}
            className="p-1.5 rounded hover:bg-neutral-200"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('underline')}
            className="p-1.5 rounded hover:bg-neutral-200"
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 px-2 border-r border-neutral-300">
          <button
            type="button"
            onClick={() => execCommand('justifyLeft')}
            className="p-1.5 rounded hover:bg-neutral-200"
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyCenter')}
            className="p-1.5 rounded hover:bg-neutral-200"
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyRight')}
            className="p-1.5 rounded hover:bg-neutral-200"
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 px-2 border-r border-neutral-300">
          <button
            type="button"
            onClick={() => execCommand('insertUnorderedList')}
            className="p-1.5 rounded hover:bg-neutral-200"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('insertOrderedList')}
            className="p-1.5 rounded hover:bg-neutral-200"
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
        </div>

        {/* Insert */}
        <div className="flex items-center gap-1 px-2 border-r border-neutral-300">
          <button
            type="button"
            onClick={() => {
              const url = prompt('Enter link URL:')
              if (url) execCommand('createLink', url)
            }}
            className="p-1.5 rounded hover:bg-neutral-200"
            title="Insert Link"
          >
            <Link className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const url = prompt('Enter image URL:')
              if (url) execCommand('insertImage', url)
            }}
            className="p-1.5 rounded hover:bg-neutral-200"
            title="Insert Image"
          >
            <Image className="h-4 w-4" />
          </button>
        </div>

        {/* Variables */}
        <div className="relative px-2">
          <button
            type="button"
            onClick={() => setShowVariables(!showVariables)}
            className="flex items-center gap-1 p-1.5 rounded hover:bg-neutral-200"
          >
            <Variable className="h-4 w-4" />
            <span className="text-xs">Variables</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {showVariables && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg border border-neutral-200 shadow-lg z-10">
              <div className="p-2 border-b border-neutral-200">
                <p className="text-xs font-medium text-neutral-500">
                  Insert personalization
                </p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-50"
                  >
                    <p className="text-sm font-medium text-neutral-900">{v.label}</p>
                    <p className="text-xs text-neutral-500">{v.description}</p>
                    <code className="text-xs text-blue-600 bg-blue-50 px-1 rounded mt-1 inline-block">
                      {v.key}
                    </code>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => setShowHtml(!showHtml)}
            className={`p-1.5 rounded ${showHtml ? 'bg-neutral-200' : 'hover:bg-neutral-200'}`}
            title="View HTML"
          >
            <Code className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowPreview(!showPreview)
              onPreview?.(subject, body)
            }}
            className={`p-1.5 rounded ${showPreview ? 'bg-neutral-200' : 'hover:bg-neutral-200'}`}
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div className="border border-t-0 border-neutral-300 rounded-b-lg p-4 bg-neutral-50">
          <div className="max-w-2xl mx-auto bg-white rounded-lg border border-neutral-200 p-6">
            <div className="text-sm text-neutral-500 mb-2">Preview:</div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              {subject || '(No subject)'}
            </h2>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
            />
          </div>
        </div>
      ) : showHtml ? (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full h-64 p-4 border border-t-0 border-neutral-300 rounded-b-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter HTML content..."
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          className="w-full min-h-[300px] p-4 border border-t-0 border-neutral-300 rounded-b-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 prose prose-sm max-w-none"
          onInput={handleEditorInput}
          dangerouslySetInnerHTML={{ __html: body }}
        />
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
        <p className="text-sm text-neutral-500">
          Tip: Use variables like {'{{name}}'} to personalize your emails
        </p>
        <div className="flex items-center gap-2">
          {onSave && (
            <button
              type="button"
              onClick={() => onSave(subject, body)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
          )}
          {onSend && (
            <button
              type="button"
              onClick={() => onSend(subject, body)}
              disabled={sending || !subject || !body}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : 'Send Campaign'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
