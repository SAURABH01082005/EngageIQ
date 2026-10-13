from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, Dict, Any
from model import predict
from predict_two_stage import predict_two_stage, load_trained_model
from train_two_stage_model import train_two_stage_framework

app = FastAPI(title="EngageIQ Two-Stage ML Prediction Service")

class PredictRequest(BaseModel):
    followers: Optional[int] = 10000
    postText: Optional[str] = ""
    postType: Optional[str] = "text"
    reactions: Optional[int] = 50
    comments: Optional[int] = 10
    daysSincePosted: Optional[int] = 1
    durationSec: Optional[int] = 25
    hasSubtitles: Optional[bool] = True
    hookRating: Optional[int] = 8

class TwoStagePredictRequest(BaseModel):
    title: Optional[str] = ""
    caption: Optional[str] = ""
    text: Optional[str] = ""
    platform: Optional[str] = "instagram"
    postType: Optional[str] = "video"
    followers: Optional[int] = 25000
    subscribers: Optional[int] = 25000
    durationSec: Optional[float] = 28.0
    aspectRatio: Optional[str] = "9:16"
    hasSubtitles: Optional[bool] = True
    hookRating: Optional[int] = 8
    hour_of_day: Optional[int] = 18
    day_of_week: Optional[str] = "Wednesday"
    user_email: Optional[str] = "default_user"

@app.post("/api/predict-engagement")
def predict_endpoint(request: PredictRequest):
    data = request.dict()
    result = predict(data)
    return result

@app.post("/api/ml/two-stage/predict")
def predict_two_stage_endpoint(request: TwoStagePredictRequest):
    data = request.dict()
    return predict_two_stage(data)

@app.post("/api/ml/two-stage/train")
def train_two_stage_endpoint(payload: Dict[str, Any] = {}):
    user_email = payload.get("user_email") or payload.get("email") or "default_user"
    res = train_two_stage_framework(user_email)
    return {"success": True, "model": res}

@app.get("/api/ml/two-stage/status")
def model_status_endpoint():
    model = load_trained_model()
    if not model:
        return {"status": "uninitialized", "message": "Model not trained yet."}
    return model

# Run with: uvicorn app:app --reload --port 8000

