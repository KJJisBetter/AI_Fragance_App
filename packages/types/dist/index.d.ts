export interface User {
    id: string;
    email: string;
    username: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Fragrance {
    id: string;
    name: string;
    brand: string;
    year?: number;
    concentration?: string;
    topNotes: string[];
    middleNotes: string[];
    baseNotes: string[];
    aiSeasons: string[];
    aiOccasions: string[];
    aiMoods: string[];
    fragranticaSeasons: string[];
    communityRating?: number;
    verified: boolean;
    longevity?: number;
    sillage?: number;
    projection?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface Collection {
    id: string;
    userId: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CollectionItem {
    id: string;
    collectionId: string;
    fragranceId: string;
    personalRating?: number;
    personalNotes?: string;
    purchaseDate?: Date;
    bottleSize?: string;
    createdAt: Date;
}
export interface Battle {
    id: string;
    userId: string;
    title: string;
    description?: string;
    status: BattleStatus;
    createdAt: Date;
    completedAt?: Date;
}
export interface BattleItem {
    id: string;
    battleId: string;
    fragranceId: string;
    position: number;
    votes: number;
    winner: boolean;
}
export interface AICategorFeedback {
    id: string;
    userId: string;
    fragranceId: string;
    aiSuggestion: Record<string, any>;
    userCorrection: Record<string, any>;
    feedbackType: string;
    createdAt: Date;
}
export declare enum BattleStatus {
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
}
export interface AuthResponse {
    user: Omit<User, 'passwordHash'>;
    token: string;
}
export interface CreateFragranceRequest {
    name: string;
    brand: string;
    year?: number;
    concentration?: string;
    topNotes: string[];
    middleNotes: string[];
    baseNotes: string[];
}
export interface UpdateFragranceRequest extends Partial<CreateFragranceRequest> {
    id: string;
}
export interface CreateCollectionRequest {
    name: string;
    description?: string;
}
export interface AddToCollectionRequest {
    fragranceId: string;
    personalRating?: number;
    personalNotes?: string;
    bottleSize?: string;
}
export interface CreateBattleRequest {
    title: string;
    description?: string;
    fragranceIds: string[];
}
export interface VoteBattleRequest {
    fragranceId: string;
}
export interface AICategorFeedbackRequest {
    fragranceId: string;
    aiSuggestion: Record<string, any>;
    userCorrection: Record<string, any>;
    feedbackType: string;
}
export interface AICategorization {
    seasons: string[];
    occasions: string[];
    moods: string[];
    confidence: number;
}
export interface AICategorizationRequest {
    name: string;
    brand: string;
    topNotes: string[];
    middleNotes: string[];
    baseNotes: string[];
    year?: number;
    concentration?: string;
}
export interface AICategorizationResponse {
    categorization: AICategorization;
    reasoning: string;
}
export interface FragranceSearchFilters {
    brand?: string;
    season?: string;
    occasion?: string;
    mood?: string;
    yearFrom?: number;
    yearTo?: number;
    concentration?: string;
    verified?: boolean;
}
export interface FragranceSearchRequest {
    query?: string;
    filters?: FragranceSearchFilters;
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'brand' | 'year' | 'rating' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}
export interface FragranceSearchResponse {
    fragrances: Fragrance[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface CollectionWithItems extends Collection {
    items: (CollectionItem & {
        fragrance: Fragrance;
    })[];
}
export interface BattleWithItems extends Battle {
    items: (BattleItem & {
        fragrance: Fragrance;
    })[];
}
export interface APIError {
    message: string;
    code: string;
    details?: Record<string, any>;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: APIError;
}
export interface FragranceCSVRow {
    name: string;
    brand: string;
    year?: string;
    concentration?: string;
    topNotes: string;
    middleNotes: string;
    baseNotes: string;
    fragranticaSeasons?: string;
    communityRating?: string;
    longevity?: string;
    sillage?: string;
    projection?: string;
}
export interface UserAnalytics {
    totalFragrances: number;
    totalBattles: number;
    favoriteSeasons: string[];
    favoriteOccasions: string[];
    averageRating: number;
    mostUsedBrands: string[];
}
export interface BattleAnalytics {
    totalVotes: number;
    winRate: number;
    popularityScore: number;
    seasonalPreference: Record<string, number>;
}
export declare const FRAGRANCE_SEASONS: readonly ["Spring", "Summer", "Fall", "Winter"];
export declare const FRAGRANCE_OCCASIONS: readonly ["Daily", "Evening", "Formal", "Casual", "Date", "Work"];
export declare const FRAGRANCE_MOODS: readonly ["Fresh", "Confident", "Sophisticated", "Playful", "Romantic", "Energetic"];
export declare const FRAGRANCE_CONCENTRATIONS: readonly ["EDT", "EDP", "Parfum", "Cologne", "Eau Fraiche"];
export type FragranceSeason = typeof FRAGRANCE_SEASONS[number];
export type FragranceOccasion = typeof FRAGRANCE_OCCASIONS[number];
export type FragranceMood = typeof FRAGRANCE_MOODS[number];
export type FragranceConcentration = typeof FRAGRANCE_CONCENTRATIONS[number];
//# sourceMappingURL=index.d.ts.map