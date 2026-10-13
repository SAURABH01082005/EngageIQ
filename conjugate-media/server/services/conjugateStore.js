/**
 * Conjugate Media Server - Data Store Service
 * 
 * Provides robust CRUD operations and live metrics modulation across 
 * Instagram, Facebook, X (Twitter), and LinkedIn.
 * Backed by Firebase Firestore with documents keyed by user email (`users/{userEmail}`)
 * and resilient local JSON persistence.
 */

const fs = require('fs');
const path = require('path');
const Sentiment = require('sentiment');
const sentimentAnalyzer = new Sentiment();
const { db, isFirebaseConnected } = require('../config/firebaseConfig');

const LOCAL_STORE_PATH = path.join(__dirname, '../data/live_store.json');
const DEFAULT_SEED_PATH = path.join(__dirname, '../data/default_seed.json');

// In-memory cache for ultra-fast performance
let memoryStore = {};

/**
 * Standardize user key (email or identifier)
 */
function normalizeUserKey(key) {
  if (!key) return 'default_user';
  return String(key).toLowerCase().trim();
}

/**
 * Load initial default seed data
 */
function loadDefaultSeed() {
  try {
    if (fs.existsSync(DEFAULT_SEED_PATH)) {
      const raw = JSON.parse(fs.readFileSync(DEFAULT_SEED_PATH, 'utf-8'));
      if (raw.channels) return raw;

      const channels = {};
      if (Array.isArray(raw.users)) {
        raw.users.forEach(u => {
          const plat = (u.platform || 'instagram').toLowerCase();
          channels[plat] = {
            platform: plat,
            name: u.name || `${plat} Channel`,
            handle: u.username ? `@${u.username}` : `@${plat}_creator`,
            category: 'Content Creation',
            subscribers: Number(u.followers || 100000),
            following: Number(u.following || 100),
            bio: u.bio || '',
            profilePicUrl: u.profilePicUrl || u.avatar || ''
          };
        });
      }
      return { channels, posts: raw.posts || [] };
    }
  } catch (e) {
    console.error('[Conjugate Store] Error reading default seed:', e);
  }
  return { channels: {}, posts: [] };
}

/**
 * Load local storage file if exists
 */
function loadLocalStore() {
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_STORE_PATH, 'utf-8'));
    }
  } catch (e) {
    console.warn('[Conjugate Store] Error loading local store:', e.message);
  }
  return {};
}

/**
 * Save in-memory store to local JSON file
 */
function persistLocalStore() {
  try {
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Conjugate Store] Error saving local store:', e);
  }
}

/**
 * Initialize store on startup
 */
function initStore() {
  memoryStore = loadLocalStore();
  if (!memoryStore['default_user'] || !memoryStore['default_user'].posts || memoryStore['default_user'].posts.length === 0) {
    const seed = loadDefaultSeed();
    memoryStore['default_user'] = {
      email: 'default_user',
      channels: seed.channels,
      posts: seed.posts,
      updatedAt: new Date().toISOString()
    };
    persistLocalStore();
  }
  console.log('[Conjugate Store] Data store initialized with email document keying.');
}

// Run init
initStore();

/**
 * Check if a user account exists and is registered in Conjugate Media
 */
function hasUserAccount(userKey = 'default_user') {
  const cleanEmail = normalizeUserKey(userKey);
  if (cleanEmail === 'default_user') return true;

  if (memoryStore[cleanEmail]) {
    return Boolean(memoryStore[cleanEmail].registered || (memoryStore[cleanEmail].posts && memoryStore[cleanEmail].posts.length > 0));
  }
  return false;
}

/**
 * Register a user profile in Conjugate Media
 */
async function registerUser(userKey, extraData = {}) {
  const cleanEmail = normalizeUserKey(userKey);
  if (!cleanEmail) throw new Error('Valid email required for registration');

  const baseSource = memoryStore['default_user'] || loadDefaultSeed();

  if (!memoryStore[cleanEmail]) {
    memoryStore[cleanEmail] = {
      email: cleanEmail,
      registered: true,
      registeredAt: new Date().toISOString(),
      channels: JSON.parse(JSON.stringify(baseSource.channels || {})),
      posts: JSON.parse(JSON.stringify(baseSource.posts || [])),
      updatedAt: new Date().toISOString(),
      ...extraData
    };
  } else {
    memoryStore[cleanEmail].registered = true;
    memoryStore[cleanEmail].updatedAt = new Date().toISOString();
  }

  persistLocalStore();
  saveUserBucket(cleanEmail).catch(() => {});

  return {
    email: cleanEmail,
    registered: true,
    channels: memoryStore[cleanEmail].channels,
    postCount: memoryStore[cleanEmail].posts.length
  };
}

