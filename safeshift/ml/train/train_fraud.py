"""
SafeShift — Fraud Detection Model Training
Trains an Isolation Forest-based anomaly detection model for fraud scoring.
Features: gps_distance, signal_strength, accelerometer_noise, claims_24h, network_consistency, platform_active_ratio
Target: anomaly score (0-1, higher = more suspicious)

Usage: python train_fraud.py
Output: ../models/fraud_model.pkl
"""
import pickle
import os
import numpy as np
from datetime import datetime


class IsolationTree:
    """Single tree in the Isolation Forest"""

    def __init__(self, max_depth=10):
        self.max_depth = max_depth
        self.tree = None

    def _build(self, X, depth=0):
        n_samples, n_features = X.shape

        if depth >= self.max_depth or n_samples <= 2:
            return {"type": "leaf", "size": n_samples}

        feature = np.random.randint(0, n_features)
        min_val = X[:, feature].min()
        max_val = X[:, feature].max()

        if min_val == max_val:
            return {"type": "leaf", "size": n_samples}

        threshold = np.random.uniform(min_val, max_val)

        left_mask = X[:, feature] < threshold
        right_mask = ~left_mask

        if left_mask.sum() == 0 or right_mask.sum() == 0:
            return {"type": "leaf", "size": n_samples}

        return {
            "type": "node",
            "feature": int(feature),
            "threshold": float(threshold),
            "left": self._build(X[left_mask], depth + 1),
            "right": self._build(X[right_mask], depth + 1),
        }

    def fit(self, X, sample_size=256):
        if len(X) > sample_size:
            idx = np.random.choice(len(X), sample_size, replace=False)
            X_sample = X[idx]
        else:
            X_sample = X
        self.tree = self._build(X_sample)
        return self

    def _path_length(self, x, node, depth=0):
        if node["type"] == "leaf":
            n = node["size"]
            if n <= 1:
                return depth
            # Average path length for BST
            c = 2.0 * (np.log(n - 1) + 0.5772156649) - (2.0 * (n - 1) / n)
            return depth + c

        if x[node["feature"]] < node["threshold"]:
            return self._path_length(x, node["left"], depth + 1)
        else:
            return self._path_length(x, node["right"], depth + 1)

    def path_length(self, x):
        return self._path_length(x, self.tree)


class IsolationForestFraudModel:
    """
    Isolation Forest for fraud anomaly detection.
    Anomalies have shorter average path lengths.
    """

    def __init__(self, n_estimators=100, max_depth=10, sample_size=256):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.sample_size = sample_size
        self.trees = []
        self.n_training_samples = 0
        self.feature_names = [
            "gps_distance", "signal_strength_norm", "accelerometer_active",
            "claims_24h", "network_consistency", "platform_active_ratio"
        ]

    def fit(self, X):
        """Train the isolation forest"""
        self.n_training_samples = len(X)
        self.trees = []

        for i in range(self.n_estimators):
            tree = IsolationTree(max_depth=self.max_depth)
            tree.fit(X, sample_size=self.sample_size)
            self.trees.append(tree)

            if (i + 1) % 25 == 0:
                print(f"  Built {i+1}/{self.n_estimators} isolation trees")

        return self

    def anomaly_score(self, X):
        """
        Compute anomaly scores.
        Score close to 1.0 = anomaly (fraud), close to 0.0 = normal.
        """
        if X.ndim == 1:
            X = X.reshape(1, -1)

        n = self.sample_size
        c_n = 2.0 * (np.log(n - 1) + 0.5772156649) - (2.0 * (n - 1) / n)

        scores = []
        for x in X:
            avg_path = np.mean([tree.path_length(x) for tree in self.trees])
            score = 2 ** (-avg_path / c_n)
            scores.append(score)

        return np.array(scores)

    def predict_trust(self, gps_dist, signal_str, accel, claims_24h, net_consist, platform_active):
        """
        Convert anomaly score to trust score (0-100).
        Low anomaly = high trust, high anomaly = low trust.
        """
        X = np.array([[gps_dist, signal_str, accel, claims_24h, net_consist, platform_active]])
        anomaly = float(self.anomaly_score(X)[0])

        # Invert: anomaly close to 1 → trust close to 0
        trust = int(max(0, min(100, (1 - anomaly) * 120 - 10)))
        is_suspicious = trust < 40

        return {
            "trust_score": trust,
            "anomaly_score": round(anomaly, 4),
            "is_suspicious": is_suspicious,
            "recommendation": "AUTO_APPROVE" if trust >= 70 else "SOFT_HOLD" if trust >= 40 else "FLAG_FOR_REVIEW"
        }


