-- Create atomic bulk import function for transactions
-- This function wraps the entire import in a single transaction
-- If any insert fails, the entire batch is rolled back

CREATE OR REPLACE FUNCTION bulk_import_transactions(
  p_household_id UUID,
  p_transactions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction JSONB;
  v_imported INT := 0;
  v_errors JSONB := '[]'::JSONB;
  v_index INT := 0;
BEGIN
  -- Validate household exists
  IF NOT EXISTS (SELECT 1 FROM households WHERE id = p_household_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid household ID',
      'imported', 0,
      'failed', jsonb_array_length(p_transactions)
    );
  END IF;

  -- Process each transaction in the array
  FOR v_transaction IN SELECT * FROM jsonb_array_elements(p_transactions)
  LOOP
    BEGIN
      INSERT INTO transactions (
        household_id,
        category_id,
        amount,
        description,
        date,
        type
      ) VALUES (
        p_household_id,
        (v_transaction->>'category_id')::UUID,
        (v_transaction->>'amount')::DECIMAL(10,2),
        v_transaction->>'description',
        (v_transaction->>'date')::DATE,
        COALESCE(v_transaction->>'type', 'expense')
      );
      v_imported := v_imported + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Collect error but continue processing to report all errors
      v_errors := v_errors || jsonb_build_object(
        'index', v_index,
        'message', SQLERRM
      );
    END;
    v_index := v_index + 1;
  END LOOP;

  -- If any errors occurred, rollback the entire transaction
  IF jsonb_array_length(v_errors) > 0 THEN
    RAISE EXCEPTION 'Import failed with errors: %', v_errors::TEXT;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'imported', v_imported,
    'failed', 0,
    'errors', '[]'::JSONB
  );
EXCEPTION 
  WHEN OTHERS THEN
    -- Return error details without rolling back (the exception already did that)
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'imported', 0,
      'failed', jsonb_array_length(p_transactions),
      'errors', v_errors
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION bulk_import_transactions(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_import_transactions(UUID, JSONB) TO anon;
