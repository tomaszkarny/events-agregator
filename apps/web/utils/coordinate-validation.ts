export interface CoordinateValidationResult {
  isValid: boolean
  error?: string
}

export function validateCoordinates(latitude: number, longitude: number): CoordinateValidationResult {
  // Check if coordinates are numbers
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return {
      isValid: false,
      error: 'Coordinates must be numbers'
    }
  }

  // Check for NaN
  if (isNaN(latitude) || isNaN(longitude)) {
    return {
      isValid: false,
      error: 'Coordinates cannot be NaN'
    }
  }

  // Check latitude bounds (-90 to 90)
  if (latitude < -90 || latitude > 90) {
    return {
      isValid: false,
      error: 'Latitude must be between -90 and 90 degrees'
    }
  }

  // Check longitude bounds (-180 to 180)
  if (longitude < -180 || longitude > 180) {
    return {
      isValid: false,
      error: 'Longitude must be between -180 and 180 degrees'
    }
  }

  // Check for 0,0 coordinates (Gulf of Guinea) which might be a fallback error
  if (latitude === 0 && longitude === 0) {
    return {
      isValid: false,
      error: 'Invalid coordinates: 0,0 detected'
    }
  }

  return { isValid: true }
}

export function formatCoordinate(coord: number, precision: number = 6): string {
  return coord.toFixed(precision)
}