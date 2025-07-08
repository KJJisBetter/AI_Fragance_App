# @fragrance-battle/ai

AI categorization utilities for the fragrance battle AI application, powered by OpenAI's GPT-3.5-turbo-1106.

## Features

- **Fragrance Categorization**: Automatically categorize fragrances by seasons, occasions, and moods
- **Batch Processing**: Process multiple fragrances efficiently with rate limiting
- **Feedback Learning**: Improve categorization accuracy based on user feedback
- **Health Monitoring**: Check AI service availability and status
- **Error Handling**: Robust error handling with specific error messages
- **Rate Limiting**: Built-in rate limiting to respect OpenAI API limits

## Installation

```bash
npm install
```

## Configuration

Set your OpenAI API key as an environment variable:

```bash
export OPENAI_API_KEY="sk-your-openai-api-key-here"
```

Or add it to your `.env` file:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

Get your API key from: https://platform.openai.com/api-keys

## Usage

### Basic Categorization

```typescript
import { categorizeFragrance } from '@fragrance-battle/ai';

const result = await categorizeFragrance({
  name: "Bleu de Chanel",
  brand: "Chanel",
  topNotes: ["lemon", "bergamot", "mint"],
  middleNotes: ["ginger", "nutmeg", "jasmine"],
  baseNotes: ["cedar", "sandalwood", "amber"],
  year: 2010,
  concentration: "EDT"
});

console.log(result);
// {
//   categorization: {
//     seasons: ["Spring", "Summer"],
//     occasions: ["Daily", "Work"],
//     moods: ["Fresh", "Confident"],
//     confidence: 92
//   },
//   reasoning: "This fragrance's citrus opening and woody base make it perfect for warm weather and professional settings."
// }
```

### Batch Categorization

```typescript
import { categorizeFragrancesBatch } from '@fragrance-battle/ai';

const requests = [
  { name: "Fragrance 1", brand: "Brand A", topNotes: [...], middleNotes: [...], baseNotes: [...] },
  { name: "Fragrance 2", brand: "Brand B", topNotes: [...], middleNotes: [...], baseNotes: [...] },
];

const results = await categorizeFragrancesBatch(requests);
console.log(`Categorized ${results.length} fragrances`);
```

### Health Check

```typescript
import { checkAIHealth } from '@fragrance-battle/ai';

const isHealthy = await checkAIHealth();
console.log(`AI Service Status: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
```

### Learning from Feedback

```typescript
import { improveCategorization } from '@fragrance-battle/ai';

const improvedResult = await improveCategorization(
  originalRequest,
  {
    correctSeasons: ["Fall", "Winter"],
    correctOccasions: ["Evening", "Formal"],
    feedbackNotes: "This fragrance is too heavy for daily wear"
  }
);
```

## API Reference

### `categorizeFragrance(request: AICategorizationRequest): Promise<AICategorizationResponse>`

Categorizes a single fragrance using OpenAI's GPT-3.5-turbo-1106.

**Parameters:**
- `request`: Fragrance data including name, brand, notes, year, and concentration

**Returns:**
- Promise resolving to categorization result with seasons, occasions, moods, confidence, and reasoning

### `categorizeFragrancesBatch(requests: AICategorizationRequest[]): Promise<AICategorizationResponse[]>`

Categorizes multiple fragrances in batch with rate limiting.

**Parameters:**
- `requests`: Array of fragrance data objects

**Returns:**
- Promise resolving to array of categorization results

### `checkAIHealth(): Promise<boolean>`

Checks if the OpenAI API is accessible and functioning.

**Returns:**
- Promise resolving to boolean indicating service health

### `improveCategorization(originalRequest, userFeedback): Promise<AICategorizationResponse>`

Improves categorization based on user feedback.

**Parameters:**
- `originalRequest`: Original fragrance data
- `userFeedback`: User corrections and feedback

**Returns:**
- Promise resolving to improved categorization result

## Categories

### Seasons
- Spring
- Summer
- Fall
- Winter

### Occasions
- Daily
- Evening
- Formal
- Casual
- Date
- Work

### Moods
- Fresh
- Confident
- Sophisticated
- Playful
- Romantic
- Energetic

## Error Handling

The package provides specific error messages for common issues:

- **Invalid API Key**: `Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.`
- **Rate Limiting**: `OpenAI API rate limit exceeded. Please try again in a few minutes.`
- **Service Issues**: `OpenAI API is currently experiencing issues. Please try again later.`

## Testing

Run the test suite to verify your OpenAI integration:

```bash
# Build the package
npm run build

# Run tests
npm test

# Or run the manual test
node dist/test-ai.js
```

## Rate Limiting

The package includes built-in rate limiting:
- Minimum 1 second between individual requests
- Batch processing with 2-second delays between batches
- Maximum 3 fragrances per batch for optimal performance

## Performance

- **Single Categorization**: ~1-2 seconds
- **Batch Processing**: ~3-5 seconds for 3 fragrances
- **Model Used**: GPT-3.5-turbo-1106 for optimal cost/performance ratio

## Contributing

1. Update the categorization prompt in `generateCategorizationPrompt()`
2. Add new categories to the `@fragrance-battle/types` package
3. Update validation logic in `parseAIResponse()`
4. Test with sample data using the test script

## License

MIT License - see LICENSE file for details.
