/**
 * Conjugate Media - Trending Data Store Service
 * 
 * Provides unified ingestion, real-time metrics modulation, creation,
 * and direct disk persistence for trending datasets across:
 * - YouTube Trending
 * - Instagram Trending
 * - Facebook Trending
 * - LinkedIn Trending
 * - X / Twitter Trending
 * 
 * When metrics or items are edited, changes are written directly to 
 * the corresponding JSON dataset files in server/data/ so the real 
 * datasets are permanently changed.
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');

// Dataset file paths
const DATASET_PATHS = {
  youtube: path.join(dataDir, 'dataset_youtube-trending-scraper_2026-10-11_13-13-46-735.json'),
  instagram: path.join(dataDir, 'dataset_instagram-trending-scraper_2026-10-11_13-34-15-622.json'),
  facebook: path.join(dataDir, 'dataset_facebook-trending-scraper_2026-10-11_13-40-00-000.json'),
  linkedin: path.join(dataDir, 'dataset_linkedin-trending-scraper_2026-10-11_13-45-00-000.json'),
  twitter: path.join(dataDir, 'dataset_twitter-trends_2026-10-11_13-24-06-583.json')
};

// In-memory cache
let cachedItems = null;
let lastLoadedTime = 0;

/**
 * Safely read a JSON file from disk
 */
function readJsonFile(filePath, fallback = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`[TrendingStore] Error reading ${filePath}:`, err.message);
  }
  return fallback;
}

/**
 * Safely write a JSON file to disk
 */
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[TrendingStore] Error writing to ${filePath}:`, err.message);
    throw new Error(`Failed to persist dataset changes to disk: ${err.message}`);
  }
}

/**
 * Parse duration string (e.g. "05:30" or "01:25:00") into seconds
 */
function parseDurationSec(durationStr) {
  if (!durationStr) return 45;
  if (typeof durationStr === 'number') return durationStr;
  const parts = String(durationStr).split(':').map(Number);
  if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  if (parts.length === 2) return (parts[0] * 60) + parts[1];
  return Number(durationStr) || 45;
}

/**
 * Normalize YouTube item
 */
function normalizeYouTubeItem(item, idx) {
  const views = Number(item.view_count) || 500000;
  const likes = item.like_count !== null && item.like_count !== undefined 
    ? Number(item.like_count) 
    : Math.round(views * 0.048);
  const comments = item.comment_count !== null && item.comment_count !== undefined 
    ? Number(item.comment_count) 
    : Math.round(likes * 0.07);
  const shares = item.share_count !== undefined 
    ? Number(item.share_count) 
    : Math.round(likes * 0.03);

  const durSec = parseDurationSec(item.duration);
  const virality = views + (likes * 15) + (comments * 50) + (shares * 100);
  const breakout = Number((Math.log(views + 1) / Math.log(1000000)).toFixed(2));
  const rawId = item.video_id || `yt_${idx}`;

  return {
    id: `trending_yt_${rawId}`,
    rawId,
    rawIndex: idx,
    platform: 'youtube',
    rank: idx + 1,
    title: item.title || 'Trending YouTube Video',
    caption: item.description || item.title || '',
    author: item.channel_title || 'YouTube Creator',
    username: (item.channel_title || 'creator').toLowerCase().replace(/\s+/g, '_'),
    avatar: item.channel_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=60',
    thumbnailUrl: item.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
    videoUrl: item.video_url || `https://www.youtube.com/watch?v=${rawId}`,
    duration: item.duration || '04:30',
    durationSec: durSec,
    aspectRatio: durSec <= 60 ? '9:16' : '16:9',
    category: item.category || 'Entertainment & Tech',
    tags: Array.isArray(item.tags) ? item.tags : ['YouTubeTrending', 'ViralVideo'],
    views,
    likes,
    comments,
    shares,
    publishedAt: item.published_at || new Date(Date.now() - idx * 3600000 * 3).toISOString(),
    breakoutScore: breakout,
    viralityScore: virality,
    engagementRate: (((likes + comments + shares) / Math.max(views, 1)) * 100).toFixed(2) + '%'
  };
}

/**
 * Normalize Instagram item
 */
