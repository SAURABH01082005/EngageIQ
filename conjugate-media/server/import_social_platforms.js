const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const LIVE_STORE_PATH = path.join(dataDir, 'live_store.json');
const DEFAULT_SEED_PATH = path.join(dataDir, 'default_seed.json');
const USERS_PATH = path.join(dataDir, 'conjugate_users.json');

function loadJson(prefix) {
  const files = fs.readdirSync(dataDir);
  let target;
  if (prefix === 'facebook') target = files.find(f => f.toLowerCase().includes('facebook-posts') && f.endsWith('.json'));
  else if (prefix === 'linkedin') target = files.find(f => f.toLowerCase().includes('linkedin-profile') && f.endsWith('.json'));
  else if (prefix === 'instagram') target = files.find(f => f.toLowerCase().includes('instagram-profile') && f.endsWith('.json'));
  else if (prefix === 'youtube') target = files.find(f => f.toLowerCase().includes('youtube-channel') && f.endsWith('.json'));
  else if (prefix === 'twitter') target = files.find(f => f.toLowerCase().includes('twitter-user') && f.endsWith('.json'));
  if (!target) target = files.find(f => f.toLowerCase().includes(prefix) && f.endsWith('.json'));
  if (!target) {
    console.warn(`[Skip] No file found for platform: ${prefix}`);
    return null;
  }
  console.log(`[Loading] ${target}`);
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, target), 'utf-8'));
  } catch (err) {
    console.error(`Error reading ${target}:`, err.message);
    return null;
  }
}

const usersMap = new Map();
const postsMap = new Map();

