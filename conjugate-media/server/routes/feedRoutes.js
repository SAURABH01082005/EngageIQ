/**
 * Conjugate Media Server - Live Feed & Integration Routes
 * 
 * Provides live dynamic streaming feed endpoints consumed by EngageIQ 
 * (Analytics, Timelines, Sentiment, and ML Ridge Regression Trainer) scoped by user email.
 */

const express = require('express');
const router = express.Router();
const conjugateStore = require('../services/conjugateStore');

function getRequestUserEmail(req) {
  return req.headers['x-user-email'] || req.query.userEmail || req.body?.userEmail || req.headers['x-user-id'] || 'default_user';
}

/**
 * GET /api/feed/posts
 * Returns normalized array of live posts for EngageIQ analytics & ML model
 */
router.get('/feed/posts', async (req, res) => {
  try {
    const userEmail = getRequestUserEmail(req);
    const posts = await conjugateStore.getAllPostsForEngageIQ(userEmail);

    res.json({
      success: true,
      source: 'Conjugate Media Server (Port 5002)',
      userEmail,
      timestamp: new Date().toISOString(),
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error('[Conjugate Feed Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch live feed.' });
  }
});

/**
 * GET /api/feed/trending-videos
 * Returns all normalized trending videos for EngageIQ Model A Content Prior & virality benchmark
 */
router.get('/feed/trending-videos', async (req, res) => {
  try {
    const videos = await conjugateStore.getTrendingVideos();
    res.json({
      success: true,
      source: 'Conjugate Media Server (Port 5002)',
      timestamp: new Date().toISOString(),
      count: videos.length,
      videos
    });
  } catch (error) {
    console.error('[Conjugate Trending Videos Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch trending videos.' });
  }
});

/**
 * GET /api/feed/summary
 * Returns high-level summary of total likes, comments, shares, reach, and platform breakdown
 */
router.get('/feed/summary', async (req, res) => {
  try {
    const userEmail = getRequestUserEmail(req);
    const posts = await conjugateStore.getAllPostsForEngageIQ(userEmail);
    const channels = await conjugateStore.getChannels(userEmail);

    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalDislikes = 0;
    let totalReach = 0;
    let totalViews = 0;

    const platformBreakdown = {
      instagram: { likes: 0, comments: 0, shares: 0, reach: 0, postsCount: 0 },
      facebook: { likes: 0, comments: 0, shares: 0, reach: 0, postsCount: 0 },
      twitter: { likes: 0, comments: 0, shares: 0, reach: 0, postsCount: 0 },
      linkedin: { likes: 0, comments: 0, shares: 0, reach: 0, postsCount: 0 }
    };

    posts.forEach(p => {
      const plat = (p.platform || 'instagram').toLowerCase().replace('x', 'twitter');
      const l = p.metrics?.likes || 0;
      const c = p.metrics?.comments || 0;
      const s = p.metrics?.shares || 0;
      const d = p.metrics?.dislikes || 0;
      const r = p.metrics?.reach || 0;
      const v = p.metrics?.video_views || 0;

      totalLikes += l;
      totalComments += c;
      totalShares += s;
      totalDislikes += d;
      totalReach += r;
      totalViews += v;

      if (!platformBreakdown[plat]) {
        platformBreakdown[plat] = { likes: 0, comments: 0, shares: 0, reach: 0, postsCount: 0 };
      }
      platformBreakdown[plat].likes += l;
      platformBreakdown[plat].comments += c;
      platformBreakdown[plat].shares += s;
      platformBreakdown[plat].reach += r;
      platformBreakdown[plat].postsCount += 1;
    });

    const totalEngagements = totalLikes + totalComments + totalShares;
    const engagementRate = totalReach > 0 ? ((totalEngagements / totalReach) * 100).toFixed(2) + '%' : '0%';

    res.json({
      success: true,
      userEmail,
      totals: {
        totalLikes,
        totalComments,
        totalShares,
        totalDislikes,
        totalReach,
        totalViews,
        totalEngagements,
        engagementRate,
        totalPosts: posts.length
      },
      platforms: platformBreakdown,
      channels
    });
  } catch (error) {
    console.error('[Conjugate Summary Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to generate summary.' });
  }
});

module.exports = router;
