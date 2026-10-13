import React, { useState, useEffect } from 'react';
import PageLayout, { createDashboardNav } from '../components/PageLayout';
import conjugateApi from '../services/conjugateApi';
import '../styles/ConjugateMedia.css';

const PLATFORMS = [
  { id: 'all', label: 'All Feeds', icon: '🌐', className: '' },
  { id: 'instagram', label: 'Instagram', icon: '📸', className: 'ig' },
  { id: 'twitter', label: 'X (Twitter)', icon: '𝕏', className: 'tw' },
  { id: 'linkedin', label: 'LinkedIn', icon: '🔗', className: 'li' },
  { id: 'facebook', label: 'Facebook', icon: '👥', className: 'fb' },
];

const CATEGORIES = [
  'All Categories',
  'AI & Tech',
  'Marketing',
  'Business & Leadership',
  'Creator Economy',
  'Product Launch',
  'Education',
  'General'
];

function ConjugateMedia({ onNavigate, onBack }) {
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [channels, setChannels] = useState({});
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  // New Post Form State
  const [newPlatform, setNewPlatform] = useState('instagram');
  const [newPostType, setNewPostType] = useState('video');
  const [newCategory, setNewCategory] = useState('AI & Tech');
  const [newCaption, setNewCaption] = useState('');
  const [newAspectRatio, setNewAspectRatio] = useState('9:16');
  const [newDuration, setNewDuration] = useState(25);
  const [newHasSubtitles, setNewHasSubtitles] = useState(true);
  const [newHookRating, setNewHookRating] = useState(9);
  const [newHasTextOverlay, setNewHasTextOverlay] = useState(true);
  const [newSlideCount, setNewSlideCount] = useState(5);
  const [customCommentText, setCustomCommentText] = useState({});

  useEffect(() => {
    loadData();
  }, [selectedPlatform, selectedCategory]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const channelRes = await conjugateApi.getChannels();
      setChannels(channelRes.channels || {});

      const filter = {};
      if (selectedPlatform !== 'all') filter.platform = selectedPlatform;
      if (selectedCategory !== 'All Categories') filter.category = selectedCategory;

      const postRes = await conjugateApi.getPosts(filter);
      setPosts(postRes.posts || []);
    } catch (err) {
      console.error(err);
      setError('Could not connect to Conjugate Media server. Please ensure port 5002 is running.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const showFeedback = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Modulate channel subscribers with Instant Real-Time Optimistic Update
  const handleUpdateSubscribers = async (plat, delta) => {
    // 1. Instant optimistic update
    setChannels((prev) => {
      const current = prev[plat] || { subscribers: 25000, platform: plat };
      const nextSubs = Math.max(0, Number(current.subscribers || 0) + Number(delta));
      return {
        ...prev,
        [plat]: { ...current, subscribers: nextSubs }
      };
    });

    setPosts((prev) =>
      prev.map((p) => (p.platform === plat ? { ...p, subscribers: Math.max(0, (p.subscribers || 0) + delta) } : p))
    );

    showFeedback(`⚡ ${plat.toUpperCase()} subscribers updated (${delta > 0 ? `+${delta}` : delta})!`);

    // 2. Background sync
    try {
      const res = await conjugateApi.updateSubscribers(plat, delta);
      if (res.channel) {
        setChannels((prev) => ({
          ...prev,
          [plat]: res.channel
        }));
      }
    } catch (err) {
      setError('Failed to update subscribers.');
      loadData(true);
    }
  };

  // Create post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newCaption.trim()) {
      setError('Please enter a post caption or text.');
      return;
    }

    try {
      const postPayload = {
        platform: newPlatform,
        postType: newPostType,
        category: newCategory,
        caption: newCaption,
        mediaSpecs: {
          aspectRatio: newAspectRatio,
          durationSec: Number(newDuration),
          hasSubtitles: Boolean(newHasSubtitles),
          hookRating: Number(newHookRating),
          hasTextOverlay: Boolean(newHasTextOverlay),
          slideCount: Number(newSlideCount)
        }
      };

      const res = await conjugateApi.createPost(postPayload);
      setPosts((prev) => [res.post, ...prev]);
      setNewCaption('');
      setIsCreatingPost(false);
      showFeedback(`🚀 New post published to ${newPlatform.toUpperCase()} & synced with EngageIQ!`);
    } catch (err) {
      setError('Failed to create post.');
    }
  };

  // Instant Real-Time Metric Modulation (+likes, +comments, +shares, +dislikes, +reach)
  const handleModulateMetrics = async (postId, metricKey, delta) => {
    // 1. Instant 0ms optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const m = { ...(p.metrics || {}) };
        if (metricKey === 'likes') m.likes = Math.max(0, (m.likes || 0) + delta);
        if (metricKey === 'comments') m.comments = Math.max(0, (m.comments || 0) + delta);
        if (metricKey === 'shares') m.shares = Math.max(0, (m.shares || 0) + delta);
        if (metricKey === 'dislikes') m.dislikes = Math.max(0, (m.dislikes || 0) + delta);
        if (metricKey === 'reach') m.reach = Math.max(0, (m.reach || 0) + delta);

        // Real-time client score calculation
        const raw = ((m.likes || 0) * 1) + ((m.comments || 0) * 2.5) + ((m.shares || 0) * 3.5) - ((m.dislikes || 0) * 2);
        const reach = m.reach || 1000;
        const rate = reach > 0 ? (raw / reach) * 100 : 5;
        m.engagementScore = Math.round(Math.min(99, Math.max(30, rate * 12 + 40)));

        return { ...p, metrics: m };
      })
    );

    showFeedback(`⚡️ Metrics updated (${delta > 0 ? `+${delta}` : delta} ${metricKey})!`);

    // 2. Background sync
    try {
      const updatePayload = {};
      if (metricKey === 'likes') updatePayload.likesDelta = delta;
      if (metricKey === 'comments') updatePayload.commentsDelta = delta;
      if (metricKey === 'shares') updatePayload.sharesDelta = delta;
      if (metricKey === 'dislikes') updatePayload.dislikesDelta = delta;
      if (metricKey === 'reach') updatePayload.reachDelta = delta;

      const res = await conjugateApi.updatePostMetrics(postId, updatePayload);
      if (res.post) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? res.post : p))
        );
      }
    } catch (err) {
      setError('Failed to modulate metrics.');
      loadData(true);
    }
  };

  // Instant Real-Time Comment Addition
  const handleAddComment = async (postId) => {
    const text = (customCommentText[postId] || '').trim();
    if (!text) return;

    const tempComment = {
      id: `temp_${Date.now()}`,
      user: 'community_member',
      comment: text,
      sentiment: 'positive',
      timestamp: new Date().toISOString()
    };

    // 1. Instant optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextCommentsList = [tempComment, ...(p.commentsList || [])];
        const nextMetrics = {
          ...(p.metrics || {}),
          comments: ((p.metrics?.comments || 0) + 1)
        };
        return { ...p, commentsList: nextCommentsList, metrics: nextMetrics };
      })
    );

    setCustomCommentText((prev) => ({ ...prev, [postId]: '' }));

    // 2. Background sync
    try {
      const res = await conjugateApi.addComment(postId, {
        user: 'community_member',
        comment: text
      });
      if (res.post) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? res.post : p))
        );
        showFeedback(`💬 Comment added with ${res.comment?.sentiment || 'positive'} sentiment!`);
      }
    } catch (err) {
      setError('Failed to add comment.');
      loadData(true);
    }
  };

  // Instant Real-Time Post Deletion
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    showFeedback('🗑️ Post deleted.');

    try {
      await conjugateApi.deletePost(postId);
    } catch (err) {
      setError('Failed to delete post.');
      loadData(true);
    }
  };

  // Reset sandbox
  const handleResetSandbox = async () => {
    if (!window.confirm('Reset Conjugate Media sandbox to rich default dataset?')) return;
    try {
      await conjugateApi.resetSandbox();
      await loadData(false);
      showFeedback(`🔄 Sandbox reset to fresh default social media dataset!`);
    } catch (err) {
      setError('Failed to reset sandbox.');
    }
  };

  const currentChannel = selectedPlatform !== 'all' ? channels[selectedPlatform] : null;

  return (
    <PageLayout
      title="Conjugate Media Platform"
      subtitle="Independent Social Media Control Plane: Modulate Posts, Likes, Comments, Shares, & Channel Subscribers"
      onBack={onBack}
      nav={createDashboardNav(onNavigate, 'conjugate')}
      layout="dashboard"
      className="conjugate-page"
    >
      <div className="cm-container">
        {/* ── Top Status Banner ── */}
        <div className="cm-sync-banner">
          <div className="cm-sync-left">
            <span className="cm-pulse-indicator" />
            <div>
              <span className="cm-sync-title">
                🟢 Conjugate Media Server (Port 5002) • Connected to Firebase
              </span>
              <span className="cm-sync-sub">
                Live multi-platform simulator • Real-time stream feeds EngageIQ Dashboards, Timelines, & ML Engine
              </span>
            </div>
          </div>
          <div className="cm-sync-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleResetSandbox}
              title="Reset posts and metrics to default dataset"
            >
              🔄 Reset Sandbox
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate('dashboard')}
            >
              📊 View EngageIQ Analytics →
            </button>
          </div>
        </div>

        {/* ── Notifications ── */}
        {successMsg && (
          <div className="alert alert-success">
            <span>✓</span>
            <div>{successMsg}</div>
          </div>
        )}
        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {/* ── Platform Switcher Tabs ── */}
        <div className="cm-platform-bar">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`cm-platform-tab ${p.className} ${selectedPlatform === p.id ? `active ${p.className}` : ''}`}
              onClick={() => setSelectedPlatform(p.id)}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* ── Platform Channel & Subscriber Controller ── */}
        {currentChannel && (
          <div className="cm-channel-card">
            <div className="cm-channel-info">
              <img
                src={currentChannel.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'}
                alt={currentChannel.name}
                className="cm-avatar"
              />
              <div className="cm-channel-meta">
                <h3>
                  {currentChannel.name}{' '}
                  <span style={{ fontSize: '0.8rem', color: '#60a5fa' }}>Verified Channel</span>
                </h3>
                <div className="cm-handle">{currentChannel.handle} • {currentChannel.category}</div>
                <div className="cm-bio">{currentChannel.bio}</div>
              </div>
            </div>

            <div className="cm-subscriber-box">
              <div className="cm-sub-counter-label">Live Channel Subscribers</div>
              <div className="cm-sub-counter">
                {currentChannel.subscribers?.toLocaleString() || 0}
              </div>
              <div className="cm-sub-modulators">
                <button
                  type="button"
                  className="btn-pill-sm"
                  onClick={() => handleUpdateSubscribers(selectedPlatform, 100)}
                >
                  +100
                </button>
                <button
                  type="button"
                  className="btn-pill-sm"
                  onClick={() => handleUpdateSubscribers(selectedPlatform, 1000)}
                >
                  +1,000
                </button>
                <button
                  type="button"
                  className="btn-pill-sm danger"
                  onClick={() => handleUpdateSubscribers(selectedPlatform, -500)}
                >
                  -500
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Post Creator Bar / Toggle ── */}
        <div className="cm-creator-card">
          <div className="cm-creator-header">
            <h3>
              <span>✍️</span> Publish New Social Media Post to Conjugate Media
            </h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsCreatingPost(!isCreatingPost)}
            >
              {isCreatingPost ? '▲ Close Creator' : '➕ Create Post'}
            </button>
          </div>

          {isCreatingPost && (
            <form onSubmit={handleCreatePost} className="cm-creator-grid">
              <div>
                <div className="cm-form-group">
                  <label className="cm-form-label">Post Caption / Text</label>
                  <textarea
                    className="cm-textarea"
                    placeholder="Write your post caption, hook question, hashtags, or text thread..."
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    required
                  />
                </div>

                <div className="cm-specs-row">
                  <div>
                    <label className="cm-form-label">Platform</label>
                    <select
                      className="cm-select"
                      value={newPlatform}
                      onChange={(e) => setNewPlatform(e.target.value)}
                    >
                      <option value="instagram">📸 Instagram</option>
                      <option value="twitter">𝕏 X (Twitter)</option>
                      <option value="linkedin">🔗 LinkedIn</option>
                      <option value="facebook">👥 Facebook</option>
                    </select>
                  </div>

                  <div>
                    <label className="cm-form-label">Content Format</label>
                    <select
                      className="cm-select"
                      value={newPostType}
                      onChange={(e) => setNewPostType(e.target.value)}
                    >
                      <option value="video">🎬 Reel / Short Video</option>
                      <option value="carousel">🖼️ Multi-Slide Carousel</option>
                      <option value="image">📷 Single Image</option>
                      <option value="text">📝 Text Thread</option>
                    </select>
                  </div>

                  <div>
                    <label className="cm-form-label">Category</label>
                    <select
                      className="cm-select"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    >
                      <option value="AI & Tech">AI & Tech</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Business & Leadership">Business & Leadership</option>
                      <option value="Creator Economy">Creator Economy</option>
                      <option value="Product Launch">Product Launch</option>
                      <option value="Education">Education</option>
                    </select>
                  </div>
                </div>

                {newPostType === 'video' && (
                  <div className="cm-specs-row">
                    <div>
                      <label className="cm-form-label">Aspect Ratio</label>
                      <select
                        className="cm-select"
                        value={newAspectRatio}
                        onChange={(e) => setNewAspectRatio(e.target.value)}
                      >
                        <option value="9:16">9:16 (Vertical Reel)</option>
                        <option value="16:9">16:9 (Landscape)</option>
                        <option value="1:1">1:1 (Square)</option>
                      </select>
                    </div>
                    <div>
                      <label className="cm-form-label">Duration: {newDuration}s</label>
                      <input
                        type="range"
                        min="5"
                        max="90"
                        value={newDuration}
                        onChange={(e) => setNewDuration(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="cm-form-label">Hook Rating: {newHookRating}/10</label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={newHookRating}
                        onChange={(e) => setNewHookRating(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {newPostType === 'carousel' && (
                  <div className="cm-specs-row">
                    <div>
                      <label className="cm-form-label">Aspect Ratio</label>
                      <select
                        className="cm-select"
                        value={newAspectRatio}
                        onChange={(e) => setNewAspectRatio(e.target.value)}
                      >
                        <option value="4:5">4:5 (Portrait Feed)</option>
                        <option value="1:1">1:1 (Square)</option>
                      </select>
                    </div>
                    <div>
                      <label className="cm-form-label">Slides Count: {newSlideCount}</label>
                      <input
                        type="range"
                        min="2"
                        max="10"
                        value={newSlideCount}
                        onChange={(e) => setNewSlideCount(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <label className="cm-checkbox-label">
                    <input
                      type="checkbox"
                      checked={newHasSubtitles}
                      onChange={(e) => setNewHasSubtitles(e.target.checked)}
                    />
                    Subtitles Enabled
                  </label>
                  <label className="cm-checkbox-label">
                    <input
                      type="checkbox"
                      checked={newHasTextOverlay}
                      onChange={(e) => setNewHasTextOverlay(e.target.checked)}
                    />
                    Text Overlay in Hook
                  </label>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                  <button type="submit" className="btn btn-primary">
                    🚀 Publish Post to {newPlatform.toUpperCase()}
                  </button>
                </div>
              </div>

              {/* Live Preview Card */}
              <div>
                <label className="cm-form-label">Live Feed Preview</label>
                <div className={`cm-post-card ${newPlatform.slice(0, 2)}`}>
                  <div className="cm-card-top">
                    <span className="cm-post-platform-badge">
                      {newPlatform === 'instagram' ? '📸 Instagram' : newPlatform === 'twitter' ? '𝕏 Twitter' : newPlatform === 'linkedin' ? '🔗 LinkedIn' : '👥 Facebook'}
                    </span>
                    <span className="cm-post-score">Preview</span>
                  </div>
                  <div className="cm-post-caption">
                    {newCaption || 'Your post preview will appear here in real-time...'}
                  </div>
                  <div className="cm-post-media-pill">
                    {newPostType === 'video' ? `🎬 ${newAspectRatio} Reel (${newDuration}s)` : newPostType === 'carousel' ? `🖼️ ${newSlideCount} Slides` : '📷 Static Post'}
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* ── Live Posts Feed Header & Category Filter ── */}
        <div className="cm-feed-header">
          <div className="cm-feed-title">
            📱 Active Platform Posts ({posts.length})
          </div>
          <div>
            <select
              className="cm-select"
              style={{ width: 'auto' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Posts Grid with Interactive Modulators ── */}
        {loading ? (
          <div className="text-center py-5 text-muted">
            <span className="loading-spinner lg" />
            <p className="mt-3">Loading live platform posts from Conjugate Media...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="cm-creator-card text-center py-5">
            <p className="text-muted">No posts found for this platform/category filter.</p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsCreatingPost(true)}
            >
              ➕ Create the First Post
            </button>
          </div>
        ) : (
          <div className="cm-feed-grid">
            {posts.map((post) => {
              const platClass = post.platform ? post.platform.slice(0, 2) : 'ig';
              const pLikes = post.metrics?.likes || 0;
              const pComments = post.metrics?.comments || 0;
              const pShares = post.metrics?.shares || 0;
              const pDislikes = post.metrics?.dislikes || 0;
              const pReach = post.metrics?.reach || 0;

              return (
                <div key={post.id} className={`cm-post-card ${platClass}`}>
                  <div>
                    <div className="cm-card-top">
                      <span className="cm-post-platform-badge">
                        {post.platform === 'instagram' ? '📸 Instagram' : post.platform === 'twitter' ? '𝕏 Twitter' : post.platform === 'linkedin' ? '🔗 LinkedIn' : '👥 Facebook'}
                      </span>
                      <span className="cm-post-score">
                        Score: {post.metrics?.engagementScore || 75}/100
                      </span>
                    </div>

                    <div className="cm-post-timestamp" style={{ marginTop: '0.4rem' }}>
                      📅 {new Date(post.createdAt || post.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} • Category: <strong>{post.category || 'General'}</strong>
                    </div>

                    <div className="cm-post-caption" style={{ marginTop: '0.75rem' }}>
                      {post.caption || post.text}
                    </div>

                    {post.mediaSpecs && (
                      <div className="cm-post-media-pill" style={{ marginTop: '0.65rem' }}>
                        {post.postType === 'video'
                          ? `🎬 ${post.mediaSpecs.aspectRatio || '9:16'} Video (${post.mediaSpecs.durationSec || 25}s)`
                          : post.postType === 'carousel'
                          ? `🖼️ ${post.mediaSpecs.slideCount || 5} Slide Carousel`
                          : '📷 Standard Media'}
                      </div>
                    )}
                  </div>

                  {/* Interactive Modulator Controls */}
                  <div className="cm-modulators-section">
                    {/* Likes */}
                    <div className="cm-mod-row">
                      <span className="cm-mod-label">❤️ Likes:</span>
                      <span className="cm-mod-value">{pLikes.toLocaleString()}</span>
                      <div className="cm-mod-btns">
                        <button
                          type="button"
                          className="cm-btn-inc"
                          onClick={() => handleModulateMetrics(post.id, 'likes', 10)}
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          className="cm-btn-inc"
                          onClick={() => handleModulateMetrics(post.id, 'likes', 100)}
                        >
                          +100
                        </button>
                        <button
                          type="button"
                          className="cm-btn-inc danger"
                          onClick={() => handleModulateMetrics(post.id, 'likes', -20)}
                        >
                          -20
                        </button>
                      </div>
                    </div>

                    {/* Comments */}
                    <div className="cm-mod-row">
                      <span className="cm-mod-label">💬 Comments:</span>
                      <span className="cm-mod-value">{pComments.toLocaleString()}</span>
                      <div className="cm-mod-btns">
                        <button
                          type="button"
                          className="cm-btn-inc"
                          onClick={() => handleModulateMetrics(post.id, 'comments', 5)}
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          className="cm-btn-inc"
                          onClick={() => handleModulateMetrics(post.id, 'comments', 25)}
                        >
                          +25
                        </button>
                      </div>
                    </div>

                    {/* Shares */}
                    <div className="cm-mod-row">
                      <span className="cm-mod-label">🔁 Shares / Reposts:</span>
                      <span className="cm-mod-value">{pShares.toLocaleString()}</span>
                      <div className="cm-mod-btns">
                        <button
                          type="button"
                          className="cm-btn-inc"
                          onClick={() => handleModulateMetrics(post.id, 'shares', 5)}
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          className="cm-btn-inc"
                          onClick={() => handleModulateMetrics(post.id, 'shares', 50)}
                        >
                          +50
                        </button>
                      </div>
                    </div>

                    {/* Dislikes */}
                    <div className="cm-mod-row">
                      <span className="cm-mod-label">👎 Dislikes / Downvotes:</span>
                      <span className="cm-mod-value">{pDislikes.toLocaleString()}</span>
                      <div className="cm-mod-btns">
                        <button
                          type="button"
                          className="cm-btn-inc danger"
                          onClick={() => handleModulateMetrics(post.id, 'dislikes', 1)}
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          className="cm-btn-inc"
                          onClick={() => handleModulateMetrics(post.id, 'dislikes', -1)}
                        >
                          -1
                        </button>
                      </div>
                    </div>

                    {/* Reach */}
                    <div className="cm-mod-row">
                      <span className="cm-mod-label">👁️ Est. Reach:</span>
                      <span className="cm-mod-value">{pReach.toLocaleString()}</span>
                      <div className="cm-mod-btns">
                        <button
                          type="button"
                          className="cm-btn-inc"
                          onClick={() => handleModulateMetrics(post.id, 'reach', 1000)}
                        >
                          +1k
                        </button>
                      </div>
                    </div>

                    {/* Comments Drawer */}
                    {post.commentsList && post.commentsList.length > 0 && (
                      <div className="cm-comments-box">
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '0.25rem' }}>
                          Community Discussions ({post.commentsList.length}):
                        </div>
                        {post.commentsList.map((c) => (
                          <div key={c.id} className="cm-comment-item">
                            <span className="cm-comment-user">@{c.user}:</span>
                            <span style={{ color: '#e2e8f0' }}>{c.comment}</span>
                            <span style={{ fontSize: '0.65rem', marginLeft: '0.4rem', color: c.sentiment === 'positive' ? '#10b981' : '#cbd5e1' }}>
                              ({c.sentiment || 'neutral'})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Custom Comment Input */}
                    <div className="cm-add-comment-input-row">
                      <input
                        type="text"
                        className="cm-comment-input"
                        placeholder="Write a community comment..."
                        value={customCommentText[post.id] || ''}
                        onChange={(e) =>
                          setCustomCommentText((prev) => ({
                            ...prev,
                            [post.id]: e.target.value
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(post.id);
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAddComment(post.id)}
                      >
                        Send
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#ef4444', padding: '0.2rem 0.5rem' }}
                        onClick={() => handleDeletePost(post.id)}
                        title="Delete post"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default ConjugateMedia;
