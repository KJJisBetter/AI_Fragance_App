import axios, { AxiosInstance, AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface PerfumeroConfig {
  apiKey: string;
  baseURL: string;
  monthlyLimit: number;
  rateLimitFile?: string;
}

interface UsageStats {
  used: number;
  remaining: number;
  percentage: number;
  resetDate: Date;
  dailyUsage: number;
  hourlyUsage: number;
}

interface RateLimitData {
  currentMonth: string;
  requestCount: number;
  dailyUsage: { [date: string]: number };
  hourlyUsage: { [hour: string]: number };
  lastResetDate: string;
  lastRequestTimes: number[];
  errors: Array<{
    timestamp: string;
    error: string;
    endpoint: string;
  }>;
}

interface PerfumeSearchParams {
  brand?: string;
  name?: string;
  designer?: string;
  accords?: string;
  top?: string;
  heart?: string;
  base?: string;
  sex?: string; // M, F, U
  origin?: string;
  year?: number;
  type?: string; // EDT, EDP, EDC, EF, M
  available?: string; // Y, N
  limited?: string; // Y, N
  collector?: string; // Y, N
  page?: number;
  limit?: number;
}

interface PerfumeResult {
  id: string; // pid from API
  name: string;
  brand: string;
  parent?: string;
  year?: number;
  type?: string; // EDT, EDP, EDC, EF, M
  sex?: string; // M, F, U
  origin?: string;
  topNotes?: string[];
  heartNotes?: string[];
  baseNotes?: string[];
  middleNotes?: string[];
  accords?: string[];
  rating?: number;
  ratingVotes?: number;
  longevity?: number;
  sillage?: number;
  imageUrl?: string;
  imageUrls?: string[];
  available?: string; // Y, N
  limited?: string; // Y, N
  collector?: string; // Y, N
  perfumers?: string[];
  designers?: string;
  video?: string;
  brandUrl?: string;
  brandImg?: string;
}

interface SearchResponse {
  perfumes: PerfumeResult[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}

class PerfumeroService {
  private config: PerfumeroConfig;
  private client: AxiosInstance;
  private rateLimitData!: RateLimitData;
  private rateLimitFile: string;
  private logFile: string;

  constructor(config: PerfumeroConfig) {
    this.config = config;
    this.rateLimitFile = config.rateLimitFile || path.join(__dirname, '../data/perfumero-usage.json');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(__dirname, `../logs/perfumero-api-${timestamp}.log`);

    // Initialize axios client
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: 30000,
      headers: {
        'X-RapidAPI-Key': this.config.apiKey,
        'X-RapidAPI-Host': 'perfumero1.p.rapidapi.com',
        'Content-Type': 'application/json',
        'User-Agent': 'FragranceBattleApp/1.0.0'
      }
    });

    // Setup request/response interceptors
    this.setupInterceptors();

    // Load existing rate limit data
    this.loadRateLimitData();

    // Ensure directories exist
    this.ensureDirectories();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        this.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.log(`❌ Request failed: ${error.message}`, 'ERROR');
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        this.log(`✅ API Response: ${response.status} - ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        const errorMsg = `API Error: ${error.response?.status} - ${error.message}`;
        this.log(errorMsg, 'ERROR');

        // Track errors
        this.rateLimitData.errors.push({
          timestamp: new Date().toISOString(),
          error: errorMsg,
          endpoint: error.config?.url || 'unknown'
        });

        // Keep only last 100 errors
        if (this.rateLimitData.errors.length > 100) {
          this.rateLimitData.errors = this.rateLimitData.errors.slice(-100);
        }

        return Promise.reject(error);
      }
    );
  }

  private ensureDirectories(): void {
    const dirs = [
      path.dirname(this.rateLimitFile),
      path.dirname(this.logFile)
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private loadRateLimitData(): void {
    try {
      if (fs.existsSync(this.rateLimitFile)) {
        const data = JSON.parse(fs.readFileSync(this.rateLimitFile, 'utf8'));
        this.rateLimitData = data;
      } else {
        this.resetRateLimitData();
      }

      // Check if we need to reset monthly counter
      if (this.shouldResetMonthly()) {
        this.resetRateLimitData();
      }
    } catch (error) {
      this.log(`⚠️ Failed to load rate limit data: ${error}`, 'WARN');
      this.resetRateLimitData();
    }
  }

  private resetRateLimitData(): void {
    const now = new Date();
    this.rateLimitData = {
      currentMonth: now.toISOString().slice(0, 7), // YYYY-MM format
      requestCount: 0,
      dailyUsage: {},
      hourlyUsage: {},
      lastResetDate: now.toISOString(),
      lastRequestTimes: [],
      errors: []
    };
    this.saveRateLimitData();
  }

  private saveRateLimitData(): void {
    try {
      fs.writeFileSync(this.rateLimitFile, JSON.stringify(this.rateLimitData, null, 2));
    } catch (error) {
      this.log(`❌ Failed to save rate limit data: ${error}`, 'ERROR');
    }
  }

  private shouldResetMonthly(): boolean {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return this.rateLimitData.currentMonth !== currentMonth;
  }

  private async checkRateLimit(): Promise<void> {
    // Check monthly limit
    if (this.rateLimitData.requestCount >= this.config.monthlyLimit) {
      const error = `Monthly API limit of ${this.config.monthlyLimit} requests reached`;
      this.log(error, 'ERROR');
      throw new Error(error);
    }

    // Per-second rate limiting (2 requests per second)
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Clean up old requests (keep only last second)
    if (!this.rateLimitData.lastRequestTimes) {
      this.rateLimitData.lastRequestTimes = [];
    }

    this.rateLimitData.lastRequestTimes = this.rateLimitData.lastRequestTimes.filter(time => time > oneSecondAgo);

    // Check if we can make a request (max 2 per second)
    if (this.rateLimitData.lastRequestTimes.length >= 2) {
      const oldestRequest = this.rateLimitData.lastRequestTimes[0];
      if (oldestRequest) {
        const waitTime = 1000 - (now - oldestRequest);
        if (waitTime > 0) {
          this.log(`⏳ Rate limiting: waiting ${waitTime}ms`, 'INFO');
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
  }

  private incrementRequestCount(): void {
    this.rateLimitData.requestCount++;

    // Track request time for per-second rate limiting
    const now = Date.now();
    if (!this.rateLimitData.lastRequestTimes) {
      this.rateLimitData.lastRequestTimes = [];
    }
    this.rateLimitData.lastRequestTimes.push(now);

    // Track daily usage
    const today = new Date().toISOString().slice(0, 10);
    this.rateLimitData.dailyUsage[today] = (this.rateLimitData.dailyUsage[today] || 0) + 1;

    // Track hourly usage
    const currentHour = new Date().toISOString().slice(0, 13);
    this.rateLimitData.hourlyUsage[currentHour] = (this.rateLimitData.hourlyUsage[currentHour] || 0) + 1;

    // Clean up old data (keep last 60 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60);
    const cutoffDateStr = cutoffDate.toISOString().slice(0, 10);

    Object.keys(this.rateLimitData.dailyUsage).forEach(date => {
      if (date < cutoffDateStr) {
        delete this.rateLimitData.dailyUsage[date];
      }
    });

    // Clean up old hourly data (keep last 7 days)
    const hourCutoff = new Date();
    hourCutoff.setDate(hourCutoff.getDate() - 7);
    const hourCutoffStr = hourCutoff.toISOString().slice(0, 13);

    Object.keys(this.rateLimitData.hourlyUsage).forEach(hour => {
      if (hour < hourCutoffStr) {
        delete this.rateLimitData.hourlyUsage[hour];
      }
    });

    this.saveRateLimitData();
  }

  private log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;
    console.log(logMessage);

    try {
      fs.appendFileSync(this.logFile, logMessage + '\n');
    } catch (error) {
      // Fail silently if logging fails
    }
  }

  // Public API methods
  async search(params: PerfumeSearchParams): Promise<SearchResponse> {
    await this.checkRateLimit();

    try {
      const response = await this.client.get('/search', {
        params: {
          brand: params.brand,
          name: params.name,
          designer: params.designer,
          accords: params.accords,
          top: params.top,
          heart: params.heart,
          base: params.base,
          sex: params.sex,
          origin: params.origin,
          year: params.year,
          type: params.type,
          available: params.available,
          limited: params.limited,
          collector: params.collector,
          page: params.page || 1,
          limit: params.limit || 20
        }
      });

      this.incrementRequestCount();

      // Transform response - API returns { data: [...], meta: {...} }
      const apiData = response.data.data || [];
      const meta = response.data.meta || {};
      const result: SearchResponse = {
        perfumes: apiData.map((item: any) => this.transformPerfume(item)),
        totalCount: apiData.length,
        hasMore: meta.next === true,
        nextOffset: meta.current ? meta.current + 1 : (params.page || 1) + 1
      };

      this.log(`🔍 Search completed: ${result.perfumes.length} results`);
      return result;

    } catch (error) {
      this.log(`❌ Search failed: ${error}`, 'ERROR');
      throw error;
    }
  }

  async getDetails(perfumeId: string): Promise<PerfumeResult> {
    await this.checkRateLimit();

    try {
      const response = await this.client.get(`/perfume/${perfumeId}`);
      this.incrementRequestCount();

      // The details endpoint might return single object or { data: object }
      const apiData = response.data.data || response.data;
      const result = this.transformPerfume(apiData);
      this.log(`🔍 Details fetched for: ${result.name}`);
      return result;

    } catch (error) {
      this.log(`❌ Details fetch failed for ${perfumeId}: ${error}`, 'ERROR');
      throw error;
    }
  }

  async getSimilar(perfumeId: string, limit: number = 10): Promise<PerfumeResult[]> {
    await this.checkRateLimit();

    try {
      const response = await this.client.get(`/perfume/${perfumeId}/similar`, {
        params: { limit }
      });

      this.incrementRequestCount();

      // Similar endpoint returns { data: [...] } format
      const apiData = response.data.data || response.data || [];
      const results = Array.isArray(apiData) ? apiData.map((item: any) => this.transformPerfume(item)) : [];
      this.log(`🔍 Similar perfumes found: ${results.length} for ${perfumeId}`);
      return results;

    } catch (error) {
      this.log(`❌ Similar perfumes fetch failed for ${perfumeId}: ${error}`, 'ERROR');
      throw error;
    }
  }

  async getBrandPerfumes(brand: string, limit: number = 50): Promise<PerfumeResult[]> {
    return (await this.search({ brand, limit })).perfumes;
  }

  async searchByNotes(notes: string[], limit: number = 20): Promise<PerfumeResult[]> {
    // Convert notes array to comma-separated string for API
    const notesString = notes.join(',');
    return (await this.search({
      accords: notesString, // Use accords parameter for notes
      limit
    })).perfumes;
  }

  private transformPerfume(apiData: any): PerfumeResult {
    // Helper function to parse JSON strings safely
    const parseJsonString = (str: string | null): any[] => {
      if (!str) return [];
      try {
        return JSON.parse(str);
      } catch {
        return [];
      }
    };

    return {
      id: apiData.pid || apiData.id,
      name: apiData.name,
      brand: apiData.brand,
      parent: apiData.parent,
      year: apiData.year,
      type: apiData.type,
      sex: apiData.sex,
      origin: apiData.origin,
      topNotes: parseJsonString(apiData.top),
      heartNotes: parseJsonString(apiData.heart),
      baseNotes: parseJsonString(apiData.base),
      middleNotes: parseJsonString(apiData.heart), // heart notes are middle notes
      accords: parseJsonString(apiData.accords),
      rating: apiData.rating,
      ratingVotes: apiData.ratingVotes,
      longevity: apiData.longevity,
      sillage: apiData.sillage,
      imageUrl: apiData.img,
      imageUrls: parseJsonString(apiData.imgs),
      available: apiData.available,
      limited: apiData.limited,
      collector: apiData.collector,
      perfumers: parseJsonString(apiData.perfumers),
      designers: apiData.designers,
      video: apiData.video,
      brandUrl: apiData.brandUrl,
      brandImg: apiData.brandImg
    };
  }

  // Utility methods
  getUsageStats(): UsageStats {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentHour = now.toISOString().slice(0, 13);

    return {
      used: this.rateLimitData.requestCount,
      remaining: this.config.monthlyLimit - this.rateLimitData.requestCount,
      percentage: (this.rateLimitData.requestCount / this.config.monthlyLimit) * 100,
      resetDate: this.getNextResetDate(),
      dailyUsage: this.rateLimitData.dailyUsage[today] || 0,
      hourlyUsage: this.rateLimitData.hourlyUsage[currentHour] || 0
    };
  }

  private getNextResetDate(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  }

  canMakeRequest(): boolean {
    try {
      // Just check, don't throw
      const usage = this.getUsageStats();
      return usage.remaining > 0;
    } catch {
      return false;
    }
  }

  getErrorHistory(): Array<{ timestamp: string; error: string; endpoint: string }> {
    return this.rateLimitData.errors.slice(-20); // Return last 20 errors
  }

  // Admin methods
  resetUsage(): void {
    this.log('🔄 Manual usage reset requested', 'WARN');
    this.resetRateLimitData();
  }

  exportUsageReport(): string {
    const report = {
      config: {
        monthlyLimit: this.config.monthlyLimit,
        baseURL: this.config.baseURL
      },
      usage: this.getUsageStats(),
      dailyBreakdown: this.rateLimitData.dailyUsage,
      recentErrors: this.rateLimitData.errors.slice(-10)
    };

    return JSON.stringify(report, null, 2);
  }
}

export { PerfumeroService, PerfumeResult, SearchResponse, PerfumeSearchParams, UsageStats };
