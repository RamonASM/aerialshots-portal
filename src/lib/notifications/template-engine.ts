/**
 * Template Engine with Conditional Logic
 *
 * Supports:
 * - Variable interpolation: {{variable_name}}
 * - Conditional blocks: {{#if condition}}...{{/if}}
 * - Else blocks: {{#if condition}}...{{#else}}...{{/if}}
 * - Nested conditions
 * - Comparison operators: ==, !=, >, <, >=, <=, contains, startsWith, endsWith
 */

export interface TemplateCondition {
  id: string
  template_id: string
  condition_type: 'service_type' | 'order_value' | 'client_tier' | 'status' | 'custom'
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  field: string
  value: string | number | string[]
  priority: number
  template_override?: string
  is_active: boolean
}

export interface TemplateVariable {
  key: string
  category: string
  description: string
  example_value?: string
}

export interface TemplateContext {
  // General
  company_name?: string
  company_email?: string
  company_phone?: string
  company_website?: string
  support_email?: string
  support_phone?: string
  current_year?: number
  current_date?: string

  // Agent
  agent_name?: string
  agent_email?: string
  agent_phone?: string
  agent_company?: string
  agent_website?: string
  agent_headshot_url?: string
  agent_logo_url?: string

  // Order
  order_id?: string
  order_number?: string
  order_date?: string
  order_status?: string
  order_total?: number
  order_total_formatted?: string
  services?: string[]
  service_list?: string

  // Property
  property_address?: string
  property_city?: string
  property_state?: string
  property_zip?: string
  property_type?: string
  property_sqft?: number

  // Payment
  payment_amount?: number
  payment_amount_formatted?: string
  payment_method?: string
  payment_date?: string
  payment_link?: string
  invoice_number?: string
  invoice_link?: string

  // Delivery
  delivery_link?: string
  download_link?: string
  gallery_link?: string
  photo_count?: number
  video_count?: number
  scheduled_date?: string
  scheduled_time?: string

  // Custom fields
  [key: string]: unknown
}

/**
 * Evaluates a condition against the template context
 */
export function evaluateCondition(
  condition: TemplateCondition,
  context: TemplateContext
): boolean {
  const fieldValue = getNestedValue(context, condition.field)

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value

    case 'not_equals':
      return fieldValue !== condition.value

    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(condition.value as string)
      }
      if (typeof fieldValue === 'string') {
        return fieldValue.includes(condition.value as string)
      }
      return false

    case 'greater_than':
      return typeof fieldValue === 'number' && fieldValue > (condition.value as number)

    case 'less_than':
      return typeof fieldValue === 'number' && fieldValue < (condition.value as number)

    case 'in':
      if (Array.isArray(condition.value)) {
        return condition.value.includes(fieldValue as string)
      }
      return false

    case 'not_in':
      if (Array.isArray(condition.value)) {
        return !condition.value.includes(fieldValue as string)
      }
      return true

    default:
      return false
  }
}

/**
 * Gets a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj as unknown)
}

/**
 * Parse and evaluate inline conditions in template
 *
 * Syntax:
 * {{#if condition}}content{{/if}}
 * {{#if condition}}content{{#else}}alternative{{/if}}
 *
 * Conditions:
 * {{#if services contains "drone"}}...{{/if}}
 * {{#if order_total > 500}}...{{/if}}
 * {{#if order_status == "delivered"}}...{{/if}}
 */
