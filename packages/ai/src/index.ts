import OpenAI from 'openai';
import {
  AICategorizationRequest,
  AICategorizationResponse,
  AICategorization,
  FRAGRANCE_SEASONS,
  FRAGRANCE_OCCASIONS,
  FRAGRANCE_MOODS,
  FRAGRANCE_CONCENTRATIONS
} from '@fragrance-battle/types';

// Initialize OpenAI client
let openai: OpenAI | null = null;

export const initializeOpenAI = (apiKey: string) => {
  openai = new OpenAI({
    apiKey: apiKey,
    timeout: 30000, // 30 second timeout
    maxRetries: 3, // Retry failed requests up to 3 times
    defaultHeaders: {
      'User-Agent': 'fragrance-battle-ai/1.0.0',
    },
  });
};

// Get or create OpenAI client
const getOpenAIClient = () => {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please set OPENAI_API_KEY environment variable.');
    }
    initializeOpenAI(apiKey);
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

// Generate the AI categorization prompt
const generateCategorizationPrompt = (request: AICategorizationRequest): string => {
  const { name, brand, topNotes, middleNotes, baseNotes, year, concentration } = request;

  return `You are an expert fragrance categorization AI. Analyze the following fragrance and provide categorization in the exact JSON format requested.

Fragrance Details:
- Name: ${name}
- Brand: ${brand}
- Year: ${year || 'Unknown'}
- Concentration: ${concentration || 'Unknown'}
- Top Notes: ${topNotes.join(', ')}
- Middle Notes: ${middleNotes.join(', ')}
- Base Notes: ${baseNotes.join(', ')}

Based on the fragrance notes, brand reputation, and your knowledge of fragrance families, categorize this fragrance for:

1. SEASONS: When is this fragrance most appropriate?
   Options: ${FRAGRANCE_SEASONS.join(', ')}

2. OCCASIONS: What occasions is this fragrance suitable for?
   Options: ${FRAGRANCE_OCCASIONS.join(', ')}

3. MOODS: What mood or personality does this fragrance convey?
   Options: ${FRAGRANCE_MOODS.join(', ')}

4. CONFIDENCE: Rate your confidence in this categorization (0-100)

Consider factors like:
- Note families (citrus=fresh/summer, oud=sophisticated/fall-winter, etc.)
- Brand positioning (luxury vs mass market)
- Concentration strength (EDT=daily, EDP=evening, etc.)
- Year of release and trends
- Performance characteristics

Return ONLY a JSON object in this exact format:
{
  "seasons": ["Season1", "Season2"],
  "occasions": ["Occasion1", "Occasion2"],
  "moods": ["Mood1", "Mood2"],
  "confidence": 85,
  "reasoning": "Brief explanation of your categorization logic"
}

Important:
- Use only the exact values from the options provided
- Select 1-3 items for each category
- Provide a confidence score from 0-100
- Include brief reasoning for your choices`;
};

