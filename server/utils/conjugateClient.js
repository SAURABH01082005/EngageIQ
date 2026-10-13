/**
 * EngageIQ Backend - Conjugate Media Client Service
 * 
 * Bridges EngageIQ analytics, timelines, charts, recommendations, and ML models
 * with the live Conjugate Media server (Port 5002) scoped by user email.
 */

const fs = require('fs');
const path = require('path');

const CONJUGATE_SERVER_URL = process.env.CONJUGATE_URL || 'http://localhost:5002';
const FALLBACK_STORE_PATH = path.join(__dirname, '../../conjugate-media/server/data/live_store.json');
const DEFAULT_SEED_PATH = path.join(__dirname, '../../conjugate-media/server/data/default_seed.json');

function normalizeKey(key) {
  if (!key) return 'default_user';
  return String(key).toLowerCase().trim();
}

/**
 * Fetch all posts from Conjugate Media for a specific user email
 */
async function fetchConjugatePosts(userKey = 'default_user') {
  const cleanEmail = normalizeKey(userKey);

  try {
    // Try live HTTP fetch from Conjugate Media server
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${CONJUGATE_SERVER_URL}/api/feed/posts?userEmail=${encodeURIComponent(cleanEmail)}`, {
      headers: {
        'x-user-email': cleanEmail,
        'x-user-id': cleanEmail
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.posts && Array.isArray(data.posts)) {
        return data.posts;
      }
    }
  } catch (err) {
    // Fall back to direct file read if server is temporarily unreachable
  }

  // Resilient fallback to local store file
  try {
    if (fs.existsSync(FALLBACK_STORE_PATH)) {
      const fileData = JSON.parse(fs.readFileSync(FALLBACK_STORE_PATH, 'utf-8'));
      const bucket = fileData[cleanEmail] || fileData['default_user'];
      if (bucket && bucket.posts) {
        return bucket.posts.map(p => formatPostForEngageIQ(p));
      }
    }
  } catch (e) {
    console.warn('[ConjugateClient] Could not read fallback store:', e.message);
  }

  // Fallback to default seed
  try {
    if (fs.existsSync(DEFAULT_SEED_PATH)) {
      const seed = JSON.parse(fs.readFileSync(DEFAULT_SEED_PATH, 'utf-8'));
      if (seed && seed.posts) {
        return seed.posts.map(p => formatPostForEngageIQ(p));
      }
    }
  } catch (e) {
    console.warn('[ConjugateClient] Could not read default seed:', e.message);
  }

  return [];
}

/**
 * Fetch channel profiles & subscriber counts from Conjugate Media for user email
 */
async function fetchConjugateChannels(userKey = 'default_user') {
  const cleanEmail = normalizeKey(userKey);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${CONJUGATE_SERVER_URL}/api/platforms?userEmail=${encodeURIComponent(cleanEmail)}`, {
      headers: {
        'x-user-email': cleanEmail,
        'x-user-id': cleanEmail
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.channels) return data.channels;
    }
  } catch (err) {}

  try {
    if (fs.existsSync(FALLBACK_STORE_PATH)) {
      const fileData = JSON.parse(fs.readFileSync(FALLBACK_STORE_PATH, 'utf-8'));
      const bucket = fileData[cleanEmail] || fileData['default_user'];
      if (bucket && bucket.channels) return bucket.channels;
    }
  } catch (e) {}

  return {};
}

/**
 * Helper to normalize post structure
 */
function formatPostForEngageIQ(p) {
  const postDate = new Date(p.createdAt || Date.now());
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return {
    id: p.id,
    platform: p.platform,
    post_type: p.postType || p.post_type || 'text',
    category: p.category || 'General',
    caption_text: p.caption || p.caption_text || '',
    text: p.caption || p.text || '',
    subscribers: p.subscribers || 25000,
    media_specs: p.mediaSpecs || p.media_specs || {},
    timestamp: p.createdAt || p.timestamp,
    post_time: p.createdAt || p.timestamp,
    day_of_week: days[postDate.getDay()],
    hour_of_day: postDate.getHours(),
    metrics: {
      likes: p.metrics?.likes || p.likes || 0,
      comments: p.metrics?.comments || p.comments || 0,
      shares: p.metrics?.shares || p.shares || 0,
      dislikes: p.metrics?.dislikes || p.dislikes || 0,
      reach: p.metrics?.reach || p.reach || 1000,
      video_views: p.metrics?.videoViews || p.metrics?.video_views || 0
    },
    likes: p.metrics?.likes || p.likes || 0,
    comments: p.metrics?.comments || p.comments || 0,
    shares: p.metrics?.shares || p.shares || 0,
    reach: p.metrics?.reach || p.reach || 1000,
    engagement_score: p.metrics?.engagementScore || p.engagement_score || 75,
    commentsList: p.commentsList || []
  };
}

/**
 * Verify if an email is registered on Conjugate Media
 */
async function verifyConjugateAccount(userKey = 'default_user') {
  const cleanEmail = normalizeKey(userKey);
  if (cleanEmail === 'default_user') return { hasAccount: true, email: cleanEmail };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${CONJUGATE_SERVER_URL}/api/users/check?email=${encodeURIComponent(cleanEmail)}`, {
      headers: {
        'x-user-email': cleanEmail,
        'x-user-id': cleanEmail
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return { hasAccount: Boolean(data.hasAccount), email: cleanEmail, message: data.message };
    }
  } catch (err) {}

  // Fallback check in local JSON store
  try {
    if (fs.existsSync(FALLBACK_STORE_PATH)) {
      const fileData = JSON.parse(fs.readFileSync(FALLBACK_STORE_PATH, 'utf-8'));
      if (fileData[cleanEmail]) {
        const hasPosts = fileData[cleanEmail].posts && fileData[cleanEmail].posts.length > 0;
        const isRegistered = Boolean(fileData[cleanEmail].registered || hasPosts);
        return { hasAccount: isRegistered, email: cleanEmail };
      }
    }
  } catch (e) {}

  return { hasAccount: false, email: cleanEmail };
}

/**
 * Fetch trending videos from Conjugate Media for Model A training & virality benchmark
 */
async function fetchConjugateTrendingVideos() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${CONJUGATE_SERVER_URL}/api/feed/trending-videos`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.videos && Array.isArray(data.videos)) {
        return data.videos;
      }
    }
  } catch (err) {}

  // Resilient fallback: call conjugateStore directly
  try {
    const conjugateStore = require('../../conjugate-media/server/services/conjugateStore');
    if (typeof conjugateStore.getTrendingVideos === 'function') {
      const vids = await conjugateStore.getTrendingVideos();
      if (vids && vids.length > 0) return vids;
    }
  } catch (e) {
    console.warn('[ConjugateClient] Could not fallback to direct conjugateStore.getTrendingVideos:', e.message);
  }

  return [];
}

module.exports = {
  fetchConjugatePosts,
  fetchConjugateChannels,
  fetchConjugateTrendingVideos,
  verifyConjugateAccount
};

