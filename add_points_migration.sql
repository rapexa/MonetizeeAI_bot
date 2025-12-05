-- Migration: Add points field to users table
-- This migration adds the points column to track user quiz scores

-- Check if column exists before adding (MySQL 8.0+)
-- For older MySQL versions, you may need to remove the IF NOT EXISTS check

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS points INT DEFAULT 0 
AFTER monthly_income;

-- Update existing users to have 0 points if they are NULL
UPDATE users SET points = 0 WHERE points IS NULL;

-- Verify the column was added
-- SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = DATABASE() 
-- AND TABLE_NAME = 'users' 
-- AND COLUMN_NAME = 'points';

