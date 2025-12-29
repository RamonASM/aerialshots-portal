import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Font,
} from '@react-pdf/renderer'

// Register default font
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
})

export interface InvoiceTemplate {
  id: string
  agent_id?: string | null
  name: string
  company_name?: string | null
  company_address?: string | null
  company_phone?: string | null
  company_email?: string | null
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  accent_color?: string | null
  header_text?: string | null
  footer_text?: string | null
  payment_instructions?: string | null
  terms_and_conditions?: string | null
  show_logo?: boolean
  show_company_info?: boolean
  show_payment_instructions?: boolean
  show_terms?: boolean
  paper_size?: string | null
  margin_top?: number | null
  margin_bottom?: number | null
  margin_left?: number | null
  margin_right?: number | null
  is_default?: boolean
  created_at?: string
  updated_at?: string
}

export interface InvoiceLineItem {
  name?: string
  description?: string
  quantity: number
  unitPrice: number
  total: number
}

export interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  customerAddress?: string
  propertyAddress?: string
  items: InvoiceLineItem[]
  subtotal: number
  tax?: number
  discount?: number
  total: number
  amountPaid?: number
  amountDue?: number
  paymentStatus?: string
  paidAt?: string
  paymentLink?: string
  notes?: string
  template?: InvoiceTemplate
}

interface OrderForInvoice {
  id: string
  contact_name: string
  contact_email: string
  contact_phone?: string
  property_address?: string
  services: Array<{ name: string; price_cents: number }>
  total_cents: number
  created_at: string
  payment_status?: string
  paid_at?: string
}

const defaultTemplate: Partial<InvoiceTemplate> = {
  company_name: 'Aerial Shots Media',
  company_address: '123 Photography Lane, Orlando, FL 32801',
  company_phone: '(407) 555-0123',
  company_email: 'billing@aerialshotsmedia.com',
  primary_color: '#1a1a2e',
  secondary_color: '#16213e',
  accent_color: '#0f3460',
  header_text: 'Invoice',
  footer_text: 'Thank you for your business!',
  payment_instructions: 'Payment is due within 30 days. Please include the invoice number with your payment.',
  show_logo: true,
  show_company_info: true,
  show_payment_instructions: true,
  show_terms: false,
}

const createStyles = (template: Partial<InvoiceTemplate>) => {
  const primaryColor = template.primary_color || defaultTemplate.primary_color || '#1a1a2e'
  const marginTop = template.margin_top || 40
  const marginBottom = template.margin_bottom || 40
  const marginLeft = template.margin_left || 40
  const marginRight = template.margin_right || 40

  return StyleSheet.create({
    page: {
      padding: 0,
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#333333',
    },
    container: {
      paddingTop: marginTop,
      paddingBottom: marginBottom,
      paddingLeft: marginLeft,
      paddingRight: marginRight,
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 30,
    },
    companyInfo: {
      flex: 1,
    },
    companyName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: primaryColor,
      marginBottom: 4,
    },
    companyDetails: {
      fontSize: 9,
      color: '#666666',
      lineHeight: 1.4,
    },
    invoiceInfo: {
      textAlign: 'right',
    },
    invoiceTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: primaryColor,
      marginBottom: 8,
    },
    invoiceNumber: {
      fontSize: 11,
      marginBottom: 2,
    },
    invoiceDate: {
      fontSize: 10,
      color: '#666666',
    },
    billTo: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: 'bold',
      color: primaryColor,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    customerName: {
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 2,
    },
    customerDetails: {
      fontSize: 10,
      color: '#666666',
      lineHeight: 1.4,
    },
    table: {
      marginBottom: 20,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: primaryColor,
      padding: 8,
      color: '#ffffff',
    },
    tableHeaderText: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#ffffff',
      textTransform: 'uppercase',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5',
      padding: 8,
    },
    tableRowAlt: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5',
      padding: 8,
      backgroundColor: '#fafafa',
    },
    colDescription: {
      flex: 3,
    },
    colQty: {
      flex: 1,
      textAlign: 'center',
    },
    colPrice: {
      flex: 1,
      textAlign: 'right',
    },
    colTotal: {
      flex: 1,
      textAlign: 'right',
    },
    totalsSection: {
      marginTop: 20,
      marginLeft: 'auto',
      width: 200,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    totalLabel: {
      fontSize: 10,
      color: '#666666',
    },
    totalValue: {
      fontSize: 10,
      fontWeight: 'bold',
    },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderTopWidth: 2,
      borderTopColor: primaryColor,
      marginTop: 4,
    },
    grandTotalLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      color: primaryColor,
    },
    grandTotalValue: {
      fontSize: 12,
      fontWeight: 'bold',
      color: primaryColor,
    },
    paymentStatus: {
      marginTop: 20,
      padding: 12,
      backgroundColor: '#f0f9f0',
      borderRadius: 4,
      borderLeftWidth: 4,
      borderLeftColor: '#22c55e',
    },
    paymentStatusPending: {
      marginTop: 20,
      padding: 12,
      backgroundColor: '#fefce8',
      borderRadius: 4,
      borderLeftWidth: 4,
      borderLeftColor: '#eab308',
    },
    paymentStatusText: {
      fontSize: 10,
      fontWeight: 'bold',
    },
    footer: {
      position: 'absolute',
      bottom: marginBottom,
      left: marginLeft,
      right: marginRight,
    },
    footerDivider: {
      borderTopWidth: 1,
      borderTopColor: '#e5e5e5',
      paddingTop: 12,
    },
    paymentInstructions: {
      marginBottom: 12,
    },
    footerText: {
      fontSize: 9,
      color: '#666666',
      textAlign: 'center',
      marginTop: 8,
    },
    notes: {
      marginTop: 20,
      padding: 12,
      backgroundColor: '#f5f5f5',
      borderRadius: 4,
    },
    notesTitle: {
      fontSize: 10,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    notesText: {
      fontSize: 9,
      color: '#666666',
      lineHeight: 1.4,
    },
  })
}

