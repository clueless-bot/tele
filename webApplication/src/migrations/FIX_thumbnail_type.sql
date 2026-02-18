-- Quick fix: Change thumbnail from varchar(500) to TEXT
-- Run this SQL directly in your database if migrations don't run automatically

ALTER TABLE uploads 
ALTER COLUMN thumbnail TYPE TEXT;

-- That's it! This removes the 500 character limit and allows unlimited base64 strings