export function parseInlineConditions(template: string, context: TemplateContext): string {
  // Match {{#if ...}}...{{/if}} blocks (including nested)
  const ifPattern = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g

  let result = template
  let match: RegExpExecArray | null
  let iterations = 0
  const maxIterations = 100 // Prevent infinite loops

  // Process from innermost to outermost
  while ((match = ifPattern.exec(result)) !== null && iterations < maxIterations) {
    iterations++
    const [fullMatch, condition, content] = match

    const conditionResult = evaluateInlineCondition(condition.trim(), context)

    // Handle else blocks
    const elseParts = content.split(/\{\{#else\}\}/)
    const ifContent = elseParts[0]
    const elseContent = elseParts[1] || ''

    const replacement = conditionResult ? ifContent : elseContent
    result = result.replace(fullMatch, replacement)

    // Reset pattern to find more matches
    ifPattern.lastIndex = 0
  }

  return result
}

/**
 * Evaluate an inline condition string
 *
 * Examples:
 * "services contains 'drone'"
 * "order_total > 500"
 * "order_status == 'delivered'"
 * "property_sqft >= 3000"
 */
function evaluateInlineCondition(condition: string, context: TemplateContext): boolean {
  // Parse the condition
  const operators = ['>=', '<=', '!=', '==', '>', '<', 'contains', 'startsWith', 'endsWith']
  let operator = ''
  let field = ''
  let value: string | number = ''

  for (const op of operators) {
    const parts = condition.split(new RegExp(`\\s+${op}\\s+`))
    if (parts.length === 2) {
      operator = op
      field = parts[0].trim()
      value = parseValue(parts[1].trim())
      break
    }
  }

  if (!operator) {
    // Check for truthy value
    const fieldValue = getNestedValue(context, condition)
    return !!fieldValue
  }

  const fieldValue = getNestedValue(context, field)

  switch (operator) {
    case '==':
      return fieldValue == value // eslint-disable-line eqeqeq

    case '!=':
      return fieldValue != value // eslint-disable-line eqeqeq

    case '>':
      return typeof fieldValue === 'number' && fieldValue > (value as number)

    case '<':
      return typeof fieldValue === 'number' && fieldValue < (value as number)

    case '>=':
      return typeof fieldValue === 'number' && fieldValue >= (value as number)

    case '<=':
      return typeof fieldValue === 'number' && fieldValue <= (value as number)

    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(value as string)
      }
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes((value as string).toLowerCase())
      }
      return false

    case 'startsWith':
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().startsWith((value as string).toLowerCase())
      }
      return false

    case 'endsWith':
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().endsWith((value as string).toLowerCase())
      }
      return false

    default:
      return false
  }
}

/**
 * Parse a value from a condition string
 */
function parseValue(valueStr: string): string | number {
  // Remove quotes
  if ((valueStr.startsWith("'") && valueStr.endsWith("'")) ||
      (valueStr.startsWith('"') && valueStr.endsWith('"'))) {
    return valueStr.slice(1, -1)
  }

  // Try to parse as number
  const num = parseFloat(valueStr)
  if (!isNaN(num)) {
    return num
  }

  return valueStr
}

/**
 * Interpolate variables in a template
 *
 * Syntax: {{variable_name}}
 * Nested: {{agent.name}}
 * Formatted: {{order_total | currency}}
 */
export function interpolateVariables(template: string, context: TemplateContext): string {
  // Match {{variable}} or {{variable | filter}}
  const variablePattern = /\{\{([^}|]+)(?:\|([^}]+))?\}\}/g

  return template.replace(variablePattern, (_, variable, filter) => {
    const key = variable.trim()
    let value = getNestedValue(context, key)

    if (value === undefined || value === null) {
      return ''
    }

    // Apply filter if present
    if (filter) {
      value = applyFilter(value, filter.trim())
    }

    return String(value)
  })
}

/**
 * Apply a filter to a value
 */
function applyFilter(value: unknown, filter: string): unknown {
  switch (filter) {
    case 'currency':
      if (typeof value === 'number') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value / 100)
      }
      return value

    case 'uppercase':
      return typeof value === 'string' ? value.toUpperCase() : value

    case 'lowercase':
      return typeof value === 'string' ? value.toLowerCase() : value

    case 'capitalize':
      return typeof value === 'string'
        ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
        : value

    case 'date':
      if (value instanceof Date || typeof value === 'string') {
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      }
      return value

    case 'time':
      if (value instanceof Date || typeof value === 'string') {
        return new Date(value).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })
      }
      return value

    case 'list':
      if (Array.isArray(value)) {
        return value.join(', ')
      }
      return value

    case 'count':
      if (Array.isArray(value)) {
        return value.length
      }
      return value

    default:
      return value
  }
}

/**
 * Process a complete template with conditions and variables
 */
export function processTemplate(template: string, context: TemplateContext): string {
  // First, process inline conditions
  let result = parseInlineConditions(template, context)

  // Then, interpolate variables
  result = interpolateVariables(result, context)

  // Clean up any empty lines from removed conditionals
  result = result.replace(/^\s*[\r\n]/gm, '')

  return result
}

/**
 * Select the best template based on conditions
 */
export function selectTemplate(
  baseTemplate: string,
  conditions: TemplateCondition[],
  context: TemplateContext
): string {
  // Sort by priority (higher priority first)
  const sortedConditions = [...conditions]
    .filter((c) => c.is_active)
    .sort((a, b) => b.priority - a.priority)

  // Find the first matching condition with an override
  for (const condition of sortedConditions) {
    if (condition.template_override && evaluateCondition(condition, context)) {
      return condition.template_override
    }
  }

  return baseTemplate
}

/**
 * Validate a template for syntax errors
 */
