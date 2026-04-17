"""
SafeShift ML Service — Property-Based Tests for ML Response Metadata Completeness
Feature: phase-3-real-integrations
Task 3.6: Write property test for ML response metadata completeness

Property 3: ML response metadata completeness
Validates: Requirements 2.6, 2.8, 2.10, 4.9, 12.1-12.6
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from fastapi.testclient import TestClient
from app import app

# Create test client
client = TestClient(app)


class TestMLResponseMetadataCompleteness:
    """
    Property 3: ML response metadata completeness
    
    **Validates: Requirements 2.6, 2.8, 2.10, 4.9, 12.1-12.6**
    
    For any valid request to ML service endpoints (/score, /fraud-check, /ring-detect),
    the response SHALL contain model_version field and all endpoint-specific metadata fields
    """
    
    # ─── /score endpoint tests ───────────────────────────────────────────────
    
    @settings(max_examples=100)
    @given(
        zone_id=st.sampled_from([
            "KOR-4B", "HSR-2A", "BTM-1C", "IND-3D",
            "WHT-5A", "MG-1B", "DL-CP", "DL-RK"
        ]),
        season=st.sampled_from(["monsoon", "winter", "normal"]),
        historical_claims=st.integers(min_value=0, max_value=50),
        zone_density=st.integers(min_value=50, max_value=300),
        infrastructure_score=st.integers(min_value=0, max_value=100),
        forecast_severity=st.floats(min_value=0.0, max_value=1.0),
        city=st.sampled_from([
            "Bangalore", "Delhi", "Mumbai", "Hyderabad",
            "Pune", "Chennai", "Kolkata", "Ahmedabad",
            "Jaipur", "Lucknow", "Indore", "Bhopal"
        ])
    )
    def test_score_endpoint_contains_required_metadata(
        self, zone_id, season, historical_claims, zone_density,
        infrastructure_score, forecast_severity, city
    ):
        """
        Property test: /score endpoint responses contain all required metadata fields
        """
        # Make request to /score endpoint
        response = client.post("/score", json={
            "zone_id": zone_id,
            "season": season,
            "historical_claims": historical_claims,
            "zone_density": zone_density,
            "infrastructure_score": infrastructure_score,
            "forecast_severity": forecast_severity,
            "city": city
        })
        
        # Verify response is successful
        assert response.status_code == 200, (
            f"Expected status 200, got {response.status_code}: {response.text}"
        )
        
        data = response.json()
        
        # Verify required metadata fields are present
        assert "model_version" in data, (
            f"/score response missing 'model_version' field. Response: {data}"
        )
        
        assert "city_tier" in data, (
            f"/score response missing 'city_tier' field. Response: {data}"
        )
        
        assert "season_factor" in data, (
            f"/score response missing 'season_factor' field. Response: {data}"
        )
        
        # Verify model_version is a non-empty string
        assert isinstance(data["model_version"], str), (
            f"model_version should be string, got {type(data['model_version'])}"
        )
        assert len(data["model_version"]) > 0, (
            "model_version should not be empty"
        )
        
        # Verify city_tier is valid
        assert data["city_tier"] in ["tier_1", "tier_2", "tier_3"], (
            f"city_tier should be tier_1/tier_2/tier_3, got '{data['city_tier']}'"
        )
        
        # Verify season_factor is a valid number
        assert isinstance(data["season_factor"], (int, float)), (
            f"season_factor should be numeric, got {type(data['season_factor'])}"
        )
        assert data["season_factor"] in [1.0, 1.15, 1.4], (
            f"season_factor should be 1.0/1.15/1.4, got {data['season_factor']}"
        )
    
    # ─── /fraud/check endpoint tests ─────────────────────────────────────────
    
    @settings(max_examples=100)
    @given(
        worker_id=st.text(min_size=5, max_size=20, alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd'),
            whitelist_characters='_-'
        )),
        gps_lat=st.floats(min_value=8.0, max_value=35.0),
        gps_lon=st.floats(min_value=68.0, max_value=97.0),
        zone_id=st.sampled_from([
            "KOR-4B", "HSR-2A", "BTM-1C", "IND-3D",
            "WHT-5A", "MG-1B", "DL-CP", "DL-RK"
        ]),
        device_hash=st.text(min_size=8, max_size=32, alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd')
        )),
        signal_strength=st.floats(min_value=-100.0, max_value=-30.0),
        claims_24h=st.integers(min_value=1, max_value=10),
        accelerometer_active=st.booleans()
    )
    def test_fraud_check_endpoint_contains_required_metadata(
        self, worker_id, gps_lat, gps_lon, zone_id, device_hash,
        signal_strength, claims_24h, accelerometer_active
    ):
        """
        Property test: /fraud/check endpoint responses contain all required metadata fields
        """
        # Make request to /fraud/check endpoint
        response = client.post("/fraud/check", json={
            "worker_id": worker_id,
            "gps_lat": gps_lat,
            "gps_lon": gps_lon,
            "zone_id": zone_id,
            "device_hash": device_hash,
            "signal_strength": signal_strength,
            "claims_24h": claims_24h,
            "accelerometer_active": accelerometer_active
        })
        
        # Verify response is successful
        assert response.status_code == 200, (
            f"Expected status 200, got {response.status_code}: {response.text}"
        )
        
        data = response.json()
        
        # Verify required metadata fields are present
        assert "model_version" in data, (
            f"/fraud/check response missing 'model_version' field. Response: {data}"
        )
        
        assert "isolation_forest_score" in data, (
            f"/fraud/check response missing 'isolation_forest_score' field. Response: {data}"
        )
        
        # Verify model_version is a non-empty string
        assert isinstance(data["model_version"], str), (
            f"model_version should be string, got {type(data['model_version'])}"
        )
        assert len(data["model_version"]) > 0, (
            "model_version should not be empty"
        )
        
        # Verify isolation_forest_score is a valid number in range [-1, 1]
        assert isinstance(data["isolation_forest_score"], (int, float)), (
            f"isolation_forest_score should be numeric, got {type(data['isolation_forest_score'])}"
        )
        assert -1.0 <= data["isolation_forest_score"] <= 1.0, (
            f"isolation_forest_score should be in [-1, 1], got {data['isolation_forest_score']}"
        )
    
    # ─── /ring-detect endpoint tests ─────────────────────────────────────────
    
    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow], deadline=None)
    @given(
        num_claims=st.integers(min_value=3, max_value=20),
        base_lat=st.floats(min_value=12.0, max_value=13.0),
        base_lon=st.floats(min_value=77.0, max_value=78.0),
        eps=st.floats(min_value=0.005, max_value=0.05),
        min_samples=st.integers(min_value=2, max_value=5)
    )
    def test_ring_detect_endpoint_contains_required_metadata(
        self, num_claims, base_lat, base_lon, eps, min_samples
    ):
        """
        Property test: /ring-detect endpoint responses contain all required metadata fields
        """
        # Generate random claims with GPS coordinates
        claims = []
        for i in range(num_claims):
            # Add some random offset to create potential clusters
            lat_offset = (hash(f"lat_{i}") % 1000) / 100000.0
            lon_offset = (hash(f"lon_{i}") % 1000) / 100000.0
            
            claims.append({
                "claim_id": f"claim_{i}_{hash(str(i)) % 10000}",
                "gps_lat": base_lat + lat_offset,
                "gps_lon": base_lon + lon_offset
            })
        
        # Make request to /ring-detect endpoint
        response = client.post("/ring-detect", json={
            "claims": claims,
            "eps": eps,
            "min_samples": min_samples
        })
        
        # Verify response is successful
        assert response.status_code == 200, (
            f"Expected status 200, got {response.status_code}: {response.text}"
        )
        
        data = response.json()
        
        # Verify required metadata fields are present
        assert "model_version" in data, (
            f"/ring-detect response missing 'model_version' field. Response: {data}"
        )
        
        assert "dbscan_clusters" in data, (
            f"/ring-detect response missing 'dbscan_clusters' field. Response: {data}"
        )
        
        # Verify model_version is a non-empty string
        assert isinstance(data["model_version"], str), (
            f"model_version should be string, got {type(data['model_version'])}"
        )
        assert len(data["model_version"]) > 0, (
            "model_version should not be empty"
        )
        
        # Verify dbscan_clusters is a non-negative integer
        assert isinstance(data["dbscan_clusters"], int), (
            f"dbscan_clusters should be integer, got {type(data['dbscan_clusters'])}"
        )
        assert data["dbscan_clusters"] >= 0, (
            f"dbscan_clusters should be non-negative, got {data['dbscan_clusters']}"
        )
        
        # Verify additional expected fields
        assert "cluster_sizes" in data, (
            f"/ring-detect response missing 'cluster_sizes' field. Response: {data}"
        )
        assert "suspicious_clusters" in data, (
            f"/ring-detect response missing 'suspicious_clusters' field. Response: {data}"
        )
        assert "total_claims" in data, (
            f"/ring-detect response missing 'total_claims' field. Response: {data}"
        )
        assert "noise_points" in data, (
            f"/ring-detect response missing 'noise_points' field. Response: {data}"
        )
    
    # ─── Example-based tests for edge cases ──────────────────────────────────
    
    def test_score_endpoint_metadata_with_minimal_input(self):
        """
        Example test: /score endpoint with minimal valid input
        """
        response = client.post("/score", json={
            "zone_id": "KOR-4B",
            "season": "normal",
            "historical_claims": 0,
            "zone_density": 100,
            "infrastructure_score": 50,
            "forecast_severity": 0.3
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields
        assert "model_version" in data
        assert "city_tier" in data
        assert "season_factor" in data
        assert "confidence" in data
        assert "features_used" in data
    
    def test_fraud_check_endpoint_metadata_with_minimal_input(self):
        """
        Example test: /fraud/check endpoint with minimal valid input
        """
        response = client.post("/fraud/check", json={
            "worker_id": "worker_123",
            "gps_lat": 12.9352,
            "gps_lon": 77.6245,
            "zone_id": "KOR-4B"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields
        assert "model_version" in data
        assert "isolation_forest_score" in data
        assert "trust_score" in data
        assert "is_suspicious" in data
        assert "flags" in data
        assert "signals" in data
        assert "recommendation" in data
    
    def test_ring_detect_endpoint_metadata_with_minimal_input(self):
        """
        Example test: /ring-detect endpoint with minimal valid input (3 claims)
        """
        response = client.post("/ring-detect", json={
            "claims": [
                {"claim_id": "claim_1", "gps_lat": 12.9352, "gps_lon": 77.6245},
                {"claim_id": "claim_2", "gps_lat": 12.9353, "gps_lon": 77.6246},
                {"claim_id": "claim_3", "gps_lat": 12.9354, "gps_lon": 77.6247}
            ]
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields
        assert "model_version" in data
        assert "dbscan_clusters" in data
        assert "cluster_sizes" in data
        assert "suspicious_clusters" in data
        assert "total_claims" in data
        assert "noise_points" in data
    
    def test_ring_detect_endpoint_metadata_with_empty_claims(self):
        """
        Example test: /ring-detect endpoint with empty claims list
        """
        response = client.post("/ring-detect", json={
            "claims": []
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Even with empty input, metadata should be present
        assert "model_version" in data
        assert "dbscan_clusters" in data
        assert data["dbscan_clusters"] == 0
        assert data["total_claims"] == 0
    
    def test_all_endpoints_return_non_empty_model_version(self):
        """
        Example test: All endpoints return non-empty model_version strings
        """
        # Test /score
        score_response = client.post("/score", json={
            "zone_id": "KOR-4B",
            "season": "monsoon",
            "historical_claims": 5,
            "zone_density": 150,
            "infrastructure_score": 65,
            "forecast_severity": 0.7,
            "city": "Bangalore"
        })
        assert score_response.status_code == 200
        score_data = score_response.json()
        assert len(score_data["model_version"]) > 0
        assert "v" in score_data["model_version"].lower() or "model" in score_data["model_version"].lower()
        
        # Test /fraud/check
        fraud_response = client.post("/fraud/check", json={
            "worker_id": "worker_test",
            "gps_lat": 12.9352,
            "gps_lon": 77.6245,
            "zone_id": "KOR-4B",
            "device_hash": "abc123",
            "signal_strength": -65.0,
            "claims_24h": 1,
            "accelerometer_active": True
        })
        assert fraud_response.status_code == 200
        fraud_data = fraud_response.json()
        assert len(fraud_data["model_version"]) > 0
        assert "v" in fraud_data["model_version"].lower() or "model" in fraud_data["model_version"].lower()
        
        # Test /ring-detect
        ring_response = client.post("/ring-detect", json={
            "claims": [
                {"claim_id": "c1", "gps_lat": 12.935, "gps_lon": 77.624},
                {"claim_id": "c2", "gps_lat": 12.936, "gps_lon": 77.625},
                {"claim_id": "c3", "gps_lat": 12.937, "gps_lon": 77.626}
            ]
        })
        assert ring_response.status_code == 200
        ring_data = ring_response.json()
        assert len(ring_data["model_version"]) > 0
        assert "v" in ring_data["model_version"].lower() or "dbscan" in ring_data["model_version"].lower()
