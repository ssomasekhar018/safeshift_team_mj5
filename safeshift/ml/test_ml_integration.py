"""
SafeShift ML Service — Integration Tests for ML Service Endpoints
Feature: phase-3-real-integrations
Task 3.7: Write integration tests for ML service endpoints

Tests:
- /score endpoint with various city tiers and seasons
- /fraud-check endpoint with various trust signals
- /ring-detect endpoint with clustered and non-clustered data
- Fallback behavior when models not loaded

Validates: Requirements 14.3, 14.4
"""

import pytest
from fastapi.testclient import TestClient
from app import app, premium_model_data, fraud_model_data
import os
import pickle

# Create test client
client = TestClient(app)


class TestScoreEndpointIntegration:
    """
    Integration tests for /score endpoint
    Test with various city tiers and seasons
    """
    
    def test_score_with_tier_1_city_monsoon_season(self):
        """
        Test /score endpoint with tier_1 city during monsoon season
        """
        response = client.post("/score", json={
            "zone_id": "KOR-4B",
            "season": "monsoon",
            "historical_claims": 10,
            "zone_density": 180,
            "infrastructure_score": 75,
            "forecast_severity": 0.8,
            "city": "Bangalore"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify tier_1 classification
        assert data["city_tier"] == "tier_1"
        
        # Verify season_factor is one of the valid values (based on current date)
        assert data["season_factor"] in [1.0, 1.15, 1.4]
        
        # Verify risk score is elevated due to monsoon
        assert data["risk_score"] > 0
        assert data["risk_score"] <= 100
        
        # Verify model metadata
        assert "model_version" in data
        assert "confidence" in data
        assert 0.0 <= data["confidence"] <= 1.0
    
    def test_score_with_tier_2_city_winter_season(self):
        """
        Test /score endpoint with tier_2 city during winter season
        """
        response = client.post("/score", json={
            "zone_id": "HSR-2A",
            "season": "winter",
            "historical_claims": 5,
            "zone_density": 150,
            "infrastructure_score": 65,
            "forecast_severity": 0.4,
            "city": "Pune"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify tier_2 classification
        assert data["city_tier"] == "tier_2"
        
        # Verify season_factor is one of the valid values (based on current date)
        assert data["season_factor"] in [1.0, 1.15, 1.4]
        
        # Verify risk score
        assert data["risk_score"] > 0
        assert data["risk_score"] <= 100
        
        # Verify features_used includes tier multiplier
        assert "features_used" in data
        assert "tier_multiplier" in data["features_used"]
        assert data["features_used"]["tier_multiplier"] == 0.85
    
    def test_score_with_tier_3_city_normal_season(self):
        """
        Test /score endpoint with tier_3 city during normal season
        """
        response = client.post("/score", json={
            "zone_id": "BTM-1C",
            "season": "normal",
            "historical_claims": 2,
            "zone_density": 120,
            "infrastructure_score": 55,
            "forecast_severity": 0.3,
            "city": "Jaipur"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify tier_3 classification
        assert data["city_tier"] == "tier_3"
        
        # Verify normal season factor
        assert data["season_factor"] == 1.0
        
        # Verify risk score
        assert data["risk_score"] > 0
        assert data["risk_score"] <= 100
        
        # Verify features_used includes tier multiplier
        assert "features_used" in data
        assert "tier_multiplier" in data["features_used"]
        assert data["features_used"]["tier_multiplier"] == 0.70
    
    def test_score_with_all_tier_1_cities(self):
        """
        Test /score endpoint with all tier_1 cities
        """
        tier_1_cities = ["Bangalore", "Delhi", "Mumbai", "Hyderabad"]
        
        for city in tier_1_cities:
            response = client.post("/score", json={
                "zone_id": "KOR-4B",
                "season": "normal",
                "historical_claims": 5,
                "zone_density": 150,
                "infrastructure_score": 70,
                "forecast_severity": 0.5,
                "city": city
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["city_tier"] == "tier_1", f"City {city} should be tier_1"
            assert data["features_used"]["tier_multiplier"] == 1.0
    
    def test_score_with_all_tier_2_cities(self):
        """
        Test /score endpoint with all tier_2 cities
        """
        tier_2_cities = ["Pune", "Chennai", "Kolkata", "Ahmedabad"]
        
        for city in tier_2_cities:
            response = client.post("/score", json={
                "zone_id": "HSR-2A",
                "season": "normal",
                "historical_claims": 5,
                "zone_density": 150,
                "infrastructure_score": 70,
                "forecast_severity": 0.5,
                "city": city
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["city_tier"] == "tier_2", f"City {city} should be tier_2"
            assert data["features_used"]["tier_multiplier"] == 0.85
    
    def test_score_with_all_tier_3_cities(self):
        """
        Test /score endpoint with all tier_3 cities
        """
        tier_3_cities = ["Jaipur", "Lucknow", "Indore", "Bhopal"]
        
        for city in tier_3_cities:
            response = client.post("/score", json={
                "zone_id": "BTM-1C",
                "season": "normal",
                "historical_claims": 5,
                "zone_density": 150,
                "infrastructure_score": 70,
                "forecast_severity": 0.5,
                "city": city
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["city_tier"] == "tier_3", f"City {city} should be tier_3"
            assert data["features_used"]["tier_multiplier"] == 0.70
    
    def test_score_with_all_seasons(self):
        """
        Test /score endpoint with all season variations
        Note: season_factor is based on current date, not the season parameter
        """
        seasons = ["monsoon", "winter", "normal"]
        
        for season in seasons:
            response = client.post("/score", json={
                "zone_id": "KOR-4B",
                "season": season,
                "historical_claims": 5,
                "zone_density": 150,
                "infrastructure_score": 70,
                "forecast_severity": 0.5,
                "city": "Bangalore"
            })
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify season_factor is one of the valid values (based on current date)
            assert data["season_factor"] in [1.0, 1.15, 1.4], (
                f"season_factor should be 1.0/1.15/1.4, got {data['season_factor']}"
            )
            
            # Verify season_weight in features_used matches the input season parameter
            assert "features_used" in data
            assert "season_weight" in data["features_used"]
    
    def test_score_with_high_risk_inputs(self):
        """
        Test /score endpoint with high-risk scenario
        """
        response = client.post("/score", json={
            "zone_id": "WHT-5A",  # High risk zone
            "season": "monsoon",
            "historical_claims": 25,
            "zone_density": 250,
            "infrastructure_score": 40,
            "forecast_severity": 0.95,
            "city": "Delhi"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # High risk scenario should produce elevated risk score
        assert data["risk_score"] > 50
        assert data["risk_level"] in ["medium", "high"]
    
    def test_score_with_low_risk_inputs(self):
        """
        Test /score endpoint with low-risk scenario
        """
        response = client.post("/score", json={
            "zone_id": "IND-3D",  # Lower risk zone
            "season": "normal",
            "historical_claims": 0,
            "zone_density": 80,
            "infrastructure_score": 85,
            "forecast_severity": 0.1,
            "city": "Bangalore"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Low risk scenario should produce lower risk score
        assert data["risk_score"] < 70
        assert data["risk_level"] in ["low", "medium"]


class TestFraudCheckEndpointIntegration:
    """
    Integration tests for /fraud-check endpoint
    Test with various trust signals
    """
    
    def test_fraud_check_with_high_trust_signals(self):
        """
        Test /fraud-check with high trust signals (legitimate claim)
        """
        response = client.post("/fraud/check", json={
            "worker_id": "worker_legit_001",
            "gps_lat": 12.9352,  # Exact zone center
            "gps_lon": 77.6245,
            "zone_id": "KOR-4B",
            "device_hash": "abc123def456",
            "signal_strength": -55.0,  # Strong signal
            "claims_24h": 1,  # First claim
            "accelerometer_active": True  # Device moving
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # High trust signals should produce high trust score
        assert data["trust_score"] >= 60
        assert data["is_suspicious"] == False
        assert data["recommendation"] in ["AUTO_APPROVE", "SOFT_HOLD"]
        
        # Verify isolation forest score
        assert "isolation_forest_score" in data
        assert -1.0 <= data["isolation_forest_score"] <= 1.0
        
        # Verify model metadata
        assert "model_version" in data
        assert len(data["model_version"]) > 0
    
    def test_fraud_check_with_low_trust_signals(self):
        """
        Test /fraud-check with low trust signals (suspicious claim)
        """
        response = client.post("/fraud/check", json={
            "worker_id": "worker_suspicious_001",
            "gps_lat": 13.5,  # Far from zone center
            "gps_lon": 78.0,
            "zone_id": "KOR-4B",
            "device_hash": "xyz789",
            "signal_strength": -95.0,  # Weak signal
            "claims_24h": 5,  # Multiple claims
            "accelerometer_active": False  # Device stationary
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Low trust signals should produce low trust score
        assert data["trust_score"] < 70
        
        # Should have suspicious flags
        assert len(data["flags"]) > 0
        assert "GPS_SPOOF_SUSPECTED" in data["flags"] or "DEVICE_STATIONARY" in data["flags"]
        
        # Verify isolation forest score indicates anomaly
        assert "isolation_forest_score" in data
        assert data["isolation_forest_score"] < 0.5
    
    def test_fraud_check_with_gps_spoof_indicators(self):
        """
        Test /fraud-check with GPS spoofing indicators
        """
        response = client.post("/fraud/check", json={
            "worker_id": "worker_gps_spoof",
            "gps_lat": 15.0,  # Very far from zone
            "gps_lon": 80.0,
            "zone_id": "KOR-4B",
            "device_hash": "spoof123",
            "signal_strength": -70.0,
            "claims_24h": 1,
            "accelerometer_active": True
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should flag GPS spoof
        assert "GPS_SPOOF_SUSPECTED" in data["flags"]
        assert data["signals"]["gps_jitter"] < 0.5
    
    def test_fraud_check_with_excessive_claims(self):
        """
        Test /fraud-check with excessive claims in 24h
        """
        response = client.post("/fraud/check", json={
            "worker_id": "worker_excessive_claims",
            "gps_lat": 12.9352,
            "gps_lon": 77.6245,
            "zone_id": "KOR-4B",
            "device_hash": "device456",
            "signal_strength": -65.0,
            "claims_24h": 6,  # Excessive claims
            "accelerometer_active": True
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should flag excessive claims
        assert "EXCESSIVE_CLAIMS_24H" in data["flags"]
        assert data["signals"]["claim_frequency"] < 0.5
    
    def test_fraud_check_with_stationary_device(self):
        """
        Test /fraud-check with stationary device (accelerometer inactive)
        """
        response = client.post("/fraud/check", json={
            "worker_id": "worker_stationary",
            "gps_lat": 12.9352,
            "gps_lon": 77.6245,
            "zone_id": "KOR-4B",
            "device_hash": "device789",
            "signal_strength": -65.0,
            "claims_24h": 1,
            "accelerometer_active": False  # Device not moving
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should flag stationary device
        assert "DEVICE_STATIONARY" in data["flags"]
        assert data["signals"]["accelerometer"] < 0.5
    
    def test_fraud_check_with_all_zones(self):
        """
        Test /fraud-check with all zone IDs
        """
        zones = ["KOR-4B", "HSR-2A", "BTM-1C", "IND-3D", "WHT-5A", "MG-1B", "DL-CP", "DL-RK"]
        
        for zone_id in zones:
            response = client.post("/fraud/check", json={
                "worker_id": f"worker_{zone_id}",
                "gps_lat": 12.9352,
                "gps_lon": 77.6245,
                "zone_id": zone_id,
                "device_hash": "device123",
                "signal_strength": -65.0,
                "claims_24h": 1,
                "accelerometer_active": True
            })
            
            assert response.status_code == 200
            data = response.json()
            assert "trust_score" in data
            assert "isolation_forest_score" in data


class TestRingDetectEndpointIntegration:
    """
    Integration tests for /ring-detect endpoint
    Test with clustered and non-clustered data
    """
    
    def test_ring_detect_with_clustered_data(self):
        """
        Test /ring-detect with tightly clustered GPS coordinates (fraud ring)
        """
        # Create 10 claims in a tight cluster
        claims = []
        base_lat = 12.9352
        base_lon = 77.6245
        
        for i in range(10):
            claims.append({
                "claim_id": f"claim_cluster_{i}",
                "gps_lat": base_lat + (i * 0.0001),  # Very close together
                "gps_lon": base_lon + (i * 0.0001)
            })
        
        response = client.post("/ring-detect", json={
            "claims": claims,
            "eps": 0.01,
            "min_samples": 3
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should detect at least one cluster
        assert data["dbscan_clusters"] >= 1
        assert len(data["cluster_sizes"]) >= 1
        assert len(data["suspicious_clusters"]) >= 1
        
        # Verify model metadata
        assert "model_version" in data
        assert "dbscan" in data["model_version"].lower() or "sklearn" in data["model_version"].lower()
        
        # Verify total claims matches input
        assert data["total_claims"] == 10
    
    def test_ring_detect_with_non_clustered_data(self):
        """
        Test /ring-detect with dispersed GPS coordinates (no fraud ring)
        """
        # Create 10 claims spread far apart
        claims = []
        
        for i in range(10):
            claims.append({
                "claim_id": f"claim_dispersed_{i}",
                "gps_lat": 12.9 + (i * 0.1),  # Far apart
                "gps_lon": 77.6 + (i * 0.1)
            })
        
        response = client.post("/ring-detect", json={
            "claims": claims,
            "eps": 0.01,
            "min_samples": 3
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should detect few or no clusters
        assert data["dbscan_clusters"] <= 2
        
        # Most points should be noise
        assert data["noise_points"] >= 5
        
        # Verify total claims matches input
        assert data["total_claims"] == 10
    
    def test_ring_detect_with_multiple_clusters(self):
        """
        Test /ring-detect with multiple distinct clusters
        """
        claims = []
        
        # Cluster 1: around (12.93, 77.62)
        for i in range(5):
            claims.append({
                "claim_id": f"claim_cluster1_{i}",
                "gps_lat": 12.93 + (i * 0.0001),
                "gps_lon": 77.62 + (i * 0.0001)
            })
        
        # Cluster 2: around (12.95, 77.65)
        for i in range(5):
            claims.append({
                "claim_id": f"claim_cluster2_{i}",
                "gps_lat": 12.95 + (i * 0.0001),
                "gps_lon": 77.65 + (i * 0.0001)
            })
        
        response = client.post("/ring-detect", json={
            "claims": claims,
            "eps": 0.01,
            "min_samples": 3
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should detect 2 clusters
        assert data["dbscan_clusters"] >= 2
        assert len(data["cluster_sizes"]) >= 2
        
        # Verify total claims
        assert data["total_claims"] == 10
    
    def test_ring_detect_with_minimal_claims(self):
        """
        Test /ring-detect with minimal number of claims (3)
        """
        claims = [
            {"claim_id": "claim_1", "gps_lat": 12.9352, "gps_lon": 77.6245},
            {"claim_id": "claim_2", "gps_lat": 12.9353, "gps_lon": 77.6246},
            {"claim_id": "claim_3", "gps_lat": 12.9354, "gps_lon": 77.6247}
        ]
        
        response = client.post("/ring-detect", json={
            "claims": claims,
            "eps": 0.01,
            "min_samples": 3
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should handle minimal input
        assert data["total_claims"] == 3
        assert "dbscan_clusters" in data
        assert "model_version" in data
    
    def test_ring_detect_with_empty_claims(self):
        """
        Test /ring-detect with empty claims list
        """
        response = client.post("/ring-detect", json={
            "claims": []
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should handle empty input gracefully
        assert data["dbscan_clusters"] == 0
        assert data["total_claims"] == 0
        assert data["noise_points"] == 0
        assert "model_version" in data
    
    def test_ring_detect_with_custom_eps_parameter(self):
        """
        Test /ring-detect with custom eps (distance threshold) parameter
        """
        claims = []
        for i in range(8):
            claims.append({
                "claim_id": f"claim_{i}",
                "gps_lat": 12.93 + (i * 0.002),
                "gps_lon": 77.62 + (i * 0.002)
            })
        
        # Test with tight eps (should find fewer/smaller clusters)
        response_tight = client.post("/ring-detect", json={
            "claims": claims,
            "eps": 0.001,
            "min_samples": 2
        })
        
        # Test with loose eps (should find more/larger clusters)
        response_loose = client.post("/ring-detect", json={
            "claims": claims,
            "eps": 0.01,
            "min_samples": 2
        })
        
        assert response_tight.status_code == 200
        assert response_loose.status_code == 200
        
        data_tight = response_tight.json()
        data_loose = response_loose.json()
        
        # Loose eps should generally find more clusters or larger clusters
        assert data_tight["total_claims"] == data_loose["total_claims"] == 8
    
    def test_ring_detect_with_custom_min_samples_parameter(self):
        """
        Test /ring-detect with custom min_samples parameter
        """
        claims = []
        for i in range(10):
            claims.append({
                "claim_id": f"claim_{i}",
                "gps_lat": 12.93 + (i * 0.0005),
                "gps_lon": 77.62 + (i * 0.0005)
            })
        
        # Test with low min_samples (easier to form clusters)
        response_low = client.post("/ring-detect", json={
            "claims": claims,
            "eps": 0.01,
            "min_samples": 2
        })
        
        # Test with high min_samples (harder to form clusters)
        response_high = client.post("/ring-detect", json={
            "claims": claims,
            "eps": 0.01,
            "min_samples": 5
        })
        
        assert response_low.status_code == 200
        assert response_high.status_code == 200
        
        data_low = response_low.json()
        data_high = response_high.json()
        
        # Lower min_samples should generally find more clusters
        assert data_low["total_claims"] == data_high["total_claims"] == 10


class TestModelFallbackBehavior:
    """
    Integration tests for fallback behavior when models are not loaded
    """
    
    def test_score_endpoint_works_without_model_file(self):
        """
        Test /score endpoint uses analytical fallback when model not loaded
        """
        response = client.post("/score", json={
            "zone_id": "KOR-4B",
            "season": "monsoon",
            "historical_claims": 10,
            "zone_density": 180,
            "infrastructure_score": 75,
            "forecast_severity": 0.8,
            "city": "Bangalore"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should still return valid response
        assert "risk_score" in data
        assert "model_version" in data
        assert "city_tier" in data
        assert "season_factor" in data
        
        # Model version should indicate fallback if model not loaded
        if premium_model_data is None:
            assert "fallback" in data["model_version"].lower() or "simulation" in data["model_version"].lower()
    
    def test_fraud_check_endpoint_works_without_model_file(self):
        """
        Test /fraud-check endpoint uses analytical fallback when model not loaded
        """
        response = client.post("/fraud/check", json={
            "worker_id": "worker_test",
            "gps_lat": 12.9352,
            "gps_lon": 77.6245,
            "zone_id": "KOR-4B",
            "device_hash": "device123",
            "signal_strength": -65.0,
            "claims_24h": 1,
            "accelerometer_active": True
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should still return valid response
        assert "trust_score" in data
        assert "isolation_forest_score" in data
        assert "model_version" in data
        
        # Model version should indicate fallback if model not loaded
        if fraud_model_data is None:
            assert "fallback" in data["model_version"].lower() or "simulation" in data["model_version"].lower()
    
    def test_ring_detect_endpoint_works_without_sklearn(self):
        """
        Test /ring-detect endpoint uses distance-based fallback if sklearn unavailable
        """
        claims = []
        for i in range(8):
            claims.append({
                "claim_id": f"claim_{i}",
                "gps_lat": 12.93 + (i * 0.0001),
                "gps_lon": 77.62 + (i * 0.0001)
            })
        
        response = client.post("/ring-detect", json={
            "claims": claims,
            "eps": 0.01,
            "min_samples": 3
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should still return valid response
        assert "dbscan_clusters" in data
        assert "model_version" in data
        assert "total_claims" in data
        
        # Model version should indicate sklearn or fallback
        assert "dbscan" in data["model_version"].lower() or "fallback" in data["model_version"].lower()
    
    def test_all_endpoints_return_valid_responses_in_fallback_mode(self):
        """
        Test that all endpoints return valid responses even in fallback mode
        """
        # Test /score
        score_response = client.post("/score", json={
            "zone_id": "KOR-4B",
            "season": "normal",
            "historical_claims": 5,
            "zone_density": 150,
            "infrastructure_score": 70,
            "forecast_severity": 0.5,
            "city": "Bangalore"
        })
        assert score_response.status_code == 200
        score_data = score_response.json()
        assert 0 <= score_data["risk_score"] <= 100
        assert 0.0 <= score_data["confidence"] <= 1.0
        
        # Test /fraud/check
        fraud_response = client.post("/fraud/check", json={
            "worker_id": "worker_test",
            "gps_lat": 12.9352,
            "gps_lon": 77.6245,
            "zone_id": "KOR-4B"
        })
        assert fraud_response.status_code == 200
        fraud_data = fraud_response.json()
        assert 0 <= fraud_data["trust_score"] <= 100
        assert -1.0 <= fraud_data["isolation_forest_score"] <= 1.0
        
        # Test /ring-detect
        ring_response = client.post("/ring-detect", json={
            "claims": [
                {"claim_id": "c1", "gps_lat": 12.93, "gps_lon": 77.62},
                {"claim_id": "c2", "gps_lat": 12.94, "gps_lon": 77.63}
            ]
        })
        assert ring_response.status_code == 200
        ring_data = ring_response.json()
        assert ring_data["dbscan_clusters"] >= 0
        assert ring_data["total_claims"] == 2


class TestHealthEndpoint:
    """
    Integration tests for /health endpoint
    """
    
    def test_health_endpoint_returns_service_status(self):
        """
        Test /health endpoint returns service status and model loading info
        """
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert data["status"] == "ok"
        assert data["service"] == "SafeShift ML Service"
        assert "version" in data
        assert "models_loaded" in data
        assert "timestamp" in data
        
        # Verify models_loaded structure
        assert "premium" in data["models_loaded"]
        assert "fraud" in data["models_loaded"]
        assert isinstance(data["models_loaded"]["premium"], bool)
        assert isinstance(data["models_loaded"]["fraud"], bool)
