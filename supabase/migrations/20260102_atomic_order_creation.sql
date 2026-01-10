-- Atomic Order & Listing Creation RPC
-- Ensures that an Order and its associated Listing are created in a single transaction.
-- Generated: 2026-01-02

CREATE OR REPLACE FUNCTION create_order_and_listing(
  p_agent_id UUID,
  p_service_type TEXT,
  p_package_key TEXT,
  p_package_name TEXT,
  p_sqft_tier TEXT,
  p_services JSONB,
  p_subtotal_cents INTEGER,
  p_discount_cents INTEGER,
  p_tax_cents INTEGER,
  p_total_cents INTEGER,
  p_property_address TEXT,
  p_property_city TEXT,
  p_property_state TEXT,
  p_property_zip TEXT,
  p_property_sqft INTEGER,
  p_property_beds INTEGER,
  p_property_baths DECIMAL,
  p_contact_name TEXT,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_scheduled_at TIMESTAMPTZ,
  p_payment_intent_id TEXT,
  p_payment_status TEXT,
  p_special_instructions TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Use security definer to allow insertion even if RLS might block parts (though careful checks needed)
AS $$
DECLARE
  v_listing_id UUID;
  v_order_record RECORD;
  v_listing_record RECORD;
BEGIN
  -- 1. Create the Listing
  INSERT INTO listings (
    agent_id,
    address,
    city,
    state,
    zip,
    sqft,
    beds,
    baths,
    ops_status,
    contact_name,
    contact_email,
    contact_phone,
    scheduled_at,
    special_instructions
  ) VALUES (
    p_agent_id,
    p_property_address,
    p_property_city,
    p_property_state,
    p_property_zip,
    p_property_sqft,
    p_property_beds,
    p_property_baths,
    'pending', -- Default ops_status
    p_contact_name,
    p_contact_email,
    p_contact_phone,
    p_scheduled_at,
    p_special_instructions
  )
  RETURNING * INTO v_listing_record;
  
  v_listing_id := v_listing_record.id;

  -- 2. Create the Order linked to the Listing
  INSERT INTO orders (
    agent_id,
    listing_id,
    service_type,
    package_key,
    package_name,
    sqft_tier,
    services,
    subtotal_cents,
    discount_cents,
    tax_cents,
    total_cents,
    property_address,
    property_city,
    property_state,
    property_zip,
    property_sqft,
    property_beds,
    property_baths,
    contact_name,
    contact_email,
    contact_phone,
    scheduled_at,
    status,
    payment_intent_id,
    payment_status,
    special_instructions
  ) VALUES (
    p_agent_id,
    v_listing_id,
    p_service_type,
    p_package_key,
    p_package_name,
    p_sqft_tier,
    p_services,
    p_subtotal_cents,
    p_discount_cents,
    p_tax_cents,
    p_total_cents,
    p_property_address,
    p_property_city,
    p_property_state,
    p_property_zip,
    p_property_sqft,
    p_property_beds,
    p_property_baths,
    p_contact_name,
    p_contact_email,
    p_contact_phone,
    p_scheduled_at,
    'pending', -- Default status
    p_payment_intent_id,
    p_payment_status,
    p_special_instructions
  )
  RETURNING * INTO v_order_record;

  -- Return the created order combined with listing_id explicitly in top level if needed, 
  -- though v_order_record has listing_id.
  -- returning a composed object for clarity in the API response
  RETURN jsonb_build_object(
    'order', to_jsonb(v_order_record),
    'listing', to_jsonb(v_listing_record)
  );
END;
$$;
