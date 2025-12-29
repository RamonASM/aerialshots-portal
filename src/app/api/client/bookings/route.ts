import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get client account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: client } = await (supabase as any)
      .from('client_accounts')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client account not found' }, { status: 404 })
    }

    // Get bookings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bookings, error } = await (supabase as any)
      .from('client_bookings')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })

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
      const { data: existingClient } = await (supabase as any)
        .from('client_accounts')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      clientId = existingClient?.id || null
    }

    // Create or get client account
    if (!clientId) {
      // Check if client exists by email
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingClientByEmail } = await (supabase as any)
        .from('client_accounts')
        .select('id')
        .eq('email', contactEmail.toLowerCase())
        .single()

      if (existingClientByEmail) {
        clientId = existingClientByEmail.id
      } else {
        // Create new client account
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newClient, error: clientError } = await (supabase as any)
          .from('client_accounts')
          .insert({
            email: contactEmail.toLowerCase(),
            first_name: contactFirstName,
            last_name: contactLastName,
            phone: contactPhone,
          })
          .select('id')
          .single()

        if (clientError) {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: discount } = await (supabase as any)
        .from('discount_codes')
        .select('*')
        .eq('code', discountCode.toUpperCase())
        .eq('is_active', true)
        .single()

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('discount_codes')
              .update({ uses_count: (discount.uses_count || 0) + 1 })
              .eq('id', discount.id)
          }
        }
      }
    }

    // Create the booking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: booking, error: bookingError } = await (supabase as any)
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

    if (bookingError) {
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