// Parse and validate AI response
const parseAIResponse = (response: string): AICategorization & { reasoning: string } => {
  try {
    const parsed = JSON.parse(response);

    // Validate required fields
    if (!parsed.seasons || !parsed.occasions || !parsed.moods || typeof parsed.confidence !== 'number') {
      throw new Error('Missing required fields in AI response');
    }

    // Validate seasons
    const validSeasons = parsed.seasons.filter((season: string) =>
      FRAGRANCE_SEASONS.includes(season as any)
    );

    // Validate occasions
    const validOccasions = parsed.occasions.filter((occasion: string) =>
      FRAGRANCE_OCCASIONS.includes(occasion as any)
    );

    // Validate moods
    const validMoods = parsed.moods.filter((mood: string) =>
      FRAGRANCE_MOODS.includes(mood as any)
    );

    // Validate confidence
    const confidence = Math.max(0, Math.min(100, parsed.confidence));

    // Ensure we have at least one valid value for each category
    if (validSeasons.length === 0) {
      validSeasons.push('Spring'); // Default fallback
    }
    if (validOccasions.length === 0) {
      validOccasions.push('Daily'); // Default fallback
    }
    if (validMoods.length === 0) {
      validMoods.push('Fresh'); // Default fallback
    }

    return {
      seasons: validSeasons,
      occasions: validOccasions,
      moods: validMoods,
      confidence,
      reasoning: parsed.reasoning || 'No reasoning provided'
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Raw response:', response);
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Main categorization function
export const categorizeFragrance = async (
  request: AICategorizationRequest
): Promise<AICategorizationResponse> => {
  try {
    await enforceRateLimit();

    const client = getOpenAIClient();
    const prompt = generateCategorizationPrompt(request);

    console.log(`🤖 Categorizing fragrance: ${request.name} by ${request.brand}`);

    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo-1106', // Using GPT-3.5-turbo-1106 for optimal cost efficiency
      messages: [
        {
          role: 'system',
          content: 'You are an expert fragrance consultant with deep knowledge of perfumery, fragrance families, and seasonal/occasion appropriateness. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3, // Lower temperature for more consistent responses
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response received from OpenAI');
    }

    const parsed = parseAIResponse(response);

    console.log(`✅ Successfully categorized ${request.name}: ${parsed.seasons.join(', ')} | ${parsed.occasions.join(', ')} | ${parsed.moods.join(', ')} (${parsed.confidence}% confidence)`);

    return {
      categorization: {
        seasons: parsed.seasons,
        occasions: parsed.occasions,
        moods: parsed.moods,
        confidence: parsed.confidence
      },
      reasoning: parsed.reasoning
    };
  } catch (error) {
    console.error('Error categorizing fragrance:', error);

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

    throw new Error(`Failed to categorize fragrance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Batch categorization function
export const categorizeFragrancesBatch = async (
  requests: AICategorizationRequest[]
): Promise<AICategorizationResponse[]> => {
  const results: AICategorizationResponse[] = [];
  const errors: string[] = [];

  console.log(`🚀 Starting batch categorization of ${requests.length} fragrances`);

  // Process in batches to avoid rate limiting
  const batchSize = 3; // Reduced batch size to be more conservative
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);

    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(requests.length / batchSize)}`);

    const batchPromises = batch.map(async (request) => {
      try {
        return await categorizeFragrance(request);
      } catch (error) {
        const errorMsg = `Failed to categorize ${request.name} by ${request.brand}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        return null;
      }
    });

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null) as AICategorizationResponse[]);
    } catch (error) {
      console.error(`Error processing batch ${i / batchSize + 1}:`, error);
    }

    // Add delay between batches to respect rate limits
    if (i + batchSize < requests.length) {
      console.log('⏳ Waiting before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    }
  }

  console.log(`✅ Batch categorization complete: ${results.length} successful, ${errors.length} failed`);

  if (errors.length > 0) {
    console.warn('❌ Errors encountered:', errors);
  }

  return results;
};

// Improve categorization based on user feedback
export const improveCategorization = async (
  originalRequest: AICategorizationRequest,
  userFeedback: {
    correctSeasons?: string[];
    correctOccasions?: string[];
    correctMoods?: string[];
    feedbackNotes?: string;
  }
): Promise<AICategorizationResponse> => {
  try {
    await enforceRateLimit();

    const client = getOpenAIClient();

    const feedbackPrompt = `You are an expert fragrance consultant. A user has provided feedback on your previous categorization. Learn from this feedback and provide an improved categorization.

Original Fragrance:
- Name: ${originalRequest.name}
- Brand: ${originalRequest.brand}
- Top Notes: ${originalRequest.topNotes.join(', ')}
- Middle Notes: ${originalRequest.middleNotes.join(', ')}
- Base Notes: ${originalRequest.baseNotes.join(', ')}

User Feedback:
${userFeedback.correctSeasons ? `Correct Seasons: ${userFeedback.correctSeasons.join(', ')}` : ''}
${userFeedback.correctOccasions ? `Correct Occasions: ${userFeedback.correctOccasions.join(', ')}` : ''}
${userFeedback.correctMoods ? `Correct Moods: ${userFeedback.correctMoods.join(', ')}` : ''}
${userFeedback.feedbackNotes ? `Additional Notes: ${userFeedback.feedbackNotes}` : ''}

Based on this feedback, provide an improved categorization that takes into account the user's corrections. Use the same JSON format as before.

Available options:
- Seasons: ${FRAGRANCE_SEASONS.join(', ')}
- Occasions: ${FRAGRANCE_OCCASIONS.join(', ')}
- Moods: ${FRAGRANCE_MOODS.join(', ')}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo-1106',
      messages: [
        {
          role: 'system',
          content: 'You are learning from user feedback to improve your fragrance categorization accuracy. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: feedbackPrompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.2, // Even lower temperature for learning-based responses
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response received from OpenAI');
    }

    const parsed = parseAIResponse(response);

    return {
      categorization: {
        seasons: parsed.seasons,
        occasions: parsed.occasions,
        moods: parsed.moods,
        confidence: parsed.confidence
      },
      reasoning: `Improved based on user feedback: ${parsed.reasoning}`
    };
  } catch (error) {
    console.error('Error improving categorization:', error);
    throw new Error(`Failed to improve categorization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Check AI service health
export const checkAIHealth = async (): Promise<boolean> => {
  try {
    const client = getOpenAIClient();

    // Simple test request to check if the API is accessible
    const testCompletion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo-1106',
      messages: [
        {
          role: 'user',
          content: 'Return a simple JSON object with a "status" field set to "healthy".'
        }
      ],
      max_tokens: 50,
      temperature: 0,
      response_format: { type: 'json_object' }
    });

    const response = testCompletion.choices[0]?.message?.content;
    if (!response) {
      return false;
    }

    const parsed = JSON.parse(response);
    return parsed.status === 'healthy';
  } catch (error) {
    console.error('AI health check failed:', error);
    return false;
  }
};

// Export utility functions
export {
  FRAGRANCE_SEASONS,
  FRAGRANCE_OCCASIONS,
  FRAGRANCE_MOODS,
  FRAGRANCE_CONCENTRATIONS
} from '@fragrance-battle/types';

// Export brand research functions
export { researchBrand, researchBrandsBatch } from './brand-research';

// Export popularity algorithm functions
export {
  calculatePopularityScore,
  calculatePopularityScoresBatch,
  analyzePopularityBreakdown,
  MAINSTREAM_BRAND_SCORES,
  getPriceAccessibilityScore,
  getCulturalImpactScore,
  getTrendingScore,
  getUserBehaviorScore
} from './popularity-algorithm';

// Export the brand research script runner
export { runBrandResearch } from './brand-research-script';

// Export sales research functions
export {
  researchFragranceSales,
  researchFragranceSalesBatch,
  calculateEnhancedPopularityScore,
  analyzeSalesResearch
} from './sales-research';

// Export the sales research script runner
export { runSalesResearch } from './sales-research-script';

export default {
  categorizeFragrance,
  categorizeFragrancesBatch,
  improveCategorization,
  checkAIHealth,
  initializeOpenAI
};
