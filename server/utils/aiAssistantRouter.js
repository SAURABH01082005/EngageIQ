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

// Creative & Generative queries that require Gemini Agent copywriting & strategic framing
const CREATIVE_GENERATIVE_REGEX = /^(write|give\s+me|generate|create|craft|draft|should\s+i|how\s+should\s+i|brainstorm|plan\s+a)\b/i;

// Conversational chitchat & greetings
const CONVERSATIONAL_REGEX = /^(hi|hello|hey|howdy|good\s+(morning|afternoon|evening)|how\s+are\s+you|how\s+are\s+u|what\'?s\s+up|whats\s+up|sup|who\s+are\s+you|what\s+can\s+you\s+do|tell\s+me\s+a\s+joke)[\s\?!.]*$/i;

/**
 * Check if a query matches any of the fixed listed queries
 */
function isFixedListedQuery(question) {
  const q = (question || '').trim();
  if (!q) return { isFixed: false, patternId: null };

  // Explicit creative prompts (e.g. "Write 3 viral hooks...", "How should I structure a 30-day sprint...")
  if (CREATIVE_GENERATIVE_REGEX.test(q)) {
    return { isFixed: false, patternId: 'creative_generative' };
  }

  // Conversational greetings & capabilities chitchat
  if (CONVERSATIONAL_REGEX.test(q)) {
    return { isFixed: false, patternId: 'conversational' };
  }

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

  // 1. Forced ML mode OR Auto Mode with Fixed Query Pattern:
  // Routes to EngageIQ Two-Stage ML Model & Dynamic Analytics Engine
  if (mode === 'ml_only' || (mode === 'auto' && classification.isFixed)) {
    const mlResult = await processNaturalLanguageQuery(cleanQuery, connectedPlatforms, userId);
    return {
      ...mlResult,
      engineUsed: 'ml_model',
      engineLabel: 'EngageIQ Dynamic ML Model & Analytics Engine',
      routingReason: classification.isFixed
        ? `Fixed listed query (${classification.patternId}) routed to Two-Stage ML Model & Analytics Engine`
        : 'User selected ML Model Only mode'
    };
  }

  // 2. Open-ended / creative / strategic query (or explicit 'gemini_only' mode):
  // Route to Gemini Flash AI Agent, grounded in ML data, live trends, and Model B audience taste
  const mlResult = await processNaturalLanguageQuery(cleanQuery, connectedPlatforms, userId);

  const framedResult = await frameWithGeminiFlash(cleanQuery, mlResult, {
    platforms: connectedPlatforms,
    userId,
    apiKey
  });

  return {
    ...framedResult,
    engineUsed: 'gemini_agent',
    engineLabel: framedResult.engineLabel || 'Gemini Flash AI Agent',
    routingReason: 'Open-ended strategic query routed to Gemini AI Agent with live trends & audience taste'
  };
}

module.exports = {
  routeAIQuery,
  isFixedListedQuery,
  FIXED_QUERY_PATTERNS
};
