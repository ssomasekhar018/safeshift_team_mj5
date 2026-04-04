"""
SafeShift — Premium Risk Model Training
Trains an XGBoost Gradient Boosting model for zone-level risk scoring.
Features: zone_base_risk, season, historical_claims, zone_density, infrastructure_score, forecast_severity
Target: risk_score (0-100)

Usage: python train_premium.py
Output: ../models/premium_model.pkl
"""
import pickle
import os
import numpy as np
from datetime import datetime

# ─── Synthetic training data generator ─────────────────────────────────────────
# In production, this would be historical claims + weather data

ZONE_BASE_RISK = {
    "KOR-4B": 62, "HSR-2A": 55, "BTM-1C": 45, "IND-3D": 38,
    "WHT-5A": 71, "MG-1B": 58, "DL-CP": 68, "DL-RK": 75,
    "JAY-6C": 48, "ELC-2B": 42,
}

SEASON_MAP = {"monsoon": 2, "winter": 1, "normal": 0}

def generate_training_data(n_samples=5000):
    """Generate synthetic training data mimicking real-world patterns"""
    np.random.seed(42)

    zones = list(ZONE_BASE_RISK.keys())
    seasons = list(SEASON_MAP.keys())

    X = []
    y = []

    for _ in range(n_samples):
        zone = np.random.choice(zones)
        season = np.random.choice(seasons, p=[0.35, 0.25, 0.40])  # monsoon-heavy

        zone_base = ZONE_BASE_RISK[zone]
        season_code = SEASON_MAP[season]
        hist_claims = np.random.poisson(3)
        density = int(np.random.normal(120, 30))
        infra = int(np.random.normal(55, 15))
        forecast = np.random.beta(2, 5)  # Skewed towards lower severity

        # Target: computed risk with some noise
        season_w = {0: 1.0, 1: 1.15, 2: 1.4}[season_code]
        risk = (
            zone_base * season_w
            + min(hist_claims * 3, 15)
            + (density - 100) * 0.08
            + max(0, (60 - infra)) * 0.3
            + forecast * 20
            + np.random.normal(0, 4)
        )
        risk = max(0, min(100, risk))

        X.append([zone_base, season_code, hist_claims, density, infra, forecast])
        y.append(risk)

    return np.array(X), np.array(y)


class GradientBoostingRiskModel:
    """
    Lightweight Gradient Boosting implementation for risk scoring.
    Uses decision stumps (depth=1) as weak learners.
    """

    def __init__(self, n_estimators=100, learning_rate=0.1, max_depth=3):
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.max_depth = max_depth
        self.trees = []
        self.initial_prediction = 0
        self.feature_names = [
            "zone_base_risk", "season", "historical_claims",
            "zone_density", "infrastructure_score", "forecast_severity"
        ]

    def _build_stump(self, X, residuals):
        """Build a simple decision stump (depth-1 tree)"""
        best_feature = 0
        best_threshold = 0
        best_left_val = 0
        best_right_val = 0
        best_mse = float('inf')

        n_samples, n_features = X.shape

        for feature in range(n_features):
            thresholds = np.percentile(X[:, feature], [25, 50, 75])
            for threshold in thresholds:
                left_mask = X[:, feature] <= threshold
                right_mask = ~left_mask

                if left_mask.sum() < 2 or right_mask.sum() < 2:
                    continue

                left_val = residuals[left_mask].mean()
                right_val = residuals[right_mask].mean()

                predictions = np.where(left_mask, left_val, right_val)
                mse = np.mean((residuals - predictions) ** 2)

                if mse < best_mse:
                    best_mse = mse
                    best_feature = feature
                    best_threshold = threshold
                    best_left_val = left_val
                    best_right_val = right_val

        return {
            "feature": best_feature,
            "threshold": float(best_threshold),
            "left_val": float(best_left_val),
            "right_val": float(best_right_val),
        }

    def fit(self, X, y):
        """Train the gradient boosting model"""
        self.initial_prediction = float(np.mean(y))
        predictions = np.full(len(y), self.initial_prediction)

        for i in range(self.n_estimators):
            residuals = y - predictions
            stump = self._build_stump(X, residuals)
            self.trees.append(stump)

            # Update predictions
            mask = X[:, stump["feature"]] <= stump["threshold"]
            update = np.where(mask, stump["left_val"], stump["right_val"])
            predictions += self.learning_rate * update

            if (i + 1) % 20 == 0:
                mse = np.mean((y - predictions) ** 2)
                print(f"  Iteration {i+1}/{self.n_estimators}, MSE: {mse:.4f}")

        return self

    def predict(self, X):
        """Score risk for input features"""
        if X.ndim == 1:
            X = X.reshape(1, -1)

        predictions = np.full(X.shape[0], self.initial_prediction)

        for stump in self.trees:
            mask = X[:, stump["feature"]] <= stump["threshold"]
            update = np.where(mask, stump["left_val"], stump["right_val"])
            predictions += self.learning_rate * update

        return np.clip(predictions, 0, 100)

    def score_single(self, zone_base, season_code, hist_claims, density, infra, forecast):
        """Score a single zone"""
        X = np.array([[zone_base, season_code, hist_claims, density, infra, forecast]])
        return float(self.predict(X)[0])


def train_and_save():
    print("=" * 60)
    print("SafeShift Premium Risk Model — Training")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()

    # Generate data
    print("[1/4] Generating synthetic training data...")
    X, y = generate_training_data(5000)
    print(f"  Samples: {len(X)}, Features: {X.shape[1]}")
    print(f"  Risk score range: {y.min():.1f} - {y.max():.1f}")
    print()

    # Split
    split = int(0.8 * len(X))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    # Train
    print("[2/4] Training Gradient Boosting model (100 estimators)...")
    model = GradientBoostingRiskModel(n_estimators=100, learning_rate=0.1)
    model.fit(X_train, y_train)
    print()

    # Evaluate
    print("[3/4] Evaluating model...")
    preds = model.predict(X_test)
    mse = np.mean((y_test - preds) ** 2)
    mae = np.mean(np.abs(y_test - preds))
    r2 = 1 - (np.sum((y_test - preds) ** 2) / np.sum((y_test - np.mean(y_test)) ** 2))
    print(f"  Test MSE:  {mse:.4f}")
    print(f"  Test MAE:  {mae:.4f}")
    print(f"  Test R²:   {r2:.4f}")
    print()

    # Save
    print("[4/4] Saving model...")
    models_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, "premium_model.pkl")

    model_data = {
        "model": model,
        "version": "v2.0-gradient-boost",
        "trained_at": datetime.now().isoformat(),
        "metrics": {"mse": float(mse), "mae": float(mae), "r2": float(r2)},
        "features": model.feature_names,
        "n_estimators": model.n_estimators,
        "samples_used": len(X_train),
    }

    with open(model_path, "wb") as f:
        pickle.dump(model_data, f)

    print(f"  Saved to: {model_path}")
    print(f"  Size: {os.path.getsize(model_path)} bytes")
    print()
    print("[OK] Premium risk model training complete!")
    return model


if __name__ == "__main__":
    train_and_save()