function parseDate(val, fallbackIdx = 0) {
  if (!val) return new Date(Date.now() - fallbackIdx * 86400000).toISOString();
  if (typeof val === 'number') {
    const ts = val < 10000000000 ? val * 1000 : val;
    return new Date(ts).toISOString();
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date(Date.now() - fallbackIdx * 86400000).toISOString() : parsed.toISOString();
}

function computeEngagement(views, likes, comments, shares) {
  const v = Math.max(Number(views) || 0, 1);
  const l = Number(likes) || 0;
  const c = Number(comments) || 0;
  const s = Number(shares) || 0;
  return { 
    views: Number(views) || 0, 
    likes: l, 
    comments: c, 
    shares: s, 
    engagementRate: (((l + c + s) / v) * 100).toFixed(2) + "%" 
  };
}

// 1. INSTAGRAM
const igRaw = loadJson('instagram');
if (igRaw) {
  const ig = Array.isArray(igRaw) ? igRaw[0] : igRaw;
  const userId = "user_ig_" + ig.username.toLowerCase();
  const igUser = {
    id: userId,
    email: `${ig.username.toLowerCase()}@instagram.creator`,
    username: ig.username.toLowerCase(),
    name: ig.fullName || "Nitish Rajput",
    avatar: ig.profilePicUrlHD || ig.profilePicUrl || "",
    profilePicUrl: ig.profilePicUrlHD || ig.profilePicUrl || "",
    bio: ig.biography || "Video Creator | 18+ Million Community",
    platform: "instagram",
    followers: Number(ig.followersCount) || 3662163,
    following: Number(ig.followsCount) || 618,
    verified: Boolean(ig.verified),
    totalPosts: Number(ig.postsCount) || 101,
    postsCount: Number(ig.postsCount) || 101
  };
  usersMap.set(igUser.id, igUser);

  (ig.latestPosts || []).forEach((p, idx) => {
    const views = Number(p.videoViewCount) || 250000;
    const likes = Number(p.likesCount) || Math.round(views * 0.05);
    const comments = Number(p.commentsCount) || Math.round(likes * 0.02);
    const shares = Math.round(likes * 0.035);
    const metrics = computeEngagement(views, likes, comments, shares);
    const published = parseDate(p.timestamp, idx);
    const caption = p.caption || "Instagram Reel";

    postsMap.set(`post_ig_${p.id}`, {
      id: `post_ig_${p.id}`,
      userId: igUser.id,
      author: igUser.name,
      username: igUser.username,
      avatar: igUser.avatar,
      userAvatar: igUser.avatar,
      platform: "instagram",
      postType: "video",
      type: "video",
      title: caption.split('\n')[0].slice(0, 80),
      caption,
      content: caption,
      mediaUrl: p.displayUrl || "",
      videoUrl: p.videoUrl || p.url || "",
      duration: "Reel",
      views, likes, comments, shares, metrics,
      publishedAt: published,
      createdAt: published
    });
  });
}

// 2. FACEBOOK
const fbRaw = loadJson('facebook');
if (fbRaw && Array.isArray(fbRaw) && fbRaw.length > 0) {
  const authorSample = fbRaw[0].author || {};
  const userId = "user_fb_nitishrajpute";
  const fbUser = {
    id: userId,
    email: "nitishrajpute@facebook.creator",
    username: "nitishrajpute",
    name: authorSample.name || "Nitish Rajput",
    avatar: authorSample.profilePicture || "",
    profilePicUrl: authorSample.profilePicture || "",
    bio: "Official Facebook page of Nitish Rajput | Digital Creator",
    platform: "facebook",
    followers: 1250000,
    following: 45,
    verified: true,
    totalPosts: fbRaw.length,
    postsCount: fbRaw.length
  };
  usersMap.set(fbUser.id, fbUser);

  fbRaw.forEach((post, idx) => {
    const likes = post.reactionsCount || (post.reactions && post.reactions.like) || 100;
    const comments = post.commentsCount || 0;
    const shares = post.sharesCount || 0;
    const views = Math.max((likes + comments + shares) * 15, 20000);
    const metrics = computeEngagement(views, likes, comments, shares);
    const published = parseDate(post.timestamp, idx);

    let mediaUrl = "";
    let videoUrl = "";
    if (post.attachments && post.attachments.length > 0) {
      mediaUrl = post.attachments[0].url || "";
      if (post.attachments[0].type === 'video') videoUrl = post.attachments[0].url || "";
    }

    postsMap.set(`post_fb_${post.postId}`, {
      id: `post_fb_${post.postId}`,
      userId: fbUser.id,
      author: fbUser.name,
      username: fbUser.username,
      avatar: fbUser.avatar,
      userAvatar: fbUser.avatar,
      platform: "facebook",
      postType: videoUrl ? "video" : "post",
      type: videoUrl ? "video" : "post",
      title: post.postText ? post.postText.split('\n')[0].slice(0, 80) : "Facebook Post",
      caption: post.postText || "",
      content: post.postText || "",
      mediaUrl, videoUrl,
      duration: videoUrl ? "Video" : "Post",
      views, likes, comments, shares, metrics,
      publishedAt: published,
      createdAt: published
    });
  });
}

// 3. LINKEDIN
const liRaw = loadJson('linkedin');
if (liRaw && Array.isArray(liRaw) && liRaw.length > 0) {
  const authorSample = liRaw[0].author || {};
  const userId = "user_li_nitishrajput";
  const liUser = {
    id: userId,
    email: "nitishrajput@linkedin.creator",
    username: (authorSample.publicIdentifier || "nitishrajput").toLowerCase(),
    name: authorSample.name || "Nitish Rajput",
    avatar: (authorSample.avatar && authorSample.avatar.url) || "",
    profilePicUrl: (authorSample.avatar && authorSample.avatar.url) || "",
    bio: authorSample.info || "Video Creator | 18+ Million Community",
    platform: "linkedin",
    followers: 485000,
    following: 500,
    verified: true,
    totalPosts: liRaw.length,
    postsCount: liRaw.length
  };
  usersMap.set(liUser.id, liUser);

  liRaw.forEach((post, idx) => {
    const engagement = post.engagement || {};
    const likes = engagement.likes || 150;
    const comments = engagement.comments || 10;
    const shares = engagement.shares || 5;
    const views = Math.max((likes + comments + shares) * 20, 10000);
    const metrics = computeEngagement(views, likes, comments, shares);
    const published = parseDate(post.postedAt && (post.postedAt.timestamp || post.postedAt.date), idx);

    let mediaUrl = "";
    if (post.postImages && post.postImages.length > 0) {
      mediaUrl = post.postImages[0].url || "";
    } else if (post.postVideo) {
      mediaUrl = post.postVideo.thumbnailUrl || "";
    } else if (post.article && post.article.image) {
      mediaUrl = post.article.image.url || "";
    }

    const videoUrl = (post.postVideo && post.postVideo.videoUrl) || "";
    const content = post.content || (post.article ? post.article.title : "") || "LinkedIn Update";

    postsMap.set(`post_li_${post.id}`, {
      id: `post_li_${post.id}`,
      userId: liUser.id,
      author: liUser.name,
      username: liUser.username,
      avatar: liUser.avatar,
      userAvatar: liUser.avatar,
      platform: "linkedin",
      postType: videoUrl ? "video" : (mediaUrl ? "image" : "text"),
      type: videoUrl ? "video" : (mediaUrl ? "image" : "text"),
      title: content.split('\n')[0].slice(0, 80),
      caption: content,
      content: content,
      mediaUrl, videoUrl,
      duration: videoUrl ? "Video" : "Read",
      views, likes, comments, shares, metrics,
      publishedAt: published,
      createdAt: published
    });
  });
}

// 4. TWITTER / X
const twRaw = loadJson('twitter');
if (twRaw && Array.isArray(twRaw) && twRaw.length > 0) {
  const userId = "user_tw_nitishrajput";
  const twUser = {
    id: userId,
    email: "nitishrajput@x.creator",
    username: "nitishrajput",
    name: "Nitish Rajput",
    avatar: "https://pbs.twimg.com/media/GqwEcp8WQAAfUJ_.jpg",
    profilePicUrl: "https://pbs.twimg.com/media/GqwEcp8WQAAfUJ_.jpg",
    bio: "Educating and questioning. Independent Content Creator.",
    platform: "twitter",
    followers: 650000,
    following: 120,
    verified: true,
    totalPosts: twRaw.length,
    postsCount: twRaw.length
  };
  usersMap.set(twUser.id, twUser);

  twRaw.forEach((tweet, idx) => {
    const rawViews = tweet.views ? Number(String(tweet.views).replace(/,/g, '')) : 0;
    const likes = tweet.favorites || 100;
    const comments = tweet.replies || 5;
    const shares = tweet.retweets || 20;
    const views = rawViews || Math.max((likes + comments + shares) * 12, 5000);
    const metrics = computeEngagement(views, likes, comments, shares);
    const published = parseDate(tweet.created_at, idx);

    let mediaUrl = "";
    let videoUrl = "";
    if (tweet.media) {
      if (tweet.media.photo && tweet.media.photo.length > 0) {
        mediaUrl = tweet.media.photo[0].media_url_https || "";
      } else if (tweet.media.video && tweet.media.video.length > 0) {
        mediaUrl = tweet.media.video[0].media_url_https || "";
        const variants = tweet.media.video[0].variants || [];
        const mp4 = variants.find(v => v.content_type === 'video/mp4');
        videoUrl = mp4 ? mp4.url : "";
      }
    }

    const text = tweet.text || "";
    postsMap.set(`post_tw_${tweet.tweet_id}`, {
      id: `post_tw_${tweet.tweet_id}`,
      userId: twUser.id,
      author: twUser.name,
      username: twUser.username,
      avatar: twUser.avatar,
      userAvatar: twUser.avatar,
      platform: "twitter",
      postType: videoUrl ? "video" : (mediaUrl ? "image" : "text"),
      type: videoUrl ? "video" : (mediaUrl ? "image" : "text"),
      title: text.split('\n')[0].slice(0, 80),
      caption: text,
      content: text,
      mediaUrl, videoUrl,
      duration: videoUrl ? "Video" : "Tweet",
      views, likes, comments, shares, metrics,
      publishedAt: published,
      createdAt: published
    });
  });

// 5. YOUTUBE INGESTION
const ytRaw = loadJson('youtube');
if (ytRaw && Array.isArray(ytRaw)) {
  const sample = ytRaw.find(item => item.aboutChannelInfo);
  if (sample) {
    const ch = sample.aboutChannelInfo;
    const userId = "user_yt_nitishrajput";
    const ytUser = {
      id: userId,
      email: "nitishrajput@youtube.partner",
      username: (ch.channelUsername || "nitishrajput").toLowerCase(),
      name: ch.channelName || "Nitish Rajput",
      avatar: ch.channelAvatarUrl || "",
      profilePicUrl: ch.channelAvatarUrl || "",
      bio: ch.channelDescription ? ch.channelDescription.slice(0, 160) + "..." : "",
      platform: "youtube",
      followers: Number(ch.numberOfSubscribers) || 8630000,
      following: 15,
      verified: Boolean(ch.isChannelVerified),
      totalPosts: Number(ch.channelTotalVideos) || 118,
      postsCount: Number(ch.channelTotalVideos) || 118
    };
    usersMap.set(ytUser.id, ytUser);

    ytRaw.filter(v => v.id && v.title).forEach((v, idx) => {
      const views = Number(v.viewCount) || 500000;
      const likes = Math.round(views * 0.048);
      const comments = Math.round(likes * 0.07);
      const shares = Math.round(likes * 0.03);
      const metrics = computeEngagement(views, likes, comments, shares);
      const published = parseDate(null, idx);

      postsMap.set(`post_yt_${v.id}`, {
        id: `post_yt_${v.id}`,
        userId: ytUser.id,
        author: ytUser.name,
        username: ytUser.username,
        avatar: ytUser.avatar,
        userAvatar: ytUser.avatar,
        platform: "youtube",
        postType: "video",
        type: "video",
        title: v.title,
        caption: `${v.title}\n\nWatch video: ${v.url || ""}`,
        content: `${v.title}\n\nWatch video: ${v.url || ""}`,
        mediaUrl: v.thumbnailUrl || "",
        videoUrl: v.url || `https://www.youtube.com/watch?v=${v.id}`,
        duration: v.duration || "00:00",
        views, 
        likes, 
        comments, 
        shares, 
        metrics,
        publishedAt: published,
        createdAt: published
      });
    });
  }
}
}

// Save final merged datasets
const finalUsers = Array.from(usersMap.values());
const finalPosts = Array.from(postsMap.values());

fs.writeFileSync(LIVE_STORE_PATH, JSON.stringify({ users: finalUsers, posts: finalPosts }, null, 2), 'utf-8');
fs.writeFileSync(DEFAULT_SEED_PATH, JSON.stringify({ users: finalUsers, posts: finalPosts }, null, 2), 'utf-8');
if (fs.existsSync(USERS_PATH)) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(finalUsers, null, 2), 'utf-8');
}

console.log("\n--- Import Summary ---");
finalUsers.forEach(u => console.log(`[${u.platform.toUpperCase()}] @${u.username} | Followers: ${u.followers.toLocaleString()} | Following: ${u.following.toLocaleString()}`));
console.log(`Total Posts Imported: ${finalPosts.length}`);
