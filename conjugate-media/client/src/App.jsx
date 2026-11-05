import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import ChannelProfile from './components/ChannelProfile';
import PostCreator from './components/PostCreator';
import PostCard from './components/PostCard';
import TrendingRadar from './components/TrendingRadar';
import api from './services/api';
import './styles/App.css';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [channels, setChannels] = useState({});
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // Active view: 'trending' (Live Trending Radar) or 'feed' (Personal Creator Studio)
  const [activeView, setActiveView] = useState('trending');

  const userEmail = currentUser?.email || 'default_user';

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user?.email) {
        api.registerUser(user.email).catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  // Fetch data with silent background refresh
  useEffect(() => {
    if (activeView === 'feed') {
      loadData(posts.length > 0);
    }
  }, [userEmail, selectedPlatform, selectedCategory, searchQuery, activeView]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [channelsRes, postsRes] = await Promise.all([
        api.getChannels(userEmail),
        api.getPosts({
          platform: selectedPlatform,
          category: selectedCategory,
          search: searchQuery
        }, userEmail)
      ]);

      setChannels(channelsRes.channels || {});
      setPosts(postsRes.posts || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const showNotification = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  // Instant Real-Time Subscriber Modulation
  const handleModulateSubscribers = async (plat, delta) => {
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

    showNotification(`⚡ ${plat.toUpperCase()} subscribers updated (${delta > 0 ? `+${delta}` : delta})!`);

    try {
      const res = await api.updateSubscribers(plat, delta, null, userEmail);
      if (res.channel) {
        setChannels((prev) => ({ ...prev, [plat]: res.channel }));
      }
    } catch (err) {
      console.error('Background sync failed:', err);
      loadData(true);
    }
  };

  // Create Post
  const handleCreatePost = async (postData) => {
    try {
      const res = await api.createPost(postData, userEmail);
      if (res.post) {
        if (selectedPlatform !== 'all' && selectedPlatform !== res.post.platform) {
          setSelectedPlatform(res.post.platform);
        }
        setPosts((prev) => [res.post, ...prev.filter((p) => p.id !== res.post.id)]);
        showNotification(`🎉 Post published on ${res.post.platform.toUpperCase()}! Synced with EngageIQ.`);
      }
    } catch (err) {
      console.error(err);
      showNotification(`❌ Error creating post: ${err.message}`);
    }
  };

  // Instant Real-Time Metric Modulation (+likes, +comments, +shares, -dislikes)
  const handleModulateMetrics = async (postId, updates) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const m = { ...(p.metrics || {}) };
        if (updates.likesDelta !== undefined) m.likes = Math.max(0, (m.likes || 0) + Number(updates.likesDelta));
        if (updates.commentsDelta !== undefined) m.comments = Math.max(0, (m.comments || 0) + Number(updates.commentsDelta));
        if (updates.sharesDelta !== undefined) m.shares = Math.max(0, (m.shares || 0) + Number(updates.sharesDelta));
        if (updates.dislikesDelta !== undefined) m.dislikes = Math.max(0, (m.dislikes || 0) + Number(updates.dislikesDelta));
        if (updates.reachDelta !== undefined) m.reach = Math.max(0, (m.reach || 0) + Number(updates.reachDelta));

        const raw = ((m.likes || 0) * 1) + ((m.comments || 0) * 2.5) + ((m.shares || 0) * 3.5) - ((m.dislikes || 0) * 2);
        const reach = m.reach || 1000;
        const rate = reach > 0 ? (raw / reach) * 100 : 5;
        m.engagementScore = Math.round(Math.min(99, Math.max(30, rate * 12 + 40)));

        return { ...p, metrics: m };
      })
    );

    try {
      const res = await api.updatePostMetrics(postId, updates, userEmail);
      if (res.post) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? res.post : p)));
      }
    } catch (err) {
      console.error('Metrics update error:', err);
      loadData(true);
    }
  };

  // Comment Addition
  const handleAddComment = async (postId, commentData) => {
    const tempComment = {
      id: `temp_${Date.now()}`,
      user: commentData.user || userEmail.split('@')[0] || 'community_member',
      comment: commentData.comment,
      sentiment: 'positive',
      timestamp: new Date().toISOString()
    };

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

    try {
      const res = await api.addComment(postId, commentData, userEmail);
      if (res.post) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? res.post : p)));
        showNotification(`💬 Comment added with ${res.comment?.sentiment || 'positive'} sentiment!`);
      }
    } catch (err) {
      console.error(err);
      loadData(true);
    }
  };

  // Delete Post
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post from your feed?')) return;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    showNotification('🗑️ Post deleted from feed.');

    try {
      await api.deletePost(postId, userEmail);
    } catch (err) {
      console.error(err);
      loadData(true);
    }
  };

  const handleResetSandbox = async () => {
    if (!window.confirm('Reset sandbox to default simulated seed data?')) return;
    try {
      await api.resetSandbox(userEmail);
      showNotification('🔄 Sandbox reset to default starter seed.');
      loadData(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="cm-app">
      {/* Top Navbar with Platform Switcher & Auth */}
      <Navbar
        selectedPlatform={selectedPlatform}
        onSelectPlatform={setSelectedPlatform}
        activeView={activeView}
        onSelectView={setActiveView}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Container */}
      <main className="cm-container">
        {/* Dynamic Sync Notice Banner */}
        <div className="cm-sync-notice">
          <div className="cm-sync-left">
            <span className="cm-live-dot" />
            <div>
              <div className="cm-sync-title">
                Conjugate Media Server Active (Port 5002) • Scraper Dataset Mode: <code>data/useData.js</code>
              </div>
              <div className="cm-sync-sub">
                Switch between <strong>🔥 Live Trending Radar</strong> (to view, boost, or add platform trending videos) and <strong>📱 Creator Studio</strong>.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className={`cm-btn-reset ${activeView === 'trending' ? 'active-view-btn' : ''}`}
              style={{
                background: activeView === 'trending' ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
                color: activeView === 'trending' ? '#0f172a' : '#f8fafc',
                fontWeight: 700
              }}
              onClick={() => setActiveView(activeView === 'trending' ? 'feed' : 'trending')}
            >
              {activeView === 'trending' ? 'Switch to Creator Studio 📱' : 'Switch to Trending Radar 🔥'}
            </button>
            <button
              type="button"
              className="cm-btn-reset"
              onClick={handleResetSandbox}
              title="Reset sandbox to starter seed"
            >
              Reset Seed ↺
            </button>
          </div>
        </div>

        {notice && (
          <div style={{
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38bdf8',
            padding: '0.65rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease'
          }}>
            {notice}
          </div>
        )}

        {/* VIEW 1: TRENDING RADAR & DATASET CONTROL STUDIO */}
        {activeView === 'trending' ? (
          <TrendingRadar
            initialPlatform={selectedPlatform}
            onShowNotification={showNotification}
          />
        ) : (
          /* VIEW 2: PERSONAL CREATOR FEED & STUDIO */
          <>
            {/* Channel Profile Banner with Subscriber Boosters */}
            <ChannelProfile
              platform={selectedPlatform}
              channelData={channels}
              onModulateSubscribers={handleModulateSubscribers}
            />

            {/* Post Publisher Studio */}
            <PostCreator
              defaultPlatform={selectedPlatform}
              onCreatePost={handleCreatePost}
            />

            {/* Feed Section */}
            <section className="cm-feed-section">
              <div className="cm-feed-header">
                <div className="cm-feed-title">
                  <h3>
                    {selectedPlatform === 'all' ? 'All Platform Feeds' : `${selectedPlatform.toUpperCase()} Feed`}
                  </h3>
                  <span className="cm-count-tag">{posts.length} Posts</span>
                </div>

                <div className="cm-feed-filters">
                  {/* Category Filter */}
                  <select
                    className="cm-input"
                    style={{ width: 'auto', padding: '0.4rem 0.65rem', fontSize: '0.82rem' }}
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    <option value="AI & Tech">AI & Tech</option>
                    <option value="Marketing & Growth">Marketing & Growth</option>
                    <option value="Business & Leadership">Business & Leadership</option>
                    <option value="Creator Economy">Creator Economy</option>
                    <option value="Product Launch">Product Launch</option>
                    <option value="Education">Education</option>
                  </select>

                  {/* Search Bar */}
                  <input
                    type="text"
                    className="cm-input"
                    style={{ width: '200px', padding: '0.4rem 0.65rem', fontSize: '0.82rem' }}
                    placeholder="Search captions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  Loading live social feeds...
                </div>
              ) : posts.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <h4>No posts found for this filter</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Use the post creator above to publish a new post on {selectedPlatform.toUpperCase()}!
                  </p>
                </div>
              ) : (
                <div className="cm-feed-grid" style={{ marginTop: '1rem' }}>
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onModulateMetrics={handleModulateMetrics}
                      onAddComment={handleAddComment}
                      onDeletePost={handleDeletePost}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Login / Register Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => {
          showNotification(`👋 Welcome back, ${user.email}! Switched to your account sandbox.`);
        }}
      />
    </div>
  );
}