export function validateTemplate(template: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check for balanced if/endif
  const ifCount = (template.match(/\{\{#if/g) || []).length
  const endifCount = (template.match(/\{\{\/if\}\}/g) || []).length

  if (ifCount !== endifCount) {
    errors.push(`Unbalanced conditionals: ${ifCount} {{#if}} blocks but ${endifCount} {{/if}} blocks`)
  }

  // Check for unclosed variables
  const unclosedVars = template.match(/\{\{[^}]*$/gm)
  if (unclosedVars) {
    errors.push(`Unclosed variable tags found: ${unclosedVars.join(', ')}`)
  }

  // Check for invalid condition syntax
  const ifBlocks = template.match(/\{\{#if\s+([^}]*)\}\}/g) || []
  for (const block of ifBlocks) {
    const condition = block.replace(/\{\{#if\s+/, '').replace(/\}\}$/, '')
    if (!condition.trim()) {
      errors.push('Empty condition found in {{#if}} block')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get all variables used in a template
 */
export function extractVariables(template: string): string[] {
  const variables = new Set<string>()

  // Match {{variable}} patterns (excluding conditionals)
  const varPattern = /\{\{(?!#|\/)([\w.]+)(?:\|[^}]+)?\}\}/g
  let match: RegExpExecArray | null

  while ((match = varPattern.exec(template)) !== null) {
    variables.add(match[1])
  }

  // Also extract variables from conditions
  const condPattern = /\{\{#if\s+(\w+)/g
  while ((match = condPattern.exec(template)) !== null) {
    variables.add(match[1])
  }

  return Array.from(variables)
}

/**
 * Default template variables with descriptions
 */
export const DEFAULT_TEMPLATE_VARIABLES: TemplateVariable[] = [
  // General
  { key: 'company_name', category: 'general', description: 'Company name', example_value: 'Aerial Shots Media' },
  { key: 'company_email', category: 'general', description: 'Company email', example_value: 'hello@aerialshots.media' },
  { key: 'company_phone', category: 'general', description: 'Company phone', example_value: '(407) 555-0100' },
  { key: 'current_year', category: 'general', description: 'Current year', example_value: '2024' },
  { key: 'current_date', category: 'general', description: 'Current date', example_value: 'December 28, 2024' },

  // Agent
  { key: 'agent_name', category: 'agent', description: 'Agent full name', example_value: 'Jane Smith' },
  { key: 'agent_email', category: 'agent', description: 'Agent email', example_value: 'jane@realty.com' },
  { key: 'agent_phone', category: 'agent', description: 'Agent phone', example_value: '(555) 123-4567' },
  { key: 'agent_company', category: 'agent', description: 'Agent brokerage', example_value: 'Premier Realty' },

  // Order
  { key: 'order_number', category: 'order', description: 'Order reference number', example_value: 'ORD-2024-1234' },
  { key: 'order_date', category: 'order', description: 'Order date', example_value: 'December 28, 2024' },
  { key: 'order_status', category: 'order', description: 'Current order status', example_value: 'In Production' },
  { key: 'order_total', category: 'order', description: 'Order total in cents', example_value: '49900' },
  { key: 'order_total_formatted', category: 'order', description: 'Formatted order total', example_value: '$499.00' },
  { key: 'services', category: 'order', description: 'Array of service names', example_value: '["Photography", "Drone"]' },
  { key: 'service_list', category: 'order', description: 'Comma-separated services', example_value: 'Photography, Drone, Video' },

  // Property
  { key: 'property_address', category: 'property', description: 'Full property address', example_value: '123 Main St, Orlando, FL 32801' },
  { key: 'property_city', category: 'property', description: 'Property city', example_value: 'Orlando' },
  { key: 'property_state', category: 'property', description: 'Property state', example_value: 'FL' },
  { key: 'property_sqft', category: 'property', description: 'Square footage', example_value: '2500' },

  // Payment
  { key: 'payment_amount_formatted', category: 'payment', description: 'Formatted payment amount', example_value: '$499.00' },
  { key: 'payment_link', category: 'payment', description: 'Payment URL', example_value: 'https://pay.aerialshots.media/...' },
  { key: 'invoice_number', category: 'payment', description: 'Invoice number', example_value: 'INV-2024-1234' },

  // Delivery
  { key: 'delivery_link', category: 'delivery', description: 'Media delivery URL', example_value: 'https://portal.aerialshots.media/...' },
  { key: 'photo_count', category: 'delivery', description: 'Number of photos', example_value: '25' },
  { key: 'scheduled_date', category: 'delivery', description: 'Scheduled shoot date', example_value: 'January 5, 2025' },
  { key: 'scheduled_time', category: 'delivery', description: 'Scheduled time', example_value: '10:00 AM' },
]
