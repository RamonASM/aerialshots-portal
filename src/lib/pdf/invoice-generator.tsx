import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
  Image,
} from '@react-pdf/renderer'

// Register fonts (using system fonts for now)
Font.register({
  family: 'Inter',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2',
      fontWeight: 600,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2',
      fontWeight: 700,
    },
  ],
})

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface InvoiceTemplate {
  logoUrl?: string
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyWebsite?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  fontFamily?: string
  headerText?: string
  footerText?: string
  termsAndConditions?: string
  paymentInstructions?: string
  showLogo?: boolean
  showQrCode?: boolean
  showDueDate?: boolean
  showPaymentLink?: boolean
  showLineItemDetails?: boolean
  paperSize?: 'letter' | 'a4' | 'legal'
  marginTop?: number
  marginBottom?: number
  marginLeft?: number
  marginRight?: number
}

export interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  customerName: string
  customerEmail: string
  customerAddress?: string
  customerPhone?: string
  propertyAddress?: string
  items: InvoiceItem[]
  subtotal: number
  taxRate?: number
  taxAmount?: number
  total: number
  amountPaid?: number
  amountDue?: number
  paymentLink?: string
  notes?: string
  template?: InvoiceTemplate
}

// Create styles
const createStyles = (template?: InvoiceTemplate) => {
  const primaryColor = template?.primaryColor || '#000000'
  const secondaryColor = template?.secondaryColor || '#666666'
  const accentColor = template?.accentColor || '#0066cc'
  const fontFamily = template?.fontFamily || 'Inter'
  const marginTop = (template?.marginTop || 1) * 72 // inches to points
  const marginBottom = (template?.marginBottom || 1) * 72
  const marginLeft = (template?.marginLeft || 0.75) * 72
  const marginRight = (template?.marginRight || 0.75) * 72

  return StyleSheet.create({
    page: {
      fontFamily,
      fontSize: 10,
      paddingTop: marginTop,
      paddingBottom: marginBottom,
      paddingLeft: marginLeft,
      paddingRight: marginRight,
      backgroundColor: '#ffffff',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 30,
    },
    logoSection: {
      flexDirection: 'column',
      maxWidth: 200,
    },
    logo: {
      width: 120,
      height: 40,
      objectFit: 'contain',
    },
    companyName: {
      fontSize: 18,
      fontWeight: 700,
      color: primaryColor,
      marginBottom: 4,
    },
    companyInfo: {
      fontSize: 9,
      color: secondaryColor,
      marginBottom: 2,
    },
    invoiceInfo: {
      textAlign: 'right',
    },
    invoiceTitle: {
      fontSize: 24,
      fontWeight: 700,
      color: primaryColor,
      marginBottom: 10,
    },
    invoiceDetail: {
      fontSize: 10,
      color: secondaryColor,
      marginBottom: 3,
    },
    invoiceNumber: {
      fontSize: 12,
      fontWeight: 600,
      color: primaryColor,
    },
    billTo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 30,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5',
    },
    billToSection: {
      maxWidth: '45%',
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: 600,
      color: primaryColor,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    customerName: {
      fontSize: 12,
      fontWeight: 600,
      color: primaryColor,
      marginBottom: 4,
    },
    customerInfo: {
      fontSize: 10,
      color: secondaryColor,
      marginBottom: 2,
    },
    table: {
      marginBottom: 30,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: primaryColor,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    tableHeaderCell: {
      fontSize: 10,
      fontWeight: 600,
      color: '#ffffff',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5',
    },
    tableRowAlt: {
      backgroundColor: '#f9f9f9',
    },
    tableCell: {
      fontSize: 10,
      color: primaryColor,
    },
    descCol: { width: '50%' },
    qtyCol: { width: '15%', textAlign: 'center' },
    priceCol: { width: '17.5%', textAlign: 'right' },
    totalCol: { width: '17.5%', textAlign: 'right' },
    totalsSection: {
      marginLeft: 'auto',
      width: 200,
      marginBottom: 30,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 5,
    },
    totalLabel: {
      fontSize: 10,
      color: secondaryColor,
    },
    totalValue: {
      fontSize: 10,
      color: primaryColor,
      fontWeight: 600,
    },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderTopWidth: 2,
      borderTopColor: primaryColor,
      marginTop: 5,
    },
    grandTotalLabel: {
      fontSize: 12,
      fontWeight: 700,
      color: primaryColor,
    },
    grandTotalValue: {
      fontSize: 14,
      fontWeight: 700,
      color: accentColor,
    },
    amountDue: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 15,
      backgroundColor: accentColor,
      marginTop: 10,
    },
    amountDueLabel: {
      fontSize: 12,
      fontWeight: 600,
      color: '#ffffff',
    },
    amountDueValue: {
      fontSize: 14,
      fontWeight: 700,
      color: '#ffffff',
    },
    notesSection: {
      marginBottom: 20,
    },
    notesText: {
      fontSize: 9,
      color: secondaryColor,
      lineHeight: 1.5,
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: marginLeft,
      right: marginRight,
      textAlign: 'center',
      borderTopWidth: 1,
      borderTopColor: '#e5e5e5',
      paddingTop: 15,
    },
    footerText: {
      fontSize: 8,
      color: secondaryColor,
      marginBottom: 2,
    },
    paymentLink: {
      fontSize: 9,
      color: accentColor,
      marginTop: 5,
    },
  })
}

