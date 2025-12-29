import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type ServicePackage = Database['public']['Tables']['service_packages']['Row']
type PackageItem = Database['public']['Tables']['package_items']['Row']
type PackageTier = Database['public']['Tables']['package_tiers']['Row']

// GET - List all packages with their items and tiers
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    // Get query params for filtering
    const searchParams = request.nextUrl.searchParams
    const activeOnly = searchParams.get('active') === 'true'

    // Build query
    let query = supabase
      .from('service_packages')
      .select('*')
      .order('display_order', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: packages, error: packagesError } = await query

    if (packagesError) {
      throw packagesError
    }

    // Get items and tiers for all packages
    const packageIds = packages?.map((p) => p.id) || []

    const [itemsResult, tiersResult] = await Promise.all([
      supabase
        .from('package_items')
        .select('*')
        .in('package_id', packageIds)
        .order('created_at', { ascending: true }),
      supabase
        .from('package_tiers')
        .select('*')
        .in('package_id', packageIds)
        .order('min_sqft', { ascending: true }),
    ])

    // Organize data by package
    const packagesWithDetails = packages?.map((pkg) => ({
      ...pkg,
      items: itemsResult.data?.filter((item) => item.package_id === pkg.id) || [],
      tiers: tiersResult.data?.filter((tier) => tier.package_id === pkg.id) || [],
    }))

    return NextResponse.json({ packages: packagesWithDetails })
  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    )
  }
}

// POST - Create a new package
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug, description, features, items, tiers, display_order, is_featured } = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('service_packages')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A package with this slug already exists' },
        { status: 400 }
      )
    }

    // Create package
    const { data: newPackage, error: packageError } = await supabase
      .from('service_packages')
      .insert({
        name,
        slug,
        description: description || null,
        features: features || [],
        display_order: display_order || 0,
        is_featured: is_featured || false,
        is_active: true,
      })
      .select()
      .single()

    if (packageError) {
      throw packageError
    }

    // Create package items if provided
    if (items && items.length > 0) {
      const itemInserts = items.map((item: { service_id: string; is_optional?: boolean; quantity?: number }) => ({
        package_id: newPackage.id,
        service_id: item.service_id,
        is_optional: item.is_optional || false,
        quantity: item.quantity || 1,
      }))

      const { error: itemsError } = await supabase
        .from('package_items')
        .insert(itemInserts)

      if (itemsError) {
        console.error('Error creating package items:', itemsError)
      }
    }

    // Create package tiers if provided
    if (tiers && tiers.length > 0) {
      const tierInserts = tiers.map((tier: { min_sqft: number; max_sqft: number | null; price_cents: number; tier_name?: string }) => ({
        package_id: newPackage.id,
        min_sqft: tier.min_sqft,
        max_sqft: tier.max_sqft,
        price_cents: tier.price_cents,
        tier_name: tier.tier_name || null,
      }))

      const { error: tiersError } = await supabase
        .from('package_tiers')
        .insert(tierInserts)

      if (tiersError) {
        console.error('Error creating package tiers:', tiersError)
      }
    }

    // Fetch complete package with items and tiers
    const [itemsResult, tiersResult] = await Promise.all([
      supabase
        .from('package_items')
        .select('*')
        .eq('package_id', newPackage.id),
      supabase
        .from('package_tiers')
        .select('*')
        .eq('package_id', newPackage.id)
        .order('min_sqft', { ascending: true }),
    ])

    return NextResponse.json({
      package: {
        ...newPackage,
        items: itemsResult.data || [],
        tiers: tiersResult.data || [],
      },
      message: 'Package created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating package:', error)
    return NextResponse.json(
      { error: 'Failed to create package' },
      { status: 500 }
    )
  }
}

// PATCH - Update a package
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, slug, description, features, items, tiers, display_order, is_featured, is_active } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      )
    }

    // Check if package exists
    const { data: existing } = await supabase
      .from('service_packages')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    // Check slug uniqueness if changing
    if (slug) {
      const { data: slugCheck } = await supabase
        .from('service_packages')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .single()

      if (slugCheck) {
        return NextResponse.json(
          { error: 'A package with this slug already exists' },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updates: Partial<ServicePackage> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (slug !== undefined) updates.slug = slug
    if (description !== undefined) updates.description = description
    if (features !== undefined) updates.features = features
    if (display_order !== undefined) updates.display_order = display_order
    if (is_featured !== undefined) updates.is_featured = is_featured
    if (is_active !== undefined) updates.is_active = is_active

    // Update package
    const { data: updatedPackage, error: updateError } = await supabase
      .from('service_packages')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Update items if provided (replace all)
    if (items !== undefined) {
      // Delete existing items
      await supabase
        .from('package_items')
        .delete()
        .eq('package_id', id)

      // Insert new items
      if (items.length > 0) {
        const itemInserts = items.map((item: { service_id: string; is_optional?: boolean; quantity?: number }) => ({
          package_id: id,
          service_id: item.service_id,
          is_optional: item.is_optional || false,
          quantity: item.quantity || 1,
        }))

        await supabase
          .from('package_items')
          .insert(itemInserts)
      }
    }

    // Update tiers if provided (replace all)
    if (tiers !== undefined) {
      // Delete existing tiers
      await supabase
        .from('package_tiers')
        .delete()
        .eq('package_id', id)

      // Insert new tiers
      if (tiers.length > 0) {
        const tierInserts = tiers.map((tier: { min_sqft: number; max_sqft: number | null; price_cents: number; tier_name?: string }) => ({
          package_id: id,
          min_sqft: tier.min_sqft,
          max_sqft: tier.max_sqft,
          price_cents: tier.price_cents,
          tier_name: tier.tier_name || null,
        }))

        await supabase
          .from('package_tiers')
          .insert(tierInserts)
      }
    }

    // Fetch complete package with items and tiers
    const [itemsResult, tiersResult] = await Promise.all([
      supabase
        .from('package_items')
        .select('*')
        .eq('package_id', id),
      supabase
        .from('package_tiers')
        .select('*')
        .eq('package_id', id)
        .order('min_sqft', { ascending: true }),
    ])

    return NextResponse.json({
      package: {
        ...updatedPackage,
        items: itemsResult.data || [],
        tiers: tiersResult.data || [],
      },
      message: 'Package updated successfully',
    })
  } catch (error) {
    console.error('Error updating package:', error)
    return NextResponse.json(
      { error: 'Failed to update package' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a package
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      )
    }

    // Check if package exists
    const { data: existing } = await supabase
      .from('service_packages')
      .select('id, name')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    // Delete package items and tiers first (cascade should handle this, but being explicit)
    await Promise.all([
      supabase.from('package_items').delete().eq('package_id', id),
      supabase.from('package_tiers').delete().eq('package_id', id),
    ])

    // Delete package
    const { error: deleteError } = await supabase
      .from('service_packages')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      message: `Package "${existing.name}" deleted successfully`,
    })
  } catch (error) {
    console.error('Error deleting package:', error)
    return NextResponse.json(
      { error: 'Failed to delete package' },
      { status: 500 }
    )
  }
}
