-- Migration: Add support for multiple cover URLs per comic
-- Date: 2026-08-10
-- Purpose: Allow storing alternative cover URLs for fallback/rotation

-- Add cover_urls column to store array of URLs
ALTER TABLE comics
ADD COLUMN IF NOT EXISTS cover_urls JSONB DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_comics_cover_urls ON comics USING gin(cover_urls);

-- Migrate existing cover_url to cover_urls array for backward compatibility
UPDATE comics
SET cover_urls = CASE
  WHEN cover_url IS NOT NULL THEN jsonb_build_array(cover_url)
  ELSE NULL
END
WHERE cover_urls IS NULL AND cover_url IS NOT NULL;

-- Create function to get primary cover URL (first in array or cover_url field)
CREATE OR REPLACE FUNCTION get_primary_cover_url(comic_id UUID)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Try to get first URL from cover_urls array
  SELECT INTO result
    cover_urls->>0
  FROM comics
  WHERE id = comic_id;

  -- If not found, fall back to cover_url field
  IF result IS NULL THEN
    SELECT INTO result
      cover_url
    FROM comics
    WHERE id = comic_id;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policy for cover_urls if needed
-- (Assuming similar policies exist for other columns)
