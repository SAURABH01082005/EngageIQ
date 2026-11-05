# Conjugate Media — ML Data & Training Notebooks

This folder documents two Jupyter notebooks that prepare data and train **Model A** (trending) and **Model B** (audience + engagement) on the Conjugate Media social datasets.

| Notebook | Purpose |
|----------|---------|
| [`build_ml_ready_datasets.ipynb`](./build_ml_ready_datasets.ipynb) | Turn **raw JSON** scrapes into clean ML-ready CSVs |
| [`conjugate-media-model-A-B-training.ipynb`](./conjugate-media-model-A-B-training.ipynb) | Train **Model A** + **Model B** and predict engagement |

There is also a pure-Python equivalent of the data builder:

- [`build_ml_ready_datasets.py`](./build_ml_ready_datasets.py) — same logic as the first notebook, runnable from the terminal

---

## Table of contents

1. [Overview of the two models](#1-overview-of-the-two-models)
2. [Prerequisites](#2-prerequisites)
3. [Project data layout](#3-project-data-layout)
4. [Notebook 1 — Build ML-ready datasets](#4-notebook-1--build-ml-ready-datasets)
5. [Notebook 2 — Train Model A & Model B](#5-notebook-2--train-model-a--model-b)
6. [Engineered features (formulas)](#6-engineered-features-formulas)
7. [Outputs & saved models](#7-outputs--saved-models)
8. [How to run (quick start)](#8-how-to-run-quick-start)
9. [Using the trained models in code](#9-using-the-trained-models-in-code)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Overview of the two models

### Model A — What is trending?

- **Goal:** Score whether a post/video is likely to trend.
- **Inputs:** `title`, `description`, `category`, `tags` (text) + content meta  
  (`platform`, `content_type`, `duration_sec`, `is_short_form`, `is_vertical_reel`, posting time, …).
- **Targets:**
  - Regression: `engagement_score` (0–100)
  - Classification: High vs Low engagement
- **Data source:** Trending scraper JSON only (`model_A_trending.csv`).

### Model B — Audience type + engagement prediction

- **Goal:**
  1. Infer **audience type** from the creator’s own posts (no trending data).
  2. Predict **engagement_score** for a new post **given that audience type**.
- **Inputs:** platform, content type, duration, timing, subscribers, breakout/virality signals, and **`audience_type`**.
- **Targets:** `engagement_score` + cluster labels such as:
  - Viral Breakout  
  - Loyal High-Reaction  
  - Short-Form / Reel Audience  
  - Steady / Broad Reach  
- **Data source:** User posts only (`model_B_audience_posts.csv`).

---

## 2. Prerequisites

### Software

- Python 3.9+
- Jupyter / VS Code / Colab (to open `.ipynb`)

### Python packages

```bash
pip install pandas numpy matplotlib seaborn scikit-learn joblib
```

Optional (already used if present):

```bash
pip install jupyter
```

### Data

Unzip the Conjugate Media project so that this path exists:

```text
conjugate-media/server/data/
  dataset_youtube-trending-scraper_*.json
  dataset_instagram-trending-scraper_*.json
  dataset_facebook-trending-scraper_*.json
  dataset_linkedin-trending-scraper_*.json
  dataset_twitter-trends_*.json
  dataset_facebook-posts-scraper_*.json
  dataset_linkedin-profile-posts_*.json
  dataset_twitter-user-tweets_*.json
  default_seed.json
  live_store.json
  ...
```

You do **not** need to re-scrape anything. Both notebooks read these files only.

---

## 3. Project data layout

```text
conjugate-media/
  server/
    data/
      *.json                          ← raw scrapes (input)
      ml_ready/                       ← created by build notebook
        model_A_trending.csv
        model_B_audience_posts.csv
        model_B_audience_{platform}.csv
        FEATURE_DICTIONARY.md
    ml_models/                        ← created by training notebook
      model_A_trending_gb.joblib
      model_A_trending_clf.joblib
      model_B_audience_rf.joblib
      model_B_audience_engagement.joblib
      model_B_audience_clusters.joblib
```

---

## 4. Notebook 1 — Build ML-ready datasets

**File:** `build_ml_ready_datasets.ipynb`

### What it does (step by step)

| Section | Description |
|---------|-------------|
| 1. Setup | Locate `server/data`, create `ml_ready/` |
| 2. Helpers | Safe numbers, duration parse, time parse, content type, tags |
| 2.4 Metrics | Compute `breakout_log_ratio`, `quality_reaction_rate`, `virality_index`, `engagement_score` |
| 3. Subscribers | Load follower counts from `default_seed` / `live_store` (for Model B) |
| 4. Model A | Build one row per trending item (YouTube, Instagram, Facebook, LinkedIn, Twitter trends) |
| 5. Model B | Build rows from seed posts + Facebook / LinkedIn / Twitter profile posts only |
| 6. Save | Write CSVs + per-platform splits |
| 7. Peek | Sanity-check sample rows and stats |

### How to run

1. Open `build_ml_ready_datasets.ipynb`
2. **Run All**
3. Confirm files under `conjugate-media/server/data/ml_ready/`

Or from the terminal:

```bash
python build_ml_ready_datasets.py
```

### Expected row counts (approx.)

| File | Rows |
|------|------|
| `model_A_trending.csv` | ~153 |
| `model_B_audience_posts.csv` | ~1,381 |
| `model_B_audience_youtube.csv` | ~100 |
| `model_B_audience_instagram.csv` | ~12 |
| `model_B_audience_facebook.csv` | ~200 |
| `model_B_audience_linkedin.csv` | ~276 |
| `model_B_audience_twitter.csv` | ~793 |

---

## 5. Notebook 2 — Train Model A & Model B

**File:** `conjugate-media-model-A-B-training.ipynb`

**Depends on:** CSVs from Notebook 1 (`ml_ready/`).

### What it does

#### Model A (trending)

1. Load `model_A_trending.csv`
2. Build TF-IDF on `title + description + category + tags`
3. Add meta features (platform, content type, duration, short-form, reel, time)
4. Train regression models (Ridge, Random Forest, Gradient Boosting) → `engagement_score`
5. Train classifier → High vs Low engagement
6. Demo: score a new title/description with `predict_trending_score(...)`

#### Model B (audience)

1. Load `model_B_audience_posts.csv`
2. Train engagement regressor on meta + breakout/virality features
3. **Cluster** posts → `audience_type` (Viral Breakout, Loyal, Steady, …)
4. **Audience-aware engagement model** — predicts `engagement_score` **using `audience_type` as a feature**
5. Demo: `predict_engagement_for_audience(platform, content_type, audience_type, ...)`
6. Per-platform mini models + feature importance charts
7. Save all models under `server/ml_models/`

### How to run

1. Make sure Notebook 1 has been run (CSVs exist)
2. Open `conjugate-media-model-A-B-training.ipynb`
3. **Run All**
4. Scroll to **B7** to try engagement prediction for different audience types

### Typical metrics (will vary slightly by run)

| Model | Metric | Approx. value |
|-------|--------|----------------|
| A — Gradient Boosting / RF | R² (engagement_score) | ~0.8–0.87 |
| A — High/Low classifier | Accuracy / F1 | ~0.85–0.87 |
| B — RF (meta only) | R² | ~0.9+ |
| B — Audience-aware RF | R² | ~0.97 |
| B — Per-platform | R² | YouTube/Facebook often > 0.95 |

---

## 6. Engineered features (formulas)

These columns are created in the **build** notebook and used as targets or features in training.

| Column | Formula / meaning |
|--------|-------------------|
| `breakout_log_ratio` | \(\ln\frac{\text{views}+1}{\text{subscribers}+1}\) |
| `quality_reaction_rate` | \(\frac{\text{likes}+\text{comments}+\text{all reactions}}{\text{views}}\) |
| `virality_index` | \(\text{views} + 15\times\text{likes} + 50\times\text{comments} + 100\times\text{shares}\) |
| `engagement_rate` | \(100 \times \frac{\text{likes}+\text{comments}+\text{shares}}{\text{views}}\) |
| `engagement_score` | Composite **0–100** score (blend of ER, QRR, log-virality, breakout) — main ML target |
| `content_type` | `video` / `image` / `text` / `reel` / `short` / … |
| `duration_sec` | Length in seconds |
| `is_vertical_reel` | 1 if reel / vertical short style |
| `is_short_form` | 1 if ≤60s or reel/short |
| `post_hour` | Hour of day (0–23, UTC) |
| `post_dayofweek` | 0 = Monday … 6 = Sunday |
| `is_weekend` | 1 if Saturday or Sunday |
| `tags` / `tags_count` | Tag string and count |
| `subscribers` | Platform follower count (Model B; 0 on pure trending rows) |

Full column notes: `conjugate-media/server/data/ml_ready/FEATURE_DICTIONARY.md`

---

## 7. Outputs & saved models

### After Notebook 1

```text
conjugate-media/server/data/ml_ready/
  model_A_trending.csv
  model_B_audience_posts.csv
  model_B_audience_youtube.csv
  model_B_audience_instagram.csv
  model_B_audience_facebook.csv
  model_B_audience_linkedin.csv
  model_B_audience_twitter.csv
  FEATURE_DICTIONARY.md
```

### After Notebook 2

```text
conjugate-media/server/ml_models/
  model_A_trending_gb.joblib          # A regression (engagement_score)
  model_A_trending_clf.joblib         # A High vs Low classifier
  model_B_audience_rf.joblib          # B engagement (meta features)
  model_B_audience_engagement.joblib  # B engagement **with audience_type**
  model_B_audience_clusters.joblib    # KMeans + scaler + cluster name map
```

---

## 8. How to run (quick start)

```bash
# 1) Ensure project data is present
ls conjugate-media/server/data/*.json

# 2) Install deps
pip install pandas numpy matplotlib seaborn scikit-learn joblib jupyter

# 3) Build ML-ready CSVs
#    Option A — notebook
jupyter notebook build_ml_ready_datasets.ipynb
#    Option B — script
python build_ml_ready_datasets.py

# 4) Train models
jupyter notebook conjugate-media-model-A-B-training.ipynb
#    → Run All
```

Order matters: **build datasets first**, then **train**.

---

## 9. Using the trained models in code

### Model A — score a new trending idea

```python
import joblib
import pandas as pd
import numpy as np

# The training notebook defines predict_trending_score() after training.
# After a full Run All, you can call it in a later cell, or reload pipelines:

pipe_A = joblib.load('conjugate-media/server/ml_models/model_A_trending_gb.joblib')
# Build a one-row DataFrame with the same columns used in training
# (platform, content_type, duration_sec, text, ...), then:
# score = pipe_A.predict(row_df)[0]
```

### Model B — engagement given audience type

```python
import joblib

pipe_B = joblib.load(
    'conjugate-media/server/ml_models/model_B_audience_engagement.joblib'
)
cluster_bundle = joblib.load(
    'conjugate-media/server/ml_models/model_B_audience_clusters.joblib'
)
# cluster_bundle keys: kmeans, scaler, cluster_features, cluster_names, high_threshold_A

# Prefer using the notebook helper after Run All:
# predict_engagement_for_audience(
#     platform='youtube',
#     content_type='video',
#     audience_type='Viral Breakout',
#     duration_sec=180,
#     subscribers=8_630_000,
# )
```

### Typical product flow

```text
1. History of posts  →  cluster  →  audience_type per platform
2. New post idea     →  pick platform + content_type + audience_type
3. Model B           →  engagement_score
4. Optional Model A  →  “will this trend?” from title/description
```

---

## 10. Troubleshooting

| Problem | Fix |
|---------|-----|
| `DATA dir not found` | Unzip so `conjugate-media/server/data/` exists, or change the `DATA` path at the top of the build notebook |
| `model_A_trending.csv` missing when training | Run `build_ml_ready_datasets.ipynb` (or `.py`) first |
| `No module named sklearn` | `pip install scikit-learn joblib` |
| Very few rows in Model A | Expected — trending scrapes are smaller; Model B has more rows |
| `audience_type` almost all “Steady” | Dataset is dominated by one creator’s steady posts; still valid for training the pipeline |
| Plots don’t show | Ensure you run in Jupyter / VS Code notebook UI (not only a headless script) |

---

## Related files

| File | Role |
|------|------|
| `build_ml_ready_datasets.ipynb` | Interactive, explained data pipeline |
| `build_ml_ready_datasets.py` | Same pipeline as a CLI script |
| `conjugate-media-model-A-B-training.ipynb` | Train Model A + Model B (incl. audience-aware engagement) |
| `conjugate-media-data-analysis.ipynb` | Earlier EDA / unified content analysis |
| `conjugate-media-ml-beginner.ipynb` | Simpler first ML intro on unified CSV |

---

## License / context

These notebooks are part of the **Conjugate Media** social simulation project (data control plane for multi-platform posts and trending). They operate only on the datasets shipped with the project and do not call external live APIs at train time.
