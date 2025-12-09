/**
 * 轻量级 GIS 投影工具
 * 基于参考点（中心经纬度）计算 ENU 局部坐标，供 Three.js 使用。
 * 说明：
 * - 这里使用椭球参数区分 WGS84/CGCS2000/西安80。
 * - 结果以米为单位，east -> X，north -> Z，up -> Y。
 */
export class GisProjection {
    constructor({ center, projection = 'WGS84' }) {
        this.setReference(center, projection);
    }

    setReference(center, projection = 'WGS84') {
        this.reference = { ...center };
        this.projection = projection;
        this.ellipsoid = this.getEllipsoid(projection);
        this.refEcef = this.llhToEcef(
            this.degToRad(center.lat),
            this.degToRad(center.lng),
            0,
            this.ellipsoid
        );
    }

    /**
     * 将经纬高转换为本地 ENU（米）
     */
    lngLatToEnu(lng, lat, height = 0) {
        const phi = this.degToRad(lat);
        const lambda = this.degToRad(lng);
        const h = height;

        const ecef = this.llhToEcef(phi, lambda, h, this.ellipsoid);
        return this.ecefToEnu(ecef, this.refEcef, this.reference);
    }

    /** 基础：经纬度高 -> ECEF */
    llhToEcef(phi, lambda, h, ellipsoid) {
        const { a, f } = ellipsoid;
        const e2 = 2 * f - f * f;

        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        const sinLam = Math.sin(lambda);
        const cosLam = Math.cos(lambda);

        const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);

        const x = (N + h) * cosPhi * cosLam;
        const y = (N + h) * cosPhi * sinLam;
        const z = (N * (1 - e2) + h) * sinPhi;

        return { x, y, z };
    }

    /** 基础：ECEF -> ENU（参考点为 ref） */
    ecefToEnu(ecef, refEcef, refLlhDeg) {
        const d = {
            x: ecef.x - refEcef.x,
            y: ecef.y - refEcef.y,
            z: ecef.z - refEcef.z,
        };

        const phi = this.degToRad(refLlhDeg.lat);
        const lambda = this.degToRad(refLlhDeg.lng);

        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        const sinLam = Math.sin(lambda);
        const cosLam = Math.cos(lambda);

        const east = -sinLam * d.x + cosLam * d.y;
        const north = -sinPhi * cosLam * d.x - sinPhi * sinLam * d.y + cosPhi * d.z;
        const up = cosPhi * cosLam * d.x + cosPhi * sinLam * d.y + sinPhi * d.z;

        return { east, north, up };
    }

    /** 椭球参数 */
    getEllipsoid(projection) {
        // 半长轴 a（米），扁率 f
        switch (projection) {
            case 'CGCS2000': // 与 WGS84 接近
                return { a: 6378137.0, f: 1 / 298.257222101 };
            case 'Xian80':
            case 'XIAN80':
                return { a: 6378140.0, f: 1 / 298.257 };
            case 'WGS84':
            default:
                return { a: 6378137.0, f: 1 / 298.257223563 };
        }
    }

    degToRad(deg) {
        return (deg * Math.PI) / 180;
    }

    radToDeg(rad) {
        return (rad * 180) / Math.PI;
    }

    /**
     * 计算当前参考纬度处的卯酉曲率半径 N 与子午圈曲率半径 M
     */
    getCurvatureRadii(phi) {
        const { a, f } = this.ellipsoid;
        const e2 = 2 * f - f * f;
        const sinPhi = Math.sin(phi);
        const denom = Math.sqrt(1 - e2 * sinPhi * sinPhi);
        const N = a / denom;
        const M = (a * (1 - e2)) / Math.pow(denom, 3);
        return { N, M };
    }

    /**
     * 已知参考点，按东向/北向偏移（米）求新的经纬度
     * 适用于小范围平面假设
     */
    offsetMetersToLngLat(dEast, dNorth) {
        const phi = this.degToRad(this.reference.lat);
        const lambda = this.degToRad(this.reference.lng);
        const { N, M } = this.getCurvatureRadii(phi);

        const dLambda = dEast / (N * Math.cos(phi)); // 弧度
        const dPhi = dNorth / M;                     // 弧度

        return {
            lat: this.radToDeg(phi + dPhi),
            lng: this.radToDeg(lambda + dLambda),
        };
    }

    /**
     * 根据长宽（米）计算经纬度范围
     * @param {{length:number,width:number}} range
     */
    computeBounds(range) {
        const length = Number(range?.length) || 0;
        const width = Number(range?.width) || 0;
        const halfNorthSouth = length / 2;
        const halfEastWest = width / 2;

        const northPoint = this.offsetMetersToLngLat(0, halfNorthSouth);
        const southPoint = this.offsetMetersToLngLat(0, -halfNorthSouth);
        const eastPoint = this.offsetMetersToLngLat(halfEastWest, 0);
        const westPoint = this.offsetMetersToLngLat(-halfEastWest, 0);

        return {
            maxLat: northPoint.lat,
            minLat: southPoint.lat,
            maxLng: eastPoint.lng,
            minLng: westPoint.lng,
        };
    }
}


