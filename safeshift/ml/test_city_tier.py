"""
SafeShift ML Service — Property-Based Tests for City Tier Lookup
Feature: phase-3-real-integrations
Task 3.2: Write property test for city tier lookup

Property 2: City tier lookup correctness
Validates: Requirements 2.3
"""

import pytest
from hypothesis import given, strategies as st, settings
from app import get_city_tier, CITY_TIERS


class TestCityTierLookup:
    """
    Property 2: City tier lookup correctness
    
    **Validates: Requirements 2.3**
    
    For any city name in CITY_TIERS dictionary, get_city_tier(city) SHALL return
    the tier classification that contains that city
    """
    
    @settings(max_examples=100)
    @given(st.sampled_from([
        city
        for tier_data in CITY_TIERS.values()
        for city in tier_data["cities"]
    ]))
    def test_city_tier_lookup_returns_correct_tier(self, city):
        """
        Property test: For any city in CITY_TIERS, get_city_tier returns the correct tier
        """
        result = get_city_tier(city)
        
        # Find which tier this city belongs to
        expected_tier = None
        for tier, data in CITY_TIERS.items():
            if city in data["cities"]:
                expected_tier = tier
                break
        
        # Verify the function returns the correct tier
        assert result == expected_tier, (
            f"get_city_tier('{city}') returned '{result}', "
            f"but expected '{expected_tier}'"
        )
    
    @settings(max_examples=100)
    @given(st.sampled_from([
        city.lower()
        for tier_data in CITY_TIERS.values()
        for city in tier_data["cities"]
    ]))
    def test_city_tier_lookup_case_insensitive_lowercase(self, city_lower):
        """
        Property test: City tier lookup should be case-insensitive (lowercase)
        """
        result = get_city_tier(city_lower)
        
        # Find which tier this city belongs to (case-insensitive)
        expected_tier = None
        city_title = city_lower.title()
        for tier, data in CITY_TIERS.items():
            if city_title in data["cities"]:
                expected_tier = tier
                break
        
        # Verify the function returns the correct tier
        assert result == expected_tier, (
            f"get_city_tier('{city_lower}') returned '{result}', "
            f"but expected '{expected_tier}'"
        )
    
    @settings(max_examples=100)
    @given(st.sampled_from([
        city.upper()
        for tier_data in CITY_TIERS.values()
        for city in tier_data["cities"]
    ]))
    def test_city_tier_lookup_case_insensitive_uppercase(self, city_upper):
        """
        Property test: City tier lookup should be case-insensitive (uppercase)
        """
        result = get_city_tier(city_upper)
        
        # Find which tier this city belongs to (case-insensitive)
        expected_tier = None
        city_title = city_upper.title()
        for tier, data in CITY_TIERS.items():
            if city_title in data["cities"]:
                expected_tier = tier
                break
        
        # Verify the function returns the correct tier
        assert result == expected_tier, (
            f"get_city_tier('{city_upper}') returned '{result}', "
            f"but expected '{expected_tier}'"
        )
    
    @settings(max_examples=100)
    @given(st.sampled_from([
        " " + city + " "
        for tier_data in CITY_TIERS.values()
        for city in tier_data["cities"]
    ]))
    def test_city_tier_lookup_handles_whitespace(self, city_with_whitespace):
        """
        Property test: City tier lookup should handle leading/trailing whitespace
        """
        result = get_city_tier(city_with_whitespace)
        
        # Find which tier this city belongs to (after stripping whitespace)
        expected_tier = None
        city_clean = city_with_whitespace.strip().title()
        for tier, data in CITY_TIERS.items():
            if city_clean in data["cities"]:
                expected_tier = tier
                break
        
        # Verify the function returns the correct tier
        assert result == expected_tier, (
            f"get_city_tier('{city_with_whitespace}') returned '{result}', "
            f"but expected '{expected_tier}'"
        )
    
    def test_city_tier_lookup_all_cities_covered(self):
        """
        Example test: Verify all cities in CITY_TIERS are correctly classified
        """
        for tier, data in CITY_TIERS.items():
            for city in data["cities"]:
                result = get_city_tier(city)
                assert result == tier, (
                    f"City '{city}' should be in '{tier}', but got '{result}'"
                )
    
    def test_city_tier_lookup_unknown_city_defaults_to_tier_2(self):
        """
        Example test: Unknown cities should default to tier_2
        """
        unknown_cities = [
            "UnknownCity",
            "NonExistentPlace",
            "RandomLocation",
            "TestCity123"
        ]
        
        for city in unknown_cities:
            result = get_city_tier(city)
            assert result == "tier_2", (
                f"Unknown city '{city}' should default to 'tier_2', but got '{result}'"
            )
    
    def test_city_tier_lookup_specific_examples(self):
        """
        Example test: Test specific known cities
        """
        # Tier 1 cities
        assert get_city_tier("Bangalore") == "tier_1"
        assert get_city_tier("Delhi") == "tier_1"
        assert get_city_tier("Mumbai") == "tier_1"
        assert get_city_tier("Hyderabad") == "tier_1"
        
        # Tier 2 cities
        assert get_city_tier("Pune") == "tier_2"
        assert get_city_tier("Chennai") == "tier_2"
        assert get_city_tier("Kolkata") == "tier_2"
        assert get_city_tier("Ahmedabad") == "tier_2"
        
        # Tier 3 cities
        assert get_city_tier("Jaipur") == "tier_3"
        assert get_city_tier("Lucknow") == "tier_3"
        assert get_city_tier("Indore") == "tier_3"
        assert get_city_tier("Bhopal") == "tier_3"
    
    def test_city_tier_lookup_case_variations(self):
        """
        Example test: Test case variations of known cities
        """
        # Test various case formats
        assert get_city_tier("bangalore") == "tier_1"
        assert get_city_tier("BANGALORE") == "tier_1"
        assert get_city_tier("BaNgAlOrE") == "tier_1"
        
        assert get_city_tier("pune") == "tier_2"
        assert get_city_tier("PUNE") == "tier_2"
        
        assert get_city_tier("jaipur") == "tier_3"
        assert get_city_tier("JAIPUR") == "tier_3"
    
    def test_city_tier_lookup_whitespace_handling(self):
        """
        Example test: Test whitespace handling
        """
        assert get_city_tier(" Bangalore ") == "tier_1"
        assert get_city_tier("  Delhi  ") == "tier_1"
        assert get_city_tier("\tMumbai\t") == "tier_1"
        assert get_city_tier(" Pune ") == "tier_2"
        assert get_city_tier(" Jaipur ") == "tier_3"
