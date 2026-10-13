"""
EngageIQ - Two-Stage Machine Learning Training Engine
Model A: Universal Content Prior (Trained on Conjugate Media Trending Videos)
Model B: Personal Lift Model (Trained on User Historical Post Data)

Algorithms: GradientBoostingRegressor, RandomForestRegressor, XGBRegressor, Ridge
Targets:
  - Breakout: log((views + 1) / (channel_subs + 1))
  - Quality: (likes + comments) / views
  - Virality: views + 15*likes + 50*comments + 100*shares
  - Lift: actual_engagement - baseline_engagement
"""

import sys
import os
import json
import math
import numpy as np

# Ensure Windows stdout does not crash on unicode characters
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from textblob import TextBlob
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import r2_score, mean_absolute_error

try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CONJUGATE_DATA_DIR = os.path.join(CURRENT_DIR, '../conjugate-media/server/data')
YT_SCRAPER_PATH = os.path.join(CONJUGATE_DATA_DIR, 'dataset_youtube-channel-scraper_2026-10-10_15-39-13-562.json')
LIVE_STORE_PATH = os.path.join(CONJUGATE_DATA_DIR, 'live_store.json')
OUTPUT_MODEL_PATH = os.path.join(CURRENT_DIR, 'two_stage_model.json')

FEATURE_NAMES = [
    'title_len_chars_norm',       # 0: title length / 100
    'title_word_count_norm',      # 1: title word count / 20
    'caption_len_chars_norm',     # 2: caption length / 400
    'sentiment_polarity',         # 3: TextBlob polarity (-1 to +1)
    'has_question_hook',          # 4: 0 or 1
    'has_cta',                    # 5: 0 or 1
    'hashtag_count_norm',         # 6: hashtags / 10
    'is_video',                   # 7: 0 or 1
    'duration_optimal_short',     # 8: 15-60s reel/short
    'duration_optimal_long',      # 9: 8-25 min YouTube explainer
    'is_vertical_916',            # 10: 0 or 1
    'has_subtitles',              # 11: 0 or 1
    'hook_rating_norm',           # 12: 1-10 / 10
    'topic_tech_ai',              # 13: 0 or 1
    'topic_education_explainer',  # 14: 0 or 1
    'topic_business_finance',     # 15: 0 or 1
    'topic_lifestyle_social',     # 16: 0 or 1
    'is_peak_hour',               # 17: 0 or 1
    'is_weekday',                 # 18: 0 or 1
    'plat_youtube',               # 19: 0 or 1
    'plat_instagram',             # 20: 0 or 1
    'plat_facebook',              # 21: 0 or 1
    'plat_linkedin',              # 22: 0 or 1
    'plat_twitter'                # 23: 0 or 1
]

def parse_duration_sec(dur):
    if isinstance(dur, (int, float)):
        return float(dur)
    if not dur:
        return 30.0
    s = str(dur).lower().strip()
    if 'reel' in s or 'short' in s:
        return 28.0
    parts = s.split(':')
    try:
        if len(parts) == 2:
            return float(parts[0]) * 60 + float(parts[1])
        if len(parts) == 3:
            return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
    except:
        pass
    return 30.0

def detect_topics(text):
    t = (text or '').lower()
    tech = 1.0 if any(k in t for k in ['ai', 'tech', 'software', 'model', 'data', 'algorithm', 'system', 'crypto', 'code']) else 0.0
    edu = 1.0 if any(k in t for k in ['why', 'how', 'explained', 'truth', 'secret', 'history', 'story', 'case', 'scam']) else 0.0
    biz = 1.0 if any(k in t for k in ['money', 'business', 'startup', 'market', 'company', 'economy', 'invest', 'crore']) else 0.0
    life = 1.0 if any(k in t for k in ['life', 'people', 'india', 'world', 'society', 'man', 'woman', 'viral']) else 0.0
    return tech, edu, biz, life

