# Strategic Purge Implementation Guide

This guide walks you through implementing the market-intelligent database purge and API growth strategy.

## Prerequisites

1. Ensure Docker is running:
```bash
docker-compose up -d postgres redis
```

2. Run database migrations:
```bash
cd packages/database
npx prisma migrate deploy
```

## Step 1: Apply Schema Updates

The schema has been updated with market intelligence fields. Generate the Prisma client:

```bash
cd packages/database
npm run db:generate
```

## Step 2: Identify Hot Cache Candidates (Dry Run)

First, see what would be kept in the database:

```bash
cd apps/api
npm run purge:identify
```

This will show:
- How many fragrances would be kept
- Market coverage breakdown (Tier 1-4 brands)
- Quality metrics

## Step 3: Execute Purge Dry Run

See what would happen without making changes:

```bash
npm run purge:dry-run
```

Review the output carefully:
- Sample of fragrances to be purged
- Final statistics
- Market coverage after purge

## Step 4: Execute the Actual Purge

⚠️ **IMPORTANT**: This will permanently modify your database. A backup will be created automatically.

```bash
npm run purge:execute
```

The script will:
1. Create a timestamped backup table
2. Archive fragrances to be deleted
3. Execute the purge
4. Update quality flags
5. Show final statistics

## Step 5: Verify Results

Check the results:

```bash
# Start the API server
npm run dev

# In another terminal, check stats
npm run purge:stats
```

Or use the admin endpoints directly:
- http://localhost:3001/api/admin/population-stats
- http://localhost:3001/api/admin/market-coverage
- http://localhost:3001/api/admin/data-quality

## Step 6: Test Search with API Population

Test that the organic population works:

```bash
# Search for a popular fragrance (should be in DB)
curl -X POST http://localhost:3001/api/fragrances/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Dior Sauvage", "limit": 10}'

# Search for a rare fragrance (will use API)
curl -X POST http://localhost:3001/api/fragrances/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Obscure Niche Brand XYZ", "limit": 10}'
```

## Monitoring

### Daily Checks
- API usage: Should stay under 333 requests/day
- New promotions: Quality fragrances being added
- Error rate: Should be minimal

### Weekly Analysis
- Market coverage growth
- Popular search patterns
- API promotion effectiveness

## Rollback (If Needed)

If something goes wrong, you can restore from backup:

```sql
-- Connect to your database
-- Find your backup table (check the timestamp)
SELECT tablename FROM pg_tables WHERE tablename LIKE 'fragrances_backup_%';

-- Restore (replace timestamp)
DROP TABLE fragrances;
ALTER TABLE fragrances_backup_2024-01-14T10-30-45-123Z RENAME TO fragrances;
```

## Next Steps

1. **Monitor API Usage**: Keep an eye on the 10,000/month limit
2. **Analyze Search Patterns**: See what users actually search for
3. **Adjust Market Priorities**: Update brand lists based on trends
4. **Regular Quality Checks**: Run quality reports monthly

## Troubleshooting

### "Cannot find module" errors
```bash
cd packages/database
npm run build
cd ../../apps/api
npm run build
```

### Database connection issues
```bash
# Check if PostgreSQL is running
docker ps
# Restart if needed
docker-compose restart postgres
```

### High API usage
- Check the organic population service logs
- Increase the cache duration if needed
- Add more popular terms to the hot cache list

## Success Indicators

You'll know the purge was successful when:
- ✅ Database size reduced by 60-70%
- ✅ Search for "Dior Sauvage" returns instantly
- ✅ API usage stays under 10% monthly limit
- ✅ No more "Brand Brand Name Year EDT" entries
- ✅ All Tier 1 brands well represented
