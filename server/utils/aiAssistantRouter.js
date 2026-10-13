/**
 * EngageIQ Server - AI Assistant Smart Intent Router
 * 
 * Logic:
 * Whatever the user's query is (prediction, recommendation, best time, drop diagnosis,
 * Reels vs Static, or open-ended/random question):
 * 1. Computes the underlying data and predictions using the Two-Stage ML Model (FastAPI Port 8000),
 *    Ridge regression in-feed engine, and live platform analytics.
 * 2. Asks Gemini Flash 1.5 (Google Generative AI) to FRAME the final structured response,
 *    fusing the ML ground-truth metrics, live trending topics, and Model B audience taste.
 * 3. Supports explicit 'ml_only' mode if the user requests raw data without framing.
 */

const { processNaturalLanguageQuery } = require('./nlpQueryEngine');
const { frameWithGeminiFlash, queryGeminiAgent } = require('./geminiAgent');

// Fixed query patterns for analytics & ML detection
const FIXED_QUERY_PATTERNS = [
  // 0. Post Prediction & Forecasting (ML Model Inference)
  {
    id: 'prediction',
    regex: /(predict|prediction|forecast|estimate\s+engagement|score\s+my|how\s+will\s+.*perform|what\s+reach\s+will|how\s+many\s+likes|rate\s+my\s+post|score\s+this|performance\s+prediction|predict\s+engagement)/i
  },
  // 1. Post Recommendations / What should I post next
  {
    id: 'recommendation',
    regex: /(what\s+should\s+i\s+post|post\s+next|next\s+post|increase\s+engagement|recommendation|how\s+to\s+increase\s+engagement)/i
  },
  // 1b. Audience Content Taste & Preference (Model B)
  {
    id: 'audience_taste',
    regex: /(what\s+type\s+of\s+content|audience\s+like|audience\s+taste|audience\s+type|who\s+is\s+my\s+audience|what\s+does\s+my\s+audience\s+like|content\s+preference|model\s+b)/i
  },
  // 2. Trending topics & hashtags
  {
    id: 'trending',
    regex: /(trend|trending|hashtag|trending\s+topics|popular\s+topics)/i
  },
  // 3. Best time to post / schedule
  {
    id: 'best_time',
    regex: /(best\s+time|when\s+to\s+post|posting\s+time|schedule|what\s+hour|peak\s+hour)/i
  },
  // 4. Content format comparison (Reels vs Static vs Carousel)
  {
    id: 'content_format',
    regex: /(reels\s+vs\s+static|static\s+vs\s+reels|content\s+format|content\s+type|carousel\s+vs|video\s+vs\s+static|which\s+content\s+type)/i
  },
  // 5. Reach or engagement drop diagnosis
  {
    id: 'diagnosis',
    regex: /(reach\s+drop|why\s+did\s+.*drop|engagement\s+drop|why\s+did\s+.*decrease|reach\s+decrease|fell\s+down|lost\s+reach)/i
  },
  // 6. Platform comparison
  {
    id: 'platform_comparison',
    regex: /(compare\s+.*vs|instagram\s+vs\s+twitter|linkedin\s+vs|facebook\s+vs|platform\s+comparison|compare\s+platforms)/i
  },
  // 7. Performance metrics summary
  {
    id: 'metrics_summary',
    regex: /(my\s+total\s+reach|total\s+likes|engagement\s+rate|my\s+performance\s+stats|show\s+metrics|analytics\s+summary)/i
  },
  // 8. ML model status & weights
  {
    id: 'ml_status',
    regex: /(ml\s+model|learned\s+weights|r2\s+score|ridge\s+regression|feature\s+importances)/i
  }
];

/**
 * Check if a query matches any of the fixed listed queries
 */
function isFixedListedQuery(question) {
  const q = (question || '').trim();
  for (const item of FIXED_QUERY_PATTERNS) {
    if (item.regex.test(q)) {
      return { isFixed: true, patternId: item.id };
    }
  }
  return { isFixed: false, patternId: null };
}

/**
 * Route incoming query based on classification and user preferences
 * 
 * @param {string} question - The user's query
 * @param {Array} connectedPlatforms - List of active platforms
 * @param {string} mode - 'auto' | 'ml_only' | 'gemini_only'
 * @param {string} userId - User identifier
 * @param {string} apiKey - Optional custom Gemini API key
 */
async function routeAIQuery(question, connectedPlatforms = [], mode = 'auto', userId = 'default_user', apiKey = '') {
  const cleanQuery = (question || '').trim();
  const classification = isFixedListedQuery(cleanQuery);

  // Forced ML mode: Returns raw mathematical / analytical ML output without Gemini framing
  if (mode === 'ml_only') {
    const mlResult = await processNaturalLanguageQuery(cleanQuery, connectedPlatforms, userId);
    return {
      ...mlResult,
      engineUsed: mlResult.engineUsed || 'ml_model',
      engineLabel: mlResult.engineLabel || 'EngageIQ Dynamic ML Model & Analytics Engine',
      routingReason: 'User selected ML Model Only mode'
    };
  }

  // Auto Mode & Gemini Mode:
  // Whatever the query is, compute the ML/analytical data first,
  // then ask Gemini Flash 1.5 to frame the structured final response.
  const mlResult = await processNaturalLanguageQuery(cleanQuery, connectedPlatforms, userId);

  const framedResult = await frameWithGeminiFlash(cleanQuery, mlResult, {
    platforms: connectedPlatforms,
    userId,
    apiKey
  });

  return {
    ...framedResult,
    routingReason: classification.isFixed
      ? `Two-Stage ML Engine computed ground truth (${classification.patternId}) -> Framed by Gemini 1.5 Flash`
      : 'Open-ended strategic query analyzed & framed by Gemini 1.5 Flash with live trends & audience taste'
  };
}

module.exports = {
  routeAIQuery,
  isFixedListedQuery,
  FIXED_QUERY_PATTERNS
};
