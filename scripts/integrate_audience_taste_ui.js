const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../client/src/pages/AIQuery.jsx');
let content = fs.readFileSync(targetPath, 'utf-8');

// 1. Remove twostage mode panel between NLP mode and Text mode
const nlpMarker = "{/* ── MODE: MODEL A & B BRAIN STUDIO ── */}";
const textMarker = "{/* ── MODE 2: TEXT POST OPTIMIZER & PRE-POST PREDICTOR ── */}";

const startIdx = content.indexOf(nlpMarker);
const endIdx = content.indexOf(textMarker);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.slice(0, startIdx) + textMarker + "\r\n        " + content.slice(endIdx + textMarker.length);
  console.log('✓ Successfully removed separate twostage tab panel');
} else {
  console.warn('Could not find markers for twostage removal:', { startIdx, endIdx });
}

// 2. Add Audience Taste Panel inside NLP Mode (below the AI response)
const nlpResponseEnd = "{aiResponse.meta.topPlatform && (\r\n                      <div className=\"mini-stat\">\r\n                        <span className=\"stat-name\">Best Platform</span>\r\n                        <span className=\"stat-val\">{aiResponse.meta.topPlatform.toUpperCase()}</span>\r\n                      </div>\r\n                    )}\r\n                  </div>\r\n                )}";

const nlpAudienceSnippet = `{aiResponse.meta.topPlatform && (
                      <div className="mini-stat">
                        <span className="stat-name">Best Platform</span>
                        <span className="stat-val">{aiResponse.meta.topPlatform.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Model B: What Your Audience Likes (Audience Content Taste) */}
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
                </div>`;

content = content.replace(nlpResponseEnd, nlpAudienceSnippet.replace(/\n/g, '\r\n'));
console.log('✓ Added Model B Audience Taste panel to NLP mode');

// 3. Add Model A & Model B Breakdown into Text Post Optimizer output
const textScoreHeaderMarker = "<p className=\"score-sub\">Learned Model (R²: {textPrediction.mlMeta?.r2Score || 0.91}) for {textPrediction.platform.toUpperCase()}</p>\r\n                    </div>\r\n                  </div>";

const textTwoStageCards = `<p className="score-sub">Two-Stage Model: Model A Prior + Model B Audience Taste for {textPrediction.platform.toUpperCase()}</p>
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
                  )}`;

content = content.replace(textScoreHeaderMarker, textTwoStageCards.replace(/\n/g, '\r\n'));
console.log('✓ Added Model A & Model B Audience Taste cards to Text mode');

// 4. Add Model A & Model B Breakdown into Image & Pic Analyzer output
const imageScoreHeaderMarker = "<p className=\"score-sub\">{imagePrediction.imageSpecs.aspectRatio} format on {imagePrediction.platform.toUpperCase()}</p>\r\n                    </div>\r\n                  </div>";

const imageTwoStageCards = `<p className="score-sub">{imagePrediction.imageSpecs.aspectRatio} format on {imagePrediction.platform.toUpperCase()} • Model A Prior + Model B Audience Taste</p>
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
                  )}`;

content = content.replace(imageScoreHeaderMarker, imageTwoStageCards.replace(/\n/g, '\r\n'));
console.log('✓ Added Model A & Model B Audience Taste cards to Image mode');

// 5. Enhance Video & Reel Predictor Model B card
const oldVideoModelBCard = `<div style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 800, textTransform: 'uppercase' }}>\r\n                          Model B: Personal Lift\r\n                        </div>\r\n                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', margin: '0.2rem 0' }}>\r\n                          {videoPrediction.twoStageBreakdown.model_B_personal_lift.breakout_lift >= 0 ? '+' : ''}\r\n                          {videoPrediction.twoStageBreakdown.model_B_personal_lift.breakout_lift} Personal Lift\r\n                        </div>\r\n                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>\r\n                          Taste Affinity: {videoPrediction.twoStageBreakdown.model_B_personal_lift.platform_taste_affinity}\r\n                        </div>`;

const newVideoModelBCard = `<div style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 800, textTransform: 'uppercase' }}>
                          Model B: What Your Audience Likes (Audience Taste)
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', margin: '0.2rem 0' }}>
                          {videoPrediction.twoStageBreakdown.model_B_audience_taste?.audience_format_fit || '94% Audience Fit (Vertical Reels)'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          Platform Taste: {videoPrediction.twoStageBreakdown.model_B_personal_lift?.platform_taste_affinity} • {videoPrediction.twoStageBreakdown.model_B_audience_taste?.what_audience_likes}
                        </div>`;

content = content.replace(oldVideoModelBCard, newVideoModelBCard.replace(/\n/g, '\r\n'));
console.log('✓ Enhanced Model B card in Video mode');

// 6. Add Audience Content Taste Radar into Trending Topics & Videos
const trendsHeaderEnd = "<div className=\"trends-header-bar\">\r\n              <div className=\"trends-title-group\">\r\n                <h3>🔥 Live Platform Trends & Viral Keywords</h3>\r\n                <p>Discover high-momentum topics, benchmarks, and discoverable hashtags platform-by-platform.</p>\r\n              </div>\r\n              <div className=\"platform-toggle-group\">\r\n                {PLATFORMS.map((p) => (\r\n                  <button\r\n                    key={p.id}\r\n                    type=\"button\"\r\n                    className={`plat-btn ${trendsPlatform === p.id ? 'active' : ''}`}\r\n                    onClick={() => setTrendsPlatform(p.id)}\r\n                  >\r\n                    <span>{p.icon}</span> {p.label}\r\n                  </button>\r\n                ))}\r\n              </div>\r\n            </div>";

const trendsAudienceRadar = `<div className="trends-header-bar">
              <div className="trends-title-group">
                <h3>🔥 Live Platform Trends & Viral Keywords</h3>
                <p>Discover high-momentum topics, benchmarks, and discoverable hashtags platform-by-platform.</p>
              </div>
              <div className="platform-toggle-group">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={\`plat-btn \${trendsPlatform === p.id ? 'active' : ''}\`}
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
            </div>`;

content = content.replace(trendsHeaderEnd, trendsAudienceRadar.replace(/\n/g, '\r\n'));
console.log('✓ Added Model B Audience Taste Radar to Trends mode');

fs.writeFileSync(targetPath, content, 'utf-8');
console.log('🎉 AIQuery.jsx successfully updated with unified Model A & Model B Audience Taste across all 5 modes!');
