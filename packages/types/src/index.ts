// Database Models
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
  popularityScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandPrestige {
  id: string;
  brand: string;
  tier: BrandTier;
  priceRange: PriceRange;
  confidence: number;
  reasoning: string;
  researchedAt: Date;
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

export enum BattleStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum BrandTier {
  LUXURY = 'LUXURY',
  HIGH_END_DESIGNER = 'HIGH_END_DESIGNER',
  DESIGNER = 'DESIGNER',
  NICHE = 'NICHE',
  MASS_MARKET = 'MASS_MARKET',
  UNKNOWN = 'UNKNOWN'
}

export enum PriceRange {
  UNDER_50 = 'UNDER_50',
  RANGE_50_150 = 'RANGE_50_150',
  RANGE_150_300 = 'RANGE_150_300',
  RANGE_300_500 = 'RANGE_300_500',
  OVER_500 = 'OVER_500',
  UNKNOWN = 'UNKNOWN'
}

// API Request/Response Types
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

// Brand Research Types
export interface BrandResearchRequest {
  brand: string;
}

export interface BrandResearchResponse {
  brand: string;
  tier: 'luxury' | 'high-end-designer' | 'designer' | 'niche' | 'mass-market' | 'unknown';
  priceRange: 'under-50' | '50-150' | '150-300' | '300-500' | '500+' | 'unknown';
  confidence: number;
  reasoning: string;
}

// AI Service Types
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

// Search and Filter Types
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
  sortBy?: 'name' | 'brand' | 'year' | 'rating' | 'popularity' | 'prestige' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface FragranceSearchResponse {
  fragrances: Fragrance[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Collection Response Types
export interface CollectionWithItems extends Collection {
  items: (CollectionItem & { fragrance: Fragrance })[];
}

export interface BattleWithItems extends Battle {
  items: (BattleItem & { fragrance: Fragrance })[];
}

// Error Types
export interface APIError {
  message: string;
  code: string;
  details?: Record<string, any>;
}

// Utility Types
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

// CSV Import Types
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

// Analytics Types
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

// Constants
export const FRAGRANCE_SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;
export const FRAGRANCE_OCCASIONS = ['Daily', 'Evening', 'Formal', 'Casual', 'Date', 'Work'] as const;
export const FRAGRANCE_MOODS = ['Fresh', 'Confident', 'Sophisticated', 'Playful', 'Romantic', 'Energetic'] as const;
export const FRAGRANCE_CONCENTRATIONS = ['EDT', 'EDP', 'Parfum', 'Cologne', 'Eau Fraiche'] as const;

export const BRAND_TIERS = ['luxury', 'high-end-designer', 'designer', 'niche', 'mass-market', 'unknown'] as const;
export const PRICE_RANGES = ['under-50', '50-150', '150-300', '300-500', '500+', 'unknown'] as const;

export type FragranceSeason = typeof FRAGRANCE_SEASONS[number];
export type FragranceOccasion = typeof FRAGRANCE_OCCASIONS[number];
export type FragranceMood = typeof FRAGRANCE_MOODS[number];
export type FragranceConcentration = typeof FRAGRANCE_CONCENTRATIONS[number];

export type BrandTierType = typeof BRAND_TIERS[number];
export type PriceRangeType = typeof PRICE_RANGES[number];
