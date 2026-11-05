/**
 * Conjugate Media Server - Live Feed & Integration Routes
 * 
 * Provides live dynamic streaming feed endpoints consumed by EngageIQ 
 * (Analytics, Timelines, Sentiment, and ML Ridge Regression Trainer) scoped by user email.
 */

const express = require('express');
const router = express.Router();
const conjugateStore = require('../services/conjugateStore');
const trendingStore = require('../services/trendingStore');

const TRENDING_PLATFORMS = new Set(['youtube', 'instagram', 'facebook', 'linkedin', 'twitter', 'x']);

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
    const trendingItems = trendingStore.loadAllTrendingItems();
    res.json({
      success: true,
      source: 'Conjugate Media Server (Port 5002)',
      timestamp: new Date().toISOString(),
      count: trendingItems.length,
      videos: trendingItems
    });
  } catch (error) {
    console.error('[Conjugate Trending Videos Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch trending videos.' });
  }
});

/**
 * GET /api/feed/trending-videos/:platform
 * Returns normalized trending videos for a single platform to external consumers
 */
router.get('/feed/trending-videos/:platform', (req, res) => {
  try {
    const requestedPlatform = req.params.platform.toLowerCase();
    if (!TRENDING_PLATFORMS.has(requestedPlatform)) {
      return res.status(400).json({
        error: `Unsupported platform: ${req.params.platform}`,
        supportedPlatforms: ['youtube', 'instagram', 'facebook', 'linkedin', 'twitter', 'x']
      });
    }

    const platform = requestedPlatform === 'x' ? 'twitter' : requestedPlatform;
    const videos = trendingStore.getTrendingItems({ platform });

    res.json({
      success: true,
      source: 'Conjugate Media Server (Port 5002)',
      timestamp: new Date().toISOString(),
      platform,
      count: videos.length,
      videos
    });
  } catch (error) {
    console.error('[Conjugate Platform Trending Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch platform trending videos.' });
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
      instagram: 0,
      facebook: 0,
      twitter: 0,
      linkedin: 0
    };

    posts.forEach((p) => {
      const plat = (p.platform || 'instagram').toLowerCase();
      if (platformBreakdown[plat] !== undefined) {
        platformBreakdown[plat]++;
      }
      const m = p.metrics || {};
      totalLikes += Number(m.likes || 0);
      totalComments += Number(m.comments || 0);
      totalShares += Number(m.shares || 0);
      totalDislikes += Number(m.dislikes || 0);
      totalReach += Number(m.reach || 0);
      totalViews += Number(p.views || m.views || 0);
    });

    const totalInteractions = totalLikes + totalComments + totalShares;
    const overallEngagementRate = totalReach > 0 ? ((totalInteractions / totalReach) * 100).toFixed(2) + '%' : '0.00%';

    res.json({
      success: true,
      userEmail,
      timestamp: new Date().toISOString(),
      summary: {
        totalPosts: posts.length,
        totalLikes,
        totalComments,
        totalShares,
        totalDislikes,
        totalReach,
        totalViews,
        totalInteractions,
        overallEngagementRate,
        platformBreakdown,
        channels
      }
    });
  } catch (error) {
    console.error('[Conjugate Feed Summary Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch feed summary.' });
  }
});

module.exports = router;