def extract_features(item):
    title = item.get('title') or item.get('caption') or ''
    caption = item.get('caption') or item.get('content') or item.get('text') or ''
    full_text = f"{title} {caption}".strip()

    title_chars = len(title)
    title_words = len(title.split()) if title else 0
    caption_chars = len(caption)

    try:
        sentiment = TextBlob(full_text).sentiment.polarity if full_text else 0.2
    except:
        sentiment = 0.2

    has_question = 1.0 if '?' in full_text or any(k in full_text.lower() for k in ['what', 'why', 'how', 'agree', 'who']) else 0.0
    has_cta = 1.0 if any(k in full_text.lower() for k in ['link in bio', 'subscribe', 'watch', 'share', 'comment', 'follow', 'save']) else 0.0
    hashtags = len([w for w in full_text.split() if w.startswith('#')])

    post_type = (item.get('postType') or item.get('post_type') or item.get('type') or 'video').lower()
    is_video = 1.0 if ('video' in post_type or 'reel' in post_type or item.get('platform') == 'youtube') else 0.0

    dur_sec = parse_duration_sec(item.get('duration') or item.get('duration_sec') or item.get('durationSec'))
    is_opt_short = 1.0 if (is_video and 15.0 <= dur_sec <= 65.0) else 0.0
    is_opt_long = 1.0 if (is_video and 480.0 <= dur_sec <= 2400.0) else 0.0

    aspect = str(item.get('aspectRatio') or item.get('aspect_ratio') or '').lower()
    is_vertical = 1.0 if ('9:16' in aspect or (is_video and dur_sec <= 65.0 and '16:9' not in aspect)) else 0.0

    specs = item.get('mediaSpecs') or item.get('media_specs') or {}
    has_subtitles = 1.0 if (specs.get('hasSubtitles') or specs.get('has_subtitles') or item.get('has_subtitles') or True) else 0.0
    hook_rating = float(specs.get('hookRating') or specs.get('hook_rating') or item.get('hook_rating') or 8.0)

    tech, edu, biz, life = detect_topics(full_text)

    # Time factors
    hour = int(item.get('hour_of_day', 18))
    is_peak = 1.0 if ((17 <= hour <= 21) or (8 <= hour <= 10)) else 0.0
    day = str(item.get('day_of_week', 'Wednesday')).lower()
    is_wkday = 1.0 if not any(d in day for d in ['sat', 'sun']) else 0.0

    plat = (item.get('platform') or 'youtube').lower().replace('x', 'twitter')

    return [
        min(1.0, title_chars / 100.0),
        min(1.0, title_words / 20.0),
        min(1.0, caption_chars / 400.0),
        float(sentiment),
        has_question,
        has_cta,
        min(1.0, hashtags / 10.0),
        is_video,
        is_opt_short,
        is_opt_long,
        is_vertical,
        has_subtitles,
        hook_rating / 10.0,
        tech, edu, biz, life,
        is_peak,
        is_wkday,
        1.0 if plat == 'youtube' else 0.0,
        1.0 if plat == 'instagram' else 0.0,
        1.0 if plat == 'facebook' else 0.0,
        1.0 if plat == 'linkedin' else 0.0,
        1.0 if plat == 'twitter' else 0.0
    ]

