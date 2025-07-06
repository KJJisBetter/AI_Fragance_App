import { AICategorizationRequest, AICategorizationResponse } from '@fragrance-battle/types';
export declare const initializeOpenAI: (apiKey: string) => void;
export declare const categorizeFragrance: (request: AICategorizationRequest) => Promise<AICategorizationResponse>;
export declare const categorizeFragrancesBatch: (requests: AICategorizationRequest[]) => Promise<AICategorizationResponse[]>;
export declare const improveCategorization: (originalRequest: AICategorizationRequest, userFeedback: {
    correctSeasons?: string[];
    correctOccasions?: string[];
    correctMoods?: string[];
    feedbackNotes?: string;
}) => Promise<AICategorizationResponse>;
export declare const checkAIHealth: () => Promise<boolean>;
export { FRAGRANCE_SEASONS, FRAGRANCE_OCCASIONS, FRAGRANCE_MOODS, FRAGRANCE_CONCENTRATIONS } from '@fragrance-battle/types';
declare const _default: {
    categorizeFragrance: (request: AICategorizationRequest) => Promise<AICategorizationResponse>;
    categorizeFragrancesBatch: (requests: AICategorizationRequest[]) => Promise<AICategorizationResponse[]>;
    improveCategorization: (originalRequest: AICategorizationRequest, userFeedback: {
        correctSeasons?: string[];
        correctOccasions?: string[];
        correctMoods?: string[];
        feedbackNotes?: string;
    }) => Promise<AICategorizationResponse>;
    checkAIHealth: () => Promise<boolean>;
    initializeOpenAI: (apiKey: string) => void;
};
export default _default;
//# sourceMappingURL=index.d.ts.map