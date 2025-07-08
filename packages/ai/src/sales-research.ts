import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables from the API app
dotenv.config({ path: '../../apps/api/.env' });

// Sales research request interface
export interface SalesResearchRequest {
  name: string;
  brand: string;
  year?: number;
  concentration?: string;
}

// Sales research response interface
export interface SalesResearchResponse {
  fragrance: {
    name: string;
    brand: string;
  };
  salesData: {
    // Market Presence (0-100)
    retailAvailability: {
      sephora: boolean;
      ulta: boolean;
      target: boolean;
      walmart: boolean;
      amazon: boolean;
      nordstrom: boolean;
      macys: boolean;
      score: number; // 0-100 based on retail presence
    };

    // Price Accessibility (0-100)
    priceRange: {
      estimatedPrice: number;
      priceCategory: 'drugstore' | 'department' | 'designer' | 'luxury' | 'niche' | 'unknown';
      accessibilityScore: number; // 0-100, higher = more accessible
    };

    // Market Performance (0-100)
    marketPerformance: {
      popularityTrend: 'rising' | 'stable' | 'declining' | 'unknown';
      seasonalDemand: 'high' | 'medium' | 'low';
      targetDemographic: string[];
      performanceScore: number; // 0-100
    };

    // Social & Cultural Impact (0-100)
    culturalImpact: {
      socialMediaMentions: 'viral' | 'high' | 'medium' | 'low';
      influencerEndorsements: boolean;
      memeStatus: boolean;
      tikTokPopular: boolean;
      culturalScore: number; // 0-100
    };

    // Overall Sales Score (0-100)
    overallSalesScore: number;
    confidence: number; // AI confidence in the research (0-100)
  };
  reasoning: string;
}

// Initialize OpenAI client
let openai: OpenAI | null = null;

const initializeOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  if (!openai) {
    openai = new OpenAI({ apiKey });
  }

  return openai;
};

// Rate limiting for API calls
let lastCallTime = 0;
const MIN_CALL_INTERVAL = 2000; // 2 seconds between calls

const enforceRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;

  if (timeSinceLastCall < MIN_CALL_INTERVAL) {
    const waitTime = MIN_CALL_INTERVAL - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastCallTime = Date.now();
};

