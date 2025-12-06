-- Fix foreign key constraint for licenses table
-- This allows CreatedBy to be NULL and sets ON DELETE SET NULL

-- Drop existing foreign key constraint if it exists
ALTER TABLE `licenses` 
DROP FOREIGN KEY IF EXISTS `fk_licenses_admin`;

-- Add new foreign key constraint with ON DELETE SET NULL
ALTER TABLE `licenses`
ADD CONSTRAINT `fk_licenses_admin` 
FOREIGN KEY (`created_by`) 
REFERENCES `admins` (`id`) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Also ensure created_by column allows NULL
ALTER TABLE `licenses` 
MODIFY COLUMN `created_by` INT UNSIGNED NULL;