/**
 * Helper to get user-specific data bucket (keyed by user email)
 */
async function getUserBucket(userKey = 'default_user') {
  const cleanEmail = normalizeUserKey(userKey);

  if (!memoryStore[cleanEmail]) {
    // 1. Instant local initialization from base seed
    const baseSource = memoryStore['default_user'] || loadDefaultSeed();
    memoryStore[cleanEmail] = {
      email: cleanEmail,
      registered: cleanEmail === 'default_user',
      channels: JSON.parse(JSON.stringify(baseSource.channels || {})),
      posts: JSON.parse(JSON.stringify(baseSource.posts || [])),
      updatedAt: new Date().toISOString()
    };
    persistLocalStore();

    // 2. Non-blocking background Firestore pull
    if (isFirebaseConnected && db) {
      db.collection('users').doc(cleanEmail).get().then(userDoc => {
        if (userDoc && userDoc.exists) {
          const docData = userDoc.data();
          const conjugateData = docData.conjugate_media || docData;
          if (conjugateData.channels || conjugateData.posts) {
            memoryStore[cleanEmail].channels = conjugateData.channels || memoryStore[cleanEmail].channels;
            memoryStore[cleanEmail].posts = conjugateData.posts || memoryStore[cleanEmail].posts;
            memoryStore[cleanEmail].registered = true;
            persistLocalStore();
          }
        }
      }).catch(err => {
        console.warn('[Conjugate Store] Background Firestore pull notice:', err.message);
      });
    }
  }

  return memoryStore[cleanEmail];
}

/**
 * Calculate dynamic engagement score for a post
 */
function calculateEngagementScore(post) {
  const metrics = post.metrics || {};
  const likes = Number(metrics.likes || 0);
  const comments = Number(metrics.comments || 0);
  const shares = Number(metrics.shares || 0);
  const dislikes = Number(metrics.dislikes || 0);
  const reach = Number(metrics.reach || 1000);

  const rawEngagement = (likes * 1) + (comments * 2.5) + (shares * 3.5) - (dislikes * 2);
  const rate = reach > 0 ? (rawEngagement / reach) * 100 : 5;
  const score = Math.round(Math.min(99, Math.max(30, rate * 12 + 40)));
  return score;
}

/**
 * Save user bucket to Firestore (doc ID = user email) and local JSON
 */
async function saveUserBucket(userKey = 'default_user') {
  const cleanEmail = normalizeUserKey(userKey);
  if (!memoryStore[cleanEmail]) return;

  memoryStore[cleanEmail].updatedAt = new Date().toISOString();
  persistLocalStore();

  // Non-blocking background sync to Firebase Firestore under users/{userEmail}
  if (isFirebaseConnected && db) {
    db.collection('users').doc(cleanEmail).set({
      email: cleanEmail,
      lastActive: new Date().toISOString(),
      conjugate_media: {
        channels: memoryStore[cleanEmail].channels,
        posts: memoryStore[cleanEmail].posts,
        lastUpdated: new Date().toISOString()
      }
    }, { merge: true }).catch(err => {
      console.warn('[Conjugate Store] Background Firestore sync notice:', err.message);
    });
  }
}

/**
 * GET Channels & Subscriber info
 */
async function getChannels(userKey = 'default_user') {
  const bucket = await getUserBucket(userKey);
  return bucket.channels || {};
}

/**
 * UPDATE Channel details & Subscriber/Follower count
 */
