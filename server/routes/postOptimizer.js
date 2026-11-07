// server/routes/postOptimizer.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const {
  predictTextPost,
  predictImagePost,
  predictVideoPost
} = require('../../ml/multimodalPredictor');
const {
  predictCandidatePost,
  getTrendingBenchmarks
} = require('../../ml/twoStageEngine');

const mockDataPath = path.join(__dirname, '../data/platform_mock_data.json');

// Helper to get platform mock data
function getPlatformMockData() {
  try {
    if (fs.existsSync(mockDataPath)) {
      return JSON.parse(fs.readFileSync(mockDataPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading mock data:', e);
  }
  return { platforms: {} };
}

const { predictWithMLService } = require('../utils/mlPredictorService');

/**
 * Universal Post Draft Predictor (Two-Stage Model A Content Prior + Model B Personal Lift)
 * Makes active use of FastAPI ML microservice (Port 8000) & in-memory Two-Stage engines
 */
router.post('/predict-draft', async (req, res) => {
  try {
    const {
      postType = 'text',
      platform = 'instagram',
      text = '',
      caption = '',
      title = '',
      followers = 12500,
      aspectRatio,
      imageType,
      slideCount,
      hasTextOverlay,
      durationSec,
      hasSubtitles,
      hookRating,
      audioType,
      userEmail
    } = req.body;

    const contentText = (text || caption || title || '').trim();
    const cleanUserEmail = userEmail || req.headers['x-user-email'] || 'default_user';
    const numFollowers = Number(followers) || 12500;

    // 1. Run dynamic ML prediction via ML Predictor Service Bridge (FastAPI Port 8000 + Two-Stage Engine)
    const mlResult = await predictWithMLService({
      title: title || contentText.split('\n')[0].slice(0, 80),
      caption: contentText,
      text: contentText,
      platform,
      postType,
      followers: numFollowers,
      durationSec: Number(durationSec) || (postType === 'video' ? 28 : 0),
      aspectRatio: aspectRatio || (postType === 'video' ? '9:16' : '1:1'),
      hasSubtitles: hasSubtitles !== undefined ? Boolean(hasSubtitles) : (postType === 'video'),
      hookRating: Number(hookRating) || 8,
      userEmail: cleanUserEmail,
      imageType: imageType || 'carousel',
      slideCount: Number(slideCount) || 5,
      hasTextOverlay: hasTextOverlay !== undefined ? Boolean(hasTextOverlay) : true
    });

    // 2. Multimodal feature extraction for supplementary visual/text inspection
    let baseMultimodal;
    if (postType === 'video') {
      baseMultimodal = predictVideoPost({
        platform,
        followers: numFollowers,
        durationSec: Number(durationSec) || 28,
        aspectRatio: aspectRatio || '9:16',
        hasSubtitles: Boolean(hasSubtitles),
        hookRating: Number(hookRating) || 8,
        audioType: audioType || 'trending',
        caption: contentText
      });
    } else if (postType === 'image') {
      baseMultimodal = predictImagePost({
        platform,
        followers: numFollowers,
        aspectRatio: aspectRatio || '4:5',
        imageType: imageType || 'carousel',
        slideCount: Number(slideCount) || 5,
        hasTextOverlay: Boolean(hasTextOverlay),
        caption: contentText
      });
    } else {
      baseMultimodal = predictTextPost({
        text: contentText,
        platform,
        followers: numFollowers,
        postType: 'text'
      });
    }

    // Dynamic Best Time to Post by Platform & Category
    const normPlatform = (platform || 'instagram').toLowerCase().replace('x', 'twitter');
    const platformTiming = {
      instagram: { timeSlot: '6:30 PM – 8:30 PM', days: 'Tuesday, Thursday, Friday', confidence: `${Math.min(97, 82 + Math.round(mlResult.engagementScore * 0.15))}%` },
      twitter: { timeSlot: '8:30 AM – 10:30 AM & 6:00 PM – 7:30 PM', days: 'Tuesday – Thursday', confidence: `${Math.min(96, 80 + Math.round(mlResult.engagementScore * 0.16))}%` },
      linkedin: { timeSlot: '7:45 AM – 9:30 AM & 5:00 PM – 6:30 PM', days: 'Tuesday, Wednesday, Thursday', confidence: `${Math.min(98, 85 + Math.round(mlResult.engagementScore * 0.14))}%` },
      facebook: { timeSlot: '6:30 PM – 9:00 PM', days: 'Thursday – Saturday', confidence: `${Math.min(95, 78 + Math.round(mlResult.engagementScore * 0.16))}%` },
      youtube: { timeSlot: '5:00 PM – 8:00 PM', days: 'Wednesday – Sunday', confidence: `${Math.min(96, 84 + Math.round(mlResult.engagementScore * 0.14))}%` }
    };
    const bestTime = platformTiming[normPlatform] || platformTiming.instagram;

    // Combined Response blending multimodal specs + dynamic machine learning
    const response = {
      ...baseMultimodal,
      engagementScore: mlResult.engagementScore,
      tier: mlResult.tier,
      growth: mlResult.growth,
      confidence: mlResult.confidence,
      breakoutRating: mlResult.breakoutRating,
      breakoutScore: mlResult.breakoutScore,
      qualityScore: mlResult.qualityScore,
      viralityIndex: mlResult.viralityIndex,
      expectedMetrics: mlResult.expectedMetrics,
      predictedMetrics: mlResult.predictedMetrics,
      twoStageBreakdown: mlResult.twoStageBreakdown,
      mlMeta: {
        ...(baseMultimodal.mlMeta || {}),
        ...(mlResult.mlMeta || {}),
        engineUsed: mlResult.engineUsed,
        engineLabel: mlResult.engineLabel
      },
      suggestions: [
        ...(mlResult.suggestions || []),
        ...((baseMultimodal.improvements || []).filter(imp => !(mlResult.suggestions || []).some(s => s.type === imp.type)).map(imp => ({
          type: imp.type || 'format',
          title: imp.title,
          impact: imp.lift || '+15% Reach',
          description: imp.description
        })))
      ],
      improvements: [
        ...(mlResult.suggestions || []),
        ...((baseMultimodal.improvements || []).filter(imp => !(mlResult.suggestions || []).some(s => s.type === imp.type)).map(imp => ({
          type: imp.type || 'format',
          title: imp.title,
          impact: imp.lift || '+15% Reach',
          description: imp.description
        })))
      ],
      bestTimeToPost: bestTime,
      bestPostingTime: `${bestTime.timeSlot} on ${bestTime.days}`
    };

    res.json(response);
  } catch (error) {
    console.error('Predict Draft Error:', error);
    res.status(500).json({ error: 'Failed to predict engagement for draft.' });
  }
});

/**
 * Dedicated Video Predictor
 */
/**
 * Dedicated Video Predictor
 * Combines Two-Stage ML Model predictions with multimodal video retention analysis
 */
router.post('/predict-video', async (req, res) => {
  try {
    const {
      platform = 'instagram',
      durationSec = 28,
      aspectRatio = '9:16',
      hasSubtitles = true,
      hookRating = 8,
      audioType = 'trending',
      caption = '',
      followers = 12500,
      userEmail
    } = req.body || {};

    const cleanUserEmail = userEmail || req.headers['x-user-email'] || 'default_user';
    const numFollowers = Number(followers) || 12500;
    const numDuration = Number(durationSec) || 28;

    // 1. Run dynamic ML prediction via ML Predictor Service Bridge (FastAPI / Two-Stage Engine)
    const mlResult = await predictWithMLService({
      title: caption.split('\n')[0].slice(0, 80),
      caption,
      text: caption,
      platform,
      postType: 'video',
      followers: numFollowers,
      durationSec: numDuration,
      aspectRatio,
      hasSubtitles: Boolean(hasSubtitles),
      hookRating: Number(hookRating) || 8,
      userEmail: cleanUserEmail
    });

    // 2. Multimodal feature extraction for video retention, completion rate & watch time
    const baseMultimodal = predictVideoPost({
      platform,
      followers: numFollowers,
      durationSec: numDuration,
      aspectRatio,
      hasSubtitles: Boolean(hasSubtitles),
      hookRating: Number(hookRating) || 8,
      audioType,
      caption
    });

    // 3. Best Time to Post
    const normPlatform = (platform || 'instagram').toLowerCase().replace('x', 'twitter');
    const platformTiming = {
      instagram: { timeSlot: '6:30 PM – 8:30 PM', days: 'Tuesday, Thursday, Friday' },
      twitter: { timeSlot: '8:30 AM – 10:30 AM & 6:00 PM – 7:30 PM', days: 'Tuesday – Thursday' },
      linkedin: { timeSlot: '7:45 AM – 9:30 AM & 5:00 PM – 6:30 PM', days: 'Tuesday, Wednesday, Thursday' },
      facebook: { timeSlot: '6:30 PM – 9:00 PM', days: 'Thursday – Saturday' },
      youtube: { timeSlot: '5:00 PM – 8:00 PM', days: 'Wednesday – Sunday' }
    };
    const bestTime = platformTiming[normPlatform] || platformTiming.instagram;

    const response = {
      ...baseMultimodal,
      engagementScore: mlResult.engagementScore,
      tier: mlResult.tier,
      growth: mlResult.growth,
      confidence: mlResult.confidence,
      breakoutRating: mlResult.breakoutRating,
      breakoutScore: mlResult.breakoutScore,
      qualityScore: mlResult.qualityScore,
      viralityIndex: mlResult.viralityIndex,
      expectedMetrics: mlResult.expectedMetrics,
      predictedMetrics: {
        ...baseMultimodal.predictedMetrics,
        shares: mlResult.expectedMetrics?.shares || baseMultimodal.predictedMetrics?.shares,
        views: baseMultimodal.predictedMetrics?.views || Math.round(mlResult.expectedMetrics?.reach * 2.2)
      },
      twoStageBreakdown: mlResult.twoStageBreakdown,
      mlMeta: {
        ...(baseMultimodal.mlMeta || {}),
        ...(mlResult.mlMeta || {}),
        engineUsed: mlResult.engineUsed,
        engineLabel: mlResult.engineLabel
      },
      suggestions: mlResult.suggestions || [],
      improvements: [
        ...(mlResult.suggestions || []),
        ...(baseMultimodal.improvements || [])
      ],
      bestTimeToPost: bestTime,
      videoSpecs: {
        durationSec: numDuration,
        aspectRatio,
        hasSubtitles: Boolean(hasSubtitles),
        hookRating: Number(hookRating) || 8,
        audioType
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Predict Video Error:', error);
    res.status(500).json({ error: 'Failed to analyze video engagement.' });
  }
});

/**
 * Platform Trending Topics & Live Video Insights from Conjugate Media
 */
router.get('/trending-topics', (req, res) => {
  try {
    const { platform } = req.query;
    const data = getPlatformMockData();
    const benchmarks = getTrendingBenchmarks();

    const response = {
      ...data,
      trendingVideos: benchmarks.trendingVideos || [],
      benchmarks: benchmarks.benchmarks || {}
    };

    if (platform && data.platforms[platform.toLowerCase()]) {
      response.platform = platform.toLowerCase();
      response.platformData = data.platforms[platform.toLowerCase()];
    }

    res.json(response);
  } catch (error) {
    console.error('Trending Topics Error:', error);
    res.status(500).json({ error: 'Failed to retrieve trending topics.' });
  }
});

module.exports = router;
