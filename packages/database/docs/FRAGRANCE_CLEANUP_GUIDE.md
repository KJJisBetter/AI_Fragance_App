# 🧹 Fragrance Name Cleanup Guide

## Overview

This guide provides step-by-step instructions for safely cleaning up brand name redundancy in the fragrance database. The cleanup addresses issues like "Atelier Versace - Gingembre Pétillant Versace 2021" becoming "Gingembre Pétillant 2021".

## 🚨 CRITICAL SAFETY REQUIREMENTS

**⚠️ NEVER run cleanup on production without testing on staging first!**

### Pre-Execution Checklist

- [ ] **Database Backup**: Full database backup completed
- [ ] **Staging Test**: Script tested successfully on staging environment
- [ ] **Validation Ready**: Validation queries prepared and tested
- [ ] **Rollback Plan**: Rollback procedure confirmed and tested
- [ ] **Monitoring Setup**: Database monitoring active during execution
- [ ] **Team Notification**: Team notified of maintenance window

## 📋 Implementation Steps

### Step 1: Pre-Cleanup Validation

```bash
# Check current state of the database
cd packages/database
node tests/fragrance-cleanup.test.js

# Get baseline statistics
npm run db:studio
# Navigate to fragrances table and count current entries
```

### Step 2: Create Development Test Environment

```bash
# Create test database dump (if needed)
pg_dump fragrance_battle_ai > backup_pre_cleanup_$(date +%Y%m%d_%H%M).sql

# Run dry run to see what would be changed
cd packages/database
npx tsx scripts/clean-fragrance-names.ts --dry-run
```

**Expected Dry Run Output:**
```
🚀 Starting fragrance name cleanup process...
Mode: DRY RUN
📊 Total fragrances to process: 1234
🔍 DRY RUN: Processing sample of 50 fragrances...
[DRY RUN] WOULD CLEAN: "Atelier Versace - Éclat de Rose Versace 2019" → "Éclat de Rose 2019" (atelierVersace)
```

### Step 3: Staging Environment Testing

```bash
# On staging environment:
# 1. Create backup
# 2. Run full cleanup
# 3. Validate results
# 4. Test UI components

# Full staging cleanup
npx tsx scripts/clean-fragrance-names.ts --batch-size=50

# Validate staging results
node tests/fragrance-cleanup.test.js
```

### Step 4: Production Execution

**Only after successful staging validation!**

```bash
# Production execution steps:

# 1. Create production backup
pg_dump fragrance_battle_ai > backup_production_$(date +%Y%m%d_%H%M).sql

# 2. Start with small batch
npx tsx scripts/clean-fragrance-names.ts --batch-size=10

# 3. Monitor and validate first batch
node tests/fragrance-cleanup.test.js

# 4. If successful, continue with larger batches
npx tsx scripts/clean-fragrance-names.ts --batch-size=100
```

## 🔄 Rollback Procedures

### Automatic Rollback (Recommended)

The cleanup script creates a backup column automatically:

```bash
# Option 1: Use built-in rollback
npx tsx scripts/clean-fragrance-names.ts --rollback
```

### Manual Rollback

If automatic rollback fails:

```sql
-- Check backup column exists
SELECT COUNT(*) FROM fragrances WHERE name_original IS NOT NULL;

-- Restore original names
UPDATE fragrances
SET name = name_original
WHERE name_original IS NOT NULL;

-- Verify restoration
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN name = name_original THEN 1 END) as restored
FROM fragrances
WHERE name_original IS NOT NULL;
```

### Complete Database Restore

As last resort, restore from backup:

```bash
# Stop all connections to database
# Restore from backup file
pg_restore --clean --no-owner --no-privileges -d fragrance_battle_ai backup_production_YYYYMMDD_HHMM.sql
```

## 📊 Validation Queries

### Check Cleanup Success

```sql
-- Overall cleanup statistics
SELECT
  COUNT(*) as total_fragrances,
  COUNT(CASE WHEN name != name_original THEN 1 END) as cleaned_count,
  COUNT(CASE WHEN name = name_original THEN 1 END) as unchanged_count,
  ROUND(
    COUNT(CASE WHEN name != name_original THEN 1 END) * 100.0 / COUNT(*),
    2
  ) as cleanup_percentage
FROM fragrances
WHERE name_original IS NOT NULL;
```

### Check for Remaining Issues

```sql
-- Look for patterns that should have been cleaned
SELECT name, brand, name_original
FROM fragrances
WHERE (
  name ILIKE '%Atelier Versace -%Versace%' OR
  name ILIKE '%Versace %Versace%' OR
  name ~ '.+ Versace 20[0-9][0-9]$'
)
LIMIT 10;
```

