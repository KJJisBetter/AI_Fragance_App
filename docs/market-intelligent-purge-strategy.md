# Market-Intelligent Database Purge & API Growth Strategy

## Overview

This implementation transforms a polluted fragrance database (32,486 entries with 60-70% bad data) into a lean, market-intelligent system using a smart caching strategy:

- **Database = Hot Cache**: Popular/viral fragrances users search often
- **API = Cold Storage**: Rare/niche queries that don't justify database space
- **Smart Promotion**: High-quality API results get promoted to database over time

## Architecture

```
User Search → Database (Hot Cache) → Found? Return Fast!
                 ↓ Not Found
              API (Cold Storage) → Popular/Quality? → Promote to DB
                                      ↓ No
                                 Return API-Only
```

## Implementation Components

### 1. Database Schema Updates

Added market intelligence and quality tracking fields:

```typescript
// Market Intelligence Fields
marketPriority: Float      // 0.0-1.0 based on brand tiers
trending: Boolean         // Based on 2025 market data
targetDemographic: String // gen_z, budget_conscious, niche_enthusiast, mainstream
viralScore: Float        // TikTok/social media virality

// API Integration Fields
externalId: String       // Perfumero API ID
dataSource: String       // manual, perfumero_api_promoted, api_only
populatedAt: DateTime    // When populated from API
promotedAt: DateTime     // When promoted from API to database
promotionReason: String  // tier1_brand, high_rating, popular, trending

// Data Quality Fields
dataQuality: Float                // 0.0-1.0 quality score
hasRedundantName: Boolean        // e.g., "Oscar Oscar de la Renta"
hasYearInName: Boolean          // e.g., "Sauvage 2015"
hasConcentrationInName: Boolean // e.g., "Bleu de Chanel EDT"
```

### 2. Strategic Purge Scripts

#### `identify-hot-cache.ts`
Identifies fragrances to keep based on:
- Market priority brands (Tier 1-4)
- Popular/viral fragrances
- User engagement (battles, reviews, collections)
- Data quality metrics

#### `execute-purge.ts`
Safely executes the purge:
- Creates full backup
- Archives deleted data for recovery
- Updates quality flags
- Provides rollback capability

### 3. Organic Population Service

Smart API integration that:
- Searches database first (hot cache)
- Falls back to API for missing items
- Promotes quality results to database
- Tracks API usage (< 10% of limit)

### 4. Market Intelligence

**Tier 1 (Luxury/Designer) - Highest Priority:**
- Dior, Chanel, Tom Ford, Creed, Armani, Versace, YSL
- Jean Paul Gaultier (189% growth), Azzaro, Prada, Valentino

**Tier 2 (Niche Artisan):**
- Parfums de Marly, Diptyque, MFK, Le Labo, Byredo
- Amouage, Xerjoff

**Tier 3 (Clone/Dupe Brands):**
- Lattafa, Armaf, Dossier, ALT Fragrances, Zara

**Tier 4 (Celebrity):**
- Ariana Grande, Billie Eilish, Bella Hadid

## Usage

### Run Strategic Purge

```bash
# 1. Dry run to see what would be purged
npm run purge:dry-run

# 2. Execute the actual purge
npm run purge:execute

# 3. Monitor results
npm run purge:stats
```

### API Integration

The system automatically:
1. Searches database for popular items (fast)
2. Uses API for rare queries (efficient)
3. Promotes quality API results to database
4. Maintains < 10% API usage

### Admin Monitoring

```bash
# Start the API server
npm run dev

# Access admin endpoints:
GET /api/admin/population-stats    # Overall statistics
GET /api/admin/market-coverage     # Brand tier coverage
GET /api/admin/data-quality        # Quality metrics
POST /api/admin/purge/dry-run      # Test purge impact
```

## Expected Results

### Immediate (Post-Purge)
- Database size: ~10,000 fragrances (70% reduction)
- Data quality: 95%+ clean naming
- Market coverage: 100% of Tier 1 brands
- Search speed: <50ms for hot cache hits

### Ongoing (With API Growth)
- API usage: <1,000 requests/month (10% of limit)
- Smart growth: Only quality/popular items added
- Market alignment: 80%+ additions are Tier 1-3 brands
- User satisfaction: Fast searches for popular items

## Rollback Strategy

If issues arise:

```sql
-- Emergency rollback
DROP TABLE fragrances;
ALTER TABLE fragrances_backup_[timestamp] RENAME TO fragrances;
```

## Key Benefits

1. **Lightning Fast Popular Searches**: Dior Sauvage, Baccarat Rouge 540, etc. in database
2. **Efficient API Usage**: Only for rare queries, stays under 10% limit
3. **Intelligent Growth**: Database grows based on actual usage patterns
4. **Market Aligned**: Prioritizes brands users actually search for
5. **Quality Focus**: No more "Oscar Oscar de la Renta 1977 EDT" entries

## Implementation Timeline

- Week 1: Run purge, establish hot cache
- Week 2: Monitor API usage patterns
- Week 3: Analyze promotion effectiveness
- Month 1: Evaluate coverage metrics

## Success Metrics

Monitor these KPIs:
- Hot cache hit rate (target: >80%)
- API usage percentage (target: <10%)
- Average search latency (target: <100ms)
- Data quality score (target: >90%)
- Market tier coverage (target: 95% Tier 1)
