const path = require('path');
let Sentiment;
try {
  Sentiment = require("sentiment");
} catch (e) {
  try {
    Sentiment = require(path.join(__dirname, '../server/node_modules/sentiment'));
  } catch (err2) {
    Sentiment = class { analyze() { return { score: 0 }; } };
  }
}

const sentimentAnalyzer = new Sentiment();

function predictEngagement(inputData) {
  const {
    followers,
    postText,
    postType,
    reactions,
    comments,
    daysSincePosted
  } = inputData;

  const sentimentResult = sentimentAnalyzer.analyze(postText || "");
  const sentimentScore = sentimentResult.score / 5;

  const ctaWords = ['discover', 'learn', 'explore', 'check', 'link'];
  const hasCTA = ctaWords.some(word => postText.toLowerCase().includes(word));
  const wordCount = postText.split(/\s+/).length;
  const hashtagCount = (postText.match(/#/g) || []).length;

  let followerBucket;
  if (followers < 50000) followerBucket = 'small';
  else if (followers < 500000) followerBucket = 'medium';
  else followerBucket = 'large';

  let postTypeWeight;
  if (postType === 'image') postTypeWeight = 1.0;
  else if (postType === 'video') postTypeWeight = 0.8;
  else postTypeWeight = 0.6;

  const earlyTractionRatio = followers > 0 ? reactions / followers : 0;
  const commentToLikeRatio = reactions > 0 ? comments / reactions : 0;

  let score = 0;

  score += sentimentScore * 20;
  score += postTypeWeight * 30;

  if (hasCTA) score += 15;

  score += Math.min(wordCount / 10, 10);
  score += hashtagCount * 5;
  score += earlyTractionRatio * 50;
  score += commentToLikeRatio * 20;

  const decayFactor = Math.max(0, 1 - daysSincePosted / 30);
  score *= decayFactor;

  let bucketMultiplier = followerBucket === "small" ? 0.8 : followerBucket === "medium" ? 1 : 1.2;
  score *= bucketMultiplier;

  score = Math.max(0, Math.min(score, 200));

  let growth;
  if (score > 120) growth = "HIGH";
  else if (score > 60) growth = "MEDIUM";
  else growth = "LOW";

  const confidence = Math.min(90, Math.max(30, score / 2));
  const expectedReactions = Math.round(reactions + (score / 100) * followers * 0.005);

  const reasons = [];
  if (sentimentScore > 0.1) reasons.push("Positive sentiment detected");
  if (hasCTA) reasons.push("Call-to-action words present");
  if (wordCount > 50) reasons.push("Detailed content");
  if (hashtagCount > 0) reasons.push(`${hashtagCount} hashtag(s)`);
  if (earlyTractionRatio > 0.01) reasons.push("Strong early traction");

  return {
    growth,
    confidence: Math.round(confidence),
    expectedReactions,
    reasons
  };
}

module.exports = { predictEngagement };
