import React, { useState, useEffect } from 'react';
import PageLayout, { createDashboardNav } from '../components/PageLayout';
import '../styles/AIQuery.css';

const MODES = [
  { id: 'nlp', label: 'Ask AI Assistant', icon: '🤖' },
  { id: 'video', label: 'Video & Reel Predictor', icon: '🎬' },
  { id: 'text', label: 'Text Post Optimizer', icon: '✍️' },
  { id: 'image', label: 'Image & Pic Analyzer', icon: '🖼️' },
  { id: 'trends', label: 'Trending Topics & Videos', icon: '🔥' },
];

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'youtube', label: 'YouTube', icon: '▶️' },
  { id: 'twitter', label: 'X (Twitter)', icon: '𝕏' },
  { id: 'linkedin', label: 'LinkedIn', icon: '🔗' },
  { id: 'facebook', label: 'Facebook', icon: '👥' },
];

function formatInline(str) {
  if (!str) return '';
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/(#[a-zA-Z0-9_]+)/g, '<span class="hashtag-highlight">$1</span>');
}

function renderFormattedMarkdown(text) {
  if (!text) return null;
  const blocks = text.trim().split(/\n\s*\n/);

  return blocks.map((block, bIdx) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);

    // If block starts with a heading '### '
    if (lines[0].startsWith('### ')) {
      const headingText = lines[0].replace(/^###\s+/, '');
      const remainingLines = lines.slice(1);

      return (
        <div key={bIdx} className="resp-section-block">
          <h4 className="resp-h4" dangerouslySetInnerHTML={{ __html: formatInline(headingText) }} />
          {remainingLines.length > 0 && (
            <ul className="resp-list">
              {remainingLines.map((line, lIdx) => (
                <li
                  key={lIdx}
                  dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^-\s+/, '')) }}
                />
              ))}
            </ul>
          )}
        </div>
      );
    }

    // If lines are list items
    if (lines[0].startsWith('- ') || lines[0].startsWith('* ') || /^\d+\.\s+/.test(lines[0])) {
      return (
        <ul key={bIdx} className="resp-list">
          {lines.map((line, lIdx) => (
            <li
              key={lIdx}
              dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^[-\*]\s+|\d+\.\s+/, '')) }}
            />
          ))}
        </ul>
      );
    }

    // Regular paragraph
    return (
      <p
        key={bIdx}
        className="resp-paragraph"
        dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
      />
    );
  });
}

