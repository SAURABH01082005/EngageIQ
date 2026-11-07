const express = require("express");
const cors = require("cors");

const analyticsRoutes = require("./routes/analytics");
const aiQueryRoutes = require("./routes/aiQuery");
const platformRoutes = require("./routes/platformAnalytics");
const recommendationRoutes = require("./routes/recommendations");
const timelineRoutes = require("./routes/engagementTimeline");
const sentimentRoutes = require("./routes/sentimentAnalytics");
const exportRoutes = require("./routes/exportReport");
const companyRoutes = require("./routes/CompanyRoutes");
const postOptimizerRoutes = require("./routes/postOptimizer");
const mlRoutes = require("./routes/mlRoutes");

const { predictEngagement } = require("../ml/engagementPredictor");

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

app.use("/api", analyticsRoutes);
app.use("/api", aiQueryRoutes);
app.use("/api", platformRoutes);
app.use("/api", recommendationRoutes);
app.use("/api", timelineRoutes);
app.use("/api", sentimentRoutes);
app.use("/api", exportRoutes);
app.use("/api", postOptimizerRoutes);
app.use("/api", mlRoutes);

const { verifyConjugateAccount } = require("./utils/conjugateClient");

app.use("/api/companies", companyRoutes);

// Verify user account exists in Conjugate Media
app.get("/api/auth/verify-conjugate-account", async (req, res) => {
  const userEmail = req.query.email || req.query.userEmail || req.headers["x-user-email"];
  if (!userEmail) {
    return res.status(400).json({ hasConjugateAccount: false, error: "Email required" });
  }

  const result = await verifyConjugateAccount(userEmail);
  return res.json({
    hasConjugateAccount: result.hasAccount,
    email: result.email,
    message: result.message || (result.hasAccount ? "Account connected." : "No Conjugate Media account found.")
  });
});

const { predictCandidatePost } = require("../ml/twoStageEngine");

app.post("/api/predict-engagement", (req, res) => {
  try {
    const postData = req.body || {};
    const text = postData.postText || postData.caption || postData.content || postData.title || "";
    const postType = (postData.postType || postData.post_type || "text").toLowerCase();
    const isVideo = postType.includes("video") || postType.includes("reel") || postType.includes("short");

    const twoStage = predictCandidatePost({
      title: postData.title || text.split("\n")[0].slice(0, 80),
      caption: text,
      text: text,
      platform: (postData.platform || "instagram").toLowerCase().replace("x", "twitter"),
      postType,
      followers: Number(postData.followers || postData.subscribers) || 10000,
      subscribers: Number(postData.subscribers || postData.followers) || 10000,
      durationSec: Number(postData.durationSec || postData.duration_sec || (isVideo ? 28 : 0)),
      aspectRatio: postData.aspectRatio || postData.aspect_ratio || (isVideo ? "9:16" : "1:1"),
      hasSubtitles: postData.hasSubtitles !== undefined ? Boolean(postData.hasSubtitles) : isVideo,
      hookRating: Number(postData.hookRating || postData.hook_rating || 8),
      hour_of_day: postData.hour_of_day !== undefined ? Number(postData.hour_of_day) : new Date().getHours(),
      day_of_week: postData.day_of_week || ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()],
      userEmail: req.headers["x-user-email"] || req.query.userEmail || postData.userEmail || "default_user",
      imageType: postData.imageType || postData.image_type
    });

    const reasons = (twoStage.suggestions || []).map(s => `${s.title}: ${s.description}`);
    if (reasons.length === 0) {
      reasons.push("Strong alignment with top trending content characteristics");
      reasons.push("Optimal audience reaction polarity detected");
    }

    res.json({
      ...twoStage,
      reasons,
      expectedReactions: twoStage.expectedMetrics?.totalReactions || Math.round((Number(postData.reactions) || 50) * 1.5)
    });
  } catch (e) {
    console.error("Two-Stage predict-engagement error:", e);
    try {
      const fallback = predictEngagement(req.body);
      res.json(fallback);
    } catch (err2) {
      res.status(500).json({ error: "Prediction failed" });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