async function updateChannel(userKey = 'default_user', platform, updateData = {}) {
  const bucket = await getUserBucket(userKey);
  const platKey = (platform || 'instagram').toLowerCase().replace('x', 'twitter');

  if (!bucket.channels[platKey]) {
    bucket.channels[platKey] = {
      platform: platKey,
      name: `${platKey.toUpperCase()} Channel`,
      handle: `@${platKey}_user`,
      category: 'General',
      subscribers: 10000,
      following: 100,
      bio: 'Social media profile'
    };
  }

  const ch = bucket.channels[platKey];

  if (updateData.deltaSubscribers !== undefined) {
    ch.subscribers = Math.max(0, Number(ch.subscribers || 0) + Number(updateData.deltaSubscribers));
  } else if (updateData.subscribers !== undefined) {
    ch.subscribers = Math.max(0, Number(updateData.subscribers));
  }

  if (updateData.name !== undefined) ch.name = updateData.name;
  if (updateData.handle !== undefined) ch.handle = updateData.handle;
  if (updateData.bio !== undefined) ch.bio = updateData.bio;
  if (updateData.category !== undefined) ch.category = updateData.category;
  if (updateData.avatar !== undefined) ch.avatar = updateData.avatar;

  // Also update subscribers on all posts belonging to this platform
  bucket.posts.forEach(p => {
    if (p.platform === platKey) {
      p.subscribers = ch.subscribers;
    }
  });

  await saveUserBucket(userKey);
  return ch;
}

/**
 * GET Posts with filtering, searching, and sorting
 */
