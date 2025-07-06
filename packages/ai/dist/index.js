"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FRAGRANCE_CONCENTRATIONS = exports.FRAGRANCE_MOODS = exports.FRAGRANCE_OCCASIONS = exports.FRAGRANCE_SEASONS = exports.checkAIHealth = exports.improveCategorization = exports.categorizeFragrancesBatch = exports.categorizeFragrance = exports.initializeOpenAI = void 0;
const openai_1 = __importDefault(require("openai"));
const types_1 = require("@fragrance-battle/types");
// Initialize OpenAI client
let openai = null;
const initializeOpenAI = (apiKey) => {
    openai = new openai_1.default({
        apiKey: apiKey,
    });
};
exports.initializeOpenAI = initializeOpenAI;
// Get or create OpenAI client
const getOpenAIClient = () => {
    if (!openai) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key is required. Please set OPENAI_API_KEY environment variable.');
        }
        (0, exports.initializeOpenAI)(apiKey);
    }
    return openai;
};
// Generate the AI categorization prompt
const generateCategorizationPrompt = (request) => {
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
   Options: ${types_1.FRAGRANCE_SEASONS.join(', ')}

2. OCCASIONS: What occasions is this fragrance suitable for?
   Options: ${types_1.FRAGRANCE_OCCASIONS.join(', ')}

3. MOODS: What mood or personality does this fragrance convey?
   Options: ${types_1.FRAGRANCE_MOODS.join(', ')}

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
const parseAIResponse = (response) => {
    try {
        const parsed = JSON.parse(response);
        // Validate required fields
        if (!parsed.seasons || !parsed.occasions || !parsed.moods || typeof parsed.confidence !== 'number') {
            throw new Error('Missing required fields in AI response');
        }
        // Validate seasons
        const validSeasons = parsed.seasons.filter((season) => types_1.FRAGRANCE_SEASONS.includes(season));
        // Validate occasions
        const validOccasions = parsed.occasions.filter((occasion) => types_1.FRAGRANCE_OCCASIONS.includes(occasion));
        // Validate moods
        const validMoods = parsed.moods.filter((mood) => types_1.FRAGRANCE_MOODS.includes(mood));
        // Validate confidence
        const confidence = Math.max(0, Math.min(100, parsed.confidence));
        return {
            seasons: validSeasons,
            occasions: validOccasions,
            moods: validMoods,
            confidence,
            reasoning: parsed.reasoning || 'No reasoning provided'
        };
    }
    catch (error) {
        throw new Error(`Failed to parse AI response: ${error}`);
    }
};
// Main categorization function
const categorizeFragrance = async (request) => {
    try {
        const client = getOpenAIClient();
        const prompt = generateCategorizationPrompt(request);
        const completion = await client.chat.completions.create({
            model: 'gpt-4-turbo-preview',
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
        return {
            categorization: {
                seasons: parsed.seasons,
                occasions: parsed.occasions,
                moods: parsed.moods,
                confidence: parsed.confidence
            },
            reasoning: parsed.reasoning
        };
    }
    catch (error) {
        console.error('Error categorizing fragrance:', error);
        throw new Error(`Failed to categorize fragrance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.categorizeFragrance = categorizeFragrance;
// Batch categorization function
const categorizeFragrancesBatch = async (requests) => {
    const results = [];
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        const batchPromises = batch.map(request => (0, exports.categorizeFragrance)(request));
        try {
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }
        catch (error) {
            console.error(`Error processing batch ${i / batchSize + 1}:`, error);
            // Continue with next batch
        }
        // Add delay between batches to respect rate limits
        if (i + batchSize < requests.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return results;
};
exports.categorizeFragrancesBatch = categorizeFragrancesBatch;
// Improve categorization based on user feedback
const improveCategorization = async (originalRequest, userFeedback) => {
    try {
        const client = getOpenAIClient();
        const prompt = `You are an expert fragrance consultant. A user has provided feedback on your previous categorization. Learn from this feedback to provide a better categorization.

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

Based on this feedback, provide an improved categorization following the same JSON format as before.

Return ONLY a JSON object in this exact format:
{
  "seasons": ["Season1", "Season2"],
  "occasions": ["Occasion1", "Occasion2"],
  "moods": ["Mood1", "Mood2"],
  "confidence": 85,
  "reasoning": "Brief explanation incorporating the user feedback"
}`;
        const completion = await client.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert fragrance consultant learning from user feedback to improve your categorizations. Always respond with valid JSON.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.2,
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
            reasoning: parsed.reasoning
        };
    }
    catch (error) {
        console.error('Error improving categorization:', error);
        throw new Error(`Failed to improve categorization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.improveCategorization = improveCategorization;
// Health check function
const checkAIHealth = async () => {
    try {
        const client = getOpenAIClient();
        // Simple test request
        const completion = await client.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'user',
                    content: 'Respond with "OK" if you are working properly.'
                }
            ],
            max_tokens: 10,
            temperature: 0
        });
        const response = completion.choices[0]?.message?.content;
        return response?.toLowerCase().includes('ok') || false;
    }
    catch (error) {
        console.error('AI health check failed:', error);
        return false;
    }
};
exports.checkAIHealth = checkAIHealth;
// Export utility functions
var types_2 = require("@fragrance-battle/types");
Object.defineProperty(exports, "FRAGRANCE_SEASONS", { enumerable: true, get: function () { return types_2.FRAGRANCE_SEASONS; } });
Object.defineProperty(exports, "FRAGRANCE_OCCASIONS", { enumerable: true, get: function () { return types_2.FRAGRANCE_OCCASIONS; } });
Object.defineProperty(exports, "FRAGRANCE_MOODS", { enumerable: true, get: function () { return types_2.FRAGRANCE_MOODS; } });
Object.defineProperty(exports, "FRAGRANCE_CONCENTRATIONS", { enumerable: true, get: function () { return types_2.FRAGRANCE_CONCENTRATIONS; } });
exports.default = {
    categorizeFragrance: exports.categorizeFragrance,
    categorizeFragrancesBatch: exports.categorizeFragrancesBatch,
    improveCategorization: exports.improveCategorization,
    checkAIHealth: exports.checkAIHealth,
    initializeOpenAI: exports.initializeOpenAI
};
//# sourceMappingURL=index.js.map