// Research sales data for a single fragrance
export const researchFragranceSales = async (
  request: SalesResearchRequest
): Promise<SalesResearchResponse> => {
  try {
    await enforceRateLimit();
    const client = initializeOpenAI();

    const prompt = `You are a fragrance market research expert with deep knowledge of retail distribution, pricing, consumer behavior, and cultural trends. Research the sales and market data for this fragrance:

FRAGRANCE: ${request.name} by ${request.brand}${request.year ? ` (${request.year})` : ''}${request.concentration ? ` - ${request.concentration}` : ''}

Provide comprehensive sales and market analysis covering:

1. RETAIL AVAILABILITY - Where is this fragrance sold?
   - Major retailers (Sephora, Ulta, Target, Walmart, Amazon, Nordstrom, Macy's)
   - Availability indicates mainstream appeal
   - More stores = higher popularity

2. PRICE ACCESSIBILITY - What does it cost?
   - Estimated retail price in USD
   - Price category (drugstore <$30, department $30-100, designer $100-200, luxury $200-400, niche $400+)
   - Lower price = more accessible = more popular

3. MARKET PERFORMANCE - How well does it sell?
   - Current popularity trend (rising/stable/declining)
   - Seasonal demand patterns
   - Target demographic (age, gender, lifestyle)
   - Sales performance indicators

4. SOCIAL & CULTURAL IMPACT - What's the buzz?
   - Social media presence (TikTok, Instagram, YouTube)
   - Influencer endorsements and celebrity associations
   - Meme status or viral moments
   - Cultural significance and recognition

Focus on REAL CONSUMER BEHAVIOR and MAINSTREAM APPEAL, not just enthusiast opinions.

Respond with valid JSON only:`;

    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a fragrance market research expert. Analyze real sales data, retail presence, pricing, and consumer behavior. Always respond with valid JSON matching the exact schema provided.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response received from OpenAI');
    }

    // Parse and validate the response
    const parsed = JSON.parse(response);

    // Ensure the response has the required structure
    const salesResponse: SalesResearchResponse = {
      fragrance: {
        name: request.name,
        brand: request.brand
      },
      salesData: {
        retailAvailability: {
          sephora: parsed.retailAvailability?.sephora || false,
          ulta: parsed.retailAvailability?.ulta || false,
          target: parsed.retailAvailability?.target || false,
          walmart: parsed.retailAvailability?.walmart || false,
          amazon: parsed.retailAvailability?.amazon || false,
          nordstrom: parsed.retailAvailability?.nordstrom || false,
          macys: parsed.retailAvailability?.macys || false,
          score: parsed.retailAvailability?.score || 0
        },
        priceRange: {
          estimatedPrice: parsed.priceRange?.estimatedPrice || 0,
          priceCategory: parsed.priceRange?.priceCategory || 'unknown',
          accessibilityScore: parsed.priceRange?.accessibilityScore || 0
        },
        marketPerformance: {
          popularityTrend: parsed.marketPerformance?.popularityTrend || 'unknown',
          seasonalDemand: parsed.marketPerformance?.seasonalDemand || 'medium',
          targetDemographic: parsed.marketPerformance?.targetDemographic || [],
          performanceScore: parsed.marketPerformance?.performanceScore || 0
        },
        culturalImpact: {
          socialMediaMentions: parsed.culturalImpact?.socialMediaMentions || 'low',
          influencerEndorsements: parsed.culturalImpact?.influencerEndorsements || false,
          memeStatus: parsed.culturalImpact?.memeStatus || false,
          tikTokPopular: parsed.culturalImpact?.tikTokPopular || false,
          culturalScore: parsed.culturalImpact?.culturalScore || 0
        },
        overallSalesScore: parsed.overallSalesScore || 0,
        confidence: parsed.confidence || 50
      },
      reasoning: parsed.reasoning || 'Sales research completed'
    };

    return salesResponse;

  } catch (error) {
    console.error('Error researching fragrance sales:', error);

    // Return default response on error
    return {
      fragrance: {
        name: request.name,
        brand: request.brand
      },
      salesData: {
        retailAvailability: {
          sephora: false,
          ulta: false,
          target: false,
          walmart: false,
          amazon: false,
          nordstrom: false,
          macys: false,
          score: 0
        },
        priceRange: {
          estimatedPrice: 0,
          priceCategory: 'unknown' as const,
          accessibilityScore: 0
        },
        marketPerformance: {
          popularityTrend: 'unknown' as const,
          seasonalDemand: 'medium' as const,
          targetDemographic: [],
          performanceScore: 0
        },
        culturalImpact: {
          socialMediaMentions: 'low' as const,
          influencerEndorsements: false,
          memeStatus: false,
          tikTokPopular: false,
          culturalScore: 0
        },
        overallSalesScore: 0,
        confidence: 0
      },
      reasoning: `Error researching sales data: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Batch sales research for multiple fragrances
export const researchFragranceSalesBatch = async (
  requests: SalesResearchRequest[]
): Promise<SalesResearchResponse[]> => {
  const results: SalesResearchResponse[] = [];
  const errors: string[] = [];

  console.log(`🚀 Starting batch sales research for ${requests.length} fragrances`);

  // Process in smaller batches to avoid rate limiting
  const batchSize = 5; // More generous for GPT-3.5
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);

    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(requests.length / batchSize)}`);

    const batchPromises = batch.map(async (request) => {
      try {
        return await researchFragranceSales(request);
      } catch (error) {
        const errorMsg = `Failed to research ${request.name} by ${request.brand}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        return null;
      }
    });

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null) as SalesResearchResponse[]);
    } catch (error) {
      console.error(`Error processing batch ${i / batchSize + 1}:`, error);
    }

    // Add delay between batches for rate limiting
    if (i + batchSize < requests.length) {
      console.log('⏳ Waiting before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay for GPT-3.5
    }
  }

  console.log(`✅ Batch sales research complete: ${results.length} successful, ${errors.length} failed`);

  if (errors.length > 0) {
    console.warn('❌ Errors encountered:', errors);
  }

  return results;
};

// Calculate enhanced popularity score using sales data
export const calculateEnhancedPopularityScore = (salesData: SalesResearchResponse['salesData']): number => {
  // Weighted combination of all sales factors
  const weights = {
    retailAvailability: 0.30,    // 30% - Where it's sold
    priceAccessibility: 0.25,    // 25% - How affordable it is
    marketPerformance: 0.25,     // 25% - How well it's selling
    culturalImpact: 0.20         // 20% - Social/cultural buzz
  };

  const score = (
    salesData.retailAvailability.score * weights.retailAvailability +
    salesData.priceRange.accessibilityScore * weights.priceAccessibility +
    salesData.marketPerformance.performanceScore * weights.marketPerformance +
    salesData.culturalImpact.culturalScore * weights.culturalImpact
  );

  return Math.round(score * 100) / 100;
};

// Analyze sales research results
export const analyzeSalesResearch = (research: SalesResearchResponse) => {
  const { salesData } = research;

  return {
    fragrance: research.fragrance,
    analysis: {
      retailPresence: {
        stores: Object.entries(salesData.retailAvailability)
          .filter(([key, value]) => key !== 'score' && value === true)
          .map(([key]) => key),
        mainstream: salesData.retailAvailability.score >= 70,
        accessibility: salesData.retailAvailability.score >= 50 ? 'High' :
                      salesData.retailAvailability.score >= 30 ? 'Medium' : 'Low'
      },
      pricing: {
        affordability: salesData.priceRange.accessibilityScore >= 70 ? 'Very Affordable' :
                      salesData.priceRange.accessibilityScore >= 50 ? 'Affordable' :
                      salesData.priceRange.accessibilityScore >= 30 ? 'Moderate' : 'Expensive',
        category: salesData.priceRange.priceCategory,
        estimatedPrice: salesData.priceRange.estimatedPrice
      },
      market: {
        trend: salesData.marketPerformance.popularityTrend,
        demand: salesData.marketPerformance.seasonalDemand,
        performance: salesData.marketPerformance.performanceScore >= 70 ? 'Strong' :
                    salesData.marketPerformance.performanceScore >= 50 ? 'Good' :
                    salesData.marketPerformance.performanceScore >= 30 ? 'Fair' : 'Weak'
      },
      cultural: {
        socialBuzz: salesData.culturalImpact.socialMediaMentions,
        viral: salesData.culturalImpact.tikTokPopular || salesData.culturalImpact.memeStatus,
        influencer: salesData.culturalImpact.influencerEndorsements,
        impact: salesData.culturalImpact.culturalScore >= 70 ? 'High' :
               salesData.culturalImpact.culturalScore >= 50 ? 'Medium' : 'Low'
      }
    },
    scores: {
      retail: salesData.retailAvailability.score,
      price: salesData.priceRange.accessibilityScore,
      market: salesData.marketPerformance.performanceScore,
      cultural: salesData.culturalImpact.culturalScore,
      overall: salesData.overallSalesScore,
      enhanced: calculateEnhancedPopularityScore(salesData)
    },
    confidence: salesData.confidence,
    reasoning: research.reasoning
  };
};

export default {
  researchFragranceSales,
  researchFragranceSalesBatch,
  calculateEnhancedPopularityScore,
  analyzeSalesResearch
};