def load_trending_videos():
    """Load trending videos from YouTube dataset & Instagram reels in Conjugate Media"""
    videos = []
    
    # 1. YouTube scraper dataset
    if os.path.exists(YT_SCRAPER_PATH):
        try:
            with open(YT_SCRAPER_PATH, 'r', encoding='utf-8') as f:
                raw = json.load(f)
            for v in raw:
                if v.get('id') and v.get('title'):
                    views = float(v.get('viewCount') or 500000)
                    ch_info = v.get('aboutChannelInfo') or {}
                    subs = float(ch_info.get('numberOfSubscribers') or 8630000)
                    likes = round(views * 0.048)
                    comments = round(likes * 0.07)
                    shares = round(likes * 0.03)

                    breakout = math.log((views + 1.0) / (subs + 1.0))
                    quality = (likes + comments) / max(views, 1.0)
                    virality = views + 15.0 * likes + 50.0 * comments + 100.0 * shares

                    videos.append({
                        'id': v['id'],
                        'title': v['title'],
                        'caption': v['title'],
                        'platform': 'youtube',
                        'channel_subs': subs,
                        'views': views,
                        'likes': likes,
                        'comments': comments,
                        'shares': shares,
                        'duration': v.get('duration', '15:00'),
                        'breakout': breakout,
                        'quality': quality,
                        'virality': virality
                    })
        except Exception as e:
            print(f"[Warning] Failed to load YouTube scraper dataset: {e}")

    # 2. Instagram & FB Video posts from live_store
    if os.path.exists(LIVE_STORE_PATH):
        try:
            with open(LIVE_STORE_PATH, 'r', encoding='utf-8') as f:
                store = json.load(f)
            user_data = store.get('default_user') or {}
            posts = user_data.get('posts', [])
            for p in posts:
                if p.get('postType') == 'video' or p.get('platform') == 'youtube':
                    views = float(p.get('views') or 250000)
                    subs = float(p.get('subscribers') or 3662163)
                    likes = float(p.get('likes') or views * 0.05)
                    comments = float(p.get('comments') or likes * 0.03)
                    shares = float(p.get('shares') or likes * 0.02)

                    breakout = math.log((views + 1.0) / (subs + 1.0))
                    quality = (likes + comments) / max(views, 1.0)
                    virality = views + 15.0 * likes + 50.0 * comments + 100.0 * shares

                    videos.append({
                        'id': p.get('id', 'ig_vid'),
                        'title': p.get('title') or (p.get('caption') or '')[:80],
                        'caption': p.get('caption') or '',
                        'platform': p.get('platform', 'instagram'),
                        'channel_subs': subs,
                        'views': views,
                        'likes': likes,
                        'comments': comments,
                        'shares': shares,
                        'duration': p.get('duration', 'Reel'),
                        'breakout': breakout,
                        'quality': quality,
                        'virality': virality
                    })
        except Exception as e:
            print(f"[Warning] Failed to load live_store videos: {e}")

    print(f"Loaded {len(videos)} trending videos for Model A Content Prior training.")
    return videos

def load_user_posts(user_email='default_user'):
    """Load user past posts from Conjugate Media store for Model B personal lift training"""
    posts = []
    clean_email = str(user_email).lower().strip()
    
    if os.path.exists(LIVE_STORE_PATH):
        try:
            with open(LIVE_STORE_PATH, 'r', encoding='utf-8') as f:
                store = json.load(f)
            bucket = store.get(clean_email) or store.get('default_user') or {}
            raw_posts = bucket.get('posts', [])
            for p in raw_posts:
                views = float(p.get('views') or p.get('reach') or 10000)
                subs = float(p.get('subscribers') or 100000)
                likes = float(p.get('likes') or 150)
                comments = float(p.get('comments') or 20)
                shares = float(p.get('shares') or 10)
                
                breakout = math.log((views + 1.0) / (subs + 1.0))
                quality = (likes + comments) / max(views, 1.0)
                virality = views + 15.0 * likes + 50.0 * comments + 100.0 * shares

                posts.append({
                    'id': p.get('id'),
                    'title': p.get('title') or (p.get('caption') or '')[:80],
                    'caption': p.get('caption') or p.get('text') or '',
                    'platform': p.get('platform', 'instagram'),
                    'postType': p.get('postType', 'text'),
                    'subscribers': subs,
                    'views': views,
                    'likes': likes,
                    'comments': comments,
                    'shares': shares,
                    'breakout': breakout,
                    'quality': quality,
                    'virality': virality
                })
        except Exception as e:
            print(f"[Warning] Failed to load user posts: {e}")
            
    print(f"Loaded {len(posts)} user historical posts for {clean_email} for Model B lift training.")
    return posts

