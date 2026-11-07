# EngageIQ — Engagement Intelligence Engine

**EngageIQ** is a Jupyter notebook that scores any social post using the trained **Model A** (trending) and **Model B** (audience) from Conjugate Media, then suggests how to raise engagement.

| File | Role |
|------|------|
| [`EngageIQ.ipynb`](./EngageIQ.ipynb) | Interactive scorer: text in → A score, B score, final score, tips |

---

## Table of contents

1. [What EngageIQ does](#1-what-engageiq-does)
2. [Prerequisites](#2-prerequisites)
3. [Models it loads](#3-models-it-loads)
4. [How scoring works](#4-how-scoring-works)
5. [How to run](#5-how-to-run)
6. [User inputs](#6-user-inputs)
7. [Outputs explained](#7-outputs-explained)
8. [Suggestion engine](#8-suggestion-engine)
9. [Batch scoring](#9-batch-scoring)
10. [Pipeline position](#10-pipeline-position)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. What EngageIQ does

You paste a **post title / caption** (and optional settings). EngageIQ returns:

| Output | Meaning |
|--------|---------|
| **Model A score** (0–100) | Trending potential from text + format |
| **Model A label** | `HIGH trending` or `low/mid trending` |
| **Model B score** (0–100) | Expected engagement for your **audience type** |
| **Final EngageIQ score** (0–100) | Weighted blend of A and B |
| **Final label** | Excellent / Good / Average / Low |
| **Suggestions** | Actionable tips to improve the post |

Default blend:

```text
Final = 0.45 × Model A  +  0.55 × Model B
```

Weights are configurable in the notebook (`WEIGHT_A`, `WEIGHT_B`).

---

## 2. Prerequisites

### Required

- Python 3.9+
- Packages:

```bash
pip install pandas numpy matplotlib scikit-learn joblib
```

### Required model files

EngageIQ does **not** train models. It loads them from:

```text
conjugate-media/server/ml_models/
```

Those files are produced by:

1. `build_ml_ready_datasets.ipynb` (or `.py`) → CSVs in `ml_ready/`
2. `conjugate-media-model-A-B-training.ipynb` → `.joblib` models

If `ml_models/` is empty, run the training notebook first.

### Optional

- Jupyter / VS Code / Google Colab to run the `.ipynb` interactively

---

## 3. Models it loads

| File | Used for |
|------|----------|
| `model_A_trending_gb.joblib` | Model A **regressor** → continuous engagement / trending score |
| `model_A_trending_clf.joblib` | Model A **classifier** → HIGH vs low/mid trending |
| `model_B_audience_engagement.joblib` | Model B **audience-aware** engagement score |
| `model_B_audience_rf.joblib` | Model B **meta-only** engagement (fallback / blend) |
| `model_B_audience_clusters.joblib` | Audience type names + high-score threshold from training |

### Why A has regressor + classifier

- **Regressor** → “How strong is trending potential?” (number)
- **Classifier** → “Is it HIGH or not?” (label)

### Why B has two RFs

- **Audience-aware RF** → score **given** `audience_type` (Viral Breakout, Steady, …)
- **Meta RF** → score from platform / format / timing / breakout signals only  

EngageIQ blends them (default ~70% audience-aware + 30% meta) into **Model B score**.

---

## 4. How scoring works

```text
Your post text + options
        │
        ▼
  Feature builder
  (clean text, content_type, duration, tags,
   post time, subscribers, breakout, virality priors)
        │
        ├──────────────────┬────────────────────┐
        ▼                  ▼                    ▼
   Model A              Model B            Model B
   (GB + CLF)        (audience-aware)      (meta RF)
        │                  │                    │
        └────────────┬─────┴────────┬───────────┘
                     ▼              ▼
              A score + label    B score (blend)
                     │              │
                     └──────┬───────┘
                            ▼
                   Final EngageIQ score
                            │
                            ▼
                   Suggestion engine
```

When real view/like counts are unknown, EngageIQ uses **platform priors** (typical views/likes from training context) only to fill `breakout_log_ratio` and `log_virality` for Model B. You can override with real metrics.

---

## 5. How to run

```bash
# 1) Confirm models exist
ls conjugate-media/server/ml_models/*.joblib

# 2) Open the notebook
jupyter notebook EngageIQ.ipynb
# or open in VS Code / Colab

# 3) Run All cells
```

Then go to **section 7 (Your turn)**, edit `MY_TEXT` and options, and re-run that cell.

---

## 6. User inputs

| Variable | Meaning | Examples |
|----------|---------|----------|
| `text` | Title / caption / post body (**required**) | Any string |
| `platform` | Target network | `youtube`, `instagram`, `facebook`, `linkedin`, `twitter` |
| `content_type` | Format | `video`, `image`, `text`, `reel`, `short`, `carousel` |
| `audience_type` | Audience segment (Model B) | `Viral Breakout`, `Loyal High-Reaction`, `Short-Form / Reel Audience`, `Steady / Broad Reach` |
| `duration_sec` | Length in seconds (`0` for text) | `35`, `180`, `0` |
| `tags` | Extra tags / hashtags | `"trailer action 2026"` |
| `post_hour` | Hour UTC (0–23) | `9`, `18` |
| `post_dayofweek` | 0=Mon … 6=Sun | `2` |
| `subscribers` | Optional channel size | `8630000` |
| `views` / `likes` / `comments` / `shares` | Optional real metrics | leave `None` to use priors |

Minimal call:

```python
engageiq_analyze("Your caption here", platform="instagram", content_type="reel", duration_sec=30)
```

Full helper:

```python
result = engageiq_analyze(
    text="...",
    platform="youtube",
    content_type="video",
    audience_type="Viral Breakout",
    duration_sec=150,
    tags="trailer action",
    post_hour=18,
    post_dayofweek=4,
)
```

---

## 7. Outputs explained

Example scorecard:

```text
Model A (Trending)     :   37.0   [HIGH trending]  P(high)=0.66
Model B (Audience)     :   69.2   (audience-aware 70.2, meta 66.8)
FINAL EngageIQ score   :   54.7   →  Good / High potential
```

| Field | Meaning |
|-------|---------|
| `model_A_score` | Trending-oriented engagement score from text + format |
| `model_A_label` | HIGH vs low/mid (classifier) |
| `model_A_high_proba` | Probability of HIGH class (if available) |
| `model_B_score` | Blended audience engagement score |
| `model_B_audience_score` | Pure audience-aware model output |
| `model_B_meta_score` | Meta-only model output |
| `final_engageiq_score` | Weighted final decision score |
| `final_label` | Excellent (≥60) / Good (≥ high threshold) / Average (≥25) / Low |
| `suggestions` | List of `{level, message}` tips |

The result is also a Python `dict` for use in your own code or API later.

---

## 8. Suggestion engine

Tips are rule-based on:

- Final / A / B score levels  
- Caption length and tag count  
- Platform vs content type mismatch (e.g. text on YouTube)  
- Short-form vs long-form  
- Audience type (Viral vs Loyal vs Steady vs Short-Form)  
- Posting hour / weekend on LinkedIn  
- Missing call-to-action (comment / share / save / question)

Levels you may see: `Critical`, `Improve`, `Good`, `Trending (A)`, `Audience (B)`, `Format`, `Timing`, `CTA`.

---

## 9. Batch scoring

Section 9 scores a **list of posts** and prints a table:

```text
preview | platform | type | A | B | Final | label
```

Useful for comparing several caption variants before publishing.

---

## 10. Pipeline position

```text
Raw JSON (zip)
    → build_ml_ready_datasets.ipynb / .py
    → ml_ready/model_A_trending.csv
       ml_ready/model_B_audience_posts.csv

    → conjugate-media-model-A-B-training.ipynb
    → ml_models/*.joblib

    → EngageIQ.ipynb          ← you are here
    → scores + suggestions for a new post
```

Related docs:

- [`README.md`](./README.md) — data build + training notebooks  
- `conjugate-media/server/data/ml_ready/FEATURE_DICTIONARY.md` — column definitions  

---

## 11. Troubleshooting

| Problem | Fix |
|---------|-----|
| `Model folder not found` | Ensure `conjugate-media/server/ml_models/` exists next to how you run the notebook (check working directory) |
| `FileNotFoundError` on `.joblib` | Run `conjugate-media-model-A-B-training.ipynb` first |
| `No module named sklearn` / `joblib` | `pip install scikit-learn joblib pandas numpy matplotlib` |
| Scores look stuck / similar | Provide clearer text; set `content_type`, `duration_sec`, and `audience_type` explicitly |
| Want different A/B balance | Change `WEIGHT_A` / `WEIGHT_B` in the scorer cell and re-run |
| Audience types feel off | Re-run clustering in the training notebook on updated post data, then reload models in EngageIQ section 2 |

---

## Quick start checklist

1. [ ] `conjugate-media/server/ml_models/` contains the five main `.joblib` files  
2. [ ] `pip install pandas numpy matplotlib scikit-learn joblib`  
3. [ ] Open `EngageIQ.ipynb` → **Run All**  
4. [ ] Edit **section 7** with your caption → run cell  
5. [ ] Read scorecard + suggestions  

---

## License / context

EngageIQ is part of the **Conjugate Media** stack (social simulation / control plane). It only uses locally saved models and does not call live social APIs at inference time.