async function getPosts(userKey = 'default_user', filter = {}) {
  const bucket = await getUserBucket(userKey);
  let posts = [...bucket.posts];

  // Platform filter
  if (filter.platform && filter.platform !== 'all') {
    const pKey = filter.platform.toLowerCase().replace('x', 'twitter');
    posts = posts.filter(p => p.platform === pKey);
  }

  // Category filter
  if (filter.category && filter.category !== 'all') {
    posts = posts.filter(p => (p.category || '').toLowerCase() === filter.category.toLowerCase());
  }

  // Post type filter (video, carousel, text, image)
  if (filter.postType && filter.postType !== 'all') {
    posts = posts.filter(p => (p.postType || '').toLowerCase() === filter.postType.toLowerCase());
  }

  // Text search query
  if (filter.search) {
    const q = filter.search.toLowerCase();
    posts = posts.filter(p => 
      (p.caption || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }

  // Sorting
  posts.sort((a, b) => {
    if (filter.sortBy === 'likes') return (b.metrics?.likes || 0) - (a.metrics?.likes || 0);
    if (filter.sortBy === 'engagement') return (b.metrics?.engagementScore || 0) - (a.metrics?.engagementScore || 0);
    // Default newest first
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  return posts;
}

/**
 * GET Single Post by ID
 */
async function getPostById(userKey = 'default_user', postId) {
  const bucket = await getUserBucket(userKey);
  return bucket.posts.find(p => p.id === postId) || null;
}

/**
 * CREATE New Post
 */
async function createPost(userKey = 'default_user', postData = {}) {
  const bucket = await getUserBucket(userKey);
  const platKey = (postData.platform || 'instagram').toLowerCase().replace('x', 'twitter');
  const channel = bucket.channels[platKey] || { subscribers: 25000 };

  const id = postData.id || `cm_post_${platKey}_${Date.now()}`;
  const initialLikes = Number(postData.likes !== undefined ? postData.likes : Math.round(150 + Math.random() * 300));
  const initialComments = Number(postData.comments !== undefined ? postData.comments : Math.round(20 + Math.random() * 50));
  const initialShares = Number(postData.shares !== undefined ? postData.shares : Math.round(10 + Math.random() * 30));
  const initialDislikes = Number(postData.dislikes !== undefined ? postData.dislikes : 0);
  const initialReach = Number(postData.reach !== undefined ? postData.reach : Math.round(channel.subscribers * 0.45));
  const initialViews = postData.postType === 'video' ? Math.round(initialReach * 0.85) : 0;

  const newPost = {
    id,
    platform: platKey,
    postType: postData.postType || 'text',
    category: postData.category || 'General',
    caption: postData.caption || postData.text || '',
    mediaSpecs: postData.mediaSpecs || {
      aspectRatio: postData.aspectRatio || (postData.postType === 'video' ? '9:16' : '1:1'),
      durationSec: postData.durationSec ? Number(postData.durationSec) : (postData.postType === 'video' ? 25 : 0),
      hasSubtitles: postData.hasSubtitles !== undefined ? Boolean(postData.hasSubtitles) : true,
      hookRating: postData.hookRating ? Number(postData.hookRating) : 8,
      hasTextOverlay: postData.hasTextOverlay !== undefined ? Boolean(postData.hasTextOverlay) : true,
      slideCount: postData.slideCount ? Number(postData.slideCount) : (postData.postType === 'carousel' ? 5 : 1)
    },
    metrics: {
      likes: initialLikes,
      comments: initialComments,
      shares: initialShares,
      dislikes: initialDislikes,
      reach: initialReach,
      videoViews: initialViews,
      engagementScore: 75
    },
    subscribers: channel.subscribers || 25000,
    createdAt: postData.createdAt || new Date().toISOString(),
    commentsList: postData.commentsList || []
  };

  newPost.metrics.engagementScore = calculateEngagementScore(newPost);

  bucket.posts.unshift(newPost);
  await saveUserBucket(userKey);

  return newPost;
}

/**
 * MODULATE Post Metrics (Likes, Comments, Shares, Dislikes, Reach, Views)
 */
async function updatePostMetrics(userKey = 'default_user', postId, updates = {}) {
  const bucket = await getUserBucket(userKey);
  const post = bucket.posts.find(p => p.id === postId);

  if (!post) {
    throw new Error(`Post with ID "${postId}" not found`);
  }

  if (!post.metrics) post.metrics = {};

  // Incremental changes
  if (updates.likesDelta !== undefined) post.metrics.likes = Math.max(0, (post.metrics.likes || 0) + Number(updates.likesDelta));
  if (updates.commentsDelta !== undefined) post.metrics.comments = Math.max(0, (post.metrics.comments || 0) + Number(updates.commentsDelta));
  if (updates.sharesDelta !== undefined) post.metrics.shares = Math.max(0, (post.metrics.shares || 0) + Number(updates.sharesDelta));
  if (updates.dislikesDelta !== undefined) post.metrics.dislikes = Math.max(0, (post.metrics.dislikes || 0) + Number(updates.dislikesDelta));
  if (updates.reachDelta !== undefined) post.metrics.reach = Math.max(0, (post.metrics.reach || 0) + Number(updates.reachDelta));
  if (updates.viewsDelta !== undefined) post.metrics.videoViews = Math.max(0, (post.metrics.videoViews || 0) + Number(updates.viewsDelta));

  // Direct absolute overrides
  if (updates.likes !== undefined) post.metrics.likes = Math.max(0, Number(updates.likes));
  if (updates.comments !== undefined) post.metrics.comments = Math.max(0, Number(updates.comments));
  if (updates.shares !== undefined) post.metrics.shares = Math.max(0, Number(updates.shares));
  if (updates.dislikes !== undefined) post.metrics.dislikes = Math.max(0, Number(updates.dislikes));
  if (updates.reach !== undefined) post.metrics.reach = Math.max(0, Number(updates.reach));
  if (updates.videoViews !== undefined) post.metrics.videoViews = Math.max(0, Number(updates.videoViews));

  // Dynamic Reach Auto-adjustment if engagement increases significantly
  const totalEng = (post.metrics.likes || 0) + (post.metrics.comments || 0) + (post.metrics.shares || 0);
  if (post.metrics.reach < totalEng * 4) {
    post.metrics.reach = Math.round(totalEng * 8.5);
  }

  post.metrics.engagementScore = calculateEngagementScore(post);

  await saveUserBucket(userKey);
  return post;
}

/**
 * ADD a real comment to a post
 */
async function addComment(userKey = 'default_user', postId, commentData = {}) {
  const bucket = await getUserBucket(userKey);
  const post = bucket.posts.find(p => p.id === postId);

  if (!post) {
    throw new Error(`Post with ID "${postId}" not found`);
  }

  const commentText = (commentData.comment || commentData.text || '').trim();
  if (!commentText) {
    throw new Error('Comment text cannot be empty');
  }

  const sentimentRes = sentimentAnalyzer.analyze(commentText);
  let sentimentTag = 'neutral';
  if (sentimentRes.score > 0) sentimentTag = 'positive';
  else if (sentimentRes.score < 0) sentimentTag = 'negative';

  const newComment = {
    id: `c_${Date.now()}`,
    user: commentData.user || userKey || 'guest_user',
    comment: commentText,
    sentiment: sentimentTag,
    timestamp: new Date().toISOString()
  };

  if (!post.commentsList) post.commentsList = [];
  post.commentsList.unshift(newComment);

  post.metrics.comments = (post.metrics.comments || 0) + 1;
  post.metrics.engagementScore = calculateEngagementScore(post);

  await saveUserBucket(userKey);
  return { post, newComment };
}

/**
 * UPDATE Post Timeline (timestamp/date)
 */
async function updatePostTimeline(userKey = 'default_user', postId, newTimestamp) {
  const bucket = await getUserBucket(userKey);
  const post = bucket.posts.find(p => p.id === postId);

  if (!post) {
    throw new Error(`Post with ID "${postId}" not found`);
  }

  post.createdAt = new Date(newTimestamp).toISOString();
  await saveUserBucket(userKey);
  return post;
}

/**
 * DELETE Post
 */
async function deletePost(userKey = 'default_user', postId) {
  const bucket = await getUserBucket(userKey);
  const idx = bucket.posts.findIndex(p => p.id === postId);

  if (idx === -1) {
    throw new Error(`Post with ID "${postId}" not found`);
  }

  const deleted = bucket.posts.splice(idx, 1)[0];
  await saveUserBucket(userKey);
  return deleted;
}

/**
 * RESET / RE-SEED user sandbox
 */
async function resetUserStore(userKey = 'default_user') {
  const cleanEmail = normalizeUserKey(userKey);
  const seed = loadDefaultSeed();
  memoryStore[cleanEmail] = {
    email: cleanEmail,
    channels: JSON.parse(JSON.stringify(seed.channels)),
    posts: JSON.parse(JSON.stringify(seed.posts)),
    updatedAt: new Date().toISOString()
  };
  await saveUserBucket(cleanEmail);
  return memoryStore[cleanEmail];
}

/**
 * FORMAT ALL POSTS FOR ENGAGEIQ (Feeds ML & Analytics)
 */
async function getAllPostsForEngageIQ(userKey = 'default_user') {
  const bucket = await getUserBucket(userKey);
  return bucket.posts.map(p => {
    const postDate = new Date(p.createdAt || Date.now());
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      id: p.id,
      platform: p.platform,
      post_type: p.postType,
      category: p.category,
      caption_text: p.caption,
      text: p.caption,
      subscribers: p.subscribers,
      media_specs: p.mediaSpecs || {},
      timestamp: p.createdAt,
      post_time: p.createdAt,
      day_of_week: days[postDate.getDay()],
      hour_of_day: postDate.getHours(),
      metrics: {
        likes: p.metrics?.likes || 0,
        comments: p.metrics?.comments || 0,
        shares: p.metrics?.shares || 0,
        dislikes: p.metrics?.dislikes || 0,
        reach: p.metrics?.reach || 1000,
        video_views: p.metrics?.videoViews || 0
      },
      likes: p.metrics?.likes || 0,
      comments: p.metrics?.comments || 0,
      shares: p.metrics?.shares || 0,
      reach: p.metrics?.reach || 1000,
      engagement_score: p.metrics?.engagementScore || 75,
      commentsList: p.commentsList || []
    };
  });
}

/**
 * PARSE DURATION STRING TO SECONDS HELPER
 */
function parseDurationSec(durationStr) {
  if (typeof durationStr === 'number') return durationStr;
  if (!durationStr) return 30;
  const str = String(durationStr).toLowerCase().trim();
  if (str.includes('reel') || str.includes('short')) return 28;
  const parts = str.split(':').map(p => Number(p.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 30;
}

/**
 * GET ALL TRENDING VIDEOS FOR ENGAGEIQ (Model A Content Prior)
 * Aggregates verified trending videos from YouTube Scraper, Instagram Reels, and Facebook Videos
 */
async function getTrendingVideos() {
  const trendingVideos = [];
  const ytPath = path.join(__dirname, '../data/dataset_youtube-channel-scraper_2026-10-10_15-39-13-562.json');

  // 1. YouTube Videos Scraper Ingestion
  try {
    if (fs.existsSync(ytPath)) {
      const ytData = JSON.parse(fs.readFileSync(ytPath, 'utf-8'));
      if (Array.isArray(ytData)) {
        ytData.filter(v => v.id && v.title).forEach((v, idx) => {
          const views = Number(v.viewCount) || 500000;
          const channelSubs = Number(v.aboutChannelInfo?.numberOfSubscribers) || 8630000;
          const likes = Math.round(views * 0.048);
          const comments = Math.round(likes * 0.07);
          const shares = Math.round(likes * 0.03);
          const durSec = parseDurationSec(v.duration);

          const breakout = Math.log((views + 1) / (channelSubs + 1));
          const quality = views > 0 ? (likes + comments) / views : 0;
          const virality = views + 15 * likes + 50 * comments + 100 * shares;

          trendingVideos.push({
            id: `trending_yt_${v.id}`,
            video_id: v.id,
            title: v.title,
            caption: v.title,
            platform: 'youtube',
            author: v.channelName || 'Nitish Rajput',
            channel_subs: channelSubs,
            views,
            likes,
            comments,
            shares,
            duration: v.duration || '15:00',
            duration_sec: durSec,
            aspect_ratio: durSec <= 60 ? '9:16' : '16:9',
            has_subtitles: true,
            hook_rating: 8.5,
            thumbnail_url: v.thumbnailUrl || '',
            video_url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
            breakout: Number(breakout.toFixed(4)),
            quality: Number(quality.toFixed(5)),
            virality,
            published_at: v.date || new Date(Date.now() - idx * 86400000).toISOString()
          });
        });
      }
    }
  } catch (err) {
    console.warn('[Conjugate Store] Warning reading YouTube trending dataset:', err.message);
  }

  // 2. Ingest Video Posts (Instagram Reels, Facebook Videos) from default_user / seed
  const defaultPosts = memoryStore['default_user']?.posts || loadDefaultSeed().posts || [];
  defaultPosts.filter(p => p.postType === 'video' || p.platform === 'youtube').forEach((p, idx) => {
    // Avoid duplicates
    if (trendingVideos.some(tv => tv.video_id === p.id || tv.id === p.id)) return;

    const views = Number(p.views || p.metrics?.videoViews || p.metrics?.views || 250000);
    const channelSubs = Number(p.subscribers || 3662163);
    const likes = Number(p.likes || p.metrics?.likes || Math.round(views * 0.05));
    const comments = Number(p.comments || p.metrics?.comments || Math.round(likes * 0.03));
    const shares = Number(p.shares || p.metrics?.shares || Math.round(likes * 0.02));
    const durSec = parseDurationSec(p.duration || p.mediaSpecs?.durationSec);

    const breakout = Math.log((views + 1) / (channelSubs + 1));
    const quality = views > 0 ? (likes + comments) / views : 0;
    const virality = views + 15 * likes + 50 * comments + 100 * shares;

    trendingVideos.push({
      id: `trending_${p.platform || 'video'}_${p.id || idx}`,
      video_id: p.id || `v_${idx}`,
      title: p.title || p.caption?.slice(0, 80) || 'Trending Social Video',
      caption: p.caption || p.content || '',
      platform: p.platform || 'instagram',
      author: p.author || 'Creator',
      channel_subs: channelSubs,
      views,
      likes,
      comments,
      shares,
      duration: p.duration || '00:30',
      duration_sec: durSec,
      aspect_ratio: p.mediaSpecs?.aspectRatio || (p.platform === 'instagram' ? '9:16' : '16:9'),
      has_subtitles: p.mediaSpecs?.hasSubtitles !== undefined ? p.mediaSpecs.hasSubtitles : true,
      hook_rating: p.mediaSpecs?.hookRating || 8,
      thumbnail_url: p.mediaUrl || '',
      video_url: p.videoUrl || '',
      breakout: Number(breakout.toFixed(4)),
      quality: Number(quality.toFixed(5)),
      virality,
      published_at: p.publishedAt || p.createdAt || new Date(Date.now() - idx * 86400000).toISOString()
    });
  });

  return trendingVideos;
}

module.exports = {
  getChannels,
  updateChannel,
  getPosts,
  getPostById,
  createPost,
  updatePostMetrics,
  addComment,
  updatePostTimeline,
  deletePost,
  resetUserStore,
  getAllPostsForEngageIQ,
  getTrendingVideos,
  normalizeUserKey,
  hasUserAccount,
  registerUser
};

