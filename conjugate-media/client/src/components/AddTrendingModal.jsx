import React, { useState } from 'react';
import '../styles/TrendingModal.css';

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', icon: '▶️' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'facebook', label: 'Facebook', icon: '👥' },
  { id: 'linkedin', label: 'LinkedIn', icon: '🔗' },
  { id: 'twitter', label: 'X (Twitter)', icon: '𝕏' }
];

const CATEGORIES = [
  'AI & Tech',
  'Business & Leadership',
  'Viral Reels',
  'Education & Science',
  'Creator Economy',
  'Productivity & Engineering',
  'Entertainment'
];

export default function AddTrendingModal({
  isOpen,
  onClose,
  onSubmit,
  defaultPlatform = 'youtube'
}) {
  const [platform, setPlatform] = useState(defaultPlatform === 'all' ? 'youtube' : defaultPlatform);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [author, setAuthor] = useState('');
  const [username, setUsername] = useState('');
  const [duration, setDuration] = useState('02:45');
  const [category, setCategory] = useState('AI & Tech');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60');
  const [views, setViews] = useState(750000);
  const [likes, setLikes] = useState(38000);
  const [comments, setComments] = useState(2400);
  const [shares, setShares] = useState(5100);
  const [tags, setTags] = useState('Trending, ArtificialIntelligence, Tech');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      await onSubmit({
        platform,
        title: title.trim(),
        caption: caption.trim() || title.trim(),
        author: author.trim() || `${platform.toUpperCase()} Creator`,
        username: username.trim() || author.toLowerCase().replace(/\s+/g, '_') || 'creator',
        duration: duration.trim() || '02:30',
        category,
        videoUrl: videoUrl.trim(),
        thumbnailUrl: thumbnailUrl.trim(),
        views: Number(views) || 500000,
        likes: Number(likes) || 25000,
        comments: Number(comments) || 1200,
        shares: Number(shares) || 3000,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean)
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add trending video');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cm-modal-overlay" onClick={onClose}>
      <div className="cm-modal-card cm-trending-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="cm-modal-header">
          <div className="cm-modal-title">
            <span className="cm-modal-icon">➕</span>
            <div>
              <h3>Add New Trending Video / Post</h3>
              <p>Add to real platform dataset with verified viral engagement metrics</p>
            </div>
          </div>
          <button type="button" className="cm-modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="cm-modal-alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="cm-modal-form">
          {/* Platform Selector */}
          <div className="cm-form-group">
            <label className="cm-form-label">Target Platform *</label>
            <div className="cm-plat-selector-grid">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`cm-plat-select-btn ${platform === p.id ? 'active' : ''}`}
                  onClick={() => setPlatform(p.id)}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="cm-form-group">
            <label className="cm-form-label">Video / Post Title *</label>
            <input
              type="text"
              className="cm-modal-input"
              placeholder="e.g. Inside the Next-Gen Quantum Neural Cluster"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Author & Handle */}
          <div className="cm-form-row">
            <div className="cm-form-group flex-1">
              <label className="cm-form-label">Channel / Creator Name</label>
              <input
                type="text"
                className="cm-modal-input"
                placeholder="e.g. Tech Visionary"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
            <div className="cm-form-group flex-1">
              <label className="cm-form-label">Handle / Username</label>
              <input
                type="text"
                className="cm-modal-input"
                placeholder="e.g. techvision"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="cm-form-group">
            <label className="cm-form-label">Description / Script / Caption</label>
            <textarea
              className="cm-modal-textarea"
              rows={3}
              placeholder="Detailed breakdown, hook, or transcription..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          {/* Duration & Category */}
          <div className="cm-form-row">
            <div className="cm-form-group flex-1">
              <label className="cm-form-label">Duration (MM:SS)</label>
              <input
                type="text"
                className="cm-modal-input"
                placeholder="03:45"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="cm-form-group flex-1">
              <label className="cm-form-label">Category</label>
              <select
                className="cm-modal-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Media URLs */}
          <div className="cm-form-row">
            <div className="cm-form-group flex-1">
              <label className="cm-form-label">Thumbnail Image URL</label>
              <input
                type="url"
                className="cm-modal-input"
                placeholder="https://..."
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
              />
            </div>
            <div className="cm-form-group flex-1">
              <label className="cm-form-label">Video / Source Link</label>
              <input
                type="url"
                className="cm-modal-input"
                placeholder="https://youtube.com/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Thumbnail Preview */}
          {thumbnailUrl && (
            <div className="cm-thumbnail-preview-wrap">
              <span className="cm-preview-label">Cover Image Preview:</span>
              <img
                src={thumbnailUrl}
                alt="Preview"
                className="cm-preview-img"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';
                }}
              />
            </div>
          )}

          {/* Initial Viral Metrics */}
          <div className="cm-form-metrics-section">
            <span className="cm-metrics-sec-title">📊 Initial Viral Metrics (Written Directly to Dataset)</span>
            <div className="cm-form-metrics-row">
              <div className="cm-form-group flex-1">
                <label className="cm-form-label">Views</label>
                <input
                  type="number"
                  className="cm-modal-input"
                  min="0"
                  value={views}
                  onChange={(e) => setViews(e.target.value)}
                />
              </div>
              <div className="cm-form-group flex-1">
                <label className="cm-form-label">Likes</label>
                <input
                  type="number"
                  className="cm-modal-input"
                  min="0"
                  value={likes}
                  onChange={(e) => setLikes(e.target.value)}
                />
              </div>
              <div className="cm-form-group flex-1">
                <label className="cm-form-label">Comments</label>
                <input
                  type="number"
                  className="cm-modal-input"
                  min="0"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>
              <div className="cm-form-group flex-1">
                <label className="cm-form-label">Shares</label>
                <input
                  type="number"
                  className="cm-modal-input"
                  min="0"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="cm-form-group">
            <label className="cm-form-label">Tags (comma-separated)</label>
            <input
              type="text"
              className="cm-modal-input"
              placeholder="AI, Tech, Robotics, Innovation"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          {/* Modal Actions */}
          <div className="cm-modal-actions">
            <button
              type="button"
              className="cm-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cm-btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Writing to Dataset...' : '🚀 Save to Trending Dataset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

