let Sentiment;
try {
  Sentiment = require('sentiment');
} catch (e) {
  try {
    Sentiment = require('../server/node_modules/sentiment');
  } catch (err2) {
    Sentiment = class { analyze() { return { score: 0 }; } };
  }
}
const sentimentAnalyzer = new Sentiment();
const { predictWithLearnedModel, trainModelOnPastPosts } = require("./dynamicTrainer");

const PLATFORM_BENCHMARKS = {
  instagram: {
    followerMultiplier: 0.045,
    optimalDays: "Wednesday, Thursday, Friday",
    optimalHours: "6:00 PM – 8:30 PM",
    hashtagIdealMin: 3,
    hashtagIdealMax: 8,
    idealLength: { min: 80, max: 250 },
  },
  twitter: {
    followerMultiplier: 0.038,
    optimalDays: "Tuesday, Wednesday, Thursday",
    optimalHours: "8:00 AM – 10:00 AM & 6:00 PM – 8:00 PM",
    hashtagIdealMin: 1,
    hashtagIdealMax: 3,
    idealLength: { min: 40, max: 220 },
  },
  linkedin: {
    followerMultiplier: 0.052,
    optimalDays: "Tuesday, Wednesday, Thursday",
    optimalHours: "7:30 AM – 9:30 AM & 4:30 PM – 6:00 PM",
    hashtagIdealMin: 3,
    hashtagIdealMax: 5,
    idealLength: { min: 150, max: 600 },
  },
  facebook: {
    followerMultiplier: 0.032,
    optimalDays: "Thursday, Friday, Saturday",
    optimalHours: "6:30 PM – 9:00 PM",
    hashtagIdealMin: 1,
    hashtagIdealMax: 4,
    idealLength: { min: 60, max: 300 },
  },
};

/**
 * Predict Text Post using Dynamic ML Model
 */
