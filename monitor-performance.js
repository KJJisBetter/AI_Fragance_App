// Performance monitoring script
const API_URL = 'http://localhost:3001/api';

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimes: []
    };

    this.startTime = Date.now();
  }

  async makeRequest(endpoint, options = {}) {
    const requestStart = Date.now();
    this.metrics.totalRequests++;

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        ...options
      });

      const responseTime = Date.now() - requestStart;
      this.metrics.responseTimes.push(responseTime);

      // Update response time metrics
      this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);
      this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);
      this.metrics.averageResponseTime = this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;

      if (response.status === 429) {
        this.metrics.rateLimitedRequests++;
      } else if (response.ok) {
        this.metrics.successfulRequests++;
      } else {
        this.metrics.failedRequests++;
      }

      return { response, responseTime };
    } catch (error) {
      this.metrics.failedRequests++;
      const responseTime = Date.now() - requestStart;
      return { error, responseTime };
    }
  }

  getStats() {
    const runTime = Date.now() - this.startTime;
    return {
      ...this.metrics,
      runTime,
      requestsPerSecond: this.metrics.totalRequests / (runTime / 1000),
      successRate: (this.metrics.successfulRequests / this.metrics.totalRequests) * 100,
      p95ResponseTime: this.getPercentile(95),
      p99ResponseTime: this.getPercentile(99)
    };
  }

  getPercentile(percentile) {
    const sorted = this.metrics.responseTimes.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  printStats() {
    const stats = this.getStats();
    console.clear();
    console.log('📊 Performance Monitor Dashboard');
    console.log('=' .repeat(50));
    console.log(`🕐 Runtime: ${(stats.runTime / 1000).toFixed(1)}s`);
    console.log(`📈 Total Requests: ${stats.totalRequests}`);
    console.log(`✅ Successful: ${stats.successfulRequests} (${stats.successRate.toFixed(1)}%)`);
    console.log(`❌ Failed: ${stats.failedRequests}`);
    console.log(`🛡️ Rate Limited: ${stats.rateLimitedRequests}`);
    console.log(`⚡ Requests/sec: ${stats.requestsPerSecond.toFixed(1)}`);
    console.log('');
    console.log('Response Times:');
    console.log(`  Average: ${stats.averageResponseTime.toFixed(0)}ms`);
    console.log(`  Min: ${stats.minResponseTime === Infinity ? 'N/A' : stats.minResponseTime}ms`);
    console.log(`  Max: ${stats.maxResponseTime}ms`);
    console.log(`  95th percentile: ${stats.p95ResponseTime}ms`);
    console.log(`  99th percentile: ${stats.p99ResponseTime}ms`);
    console.log('');
    console.log('Press Ctrl+C to stop monitoring...');
  }
}

async function runLoadTest() {
  console.log('🚀 Starting Load Test...\n');

  const monitor = new PerformanceMonitor();

  // Test scenarios
  const scenarios = [
    { endpoint: '/fragrances/filters', weight: 1 },
    { endpoint: '/fragrances?page=1&limit=20&sortBy=rating&sortOrder=desc', weight: 3 },
    { endpoint: '/fragrances/search', method: 'POST', body: JSON.stringify({ query: 'creed', page: 1, limit: 20 }), weight: 2 },
    { endpoint: '/fragrances/search', method: 'POST', body: JSON.stringify({ query: 'good girl', page: 1, limit: 20 }), weight: 2 },
    { endpoint: '/fragrances/brands/search?q=dior&limit=10', weight: 1 }
  ];

  // Create weighted scenario list
  const weightedScenarios = [];
  scenarios.forEach(scenario => {
    for (let i = 0; i < scenario.weight; i++) {
      weightedScenarios.push(scenario);
    }
  });

  // Run continuous load test
  const interval = setInterval(async () => {
    // Make multiple concurrent requests
    const promises = [];
    for (let i = 0; i < 3; i++) {
      const scenario = weightedScenarios[Math.floor(Math.random() * weightedScenarios.length)];
      const options = {
        method: scenario.method || 'GET',
        headers: scenario.method === 'POST' ? { 'Content-Type': 'application/json' } : {},
        body: scenario.body || undefined
      };

      promises.push(monitor.makeRequest(scenario.endpoint, options));
    }

    await Promise.all(promises);
    monitor.printStats();
  }, 1000);

  // Stop after 30 seconds or on Ctrl+C
  setTimeout(() => {
    clearInterval(interval);
    console.log('\n🎉 Load test completed!');
    console.log('Final stats:');
    monitor.printStats();
  }, 30000);

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n\n🛑 Load test stopped by user');
    console.log('Final stats:');
    monitor.printStats();
    process.exit(0);
  });
}

async function runQuickHealthCheck() {
  console.log('🩺 Running Quick Health Check...\n');

  const healthTests = [
    { name: 'API Status', endpoint: '/fragrances/filters' },
    { name: 'Basic Search', endpoint: '/fragrances/search', method: 'POST', body: JSON.stringify({ query: 'test', page: 1, limit: 5 }) },
    { name: 'Brand Search', endpoint: '/fragrances/brands/search?q=test&limit=5' },
    { name: 'Filter Query', endpoint: '/fragrances?page=1&limit=5&sortBy=rating&sortOrder=desc' }
  ];

  for (const test of healthTests) {
    const startTime = Date.now();
    try {
      const response = await fetch(`${API_URL}${test.endpoint}`, {
        method: test.method || 'GET',
        headers: test.method === 'POST' ? { 'Content-Type': 'application/json' } : {},
        body: test.body || undefined
      });

      const responseTime = Date.now() - startTime;
      const status = response.ok ? '✅' : '❌';
      const statusCode = response.status;

      console.log(`${status} ${test.name}: ${statusCode} (${responseTime}ms)`);
    } catch (error) {
      console.log(`❌ ${test.name}: Network Error (${error.message})`);
    }
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'load':
    runLoadTest();
    break;
  case 'health':
    runQuickHealthCheck();
    break;
  default:
    console.log('📊 Performance Monitor Commands:');
    console.log('');
    console.log('  node monitor-performance.js health   - Quick health check');
    console.log('  node monitor-performance.js load     - Run load test (30s)');
    console.log('');
    console.log('Examples:');
    console.log('  node monitor-performance.js health');
    console.log('  node monitor-performance.js load');
    break;
}
