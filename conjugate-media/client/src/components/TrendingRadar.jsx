import React, { useState, useEffect } from 'react';
import TrendingCard from './TrendingCard';
import AddTrendingModal from './AddTrendingModal';
import EditTrendingModal from './EditTrendingModal';
import api from '../services/api';
import '../styles/TrendingRadar.css';

const PLATFORM_FILTERS = [
  { id: 'all', label: 'All Platforms', icon: '🌐' },
  { id: 'youtube', label: 'YouTube', icon: '▶️' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'facebook', label: 'Facebook', icon: '👥' },
  { id: 'linkedin', label: 'LinkedIn', icon: '🔗' },
  { id: 'twitter', label: 'X (Twitter)', icon: '𝕏' }
];

const CATEGORIES = [
  'all',
  'AI & Tech',
  'Business & Leadership',
  'Viral Reels',
  'Education & Science',
  'Creator Economy',
  'Productivity & Engineering',
  'Entertainment'
];

function formatCompact(num) {
  if (!num) return '0';
  const n = Number(num);
  if (isNaN(n)) return '0';
  if (n >= 1000000000) return (n / 1000000000).toFixed(2) + 'B';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toLocaleString();
}

/**
 * Helper to strictly sort and re-rank items sequentially 1..N
 */
function sortAndRankItems(list, currentSort = 'virality') {
  const sorted = [...list];
  if (currentSort === 'virality') {
    sorted.sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
  } else if (currentSort === 'dataset') {
    sorted.sort((a, b) => (a.rawIndex || 0) - (b.rawIndex || 0));
  } else if (currentSort === 'views') {
    sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else if (currentSort === 'likes') {
    sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  } else if (currentSort === 'comments') {
    sorted.sort((a, b) => (b.comments || 0) - (a.comments || 0));
  } else if (currentSort === 'shares') {
    sorted.sort((a, b) => (b.shares || 0) - (a.shares || 0));
  } else if (currentSort === 'recent') {
    sorted.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  }

  // Strictly re-assign sequential rank #1, #2, #3, ...
  return sorted.map((it, idx) => ({ ...it, rank: idx + 1 }));
}

export default function TrendingRadar({
  initialPlatform = 'all',
  onShowNotification
}) {
  const [platform, setPlatform] = useState(initialPlatform);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('virality');

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Sync initialPlatform prop if changed from Navbar
  useEffect(() => {
    if (initialPlatform) {
      setPlatform(initialPlatform);
    }
  }, [initialPlatform]);

  // Load trending data
  useEffect(() => {
    fetchTrending(items.length > 0);
  }, [platform, category, search, sortBy]);

  // Load telemetry summary
  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await api.getTrendingSummary();
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (err) {
      console.warn('Could not fetch trending summary:', err);
    }
  };

  const fetchTrending = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getTrending({
        platform,
        category,
        search,
        sortBy
      });
      const rawList = res.items || [];
      setItems(sortAndRankItems(rawList, sortBy));
    } catch (err) {
      console.error('Failed to load trending items:', err);
      if (onShowNotification) onShowNotification(`❌ Error loading trending: ${err.message}`);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Instant Optimistic Metrics Modulation with immediate re-sorting in order
  const handleModulateMetrics = async (itemId, updates) => {
    // 1. Instant optimistic update + immediate re-rank in order
    setItems((prev) => {
      const updatedList = prev.map((it) => {
        if (it.id !== itemId) return it;
        const nextViews = updates.viewsDelta !== undefined ? Math.max(0, (it.views || 0) + updates.viewsDelta) : (updates.views !== undefined ? updates.views : it.views);
        const nextLikes = updates.likesDelta !== undefined ? Math.max(0, (it.likes || 0) + updates.likesDelta) : (updates.likes !== undefined ? updates.likes : it.likes);
        const nextComments = updates.commentsDelta !== undefined ? Math.max(0, (it.comments || 0) + updates.commentsDelta) : (updates.comments !== undefined ? updates.comments : it.comments);
        const nextShares = updates.sharesDelta !== undefined ? Math.max(0, (it.shares || 0) + updates.sharesDelta) : (updates.shares !== undefined ? updates.shares : it.shares);

        const virality = nextViews + (nextLikes * 15) + (nextComments * 50) + (nextShares * 100);
        const engagementRate = (((nextLikes + nextComments + nextShares) / Math.max(nextViews, 1)) * 100).toFixed(2) + '%';

        return {
          ...it,
          views: nextViews,
          likes: nextLikes,
          comments: nextComments,
          shares: nextShares,
          viralityScore: virality,
          engagementRate
        };
      });

      return sortAndRankItems(updatedList, sortBy);
    });

    const deltaInfo = updates.likesDelta ? `${updates.likesDelta > 0 ? '+' : ''}${updates.likesDelta} Likes` :
      updates.viewsDelta ? `${updates.viewsDelta > 0 ? '+' : ''}${updates.viewsDelta} Views` :
      updates.commentsDelta ? `${updates.commentsDelta > 0 ? '+' : ''}${updates.commentsDelta} Comments` :
      updates.sharesDelta ? `${updates.sharesDelta > 0 ? '+' : ''}${updates.sharesDelta} Shares` : 'metrics';

    if (onShowNotification) {
      onShowNotification(`⚡ ${deltaInfo} updated! Persisted to dataset file.`);
    }

    // 2. Background server sync & dataset persistence
    try {
      const res = await api.updateTrendingMetrics(itemId, updates);
      if (res.item) {
        setItems((prev) => {
          const replaced = prev.map((it) => (it.id === itemId ? res.item : it));
          return sortAndRankItems(replaced, sortBy);
        });
      }
      fetchSummary();
    } catch (err) {
      console.error('Failed to sync metrics:', err);
      if (onShowNotification) onShowNotification(`❌ Sync error: ${err.message}`);
      fetchTrending(true);
    }
  };

  // Full Item Edit with re-ranking
  const handleUpdateItem = async (itemId, formUpdates) => {
    try {
      const res = await api.updateTrendingItem(itemId, formUpdates);
      if (res.item) {
        setItems((prev) => {
          const replaced = prev.map((it) => (it.id === itemId ? res.item : it));
          return sortAndRankItems(replaced, sortBy);
        });
        if (onShowNotification) {
          onShowNotification(`💾 Changes saved directly to ${res.item.platform.toUpperCase()} dataset file!`);
        }
      }
      fetchSummary();
    } catch (err) {
      console.error('Update item failed:', err);
      if (onShowNotification) onShowNotification(`❌ Failed to update item: ${err.message}`);
      throw err;
    }
  };

  // Add New Trending Item with re-ranking
  const handleAddItem = async (itemData) => {
    try {
      const res = await api.createTrendingItem(itemData);
      if (res.item) {
        setItems((prev) => sortAndRankItems([res.item, ...prev], sortBy));
        if (onShowNotification) {
          onShowNotification(`🎉 New ${res.item.platform.toUpperCase()} trending video added and persisted to dataset!`);
        }
      }
      fetchSummary();
    } catch (err) {
      console.error('Add item failed:', err);
      if (onShowNotification) onShowNotification(`❌ Failed to create item: ${err.message}`);
      throw err;
    }
  };

  // Delete Item with clean sequential re-ranking
  const handleDeleteItem = async (itemId, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from the trending dataset?`)) {
      return;
    }

    setItems((prev) => sortAndRankItems(prev.filter((it) => it.id !== itemId), sortBy));
    if (onShowNotification) {
      onShowNotification('🗑️ Removed trending item from dataset JSON file.');
    }

    try {
      await api.deleteTrendingItem(itemId);
      fetchSummary();
    } catch (err) {
      console.error('Delete item failed:', err);
      if (onShowNotification) onShowNotification(`❌ Delete failed: ${err.message}`);
      fetchTrending(true);
    }
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setItems((prev) => sortAndRankItems(prev, newSort));
  };

  return (
    <section className="cm-trending-radar">
      {/* Top Telemetry Header */}
      <div className="cm-radar-header">
        <div className="cm-radar-title-wrap">
          <div className="cm-radar-tag">
            <span className="cm-radar-live-pulse" />
            <span>Strict Sequential Ranking Active (#1 to #{items.length || 50})</span>
          </div>
          <h2>Live Platform Trends & Viral Benchmarks</h2>
          <p>
            Ranked in strict order by viral algorithm momentum. Modulate views, likes, comments, or add new viral videos to see them dynamically climb the trending ranks.
          </p>
        </div>

        <button
          type="button"
          className="cm-btn-add-trending"
          onClick={() => setIsAddOpen(true)}
        >
          <span>➕</span>
          <span>Add Trending Video / Post</span>
        </button>
      </div>

      {/* Dataset Persistence Notice Banner */}
      <div className="cm-dataset-sync-banner">
        <div className="cm-sync-banner-left">
          <span className="cm-sync-icon">📁</span>
          <div>
            <strong>Live Scraper Dataset Synchronization Active</strong>
            <span className="cm-sync-detail">
              Edits permanently write to <code>data/useData.js</code> and underlying scraper files (<code>dataset_*.json</code>).
            </span>
          </div>
        </div>
        <div className="cm-sync-banner-right">
          <span className="cm-disk-badge">SSD DISK PERSISTED</span>
        </div>
      </div>

      {/* Telemetry Stats Bar */}
      {summary && (
        <div className="cm-radar-telemetry-grid">
          <div className="cm-telemetry-card">
            <span className="cm-telemetry-label">Total Trending Items</span>
            <div className="cm-telemetry-val-wrap">
              <span className="cm-telemetry-value">{summary.totalItems}</span>
              <span className="cm-telemetry-sub">Strict Order #1–#{summary.totalItems}</span>
            </div>
          </div>

          <div className="cm-telemetry-card highlight-cyan">
            <span className="cm-telemetry-label">Global Aggregate Views</span>
            <div className="cm-telemetry-val-wrap">
              <span className="cm-telemetry-value">{formatCompact(summary.totalViews)}</span>
              <span className="cm-telemetry-sub">Audience Reach</span>
            </div>
          </div>

          <div className="cm-telemetry-card highlight-green">
            <span className="cm-telemetry-label">Total Likes & Reactions</span>
            <div className="cm-telemetry-val-wrap">
              <span className="cm-telemetry-value">{formatCompact(summary.totalLikes)}</span>
              <span className="cm-telemetry-sub">Positive Sentiment</span>
            </div>
          </div>

          <div className="cm-telemetry-card highlight-purple">
            <span className="cm-telemetry-label">Virality Index Average</span>
            <div className="cm-telemetry-val-wrap">
              <span className="cm-telemetry-value">{formatCompact(summary.avgViralityScore)}</span>
              <span className="cm-telemetry-sub">Algorithm Velocity</span>
            </div>
          </div>
        </div>
      )}

      {/* Platform Filter Tabs */}
      <div className="cm-radar-controls-bar">
        <div className="cm-plat-tabs">
          {PLATFORM_FILTERS.map((p) => {
            const count = summary?.platformCounts ? (p.id === 'all' ? summary.totalItems : summary.platformCounts[p.id] || 0) : null;
            const isActive = platform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`cm-plat-tab ${isActive ? 'active' : ''}`}
                onClick={() => setPlatform(p.id)}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
                {count !== null && <span className="cm-plat-count-badge">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Filters: Search, Category, Sort */}
      <div className="cm-radar-subfilters">
        <div className="cm-search-wrap">
          <span className="cm-search-icon">🔍</span>
          <input
            type="text"
            className="cm-radar-search-input"
            placeholder="Search trending titles, authors, keywords (#AI, #Robotics)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="cm-clear-search" onClick={() => setSearch('')}>×</button>
          )}
        </div>

        <div className="cm-filter-dropdowns">
          <div className="cm-select-group">
            <label>Category:</label>
            <select
              className="cm-radar-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          <div className="cm-select-group">
            <label>Order By:</label>
            <select
              className="cm-radar-select"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="virality">🔥 Trending Rank (Virality #1 to #N)</option>
              <option value="dataset">📋 Scraper Dataset Original Order</option>
              <option value="views">👁️ Most Views (Highest to Lowest)</option>
              <option value="likes">❤️ Most Likes (Highest to Lowest)</option>
              <option value="comments">💬 Most Comments (Most Discussed)</option>
              <option value="shares">🔄 Most Shares (Most Distributed)</option>
              <option value="recent">⏱️ Newest Published</option>
            </select>
          </div>

          <button
            type="button"
            className="cm-btn-refresh-radar"
            onClick={() => fetchTrending(false)}
            title="Reload latest dataset from disk"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Grid of Trending Cards in Strict Order */}
      {loading ? (
        <div className="cm-radar-loading">
          <div className="cm-radar-spinner" />
          <p>Scanning platform trending feeds & computing virality algorithms...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="cm-radar-empty">
          <span className="cm-empty-icon">🔍</span>
          <h4>No trending posts match your filter</h4>
          <p>Try clearing your search query or switch platform tabs above.</p>
          <button
            type="button"
            className="cm-btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={() => {
              setPlatform('all');
              setCategory('all');
              setSearch('');
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="cm-trending-grid">
          {items.map((item, idx) => (
            <TrendingCard
              key={item.id}
              item={item}
              index={idx}
              onModulateMetrics={handleModulateMetrics}
              onOpenEditModal={(it) => setEditingItem(it)}
              onDeleteItem={handleDeleteItem}
            />
          ))}
        </div>
      )}

      {/* Add Trending Modal */}
      <AddTrendingModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddItem}
        defaultPlatform={platform}
      />

      {/* Edit Trending Modal */}
      <EditTrendingModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onUpdate={handleUpdateItem}
      />
    </section>
  );
}
