-- Rollback script generated on 2025-07-10T01:52:53.197Z
-- This script will restore original fragrance names

-- Restore original names from backup column
UPDATE fragrances SET name = name_original WHERE name_original IS NOT NULL;

-- Drop backup column (optional - uncomment if needed)
-- ALTER TABLE fragrances DROP COLUMN name_original;

-- Summary: 23096 changes will be reverted
