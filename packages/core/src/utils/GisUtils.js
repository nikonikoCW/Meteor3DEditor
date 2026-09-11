
/**
 * GIS Coordinate Utilities
 * Handles conversion between WGS84 (Lon/Lat), Web Mercator (EPSG:3857), and Tile Coordinates.
 */
export class GisUtils {
    static EARTH_RADIUS = 6378137;
    static MAX_LATITUDE = 85.0511287798;

    /**
     * Convert Longitude/Latitude to Web Mercator (EPSG:3857)
     * @param {number} lon 
     * @param {number} lat 
     * @returns {x, y} in meters
     */
    static lonLatToWebMercator(lon, lat) {
        const x = (lon * Math.PI * this.EARTH_RADIUS) / 180;
        let y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
        y = (y * Math.PI * this.EARTH_RADIUS) / 180;
        return { x, y };
    }

    /**
     * Convert Web Mercator to Longitude/Latitude
     * @param {number} x 
     * @param {number} y 
     * @returns {lon, lat}
     */
    static webMercatorToLonLat(x, y) {
        const lon = (x / (Math.PI * this.EARTH_RADIUS)) * 180;
        let lat = (y / (Math.PI * this.EARTH_RADIUS)) * 180;
        lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
        return { lon, lat };
    }

    /**
     * Get Tile Index from Web Mercator coordinates
     * @param {number} x Web Mercator X
     * @param {number} y Web Mercator Y
     * @param {number} zoom Zoom Level
     * @returns {x, y} Tile Index
     */
    static webMercatorToTile(x, y, zoom) {
        const resolution = (2 * Math.PI * this.EARTH_RADIUS) / (256 * Math.pow(2, zoom));
        const tileX = Math.floor((x + Math.PI * this.EARTH_RADIUS) / (256 * resolution));
        const tileY = Math.floor((Math.PI * this.EARTH_RADIUS - y) / (256 * resolution));
        return { x: tileX, y: tileY };
    }

    /**
     * Get Web Mercator Bounds for a specific Tile
     * @param {number} tx Tile X
     * @param {number} ty Tile Y
     * @param {number} zoom Zoom Level
     * @returns {minX, minY, maxX, maxY} Web Mercator Bounds
     */
    static tileToWebMercator(tx, ty, zoom) {
        const resolution = (2 * Math.PI * this.EARTH_RADIUS) / (256 * Math.pow(2, zoom));
        const minX = tx * 256 * resolution - Math.PI * this.EARTH_RADIUS;
        const maxY = Math.PI * this.EARTH_RADIUS - ty * 256 * resolution;
        const maxX = minX + 256 * resolution;
        const minY = maxY - 256 * resolution;
        return { minX, minY, maxX, maxY };
    }

    /**
     * Calculate relative position in scene (RTC)
     * @param {number} targetLon 
     * @param {number} targetLat 
     * @param {number} centerLon Scene Center Lon
     * @param {number} centerLat Scene Center Lat
     * @returns {x, z} Three.js coordinates (y is up, so map is x, -z)
     */
    static getRelativePosition(targetLon, targetLat, centerLon, centerLat) {
        const target = this.lonLatToWebMercator(targetLon, targetLat);
        const center = this.lonLatToWebMercator(centerLon, centerLat);

        // Three.js: X is East, -Z is North (standard right-handed Y-up)
        // Web Mercator: X is East, Y is North
        return {
            x: target.x - center.x,
            z: -(target.y - center.y)
        };
    }
}
