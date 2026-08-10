-- Add CHECK constraint to ensure rating is in valid range (0-5) or NULL
ALTER TABLE comics
ADD CONSTRAINT rating_range_check
CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));
