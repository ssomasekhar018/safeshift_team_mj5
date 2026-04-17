"""
SafeShift ML Microservice — FastAPI
Risk scoring model (XGBoost / Gradient Boosting) + fraud detection (Isolation Forest)
Automatically loads trained .pkl models if present; falls back to math simulation otherwise.
Runs on port 8000
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import math
import os
import pickle
from datetime import datetime
from typing import Optional

from train.train_premium import GradientBoostingRiskModel
from train.train_fraud import IsolationForestFraudModel, IsolationTree as BaseIsolationTree


# Backward-compatible aliases for previously pickled class names.
class GradientBoosttingRiskModel(GradientBoostingRiskModel):
    pass


class IsolationForesttFraudModel(IsolationForestFraudModel):
    pass


class IsolationTree(BaseIsolationTree):
    pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_models()
    yield


app = FastAPI(title="SafeShift ML Service", version="2.0.0", lifespan=lifespan)

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
            print(f"[ML] Loaded premium model: {premium_model_data.get('version', 'unknown')}")
            print(f"     Metrics: {premium_model_data.get('metrics', {})}")
        except Exception as e:
            print(f"[ML] Failed to load premium model: {e}")
    else:
        print("[ML] No premium_model.pkl found, using simulation fallback")

    if os.path.exists(fraud_path):
        try:
            with open(fraud_path, "rb") as f:
                fraud_model_data = pickle.load(f)
            print(f"[ML] Loaded fraud model: {fraud_model_data.get('version', 'unknown')}")
            print(f"     Metrics: {fraud_model_data.get('metrics', {})}")
        except Exception as e:
            print(f"[ML] Failed to load fraud model: {e}")
    else:
        print("[ML] No fraud_model.pkl found, using simulation fallback")

# ─── Zone Risk Model ──────────────────────────────────────────────────────────

# City tier classification for premium calculation
CITY_TIERS = {
    "tier_1": {
        "cities": ["Bangalore", "Delhi", "Mumbai", "Hyderabad"],
        "multiplier": 1.0,
        "infrastructure_score": 75,
    },
    "tier_2": {
        "cities": ["Pune", "Chennai", "Kolkata", "Ahmedabad"],
        "multiplier": 0.85,
        "infrastructure_score": 65,
    },
    "tier_3": {
        "cities": ["Jaipur", "Lucknow", "Indore", "Bhopal"],
        "multiplier": 0.70,
        "infrastructure_score": 55,
    },
}

# Zone risk profiles with flood frequency, drainage, and density
ZONE_RISK_PROFILES = {
    "KOR-4B": {"flood_freq": 0.15, "drainage_score": 65, "population_density": 18000},
    "HSR-2A": {"flood_freq": 0.12, "drainage_score": 70, "population_density": 15000},
    "BTM-1C": {"flood_freq": 0.10, "drainage_score": 75, "population_density": 12000},
    "IND-3D": {"flood_freq": 0.08, "drainage_score": 80, "population_density": 14000},
    "WHT-5A": {"flood_freq": 0.18, "drainage_score": 60, "population_density": 20000},
    "MG-1B": {"flood_freq": 0.14, "drainage_score": 68, "population_density": 16000},
    "DL-CP": {"flood_freq": 0.20, "drainage_score": 55, "population_density": 22000},
    "DL-RK": {"flood_freq": 0.22, "drainage_score": 50, "population_density": 25000},
}

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


def get_city_tier(city_name: str) -> str:
    """
    Get city tier classification
    @param city_name: Name of the city
    @returns: tier classification (tier_1, tier_2, or tier_3)
    """
    city_name = city_name.strip().title()
    for tier, data in CITY_TIERS.items():
        if city_name in data["cities"]:
            return tier
    # Default to tier_2 if city not found
    return "tier_2"


def get_season_factor() -> float:
    """
    Get current season factor based on date
    @returns: season multiplier (1.0, 1.15, or 1.4)
    """
    current_month = datetime.utcnow().month
    
    # Monsoon season: June-September (months 6-9)
    if 6 <= current_month <= 9:
        return SEASON_WEIGHTS["monsoon"]
    
    # Winter season: November-February (months 11, 12, 1, 2)
    if current_month in [11, 12, 1, 2]:
        return SEASON_WEIGHTS["winter"]
    
    # Normal season: rest of the year
    return SEASON_WEIGHTS["normal"]

class RiskInput(BaseModel):
    zone_id: str = "KOR-4B"
    season: str = "normal"
    historical_claims: int = 0
    zone_density: int = 100
    infrastructure_score: int = 50
    forecast_severity: float = 0.3
    city: Optional[str] = "Bangalore"

class RiskOutput(BaseModel):
    risk_score: int
    risk_level: str
    premium_multiplier: float
    model_version: str = "v2.0-gradient-boost"
    confidence: float
    city_tier: str
    season_factor: float
    features_used: dict

@app.post("/score", response_model=RiskOutput)
async def score_risk(input: RiskInput):
    """
    AI Risk Scoring — Uses trained Gradient Boosting model if available,
    otherwise falls back to analytical simulation.
    Features: zone base risk, season, claim history, density, infrastructure, forecast, city tier
    """
    base = ZONE_BASE_RISK.get(input.zone_id, 50)
    season_code = SEASON_MAP.get(input.season, 0)
    
    # Calculate city tier and season factor
    city_tier = get_city_tier(input.city)
    season_factor = get_season_factor()
    tier_multiplier = CITY_TIERS[city_tier]["multiplier"]

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
            # Apply city tier multiplier to risk score
            risk_score = int(risk_score * tier_multiplier)
            risk_score = max(0, min(100, risk_score))
            confidence = round(0.85 + random.uniform(-0.03, 0.05), 2)
            model_version = premium_model_data.get("version", "v2.0-gradient-boost")
        except Exception as e:
            print(f"[ML] Model prediction failed, using fallback: {e}")
            risk_score, confidence, model_version = _fallback_risk_score(input, base, tier_multiplier)
    else:
        risk_score, confidence, model_version = _fallback_risk_score(input, base, tier_multiplier)

    risk_level = "high" if risk_score > 65 else "medium" if risk_score > 30 else "low"
    multiplier = round(0.8 + (risk_score / 100) * 1.7, 2)

    season_w = SEASON_WEIGHTS.get(input.season, 1.0)

    return RiskOutput(
        risk_score=risk_score,
        risk_level=risk_level,
        premium_multiplier=multiplier,
        model_version=model_version,
        confidence=min(confidence, 0.98),
        city_tier=city_tier,
        season_factor=season_factor,
        features_used={
            "zone_base": base,
            "season_weight": season_w,
            "season_factor": season_factor,
            "city_tier": city_tier,
            "tier_multiplier": tier_multiplier,
            "historical_claims": input.historical_claims,
            "zone_density": input.zone_density,
            "infrastructure_score": input.infrastructure_score,
            "forecast_severity": round(input.forecast_severity, 2),
        },
    )


def _fallback_risk_score(input, base, tier_multiplier=1.0):
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
    
    # Apply city tier multiplier
    raw_score = raw_score * tier_multiplier

    risk_score = max(0, min(100, int(raw_score)))
    confidence = round(0.82 + random.uniform(-0.05, 0.08), 2)
    return risk_score, confidence, "v2.0-simulation-fallback"


# ─── Fraud Detection ──────────────────────────────────────────────────────────

class ClaimLocation(BaseModel):
    claim_id: str
    gps_lat: float
    gps_lon: float

class RingDetectInput(BaseModel):
    claims: list[ClaimLocation]
    eps: float = 0.01  # DBSCAN epsilon parameter (distance threshold in degrees)
    min_samples: int = 3  # Minimum samples to form a cluster

class RingDetectOutput(BaseModel):
    dbscan_clusters: int
    cluster_sizes: dict
    suspicious_clusters: list
    model_version: str = "v2.0-dbscan"
    total_claims: int
    noise_points: int

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
    isolation_forest_score: float = 0.0

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
    isolation_forest_score = 0.0
    
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
            isolation_forest_score = prediction.get("isolation_forest_score", 0.0)
            if prediction["is_suspicious"]:
                flags.append("ISOLATION_FOREST_ANOMALY")
            model_version = fraud_model_data.get("version", "v2.0-isolation-forest")
        except Exception as e:
            print(f"[ML] Fraud model prediction failed: {e}")
            trust_score = _fallback_trust_score(signals, flags)
            # Calculate isolation forest score using analytical method
            isolation_forest_score = _calculate_isolation_score(dist, signal_norm, accel_val, input.claims_24h)
    else:
        trust_score = _fallback_trust_score(signals, flags)
        # Calculate isolation forest score using analytical method
        isolation_forest_score = _calculate_isolation_score(dist, signal_norm, accel_val, input.claims_24h)

    recommendation = "AUTO_APPROVE" if trust_score >= 70 else "SOFT_HOLD" if trust_score >= 40 else "FLAG_FOR_REVIEW"

    return FraudOutput(
        trust_score=trust_score,
        is_suspicious=trust_score < 40,
        flags=flags,
        signals=signals,
        recommendation=recommendation,
        model_version=model_version,
        isolation_forest_score=round(isolation_forest_score, 3),
    )


def _fallback_trust_score(signals, flags):
    """Weighted trust score fallback"""
    weights = {"gps_jitter": 0.25, "signal_strength": 0.10, "accelerometer": 0.15,
               "claim_frequency": 0.15, "network_match": 0.15, "platform_active": 0.20}
    trust_score = 0
    for key, w in weights.items():
        trust_score += signals.get(key, 0.5) * w * 100
    return max(0, min(100, int(trust_score)))


def _calculate_isolation_score(gps_dist, signal_norm, accel_val, claims_24h):
    """
    Calculate isolation forest anomaly score using analytical method
    Returns score in range [-1, 1] where negative values indicate anomalies
    """
    # Normalize features to [0, 1] range
    gps_anomaly = min(gps_dist * 10, 1.0)  # Higher distance = more anomalous
    signal_anomaly = 1.0 - signal_norm  # Lower signal = more anomalous
    accel_anomaly = 0.0 if accel_val > 0.5 else 0.8  # Stationary = anomalous
    claims_anomaly = min(claims_24h / 5.0, 1.0)  # More claims = more anomalous
    
    # Weighted combination (higher = more anomalous)
    combined_anomaly = (
        gps_anomaly * 0.3 +
        signal_anomaly * 0.2 +
        accel_anomaly * 0.25 +
        claims_anomaly * 0.25
    )
    
    # Convert to isolation forest score range [-1, 1]
    # Normal behavior: positive scores (0 to 1)
    # Anomalous behavior: negative scores (-1 to 0)
    isolation_score = 1.0 - (combined_anomaly * 2.0)
    
    return max(-1.0, min(1.0, isolation_score))


# ─── Ring Detection (DBSCAN Clustering) ───────────────────────────────────────

@app.post("/ring-detect", response_model=RingDetectOutput)
async def detect_rings(input: RingDetectInput):
    """
    Ring Detection using DBSCAN Clustering Algorithm
    Identifies suspicious clusters of claims with similar GPS coordinates
    """
    if len(input.claims) < input.min_samples:
        return RingDetectOutput(
            dbscan_clusters=0,
            cluster_sizes={},
            suspicious_clusters=[],
            model_version="v2.0-dbscan",
            total_claims=len(input.claims),
            noise_points=len(input.claims),
        )
    
    try:
        # Try using sklearn DBSCAN if available
        from sklearn.cluster import DBSCAN
        import numpy as np
        
        # Extract coordinates
        coordinates = np.array([[claim.gps_lat, claim.gps_lon] for claim in input.claims])
        
        # Run DBSCAN clustering
        dbscan = DBSCAN(eps=input.eps, min_samples=input.min_samples, metric='euclidean')
        labels = dbscan.fit_predict(coordinates)
        
        # Analyze clusters
        unique_labels = set(labels)
        n_clusters = len(unique_labels) - (1 if -1 in unique_labels else 0)
        n_noise = list(labels).count(-1)
        
        # Calculate cluster sizes
        cluster_sizes = {}
        suspicious_clusters = []
        
        for label in unique_labels:
            if label == -1:
                continue  # Skip noise points
            
            cluster_mask = labels == label
            cluster_size = int(cluster_mask.sum())
            cluster_sizes[f"cluster_{label}"] = cluster_size
            
            # Mark clusters with >= min_samples as suspicious
            if cluster_size >= input.min_samples:
                cluster_claims = [
                    input.claims[i].claim_id 
                    for i in range(len(input.claims)) 
                    if labels[i] == label
                ]
                suspicious_clusters.append({
                    "cluster_id": f"cluster_{label}",
                    "size": cluster_size,
                    "claim_ids": cluster_claims[:10],  # Limit to first 10 for response size
                })
        
        return RingDetectOutput(
            dbscan_clusters=n_clusters,
            cluster_sizes=cluster_sizes,
            suspicious_clusters=suspicious_clusters,
            model_version="v2.0-dbscan-sklearn",
            total_claims=len(input.claims),
            noise_points=n_noise,
        )
        
    except ImportError:
        # Fallback: simple distance-based clustering
        print("[ML] sklearn not available, using distance-based fallback")
        return _fallback_ring_detection(input)
    except Exception as e:
        print(f"[ML] DBSCAN clustering failed: {e}")
        return _fallback_ring_detection(input)


def _fallback_ring_detection(input: RingDetectInput):
    """
    Fallback ring detection using simple distance-based clustering
    """
    import math
    
    claims = input.claims
    visited = [False] * len(claims)
    clusters = []
    
    def distance(c1, c2):
        """Calculate Euclidean distance between two claims"""
        return math.sqrt(
            (c1.gps_lat - c2.gps_lat) ** 2 + 
            (c1.gps_lon - c2.gps_lon) ** 2
        )
    
    # Simple clustering: group claims within eps distance
    for i in range(len(claims)):
        if visited[i]:
            continue
        
        cluster = [i]
        visited[i] = True
        
        for j in range(i + 1, len(claims)):
            if visited[j]:
                continue
            
            # Check if claim j is within eps of any claim in current cluster
            for cluster_idx in cluster:
                if distance(claims[cluster_idx], claims[j]) <= input.eps:
                    cluster.append(j)
                    visited[j] = True
                    break
        
        if len(cluster) >= input.min_samples:
            clusters.append(cluster)
    
    # Build response
    cluster_sizes = {}
    suspicious_clusters = []
    
    for idx, cluster in enumerate(clusters):
        cluster_sizes[f"cluster_{idx}"] = len(cluster)
        suspicious_clusters.append({
            "cluster_id": f"cluster_{idx}",
            "size": len(cluster),
            "claim_ids": [claims[i].claim_id for i in cluster[:10]],
        })
    
    noise_points = sum(1 for v in visited if not v)
    
    return RingDetectOutput(
        dbscan_clusters=len(clusters),
        cluster_sizes=cluster_sizes,
        suspicious_clusters=suspicious_clusters,
        model_version="v2.0-distance-fallback",
        total_claims=len(claims),
        noise_points=noise_points,
    )


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