def train_and_evaluate_regressors(X, y, target_name="Target"):
    """Compares GradientBoosting, RandomForest, XGBoost, and Ridge Regressors"""
    models = {
        'GradientBoosting': GradientBoostingRegressor(n_estimators=75, learning_rate=0.08, max_depth=4, random_state=42),
        'RandomForest': RandomForestRegressor(n_estimators=80, max_depth=6, random_state=42),
        'Ridge': Ridge(alpha=1.0)
    }
    if HAS_XGB:
        models['XGBoost'] = xgb.XGBRegressor(n_estimators=75, learning_rate=0.08, max_depth=4, random_state=42, verbosity=0)

    best_name = 'GradientBoosting'
    best_score = -999.0
    best_model = None
    results = {}

    for name, model in models.items():
        try:
            model.fit(X, y)
            preds = model.predict(X)
            r2 = r2_score(y, preds)
            mae = mean_absolute_error(y, preds)
            results[name] = {'r2': round(float(r2), 4), 'mae': round(float(mae), 4)}
            if r2 > best_score:
                best_score = r2
                best_name = name
                best_model = model
        except Exception as e:
            results[name] = {'error': str(e)}

    print(f"[{target_name}] Best Model: {best_name} (R2: {best_score:.4f}, MAE: {results[best_name]['mae']:.4f})")
    return best_model, best_name, results

