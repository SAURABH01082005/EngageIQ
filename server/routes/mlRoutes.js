// server/routes/mlRoutes.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const {
  trainModelOnPastPosts,
  predictWithLearnedModel
} = require('../../ml/dynamicTrainer');
const {
  readModelArtifact,
  trainTwoStageModel,
  predictCandidatePost,
  getTrendingBenchmarks,
  getAudienceTasteProfile
} = require('../../ml/twoStageEngine');

const JSON_FEED_PATH = path.join(__dirname, '../data/platform_posts_feed.json');
const MODEL_WEIGHTS_PATH = path.join(__dirname, '../../ml/trained_model.json');
const TWO_STAGE_MODEL_PATH = path.join(__dirname, '../../ml/two_stage_model.json');

function getUserEmailFromReq(req) {
  return req.headers['x-user-email'] || req.query.userEmail || req.body?.userEmail || req.headers['x-user-id'] || 'default_user';
}

/**
 * Get Model B Audience Content Taste Profile (what type of content audience likes)
 */
router.get('/ml/audience-taste', (req, res) => {
  try {
    const userEmail = getUserEmailFromReq(req);
    const profile = getAudienceTasteProfile(userEmail);
    res.json(profile);
  } catch (error) {
    console.error('Error fetching audience taste profile:', error);
    res.status(500).json({ error: 'Failed to retrieve audience taste profile.' });
  }
});

/**
 * Get Current Live ML Model Status (including Two-Stage Model A & Model B status)
 */
router.get('/ml/status', (req, res) => {
  try {
    let twoStageModel = readModelArtifact();
    if (!twoStageModel) {
      twoStageModel = trainTwoStageModel(getUserEmailFromReq(req));
    }

    let ridgeModel;
    if (fs.existsSync(MODEL_WEIGHTS_PATH)) {
      ridgeModel = JSON.parse(fs.readFileSync(MODEL_WEIGHTS_PATH, 'utf-8'));
    } else {
      ridgeModel = trainModelOnPastPosts();
    }

    res.json({
      ...ridgeModel,
      twoStage: twoStageModel
    });
  } catch (error) {
    console.error('Error fetching ML model status:', error);
    res.status(500).json({ error: 'Failed to retrieve ML model status.' });
  }
});

/**
 * Explicit Two-Stage Model Status
 */
router.get('/ml/two-stage/status', (req, res) => {
  try {
    let twoStageModel = readModelArtifact();
    if (!twoStageModel) {
      twoStageModel = trainTwoStageModel(getUserEmailFromReq(req));
    }
    res.json(twoStageModel);
  } catch (error) {
    console.error('Error fetching two-stage status:', error);
    res.status(500).json({ error: 'Failed to retrieve two-stage model status.' });
  }
});

/**
 * Trigger Two-Stage Model Training (Model A on Trending Videos + Model B on User History)
 */
router.post('/ml/two-stage/train', (req, res) => {
  try {
    const userEmail = getUserEmailFromReq(req);
    const updated = trainTwoStageModel(userEmail);
    res.json({
      success: true,
      message: `EngageIQ Two-Stage Model trained successfully for ${userEmail}!`,
      model: updated
    });
  } catch (error) {
    console.error('Two-Stage Training Error:', error);
    res.status(500).json({ error: 'Failed to train two-stage ML model.' });
  }
});

/**
 * Two-Stage Candidate Post Predictor
 */
router.post('/ml/two-stage/predict', (req, res) => {
  try {
    const postData = req.body || {};
    if (!postData.userEmail) {
      postData.userEmail = getUserEmailFromReq(req);
    }
    const prediction = predictCandidatePost(postData);
    res.json(prediction);
  } catch (error) {
    console.error('Two-Stage Predict Error:', error);
    res.status(500).json({ error: 'Prediction failed.' });
  }
});

/**
 * Platform Trending Video Benchmarks
 */
router.get('/ml/trending-benchmarks', (req, res) => {
  try {
    const benchmarks = getTrendingBenchmarks();
    res.json({
      success: true,
      ...benchmarks
    });
  } catch (error) {
    console.error('Trending Benchmarks Error:', error);
    res.status(500).json({ error: 'Failed to fetch trending benchmarks.' });
  }
});

/**
 * Trigger Live Retraining on Past Posts JSON Feed
 */
router.post('/ml/train', (req, res) => {
  try {
    const userEmail = getUserEmailFromReq(req);
    const updatedModel = trainModelOnPastPosts();
    const twoStage = trainTwoStageModel(userEmail);
    res.json({
      success: true,
      message: 'ML Models retrained successfully on latest platform feed and trending videos!',
      model: updatedModel,
      twoStage
    });
  } catch (error) {
    console.error('Error during ML model retraining:', error);
    res.status(500).json({ error: 'Model training failed.' });
  }
});

/**
 * Ingest / Sync New Platform Posts (JSON Form) and Automatically Retrain Model
 */
router.post('/ml/sync-posts', (req, res) => {
  try {
    const { posts } = req.body;
    if (!posts || !Array.isArray(posts)) {
      return res.status(400).json({ error: 'Please provide a valid array of post objects in JSON form.' });
    }

    let feedData = { dataset_metadata: {}, posts: [] };
    if (fs.existsSync(JSON_FEED_PATH)) {
      feedData = JSON.parse(fs.readFileSync(JSON_FEED_PATH, 'utf-8'));
    }

    posts.forEach((newPost, idx) => {
      if (!newPost.id) newPost.id = `sync_post_${Date.now()}_${idx}`;
      feedData.posts.unshift(newPost);
    });

    feedData.dataset_metadata.last_updated = new Date().toISOString();
    feedData.dataset_metadata.total_records = feedData.posts.length;

    fs.writeFileSync(JSON_FEED_PATH, JSON.stringify(feedData, null, 2), 'utf-8');

    const retrained = trainModelOnPastPosts();
    const twoStage = trainTwoStageModel(getUserEmailFromReq(req));

    res.json({
      success: true,
      message: `Successfully synced ${posts.length} new posts and retrained dynamic ML model!`,
      totalPostsCount: feedData.posts.length,
      model: retrained,
      twoStage
    });
  } catch (error) {
    console.error('Error syncing posts and retraining:', error);
    res.status(500).json({ error: 'Failed to sync platform posts.' });
  }
});

module.exports = router;