const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function createInvoiceDocument(data: InvoiceData) {
  const template = { ...defaultTemplate, ...data.template }
  const styles = createStyles(template)

  return React.createElement(
    Document,
    { title: `Invoice ${data.invoiceNumber}`, author: 'Aerial Shots Media' },
    React.createElement(
      Page,
      { size: (template.paper_size as 'A4' | 'LETTER') || 'LETTER', style: styles.page },
      React.createElement(
        View,
        { style: styles.container },
        // Header
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(
            View,
            { style: styles.companyInfo },
            template.show_company_info &&
              React.createElement(
                React.Fragment,
                null,
                React.createElement(Text, { style: styles.companyName }, template.company_name),
                React.createElement(
                  Text,
                  { style: styles.companyDetails },
                  template.company_address || ''
                ),
                React.createElement(
                  Text,
                  { style: styles.companyDetails },
                  [template.company_phone, template.company_email].filter(Boolean).join(' | ')
                )
              )
          ),
          React.createElement(
            View,
            { style: styles.invoiceInfo },
            React.createElement(Text, { style: styles.invoiceTitle }, template.header_text || 'Invoice'),
            React.createElement(Text, { style: styles.invoiceNumber }, data.invoiceNumber),
            React.createElement(
              Text,
              { style: styles.invoiceDate },
              `Date: ${formatDate(data.invoiceDate)}`
            ),
            data.dueDate &&
              React.createElement(Text, { style: styles.invoiceDate }, `Due: ${formatDate(data.dueDate)}`)
          )
        ),
        // Bill To
        React.createElement(
          View,
          { style: styles.billTo },
          React.createElement(Text, { style: styles.sectionTitle }, 'Bill To'),
          React.createElement(Text, { style: styles.customerName }, data.customerName),
          React.createElement(Text, { style: styles.customerDetails }, data.customerEmail),
          data.customerPhone &&
            React.createElement(Text, { style: styles.customerDetails }, data.customerPhone),
          data.propertyAddress &&
            React.createElement(
              Text,
              { style: styles.customerDetails },
              `Property: ${data.propertyAddress}`
            )
        ),
        // Items Table
        React.createElement(
          View,
          { style: styles.table },
          // Table Header
          React.createElement(
            View,
            { style: styles.tableHeader },
            React.createElement(Text, { style: [styles.tableHeaderText, styles.colDescription] }, 'Description'),
            React.createElement(Text, { style: [styles.tableHeaderText, styles.colQty] }, 'Qty'),
            React.createElement(Text, { style: [styles.tableHeaderText, styles.colPrice] }, 'Price'),
            React.createElement(Text, { style: [styles.tableHeaderText, styles.colTotal] }, 'Total')
          ),
          // Table Rows
          ...data.items.map((item, index) =>
            React.createElement(
              View,
              { style: index % 2 === 0 ? styles.tableRow : styles.tableRowAlt, key: index },
              React.createElement(Text, { style: styles.colDescription }, item.description || item.name || 'Item'),
              React.createElement(Text, { style: styles.colQty }, item.quantity.toString()),
              React.createElement(Text, { style: styles.colPrice }, formatCurrency(item.unitPrice)),
              React.createElement(Text, { style: styles.colTotal }, formatCurrency(item.total))
            )
          )
        ),
        // Totals
        React.createElement(
          View,
          { style: styles.totalsSection },
          React.createElement(
            View,
            { style: styles.totalRow },
            React.createElement(Text, { style: styles.totalLabel }, 'Subtotal'),
            React.createElement(Text, { style: styles.totalValue }, formatCurrency(data.subtotal))
          ),
          data.tax !== undefined &&
            data.tax > 0 &&
            React.createElement(
              View,
              { style: styles.totalRow },
              React.createElement(Text, { style: styles.totalLabel }, 'Tax'),
              React.createElement(Text, { style: styles.totalValue }, formatCurrency(data.tax))
            ),
          data.discount !== undefined &&
            data.discount > 0 &&
            React.createElement(
              View,
              { style: styles.totalRow },
              React.createElement(Text, { style: styles.totalLabel }, 'Discount'),
              React.createElement(Text, { style: styles.totalValue }, `-${formatCurrency(data.discount)}`)
            ),
          React.createElement(
            View,
            { style: styles.grandTotalRow },
            React.createElement(Text, { style: styles.grandTotalLabel }, 'Total'),
            React.createElement(Text, { style: styles.grandTotalValue }, formatCurrency(data.total))
          ),
          data.amountPaid !== undefined &&
            data.amountPaid > 0 &&
            React.createElement(
              View,
              { style: styles.totalRow },
              React.createElement(Text, { style: styles.totalLabel }, 'Amount Paid'),
              React.createElement(Text, { style: styles.totalValue }, formatCurrency(data.amountPaid))
            ),
          data.amountDue !== undefined &&
            React.createElement(
              View,
              { style: styles.totalRow },
              React.createElement(Text, { style: styles.grandTotalLabel }, 'Amount Due'),
              React.createElement(Text, { style: styles.grandTotalValue }, formatCurrency(data.amountDue))
            )
        ),
        // Payment Status
        data.paymentStatus === 'succeeded'
          ? React.createElement(
              View,
              { style: styles.paymentStatus },
              React.createElement(
                Text,
                { style: styles.paymentStatusText },
                ` Paid${data.paidAt ? ` on ${formatDate(data.paidAt)}` : ''}`
              )
            )
          : React.createElement(
              View,
              { style: styles.paymentStatusPending },
              React.createElement(Text, { style: styles.paymentStatusText }, 'Payment Pending')
            ),
        // Notes
        data.notes &&
          React.createElement(
            View,
            { style: styles.notes },
            React.createElement(Text, { style: styles.notesTitle }, 'Notes'),
            React.createElement(Text, { style: styles.notesText }, data.notes)
          )
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          View,
          { style: styles.footerDivider },
          template.show_payment_instructions &&
            template.payment_instructions &&
            React.createElement(
              View,
              { style: styles.paymentInstructions },
              React.createElement(Text, { style: styles.notesTitle }, 'Payment Instructions'),
              React.createElement(Text, { style: styles.notesText }, template.payment_instructions)
            ),
          template.footer_text &&
            React.createElement(Text, { style: styles.footerText }, template.footer_text)
        )
      )
    )
  )
}

export function formatOrderForInvoice(
  order: OrderForInvoice,
  invoiceNumber: string,
  template?: InvoiceTemplate
): InvoiceData {
  const items = order.services.map((service) => ({
    name: service.name,
    quantity: 1,
    unitPrice: service.price_cents,
    total: service.price_cents,
  }))

  const subtotal = items.reduce((sum, item) => sum + item.total, 0)

  return {
    invoiceNumber,
    invoiceDate: order.created_at,
    customerName: order.contact_name,
    customerEmail: order.contact_email,
    customerPhone: order.contact_phone,
    propertyAddress: order.property_address,
    items,
    subtotal,
    total: order.total_cents,
    paymentStatus: order.payment_status,
    paidAt: order.paid_at,
    template,
  }
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const document = createInvoiceDocument(data)
  const buffer = await renderToBuffer(document)
  return Buffer.from(buffer)
}

export function formatCentsToDisplayAmount(cents: number): string {
  return formatCurrency(cents)
}
