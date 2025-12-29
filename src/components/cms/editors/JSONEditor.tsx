'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SchemaField {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'text'
  required?: boolean
  placeholder?: string
  description?: string
  items?: SchemaField[] // For array types
  properties?: SchemaField[] // For object types
}

interface JSONEditorProps {
  value: Record<string, unknown>
  onChange?: (value: Record<string, unknown>) => void
  schema?: SchemaField[]
  className?: string
  readOnly?: boolean
}

interface FieldEditorProps {
  field: SchemaField
  value: unknown
  onChange: (value: unknown) => void
  readOnly?: boolean
  depth?: number
}

function FieldEditor({ field, value, onChange, readOnly = false, depth = 0 }: FieldEditorProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2)

  const handleChange = useCallback(
    (newValue: unknown) => {
      if (!readOnly) {
        onChange(newValue)
      }
    },
    [onChange, readOnly]
  )

  const inputClasses = cn(
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-white',
    readOnly && 'cursor-not-allowed opacity-60'
  )

  // Render based on field type
  switch (field.type) {
    case 'string':
      return (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={readOnly}
            className={inputClasses}
          />
          {field.description && (
            <p className="text-xs text-neutral-500">{field.description}</p>
          )}
        </div>
      )

    case 'text':
      return (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </label>
          <textarea
            value={(value as string) || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={readOnly}
            rows={3}
            className={inputClasses}
          />
          {field.description && (
            <p className="text-xs text-neutral-500">{field.description}</p>
          )}
        </div>
      )

    case 'number':
      return (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </label>
          <input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => handleChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={field.placeholder}
            disabled={readOnly}
            className={inputClasses}
          />
          {field.description && (
            <p className="text-xs text-neutral-500">{field.description}</p>
          )}
        </div>
      )

    case 'boolean':
      return (
        <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {field.label}
            </label>
            {field.description && (
              <p className="text-xs text-neutral-500">{field.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleChange(!value)}
            disabled={readOnly}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              value ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-600',
              readOnly && 'cursor-not-allowed opacity-60'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                value ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>
      )

    case 'array':
      const arrayValue = (value as unknown[]) || []
      return (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-left hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-neutral-400" />
              )}
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {field.label}
              </span>
              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
                {arrayValue.length} items
              </span>
            </div>
          </button>

          {isExpanded && (
            <div className="ml-4 space-y-2 border-l-2 border-neutral-200 pl-4 dark:border-neutral-700">
              {arrayValue.map((item, index) => (
                <div
                  key={index}
                  className="group flex items-start gap-2 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <GripVertical className="mt-1 h-4 w-4 cursor-grab text-neutral-300 active:cursor-grabbing" />
                  <div className="min-w-0 flex-1">
                    {field.items ? (
                      field.items.map((subField) => (
                        <FieldEditor
                          key={subField.key}
                          field={subField}
                          value={(item as Record<string, unknown>)?.[subField.key]}
                          onChange={(newValue) => {
                            const newArray = [...arrayValue]
                            newArray[index] = {
                              ...(item as Record<string, unknown>),
                              [subField.key]: newValue,
                            }
                            handleChange(newArray)
                          }}
                          readOnly={readOnly}
                          depth={depth + 1}
                        />
                      ))
                    ) : (
                      <input
                        type="text"
                        value={String(item || '')}
                        onChange={(e) => {
                          const newArray = [...arrayValue]
                          newArray[index] = e.target.value
                          handleChange(newArray)
                        }}
                        disabled={readOnly}
                        className={inputClasses}
                      />
                    )}
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        const newArray = arrayValue.filter((_, i) => i !== index)
                        handleChange(newArray)
                      }}
                      className="rounded p-1 text-neutral-400 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    const newItem = field.items
                      ? field.items.reduce(
                          (acc, f) => ({
                            ...acc,
                            [f.key]: f.type === 'boolean' ? false : f.type === 'number' ? 0 : '',
                          }),
                          {}
                        )
                      : ''
                    handleChange([...arrayValue, newItem])
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 p-2 text-sm text-neutral-500 hover:border-blue-400 hover:text-blue-600 dark:border-neutral-600 dark:hover:border-blue-500"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              )}
            </div>
          )}
        </div>
      )

    case 'object':
      const objectValue = (value as Record<string, unknown>) || {}
      return (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-left hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-neutral-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-neutral-400" />
            )}
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {field.label}
            </span>
          </button>

          {isExpanded && field.properties && (
            <div className="ml-4 space-y-3 border-l-2 border-neutral-200 pl-4 dark:border-neutral-700">
              {field.properties.map((propField) => (
                <FieldEditor
                  key={propField.key}
                  field={propField}
                  value={objectValue[propField.key]}
                  onChange={(newValue) => {
                    handleChange({
                      ...objectValue,
                      [propField.key]: newValue,
                    })
                  }}
                  readOnly={readOnly}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      )

    default:
      return null
  }
}

export function JSONEditor({
  value,
  onChange,
  schema,
  className,
  readOnly = false,
}: JSONEditorProps) {
  const [rawMode, setRawMode] = useState(false)
  const [rawValue, setRawValue] = useState('')
  const [rawError, setRawError] = useState<string | null>(null)

  const handleSchemaChange = useCallback(
    (field: SchemaField, newValue: unknown) => {
      onChange?.({
        ...value,
        [field.key]: newValue,
      })
    },
    [value, onChange]
  )

  const handleRawChange = useCallback(
    (newRawValue: string) => {
      setRawValue(newRawValue)
      try {
        const parsed = JSON.parse(newRawValue)
        setRawError(null)
        onChange?.(parsed)
      } catch {
        setRawError('Invalid JSON')
      }
    },
    [onChange]
  )

  const toggleRawMode = useCallback(() => {
    if (!rawMode) {
      setRawValue(JSON.stringify(value, null, 2))
      setRawError(null)
    }
    setRawMode(!rawMode)
  }, [rawMode, value])

  // If no schema provided, show raw JSON editor
  if (!schema || rawMode) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Raw JSON
          </span>
          {schema && (
            <button
              type="button"
              onClick={toggleRawMode}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Switch to Form View
            </button>
          )}
        </div>
        <textarea
          value={rawMode ? rawValue : JSON.stringify(value, null, 2)}
          onChange={(e) => handleRawChange(e.target.value)}
          disabled={readOnly}
          rows={15}
          className={cn(
            'w-full rounded-lg border border-neutral-300 bg-neutral-900 p-4 font-mono text-sm text-green-400 focus:border-blue-500 focus:outline-none',
            rawError && 'border-red-500',
            readOnly && 'cursor-not-allowed opacity-60'
          )}
        />
        {rawError && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            {rawError}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={toggleRawMode}
          className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
        >
          Edit Raw JSON
        </button>
      </div>
      {schema.map((field) => (
        <FieldEditor
          key={field.key}
          field={field}
          value={value[field.key]}
          onChange={(newValue) => handleSchemaChange(field, newValue)}
          readOnly={readOnly}
        />
      ))}
    </div>
  )
}

// Pre-defined schemas for common content types
export const communityHighlightsSchema: SchemaField[] = [
  {
    key: 'highlights',
    label: 'Community Highlights',
    type: 'array',
    items: [
      { key: 'text', label: 'Highlight Text', type: 'string', required: true },
    ],
  },
]

export const communityLifestyleSchema: SchemaField[] = [
  { key: 'description', label: 'Lifestyle Description', type: 'text' },
  {
    key: 'amenities',
    label: 'Amenities',
    type: 'array',
    items: [
      { key: 'name', label: 'Amenity Name', type: 'string', required: true },
    ],
  },
  {
    key: 'nearby_attractions',
    label: 'Nearby Attractions',
    type: 'array',
    items: [
      { key: 'name', label: 'Name', type: 'string', required: true },
      { key: 'distance', label: 'Distance', type: 'string', placeholder: '5 miles' },
      { key: 'description', label: 'Description', type: 'text' },
    ],
  },
]

export const communityMarketSchema: SchemaField[] = [
  { key: 'median_price', label: 'Median Home Price', type: 'number', placeholder: '450000' },
  { key: 'price_change_yoy', label: 'YoY Price Change (%)', type: 'number', placeholder: '5.2' },
  { key: 'days_on_market', label: 'Avg Days on Market', type: 'number', placeholder: '28' },
  { key: 'inventory', label: 'Active Listings', type: 'number', placeholder: '45' },
  { key: 'sold_last_30', label: 'Sold Last 30 Days', type: 'number', placeholder: '12' },
]

export const communitySchoolsSchema: SchemaField[] = [
  {
    key: 'schools',
    label: 'Schools',
    type: 'array',
    items: [
      { key: 'name', label: 'School Name', type: 'string', required: true },
      { key: 'type', label: 'Type', type: 'string', placeholder: 'Elementary, Middle, High' },
      { key: 'rating', label: 'Rating', type: 'number', placeholder: '1-10' },
      { key: 'distance', label: 'Distance (miles)', type: 'number', placeholder: '0.5' },
    ],
  },
]

export const subdivisionSchema: SchemaField[] = [
  {
    key: 'subdivisions',
    label: 'Subdivisions',
    type: 'array',
    items: [
      { key: 'name', label: 'Name', type: 'string', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'homes', label: 'Number of Homes', type: 'number' },
      { key: 'price_range', label: 'Price Range', type: 'string', placeholder: '$400K - $600K' },
      { key: 'hoa_fee', label: 'HOA Fee', type: 'number', placeholder: '125' },
    ],
  },
]

// Schema lookup by name
export const schemaRegistry: Record<string, SchemaField[]> = {
  communityHighlights: communityHighlightsSchema,
  communityLifestyle: communityLifestyleSchema,
  communityMarket: communityMarketSchema,
  communitySchools: communitySchoolsSchema,
  subdivisions: subdivisionSchema,
}

export function getSchemaByName(name: string): SchemaField[] | undefined {
  return schemaRegistry[name]
}

export default JSONEditor
