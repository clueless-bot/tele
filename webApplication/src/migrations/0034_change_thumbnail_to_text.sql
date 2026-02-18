-- Change thumbnail column from bytea/varchar to text (to store base64 strings)
-- This avoids encoding issues with binary data and size limitations

-- First check if column exists and what type it is, then convert accordingly
-- If it's bytea: convert to base64 text
-- If it's varchar: just change the type (data is already text)
-- If it's already text: no change needed

DO $$
BEGIN
    -- Check if column is bytea and convert to base64
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' 
        AND column_name = 'thumbnail' 
        AND data_type = 'bytea'
    ) THEN
        ALTER TABLE uploads 
        ALTER COLUMN thumbnail TYPE TEXT 
        USING encode(thumbnail, 'base64');
    -- If it's varchar, just change the type (no conversion needed)
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' 
        AND column_name = 'thumbnail' 
        AND data_type = 'character varying'
    ) THEN
        ALTER TABLE uploads 
        ALTER COLUMN thumbnail TYPE TEXT;
    -- If already text, do nothing
    END IF;
END $$;

-- Ensure it's NOT NULL (adjust if needed)
-- ALTER TABLE uploads ALTER COLUMN thumbnail SET NOT NULL;

