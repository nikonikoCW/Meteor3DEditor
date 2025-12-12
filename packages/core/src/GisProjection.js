/**
 * 轻量级 GIS 投影工具 (WGS84)
 * 基于参考点（中心经纬度）计算 ENU 局部坐标，供 Three.js 使用。
 * 说明：
 * - 使用 WGS84 椭球参数
 * - 结果以米为单位，east -> X，north -> Z，up -> Y
 */
export class GisProjection {
    // WGS84 椭球参数
    static ELLIPSOID = {
        a: 6378137.0,           // 半长轴（米）
        f: 1 / 298.257223563    // 扁率
    };

    constructor({ center }) {
        this.setReference(center);
    }

    setReference(center) {
        this.reference = { ...center };
        this.refEcef = this.llhToEcef(
            this.degToRad(center.lat),
            this.degToRad(center.lng),
            0
        );
    }

    /**
     * 将经纬高转换为本地 ENU（米）
     */
    lngLatToEnu(lng, lat, height = 0) {
        const phi = this.degToRad(lat);
        const lambda = this.degToRad(lng);

        const ecef = this.llhToEcef(phi, lambda, height);
        return this.ecefToEnu(ecef, this.refEcef, this.reference);
    }

    /** 基础：经纬度高 -> ECEF */
    llhToEcef(phi, lambda, h) {
        const { a, f } = GisProjection.ELLIPSOID;
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
        const { a, f } = GisProjection.ELLIPSOID;
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
}
