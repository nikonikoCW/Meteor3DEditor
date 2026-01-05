
import { GisUtils } from './utils/GisUtils.js';

/**
 * Layer 1: Core GIS Engine
 * Responsible for all mathematical transformations between WGS84 and Three.js Scene Coordinates.
 * Maintains the "Floating Origin" state.
 */
export class GeoCoordinateSystem {
    constructor(centerLon, centerLat) {
        this.centerLon = centerLon;
        this.centerLat = centerLat;

        // Calculate the Web Mercator coordinate of the scene center (0,0,0)
        this.centerMercator = GisUtils.lonLatToWebMercator(centerLon, centerLat);
    }

    /**
     * Update the scene center (Floating Origin)
     * @param {number} lon 
     * @param {number} lat 
     */
    setCenter(lon, lat) {
        this.centerLon = lon;
        this.centerLat = lat;
        this.centerMercator = GisUtils.lonLatToWebMercator(lon, lat);
    }

    /**
     * Convert WGS84 (Lon/Lat) to Three.js Scene Coordinates (Vector3)
     * @param {number} lon 
     * @param {number} lat 
     * @param {number} height (optional, default 0)
     * @returns {x, y, z} Scene position
     */
    project(lon, lat, height = 0) {
        const targetMercator = GisUtils.lonLatToWebMercator(lon, lat);

        // Calculate relative offset from center
        // Web Mercator X -> Scene X (East)
        // Web Mercator Y -> Scene -Z (North)
        const x = targetMercator.x - this.centerMercator.x;
        const z = -(targetMercator.y - this.centerMercator.y);

        return { x, y: height, z };
    }

    /**
     * Convert Three.js Scene Coordinates to WGS84 (Lon/Lat)
     * @param {number} x 
     * @param {number} z 
     * @returns {lon, lat}
     */
    unproject(x, z) {
        const mercatorX = this.centerMercator.x + x;
        const mercatorY = this.centerMercator.y - z; // z is negative y

        return GisUtils.webMercatorToLonLat(mercatorX, mercatorY);
    }
}
