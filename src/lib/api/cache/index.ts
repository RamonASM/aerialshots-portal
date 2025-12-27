// Redis cache client
export {
  CACHE_CONFIG,
  type CacheCategory,
  type CacheOptions,
  type CacheResult,
  type CacheStats,
  getRedisClient,
  generateCacheKey,
  generateLocationKey,
  getCached,
  setCached,
  deleteCached,
  invalidatePattern,
  invalidateLocation,
  invalidateCategory,
  cacheThrough,
  cacheLocationData,
  checkCacheHealth,
  getCacheStats,
  recordCacheHit,
  recordCacheMiss,
  resetRedisClient,
} from './redis'

// API cache wrappers
export {
  type CachedApiResponse,
  type CachedResponseOptions,
  withLocationCache,
  withCache,
  createApiCacheKey,
  addCacheHeaders,
  cachedJsonResponse,
  getCacheHealthStatus,
  cachedRoute,
} from './api-cache'
