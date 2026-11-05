import React, { useState, useEffect } from 'react';
import '../styles/TrendingModal.css';

const CATEGORIES = [
  'AI & Tech',
  'Business & Leadership',
  'Viral Reels',
  'Education & Science',
  'Creator Economy',
  'Productivity & Engineering',
  'Entertainment'
];

export default function EditTrendingModal({
  isOpen,
  onClose,
  item,
  onUpdate
}) {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('AI & Tech');
  const [duration, setDuration] = useState('02:45');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [views, setViews] = useState(0);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);
  const [shares, setShares] = useState(0);
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setTitle(item.title || '');
      setCaption(item.caption || '');
      setAuthor(item.author || '');
      setCategory(item.category || 'AI & Tech');
      setDuration(item.duration || '02:30');
      setThumbnailUrl(item.thumbnailUrl || '');
      setViews(item.views || 0);
      setLikes(item.likes || 0);
      setComments(item.comments || 0);
      setShares(item.shares || 0);
      setTags(Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''));
      setError('');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      await onUpdate(item.id, {
        title: title.trim(),
        caption: caption.trim(),
        author: author.trim(),
        category,
        duration: duration.trim(),
        thumbnailUrl: thumbnailUrl.trim(),
        views: Number(views),
        likes: Number(likes),
        comments: Number(comments),
        shares: Number(shares),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean)
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cm-modal-overlay" onClick={onClose}>
      <div className="cm-modal-card cm-trending-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cm-modal-header">
          <div className="cm-modal-title">
            <span className="cm-modal-icon">✏️</span>
            <div>
              <h3>Edit Trending Post Details & Metrics</h3>
              <p>Platform: <strong>{item.platform.toUpperCase()}</strong> • Dataset: <code>{item.rawId}</code></p>
            </div>
          </div>
          <button type="button" className="cm-modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="cm-modal-alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="cm-modal-form">
          <div className="cm-form-group">
            <label className="cm-form-label">Title *</label>
            <input
              type="text"
              className="cm-modal-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="cm-form-row">
            <div className="cm-form-group flex-1">
              <label className="cm-form-label">Creator / Channel Name</label>
              <input
                type="text"
                className="cm-modal-input"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
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

          <div className="cm-form-group">
            <label className="cm-form-label">Description / Post Text</label>
            <textarea
              className="cm-modal-textarea"
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <div className="cm-form-row">
            <div className="cm-form-group flex-1">
              <label className="cm-form-label">Thumbnail Image URL</label>
              <input
                type="url"
                className="cm-modal-input"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
              />
            </div>
            <div className="cm-form-group flex-1">
              <label className="cm-form-label">Duration</label>
              <input
                type="text"
                className="cm-modal-input"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          {/* Metrics Edit Section */}
          <div className="cm-form-metrics-section">
            <span className="cm-metrics-sec-title">🎯 Direct Metrics Override (Updates JSON Dataset on Disk)</span>
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

          <div className="cm-form-group">
            <label className="cm-form-label">Tags (comma-separated)</label>
            <input
              type="text"
              className="cm-modal-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

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
              {submitting ? 'Writing to Disk...' : '💾 Save Changes to Dataset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

