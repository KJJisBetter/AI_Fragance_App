# 🧪 Fragrance Search Testing Checklist

## 🔍 **Search Functionality Tests**

### Basic Search Tests
- [ ] Single word search ("creed", "chanel")
- [ ] Multi-word search ("good girl", "tom ford")
- [ ] Case insensitive search ("CREED", "cReEd")
- [ ] Partial matches ("aven" should find "Aventus")
- [ ] Brand-only search ("dior", "versace")
- [ ] Fragrance name search ("jadore", "black opium")
- [ ] Empty search (should show all)
- [ ] Special characters ("l'eau", "d&g")
- [ ] Numbers ("ck one", "212 vip")

### Edge Cases
- [ ] Very long search queries (>100 characters)
- [ ] Search with only spaces
- [ ] Search with special symbols (@#$%^&*)
- [ ] Non-English characters (accented letters)
- [ ] Search terms with apostrophes ("j'adore")
- [ ] Hyphenated terms ("eau-de-parfum")
- [ ] Common typos ("chanel" → "chanell")

### Search Performance
- [ ] Search response time < 500ms
- [ ] Search with 0 results
- [ ] Search with 1000+ results
- [ ] Rapid typing (debouncing works)
- [ ] Simultaneous searches from multiple tabs
- [ ] Search while other operations are running

## 🔧 **Filter & Sort Tests**

### Filter Combinations
- [ ] Single filter (brand only)
- [ ] Multiple filters (brand + season)
- [ ] All filters applied simultaneously
- [ ] Filter with search query
- [ ] Clear all filters
- [ ] Filter persistence across pages

### Sort Functionality
- [ ] Sort by name (A-Z, Z-A)
- [ ] Sort by brand (A-Z, Z-A)
- [ ] Sort by rating (high-low, low-high)
- [ ] Sort by year (new-old, old-new)
- [ ] Sort persistence across searches

### Brand Search
- [ ] Dynamic brand search works
- [ ] Brand dropdown appears/disappears
- [ ] Brand selection works
- [ ] Brand search debouncing
- [ ] Brand search with special characters

## 📱 **User Interface Tests**

### Responsive Design
- [ ] Mobile view (320px width)
- [ ] Tablet view (768px width)
- [ ] Desktop view (1200px+ width)
- [ ] Filters work on mobile
- [ ] Search bar responsive
- [ ] Cards display properly on all sizes

### Loading States
- [ ] Initial page load spinner
- [ ] Search loading indicator
- [ ] Filter loading states
- [ ] Pagination loading
- [ ] No results state
- [ ] Error states display properly

### Navigation
- [ ] Pagination works (next/prev)
- [ ] Direct page navigation
- [ ] URL updates with search params
- [ ] Back/forward browser navigation
- [ ] Search state preserved on page refresh

## ⚡ **Performance Tests**

### Load Testing
- [ ] 10 concurrent users searching
- [ ] 100 concurrent users (if possible)
- [ ] Rate limiting triggers correctly
- [ ] Server doesn't crash under load
- [ ] Database connection pooling works

### Memory & Resources
- [ ] Memory usage stays reasonable
- [ ] No memory leaks on repeated searches
- [ ] Database connections close properly
- [ ] Cache doesn't grow unbounded

### Network Conditions
- [ ] Slow 3G network performance
- [ ] Offline behavior
- [ ] Request timeouts handled
- [ ] Retry logic for failed requests

## 🛡️ **Security & Error Handling**

### Input Validation
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] Rate limiting prevents abuse
- [ ] Large payload handling
- [ ] Invalid API parameters handled

### Error Scenarios
- [ ] Database connection lost
- [ ] Invalid API responses
- [ ] Network timeouts
- [ ] Server errors (500)
- [ ] Not found errors (404)

## 🌐 **Browser Compatibility**

### Modern Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Mobile Chrome
- [ ] Mobile Safari
- [ ] Mobile Firefox

## 📊 **Data Integrity Tests**

### Database Tests
- [ ] Search results accuracy
- [ ] Filter results accuracy
- [ ] Pagination math correct
- [ ] Total count accuracy
- [ ] Sorting accuracy

### API Tests
- [ ] All endpoints return correct data
- [ ] Response times acceptable
- [ ] Error responses properly formatted
- [ ] Rate limiting headers present

## 🎯 **Usability Tests**

### User Flows
- [ ] New user can find fragrances easily
- [ ] Search flow is intuitive
- [ ] Filter combinations make sense
- [ ] Results are relevant and helpful
- [ ] No confusion about loading states

### Accessibility
- [ ] Screen reader compatibility
- [ ] Keyboard navigation works
- [ ] Color contrast sufficient
- [ ] Alt text for images
- [ ] ARIA labels present

## 🔄 **Regression Tests**

### After Each Update
- [ ] Basic search still works
- [ ] Filters still work
- [ ] Performance hasn't degraded
- [ ] No new console errors
- [ ] Mobile view still works

---

## 🏃‍♂️ **Quick Test Commands**

```bash
# Test search performance
node test-search.js

# Test rate limiting
for i in {1..35}; do curl -X POST http://localhost:3001/api/fragrances/search -H "Content-Type: application/json" -d '{"query":"test"}'; done

# Test concurrent requests
ab -n 100 -c 10 http://localhost:3001/api/fragrances/

# Monitor database performance
docker exec -it fragrance-battle-db psql -U fragranceuser -d fragrance_battle_ai -c "SELECT * FROM pg_stat_activity WHERE datname='fragrance_battle_ai';"
```

## 📈 **Performance Benchmarks**

### Target Metrics
- Search response time: < 500ms
- Filter load time: < 200ms
- Page load time: < 2s
- Time to first result: < 1s
- Memory usage: < 512MB
- Database queries: < 10 per search

### Monitoring
- [ ] Set up performance monitoring
- [ ] Log slow queries
- [ ] Track error rates
- [ ] Monitor memory usage
- [ ] Track user behavior analytics
