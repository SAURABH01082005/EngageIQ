/**
 * Comprehensive Verification Test for EngageIQ
 * Tests Engagement Prediction and AI Query End-to-End
 */

const assert = require('assert');
const { routeAIQuery, isFixedListedQuery } = require('./server/utils/aiAssistantRouter');
const { predictCandidatePost, getAudienceTasteProfile } = require('./ml/twoStageEngine');
const { predictWithMLService } = require('./server/utils/mlPredictorService');
const { predictVideoPost, predictTextPost, predictImagePost } = require('./ml/multimodalPredictor');

async function runVerification() {
  console.log('================================================================');
  console.log('🧪 VERIFYING ENGAGEIQ ENGAGEMENT PREDICTION & AI QUERY SYSTEMS');
  console.log('================================================================\n');

  const userEmail = 'saurabh.test@engageiq.com';

  // ── TEST SUITE 1: ENGAGEMENT PREDICTION VERIFICATION ──
  console.log('--- [1. ENGAGEMENT PREDICTION TESTS] ---');

  // 1A: Two-Stage Post Prediction (Video/Reel)
  const videoPost = {
    title: 'How AI Multi-Agent Teams Scale Product Engineering',
    caption: 'Here is the step-by-step breakdown of how multi-agent teams outperform solo devs. What framework do you use? Drop a comment below! #AI #Tech #Dev',
    platform: 'instagram',
    postType: 'video',
    durationSec: 28,
    aspectRatio: '9:16',
    hasSubtitles: true,
    hookRating: 9,
    followers: 25000,
    userEmail
  };

  const pred1 = predictCandidatePost(videoPost);
  console.log(`✓ 1A Video Candidate Prediction:`);
  console.log(`  Engagement Score: ${pred1.engagementScore}/100 (${pred1.breakoutRating})`);
  console.log(`  Model A Content Prior: ${pred1.modelAScore}/100 (Breakout: ${pred1.twoStageBreakdown.model_A_content_prior.breakout})`);
  console.log(`  Model B Personal Lift: ${pred1.modelBScore}/100 (Taste: ${pred1.twoStageBreakdown.model_B_personal_lift.platform_taste_affinity})`);
  console.log(`  Theory 2 Virality Index: ${pred1.viralityIndex.toLocaleString()}`);
  console.log(`  Expected Reactions: ${pred1.expectedReactions} (Reach: ${pred1.expectedMetrics.reach.toLocaleString()})`);
  console.log(`  Predicted Views: ${pred1.predictedMetrics.views.toLocaleString()} (Retention: ${pred1.predictedMetrics.retentionRate})`);
  
  assert(pred1.engagementScore >= 50 && pred1.engagementScore <= 100, 'Score must be in valid range');
  assert(pred1.viralityIndex > 0, 'Virality Index must be computed');
  assert(pred1.expectedReactions > 0, 'Expected reactions must be positive');
  assert(pred1.predictedMetrics.views > 0, 'Predicted views must be computed');
  assert(pred1.bestTimeToPost, 'Best time to post must be provided');

  // 1B: Text Post Prediction
  const textPost = {
    text: '5 non-obvious architecture patterns for production AI agents in 2026.\n\n1. Deterministic guardrails\n2. Event-driven message bus\n3. Dynamic prompt routing\n\nWhich pattern are you implementing first? #AI #DevTools',
    platform: 'linkedin',
    postType: 'text',
    followers: 12500,
    userEmail
  };
  const predText = predictCandidatePost(textPost);
  console.log(`\n✓ 1B Text Post Prediction:`);
  console.log(`  Engagement Score: ${predText.engagementScore}/100 (${predText.breakoutRating})`);
  console.log(`  Expected Reactions: ${predText.expectedReactions}`);
  assert(predText.engagementScore > 0, 'Text score must be positive');

  // 1C: Image / Carousel Prediction
  const imagePost = {
    caption: 'Visual Guide: Microservices vs Event-Driven AI Agents. Swipe for diagrams ➡️ #SoftwareEngineering',
    platform: 'instagram',
    postType: 'image',
    imageType: 'carousel',
    slideCount: 6,
    hasTextOverlay: true,
    followers: 15000,
    userEmail
  };
  const predImage = predictCandidatePost(imagePost);
  console.log(`\n✓ 1C Carousel Prediction:`);
  console.log(`  Engagement Score: ${predImage.engagementScore}/100 (${predImage.breakoutRating})`);
  console.log(`  Audience Format Fit: ${predImage.twoStageBreakdown.model_B_audience_taste.audience_format_fit}`);
  assert(predImage.engagementScore > 0, 'Carousel score must be positive');

  // 1D: Model B Audience Taste Profile
  const taste = getAudienceTasteProfile(userEmail);
  console.log(`\n✓ 1D Model B Audience Taste Profile:`);
  console.log(`  Analyzed Posts: ${taste.samplePostsCount}`);
  console.log(`  Top Preferred Format: ${taste.preferredFormats[0].format} (${taste.preferredFormats[0].matchScore})`);
  console.log(`  Top Hook Style: ${taste.preferredHookStyles[0].hookType}`);
  assert(taste.preferredFormats.length > 0, 'Preferred formats must not be empty');

  // ── TEST SUITE 2: AI QUERY & SMART INTENT ROUTING VERIFICATION ──
  console.log('\n--- [2. AI QUERY SMART ROUTING & INTENT TESTS] ---');

  const testQueries = [
    {
      q: 'What should I post next to increase engagement?',
      expectedEngine: 'ml_model',
      label: 'Post Recommendation (Fixed listed query)'
    },
    {
      q: 'What type of content does my audience like based on Model B?',
      expectedEngine: 'ml_model',
      label: 'Audience Taste Profile (Fixed listed query)'
    },
    {
      q: 'What is the best time to post on Instagram?',
      expectedEngine: 'ml_model',
      label: 'Peak Posting Time (Fixed listed query)'
    },
    {
      q: 'Which content type performs best between Reels and Static?',
      expectedEngine: 'ml_model',
      label: 'Reels vs Static Comparison (Fixed listed query)'
    },
    {
      q: 'Why did my reach drop last week?',
      expectedEngine: 'ml_model',
      label: 'Reach Drop Diagnosis (Fixed listed query)'
    },
    {
      q: 'Compare Instagram vs Twitter',
      expectedEngine: 'ml_model',
      label: 'Platform Comparison (Fixed listed query)'
    },
    {
      q: 'Predict engagement for post: "Building autonomous developer tools with LLMs. What is your stack?"',
      expectedEngine: 'ml_model',
      label: 'Post Prediction Query (Fixed listed query)'
    },
    {
      q: 'Write 3 viral opening hooks for an AI SaaS product launch',
      expectedEngine: 'gemini_agent',
      label: 'Creative Copywriting Prompt (Open-ended query)'
    },
    {
      q: 'How should I structure a 30-day cross-platform creator growth sprint based on trending topics and my audience taste?',
      expectedEngine: 'gemini_agent',
      label: 'Growth Strategy Consultation (Open-ended query)'
    },
    {
      q: 'Hello, how are you doing today?',
      expectedEngine: 'gemini_agent',
      label: 'Friendly Greeting Chitchat'
    },
    {
      q: 'What can you do and what is EngageIQ?',
      expectedEngine: 'gemini_agent',
      label: 'Assistant Capabilities Explanation'
    }
  ];

  for (const t of testQueries) {
    const classification = isFixedListedQuery(t.q);
    const result = await routeAIQuery(t.q, ['instagram', 'linkedin', 'twitter'], 'auto', userEmail);
    
    console.log(`\n• Query: "${t.q.slice(0, 60)}${t.q.length > 60 ? '...' : ''}"`);
    console.log(`  Type: ${t.label}`);
    console.log(`  Engine Selected: ${result.engineUsed} (${result.engineLabel})`);
    console.log(`  Title: ${result.title}`);
    console.log(`  Routing Reason: ${result.routingReason}`);
    assert.strictEqual(result.engineUsed, t.expectedEngine, `Engine must match expected for ${t.q}`);
    assert(result.response && result.response.length > 50, 'Response must be substantial');
  }

  // ── TEST SUITE 3: FORCED ENGINE MODES VERIFICATION ──
  console.log('\n--- [3. FORCED ENGINE MODES (ML_ONLY & GEMINI_ONLY)] ---');

  const testQuery = 'Give me ideas for my next social media post';
  const mlOnlyRes = await routeAIQuery(testQuery, ['instagram'], 'ml_only', userEmail);
  console.log(`✓ Forced 'ml_only' Mode Engine: ${mlOnlyRes.engineUsed}`);
  assert.strictEqual(mlOnlyRes.engineUsed, 'ml_model');

  const geminiOnlyRes = await routeAIQuery(testQuery, ['instagram'], 'gemini_only', userEmail);
  console.log(`✓ Forced 'gemini_only' Mode Engine: ${geminiOnlyRes.engineUsed}`);
  assert.strictEqual(geminiOnlyRes.engineUsed, 'gemini_agent');

  console.log('\n================================================================');
  console.log('🎉 ALL ENGAGEMENT PREDICTION & AI QUERY VERIFICATIONS PASSED 100%!');
  console.log('================================================================');
}

runVerification().catch(err => {
  console.error('❌ Verification Failed:', err);
  process.exit(1);
});