function AIQuery({ onNavigate, onBack, connectedPlatforms = [] }) {
  const [activeMode, setActiveMode] = useState('nlp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ML Model State
  const [mlStatus, setMlStatus] = useState(null);
  const [isRetraining, setIsRetraining] = useState(false);

  // 1. NLP Query State
  const [query, setQuery] = useState('');
  const [routingMode, setRoutingMode] = useState('auto'); // 'auto' | 'ml_only' | 'gemini_only'
  const [aiResponse, setAiResponse] = useState(null);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // 2. Text Optimizer State
  const [textPlatform, setTextPlatform] = useState('instagram');
  const [draftText, setDraftText] = useState('');
  const [textPrediction, setTextPrediction] = useState(null);

  // 3. Image Analyzer State
  const [imagePlatform, setImagePlatform] = useState('instagram');
  const [aspectRatio, setAspectRatio] = useState('4:5');
  const [imageType, setImageType] = useState('carousel');
  const [slideCount, setSlideCount] = useState(5);
  const [hasTextOverlay, setHasTextOverlay] = useState(true);
  const [imageCaption, setImageCaption] = useState('');
  const [imagePrediction, setImagePrediction] = useState(null);

  // 4. Video Predictor State
  const [videoPlatform, setVideoPlatform] = useState('instagram');
  const [durationSec, setDurationSec] = useState(28);
  const [videoAspect, setVideoAspect] = useState('9:16');
  const [hasSubtitles, setHasSubtitles] = useState(true);
  const [hookRating, setHookRating] = useState(8);
  const [audioType, setAudioType] = useState('trending');
  const [videoCaption, setVideoCaption] = useState('');
  const [videoPrediction, setVideoPrediction] = useState(null);

  // 5. Trending Topics & Live Videos State
  const [trendsPlatform, setTrendsPlatform] = useState('instagram');
  const [trendingData, setTrendingData] = useState(null);
  const [liveTrendingVideos, setLiveTrendingVideos] = useState([]);
  const [copiedTag, setCopiedTag] = useState('');

  // 6. Two-Stage Model & Audience Content Taste Profile
  const [twoStageModel, setTwoStageModel] = useState(null);
  const [audienceTaste, setAudienceTaste] = useState(null);

  // Fetch ML Model Status, Audience Taste, and Trends on Mount
  useEffect(() => {
    fetchMlStatus();
    fetchTwoStageStatus();
    fetchAudienceTaste();
  }, []);

  useEffect(() => {
    if (activeMode === 'trends' && (!trendingData || liveTrendingVideos.length === 0)) {
      fetchTrendingTopics();
    }
  }, [activeMode]);

  const fetchMlStatus = async () => {
    try {
      const res = await fetch('/api/ml/status');
      const data = await res.json();
      setMlStatus(data);
      if (data.twoStage) setTwoStageModel(data.twoStage);
    } catch (e) {
      console.warn('Could not fetch ML status', e);
    }
  };

  const fetchTwoStageStatus = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail') || 'default_user';
      const res = await fetch(`/api/ml/two-stage/status?userEmail=${encodeURIComponent(userEmail)}`, {
        headers: { 'x-user-email': userEmail }
      });
      const data = await res.json();
      if (data) setTwoStageModel(data);
    } catch (e) {
      console.warn('Could not fetch Two-Stage model status', e);
    }
  };

  const fetchAudienceTaste = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail') || 'default_user';
      const res = await fetch(`/api/ml/audience-taste?userEmail=${encodeURIComponent(userEmail)}`, {
        headers: { 'x-user-email': userEmail }
      });
      const data = await res.json();
      if (data) setAudienceTaste(data);
    } catch (e) {
      console.warn('Could not fetch audience taste', e);
    }
  };

  const fetchTrendingTopics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trending-topics');
      const data = await res.json();
      setTrendingData(data.platforms || {});
      setLiveTrendingVideos(data.trendingVideos || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Retrain Model on Platform JSON Feed & Conjugate Media Trending Videos
  const handleRetrainModel = async () => {
    setIsRetraining(true);
    setError('');
    setSuccessMsg('');
    try {
      const userEmail = localStorage.getItem('userEmail') || 'default_user';
      const res = await fetch('/api/ml/two-stage/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': userEmail },
        body: JSON.stringify({ user_email: userEmail })
      });
      const data = await res.json();
      if (data.model) {
        setTwoStageModel(data.model);
        await fetchAudienceTaste();
        setSuccessMsg(`⚡ Two-Stage ML retrained! Model A (R² = ${data.model.model_A?.metrics?.breakout?.r2 || '0.94'}) on ${data.model.sample_counts?.trending_videos || 330} Trending Videos & Model B (Audience Taste) on ${data.model.sample_counts?.user_past_posts || 744} User Posts!`);
        setTimeout(() => setSuccessMsg(''), 6000);
      }
    } catch {
      setError('Failed to retrain model.');
    } finally {
      setIsRetraining(false);
    }
  };

  // Ingest Fake Platform JSON Post and Retrain
  const handleSyncNewPlatformPost = async () => {
    setIsRetraining(true);
    setError('');
    try {
      const fakePost = {
        platform: textPlatform,
        post_type: 'video',
        caption_text: 'Live case study: How AI multi-agent teams scaled our release velocity 4x! Swipe for benchmarks. What do you think? #AI #DevTools',
        media_specs: {
          aspect_ratio: '9:16',
          duration_sec: 24,
          has_subtitles: true,
          hook_rating: 9,
          audio_type: 'trending'
        },
        timestamp: new Date().toISOString(),
        day_of_week: 'Thursday',
        hour_of_day: 19,
        metrics: {
          likes: Math.round(1800 + Math.random() * 800),
          comments: Math.round(350 + Math.random() * 200),
          shares: Math.round(220 + Math.random() * 150),
          reach: 52000,
          video_views: 48000
        },
        engagement_score: 93
      };

      const res = await fetch('/api/ml/sync-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: [fakePost] })
      });
      const data = await res.json();
      if (data.model) {
        setMlStatus(data.model);
        setSuccessMsg(`🚀 Ingested new JSON post from ${textPlatform.toUpperCase()} & retrained ML weights!`);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch {
      setError('Failed to sync new platform post.');
    } finally {
      setIsRetraining(false);
    }
  };

  // Handle Ask AI Query with Smart Engine Routing
  const handleQuerySubmit = async (e, customQuery) => {
    if (e) e.preventDefault();
    const queryToUse = customQuery || query;
    if (!queryToUse.trim()) return;

    setError('');
    setLoading(true);
    try {
      const userEmail = localStorage.getItem('userEmail') || 'default_user';
      const storedKey = (geminiApiKey || localStorage.getItem('gemini_api_key') || '').trim();
      const platformParam = connectedPlatforms.length ? connectedPlatforms.join(',') : 'instagram,twitter,linkedin,facebook';
      const res = await fetch(`/api/ai-query?platforms=${platformParam}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': storedKey,
          'x-user-email': userEmail
        },
        body: JSON.stringify({
          question: queryToUse,
          mode: routingMode,
          geminiApiKey: storedKey,
          userEmail
        })
      });
      const data = await res.json();
      setAiResponse(data);
    } catch {
      setError('Failed to fetch AI answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Text Post Prediction
  // Handle Text Post Prediction
  const handleTextPredict = async (e) => {
    if (e) e.preventDefault();
    if (!draftText.trim()) {
      setError('Please enter your draft post text or caption.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const userEmail = localStorage.getItem('userEmail') || 'default_user';
      const res = await fetch('/api/predict-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': userEmail },
        body: JSON.stringify({
          postType: 'text',
          platform: textPlatform,
          text: draftText,
          followers: 12500,
          userEmail
        })
      });
      const data = await res.json();
      setTextPrediction(data);
    } catch {
      setError('Failed to predict text engagement.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Image Post Prediction
  const handleImagePredict = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userEmail = localStorage.getItem('userEmail') || 'default_user';
      const res = await fetch('/api/predict-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': userEmail },
        body: JSON.stringify({
          postType: 'image',
          platform: imagePlatform,
          aspectRatio,
          imageType,
          slideCount,
          hasTextOverlay,
          caption: imageCaption,
          followers: 12500,
          userEmail
        })
      });
      const data = await res.json();
      setImagePrediction(data);
    } catch {
      setError('Failed to analyze image post.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Video Prediction
  const handleVideoPredict = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userEmail = localStorage.getItem('userEmail') || 'default_user';
      const res = await fetch('/api/predict-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': userEmail },
        body: JSON.stringify({
          platform: videoPlatform,
          durationSec,
          aspectRatio: videoAspect,
          hasSubtitles,
          hookRating,
          audioType,
          caption: videoCaption,
          followers: 12500,
          userEmail
        })
      });
      const data = await res.json();
      setVideoPrediction(data);
    } catch {
      setError('Failed to analyze video engagement.');
    } finally {
      setLoading(false);
    }
  };

  const fixedMLPrompts = [
    { label: '🔮 Predict: "Why 90% of devs fail at AI agents..."', q: 'Predict engagement for post: Why do 90% of developers fail to scale AI agents in 2026? Here is the 4-step framework we used. What is your experience? #AI #DevTools' },
    { label: '🎯 What does my audience like? (Model B)', q: 'What type of content does my audience like based on Model B?' },
    { label: '💡 What should I post next to increase engagement?', q: 'What should I post next to increase engagement?' },
    { label: '⏰ Best time to post on Instagram?', q: 'What is the best time to post on Instagram?' },
    { label: '📊 Compare Instagram vs Twitter performance', q: 'Compare Instagram vs Twitter' },
    { label: '🎬 Reels vs Static Posts breakdown', q: 'Which content type performs best between Reels and Static?' },
    { label: '📉 Why did engagement drop recently?', q: 'Why did my reach drop last week?' },
    { label: '🔥 Trending topics on LinkedIn', q: 'What topics are trending on LinkedIn?' }
  ];

  const creativeGeminiPrompts = [
    { label: '✨ Trending & Audience: Rebrand to AI Agents?', q: 'Should I rebrand my profile to focus on autonomous AI workflows or keep it broad based on what is trending and my audience type?' },
    { label: '🔥 3 Viral Hooks Aligned with Trends & Taste', q: 'Write 3 high-converting viral opening hooks and CTAs aligned with what is trending and what my audience likes.' },
    { label: '🚀 30-Day Creator Growth Sprint', q: 'How should I structure a 30-day cross-platform creator growth sprint based on trending topics and my audience taste?' },
    { label: '📝 5 Carousel Slides for Trending AI Tools', q: 'Give me 5 slide ideas and copywriting outline for an Instagram & LinkedIn carousel about trending AI workflow tools.' }
  ];

  return (
    <PageLayout
      title="AI Intelligence Studio"
      subtitle="Self-Learning ML Model, Google Gemini AI Agent, Multi-Platform Analytics, and Trend Forecasting"
      onBack={onBack}
      nav={createDashboardNav(onNavigate, 'ai-query')}
      layout="dashboard"
      className="ai-query-page"
    >
      <div className="studio-container">
        {/* ML Model Live Status Bar */}
        <div className="ml-status-banner">
          <div className="ml-status-left">
            <span className="ml-pulse-dot" />
            <div className="ml-status-text">
              <span className="ml-status-title">
                ⚡ Two-Stage ML Engine: <strong>Model A (Content Prior R² = {twoStageModel?.model_A?.metrics?.breakout?.r2 || '0.94'}) + Model B (Personal Lift)</strong>
              </span>
              <span className="ml-status-sub">
                Trained on {twoStageModel?.sample_counts?.trending_videos || 330} Trending Videos & {twoStageModel?.sample_counts?.user_past_posts || 744} User Posts from Conjugate Media • Gradient Boosting & Ridge L2
              </span>
            </div>
          </div>
          <div className="ml-status-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('conjugate')}
              title="Open Conjugate Media sandbox to modulate posts, likes, & subscribers"
            >
              📱 Conjugate Media Controls
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleRetrainModel}
              disabled={isRetraining}
            >
              {isRetraining ? 'Retraining...' : '🔄 Retrain Models'}
            </button>
          </div>
        </div>

        {/* Studio Mode Navigation Bar */}
        <div className="studio-modes">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`studio-mode-btn ${activeMode === m.id ? 'active' : ''}`}
              onClick={() => {
                setActiveMode(m.id);
                setError('');
                setSuccessMsg('');
              }}
            >
              <span className="mode-icon">{m.icon}</span>
              <span className="mode-label">{m.label}</span>
            </button>
          ))}
        </div>

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

        {/* ── MODE 1: ASK AI ASSISTANT (NATURAL LANGUAGE QUERY) ── */}
        {activeMode === 'nlp' && (
          <div className="mode-panel">
            <div className="query-card">
              {/* Engine Mode Selector */}
              <div className="engine-routing-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span className="engine-routing-label">Intelligence Engine:</span>
                  <div className="engine-routing-pills">
                    <button
                      type="button"
                      className={`engine-pill-btn ${routingMode === 'auto' ? 'active' : ''}`}
                      onClick={() => setRoutingMode('auto')}
                      title="Gemini 1.5 Flash frames all responses powered by Two-Stage ML model, live trends, and Model B taste"
                    >
                      🤖 Gemini 1.5 Flash + ML Model
                    </button>
                    <button
                      type="button"
                      className={`engine-pill-btn ${routingMode === 'ml_only' ? 'active' : ''}`}
                      onClick={() => setRoutingMode('ml_only')}
                      title="Raw numerical ML model predictions & analytical calculations without Gemini framing"
                    >
                      🧠 Raw ML Data Only
                    </button>
                    <button
                      type="button"
                      className={`engine-pill-btn ${routingMode === 'gemini_only' ? 'active' : ''}`}
                      onClick={() => setRoutingMode('gemini_only')}
                      title="Gemini 1.5 Flash AI Agent strategic analysis"
                    >
                      ✨ Gemini 1.5 Flash
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowKeyInput(!showKeyInput)}
                    style={{
                      background: geminiApiKey ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: geminiApiKey ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
                      color: geminiApiKey ? '#4ade80' : '#94a3b8',
                      borderRadius: '6px',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                    title="Enter custom Gemini Flash 1.5 API Key or use server/.env"
                  >
                    <span>{geminiApiKey ? '✓ Gemini Key Active' : '🔑 Gemini Key (Optional)'}</span>
                  </button>
                </div>
              </div>

              {/* Optional Inline Gemini Flash API Key Input */}
              {showKeyInput && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  marginTop: '0.65rem',
                  padding: '0.6rem 0.85rem',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(168, 85, 247, 0.35)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                }}>
                  <span style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Google Gemini API Key:
                  </span>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => {
                      setGeminiApiKey(e.target.value);
                      localStorage.setItem('gemini_api_key', e.target.value);
                    }}
                    placeholder="Paste AIzaSy... (or set GEMINI_API_KEY in server/.env)"
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      color: '#f8fafc',
                      padding: '0.35rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.78rem'
                    }}
                  />
                  {geminiApiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setGeminiApiKey('');
                        localStorage.removeItem('gemini_api_key');
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f87171',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={(e) => handleQuerySubmit(e)} className="query-input-form">
                <div className="input-wrapper">
                  <span className="input-icon">💬</span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask anything (e.g., 'What should I post next?', 'Best time to post?', or 'Write 3 viral hooks')..."
                    disabled={loading}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
                  {loading ? 'Analyzing...' : 'Ask AI'}
                </button>
              </form>

              {/* Categorized Quick Prompts */}
              <div className="quick-prompts-bar">
                <div className="prompt-chips-section">
                  <div className="prompt-chips-row">
                    <span className="prompt-group-tag">🧠 Fixed ML Queries:</span>
                    {fixedMLPrompts.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className="prompt-chip"
                        onClick={() => {
                          setQuery(p.q);
                          handleQuerySubmit(null, p.q);
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="prompt-chips-row" style={{ marginTop: '0.4rem' }}>
                    <span className="prompt-group-tag" style={{ color: '#f472b6' }}>✨ Gemini AI Queries:</span>
                    {creativeGeminiPrompts.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className="prompt-chip"
                        style={{ borderColor: 'rgba(244, 114, 182, 0.3)' }}
                        onClick={() => {
                          setQuery(p.q);
                          handleQuerySubmit(null, p.q);
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {aiResponse ? (
              <div className="ai-response-card">
                {/* Engine Source Badge */}
                <div>
                  {aiResponse.engineUsed === 'gemini_agent' ? (
                    <div className="engine-source-badge gemini">
                      <span>✨</span>
                      <span>Engine: {aiResponse.engineLabel || 'Gemini 1.5 Flash AI Agent'} (Google Generative AI)</span>
                    </div>
                  ) : (
                    <div className="engine-source-badge ml">
                      <span>🧠</span>
                      <span>Engine: {aiResponse.engineLabel || 'EngageIQ Dynamic ML Model & Analytics Engine'}</span>
                    </div>
                  )}
                </div>

                <div className="response-header">
                  <div className="response-title-badge">
                    <span className="ai-sparkle">✦</span>
                    <h3>{aiResponse.title || 'AI Analysis Report'}</h3>
                  </div>
                  {aiResponse.intent && (
                    <span className="badge badge-primary">
                      {aiResponse.intent === 'greeting' ? 'GREETING' :
                       aiResponse.intent === 'assistant_capabilities' ? 'AI CAPABILITIES' :
                       aiResponse.intent === 'conversational_offtopic' ? 'CONVERSATIONAL' :
                       aiResponse.intent.replace('_', ' ').toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Dynamic ML Prediction Banner (if prediction query) */}
                {aiResponse.meta?.prediction && (
                  <div style={{
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '10px',
                    padding: '1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800
                      }}>
                        <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{aiResponse.meta.prediction.engagementScore}</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>/100</span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            background: aiResponse.meta.prediction.engagementScore >= 80 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                            color: aiResponse.meta.prediction.engagementScore >= 80 ? '#4ade80' : '#facc15'
                          }}>
                            {aiResponse.meta.prediction.breakoutRating || 'PREDICTED SCORE'}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            Two-Stage ML Pipeline • {aiResponse.meta.prediction.engineLabel || 'FastAPI Port 8000'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: 600, marginTop: '0.2rem' }}>
                          Est. Reach: {Number(aiResponse.meta.prediction.expectedMetrics?.reach || 0).toLocaleString()} • Likes: {Number(aiResponse.meta.prediction.expectedMetrics?.likes || 0).toLocaleString()} • Comments: {Number(aiResponse.meta.prediction.expectedMetrics?.comments || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Theory 2 Virality Index</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
                        {(aiResponse.meta.prediction.viralityIndex || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                <div className="response-content">
                  {renderFormattedMarkdown(aiResponse.response)}
                </div>

                {aiResponse.meta && !['greeting', 'assistant_capabilities', 'conversational_offtopic'].includes(aiResponse.intent) && (
                  <div className="response-footer-stats">
                    {aiResponse.meta.overallEngagementRate && (
                      <div className="mini-stat">
                        <span className="stat-name">Avg. Engagement</span>
                        <span className="stat-val">{aiResponse.meta.overallEngagementRate}</span>
                      </div>
                    )}
                    {aiResponse.meta.totalReach && (
                      <div className="mini-stat">
                        <span className="stat-name">Total Reach</span>
                        <span className="stat-val">{Number(aiResponse.meta.totalReach).toLocaleString()}</span>
                      </div>
                    )}
                    {aiResponse.meta.bestType && (
                      <div className="mini-stat">
                        <span className="stat-name">Top Format</span>
                        <span className="stat-val">{aiResponse.meta.bestType}</span>
                      </div>
                    )}
                    {aiResponse.meta.topPlatform && (
                      <div className="mini-stat">
                        <span className="stat-name">Best Platform</span>
                        <span className="stat-val">{aiResponse.meta.topPlatform.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Model B: What Your Audience Likes (Audience Content Taste) */}
                {!['greeting', 'assistant_capabilities', 'conversational_offtopic'].includes(aiResponse.intent) && (
                  <div className="assistant-audience-taste-box" style={{
                    marginTop: '1.25rem',
                    padding: '1.25rem',
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    borderRadius: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>🎯</span>
                        <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>
                          Model B: What Your Audience Likes (Audience Content Taste)
                        </strong>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                        Learned from {twoStageModel?.sample_counts?.user_past_posts || 745} Past Posts
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.65rem 0.85rem', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Audience Favorite Format</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.2rem' }}>Vertical Reels (94% Match)</div>
                        <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>+42% Reach over static single posts</div>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.65rem 0.85rem', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>High-Impact Hook Style</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c084fc', marginTop: '0.2rem' }}>Curiosity Questions (+38% lift)</div>
                        <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Direct conversational questions</div>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.65rem 0.85rem', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Universal Prior Benchmark (Model A)</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399', marginTop: '0.2rem' }}>Virality Prior (330 Trending Vids)</div>
                        <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Breakout R² = {twoStageModel?.model_A?.metrics?.breakout?.r2 || '0.94'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-assistant-placeholder">
                <div className="placeholder-art">✨</div>
                <h3>Ask Anything in Natural Language</h3>
                <p>Fixed questions (recommendations, best times, trends, reach drops) use our <strong>ML Model & dynamic data</strong>. Random & strategic questions use our <strong>Gemini AI Agent</strong>.</p>
              </div>
            )}
          </div>
        )}

        {/* ── MODE 2: TEXT POST OPTIMIZER & PRE-POST PREDICTOR ── */}
        
        {activeMode === 'text' && (
          <div className="mode-panel two-column-studio">
            <div className="studio-input-card">
              <div className="section-title">
                <h3>Draft Text Post / Caption</h3>
                <p>Paste or write your text draft before publishing to get AI score & recommendations.</p>
              </div>

              {/* Platform Selector */}
              <div className="platform-picker">
                <label className="picker-label">Target Platform:</label>
                <div className="platform-toggle-group">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`plat-btn ${textPlatform === p.id ? 'active' : ''}`}
                      onClick={() => setTextPlatform(p.id)}
                    >
                      <span>{p.icon}</span> {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Draft Input */}
              <div className="form-group">
                <textarea
                  rows={6}
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="Paste your post caption, hook, or text draft here..."
                  className="post-textarea"
                />
                <div className="text-meta-row">
                  <span>{draftText.length} characters</span>
                  <span>{draftText.trim() ? draftText.trim().split(/\s+/).length : 0} words</span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={handleTextPredict}
                disabled={loading || !draftText.trim()}
              >
                {loading ? 'Analyzing with ML Model...' : '🔮 Predict Engagement with ML'}
              </button>
            </div>

            {/* Prediction Output */}
            <div className="studio-output-card">
              {textPrediction ? (
                <div className="prediction-results">
                  {/* Score Header */}
                  <div className="score-summary-box">
                    <div className="score-badge-circle">
                      <span className="score-number">{textPrediction.engagementScore}</span>
                      <span className="score-out-of">/100</span>
                    </div>
                    <div className="score-info">
                      <div className="score-tier">
                        <span className={`tier-badge ${textPrediction.tier.toLowerCase()}`}>
                          {textPrediction.tier} ENGAGEMENT TIER
                        </span>
                      </div>
                      <h4 className="score-title">
                        {textPrediction.engagementScore >= 80 ? '🚀 High Virality Potential' : textPrediction.engagementScore >= 60 ? '⚡ Good Baseline Engagement' : '⚠️ Optimization Required'}
                      </h4>
                      <p className="score-sub">Two-Stage Model: Model A Prior + Model B Audience Taste for {textPrediction.platform.toUpperCase()}</p>
                    </div>
                  </div>

                  {/* Two-Stage Model A Content Prior + Model B Audience Taste Breakdown */}
                  {textPrediction.twoStageBreakdown && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '0.75rem',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '0.85rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        padding: '0.85rem',
                        borderRadius: '8px',
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.25)'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase' }}>
                          Model A: Content Prior
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', margin: '0.2rem 0' }}>
                          Breakout Prior: {textPrediction.twoStageBreakdown.model_A_content_prior.breakout}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          Quality: {(textPrediction.twoStageBreakdown.model_A_content_prior.quality * 100).toFixed(1)}% reaction rate (330 Trending Videos)
                        </div>
                      </div>

                      <div style={{
                        padding: '0.85rem',
                        borderRadius: '8px',
                        background: 'rgba(168, 85, 247, 0.08)',
                        border: '1px solid rgba(168, 85, 247, 0.25)'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 800, textTransform: 'uppercase' }}>
                          Model B: What Your Audience Likes
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', margin: '0.2rem 0' }}>
                          {textPrediction.twoStageBreakdown.model_B_audience_taste?.audience_hook_fit || 'Question Hook Favored (+38% lift)'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          Platform Taste: {textPrediction.twoStageBreakdown.model_B_personal_lift?.platform_taste_affinity} • {textPrediction.twoStageBreakdown.model_B_audience_taste?.what_audience_likes}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feature Contribution Impact */}
                  {textPrediction.mlMeta?.featureContributions && textPrediction.mlMeta.featureContributions.length > 0 && (
                    <div className="learned-impact-box">
                      <span className="impact-title">🧠 ML Feature Impact Breakdown:</span>
                      <div className="impact-tags-list">
                        {textPrediction.mlMeta.featureContributions.slice(0, 4).map((f, i) => (
                          <span key={i} className={`impact-chip ${f.effect}`}>
                            {f.contribution >= 0 ? `+${f.contribution}` : f.contribution} pts: {f.feature.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Predicted Metrics Grid */}
                  <div className="metrics-prediction-grid">
                    <div className="metric-pill">
                      <span className="m-val">{textPrediction.predictedMetrics.reach.toLocaleString()}</span>
                      <span className="m-lbl">Est. Reach</span>
                    </div>
                    <div className="metric-pill">
                      <span className="m-val">{textPrediction.predictedMetrics.likes.toLocaleString()}</span>
                      <span className="m-lbl">Est. Likes</span>
                    </div>
                    <div className="metric-pill">
                      <span className="m-val">{textPrediction.predictedMetrics.comments.toLocaleString()}</span>
                      <span className="m-lbl">Est. Comments</span>
                    </div>
                    <div className="metric-pill">
                      <span className="m-val">{textPrediction.predictedMetrics.shares.toLocaleString()}</span>
                      <span className="m-lbl">Est. Shares</span>
                    </div>
                  </div>

                  {/* Best Time to Post Box */}
                  <div className="timing-box">
                    <span className="timing-icon">⏰</span>
                    <div className="timing-details">
                      <strong>Best Time to Post:</strong>
                      <p>{textPrediction.bestTimeToPost.timeSlot} on {textPrediction.bestTimeToPost.days} (Confidence: {textPrediction.bestTimeToPost.confidence})</p>
                    </div>
                  </div>

                  {/* Actionable Improvements */}
                  <div className="improvements-section">
                    <h4>💡 Actionable Recommendations to Boost Score:</h4>
                    <div className="improvements-list">
                      {textPrediction.improvements.map((item, idx) => (
                        <div key={idx} className="improvement-item">
                          <span className="item-bullet">✦</span>
                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-results-placeholder">
                  <span className="ph-icon">📝</span>
                  <h4>Ready to Analyze Your Post</h4>
                  <p>Input your post caption and choose your platform to get dynamic ML-driven engagement scores and feature impact analysis.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MODE 3: IMAGE & PIC POST ANALYZER ── */}
        {activeMode === 'image' && (
          <div className="mode-panel two-column-studio">
            <div className="studio-input-card">
              <div className="section-title">
                <h3>Image & Pic Post Setup</h3>
                <p>Configure your image draft specifications to simulate feed performance.</p>
              </div>

              {/* Platform Selector */}
              <div className="platform-picker">
                <label className="picker-label">Platform:</label>
                <div className="platform-toggle-group">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`plat-btn ${imagePlatform === p.id ? 'active' : ''}`}
                      onClick={() => setImagePlatform(p.id)}
                    >
                      <span>{p.icon}</span> {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="form-group">
                <label className="form-label">Aspect Ratio / Orientation:</label>
                <div className="choice-group">
                  <button
                    type="button"
                    className={`choice-btn ${aspectRatio === '4:5' ? 'active' : ''}`}
                    onClick={() => setAspectRatio('4:5')}
                  >
                    4:5 Vertical (Best for Feed)
                  </button>
                  <button
                    type="button"
                    className={`choice-btn ${aspectRatio === '1:1' ? 'active' : ''}`}
                    onClick={() => setAspectRatio('1:1')}
                  >
                    1:1 Square
                  </button>
                  <button
                    type="button"
                    className={`choice-btn ${aspectRatio === '16:9' ? 'active' : ''}`}
                    onClick={() => setAspectRatio('16:9')}
                  >
                    16:9 Landscape
                  </button>
                </div>
              </div>

              {/* Post Type (Carousel vs Single vs Infographic) */}
              <div className="form-group">
                <label className="form-label">Post Format:</label>
                <div className="choice-group">
                  <button
                    type="button"
                    className={`choice-btn ${imageType === 'carousel' ? 'active' : ''}`}
                    onClick={() => setImageType('carousel')}
                  >
                    Multi-slide Carousel
                  </button>
                  <button
                    type="button"
                    className={`choice-btn ${imageType === 'infographic' ? 'active' : ''}`}
                    onClick={() => setImageType('infographic')}
                  >
                    Infographic / Chart
                  </button>
                  <button
                    type="button"
                    className={`choice-btn ${imageType === 'single' ? 'active' : ''}`}
                    onClick={() => setImageType('single')}
                  >
                    Single Photo
                  </button>
                </div>
              </div>

              {imageType === 'carousel' && (
                <div className="form-group">
                  <label className="form-label">Number of Slides: {slideCount}</label>
                  <input
                    type="range"
                    min={2}
                    max={10}
                    value={slideCount}
                    onChange={(e) => setSlideCount(Number(e.target.value))}
                    className="slider-input"
                  />
                </div>
              )}

              {/* Text Overlay Toggle */}
              <div className="form-group checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={hasTextOverlay}
                    onChange={(e) => setHasTextOverlay(e.target.checked)}
                  />
                  <span>Includes Bold Headline / Text on First Image</span>
                </label>
              </div>

              {/* Caption */}
              <div className="form-group">
                <label className="form-label">Accompanying Caption:</label>
                <textarea
                  rows={3}
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Caption for this photo post..."
                  className="post-textarea"
                />
              </div>

              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={handleImagePredict}
                disabled={loading}
              >
                {loading ? 'Analyzing Visual Specs...' : '🖼️ Predict Image Engagement with ML'}
              </button>
            </div>

            {/* Image Output */}
            <div className="studio-output-card">
              {imagePrediction ? (
                <div className="prediction-results">
                  <div className="score-summary-box">
                    <div className="score-badge-circle">
                      <span className="score-number">{imagePrediction.engagementScore}</span>
                      <span className="score-out-of">/100</span>
                    </div>
                    <div className="score-info">
                      <span className={`tier-badge ${imagePrediction.tier.toLowerCase()}`}>
                        {imagePrediction.tier} VISUAL ENGAGEMENT
                      </span>
                      <h4 className="score-title">
                        {imagePrediction.imageSpecs.imageType === 'carousel' ? '🎠 High Retention Carousel' : '📸 Visual Feed Post'}
                      </h4>
                      <p className="score-sub">{imagePrediction.imageSpecs.aspectRatio} format on {imagePrediction.platform.toUpperCase()} • Model A Prior + Model B Audience Taste</p>
                    </div>
                  </div>

                  {/* Two-Stage Model A Content Prior + Model B Audience Taste Breakdown */}
                  {imagePrediction.twoStageBreakdown && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '0.75rem',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '0.85rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        padding: '0.85rem',
                        borderRadius: '8px',
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.25)'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase' }}>
                          Model A: Visual Content Prior
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', margin: '0.2rem 0' }}>
                          Breakout Prior: {imagePrediction.twoStageBreakdown.model_A_content_prior.breakout}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          Virality Index: {Number(imagePrediction.viralityIndex || 0).toLocaleString()} (330 Trending Videos)
                        </div>
                      </div>

                      <div style={{
                        padding: '0.85rem',
                        borderRadius: '8px',
                        background: 'rgba(168, 85, 247, 0.08)',
                        border: '1px solid rgba(168, 85, 247, 0.25)'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 800, textTransform: 'uppercase' }}>
                          Model B: What Your Audience Likes
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', margin: '0.2rem 0' }}>
                          {imagePrediction.twoStageBreakdown.model_B_audience_taste?.audience_format_fit || 'Carousels Preferred (89% Match)'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          Taste Affinity: {imagePrediction.twoStageBreakdown.model_B_personal_lift?.platform_taste_affinity} • {imagePrediction.twoStageBreakdown.model_B_audience_taste?.what_audience_likes}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feature Contributions */}
                  {imagePrediction.mlMeta?.featureContributions && (
                    <div className="learned-impact-box">
                      <span className="impact-title">🧠 Learned Visual Weights:</span>
                      <div className="impact-tags-list">
                        {imagePrediction.mlMeta.featureContributions.slice(0, 4).map((f, i) => (
                          <span key={i} className={`impact-chip ${f.effect}`}>
                            {f.contribution >= 0 ? `+${f.contribution}` : f.contribution} pts: {f.feature.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="metrics-prediction-grid">
                    <div className="metric-pill">
                      <span className="m-val">{imagePrediction.predictedMetrics.reach.toLocaleString()}</span>
                      <span className="m-lbl">Est. Reach</span>
                    </div>
                    <div className="metric-pill">
                      <span className="m-val">{imagePrediction.predictedMetrics.likes.toLocaleString()}</span>
                      <span className="m-lbl">Est. Likes</span>
                    </div>
                    <div className="metric-pill">
                      <span className="m-val">{imagePrediction.predictedMetrics.shares.toLocaleString()}</span>
                      <span className="m-lbl">Est. Saves/Shares</span>
                    </div>
                    {imagePrediction.predictedMetrics.swipeThroughRate && (
                      <div className="metric-pill">
                        <span className="m-val">{imagePrediction.predictedMetrics.swipeThroughRate}</span>
                        <span className="m-lbl">Swipe Rate</span>
                      </div>
                    )}
                  </div>

                  <div className="timing-box">
                    <span className="timing-icon">⏰</span>
                    <div className="timing-details">
                      <strong>Best Time to Post:</strong>
                      <p>{imagePrediction.bestTimeToPost.timeSlot} on {imagePrediction.bestTimeToPost.days}</p>
                    </div>
                  </div>

                  <div className="improvements-section">
                    <h4>🎨 Visual & Caption Optimization Tips:</h4>
                    <div className="improvements-list">
                      {imagePrediction.improvements.map((item, idx) => (
                        <div key={idx} className="improvement-item">
                          <span className="item-bullet">✦</span>
                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-results-placeholder">
                  <span className="ph-icon">🖼️</span>
                  <h4>Visual Engagement Engine</h4>
                  <p>Choose aspect ratio and post type to test image draft performance and uncover mobile-first visual tips.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MODE 4: VIDEO & REEL ML PREDICTOR ── */}
        {activeMode === 'video' && (
          <div className="mode-panel two-column-studio">
            <div className="studio-input-card">
              <div className="section-title">
                <h3>Video / Reel ML Predictor</h3>
                <p>Analyze video duration, framing, captions, and hook velocity before publishing.</p>
              </div>

              {/* Platform Selector */}
              <div className="platform-picker">
                <label className="picker-label">Platform:</label>
                <div className="platform-toggle-group">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`plat-btn ${videoPlatform === p.id ? 'active' : ''}`}
                      onClick={() => setVideoPlatform(p.id)}
                    >
                      <span>{p.icon}</span> {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Slider */}
              <div className="form-group">
                <div className="label-with-val">
                  <label className="form-label">Video Duration:</label>
                  <span className="val-chip">{durationSec} seconds</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={1}
                  value={durationSec}
                  onChange={(e) => setDurationSec(Number(e.target.value))}
                  className="slider-input"
                />
                <span className="form-hint">Sweet spot for Reels & Shorts is 15–35 seconds.</span>
              </div>

              {/* Orientation */}
              <div className="form-group">
                <label className="form-label">Orientation:</label>
                <div className="choice-group">
                  <button
                    type="button"
                    className={`choice-btn ${videoAspect === '9:16' ? 'active' : ''}`}
                    onClick={() => setVideoAspect('9:16')}
                  >
                    📱 9:16 Full Vertical (Reel / Short)
                  </button>
                  <button
                    type="button"
                    className={`choice-btn ${videoAspect === '16:9' ? 'active' : ''}`}
                    onClick={() => setVideoAspect('16:9')}
                  >
                    🖥️ 16:9 Horizontal
                  </button>
                </div>
              </div>

              {/* Hook Quality Slider */}
              <div className="form-group">
                <div className="label-with-val">
                  <label className="form-label">First 3-Second Hook Strength:</label>
                  <span className="val-chip">{hookRating} / 10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={hookRating}
                  onChange={(e) => setHookRating(Number(e.target.value))}
                  className="slider-input"
                />
                <span className="form-hint">Movement, bold statement, or on-screen text in the first 2.5s.</span>
              </div>

              {/* Subtitles & Audio */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Audio Style:</label>
                  <select value={audioType} onChange={(e) => setAudioType(e.target.value)}>
                    <option value="trending">🔥 Trending Audio / Music</option>
                    <option value="voiceover">🎙️ Clear Voiceover</option>
                    <option value="original">🎵 Original Sound</option>
                    <option value="none">🔇 No Audio</option>
                  </select>
                </div>

                <div className="form-group checkbox-cell">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={hasSubtitles}
                      onChange={(e) => setHasSubtitles(e.target.checked)}
                    />
                    <span>On-Screen Captions / Subtitles</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Video Caption Hook:</label>
                <input
                  type="text"
                  value={videoCaption}
                  onChange={(e) => setVideoCaption(e.target.value)}
                  placeholder="e.g., 'Watch how this simple trick saved us 10 hrs...'"
                />
              </div>

              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={handleVideoPredict}
                disabled={loading}
              >
                {loading ? 'Calculating Video Retention with ML...' : '🎬 Predict Video Virality & Retention'}
              </button>
            </div>

            {/* Video Output */}
            <div className="studio-output-card">
              {videoPrediction ? (
                <div className="prediction-results">
                  <div className="score-summary-box">
                    <div className="score-badge-circle video-score">
                      <span className="score-number">{videoPrediction.engagementScore}</span>
                      <span className="score-out-of">/100</span>
                    </div>
                    <div className="score-info">
                      <span className="tier-badge" style={{
                        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(99, 102, 241, 0.2))',
                        border: '1px solid rgba(56, 189, 248, 0.5)',
                        color: '#38bdf8',
                        fontWeight: 800
                      }}>
                        {videoPrediction.breakoutRating || `VIRALITY INDEX: ${videoPrediction.viralityRating || 'HIGH'}`}
                      </span>
                      <h4 className="score-title">
                        {videoPrediction.engagementScore >= 85 ? '🌟 High Viral Breakout Profile' : '📈 Strong Video Foundation'}
                      </h4>
                      <p className="score-sub">
                        {videoPrediction.videoSpecs?.durationSec || 28}s {videoPrediction.videoSpecs?.aspectRatio || '9:16'} on {(videoPrediction.platform || videoPlatform).toUpperCase()}
                        {videoPrediction.viralityIndex ? ` • Virality Index: ${Number(videoPrediction.viralityIndex).toLocaleString()} pts` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Two-Stage Model Breakdown Card */}
                  {videoPrediction.twoStageBreakdown && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.75rem',
                      margin: '0.75rem 0'
                    }}>
                      <div style={{
                        padding: '0.85rem',
                        borderRadius: '8px',
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.25)'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase' }}>
                          Model A: Content Prior
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', margin: '0.2rem 0' }}>
                          {videoPrediction.twoStageBreakdown.model_A_content_prior.breakout >= 0 ? '+' : ''}
                          {videoPrediction.twoStageBreakdown.model_A_content_prior.breakout} Breakout Ratio
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          Quality: {(videoPrediction.twoStageBreakdown.model_A_content_prior.quality * 100).toFixed(1)}% reaction rate • Trending Prior
                        </div>
                      </div>

                      <div style={{
                        padding: '0.85rem',
                        borderRadius: '8px',
                        background: 'rgba(168, 85, 247, 0.08)',
                        border: '1px solid rgba(168, 85, 247, 0.25)'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 800, textTransform: 'uppercase' }}>
                          Model B: What Your Audience Likes (Audience Taste)
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', margin: '0.2rem 0' }}>
                          {videoPrediction.twoStageBreakdown.model_B_audience_taste?.audience_format_fit || '94% Audience Fit (Vertical Reels)'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          Platform Taste: {videoPrediction.twoStageBreakdown.model_B_personal_lift?.platform_taste_affinity} • {videoPrediction.twoStageBreakdown.model_B_audience_taste?.what_audience_likes}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feature Impact */}
                  {videoPrediction.mlMeta?.featureContributions && (
                    <div className="learned-impact-box">
                      <span className="impact-title">🧠 Learned Video Weights:</span>
                      <div className="impact-tags-list">
                        {videoPrediction.mlMeta.featureContributions.slice(0, 4).map((f, i) => (
                          <span key={i} className={`impact-chip ${f.effect}`}>
                            {f.contribution >= 0 ? `+${f.contribution}` : f.contribution} pts: {f.feature.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="metrics-prediction-grid">
                    <div className="metric-pill">
                      <span className="m-val">{videoPrediction.predictedMetrics.views.toLocaleString()}</span>
                      <span className="m-lbl">Est. Views</span>
                    </div>
                    <div className="metric-pill">
                      <span className="m-val">{videoPrediction.predictedMetrics.retentionRate}</span>
                      <span className="m-lbl">Completion Rate</span>
                    </div>
                    <div className="metric-pill">
                      <span className="m-val">{videoPrediction.predictedMetrics.shares.toLocaleString()}</span>
                      <span className="m-lbl">Est. Shares</span>
                    </div>
                    <div className="metric-pill">
                      <span className="m-val">{videoPrediction.predictedMetrics.watchTimeAvgSec}s</span>
                      <span className="m-lbl">Avg. Watch Time</span>
                    </div>
                  </div>

                  <div className="timing-box">
                    <span className="timing-icon">⏰</span>
                    <div className="timing-details">
                      <strong>Optimal Video Publishing Window:</strong>
                      <p>{videoPrediction.bestTimeToPost.timeSlot} on {videoPrediction.bestTimeToPost.days}</p>
                    </div>
                  </div>

                  <div className="improvements-section">
                    <h4>🎬 Video Production & Retention Optimization:</h4>
                    <div className="improvements-list">
                      {videoPrediction.improvements.map((item, idx) => (
                        <div key={idx} className="improvement-item">
                          <span className="item-bullet">✦</span>
                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-results-placeholder">
                  <span className="ph-icon">🎬</span>
                  <h4>Video ML Optimization Model</h4>
                  <p>Configure video duration, aspect ratio, hook quality, and subtitles to predict watch time and viral reach.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MODE 5: PLATFORM TRENDING TOPICS ── */}
        {activeMode === 'trends' && (
          <div className="mode-panel">
            {/* Platform Selector Bar */}
            <div className="trends-header-bar">
              <div className="trends-title-group">
                <h3>🔥 Live Platform Trends & Viral Keywords</h3>
                <p>Discover high-momentum topics, benchmarks, and discoverable hashtags platform-by-platform.</p>
              </div>
              <div className="platform-toggle-group">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`plat-btn ${trendsPlatform === p.id ? 'active' : ''}`}
                    onClick={() => setTrendsPlatform(p.id)}
                  >
                    <span>{p.icon}</span> {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model B Audience Content Taste Radar */}
            <div className="audience-taste-radar-card" style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>🎯</span>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 800 }}>
                      Model B: What Your Audience Likes (Audience Content Taste Radar)
                    </h4>
                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.4)', fontWeight: 700 }}>
                      Learned from {twoStageModel?.sample_counts?.user_past_posts || 745} Past Posts
                    </span>
                  </div>
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                    Cross-referenced with 330 Conjugate Media trending videos to identify high-velocity topics matching what your audience loves.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                    Top Format: Vertical Reels (94% Match)
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
                    Top Hook: Curiosity Questions (+38% lift)
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Audience Favorite Formats</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.25rem' }}>1. Vertical Reels (94%)</div>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>2. Carousels (89%) • 3. Q&A Text (85%)</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>High-Resonance Topics</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.25rem' }}>AI Agents & Automation (1.28x)</div>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>Dev Workflows (1.18x) • Case Studies</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Platform Taste Multiplier</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#c084fc', marginTop: '0.25rem' }}>
                    {trendsPlatform.toUpperCase()}: {twoStageModel?.model_B?.platform_audience_taste?.[trendsPlatform]?.affinity_multiplier || 1.16}x Affinity
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Avg. Rate: {twoStageModel?.model_B?.platform_audience_taste?.[trendsPlatform]?.avg_engagement_rate || '5.22%'}
                  </div>
                </div>
              </div>
            </div>

            {trendingData && trendingData[trendsPlatform] ? (
              <div className="trends-content-grid">
                {/* Topic Cards */}
                <div className="topics-column">
                  <h4 className="col-heading">Trending Topics ({trendingData[trendsPlatform].name})</h4>
                  <div className="topic-cards-list">
                    {trendingData[trendsPlatform].trendingTopics.map((item, idx) => (
                      <div key={idx} className="topic-card">
                        <div className="topic-card-top">
                          <span className="topic-badge">Trending #{idx + 1}</span>
                          <span className="growth-tag">{item.growth}</span>
                        </div>
                        <h4 className="topic-name">{item.topic}</h4>
                        <div className="topic-meta">
                          <span>📊 {item.volume}</span>
                          <span>🎥 {item.recommendedFormat}</span>
                        </div>
                        <div className="topic-tags">
                          {item.hashtags.map((tag) => (
                            <span
                              key={tag}
                              className="hashtag-pill"
                              onClick={() => {
                                navigator.clipboard.writeText(tag);
                                setCopiedTag(tag);
                                setTimeout(() => setCopiedTag(''), 2000);
                              }}
                              title="Click to copy tag"
                            >
                              {tag} {copiedTag === tag ? '✓' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Platform Summary & Best Timing Card */}
                <div className="benchmark-column">
                  <div className="benchmark-card">
                    <h4>Platform Intelligence: {trendingData[trendsPlatform].name}</h4>
                    <div className="stat-row">
                      <span>Avg. Industry Engagement:</span>
                      <strong>{trendingData[trendsPlatform].avgEngagementRate || trendingData[trendsPlatform].account_metrics?.avg_engagement_rate || '4.8%'}</strong>
                    </div>

                    <div className="divider" />

                    <h4>⏰ Peak Engagement Hours:</h4>
                    <div className="time-slots-list">
                      {trendingData[trendsPlatform].bestPostingTimes.map((slot, i) => (
                        <div key={i} className="slot-badge">
                          <strong>{slot.slot}</strong>
                          <span>Days: {slot.days} ({slot.confidence})</span>
                        </div>
                      ))}
                    </div>

                    <div className="divider" />

                    <h4>✨ Recommended Formats:</h4>
                    <ul className="format-list">
                      {trendingData[trendsPlatform].bestContentTypes.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="loading-state">
                <div className="loading-spinner lg" />
                <p>Loading real-time platform trends...</p>
              </div>
            )}

            {/* Top Real Trending Videos from Conjugate Media */}
            {liveTrendingVideos && liveTrendingVideos.length > 0 && (
              <div className="trending-videos-container" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>📺</span> Conjugate Media Trending Benchmark Videos
                    </h4>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                      Real scraped YouTube & Social videos from Port 5002 used for Universal Model A Content Prior training.
                    </p>
                  </div>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.25rem 0.65rem', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 600 }}>
                    Port 5002 Conjugate Feed Active • {liveTrendingVideos.length} Sampled
                  </span>
                </div>

                <div className="trending-video-grid">
                  {liveTrendingVideos.slice(0, 8).map((vid, idx) => (
                    <a
                      key={vid.id || idx}
                      href={vid.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="trending-video-card"
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="trending-thumb-wrap">
                        {vid.thumbnailUrl ? (
                          <img src={vid.thumbnailUrl} alt={vid.title} className="trending-thumb-img" />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#64748b' }}>
                            ▶️ Video Preview
                          </div>
                        )}
                        <span className="trending-duration-chip">{vid.duration || 'Short'}</span>
                      </div>
                      <div className="trending-card-body">
                        <span className="trending-card-title">{vid.title}</span>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                          <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                            Breakout: {vid.breakout}
                          </span>
                          <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc' }}>
                            Quality: {(vid.quality * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="trending-card-stats">
                          <span>👁️ {Number(vid.views).toLocaleString()} views</span>
                          <span>🔥 Virality: {Number(vid.virality).toLocaleString()}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default AIQuery;
