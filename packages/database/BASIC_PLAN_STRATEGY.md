# Basic Plan Strategy (30 Requests/Month)

## 🎯 **Goal: Maximize Value from 30 API Requests**

With only 30 requests per month on the Basic plan, every API call must be strategic and high-value.

## 📊 **Your Database Analysis Results**

From your previous analysis:
- **Total fragrances**: 30,593
- **Quality Score**: 90/100 (EXCELLENT)
- **Missing data opportunities**:
  - Base notes: 5.7% missing (1,744 fragrances)
  - Heart notes: 5.7% missing (1,744 fragrances)
  - Year: 27.2% missing (8,321 fragrances)
  - Rating: 35.6% missing (10,891 fragrances)
  - Concentration: 66.0% missing (20,191 fragrances)

## 🎯 **Strategic Approach**

### Phase 1: Test API Connection (1-2 requests)
```bash
npm run db:test-quick  # Uses 1 request
```

### Phase 2: Target High-Value Fragrances (23-27 requests)
```bash
npm run db:seed-basic  # Uses 25 requests strategically
```

## 🔍 **What `db:seed-basic` Does**

Our intelligent seeding will prioritize:

1. **Popular Brands First**: Chanel, Dior, Tom Ford, Creed
2. **Missing Critical Data**: Focus on fragrances missing notes/ratings
3. **High-Impact Fragrances**: Well-known fragrances that users will search for
4. **Diverse Selection**: Spread across different fragrance families

## 💡 **Maximizing Strategy**

### Target Selection Criteria:
- ✅ **Popular brands** (Chanel, Dior, Tom Ford, Guerlain, Creed)
- ✅ **Missing key data** (notes, ratings, concentration)
- ✅ **Recent releases** (2020+)
- ✅ **High search potential** (iconic fragrances)
- ✅ **Diverse fragrance families** (woody, floral, fresh, oriental)

### What We'll Skip:
- ❌ Obscure or niche brands
- ❌ Fragrances with complete data
- ❌ Discontinued fragrances
- ❌ Duplicate variations

## 🚀 **Execution Plan**

### Week 1: API Testing & Setup
```bash
# Test API connection (1 request)
npm run db:test-quick

# If working, proceed to seeding
npm run db:seed-basic  # 25 requests
```

### Week 2-4: Use Hybrid Service
Once seeded, use the hybrid service for:
- 95%+ queries from local database
- Only new/missing data from API
- Efficient caching strategy

## 📈 **Expected Results**

With 25 strategic API calls, you should get:
- **25 high-value fragrances** enriched with complete data
- **Popular brands** well-represented
- **Missing notes/ratings** filled for key fragrances
- **Solid foundation** for hybrid service

## 🔄 **Monthly Refresh Strategy**

Each month, use your 30 requests to:
1. **5 requests**: Test and validate API
2. **25 requests**: Target new high-priority fragrances
3. **Focus areas**: New releases, trending brands, user-requested fragrances

## 🎛️ **Configuration Options**

### Environment Variables (.env):
```bash
PERFUMERO_API_KEY="your-key-here"
PERFUMERO_BASE_URL="https://perfumero1.p.rapidapi.com"
PERFUMERO_MONTHLY_LIMIT=30
```

### Custom Seeding:
```bash
# Ultra-conservative (10 requests)
npm run db:seed-intelligent -- --max-requests=10

# Test mode (dry run, 0 requests)
npm run db:seed-intelligent-dry
```

## 🎯 **Priority Targeting**

Our seeding algorithm will target fragrances in this order:

1. **Tier 1**: Chanel, Dior, Tom Ford (8-10 requests)
2. **Tier 2**: Creed, Guerlain, Armani (6-8 requests)
3. **Tier 3**: Popular niche brands (4-6 requests)
4. **Tier 4**: Trending/new releases (2-4 requests)

## 🔮 **Long-term Strategy**

### Month 1: Foundation Building
- Target iconic fragrances
- Fill critical missing data
- Establish high-quality baseline

### Month 2: Expansion
- Target user-requested fragrances
- Fill gaps in popular categories
- Add seasonal/trending scents

### Month 3+: Maintenance
- Update ratings/reviews
- Add new releases
- Respond to user needs

## 🎁 **Bonus: Free Optimization**

While limited on API calls, you can still:
- ✅ **Strategic cleanup** of existing data
- ✅ **Brand deduplication**
- ✅ **Data standardization**
- ✅ **Similarity algorithms** using existing data
- ✅ **Caching optimization**

## 🚨 **Warning Signs**

Stop seeding if you see:
- Multiple 429 errors (rate limiting)
- 403 errors (subscription issues)
- Low-quality API responses
- Hitting monthly limit early

## 📊 **Success Metrics**

After using 25 requests, you should have:
- **25 perfectly enriched fragrances**
- **Complete notes data** for targeted fragrances
- **Ratings and reviews** for popular scents
- **Strong foundation** for hybrid service
- **95%+ local query success rate**

## 🎯 **Ready to Start?**

1. **Test API**: `npm run db:test-quick`
2. **If working**: `npm run db:seed-basic`
3. **Monitor progress**: Watch the logs
4. **Use hybrid service**: 95% local, 5% API calls

Your 30 requests will go much further with this strategic approach!