function normalizeInstagramItem(item, idx) {
  const views = Number(item.view_count) || 750000;
  const likes = item.like_count !== null && item.like_count !== undefined 
    ? Number(item.like_count) 
    : Math.round(views * 0.052);
  const comments = item.comment_count !== null && item.comment_count !== undefined 
    ? Number(item.comment_count) 
    : Math.round(likes * 0.025);
  const shares = item.share_count !== undefined 
    ? Number(item.share_count) 
    : Math.round(likes * 0.038);

  const durSec = item.duration_seconds || 30;
  const virality = views + (likes * 15) + (comments * 50) + (shares * 100);
  const breakout = Number((Math.log(views + 1) / Math.log(1000000)).toFixed(2));
  const rawId = item.post_id || item.shortcode || `ig_${idx}`;

  let mediaUrl = item.cover_url || '';
  if (!mediaUrl && item.media_items && item.media_items[0]) {
    mediaUrl = item.media_items[0].cover_url || item.media_items[0].media_url || '';
  }
  if (!mediaUrl) {
    mediaUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';
  }

  const caption = item.caption || 'Trending Instagram Reel';
  const title = caption.split('\n')[0].slice(0, 80) || 'Trending Instagram Reel';

  return {
    id: `trending_ig_${rawId}`,
    rawId,
    rawIndex: idx,
    platform: 'instagram',
    rank: idx + 1,
    title,
    caption,
    author: item.owner_name || item.owner_username || 'Instagram Creator',
    username: item.owner_username || 'instagram_creator',
    avatar: item.owner_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=60',
    thumbnailUrl: mediaUrl,
    videoUrl: item.post_url || `https://www.instagram.com/p/${item.shortcode || rawId}/`,
    duration: `00:${durSec < 10 ? '0' + durSec : durSec}`,
    durationSec: durSec,
    aspectRatio: '9:16',
    category: item.category || (item.explore_topic ? item.explore_topic.toUpperCase() : 'Creator Reels'),
    tags: Array.isArray(item.hashtags) && item.hashtags.length > 0 ? item.hashtags : ['Reels', 'Viral', 'ExplorePage'],
    views,
    likes,
    comments,
    shares,
    publishedAt: item.published_at || new Date(Date.now() - idx * 3600000 * 2).toISOString(),
    breakoutScore: breakout,
    viralityScore: virality,
    engagementRate: (((likes + comments + shares) / Math.max(views, 1)) * 100).toFixed(2) + '%'
  };
}

/**
 * Normalize Facebook item
 */
function normalizeFacebookItem(item, idx) {
  const views = Number(item.view_count || item.views) || 1200000;
  const likes = Number(item.reactionsCount || (item.reactions && item.reactions.like) || item.likes) || Math.round(views * 0.045);
  const comments = Number(item.commentsCount || item.comments) || Math.round(likes * 0.06);
  const shares = Number(item.sharesCount || item.shares) || Math.round(likes * 0.25);

  const durSec = parseDurationSec(item.duration);
  const virality = views + (likes * 15) + (comments * 50) + (shares * 100);
  const breakout = Number((Math.log(views + 1) / Math.log(1000000)).toFixed(2));
  const rawId = item.postId || item.id || `fb_${idx}`;

  let mediaUrl = item.thumbnail_url || '';
  if (!mediaUrl && item.attachments && item.attachments[0]) {
    mediaUrl = item.attachments[0].cover_url || item.attachments[0].url || '';
  }
  if (!mediaUrl) {
    mediaUrl = 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=60';
  }

  const title = item.title || (item.postText ? item.postText.split('\n')[0].slice(0, 80) : 'Viral Facebook Video');

  return {
    id: `trending_fb_${rawId}`,
    rawId,
    rawIndex: idx,
    platform: 'facebook',
    rank: idx + 1,
    title,
    caption: item.postText || item.caption || title,
    author: item.author?.name || 'Facebook Creator',
    username: item.author?.username || 'facebook_creator',
    avatar: item.author?.profilePicture || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=60',
    thumbnailUrl: mediaUrl,
    videoUrl: item.url || (item.attachments && item.attachments[0]?.url) || `https://www.facebook.com/watch/?v=${rawId}`,
    duration: item.duration || '02:30',
    durationSec: durSec,
    aspectRatio: durSec <= 90 ? '9:16' : '16:9',
    category: item.category || 'AI & Tech',
    tags: Array.isArray(item.tags) ? item.tags : ['FacebookWatch', 'ViralVideo', 'Trending'],
    views,
    likes,
    comments,
    shares,
    publishedAt: item.timestamp 
      ? new Date(item.timestamp).toISOString() 
      : new Date(Date.now() - idx * 3600000 * 4).toISOString(),
    breakoutScore: breakout,
    viralityScore: virality,
    engagementRate: (((likes + comments + shares) / Math.max(views, 1)) * 100).toFixed(2) + '%'
  };
}

