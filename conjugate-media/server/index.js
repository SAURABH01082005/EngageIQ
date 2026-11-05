/**
 * Conjugate Media - Independent Social Media Simulation Server
 * 
 * Port: 5002
 * Purpose: Acts as the dedicated external social media control plane,
 * simulating Instagram, Facebook, X (Twitter), LinkedIn, and YouTube APIs with full
 * post creation, interaction modulation, subscriber control, and dynamic streaming.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const platformRoutes = require('./routes/platformRoutes');
const postRoutes = require('./routes/postRoutes');
const feedRoutes = require('./routes/feedRoutes');
const userRoutes = require('./routes/userRoutes');
const trendingRoutes = require('./routes/trendingRoutes');

const app = express();
const PORT = process.env.PORT || process.env.CONJUGATE_PORT || 5002;

app.use(cors());
app.use(express.json());

// Mount Conjugate Media API routes
app.use('/api', platformRoutes);
app.use('/api', postRoutes);
app.use('/api', feedRoutes);
app.use('/api', userRoutes);
app.use('/api', trendingRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Conjugate Media Server',
    port: PORT,
    platformsSupported: ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube'],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Conjugate Media Server running on http://localhost:${PORT}`);
  console.log(`📱 Simulating: Instagram, Facebook, X (Twitter), LinkedIn, YouTube`);
  console.log(`🔥 Trending Radar & Dataset Control Active`);
  console.log(`====================================================`);
});

module.exports = app;
