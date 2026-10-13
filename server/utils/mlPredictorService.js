/**
 * EngageIQ Server - ML Predictor Service Bridge
 * 
 * Bridges EngageIQ Node.js server with:
 * 1. FastAPI Python ML Microservice (Port 8000):
 *    - /api/ml/two-stage/predict (Two-Stage Model A Content Prior + Model B Personal Lift)
 *    - /api/predict-engagement (Random Forest Classifier + TextBlob Polarity)
 * 2. In-process Two-Stage Engine (ml/twoStageEngine.js) & Dynamic Ridge Regression (ml/dynamicTrainer.js)
 *    as a high-performance, resilient fallback.
 */

const { predictCandidatePost } = require('../../ml/twoStageEngine');
const { predictWithLearnedModel } = require('../../ml/dynamicTrainer');

const FASTAPI_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
const REQUEST_TIMEOUT_MS = 2500;

/**
 * Predict engagement for any post (text, video, image, carousel) using ML models
 */
async function predictWithMLService(postData = {}) {
  const normPlatform = (postData.platform || 'instagram').toLowerCase().replace('x', 'twitter');
  const postType = (postData.postType || postData.post_type || 'text').toLowerCase();
  const textContent = (postData.text || postData.caption || postData.title || postData.postText || '').trim();
  const followers = Number(postData.followers || postData.subscribers || 12500);
  const userEmail = postData.userEmail || postData.user_email || 'default_user';

  let pythonTwoStageRes = null;
  let pythonRfRes = null;
  let usedFastAPI = false;

  // 1. Attempt call to FastAPI Two-Stage Prediction (Port 8000)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const payload = {
      title: postData.title || textContent.split('\n')[0].slice(0, 80),
      caption: textContent,
      text: textContent,
      platform: normPlatform,
      postType: postType,
      followers: followers,
      subscribers: followers,
      durationSec: Number(postData.durationSec || postData.duration_sec || (postType === 'video' ? 28 : 0)),
      aspectRatio: postData.aspectRatio || postData.aspect_ratio || (postType === 'video' ? '9:16' : '1:1'),
      hasSubtitles: postData.hasSubtitles !== undefined ? Boolean(postData.hasSubtitles) : (postType === 'video'),
      hookRating: Number(postData.hookRating || postData.hook_rating || 8),
      hour_of_day: postData.hour_of_day !== undefined ? Number(postData.hour_of_day) : 18,
      day_of_week: postData.day_of_week || 'Wednesday',
      user_email: userEmail
    };

    const res = await fetch(`${FASTAPI_URL}/api/ml/two-stage/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      pythonTwoStageRes = await res.json();
      usedFastAPI = true;
    }
  } catch (err) {
    // FastAPI temporarily unavailable or slow; fallback will handle seamlessly
  }

  // 2. Attempt call to FastAPI Random Forest & TextBlob Endpoint (Port 8000)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const rfPayload = {
      followers: followers,
      postText: textContent,
      postType: postType,
      reactions: Math.round(followers * 0.04),
      comments: Math.round(followers * 0.008),
      daysSincePosted: 1,
      durationSec: Number(postData.durationSec || (postType === 'video' ? 28 : 0)),
      hasSubtitles: postData.hasSubtitles !== undefined ? Boolean(postData.hasSubtitles) : true,
      hookRating: Number(postData.hookRating || 8)
    };

    const rfRes = await fetch(`${FASTAPI_URL}/api/predict-engagement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rfPayload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (rfRes.ok) {
      pythonRfRes = await rfRes.json();
      usedFastAPI = true;
    }
  } catch (err) {
    // Graceful fallback
  }

  // 3. In-process Two-Stage ML Prediction (Always computed for rich fallback and consistency)
  const localTwoStage = predictCandidatePost({
    title: postData.title || textContent.split('\n')[0].slice(0, 80),
    caption: textContent,
    text: textContent,
    platform: normPlatform,
    postType: postType,
    followers: followers,
    durationSec: Number(postData.durationSec || (postType === 'video' ? 28 : 0)),
    aspectRatio: postData.aspectRatio || (postType === 'video' ? '9:16' : '1:1'),
    hasSubtitles: postData.hasSubtitles !== undefined ? Boolean(postData.hasSubtitles) : (postType === 'video'),
    hookRating: Number(postData.hookRating || 8),
    userEmail: userEmail,
    imageType: postData.imageType || 'carousel',
    slideCount: postData.slideCount || 5,
    hasTextOverlay: postData.hasTextOverlay !== undefined ? Boolean(postData.hasTextOverlay) : true
  });

  // 4. Dynamic Ridge Regression Model on Past Posts Feed
  const ridgeOutput = predictWithLearnedModel({
    caption_text: textContent,
    platform: normPlatform,
    post_type: postType,
    media_specs: {
      duration_sec: Number(postData.durationSec || 0),
      aspect_ratio: postData.aspectRatio || '1:1',
      has_subtitles: postData.hasSubtitles,
      hook_rating: postData.hookRating,
      image_type: postData.imageType
    }
  });

  // 5. Synthesize Combined Prediction Result
  const sourceRes = pythonTwoStageRes || localTwoStage;

  // Calibrate score with Python Random Forest if available
  let engagementScore = sourceRes.engagementScore;
  if (pythonRfRes?.engagementScore) {
    engagementScore = Math.round((sourceRes.engagementScore * 0.6) + (pythonRfRes.engagementScore * 0.4));
  } else if (ridgeOutput?.engagementScore) {
    engagementScore = Math.round((sourceRes.engagementScore * 0.7) + (ridgeOutput.engagementScore * 0.3));
  }
  engagementScore = Math.max(30, Math.min(99, engagementScore));

  const growth = engagementScore >= 80 ? 'HIGH' : engagementScore >= 60 ? 'MEDIUM' : 'LOW';
  const confidence = pythonRfRes?.confidence || sourceRes.confidence || 88;

  // Derive metrics that genuinely respond to text quality and follower base
  const qualityFactor = sourceRes.qualityScore || 0.052;
  const reach = Math.round(followers * (0.35 + (engagementScore / 100) * 0.65));
  const likes = Math.round(reach * qualityFactor * (engagementScore / 70));
  const hasQuestion = /\?|what|why|how|which|who|agree/i.test(textContent);
  const hasCTA = /link in bio|check out|swipe|save|comment|share|dm|click|subscribe/i.test(textContent);
  const comments = Math.round(likes * (hasQuestion ? 0.22 : 0.09));
  const shares = Math.round(likes * (hasCTA ? 0.16 : 0.06));

  const expectedMetrics = {
    reach,
    likes,
    comments,
    shares,
    totalReactions: likes + comments + shares,
    engagementRate: (((likes + comments + shares) / Math.max(1, reach)) * 100).toFixed(2) + '%'
  };

  const combinedReasons = [
    ...(pythonRfRes?.reasons || []),
    ...(sourceRes.suggestions || []).map(s => `${s.title}: ${s.description}`)
  ];

  return {
    success: true,
    engineUsed: usedFastAPI ? 'fastapi_python_microservice' : 'two_stage_ml_engine',
    engineLabel: usedFastAPI
      ? 'EngageIQ Two-Stage ML Service (Port 8000) & Random Forest Engine'
      : 'EngageIQ Two-Stage Dynamic Machine Learning Engine',
    postType,
    platform: normPlatform,
    engagementScore,
    tier: growth === 'HIGH' ? 'HIGH' : growth === 'LOW' ? 'LOW' : 'MEDIUM',
    growth,
    confidence,
    breakoutRating: sourceRes.breakoutRating || (engagementScore >= 82 ? 'A (High Reach)' : 'B (Consistent)'),
    breakoutScore: sourceRes.breakoutScore || -0.85,
    qualityScore: sourceRes.qualityScore || 0.052,
    viralityIndex: sourceRes.viralityIndex || (reach + 15 * likes + 50 * comments + 100 * shares),
    expectedMetrics,
    predictedMetrics: expectedMetrics,
    twoStageBreakdown: sourceRes.twoStageBreakdown,
    featureContributions: ridgeOutput.featureContributions || [],
    mlMeta: {
      mlModelVersion: ridgeOutput.mlModelVersion,
      r2Score: ridgeOutput.r2Confidence,
      featureContributions: ridgeOutput.featureContributions,
      topLearnedFeatures: ridgeOutput.modelImportances,
      fastApiConnected: usedFastAPI
    },
    suggestions: sourceRes.suggestions || [],
    reasons: combinedReasons.slice(0, 5),
    bestTimeToPost: sourceRes.bestPostingTime || '6:00 PM – 8:30 PM Weekdays',
    bestPostingTime: sourceRes.bestPostingTime || '6:00 PM – 8:30 PM Weekdays'
  };
}

module.exports = {
  predictWithMLService,
  FASTAPI_URL
};
