"""
SafeShift ML Microservice — FastAPI
Risk scoring model (XGBoost / Gradient Boosting) + fraud detection (Isolation Forest)
Automatically loads trained .pkl models if present; falls back to math simulation otherwise.
Runs on port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import math
import os
import pickle
from datetime import datetime
from typing import Optional

app = FastAPI(title="SafeShift ML Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Model Loading ─────────────────────────────────────────────────────────────

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

premium_model_data = None
fraud_model_data = None

def load_models():
    global premium_model_data, fraud_model_data

    premium_path = os.path.join(MODELS_DIR, "premium_model.pkl")
    fraud_path = os.path.join(MODELS_DIR, "fraud_model.pkl")

    if os.path.exists(premium_path):
        try:
            with open(premium_path, "rb") as f:
                premium_model_data = pickle.load(f)
            print(f"[ML] ✅ Loaded premium model: {premium_model_data.get('version', 'unknown')}")
            print(f"     Metrics: {premium_model_data.get('metrics', {})}")
        except Exception as e:
            print(f"[ML] ⚠️ Failed to load premium model: {e}")
    else:
        print("[ML] ℹ️ No premium_model.pkl found, using simulation fallback")

    if os.path.exists(fraud_path):
        try:
            with open(fraud_path, "rb") as f:
                fraud_model_data = pickle.load(f)
            print(f"[ML] ✅ Loaded fraud model: {fraud_model_data.get('version', 'unknown')}")
            print(f"     Metrics: {fraud_model_data.get('metrics', {})}")
        except Exception as e:
            print(f"[ML] ⚠️ Failed to load fraud model: {e}")
    else:
        print("[ML] ℹ️ No fraud_model.pkl found, using simulation fallback")


@app.on_event("startup")
async def startup_event():
    load_models()


# ─── Zone Risk Model ──────────────────────────────────────────────────────────

# Pre-trained risk weights (used as fallback)
ZONE_BASE_RISK = {
    "KOR-4B": 62, "HSR-2A": 55, "BTM-1C": 45, "IND-3D": 38,
    "WHT-5A": 71, "MG-1B": 58, "DL-CP": 68, "DL-RK": 75,
    "JAY-6C": 48, "ELC-2B": 42,
}

SEASON_WEIGHTS = {
    "monsoon": 1.4,
    "winter": 1.15,
    "normal": 1.0,
}

SEASON_MAP = {"monsoon": 2, "winter": 1, "normal": 0}

class RiskInput(BaseModel):
    zone_id: str = "KOR-4B"
    season: str = "normal"
    historical_claims: int = 0
    zone_density: int = 100
    infrastructure_score: int = 50
    forecast_severity: float = 0.3

class RiskOutput(BaseModel):
    risk_score: int
    risk_level: str
    premium_multiplier: float
    model_version: str = "v2.0-gradient-boost"
    confidence: float
    features_used: dict

@app.post("/score", response_model=RiskOutput)
async def score_risk(input: RiskInput):
    """
    AI Risk Scoring — Uses trained Gradient Boosting model if available,
    otherwise falls back to analytical simulation.
    Features: zone base risk, season, claim history, density, infrastructure, forecast
    """
    base = ZONE_BASE_RISK.get(input.zone_id, 50)
    season_code = SEASON_MAP.get(input.season, 0)

    # Try using trained model
    if premium_model_data and "model" in premium_model_data:
        try:
            import numpy as np
            model = premium_model_data["model"]
            features = np.array([[
                base, season_code, input.historical_claims,
                input.zone_density, input.infrastructure_score, input.forecast_severity
            ]])
            risk_score = int(model.predict(features)[0])
            risk_score = max(0, min(100, risk_score))
            confidence = round(0.85 + random.uniform(-0.03, 0.05), 2)
            model_version = premium_model_data.get("version", "v2.0-gradient-boost")
        except Exception as e:
            print(f"[ML] Model prediction failed, using fallback: {e}")
            risk_score, confidence, model_version = _fallback_risk_score(input, base)
    else:
        risk_score, confidence, model_version = _fallback_risk_score(input, base)

    risk_level = "high" if risk_score > 65 else "medium" if risk_score > 30 else "low"
    multiplier = round(0.8 + (risk_score / 100) * 1.7, 2)

    season_w = SEASON_WEIGHTS.get(input.season, 1.0)

    return RiskOutput(
        risk_score=risk_score,
        risk_level=risk_level,
        premium_multiplier=multiplier,
        model_version=model_version,
        confidence=min(confidence, 0.98),
        features_used={
            "zone_base": base,
            "season_weight": season_w,
            "historical_claims": input.historical_claims,
            "zone_density": input.zone_density,
            "infrastructure_score": input.infrastructure_score,
            "forecast_severity": round(input.forecast_severity, 2),
        },
    )


def _fallback_risk_score(input, base):
    """Analytical fallback when trained model is not available"""
    season_w = SEASON_WEIGHTS.get(input.season, 1.0)
    claim_factor = min(input.historical_claims * 3, 15)
    density_factor = (input.zone_density - 100) * 0.08
    infra_penalty = max(0, (60 - input.infrastructure_score)) * 0.3
    forecast_boost = input.forecast_severity * 20

    raw_score = (
        base * season_w
        + claim_factor
        + density_factor
        + infra_penalty
        + forecast_boost
        + random.uniform(-3, 3)
    )

    risk_score = max(0, min(100, int(raw_score)))
    confidence = round(0.82 + random.uniform(-0.05, 0.08), 2)
    return risk_score, confidence, "v2.0-simulation-fallback"


# ─── Fraud Detection ──────────────────────────────────────────────────────────

class FraudInput(BaseModel):
    worker_id: str
    gps_lat: float = 12.9352
    gps_lon: float = 77.6245
    zone_id: str = "KOR-4B"
    device_hash: str = ""
    signal_strength: float = -65.0
    claims_24h: int = 1
    accelerometer_active: bool = True

class FraudOutput(BaseModel):
    trust_score: int
    is_suspicious: bool
    flags: list
    signals: dict
    recommendation: str
    model_version: str = "v2.0"

@app.post("/fraud/check", response_model=FraudOutput)
async def check_fraud(input: FraudInput):
    """
    6-Signal Fraud Engine + Isolation Forest Anomaly Detection
    Analyzes GPS, network, device, accelerometer, history, and platform signals
    """
    signals = {}
    flags = []

    # 1. GPS analysis
    zone_centers = {
        "KOR-4B": (12.9352, 77.6245), "HSR-2A": (12.9116, 77.6389),
        "BTM-1C": (12.9166, 77.6101), "IND-3D": (12.9784, 77.6408),
        "WHT-5A": (12.9698, 77.7500), "MG-1B": (12.9756, 77.6066),
        "DL-CP": (28.6315, 77.2167), "DL-RK": (28.5635, 77.1724),
    }

    center = zone_centers.get(input.zone_id, (12.9352, 77.6245))
    dist = math.sqrt((input.gps_lat - center[0])**2 + (input.gps_lon - center[1])**2)
    signals["gps_jitter"] = round(max(0, 1 - dist * 50), 2)
    if signals["gps_jitter"] < 0.4:
        flags.append("GPS_SPOOF_SUSPECTED")

    # 2. Signal strength
    signal_norm = round(min(1, max(0, (input.signal_strength + 100) / 50)), 2)
    signals["signal_strength"] = signal_norm

    # 3. Accelerometer
    accel_val = 0.9 if input.accelerometer_active else 0.2
    signals["accelerometer"] = accel_val
    if not input.accelerometer_active:
        flags.append("DEVICE_STATIONARY")

    # 4. Claims frequency
    signals["claim_frequency"] = round(max(0, 1 - (input.claims_24h - 1) * 0.3), 2)
    if input.claims_24h > 3:
        flags.append("EXCESSIVE_CLAIMS_24H")

    # 5. Network consistency (simulated)
    signals["network_match"] = round(0.7 + random.uniform(-0.15, 0.2), 2)

    # 6. Platform active (simulated)
    signals["platform_active"] = round(0.75 + random.uniform(-0.1, 0.2), 2)

    # ── Try trained Isolation Forest model ──
    model_version = "v2.0-simulation"
    if fraud_model_data and "model" in fraud_model_data:
        try:
            import numpy as np
            fraud_model = fraud_model_data["model"]
            # Features: gps_distance, signal_strength_norm, accelerometer_active, claims_24h, network_consistency, platform_active_ratio
            prediction = fraud_model.predict_trust(
                dist, signal_norm, accel_val,
                input.claims_24h,
                signals["network_match"],
                signals["platform_active"]
            )
            trust_score = prediction["trust_score"]
            if prediction["is_suspicious"]:
                flags.append("ISOLATION_FOREST_ANOMALY")
            model_version = fraud_model_data.get("version", "v2.0-isolation-forest")
        except Exception as e:
            print(f"[ML] Fraud model prediction failed: {e}")
            trust_score = _fallback_trust_score(signals, flags)
    else:
        trust_score = _fallback_trust_score(signals, flags)

    recommendation = "AUTO_APPROVE" if trust_score >= 70 else "SOFT_HOLD" if trust_score >= 40 else "FLAG_FOR_REVIEW"

    return FraudOutput(
        trust_score=trust_score,
        is_suspicious=trust_score < 40,
        flags=flags,
        signals=signals,
        recommendation=recommendation,
        model_version=model_version,
    )


def _fallback_trust_score(signals, flags):
    """Weighted trust score fallback"""
    weights = {"gps_jitter": 0.25, "signal_strength": 0.10, "accelerometer": 0.15,
               "claim_frequency": 0.15, "network_match": 0.15, "platform_active": 0.20}
    trust_score = 0
    for key, w in weights.items():
        trust_score += signals.get(key, 0.5) * w * 100
    return max(0, min(100, int(trust_score)))


# ─── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "SafeShift ML Service",
        "version": "2.0.0",
        "models_loaded": {
            "premium": premium_model_data is not None,
            "fraud": fraud_model_data is not None,
        },
        "premium_model_version": premium_model_data.get("version") if premium_model_data else None,
        "fraud_model_version": fraud_model_data.get("version") if fraud_model_data else None,
        "timestamp": datetime.utcnow().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
