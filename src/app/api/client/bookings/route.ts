import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Define inline types for tables not yet in generated types
interface ClientAccount {
  id: string
  auth_user_id: string | null
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
}

interface ClientBooking {
  id: string
  client_id: string
  property_address: string
  property_city: string
  property_state: string
  property_zip: string
  property_type: string
  square_feet: number | null
  bedrooms: number | null
  bathrooms: number | null
  package_id: string | null
  package_name: string | null
  services: string[]
  addons: string[]
  preferred_date: string | null
  preferred_time_slot: string | null
  alternate_dates: string[]
  is_flexible: boolean
  scheduling_notes: string | null
  special_instructions: string | null
  access_notes: string | null
  estimated_price: number
  discount_code: string | null
  discount_amount: number
  status: string
  created_at: string
}

interface DiscountCode {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  max_uses: number | null
  uses_count: number
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get client account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: clientData } = await (supabase as any)
      .from('client_accounts')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    const client = clientData as ClientAccount | null

    if (!client) {
      return NextResponse.json({ error: 'Client account not found' }, { status: 404 })
    }

    // Get bookings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bookingsData, error } = await (supabase as any)
      .from('client_bookings')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })

    const bookings = bookingsData as ClientBooking[] | null

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bookings })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate required fields
    const {
      propertyAddress,
      propertyCity,
      propertyState = 'FL',
      propertyZip,
      squareFeet,
      bedrooms,
      bathrooms,
      propertyType = 'residential',
      packageId,
      packageName,
      services = [],
      addons = [],
      preferredDate,
      preferredTimeSlot,
      alternateDates = [],
      isFlexible = false,
      schedulingNotes,
      specialInstructions,
      accessNotes,
      contactFirstName,
      contactLastName,
      contactEmail,
      contactPhone,
      discountCode,
    } = body

    if (!propertyAddress || !propertyCity || !propertyZip || !contactEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser()
    let clientId: string | null = null

    if (user) {
      // Get existing client account
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingClientData } = await (supabase as any)
        .from('client_accounts')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      const existingClient = existingClientData as ClientAccount | null
      clientId = existingClient?.id || null
    }

    // Create or get client account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anySupabase = supabase as any

    if (!clientId) {
      // Check if client exists by email
      const { data: existingClientByEmailData } = await anySupabase
        .from('client_accounts')
        .select('id')
        .eq('email', contactEmail.toLowerCase())
        .single()

      const existingClientByEmail = existingClientByEmailData as ClientAccount | null

      if (existingClientByEmail) {
        clientId = existingClientByEmail.id
      } else {
        // Create new client account
        const { data: newClientData, error: clientError } = await anySupabase
          .from('client_accounts')
          .insert({
            email: contactEmail.toLowerCase(),
            first_name: contactFirstName,
            last_name: contactLastName,
            phone: contactPhone,
          })
          .select('id')
          .single()

        const newClient = newClientData as ClientAccount | null

        if (clientError || !newClient) {
          console.error('Error creating client:', clientError)
          return NextResponse.json(
            { error: 'Failed to create client account' },
            { status: 500 }
          )
        }

        clientId = newClient.id
      }
    }

    // Calculate estimated price (this would normally use the pricing engine)
    let estimatedPrice = 449 // Default Signature package
    if (packageName === 'Essentials') estimatedPrice = 315
    if (packageName === 'Premier') estimatedPrice = 649

    // Validate discount code if provided
    let discountAmount = 0
    if (discountCode) {
      const { data: discountData } = await anySupabase
        .from('discount_codes')
        .select('*')
        .eq('code', discountCode.toUpperCase())
        .eq('is_active', true)
        .single()

      const discount = discountData as DiscountCode | null

      if (discount) {
        // Check validity
        const now = new Date()
        const validFrom = discount.valid_from ? new Date(discount.valid_from) : null
        const validUntil = discount.valid_until ? new Date(discount.valid_until) : null

        if ((!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)) {
          // Check usage limit
          if (!discount.max_uses || discount.uses_count < discount.max_uses) {
            if (discount.discount_type === 'percent') {
              discountAmount = estimatedPrice * (discount.discount_value / 100)
            } else if (discount.discount_type === 'fixed') {
              discountAmount = discount.discount_value
            }

            // Update usage count
            await anySupabase
              .from('discount_codes')
              .update({ uses_count: (discount.uses_count || 0) + 1 })
              .eq('id', discount.id)
          }
        }
      }
    }

    // Create the booking
    const { data: bookingData, error: bookingError } = await anySupabase
      .from('client_bookings')
      .insert({
        client_id: clientId,
        property_address: propertyAddress,
        property_city: propertyCity,
        property_state: propertyState,
        property_zip: propertyZip,
        property_type: propertyType,
        square_feet: squareFeet,
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        package_id: packageId,
        package_name: packageName,
        services: services,
        addons: addons,
        preferred_date: preferredDate,
        preferred_time_slot: preferredTimeSlot,
        alternate_dates: alternateDates,
        is_flexible: isFlexible,
        scheduling_notes: schedulingNotes,
        special_instructions: specialInstructions,
        access_notes: accessNotes,
        estimated_price: estimatedPrice,
        discount_code: discountCode,
        discount_amount: discountAmount,
        status: 'pending',
      })
      .select('id')
      .single()

    const booking = bookingData as Pick<ClientBooking, 'id'> | null

    if (bookingError || !booking) {
      console.error('Error creating booking:', bookingError)
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      )
    }

    // Send confirmation email (you would implement this)
    // await sendBookingConfirmationEmail(contactEmail, booking)

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      estimatedPrice,
      discountAmount,
      message: 'Booking submitted successfully. We will contact you with a quote.',
    })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