/**
 * Normalize LinkedIn item
 */
function normalizeLinkedInItem(item, idx) {
  const engagement = item.engagement || {};
  const views = Number(engagement.views || engagement.impressions || item.views) || 850000;
  const likes = Number(engagement.likes || item.likes) || Math.round(views * 0.038);
  const comments = Number(engagement.comments || item.comments) || Math.round(likes * 0.08);
  const shares = Number(engagement.shares || engagement.reposts || item.shares) || Math.round(likes * 0.12);

  const durSec = parseDurationSec(item.duration);
  const virality = views + (likes * 15) + (comments * 50) + (shares * 100);
  const breakout = Number((Math.log(views + 1) / Math.log(1000000)).toFixed(2));
  const rawId = item.id || `li_${idx}`;

  let mediaUrl = item.thumbnail_url || '';
  if (!mediaUrl && item.postVideo) {
    mediaUrl = item.postVideo.thumbnailUrl || '';
  }
  if (!mediaUrl) {
    mediaUrl = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60';
  }

  const title = item.title || (item.content ? item.content.split('\n')[0].slice(0, 80) : 'Trending LinkedIn Thought Leadership');

  return {
    id: `trending_li_${rawId}`,
    rawId,
    rawIndex: idx,
    platform: 'linkedin',
    rank: idx + 1,
    title,
    caption: item.content || item.caption || title,
    author: item.author?.name || 'Tech Executive',
    username: item.author?.publicIdentifier || 'linkedin_leader',
    authorInfo: item.author?.info || 'Industry Leader & Creator',
    avatar: item.author?.avatar?.url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=60',
    thumbnailUrl: mediaUrl,
    videoUrl: item.linkedinUrl || (item.postVideo?.videoUrl) || `https://www.linkedin.com/posts/${rawId}`,
    duration: item.duration || '03:10',
    durationSec: durSec,
    aspectRatio: durSec <= 90 ? '9:16' : '16:9',
    category: item.category || 'Leadership & AI',
    tags: Array.isArray(item.tags) ? item.tags : ['FutureOfWork', 'TechTrends', 'Leadership'],
    views,
    likes,
    comments,
    shares,
    publishedAt: item.postedAt?.date || (item.postedAt?.timestamp ? new Date(item.postedAt.timestamp).toISOString() : new Date(Date.now() - idx * 3600000 * 5).toISOString()),
    breakoutScore: breakout,
    viralityScore: virality,
    engagementRate: (((likes + comments + shares) / Math.max(views, 1)) * 100).toFixed(2) + '%'
  };
}

/**
 * Normalize Twitter / X item
 */
function normalizeTwitterItem(item, idx) {
  let tweetsStr = String(item.tweets || '');
  let count = 50000;
  if (tweetsStr.toLowerCase().includes('k')) {
    count = Math.round(parseFloat(tweetsStr) * 1000);
  } else if (tweetsStr.toLowerCase().includes('m')) {
    count = Math.round(parseFloat(tweetsStr) * 1000000);
  } else if (Number(tweetsStr)) {
    count = Number(tweetsStr);
  } else {
    count = Math.round(Math.max(15000, 180000 - idx * 2800));
  }

  const views = Number(item.views || count * 14);
  const likes = Number(item.likes || Math.round(count * 0.45));
  const comments = Number(item.replies || item.comments || Math.round(count * 0.08));
  const shares = Number(item.retweets || item.shares || Math.round(count * 0.18));

  const virality = views + (likes * 15) + (comments * 50) + (shares * 100);
  const breakout = Number((Math.log(views + 1) / Math.log(1000000)).toFixed(2));
  const rawId = item.position || idx + 1;

  const trendName = item.trend || `#TrendingTopic${rawId}`;

  return {
    id: `trending_tw_${rawId}`,
    rawId: String(rawId),
    rawIndex: idx,
    platform: 'twitter',
    rank: idx + 1,
    title: trendName,
    caption: `Trending topic on X in India & Global: ${trendName}. Over ${count.toLocaleString()} posts and real-time discussions.`,
    author: 'X Trending Pulse',
    username: 'x_trends',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=60',
    thumbnailUrl: item.thumbnail_url || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=60',
    videoUrl: `https://twitter.com/search?q=${encodeURIComponent(trendName)}`,
    duration: 'Live Topic',
    durationSec: 0,
    aspectRatio: '16:9',
    category: 'Viral Trends',
    tags: [trendName.replace('#', ''), 'TrendingOnX', 'Breaking'],
    views,
    likes,
    comments,
    shares,
    publishedAt: item.scraped_at || new Date().toISOString(),
    breakoutScore: breakout,
    viralityScore: virality,
    engagementRate: (((likes + comments + shares) / Math.max(views, 1)) * 100).toFixed(2) + '%'
  };
}

