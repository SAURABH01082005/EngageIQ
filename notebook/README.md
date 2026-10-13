# 📊 EngageIQ Machine Learning Data Visualization Notebooks

This directory contains standalone Jupyter Notebooks documenting the exploratory data analysis, feature engineering, mathematical distributions, and two-stage machine learning validation powering **EngageIQ**.

---

## 📁 Notebook Files
- **[EngageIQ_Training_Data_Visualization.ipynb](file:///c:/Users/saura/OneDrive/Desktop/projects/sem7/aaron_engageIQ/EngageIQ/notebook/EngageIQ_Training_Data_Visualization.ipynb)**: Complete, pre-rendered Jupyter Notebook containing 36 cells (17 executable code cells, 19 narrative Markdown cells, 12 high-resolution multi-panel figures with 25+ subplots, and 4 statistical tables).
- **[data_visualization.ipynb](file:///c:/Users/saura/OneDrive/Desktop/projects/sem7/aaron_engageIQ/EngageIQ/notebook/data_visualization.ipynb)**: Alias of the visualization notebook for convenience.

---

## 🎯 Datasets Explored & Visualized
All visualizations are generated directly from the real training datasets stored in `conjugate-media/server/data/`:
1. **YouTube Scraped Trending Videos (`dataset_youtube-channel-scraper_*.json`)**:
   - 330 real-world trending videos and reels.
   - Foundation for **Model A (Universal Content Prior)**.
2. **Creator Multi-Platform Historical Posts (`live_store.json`)**:
   - 745 creator posts across Instagram, YouTube, Facebook, LinkedIn, and Twitter/X.
   - Foundation for **Model B (Personal Lift & Audience Content Taste Engine)**.
3. **Cross-Platform Social Scrapes**:
   - Facebook (`dataset_facebook-posts-scraper_*.json`), LinkedIn (`dataset_linkedin-profile-posts_*.json`), and Twitter/X (`dataset_twitter-user-tweets_*.json`).

---

## 📊 Visualizations & Analyses Included

| Section | Visual Type | Key Metric / Insight |
| :--- | :--- | :--- |
| **Target Normalization** | Log-scale histograms & KDEs | Raw views vs $\ln((\text{Views}+1)/(\text{Subs}+1))$ breakout ratio & Theory 2 virality index. |
| **Virality Decomposition** | Stacked bar & percentage area | Proportionate contribution of Views ($1\times$), Likes ($15\times$), Comments ($50\times$), Shares ($100\times$). |
| **Strategic Quadrant** | Multi-class scatter plot | 4 post archetypes: Unicorns, Reach Magnets, Community Gems, Underperformers. |
| **Correlation Matrix** | 14-feature heatmap | Pearson correlation across textual, multimodal, duration, and target variables. |
| **Creator Format Distribution** | Donut chart & bar chart | Post frequency across Reels, Carousels, Static Images, Text, Long Videos. |
| **Platform Multipliers** | Horizontal bar chart | Relative audience reach multipliers (FB: $1.41\times$, IG: $1.16\times$, YT: $1.14\times$, X: $0.70\times$, LI: $0.60\times$). |
| **Audience Taste Radar** | Polar radar / spider chart | 6-axis audience affinity profile (Reels 94%, Carousels 89%, Question Hooks 88%, Subtitles 92%, Prime Time 85%, Short-form 91%). |
| **Temporal Publishing Heatmap** | 24-hr $\times$ 7-day 2D matrix | Prime-time publishing windows (Peak: 17:00–21:00 UTC+5:30 on weekdays). |
| **Textual NLP Signals** | Regression plots & bar plots | TextBlob sentiment polarity, title word count, and question hook impact on breakout. |
| **ML Model Benchmarking** | Performance comparison table | GradientBoosting vs RandomForest vs Ridge ($R^2$ and MAE across Breakout, Quality, Virality). |
| **Actual vs Predicted Fit** | Scatter plots with $y = x$ line | Regressor goodness of fit ($R^2 = 0.938$ Breakout, $0.941$ Virality) and homoscedasticity residual check. |
| **Feature Importance Ranking** | Horizontal bar chart | Top predictors driving social virality (Hook rating, question hooks, duration, sentiment, topic). |
| **Two-Stage Waterfall** | Cascading waterfall chart | Step-by-step scoring: Baseline $\to$ Model A Prior $\to$ Model B Audience Lift $\to$ Final Virality. |

---

## 🚀 How to Open and Run

### 1. In VS Code (Recommended)
Simply click on [EngageIQ_Training_Data_Visualization.ipynb](file:///c:/Users/saura/OneDrive/Desktop/projects/sem7/aaron_engageIQ/EngageIQ/notebook/EngageIQ_Training_Data_Visualization.ipynb) or [data_visualization.ipynb](file:///c:/Users/saura/OneDrive/Desktop/projects/sem7/aaron_engageIQ/EngageIQ/notebook/data_visualization.ipynb) in VS Code. All figures, tables, and metrics are **already pre-executed and rendered**!

### 2. In JupyterLab or Classic Notebook
```bash
# Navigate to project root
cd c:\Users\saura\OneDrive\Desktop\projects\sem7\aaron_engageIQ\EngageIQ

# Start Jupyter
jupyter notebook notebook/EngageIQ_Training_Data_Visualization.ipynb
```

### 3. Re-executing via Automation Script
If you modify datasets or models, you can re-execute and re-render the entire notebook automatically using:
```bash
python scripts/generate_visualization_notebook.py
```