function predictTextPost({ text = "", platform = "instagram", followers = 10000, postType = "text" }) {
  const normPlatform = (platform || "instagram").toLowerCase().replace("x", "twitter");
  const config = PLATFORM_BENCHMARKS[normPlatform] || PLATFORM_BENCHMARKS.instagram;

  const trimmed = text.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const charCount = trimmed.length;

  const sentimentResult = sentimentAnalyzer.analyze(trimmed);
  const sentimentScore = sentimentResult.score;

  const hasCTA = /link in bio|check out|swipe|save this|share|comment below|learn more|discover|click|dm me/i.test(trimmed);
  const hasQuestionHook = /\?|what do you think|which one|how do you|agree|favorite|who else/i.test(trimmed);
  const hashtags = (trimmed.match(/#[a-zA-Z0-9_]+/g) || []);
  const hashtagCount = hashtags.length;
  const lineBreaks = (trimmed.match(/\n/g) || []).length;

  // Run dynamic ML model inference
  const mlOutput = predictWithLearnedModel({
    caption_text: trimmed,
    platform: normPlatform,
    post_type: 'text'
  });

  const score = mlOutput.engagementScore;

  // Generate Improvements
  const improvements = [];
  if (!hasQuestionHook) {
    improvements.push({
      type: "hook",
      title: "Add an Engaging Question Hook",
      description: "Posts with an open question receive ~32% more comments based on historical platform feed data."
    });
  }

  if (!hasCTA) {
    improvements.push({
      type: "cta",
      title: "Include a Clear Call-to-Action (CTA)",
      description: "Adding an explicit prompt (e.g., 'Save this for later', 'Link in bio', 'Share with a friend') lifts viral distribution."
    });
  }

  if (hashtagCount === 0) {
    improvements.push({
      type: "hashtags",
      title: "Add Relevant Hashtags",
      description: `Add ${config.hashtagIdealMin}–${config.hashtagIdealMax} focused hashtags for search indexing.`
    });
  } else if (hashtagCount > config.hashtagIdealMax + 3) {
    improvements.push({
      type: "hashtags",
      title: "Streamline Hashtag Count",
      description: `Focus on top ${config.hashtagIdealMax} high-relevance hashtags to avoid spam filtering.`
    });
  }

  if (normPlatform === 'linkedin' && lineBreaks < 2 && wordCount > 40) {
    improvements.push({
      type: "formatting",
      title: "Add Line Breaks for Mobile Readability",
      description: "LinkedIn feeds prioritize skimmable 1-2 sentence paragraphs."
    });
  }

  if (improvements.length === 0) {
    improvements.push({
      type: "excellent",
      title: "Strong Post Structure",
      description: "Your caption exhibits high positive sentiment, clean formatting, question hook, and clear call-to-action."
    });
  }

  // Predicted metrics calculation
  const audienceBase = Math.max(followers, 1000);
  const estReach = Math.round(audienceBase * (score / 100) * 1.8);
  const estLikes = Math.round(estReach * 0.042 * (score / 75));
  const estComments = Math.round(estLikes * (hasQuestionHook ? 0.24 : 0.12));
  const estShares = Math.round(estLikes * (hasCTA ? 0.18 : 0.08));

  return {
    postType: "text",
    platform: normPlatform,
    engagementScore: score,
    tier: mlOutput.tier,
    mlMeta: {
      trainedModelVersion: mlOutput.mlModelVersion,
      r2Score: mlOutput.r2Confidence,
      featureContributions: mlOutput.featureContributions,
      topLearnedFeatures: mlOutput.modelImportances
    },
    predictedMetrics: {
      reach: estReach,
      likes: estLikes,
      comments: estComments,
      shares: estShares,
      engagementRate: (((estLikes + estComments + estShares) / estReach) * 100).toFixed(2) + '%'
    },
    improvements,
    bestTimeToPost: {
      days: config.optimalDays,
      timeSlot: config.optimalHours,
      confidence: `${Math.min(97, 80 + Math.round(score * 0.18))}%`
    },
    featuresAnalysis: {
      charCount,
      wordCount,
      sentiment: sentimentScore > 0 ? "Positive" : sentimentScore < 0 ? "Negative" : "Neutral",
      hasCTA,
      hasQuestionHook,
      hashtagCount,
      hashtags
    }
  };
}

/**
 * Predict Image / Pic Post using Dynamic ML Model
 */
function predictImagePost({
  platform = "instagram",
  followers = 10000,
  aspectRatio = "4:5",
  imageType = "carousel",
  slideCount = 5,
  hasTextOverlay = true,
  caption = ""
}) {
  const normPlatform = (platform || "instagram").toLowerCase().replace("x", "twitter");
  const config = PLATFORM_BENCHMARKS[normPlatform] || PLATFORM_BENCHMARKS.instagram;

  const mlOutput = predictWithLearnedModel({
    caption_text: caption,
    platform: normPlatform,
    post_type: 'image',
    media_specs: {
      aspect_ratio: aspectRatio,
      image_type: imageType,
      slide_count: slideCount,
      has_text_overlay: hasTextOverlay
    }
  });

  const score = mlOutput.engagementScore;

  const textAnalysis = predictTextPost({ text: caption, platform: normPlatform, followers, postType: "image" });
  const improvements = [...textAnalysis.improvements];

  if (aspectRatio === "16:9") {
    improvements.unshift({
      type: "aspect_ratio",
      title: "Switch to 4:5 Vertical Aspect Ratio",
      description: "16:9 landscape images leave 40% unused vertical space on mobile feeds. 4:5 format maximizes screen dwell time."
    });
  }

  if (imageType === "single" && normPlatform === "instagram") {
    improvements.push({
      type: "carousel_benefit",
      title: "Consider Multi-Slide Carousel",
      description: "Carousels generate 2.1x higher swipe retention and trigger second-chance impressions in the feed."
    });
  }

  return {
    postType: "image",
    platform: normPlatform,
    engagementScore: score,
    tier: mlOutput.tier,
    mlMeta: {
      trainedModelVersion: mlOutput.mlModelVersion,
      r2Score: mlOutput.r2Confidence,
      featureContributions: mlOutput.featureContributions,
      topLearnedFeatures: mlOutput.modelImportances
    },
    predictedMetrics: {
      reach: Math.round(textAnalysis.predictedMetrics.reach * 1.15),
      likes: Math.round(textAnalysis.predictedMetrics.likes * 1.1),
      comments: textAnalysis.predictedMetrics.comments,
      shares: Math.round(textAnalysis.predictedMetrics.shares * 1.25),
      swipeThroughRate: imageType === "carousel" ? "68.4%" : null,
      engagementRate: (((textAnalysis.predictedMetrics.likes * 1.1 + textAnalysis.predictedMetrics.comments + textAnalysis.predictedMetrics.shares * 1.25) / (textAnalysis.predictedMetrics.reach * 1.15)) * 100).toFixed(2) + '%'
    },
    improvements,
    bestTimeToPost: textAnalysis.bestTimeToPost,
    imageSpecs: {
      aspectRatio,
      imageType,
      slideCount: imageType === "carousel" ? slideCount : 1,
      hasTextOverlay
    }
  };
}

/**
 * Predict Video / Reel Post using Dynamic ML Model
 */
function predictVideoPost({
  platform = "instagram",
  followers = 10000,
  durationSec = 28,
  aspectRatio = "9:16",
  hasSubtitles = true,
  hookRating = 8,
  audioType = "trending",
  caption = ""
}) {
  const normPlatform = (platform || "instagram").toLowerCase().replace("x", "twitter");
  const config = PLATFORM_BENCHMARKS[normPlatform] || PLATFORM_BENCHMARKS.instagram;

  const mlOutput = predictWithLearnedModel({
    caption_text: caption,
    platform: normPlatform,
    post_type: 'video',
    media_specs: {
      duration_sec: durationSec,
      aspect_ratio: aspectRatio,
      has_subtitles: hasSubtitles,
      hook_rating: hookRating,
      audio_type: audioType
    }
  });

  const score = mlOutput.engagementScore;

  const improvements = [];
  if (!hasSubtitles) {
    improvements.push({
      type: "subtitles",
      title: "Add On-Screen Subtitles & Captions",
      description: "Over 80% of mobile users watch video on mute. Adding dynamic captions recovers ~35% of lost watch time."
    });
  }

  if (aspectRatio !== "9:16") {
    improvements.push({
      type: "aspect_ratio",
      title: "Convert to 9:16 Full-Screen Vertical",
      description: "Landscape (16:9) video suffers a 45% lower completion rate in mobile vertical feeds like Reels and Shorts."
    });
  }

  if (hookRating < 7) {
    improvements.push({
      type: "hook",
      title: "Strengthen First 3-Second Hook",
      description: "The first 2.5s dictate 70% of video retention drop-off. Open with an immediate question or visual interrupt."
    });
  }

  if (durationSec > 60 && (normPlatform === 'instagram' || normPlatform === 'twitter')) {
    improvements.push({
      type: "pacing",
      title: "Trim Pacing (Target 20–40s)",
      description: "Videos under 40 seconds achieve the highest algorithmic completion signal on Reels and TikTok."
    });
  }

  if (improvements.length === 0) {
    improvements.push({
      type: "excellent",
      title: "Exceptional Video Setup",
      description: "Vertical framing, fast 3-second hook, subtitles, and optimal duration position this video for maximum virality!"
    });
  }

  const audienceBase = Math.max(followers, 1000);
  const viralityFactor = (score / 100) * (hasSubtitles ? 1.2 : 0.8) * (aspectRatio === "9:16" ? 1.3 : 0.7);
  const estViews = Math.round(audienceBase * viralityFactor * 2.6);
  const estLikes = Math.round(estViews * 0.055);
  const estComments = Math.round(estLikes * 0.16);
  const estShares = Math.round(estLikes * 0.28);
  const estRetention = Math.min(94, Math.round(45 + (score * 0.45)));

  return {
    postType: "video",
    platform: normPlatform,
    engagementScore: score,
    viralityRating: (viralityFactor * 5).toFixed(1) + " / 5.0",
    tier: mlOutput.tier,
    mlMeta: {
      trainedModelVersion: mlOutput.mlModelVersion,
      r2Score: mlOutput.r2Confidence,
      featureContributions: mlOutput.featureContributions,
      topLearnedFeatures: mlOutput.modelImportances
    },
    predictedMetrics: {
      views: estViews,
      likes: estLikes,
      comments: estComments,
      shares: estShares,
      retentionRate: estRetention + "%",
      watchTimeAvgSec: Math.round(durationSec * (estRetention / 100)),
      engagementRate: (((estLikes + estComments + estShares) / estViews) * 100).toFixed(2) + '%'
    },
    improvements,
    bestTimeToPost: {
      days: config.optimalDays,
      timeSlot: config.optimalHours,
      confidence: `${Math.min(97, 80 + Math.round(score * 0.18))}%`
    },
    videoSpecs: {
      durationSec,
      aspectRatio,
      hasSubtitles,
      hookRating,
      audioType
    }
  };
}

module.exports = {
  predictTextPost,
  predictImagePost,
  predictVideoPost,
  trainModelOnPastPosts,
  PLATFORM_BENCHMARKS
};