/**
 * Load all trending items across all platforms and return normalized list
 */
function loadAllTrendingItems(forceReload = false) {
  if (cachedItems && !forceReload && (Date.now() - lastLoadedTime < 2000)) {
    return cachedItems;
  }

  const allItems = [];

  // 1. YouTube
  const ytRaw = readJsonFile(DATASET_PATHS.youtube);
  if (Array.isArray(ytRaw)) {
    ytRaw.forEach((item, idx) => {
      if (item) allItems.push(normalizeYouTubeItem(item, idx));
    });
  }

  // 2. Instagram
  const igRaw = readJsonFile(DATASET_PATHS.instagram);
  if (Array.isArray(igRaw)) {
    igRaw.forEach((item, idx) => {
      if (item) allItems.push(normalizeInstagramItem(item, idx));
    });
  }

  // 3. Facebook
  const fbRaw = readJsonFile(DATASET_PATHS.facebook);
  if (Array.isArray(fbRaw)) {
    fbRaw.forEach((item, idx) => {
      if (item) allItems.push(normalizeFacebookItem(item, idx));
    });
  }

  // 4. LinkedIn
  const liRaw = readJsonFile(DATASET_PATHS.linkedin);
  if (Array.isArray(liRaw)) {
    liRaw.forEach((item, idx) => {
      if (item) allItems.push(normalizeLinkedInItem(item, idx));
    });
  }

  // 5. Twitter / X
  const twRaw = readJsonFile(DATASET_PATHS.twitter);
  if (Array.isArray(twRaw)) {
    twRaw.forEach((item, idx) => {
      if (item) allItems.push(normalizeTwitterItem(item, idx));
    });
  }

  cachedItems = allItems;
  lastLoadedTime = Date.now();
  return allItems;
}

/**
 * Query and filter trending items with strictly ordered ranks
 */
function getTrendingItems(filters = {}) {
  const { platform = 'all', category = 'all', search = '', sortBy = 'virality' } = filters;
  let items = loadAllTrendingItems();

  // Filter by platform
  if (platform && platform !== 'all') {
    const plat = platform.toLowerCase().replace('x', 'twitter');
    items = items.filter(it => it.platform.toLowerCase() === plat);
  }

  // Filter by category
  if (category && category !== 'all') {
    const catLower = category.toLowerCase();
    items = items.filter(it => (it.category || '').toLowerCase().includes(catLower));
  }

  // Search keyword in title, caption, author, tags
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    items = items.filter(it => 
      (it.title || '').toLowerCase().includes(q) ||
      (it.caption || '').toLowerCase().includes(q) ||
      (it.author || '').toLowerCase().includes(q) ||
      (it.username || '').toLowerCase().includes(q) ||
      (Array.isArray(it.tags) && it.tags.some(t => String(t).toLowerCase().includes(q)))
    );
  }

  // Strict sorting so trending is ALWAYS in order
  if (sortBy === 'virality') {
    items.sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
  } else if (sortBy === 'dataset') {
    items.sort((a, b) => (a.rawIndex || 0) - (b.rawIndex || 0));
  } else if (sortBy === 'views') {
    items.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else if (sortBy === 'likes') {
    items.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  } else if (sortBy === 'comments') {
    items.sort((a, b) => (b.comments || 0) - (a.comments || 0));
  } else if (sortBy === 'shares') {
    items.sort((a, b) => (b.shares || 0) - (a.shares || 0));
  } else if (sortBy === 'recent') {
    items.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  }

  // CRITICAL: Re-assign strict sequential rank #1, #2, #3, ...
  items.forEach((it, idx) => {
    it.rank = idx + 1;
  });

  return items;
}