// Invoice Document Component
const InvoiceDocument: React.FC<{ data: InvoiceData }> = ({ data }) => {
  const styles = createStyles(data.template)
  const template = data.template || {}

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100)
  }

  const pageSize = template.paperSize === 'a4' ? 'A4' :
                   template.paperSize === 'legal' ? 'LEGAL' : 'LETTER'

  return (
    <Document>
      <Page size={pageSize} style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {template.showLogo !== false && template.logoUrl && (
              <Image src={template.logoUrl} style={styles.logo} />
            )}
            <Text style={styles.companyName}>
              {template.companyName || 'Aerial Shots Media'}
            </Text>
            {template.companyAddress && (
              <Text style={styles.companyInfo}>{template.companyAddress}</Text>
            )}
            {template.companyPhone && (
              <Text style={styles.companyInfo}>{template.companyPhone}</Text>
            )}
            {template.companyEmail && (
              <Text style={styles.companyInfo}>{template.companyEmail}</Text>
            )}
            {template.companyWebsite && (
              <Text style={styles.companyInfo}>{template.companyWebsite}</Text>
            )}
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
            <Text style={styles.invoiceDetail}>
              Date: {data.invoiceDate}
            </Text>
            {template.showDueDate !== false && data.dueDate && (
              <Text style={styles.invoiceDetail}>
                Due: {data.dueDate}
              </Text>
            )}
          </View>
        </View>

        {/* Custom Header Text */}
        {template.headerText && (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.notesText}>{template.headerText}</Text>
          </View>
        )}

        {/* Bill To / Property */}
        <View style={styles.billTo}>
          <View style={styles.billToSection}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.customerName}>{data.customerName}</Text>
            <Text style={styles.customerInfo}>{data.customerEmail}</Text>
            {data.customerAddress && (
              <Text style={styles.customerInfo}>{data.customerAddress}</Text>
            )}
            {data.customerPhone && (
              <Text style={styles.customerInfo}>{data.customerPhone}</Text>
            )}
          </View>
          {data.propertyAddress && (
            <View style={styles.billToSection}>
              <Text style={styles.sectionTitle}>Property</Text>
              <Text style={styles.customerInfo}>{data.propertyAddress}</Text>
            </View>
          )}
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.descCol]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.qtyCol]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.priceCol]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, styles.totalCol]}>Total</Text>
          </View>
          {data.items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.tableRow,
                index % 2 === 1 ? styles.tableRowAlt : {},
              ]}
            >
              <Text style={[styles.tableCell, styles.descCol]}>
                {item.description}
              </Text>
              <Text style={[styles.tableCell, styles.qtyCol]}>
                {item.quantity}
              </Text>
              <Text style={[styles.tableCell, styles.priceCol]}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={[styles.tableCell, styles.totalCol]}>
                {formatCurrency(item.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.subtotal)}
            </Text>
          </View>
          {data.taxAmount && data.taxRate && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({data.taxRate}%)</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(data.taxAmount)}
              </Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(data.total)}
            </Text>
          </View>
          {data.amountPaid !== undefined && data.amountPaid > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Amount Paid</Text>
              <Text style={styles.totalValue}>
                -{formatCurrency(data.amountPaid)}
              </Text>
            </View>
          )}
          {data.amountDue !== undefined && (
            <View style={styles.amountDue}>
              <Text style={styles.amountDueLabel}>Amount Due</Text>
              <Text style={styles.amountDueValue}>
                {formatCurrency(data.amountDue)}
              </Text>
            </View>
          )}
        </View>

        {/* Payment Instructions */}
        {template.paymentInstructions && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Payment Instructions</Text>
            <Text style={styles.notesText}>{template.paymentInstructions}</Text>
          </View>
        )}

        {/* Notes */}
        {data.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Terms and Conditions */}
        {template.termsAndConditions && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <Text style={styles.notesText}>{template.termsAndConditions}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          {template.footerText && (
            <Text style={styles.footerText}>{template.footerText}</Text>
          )}
          <Text style={styles.footerText}>
            Thank you for your business!
          </Text>
          {template.showPaymentLink !== false && data.paymentLink && (
            <Text style={styles.paymentLink}>
              Pay online: {data.paymentLink}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  )
}

/**
 * Generate a PDF invoice buffer
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const buffer = await renderToBuffer(<InvoiceDocument data={data} />)
  return buffer
}

/**
 * Format order data into invoice data structure
 */
export function formatOrderForInvoice(
  order: {
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
  },
  invoiceNumber: string,
  template?: InvoiceTemplate
): InvoiceData {
  const invoiceDate = new Date(order.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const dueDate = new Date(
    new Date(order.created_at).getTime() + 30 * 24 * 60 * 60 * 1000
  ).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const items: InvoiceItem[] = order.services.map((service) => ({
    description: service.name,
    quantity: 1,
    unitPrice: service.price_cents,
    total: service.price_cents,
  }))

  const amountPaid = order.payment_status === 'succeeded' ? order.total_cents : 0
  const amountDue = order.total_cents - amountPaid

  return {
    invoiceNumber,
    invoiceDate,
    dueDate,
    customerName: order.contact_name,
    customerEmail: order.contact_email,
    customerPhone: order.contact_phone,
    propertyAddress: order.property_address,
    items,
    subtotal: order.total_cents,
    total: order.total_cents,
    amountPaid,
    amountDue,
    paymentLink: `https://portal.aerialshots.media/pay/${order.id}`,
    template,
  }
}

export { InvoiceDocument }
