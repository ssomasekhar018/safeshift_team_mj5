/**
 * SafeShift — Validation Utilities
 * Input validation and API response parsing with safe defaults
 */

/**
 * Validate geographic coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} - True if coordinates are valid
 */
function validateCoordinates(lat, lon) {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Validate UPI ID format
 * @param {string} upiId - UPI ID to validate
 * @returns {boolean} - True if UPI ID matches required format
 */
function validateUPIId(upiId) {
  if (!upiId || typeof upiId !== 'string') return false;
  return /^[a-zA-Z0-9._]+@[a-zA-Z]+$/.test(upiId);
}

/**
 * Validate payout amount
 * @param {number} amount - Amount in INR
 * @returns {boolean} - True if amount is valid (> 0 and <= 10000)
 */
function validateAmount(amount) {
  return typeof amount === 'number' && amount > 0 && amount <= 10000;
}

/**
 * Parse OpenWeatherMap API response with safe defaults
 * @param {object} apiResponse - Raw API response
 * @returns {object} - Parsed weather data with safe defaults
 */
function parseWeatherResponse(apiResponse) {
  try {
    // Check if response has the expected structure
    if (!apiResponse || typeof apiResponse !== 'object' || Array.isArray(apiResponse)) {
      throw new Error('Invalid response structure');
    }
    
    // Check if required fields exist
    if (!apiResponse.main || typeof apiResponse.main !== 'object') {
      throw new Error('Missing main field');
    }
    
    return {
      rainfall_mm: apiResponse?.rain?.['1h'] || 0,
      temperature_c: apiResponse?.main?.temp || 0,
      feels_like_c: apiResponse?.main?.feels_like || 0,
      humidity: apiResponse?.main?.humidity || 0,
      source: 'openweathermap_live',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    // Return safe defaults on parse error
    return {
      rainfall_mm: 0,
      temperature_c: 25,
      feels_like_c: 25,
      humidity: 50,
      source: 'openweathermap_demo',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Parse AQICN API response with safe defaults
 * @param {object} apiResponse - Raw API response
 * @returns {object} - Parsed AQI data with safe defaults
 */
function parseAQIResponse(apiResponse) {
  try {
    // Check if response has the expected structure
    if (!apiResponse || typeof apiResponse !== 'object' || Array.isArray(apiResponse)) {
      throw new Error('Invalid response structure');
    }
    
    // Check if required fields exist
    if (!apiResponse.data || typeof apiResponse.data !== 'object') {
      throw new Error('Missing data field');
    }
    
    return {
      aqi: apiResponse?.data?.aqi || 0,
      pm25: apiResponse?.data?.iaqi?.pm25?.v || 0,
      pm10: apiResponse?.data?.iaqi?.pm10?.v || 0,
      source: 'aqicn_live',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    // Return safe defaults on parse error
    return {
      aqi: 0,
      pm25: 0,
      pm10: 0,
      source: 'aqicn_demo',
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = {
  validateCoordinates,
  validateUPIId,
  validateAmount,
  parseWeatherResponse,
  parseAQIResponse,
};