### Verify No Data Loss

```sql
-- Check for suspiciously short names
SELECT name, brand, name_original, LENGTH(name) as len
FROM fragrances
WHERE LENGTH(TRIM(name)) < 3
ORDER BY len;

-- Check year preservation
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN name ~ '[0-9]{4}' THEN 1 END) as with_years,
  COUNT(CASE WHEN name_original ~ '[0-9]{4}' THEN 1 END) as original_with_years
FROM fragrances
WHERE name_original IS NOT NULL;
```

## 🎯 Success Criteria

### ✅ Cleanup is Successful When:

1. **Brand Redundancy Eliminated**: No more "Brand Product Brand Year" patterns
2. **Data Preserved**: No fragrance names lost or corrupted
3. **Years Maintained**: All year information preserved
4. **UI Functional**: Frontend displays clean names correctly
5. **Performance Maintained**: No significant slowdown in queries
6. **Rollback Tested**: Rollback procedure confirmed working

### 📈 Expected Results:

- **Cleanup Rate**: 60-80% of Versace fragrances should be cleaned
- **Performance**: Script should complete in under 5 minutes for 1000+ fragrances
- **Quality**: No names shorter than 2 characters after cleaning
- **Preservation**: 100% of original names backed up in `name_original` column

## 🐛 Troubleshooting

### Common Issues

**Issue**: Script fails with "column does not exist"
```bash
# Solution: Ensure database schema is up to date
npm run db:push
```

**Issue**: Very slow performance
```bash
# Solution: Reduce batch size
npx tsx scripts/clean-fragrance-names.ts --batch-size=25
```

**Issue**: Names too short after cleaning
```bash
# Check for over-aggressive cleaning
SELECT name, name_original, brand
FROM fragrances
WHERE LENGTH(name) < LENGTH(name_original) * 0.3;
```

### Emergency Procedures

**If cleanup corrupts data:**
1. Stop the script immediately (Ctrl+C)
2. Run rollback: `npx tsx scripts/clean-fragrance-names.ts --rollback`
3. Validate rollback with validation queries
4. If rollback fails, restore from backup
5. Document issue and analyze logs

**If UI breaks after cleanup:**
1. Check browser console for errors
2. Clear React cache: `rm -rf node_modules/.cache`
3. Restart development server: `npm run dev`
4. Test with sample data to isolate issue

## 📝 Execution Log Template

Use this template to document your cleanup execution:

```
## Fragrance Cleanup Execution Log

**Date**: YYYY-MM-DD
**Environment**: [Staging/Production]
**Operator**: [Your Name]

### Pre-Execution
- [ ] Database backup created: [backup_filename]
- [ ] Staging test completed: [Success/Issues]
- [ ] Team notified: [Yes/No]

### Execution
- **Start Time**: HH:MM
- **Batch Size**: [Number]
- **Total Fragrances**: [Number]
- **Cleaned Count**: [Number]
- **Errors**: [Number]
- **End Time**: HH:MM

### Validation
- [ ] Redundancy check passed
- [ ] No short names detected
- [ ] Year preservation verified
- [ ] UI functionality confirmed

### Issues Encountered
[Document any issues and resolutions]

### Rollback Plan Status
- [ ] Backup column verified
- [ ] Rollback script tested
- [ ] Database backup confirmed

**Status**: [Success/Failed/Partial]
```

## 🔧 Maintenance

### Post-Cleanup Tasks

1. **Monitor Performance**: Watch database query performance for 24-48 hours
2. **User Feedback**: Monitor for user reports of display issues
3. **Analytics Check**: Verify search functionality still works correctly
4. **Backup Retention**: Keep cleanup backups for at least 30 days

### Future Prevention

1. **Data Validation**: Add validation rules to prevent future redundancy
2. **Import Scripts**: Update import scripts to clean names on entry
3. **API Validation**: Add server-side validation for fragrance name formats
4. **Regular Monitoring**: Set up alerts for redundancy pattern detection

## 📞 Support Contacts

**For Issues During Cleanup:**
- Emergency: Stop script and run rollback
- Database Issues: Restore from backup
- UI Issues: Clear cache and restart development server

**Documentation:**
- Cleanup Script: `packages/database/scripts/clean-fragrance-names.ts`
- Validation Tests: `packages/database/tests/fragrance-cleanup.test.js`
- React Components: `apps/web/src/components/fragrance/FragranceCard.tsx`

## 🎯 Summary

This cleanup process safely removes brand name redundancy while preserving all original data. The key to success is thorough testing on staging, careful monitoring during execution, and having a solid rollback plan.

**Remember**: When in doubt, rollback and investigate. Data safety is more important than perfect names!
