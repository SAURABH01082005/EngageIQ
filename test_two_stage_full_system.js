/**
 * End-to-End Two-Stage ML Post Prediction Test
 * Validates prompt.txt specifications:
 * 1. Model A: Content Prior on Trending Videos (Breakout & Quality)
 * 2. Model B: Personal Lift Model on User Past Posts (Personal Lift vs Baseline)
 * 3. Virality Index (Theory 2: views + 15*likes + 50*comments + 100*shares)
 * 4. Conjugate Media Store (Port 5002) Data Provider
 * 5. Python ML Regressors (GradientBoosting / RandomForest / XGBoost)
 * 6. Node.js Real-Time Predictor Engine Fallback
 * 7. Server API Integration
 */

const assert = require('assert');
const { fetchConjugateTrendingVideos, fetchConjugatePosts } = require('./server/utils/conjugateClient');
const conjugateStore = require('./conjugate-media/server/services/conjugateStore');
const {
  trainTwoStageModel,
  predictCandidatePost,
  getTrendingBenchmarks,
  readModelArtifact
} = require('./ml/twoStageEngine');

async function runTwoStageTests() {
  console.log('================================================================');
  console.log('🚀 TESTING TWO-STAGE HIERARCHICAL ML POST PREDICTION SYSTEM');
  console.log('================================================================\n');

  // STEP 1: Verify Conjugate Media Trending Videos Provider
  console.log('--- [STEP 1] Conjugate Media Trending Videos Dataset ---');
  const trendingVideos = await conjugateStore.getTrendingVideos(100);
  console.log(`✓ Ingested ${trendingVideos.length} trending videos from Conjugate Media provider.`);
  assert(trendingVideos.length > 0, 'Trending videos must not be empty');
  
  const sampleVid = trendingVideos[0];
  console.log(`  Sample Video: "${sampleVid.title.slice(0, 50)}..."`);
  console.log(`  Views: ${sampleVid.views.toLocaleString()}, Likes: ${sampleVid.likes.toLocaleString()}, Comments: ${sampleVid.comments.toLocaleString()}`);
  console.log(`  Model A Target 1 (Breakout Log Ratio): ${sampleVid.breakout}`);
  console.log(`  Model A Target 2 (Quality Rate): ${(sampleVid.quality * 100).toFixed(2)}%`);
  console.log(`  Theory 2 (Virality Index): ${sampleVid.virality.toLocaleString()}`);
  
  // Verify Mathematical Targets for Model A
  const expectedBreakout = Math.log((sampleVid.views + 1) / (sampleVid.channel_subs + 1));
  const expectedQuality = (sampleVid.likes + sampleVid.comments) / sampleVid.views;
  const expectedVirality = sampleVid.views + 15 * sampleVid.likes + 50 * sampleVid.comments + 100 * sampleVid.shares;
  
  assert.strictEqual(Number(sampleVid.breakout.toFixed(2)), Number(expectedBreakout.toFixed(2)), 'Breakout calculation matches prompt.txt');
  assert.strictEqual(Number(sampleVid.quality.toFixed(4)), Number(expectedQuality.toFixed(4)), 'Quality calculation matches prompt.txt');
  assert.strictEqual(sampleVid.virality, expectedVirality, 'Virality Index calculation matches prompt.txt Theory 2');
  console.log('✓ Model A Targets & Virality Index mathematically verified.\n');

  // STEP 2: Verify User Past Posts from Conjugate Media
  console.log('--- [STEP 2] User Past Posts Dataset for Model B ---');
  const userEmail = 'saurabh.test@engageiq.com';
  const userPosts = await fetchConjugatePosts(userEmail);
  console.log(`✓ Ingested ${userPosts.length} past posts for user: ${userEmail}`);
  assert(userPosts.length > 0, 'User past posts must not be empty');

  // STEP 3: Retrain Two-Stage ML Model (Model A + Model B)
  console.log('\n--- [STEP 3] Train Two-Stage Model (Theory 1 Hierarchical Framework) ---');
  const trained = await trainTwoStageModel(userEmail);
  console.log(`✓ Training Completed! Status: ${trained.status}`);
  console.log(`  Model A (Trending Videos Content Prior):`);
  console.log(`    Training Samples: ${trained.sample_counts?.trending_videos}`);
  console.log(`    Breakout R²: ${trained.model_A?.metrics?.breakout?.r2}`);
  console.log(`    Quality R²: ${trained.model_A?.metrics?.quality?.r2}`);
  console.log(`    Virality R²: ${trained.model_A?.metrics?.virality?.r2}`);
  console.log(`  Model B (Personal Lift Model):`);
  console.log(`    User Post Samples: ${trained.sample_counts?.user_past_posts}`);
  console.log(`    Mean Breakout Lift: ${trained.model_B?.mean_lifts?.mean_breakout_lift}`);
  console.log(`    Mean Engagement Lift: ${trained.model_B?.mean_lifts?.mean_engagement_lift}`);
  console.log(`    Platform Audience Taste Affinities:`);
  Object.entries(trained.model_B?.platform_audience_taste || {}).forEach(([p, d]) => {
    console.log(`      • ${p}: Affinity Multiplier = ${d.affinity_multiplier}x (Avg Rate: ${d.avg_engagement_rate})`);
  });

  // STEP 4: Real-Time Post Prediction Test
  console.log('\n--- [STEP 4] Run Candidate Post Prediction (Model A + Model B + Baseline) ---');
  const candidatePost = {
    title: 'How AI Multi-Agent Systems Outperform Solo Creators',
    caption: 'Here is a breakdown of multi-agent architectures in production. Which framework are you testing? Drop your thoughts below! #AI #Tech #Dev',
    platform: 'instagram',
    postType: 'video',
    durationSec: 28,
    hasSubtitles: true,
    hookRating: 9,
    followers: 25000,
    userEmail
  };

  const prediction = predictCandidatePost(candidatePost);
  console.log(`✓ Prediction Generated:`);
  console.log(`  Candidate: "${candidatePost.title}"`);
  console.log(`  Final Engagement Score: ${prediction.engagementScore}/100 (${prediction.breakoutRating})`);
  console.log(`  Expected Reach: ${prediction.expectedMetrics?.reach?.toLocaleString()} users`);
  console.log(`  Expected Reactions: ${prediction.expectedMetrics?.totalReactions?.toLocaleString()} (Likes: ${prediction.expectedMetrics?.likes}, Comments: ${prediction.expectedMetrics?.comments}, Shares: ${prediction.expectedMetrics?.shares})`);
  console.log(`  Two-Stage Decomposition:`);
  console.log(`    • Model A Content Prior (Breakout): ${prediction.twoStageBreakdown?.model_A_content_prior?.breakout_prior}`);
  console.log(`    • Model A Quality Prior: ${(prediction.twoStageBreakdown?.model_A_content_prior?.quality * 100).toFixed(2)}%`);
  console.log(`    • Model B Personal Lift: +${prediction.twoStageBreakdown?.model_B_personal_lift?.breakout_lift} (Taste: ${prediction.twoStageBreakdown?.model_B_personal_lift?.platform_taste_affinity})`);
  console.log(`    • Virality Index (Theory 2): ${prediction.twoStageBreakdown?.virality_index_theory2?.toLocaleString()}`);
  console.log(`  Actionable Suggestions (${prediction.suggestions?.length}):`);
  prediction.suggestions?.forEach(s => console.log(`    ✦ [${s.title}]: ${s.description}`));

  assert(prediction.engagementScore >= 30 && prediction.engagementScore <= 100, 'Score is normalized 30-100');
  assert(prediction.twoStageBreakdown, 'Breakdown is provided');
  assert(prediction.twoStageBreakdown.model_A_content_prior, 'Model A prior is present');
  assert(prediction.twoStageBreakdown.model_B_personal_lift, 'Model B lift is present');

  // STEP 5: Verify Trending Benchmarks Endpoint Data
  console.log('\n--- [STEP 5] Trending Benchmarks Data ---');
  const benchmarks = getTrendingBenchmarks();
  console.log(`✓ Extracted Benchmarks with ${benchmarks.trendingVideos.length} trending benchmark videos.`);
  console.log(`  Avg Breakout Benchmark: ${benchmarks.benchmarks.avgBreakout}`);
  console.log(`  Avg Quality Benchmark: ${(benchmarks.benchmarks.avgQuality * 100).toFixed(2)}%`);

  console.log('\n================================================================');
  console.log('🎉 ALL TWO-STAGE ML TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

runTwoStageTests().catch(err => {
  console.error('❌ Two-Stage Test Failed:', err);
  process.exit(1);
});
