-- Enable the pg_trgm extension for better text search (must be first)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add indexes for better search performance
-- These indexes will significantly improve query performance for common search operations

-- Index for fragrance name searches (case-insensitive)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fragrance_name_gin ON fragrances USING gin(lower(name) gin_trgm_ops);

-- Index for brand searches (case-insensitive)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fragrance_brand_gin ON fragrances USING gin(lower(brand) gin_trgm_ops);

-- Index for rating sorting (most commonly used sort) - using correct column name
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fragrance_rating ON fragrances("communityRating" DESC NULLS LAST);

-- Index for AI categories (GIN indexes for array operations) - using correct column names
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fragrance_ai_seasons ON fragrances USING gin("aiSeasons");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fragrance_ai_occasions ON fragrances USING gin("aiOccasions");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fragrance_ai_moods ON fragrances USING gin("aiMoods");

-- Note: These indexes were already created successfully:
-- idx_fragrance_year, idx_fragrance_concentration, idx_fragrance_verified, idx_fragrance_brand_year
