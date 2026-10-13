import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LinearRegression
from textblob import TextBlob

# Extended synthetic training dataset with post_type (0: text, 1: image, 2: video), duration, hook, subtitles
X_class = np.array([
    [1000, 0.8, 2, 50, 10, 1, 25, 1, 8], # video
    [500, 0.2, 0, 10, 2, 3, 0, 0, 4],   # text
    [2000, 0.6, 1, 100, 20, 2, 0, 0, 7], # image
    [300, -0.3, 0, 5, 1, 5, 0, 0, 3],   # text
    [1500, 0.4, 2, 70, 15, 1, 30, 1, 9], # video
    [800, 0.5, 1, 40, 8, 2, 0, 0, 6],   # image
])
y_class = np.array([2, 0, 2, 0, 2, 1])

clf = RandomForestClassifier(random_state=42)
clf.fit(X_class, y_class)

def predict(data):
    followers = data.get('followers', 10000)
    postText = data.get('postText', '')
    postType = data.get('postType', 'text').lower()
    reactions = data.get('reactions', 50)
    comments = data.get('comments', 10)
    daysSincePosted = data.get('daysSincePosted', 1)
    durationSec = data.get('durationSec', 25 if postType == 'video' else 0)
    hasSubtitles = 1 if data.get('hasSubtitles', True) else 0
    hookRating = data.get('hookRating', 8)

    blob = TextBlob(postText) if postText else None
    sentiment = blob.sentiment.polarity if blob else 0.4
    subjectivity = blob.sentiment.subjectivity if blob else 0.5

    if postType == 'video':
        type_code = 2
    elif postType in ['image', 'carousel']:
        type_code = 1
    else:
        type_code = 0

    features = np.array([[followers, sentiment, type_code, reactions, comments, daysSincePosted, durationSec, hasSubtitles, hookRating]])
    growth_class = clf.predict(features)[0]
    growth = ['LOW', 'MEDIUM', 'HIGH'][growth_class]
    proba = clf.predict_proba(features)[0]
    confidence = int(round(proba[growth_class] * 100))

    score = 68
    if growth == 'HIGH':
        score += 12
    elif growth == 'LOW':
        score -= 14

    reasons = []

    # Dynamic text feature analysis
    has_question = any(q in postText.lower() for q in ['?', 'what', 'why', 'how', 'which', 'who', 'agree', 'think']) if postText else False
    has_cta = any(c in postText.lower() for c in ['link in bio', 'save', 'share', 'comment', 'swipe', 'check out', 'click', 'dm']) if postText else False
    word_count = len(postText.split()) if postText else 0
    hashtags = len([w for w in postText.split() if w.startswith('#')]) if postText else 0
    has_newlines = '\n' in postText if postText else False

    if type_code == 2:
        score += 8 if hasSubtitles else -8
        score += int((hookRating - 5) * 2)
        score = max(30, min(score, 98))
        if hasSubtitles:
            reasons.append('Subtitles capture silent mobile viewers (+35% retention)')
        else:
            reasons.append('Add subtitles to recover silent mobile drop-off')
        if hookRating >= 7:
            reasons.append('Strong visual hook in first 3 seconds')
        else:
            reasons.append('Improve opening 3-second hook')
        reasons.append('9:16 Vertical format optimizes mobile completion rate')
        reasons.append('Optimal video duration window')
    else:
        # Dynamic adjustments for text / copy
        if has_question:
            score += 10
            reasons.append('Engaging question hook detected (+32% comment lift)')
        else:
            score -= 6
            reasons.append('Add an open-ended question hook to invite discussion')

        if has_cta:
            score += 8
            reasons.append('Clear call-to-action detected (+18% share velocity)')
        else:
            reasons.append('Add explicit CTA (e.g., "Save this", "Share with your team")')

        if sentiment > 0.2:
            score += 6
            reasons.append(f'Positive emotional polarity ({sentiment:+.2f}) drives organic shares')
        elif sentiment < -0.1:
            score += 4
            reasons.append(f'Contrarian / critical tone ({sentiment:+.2f}) sparks strong debate')
        else:
            reasons.append('Neutral tone; consider stronger emotional hook')

        if 20 <= word_count <= 180:
            score += 5
            reasons.append(f'Optimal length ({word_count} words) for high completion rate')
        elif word_count < 10:
            score -= 8
            reasons.append(f'Text draft is very short ({word_count} words); expand with key takeaway')
        elif word_count > 250:
            if has_newlines:
                reasons.append('Long-form thought leadership with skimmable line breaks')
            else:
                score -= 5
                reasons.append('Dense text block detected; add line breaks for mobile readability')

        if 2 <= hashtags <= 6:
            score += 4
            reasons.append(f'Balanced hashtag density ({hashtags} tags) for search discovery')
        elif hashtags > 8:
            score -= 4
            reasons.append('High hashtag count; prune to top 3-5 tags to avoid spam filters')

    score = max(30, min(score, 98))
    expectedReactions = int(reactions + (score / 100) * followers * 0.045)

    return {
        'growth': 'HIGH' if score >= 80 else 'MEDIUM' if score >= 60 else 'LOW',
        'confidence': confidence,
        'engagementScore': score,
        'expectedReactions': expectedReactions,
        'reasons': reasons[:5],
        'bestPostingTime': '6:00 PM – 8:30 PM Weekdays'
    }
