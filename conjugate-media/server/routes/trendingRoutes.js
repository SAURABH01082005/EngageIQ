/**
 * Conjugate Media Server - Trending API Routes
 * 
 * Exposes full CRUD and real-time metric modulation for trending posts & videos
 * across YouTube, Instagram, Facebook, LinkedIn, and X/Twitter.
 * Any edit permanently updates the underlying scraper JSON dataset files on disk.
 */

const express = require('express');
const router = express.Router();
const trendingStore = require('../services/trendingStore');

/**
 * GET /api/trending
 * Fetch trending items with optional filters
 */
router.get('/trending', (req, res) => {
  try {
    const { platform, category, search, sortBy } = req.query;
    const items = trendingStore.getTrendingItems({ platform, category, search, sortBy });
    res.json({
      success: true,
      count: items.length,
      platform: platform || 'all',
      items
    });
  } catch (error) {
    console.error('[Trending API] Error fetching trending items:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch trending items.' });
  }
});

/**
 * GET /api/trending/summary
 * Telemetry summary for top dashboard cards
 */
router.get('/trending/summary', (req, res) => {
  try {
    const summary = trendingStore.getTrendingSummary();
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('[Trending API] Error fetching summary:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch trending summary.' });
  }
});

/**
 * GET /api/trending/:id
 * Retrieve a specific trending item
 */
router.get('/trending/:id', (req, res) => {
  try {
    const { id } = req.params;
    const items = trendingStore.loadAllTrendingItems();
    const item = items.find(it => it.id === id || it.rawId === id);
    if (!item) {
      return res.status(404).json({ error: `Trending item not found: ${id}` });
    }
    res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('[Trending API] Error retrieving item:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch trending item.' });
  }
});

/**
 * POST /api/trending
 * Add a new video / post to the platform trending dataset
 */
router.post('/trending', (req, res) => {
  try {
    const postData = req.body;
    if (!postData.title && !postData.caption) {
      return res.status(400).json({ error: 'Title or caption is required to add trending video.' });
    }

    const createdItem = trendingStore.addTrendingItem(postData);
    res.status(201).json({
      success: true,
      message: `Trending ${createdItem.platform.toUpperCase()} video created and persisted to dataset!`,
      item: createdItem
    });
  } catch (error) {
    console.error('[Trending API] Error creating trending item:', error);
    res.status(500).json({ error: error.message || 'Failed to create trending item.' });
  }
});

/**
 * PATCH /api/trending/:id/metrics
 * Instant metric modulation (+likes, +comments, +shares, +views)
 */
router.patch('/trending/:id/metrics', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedItem = trendingStore.updateTrendingMetrics(id, updates);
    res.json({
      success: true,
      message: 'Trending metrics updated and saved to dataset JSON file.',
      item: updatedItem
    });
  } catch (error) {
    console.error('[Trending API] Error modulating metrics:', error);
    res.status(500).json({ error: error.message || 'Failed to modulate metrics.' });
  }
});

/**
 * PUT /api/trending/:id
 * Full edit of a trending item (title, author, metrics, tags, etc.)
 */
router.put('/trending/:id', (req, res) => {
  try {
    const { id } = req.params;
    const formUpdates = req.body;
    const updatedItem = trendingStore.updateTrendingItem(id, formUpdates);
    res.json({
      success: true,
      message: 'Trending item edited and persisted to dataset JSON file.',
      item: updatedItem
    });
  } catch (error) {
    console.error('[Trending API] Error updating item:', error);
    res.status(500).json({ error: error.message || 'Failed to update trending item.' });
  }
});

/**
 * DELETE /api/trending/:id
 * Delete trending item from dataset
 */
router.delete('/trending/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = trendingStore.deleteTrendingItem(id);
    res.json({
      success: true,
      message: 'Trending item deleted from dataset JSON file.',
      ...result
    });
  } catch (error) {
    console.error('[Trending API] Error deleting trending item:', error);
    res.status(500).json({ error: error.message || 'Failed to delete trending item.' });
  }
});

module.exports = router;