def generate_training_data(n_normal=4000, n_fraud=500):
    """Generate synthetic normal + fraud behavior data"""
    np.random.seed(42)

    # Normal workers — in zone, active, low claims
    normal = np.column_stack([
        np.random.exponential(0.005, n_normal),       # GPS distance (small = in zone)
        np.random.uniform(0.5, 1.0, n_normal),        # Signal strength normalized
        np.random.choice([0.8, 0.9, 1.0], n_normal),  # Accelerometer active
        np.random.poisson(1, n_normal),                # Claims in 24h
        np.random.uniform(0.6, 1.0, n_normal),        # Network consistency
        np.random.uniform(0.7, 1.0, n_normal),        # Platform active ratio
    ])

    # Fraudsters — spoofed GPS, stationary, many claims
    fraud = np.column_stack([
        np.random.uniform(0.02, 0.5, n_fraud),        # GPS far from zone
        np.random.uniform(0.0, 0.5, n_fraud),         # Weak/fake signal
        np.random.choice([0.0, 0.1, 0.2], n_fraud),   # Device stationary
        np.random.poisson(5, n_fraud),                 # Many claims
        np.random.uniform(0.0, 0.4, n_fraud),         # Inconsistent network
        np.random.uniform(0.0, 0.3, n_fraud),         # Not active on platform
    ])

    X = np.vstack([normal, fraud])
    labels = np.concatenate([np.zeros(n_normal), np.ones(n_fraud)])

    # Shuffle
    idx = np.random.permutation(len(X))
    return X[idx], labels[idx]


def train_and_save():
    print("=" * 60)
    print("SafeShift Fraud Detection Model — Training")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()

    # Generate data
    print("[1/4] Generating synthetic behavior data...")
    X, y = generate_training_data(4000, 500)
    print(f"  Total samples: {len(X)} (normal: {int((y==0).sum())}, fraud: {int((y==1).sum())})")
    print()

    # Train isolation forest on normal data only (unsupervised)
    print("[2/4] Training Isolation Forest (100 trees)...")
    normal_data = X[y == 0]
    model = IsolationForestFraudModel(n_estimators=100, max_depth=10, sample_size=256)
    model.fit(normal_data)
    print()

    # Evaluate
    print("[3/4] Evaluating model...")
    scores_normal = model.anomaly_score(X[y == 0])
    scores_fraud = model.anomaly_score(X[y == 1])

    # A good model should give higher anomaly scores to fraud
    normal_avg = float(np.mean(scores_normal))
    fraud_avg = float(np.mean(scores_fraud))
    separation = fraud_avg - normal_avg

    # Simple AUC approximation
    threshold = 0.5
    tp = (scores_fraud >= threshold).sum()
    fn = (scores_fraud < threshold).sum()
    fp = (scores_normal >= threshold).sum()
    tn = (scores_normal < threshold).sum()
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    print(f"  Normal avg anomaly score: {normal_avg:.4f}")
    print(f"  Fraud avg anomaly score:  {fraud_avg:.4f}")
    print(f"  Score separation:         {separation:.4f}")
    print(f"  Precision: {precision:.4f}, Recall: {recall:.4f}, F1: {f1:.4f}")
    print()

    # Save
    print("[4/4] Saving model...")
    models_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, "fraud_model.pkl")

    model_data = {
        "model": model,
        "version": "v2.0-isolation-forest",
        "trained_at": datetime.now().isoformat(),
        "metrics": {
            "normal_avg_anomaly": normal_avg,
            "fraud_avg_anomaly": fraud_avg,
            "separation": separation,
            "precision": float(precision),
            "recall": float(recall),
            "f1": float(f1),
        },
        "features": model.feature_names,
        "n_estimators": model.n_estimators,
        "training_samples": len(normal_data),
    }

    with open(model_path, "wb") as f:
        pickle.dump(model_data, f)

    print(f"  Saved to: {model_path}")
    print(f"  Size: {os.path.getsize(model_path)} bytes")
    print()
    print("[OK] Fraud detection model training complete!")
    return model


if __name__ == "__main__":
    train_and_save()
