class GeoService {
  // Calculate distance between two points using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distance in meters
  }

  // Check if a point is within a radius of another point
  isWithinRadius(userLat, userLon, targetLat, targetLon, radiusInMeters) {
    const distance = this.calculateDistance(userLat, userLon, targetLat, targetLon);
    return {
      isWithin: distance <= radiusInMeters,
      distance
    };
  }

  // Validate coordinates
  validateCoordinates(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return { valid: false, error: 'Coordonnées invalides' };
    }

    if (lat < -90 || lat > 90) {
      return { valid: false, error: 'Latitude doit être entre -90 et 90' };
    }

    if (lon < -180 || lon > 180) {
      return { valid: false, error: 'Longitude doit être entre -180 et 180' };
    }

    return { valid: true, latitude: lat, longitude: lon };
  }

  // Check if user is within event geofence
  checkGeofence(userLat, userLon, event) {
    if (!event.latitude || !event.longitude) {
      // If event has no coordinates, allow check-in
      return {
        allowed: true,
        isWithinGeofence: null,
        distance: null,
        message: 'Géolocalisation non configurée pour cet événement'
      };
    }

    const validation = this.validateCoordinates(userLat, userLon);
    if (!validation.valid) {
      return {
        allowed: false,
        error: validation.error
      };
    }

    const { isWithin, distance } = this.isWithinRadius(
      validation.latitude,
      validation.longitude,
      parseFloat(event.latitude),
      parseFloat(event.longitude),
      event.geoRadius || 100
    );

    return {
      allowed: true,
      isWithinGeofence: isWithin,
      distance,
      message: isWithin
        ? 'Dans la zone autorisée'
        : `Hors zone (${distance}m de la localisation requise, limite: ${event.geoRadius}m)`
    };
  }

  // Get bearing between two points
  getBearing(lat1, lon1, lat2, lon2) {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    const bearing = ((θ * 180) / Math.PI + 360) % 360;

    return bearing;
  }

  // Get cardinal direction from bearing
  getCardinalDirection(bearing) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  // Format distance for display
  formatDistance(meters) {
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  }

  // Calculate center point of multiple coordinates
  calculateCenter(coordinates) {
    if (!coordinates || coordinates.length === 0) {
      return null;
    }

    let x = 0,
      y = 0,
      z = 0;

    for (const coord of coordinates) {
      const lat = (coord.latitude * Math.PI) / 180;
      const lon = (coord.longitude * Math.PI) / 180;

      x += Math.cos(lat) * Math.cos(lon);
      y += Math.cos(lat) * Math.sin(lon);
      z += Math.sin(lat);
    }

    const total = coordinates.length;
    x /= total;
    y /= total;
    z /= total;

    const centralLon = Math.atan2(y, x);
    const centralSquareRoot = Math.sqrt(x * x + y * y);
    const centralLat = Math.atan2(z, centralSquareRoot);

    return {
      latitude: (centralLat * 180) / Math.PI,
      longitude: (centralLon * 180) / Math.PI
    };
  }

  // Get bounding box for a set of coordinates
  getBoundingBox(coordinates, paddingMeters = 0) {
    if (!coordinates || coordinates.length === 0) {
      return null;
    }

    let minLat = 90,
      maxLat = -90,
      minLon = 180,
      maxLon = -180;

    for (const coord of coordinates) {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLon = Math.min(minLon, coord.longitude);
      maxLon = Math.max(maxLon, coord.longitude);
    }

    // Add padding if specified
    if (paddingMeters > 0) {
      const latPadding = paddingMeters / 111320; // Approximate degrees per meter
      const lonPadding = paddingMeters / (111320 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));

      minLat -= latPadding;
      maxLat += latPadding;
      minLon -= lonPadding;
      maxLon += lonPadding;
    }

    return {
      southwest: { latitude: minLat, longitude: minLon },
      northeast: { latitude: maxLat, longitude: maxLon }
    };
  }
}

module.exports = new GeoService();
