-- Made idempotent: 2026-01-07
-- Phase 7: Processing Visibility & Error Recovery
-- Migration: Add retry capability to processing_jobs

-- Add retry columns to processing_jobs
ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS can_retry BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;

-- Add index for finding retryable jobs
CREATE INDEX IF NOT EXISTS idx_processing_jobs_retryable
  ON processing_jobs(status, can_retry, retry_count)
  WHERE status = 'failed' AND can_retry = true;

-- Function to check if job can be retried
CREATE OR REPLACE FUNCTION can_retry_job(job_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  job_record RECORD;
BEGIN
  SELECT status, can_retry, retry_count, max_retries
  INTO job_record
  FROM processing_jobs
  WHERE id = job_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Only failed jobs can be retried
  IF job_record.status != 'failed' THEN
    RETURN FALSE;
  END IF;

  -- Check if retries are enabled
  IF NOT job_record.can_retry THEN
    RETURN FALSE;
  END IF;

  -- Check if max retries exceeded
  IF job_record.retry_count >= job_record.max_retries THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to prepare job for retry
CREATE OR REPLACE FUNCTION prepare_job_for_retry(job_id UUID)
RETURNS processing_jobs AS $$
DECLARE
  job_record processing_jobs;
BEGIN
  -- Check if job can be retried
  IF NOT can_retry_job(job_id) THEN
    RAISE EXCEPTION 'Job cannot be retried';
  END IF;

  -- Update job for retry
  UPDATE processing_jobs
  SET
    status = 'pending',
    retry_count = retry_count + 1,
    last_retry_at = NOW(),
    error_message = NULL,
    started_at = NULL,
    completed_at = NULL,
    webhook_received_at = NULL
  WHERE id = job_id
  RETURNING * INTO job_record;

  -- Reset associated media assets
  UPDATE media_assets
  SET qc_status = 'processing'
  WHERE processing_job_id = job_id;

  RETURN job_record;
END;
$$ LANGUAGE plpgsql;

-- View for jobs needing attention
CREATE OR REPLACE VIEW jobs_needing_attention AS
SELECT
  pj.*,
  l.address as listing_address,
  CASE
    WHEN pj.status = 'failed' AND can_retry_job(pj.id) THEN 'retryable'
    WHEN pj.status = 'failed' AND NOT can_retry_job(pj.id) THEN 'needs_manual'
    WHEN pj.status = 'processing' AND pj.started_at < NOW() - INTERVAL '10 minutes' THEN 'stuck'
    ELSE 'normal'
  END as attention_type,
  pj.retry_count as attempt_number
FROM processing_jobs pj
LEFT JOIN listings l ON l.id = pj.listing_id
WHERE
  pj.status = 'failed'
  OR (pj.status = 'processing' AND pj.started_at < NOW() - INTERVAL '10 minutes')
ORDER BY
  CASE
    WHEN pj.status = 'processing' THEN 0 -- Stuck jobs first
    WHEN pj.status = 'failed' AND can_retry_job(pj.id) THEN 1 -- Retryable next
    ELSE 2 -- Manual review last
  END,
  pj.created_at DESC;

COMMENT ON COLUMN processing_jobs.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN processing_jobs.last_retry_at IS 'Timestamp of last retry attempt';
COMMENT ON COLUMN processing_jobs.can_retry IS 'Whether this job can be retried (false for permanent failures)';
COMMENT ON COLUMN processing_jobs.max_retries IS 'Maximum number of retry attempts allowed';