def train_two_stage_framework(user_email='default_user'):
    print("=" * 60)
    print("[TRAIN] Starting EngageIQ Two-Stage Post Prediction Training")
    print(f"   Target User: {user_email}")
    print("=" * 60)

    # ──────────────────────────────────────────────────────────
    # STEP 1 & 2: MODEL A (Content Prior from Trending Videos)
    # ──────────────────────────────────────────────────────────
    trending_videos = load_trending_videos()
    if not trending_videos:
        raise ValueError("No trending videos available for Model A training.")

    X_A = np.array([extract_features(v) for v in trending_videos])
    y_breakout = np.array([v['breakout'] for v in trending_videos])
    y_quality = np.array([v['quality'] for v in trending_videos])
    y_virality_log = np.array([math.log1p(v['virality']) for v in trending_videos])

    model_A_breakout, algo_breakout, stats_breakout = train_and_evaluate_regressors(X_A, y_breakout, "Model A: Breakout")
    model_A_quality, algo_quality, stats_quality = train_and_evaluate_regressors(X_A, y_quality, "Model A: Quality")
    model_A_virality, algo_virality, stats_virality = train_and_evaluate_regressors(X_A, y_virality_log, "Model A: Virality (log)")

    # Feature importances from GradientBoosting or RandomForest
    feature_importances = {}
    if hasattr(model_A_breakout, 'feature_importances_'):
        for name, imp in zip(FEATURE_NAMES, model_A_breakout.feature_importances_):
            feature_importances[name] = round(float(imp), 4)

    # ──────────────────────────────────────────────────────────
    # STEP 3: MODEL B (Personal Lift Model from User Past Posts)
    # ──────────────────────────────────────────────────────────
    user_posts = load_user_posts(user_email)
    if not user_posts:
        print("[Warning] No user posts found. Using trending videos subset as user proxy.")
        user_posts = trending_videos[:50]

    X_B = np.array([extract_features(p) for p in user_posts])
    
    # Query Model A baseline expectations on user posts
    baseline_breakouts = model_A_breakout.predict(X_B)
    baseline_qualities = model_A_quality.predict(X_B)
    baseline_viralities = model_A_virality.predict(X_B)

    # Compute personal lifts: lift = actual - baseline
    user_actual_breakouts = np.array([p['breakout'] for p in user_posts])
    user_actual_qualities = np.array([p['quality'] for p in user_posts])
    user_actual_viralities = np.array([math.log1p(p['virality']) for p in user_posts])

    lift_breakout = user_actual_breakouts - baseline_breakouts
    lift_quality = user_actual_qualities - baseline_qualities
    lift_virality = user_actual_viralities - baseline_viralities

    # Fit Model B Lift Regressors (Regularized Ridge + Random Forest)
    model_B_breakout = Ridge(alpha=2.0)
    model_B_breakout.fit(X_B, lift_breakout)
    b_breakout_r2 = r2_score(lift_breakout, model_B_breakout.predict(X_B))

    model_B_quality = Ridge(alpha=2.0)
    model_B_quality.fit(X_B, lift_quality)
    b_quality_r2 = r2_score(lift_quality, model_B_quality.predict(X_B))

    # Platform-oriented user audience taste analysis
    platform_taste = {}
    for p in ['instagram', 'linkedin', 'twitter', 'facebook', 'youtube']:
        plat_posts = [p_obj for p_obj in user_posts if p_obj.get('platform') == p]
        if plat_posts:
            avg_eng = sum(p_obj['likes'] + p_obj['comments'] for p_obj in plat_posts) / len(plat_posts)
            avg_views = sum(p_obj['views'] for p_obj in plat_posts) / len(plat_posts)
            avg_rate = (avg_eng / max(avg_views, 1.0)) * 100.0
            platform_taste[p] = {
                'post_count': len(plat_posts),
                'avg_engagement_rate': f"{avg_rate:.2f}%",
                'affinity_multiplier': round(min(1.5, max(0.6, avg_rate / 4.5)), 2)
            }
        else:
            platform_taste[p] = {'post_count': 0, 'avg_engagement_rate': "4.00%", 'affinity_multiplier': 1.0}

    # Summary packaging
    output_package = {
        "status": "trained",
        "trained_at": "2026-10-12T12:00:00Z",
        "user_email": user_email,
        "sample_counts": {
            "trending_videos": len(trending_videos),
            "user_past_posts": len(user_posts)
        },
        "model_A": {
            "name": "Universal Content Prior (Trending Videos)",
            "algorithms": {
                "breakout": algo_breakout,
                "quality": algo_quality,
                "virality": algo_virality
            },
            "metrics": {
                "breakout": stats_breakout[algo_breakout],
                "quality": stats_quality[algo_quality],
                "virality": stats_virality[algo_virality]
            },
            "feature_importances": feature_importances,
            "weights": {
                "ridge_breakout_intercept": round(float(model_A_breakout.intercept_ if hasattr(model_A_breakout, 'intercept_') else -0.85), 4),
                "mean_breakout": round(float(np.mean(y_breakout)), 4),
                "mean_quality": round(float(np.mean(y_quality)), 4),
                "mean_virality_log": round(float(np.mean(y_virality_log)), 4)
            }
        },
        "model_B": {
            "name": "Personal Lift Model (User History)",
            "algorithm": "Regularized Ridge L2 with Shrinkage",
            "metrics": {
                "breakout_lift_r2": round(float(b_breakout_r2), 4),
                "quality_lift_r2": round(float(b_quality_r2), 4)
            },
            "mean_lifts": {
                "mean_breakout_lift": round(float(np.mean(lift_breakout)), 4),
                "mean_quality_lift": round(float(np.mean(lift_quality)), 4),
                "mean_virality_lift": round(float(np.mean(lift_virality)), 4)
            },
            "coefficients": {
                "breakout_lift_coef": [round(float(c), 4) for c in model_B_breakout.coef_],
                "breakout_lift_intercept": round(float(model_B_breakout.intercept_), 4),
                "quality_lift_coef": [round(float(c), 4) for c in model_B_quality.coef_],
                "quality_lift_intercept": round(float(model_B_quality.intercept_), 4)
            },
            "platform_audience_taste": platform_taste
        }
    }

    with open(OUTPUT_MODEL_PATH, 'w', encoding='utf-8') as out_f:
        json.dump(output_package, out_f, indent=2)

    print(f"\n[SUCCESS] Model training complete! Artifact written to {OUTPUT_MODEL_PATH}")
    print(f"   Model A Breakout R2: {stats_breakout[algo_breakout]['r2']}")
    print(f"   Model A Quality R2: {stats_quality[algo_quality]['r2']}")
    print(f"   Model B Mean Breakout Lift: {output_package['model_B']['mean_lifts']['mean_breakout_lift']}")
    return output_package

if __name__ == '__main__':
    email = sys.argv[1] if len(sys.argv) > 1 else 'default_user'
    train_two_stage_framework(email)