/**
 * Get summary telemetry for top bar
 */
function getTrendingSummary() {
  const allItems = loadAllTrendingItems();
  const platformCounts = {
    youtube: 0,
    instagram: 0,
    facebook: 0,
    linkedin: 0,
    twitter: 0
  };

  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;

  allItems.forEach(item => {
    if (platformCounts[item.platform] !== undefined) {
      platformCounts[item.platform]++;
    }
    totalViews += (item.views || 0);
    totalLikes += (item.likes || 0);
    totalComments += (item.comments || 0);
    totalShares += (item.shares || 0);
  });

  const sortedByVirality = [...allItems].sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
  sortedByVirality.forEach((it, idx) => {
    it.rank = idx + 1;
  });
  const topBreakout = sortedByVirality[0] || null;

  return {
    totalItems: allItems.length,
    platformCounts,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    avgViralityScore: allItems.length > 0 ? Math.round(allItems.reduce((acc, i) => acc + (i.viralityScore || 0), 0) / allItems.length) : 0,
    topBreakoutItem: topBreakout
  };
}

/**
 * Modulate or directly update metrics of a trending item,
 * and persist changes back to the exact JSON file on disk.
 */
function updateTrendingMetrics(itemId, updates = {}) {
  const items = loadAllTrendingItems();
  const target = items.find(it => it.id === itemId || it.rawId === itemId);
  if (!target) {
    throw new Error(`Trending item not found: ${itemId}`);
  }

  const { platform, rawId } = target;
  const filePath = DATASET_PATHS[platform];
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Dataset file not found for platform: ${platform}`);
  }

  const fileData = readJsonFile(filePath);
  if (!Array.isArray(fileData)) {
    throw new Error(`Invalid format in dataset file: ${filePath}`);
  }

  // Find record in the dataset array
  let record = null;
  let recordIdx = -1;

  if (platform === 'youtube') {
    recordIdx = fileData.findIndex(r => r.video_id === rawId || r.id === rawId);
  } else if (platform === 'instagram') {
    recordIdx = fileData.findIndex(r => r.post_id === rawId || r.shortcode === rawId);
  } else if (platform === 'facebook') {
    recordIdx = fileData.findIndex(r => r.postId === rawId || r.id === rawId);
  } else if (platform === 'linkedin') {
    recordIdx = fileData.findIndex(r => r.id === rawId);
  } else if (platform === 'twitter') {
    recordIdx = fileData.findIndex(r => String(r.position) === String(rawId) || r.trend === target.title);
  }

  if (recordIdx === -1) {
    throw new Error(`Record ${rawId} not found in ${platform} dataset.`);
  }

  record = fileData[recordIdx];

  // Calculate new metric values
  let newViews = updates.views !== undefined ? Number(updates.views) : target.views;
  if (updates.viewsDelta !== undefined) newViews = Math.max(0, newViews + Number(updates.viewsDelta));

  let newLikes = updates.likes !== undefined ? Number(updates.likes) : target.likes;
  if (updates.likesDelta !== undefined) newLikes = Math.max(0, newLikes + Number(updates.likesDelta));

  let newComments = updates.comments !== undefined ? Number(updates.comments) : target.comments;
  if (updates.commentsDelta !== undefined) newComments = Math.max(0, newComments + Number(updates.commentsDelta));

  let newShares = updates.shares !== undefined ? Number(updates.shares) : target.shares;
  if (updates.sharesDelta !== undefined) newShares = Math.max(0, newShares + Number(updates.sharesDelta));

  // Apply to platform-specific raw fields
  if (platform === 'youtube') {
    record.view_count = newViews;
    record.like_count = newLikes;
    record.comment_count = newComments;
    record.share_count = newShares;
  } else if (platform === 'instagram') {
    record.view_count = newViews;
    record.like_count = newLikes;
    record.comment_count = newComments;
    record.share_count = newShares;
  } else if (platform === 'facebook') {
    record.view_count = newViews;
    record.reactionsCount = newLikes;
    if (!record.reactions) record.reactions = {};
    record.reactions.like = newLikes;
    record.commentsCount = newComments;
    record.sharesCount = newShares;
  } else if (platform === 'linkedin') {
    if (!record.engagement) record.engagement = {};
    record.engagement.views = newViews;
    record.engagement.impressions = Math.max(newViews * 1.2, newViews);
    record.engagement.likes = newLikes;
    record.engagement.comments = newComments;
    record.engagement.shares = newShares;
  } else if (platform === 'twitter') {
    record.views = newViews;
    record.likes = newLikes;
    record.replies = newComments;
    record.retweets = newShares;
    record.tweets = newShares > 0 ? `${Math.round(newShares / 1000)}K` : record.tweets;
  }

  // Update in array and save to file
  fileData[recordIdx] = record;
  writeJsonFile(filePath, fileData);

  // Invalidate cache and reload
  loadAllTrendingItems(true);

  // Return fresh normalized item
  const updatedNormalized = loadAllTrendingItems().find(it => it.id === target.id);
  return updatedNormalized;
}

/**
 * Edit full details of a trending item (title, author, tags, URLs, metrics)
 * and persist changes back to the exact JSON file on disk.
 */
function updateTrendingItem(itemId, formUpdates = {}) {
  const items = loadAllTrendingItems();
  const target = items.find(it => it.id === itemId || it.rawId === itemId);
  if (!target) {
    throw new Error(`Trending item not found: ${itemId}`);
  }

  const { platform, rawId } = target;
  const filePath = DATASET_PATHS[platform];
  const fileData = readJsonFile(filePath);

  let recordIdx = -1;
  if (platform === 'youtube') {
    recordIdx = fileData.findIndex(r => r.video_id === rawId || r.id === rawId);
  } else if (platform === 'instagram') {
    recordIdx = fileData.findIndex(r => r.post_id === rawId || r.shortcode === rawId);
  } else if (platform === 'facebook') {
    recordIdx = fileData.findIndex(r => r.postId === rawId || r.id === rawId);
  } else if (platform === 'linkedin') {
    recordIdx = fileData.findIndex(r => r.id === rawId);
  } else if (platform === 'twitter') {
    recordIdx = fileData.findIndex(r => String(r.position) === String(rawId) || r.trend === target.title);
  }

  if (recordIdx === -1) {
    throw new Error(`Record ${rawId} not found in ${platform} dataset.`);
  }

  const record = fileData[recordIdx];

  // Title / caption / author updates
  if (formUpdates.title) {
    if (platform === 'youtube') record.title = formUpdates.title;
    else if (platform === 'instagram') {
      const rest = (record.caption || '').split('\n').slice(1).join('\n');
      record.caption = formUpdates.title + (rest ? '\n' + rest : '');
    } else if (platform === 'facebook') {
      record.title = formUpdates.title;
      record.postText = formUpdates.title;
    } else if (platform === 'linkedin') record.title = formUpdates.title;
    else if (platform === 'twitter') record.trend = formUpdates.title;
  }

  if (formUpdates.caption) {
    if (platform === 'youtube') record.description = formUpdates.caption;
    else if (platform === 'instagram') record.caption = formUpdates.caption;
    else if (platform === 'facebook') record.postText = formUpdates.caption;
    else if (platform === 'linkedin') record.content = formUpdates.caption;
  }

  if (formUpdates.author) {
    if (platform === 'youtube') record.channel_title = formUpdates.author;
    else if (platform === 'instagram') record.owner_name = formUpdates.author;
    else if (platform === 'facebook') {
      if (!record.author) record.author = {};
      record.author.name = formUpdates.author;
    } else if (platform === 'linkedin') {
      if (!record.author) record.author = {};
      record.author.name = formUpdates.author;
    }
  }

  if (formUpdates.thumbnailUrl) {
    if (platform === 'youtube') record.thumbnail_url = formUpdates.thumbnailUrl;
    else if (platform === 'instagram') record.cover_url = formUpdates.thumbnailUrl;
    else if (platform === 'facebook') record.thumbnail_url = formUpdates.thumbnailUrl;
    else if (platform === 'linkedin') record.thumbnail_url = formUpdates.thumbnailUrl;
    else if (platform === 'twitter') record.thumbnail_url = formUpdates.thumbnailUrl;
  }

  if (formUpdates.duration) {
    record.duration = formUpdates.duration;
  }

  if (formUpdates.category) {
    record.category = formUpdates.category;
  }

  if (formUpdates.tags) {
    const tagArr = Array.isArray(formUpdates.tags) 
      ? formUpdates.tags 
      : String(formUpdates.tags).split(',').map(t => t.trim().replace(/^#/, ''));
    if (platform === 'youtube') record.tags = tagArr;
    else if (platform === 'instagram') record.hashtags = tagArr;
    else if (platform === 'facebook') record.tags = tagArr;
    else if (platform === 'linkedin') record.tags = tagArr;
  }

  // Metrics update if provided
  if (formUpdates.views !== undefined) {
    const v = Number(formUpdates.views);
    if (platform === 'youtube' || platform === 'instagram' || platform === 'facebook') record.view_count = v;
    else if (platform === 'linkedin') {
      if (!record.engagement) record.engagement = {};
      record.engagement.views = v;
    } else if (platform === 'twitter') record.views = v;
  }

  if (formUpdates.likes !== undefined) {
    const l = Number(formUpdates.likes);
    if (platform === 'youtube' || platform === 'instagram') record.like_count = l;
    else if (platform === 'facebook') {
      record.reactionsCount = l;
      if (!record.reactions) record.reactions = {};
      record.reactions.like = l;
    } else if (platform === 'linkedin') {
      if (!record.engagement) record.engagement = {};
      record.engagement.likes = l;
    } else if (platform === 'twitter') record.likes = l;
  }

  if (formUpdates.comments !== undefined) {
    const c = Number(formUpdates.comments);
    if (platform === 'youtube' || platform === 'instagram') record.comment_count = c;
    else if (platform === 'facebook') record.commentsCount = c;
    else if (platform === 'linkedin') {
      if (!record.engagement) record.engagement = {};
      record.engagement.comments = c;
    } else if (platform === 'twitter') record.replies = c;
  }

  if (formUpdates.shares !== undefined) {
    const s = Number(formUpdates.shares);
    if (platform === 'youtube' || platform === 'instagram') record.share_count = s;
    else if (platform === 'facebook') record.sharesCount = s;
    else if (platform === 'linkedin') {
      if (!record.engagement) record.engagement = {};
      record.engagement.shares = s;
    } else if (platform === 'twitter') record.retweets = s;
  }

  fileData[recordIdx] = record;
  writeJsonFile(filePath, fileData);

  loadAllTrendingItems(true);
  return loadAllTrendingItems().find(it => it.id === target.id);
}

/**
 * Add a new trending video / post to the dataset and save to disk
 */
function addTrendingItem(itemData = {}) {
  const platform = (itemData.platform || 'youtube').toLowerCase().replace('x', 'twitter');
  const filePath = DATASET_PATHS[platform];
  if (!filePath) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const fileData = readJsonFile(filePath);
  const now = Date.now();
  const rawId = `${platform}_trend_${now}`;

  const views = Number(itemData.views) || 250000;
  const likes = Number(itemData.likes) || Math.round(views * 0.05);
  const comments = Number(itemData.comments) || Math.round(likes * 0.06);
  const shares = Number(itemData.shares) || Math.round(likes * 0.03);

  const title = itemData.title || 'New Viral Trending Video';
  const caption = itemData.caption || itemData.description || title;
  const authorName = itemData.author || 'Featured Creator';
  const username = itemData.username || (authorName.toLowerCase().replace(/\s+/g, '_'));
  const duration = itemData.duration || '02:30';
  const category = itemData.category || 'AI & Tech';
  const thumbnailUrl = itemData.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';
  const videoUrl = itemData.videoUrl || '';

  const tagList = Array.isArray(itemData.tags) 
    ? itemData.tags 
    : String(itemData.tags || 'Trending,Viral').split(',').map(t => t.trim().replace(/^#/, ''));

  let newRawRecord = null;

  if (platform === 'youtube') {
    newRawRecord = {
      video_id: rawId,
      title,
      description: caption,
      channel_id: `UC_${rawId}`,
      channel_title: authorName,
      published_at: new Date().toISOString(),
      thumbnail_url: thumbnailUrl,
      view_count: views,
      like_count: likes,
      comment_count: comments,
      share_count: shares,
      duration,
      region_code: 'IN',
      video_category_id: null,
      video_url: videoUrl || `https://www.youtube.com/watch?v=${rawId}`,
      tags: tagList,
      category
    };
  } else if (platform === 'instagram') {
    newRawRecord = {
      platform: 'instagram',
      post_id: rawId,
      shortcode: rawId,
      post_url: videoUrl || `https://www.instagram.com/p/${rawId}/`,
      post_type: 'feed_video',
      owner_id: `user_${now}`,
      owner_username: username,
      owner_name: authorName,
      owner_avatar: itemData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=60',
      caption: `${title}\n\n${caption}`,
      hashtags: tagList,
      published_at: new Date().toISOString(),
      like_count: likes,
      comment_count: comments,
      share_count: shares,
      view_count: views,
      cover_url: thumbnailUrl,
      duration_seconds: parseDurationSec(duration),
      has_video: true,
      category
    };
  } else if (platform === 'facebook') {
    newRawRecord = {
      postId: rawId,
      url: videoUrl || `https://www.facebook.com/watch/?v=${rawId}`,
      pageUrl: `https://www.facebook.com/${username}`,
      timestamp: now,
      title,
      postText: `${title}\n\n${caption}`,
      reactionsCount: likes,
      reactions: { like: likes, love: Math.round(likes * 0.15), wow: Math.round(likes * 0.05) },
      commentsCount: comments,
      sharesCount: shares,
      view_count: views,
      duration,
      category,
      tags: tagList,
      author: {
        id: `fb_auth_${now}`,
        name: authorName,
        username,
        profilePicture: itemData.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=60',
        verified: true
      },
      attachments: [{ type: 'video', url: videoUrl, cover_url: thumbnailUrl }],
      thumbnail_url: thumbnailUrl
    };
  } else if (platform === 'linkedin') {
    newRawRecord = {
      id: rawId,
      type: 'post',
      title,
      content: `${title}\n\n${caption}`,
      linkedinUrl: videoUrl || `https://www.linkedin.com/posts/${rawId}`,
      category,
      tags: tagList,
      duration,
      author: {
        id: `li_auth_${now}`,
        name: authorName,
        publicIdentifier: username,
        info: itemData.authorInfo || 'Creator & Thought Leader',
        avatar: { url: itemData.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=60' },
        verified: true
      },
      postedAt: { timestamp: now, date: new Date().toISOString() },
      postVideo: { videoUrl, thumbnailUrl },
      thumbnail_url: thumbnailUrl,
      engagement: {
        likes,
        comments,
        shares,
        views,
        impressions: Math.round(views * 1.25)
      }
    };
  } else if (platform === 'twitter') {
    newRawRecord = {
      position: fileData.length + 1,
      trend: title.startsWith('#') ? title : `#${title.replace(/\s+/g, '')}`,
      tweets: `${Math.round(views / 1000)}K`,
      country: 'india',
      date: 'today',
      scraped_at: new Date().toISOString(),
      views,
      likes,
      replies: comments,
      retweets: shares,
      thumbnail_url: thumbnailUrl
    };
  }

  // Prepend to array so it appears at top of trending
  fileData.unshift(newRawRecord);
  writeJsonFile(filePath, fileData);

  // Reload cache
  loadAllTrendingItems(true);

  // Return new item
  const allUpdated = loadAllTrendingItems();
  const createdItem = allUpdated.find(it => it.rawId === rawId) || allUpdated[0];
  return createdItem;
}

