import OpenAI from 'openai';

// Define the BrandResearchResponse interface locally
interface BrandResearchResponse {
  brand: string;
  tier: 'luxury' | 'high-end-designer' | 'designer' | 'niche' | 'mass-market' | 'unknown';
  priceRange: 'under-50' | '50-150' | '150-300' | '300-500' | '500+' | 'unknown';
  confidence: number;
  reasoning: string;
}

// Get OpenAI client - reusing the same pattern from index.ts
let openai: OpenAI | null = null;

const getOpenAIClient = () => {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please set OPENAI_API_KEY environment variable.');
    }
    openai = new OpenAI({
      apiKey: apiKey,
      timeout: 30000,
      maxRetries: 3,
      defaultHeaders: {
        'User-Agent': 'fragrance-battle-ai/1.0.0',
      },
    });
  }
  return openai!;
};

// Rate limiting helper
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

const enforceRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
};

// Generate brand research prompt
const generateBrandResearchPrompt = (brandName: string): string => {
  return `Research the fragrance brand "${brandName}" and return ONLY JSON in this exact format:

{
  "brand": "${brandName}",
  "tier": "luxury|high-end-designer|designer|niche|mass-market|unknown",
  "priceRange": "under-50|50-150|150-300|300-500|500+|unknown",
  "confidence": 0.95,
  "reasoning": "Brief explanation of classification"
}

Tier definitions:
- luxury: Ultra-premium brands ($300+) - Creed, Tom Ford Private Blend, Clive Christian, Amouage, By Kilian
- high-end-designer: Premium designer houses ($150-300) - Chanel, Dior, Hermès, YSL, Tom Ford Signature
- designer: Mainstream designer brands ($50-150) - Calvin Klein, Hugo Boss, Versace, Armani, Prada
- niche: Artisanal/independent perfumers - Le Labo, Byredo, Diptyque, Maison Francis Kurkdjian, Penhaligon's
- mass-market: Drugstore/chain brands ($5-50) - Bath & Body Works, Zara, The Body Shop, Avon
- unknown: Insufficient information or very obscure brands

Price range guidelines:
- under-50: Mass market fragrances
- 50-150: Designer fragrances
- 150-300: Premium designer fragrances
- 300-500: Luxury fragrances
- 500+: Ultra-luxury fragrances
- unknown: Insufficient pricing information

Consider:
- Brand heritage and reputation
- Typical retail prices
- Market positioning
- Distribution channels
- Target demographic
- Quality of ingredients and packaging

Important: Return ONLY the JSON object, no additional text.`;
};

// Parse and validate brand research response
const parseBrandResearchResponse = (response: string, brandName: string): BrandResearchResponse => {
  try {
    const parsed = JSON.parse(response);

    // Validate required fields
    if (!parsed.brand || !parsed.tier || !parsed.priceRange || typeof parsed.confidence !== 'number') {
      throw new Error('Missing required fields in brand research response');
    }

    // Validate tier
    const validTiers = ['luxury', 'high-end-designer', 'designer', 'niche', 'mass-market', 'unknown'];
    const validTier = validTiers.includes(parsed.tier);
    if (!validTier) {
      console.warn(`Invalid tier "${parsed.tier}" for brand ${brandName}, defaulting to "unknown"`);
      parsed.tier = 'unknown';
    }

    // Validate price range
    const validPriceRanges = ['under-50', '50-150', '150-300', '300-500', '500+', 'unknown'];
    const validPriceRange = validPriceRanges.includes(parsed.priceRange);
    if (!validPriceRange) {
      console.warn(`Invalid price range "${parsed.priceRange}" for brand ${brandName}, defaulting to "unknown"`);
      parsed.priceRange = 'unknown';
    }

    // Validate confidence (0.1 to 1.0)
    const confidence = Math.max(0.1, Math.min(1.0, parsed.confidence));

    return {
      brand: brandName, // Use the original brand name for consistency
      tier: parsed.tier,
      priceRange: parsed.priceRange,
      confidence,
      reasoning: parsed.reasoning || 'No reasoning provided'
    };
  } catch (error) {
    console.error('Failed to parse brand research response:', error);
    console.error('Raw response:', response);

    // Return a safe fallback response
    return {
      brand: brandName,
      tier: 'unknown',
      priceRange: 'unknown',
      confidence: 0.1,
      reasoning: `Failed to research brand: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Main brand research function
export const researchBrand = async (brandName: string): Promise<BrandResearchResponse> => {
  try {
    await enforceRateLimit();

    const client = getOpenAIClient();
    const prompt = generateBrandResearchPrompt(brandName);

    console.log(`🔍 Researching brand: ${brandName}`);

    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo-1106',
      messages: [
        {
          role: 'system',
          content: 'You are an expert fragrance industry analyst with deep knowledge of fragrance brands, market positioning, and pricing. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.2, // Low temperature for consistent categorization
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response received from OpenAI');
    }

    const result = parseBrandResearchResponse(response, brandName);

    console.log(`✅ Researched ${brandName}: ${result.tier} (${result.priceRange}) - ${result.confidence * 100}% confidence`);

    return result;
  } catch (error) {
    console.error('Error researching brand:', error);

    // Provide more specific error messages
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.');
      } else if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a few minutes.');
      } else if (error.status === 500) {
        throw new Error('OpenAI API is currently experiencing issues. Please try again later.');
      }
    }

    // Return a safe fallback for network/API errors
    return {
      brand: brandName,
      tier: 'unknown',
      priceRange: 'unknown',
      confidence: 0.1,
      reasoning: `Error during research: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Batch brand research function
export const researchBrandsBatch = async (brandNames: string[]): Promise<BrandResearchResponse[]> => {
  const results: BrandResearchResponse[] = [];
  const errors: string[] = [];

  console.log(`🚀 Starting batch brand research for ${brandNames.length} brands`);

  // Process in smaller batches to avoid rate limiting
  const batchSize = 5; // 5 brands per batch
  for (let i = 0; i < brandNames.length; i += batchSize) {
    const batch = brandNames.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(brandNames.length / batchSize);

    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} brands)`);

    const batchPromises = batch.map(async (brandName) => {
      try {
        return await researchBrand(brandName);
      } catch (error) {
        const errorMsg = `Failed to research ${brandName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        return null;
      }
    });

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((result): result is BrandResearchResponse => result !== null));
    } catch (error) {
      console.error(`Error processing batch ${batchNumber}:`, error);
    }

    // Add delay between batches to respect rate limits
    if (i + batchSize < brandNames.length) {
      console.log('⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`✅ Batch brand research complete: ${results.length} successful, ${errors.length} failed`);

  if (errors.length > 0) {
    console.warn('❌ Errors encountered:', errors.slice(0, 5)); // Show first 5 errors
    if (errors.length > 5) {
      console.warn(`... and ${errors.length - 5} more errors`);
    }
  }

  return results;
};

// Export utility functions and constants
export const BRAND_TIERS = ['luxury', 'high-end-designer', 'designer', 'niche', 'mass-market', 'unknown'];
export const PRICE_RANGES = ['under-50', '50-150', '150-300', '300-500', '500+', 'unknown'];
export type { BrandResearchResponse };
