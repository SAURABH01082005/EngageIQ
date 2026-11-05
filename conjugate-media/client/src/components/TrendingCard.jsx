import React, { useState } from 'react';
import '../styles/TrendingCard.css';

const PLATFORM_THEMES = {
  youtube: { label: 'YouTube', icon: '▶️', color: '#ef4444', border: 'rgba(239, 68, 68, 0.35)', badgeBg: 'rgba(239, 68, 68, 0.15)' },
  instagram: { label: 'Instagram', icon: '📸', color: '#ec4899', border: 'rgba(236, 72, 153, 0.35)', badgeBg: 'rgba(236, 72, 153, 0.15)' },
  facebook: { label: 'Facebook', icon: '👥', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.35)', badgeBg: 'rgba(59, 130, 246, 0.15)' },
  linkedin: { label: 'LinkedIn', icon: '🔗', color: '#06b6d4', border: 'rgba(6, 182, 212, 0.35)', badgeBg: 'rgba(6, 182, 212, 0.15)' },
  twitter: { label: 'X (Twitter)', icon: '𝕏', color: '#a855f7', border: 'rgba(168, 85, 247, 0.35)', badgeBg: 'rgba(168, 85, 247, 0.15)' }
};

function formatCompactNumber(num) {
  if (num === null || num === undefined) return '0';
  const n = Number(num);
  if (isNaN(n)) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

export default function TrendingCard({
  item,
  index,
  onModulateMetrics,
  onOpenEditModal,
  onDeleteItem
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [modulatingField, setModulatingField] = useState(null);

  const theme = PLATFORM_THEMES[item.platform] || PLATFORM_THEMES.youtube;
  
  // Use sequential order rank: 1, 2, 3, 4, 5...
  const rankNumber = item.rank || index + 1;
  const isFirst = rankNumber === 1;
  const isSecond = rankNumber === 2;
  const isThird = rankNumber === 3;

  const triggerModulation = (updates, fieldName) => {
    setModulatingField(fieldName);
    onModulateMetrics(item.id, updates);
    setTimeout(() => setModulatingField(null), 600);
  };

  return (
    <article
      className={`cm-trending-card ${isFirst ? 'rank-first' : isSecond ? 'rank-second' : isThird ? 'rank-third' : ''}`}
      style={{ '--platform-color': theme.color, '--platform-border': theme.border }}
    >
      {/* Top Header: Rank & Platform Badge */}
      <div className="cm-trending-card-top">
        <div className="cm-rank-badge">
          <span className={`cm-rank-number ${isFirst ? 'rank-gold' : isSecond ? 'rank-silver' : isThird ? 'rank-bronze' : ''}`}>
            #{rankNumber}
          </span>
          <span className={`cm-rank-label ${isFirst ? 'label-gold' : isSecond ? 'label-silver' : isThird ? 'label-bronze' : ''}`}>
            {isFirst ? '👑 #1 Top Trending' : isSecond ? '🥈 #2 Viral' : isThird ? '🥉 #3 Trending' : rankNumber <= 10 ? `🔥 #${rankNumber} Trending` : `📈 #${rankNumber} Rising`}
          </span>
        </div>

        <div className="cm-plat-chip" style={{ color: theme.color, background: theme.badgeBg, borderColor: theme.border }}>
          <span>{theme.icon}</span>
          <span>{theme.label}</span>
        </div>
      </div>

      {/* Media / Video Preview */}
      <div className="cm-trending-media-wrap">
        <img
          src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'}
          alt={item.title}
          className="cm-trending-thumb"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';
          }}
        />
        <div className="cm-trending-media-overlay">
          {item.videoUrl && (
            <a
              href={item.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cm-trending-play-btn"
              title="Open original video source"
            >
              ▶
            </a>
          )}
        </div>

        {/* Duration & Aspect Ratio Pills */}
        <div className="cm-trending-media-badges">
          {item.duration && (
            <span className="cm-duration-pill">{item.duration}</span>
          )}
          {item.aspectRatio && (
            <span className="cm-aspect-pill">{item.aspectRatio}</span>
          )}
        </div>
      </div>

      {/* Author Info */}
      <div className="cm-trending-author-bar">
        <img
          src={item.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=60'}
          alt={item.author}
          className="cm-trending-avatar"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=60';
          }}
        />
        <div className="cm-trending-author-text">
          <div className="cm-trending-author-name">
            <span>{item.author}</span>
            <span className="cm-verified-tick" title="Verified Creator">✓</span>
          </div>
          <span className="cm-trending-author-handle">
            @{item.username || item.platform}
            {item.category && ` • ${item.category}`}
          </span>
        </div>
      </div>

      {/* Title & Caption */}
      <div className="cm-trending-content-body">
        <h4 className="cm-trending-title" title={item.title}>
          {item.title}
        </h4>

        {item.caption && (
          <div className="cm-trending-caption-wrap">
            <p className={`cm-trending-caption ${isExpanded ? 'expanded' : ''}`}>
              {item.caption}
            </p>
            {item.caption.length > 120 && (
              <button
                type="button"
                className="cm-btn-read-more"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Show less ▲' : 'Read more ▼'}
              </button>
            )}
          </div>
        )}

        {/* Tags */}
        {Array.isArray(item.tags) && item.tags.length > 0 && (
          <div className="cm-trending-tags">
            {item.tags.slice(0, 4).map((tag, i) => (
              <span key={i} className="cm-tag-chip">#{String(tag).replace(/^#/, '')}</span>
            ))}
          </div>
        )}
      </div>

      {/* Live Metrics Grid */}
      <div className="cm-trending-metrics-grid">
        <div className={`cm-metric-cell ${modulatingField === 'views' ? 'pulse' : ''}`} title={`${(item.views || 0).toLocaleString()} Views`}>
          <span className="cm-metric-label">👁️ Views</span>
          <span className="cm-metric-value">{formatCompactNumber(item.views)}</span>
        </div>

        <div className={`cm-metric-cell ${modulatingField === 'likes' ? 'pulse' : ''}`} title={`${(item.likes || 0).toLocaleString()} Likes`}>
          <span className="cm-metric-label">❤️ Likes</span>
          <span className="cm-metric-value">{formatCompactNumber(item.likes)}</span>
        </div>

        <div className={`cm-metric-cell ${modulatingField === 'comments' ? 'pulse' : ''}`} title={`${(item.comments || 0).toLocaleString()} Comments`}>
          <span className="cm-metric-label">💬 Comments</span>
          <span className="cm-metric-value">{formatCompactNumber(item.comments)}</span>
        </div>

        <div className={`cm-metric-cell ${modulatingField === 'shares' ? 'pulse' : ''}`} title={`${(item.shares || 0).toLocaleString()} Shares`}>
          <span className="cm-metric-label">🔄 Shares</span>
          <span className="cm-metric-value">{formatCompactNumber(item.shares)}</span>
        </div>
      </div>

      {/* Virality & Engagement Indicator Bar */}
      <div className="cm-virality-bar">
        <div className="cm-virality-score">
          <span>🚀 Virality Index:</span>
          <strong>{formatCompactNumber(item.viralityScore)}</strong>
        </div>
        <div className="cm-engagement-pill">
          <span>Rate:</span>
          <strong>{item.engagementRate || '4.5%'}</strong>
        </div>
      </div>

      {/* Direct Interactive Modulator Controls */}
      <div className="cm-trending-modulators">
        <div className="cm-modulator-row">
          <span className="cm-mod-row-label">Boost Likes:</span>
          <div className="cm-mod-btn-group">
            <button
              type="button"
              className="cm-mod-btn"
              onClick={() => triggerModulation({ likesDelta: 100 }, 'likes')}
              title="Increase Likes by 100"
            >
              +100
            </button>
            <button
              type="button"
              className="cm-mod-btn highlight"
              onClick={() => triggerModulation({ likesDelta: 1000 }, 'likes')}
              title="Increase Likes by 1,000"
            >
              +1,000
            </button>
            <button
              type="button"
              className="cm-mod-btn"
              onClick={() => triggerModulation({ likesDelta: 10000 }, 'likes')}
              title="Increase Likes by 10,000"
            >
              +10K
            </button>
            <button
              type="button"
              className="cm-mod-btn minus"
              onClick={() => triggerModulation({ likesDelta: -500 }, 'likes')}
              title="Decrease Likes by 500"
            >
              -500
            </button>
          </div>
        </div>

        <div className="cm-modulator-row">
          <span className="cm-mod-row-label">Boost Views:</span>
          <div className="cm-mod-btn-group">
            <button
              type="button"
              className="cm-mod-btn"
              onClick={() => triggerModulation({ viewsDelta: 10000 }, 'views')}
              title="Increase Views by 10,000"
            >
              +10K
            </button>
            <button
              type="button"
              className="cm-mod-btn highlight"
              onClick={() => triggerModulation({ viewsDelta: 100000 }, 'views')}
              title="Increase Views by 100,000"
            >
              +100K
            </button>
            <button
              type="button"
              className="cm-mod-btn"
              onClick={() => triggerModulation({ commentsDelta: 50 }, 'comments')}
              title="Increase Comments by 50"
            >
              +50 💬
            </button>
            <button
              type="button"
              className="cm-mod-btn"
              onClick={() => triggerModulation({ sharesDelta: 100 }, 'shares')}
              title="Increase Shares by 100"
            >
              +100 🔄
            </button>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="cm-trending-card-actions">
        <button
          type="button"
          className="cm-btn-edit-trending"
          onClick={() => onOpenEditModal(item)}
          title="Edit trending video details, metrics, and save to dataset"
        >
          ✏️ Edit Details & Metrics
        </button>

        <button
          type="button"
          className="cm-btn-delete-trending"
          onClick={() => onDeleteItem(item.id, item.title)}
          title="Remove from trending dataset"
        >
          🗑️
        </button>
      </div>
    </article>
  );
}