/**
 * Delete a trending item from dataset file
 */
function deleteTrendingItem(itemId) {
  const items = loadAllTrendingItems();
  const target = items.find(it => it.id === itemId || it.rawId === itemId);
  if (!target) {
    throw new Error(`Trending item not found: ${itemId}`);
  }

  const { platform, rawId } = target;
  const filePath = DATASET_PATHS[platform];
  const fileData = readJsonFile(filePath);

  let newArray = [];
  if (platform === 'youtube') {
    newArray = fileData.filter(r => r.video_id !== rawId && r.id !== rawId);
  } else if (platform === 'instagram') {
    newArray = fileData.filter(r => r.post_id !== rawId && r.shortcode !== rawId);
  } else if (platform === 'facebook') {
    newArray = fileData.filter(r => r.postId !== rawId && r.id !== rawId);
  } else if (platform === 'linkedin') {
    newArray = fileData.filter(r => r.id !== rawId);
  } else if (platform === 'twitter') {
    newArray = fileData.filter(r => String(r.position) !== String(rawId) && r.trend !== target.title);
  }

  writeJsonFile(filePath, newArray);
  loadAllTrendingItems(true);
  return { success: true, deletedId: itemId, platform };
}

module.exports = {
  loadAllTrendingItems,
  getTrendingItems,
  getTrendingSummary,
  updateTrendingMetrics,
  updateTrendingItem,
  addTrendingItem,
  deleteTrendingItem
};
