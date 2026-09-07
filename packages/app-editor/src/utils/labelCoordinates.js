// Resolve each label independently; explicit XYZ fields take precedence.
export function getLabelLocation(label) {
  if (!label || typeof label !== 'object' || Array.isArray(label)) {
    throw new Error('标签数据必须是对象');
  }
  if (['x', 'y', 'z'].some(key => Object.hasOwn(label, key))) {
    const { x, y, z } = label;
    if (![x, y, z].every(Number.isFinite)) {
      throw new Error('XYZ 模式下，x、y、z 必须是有效数字');
    }
    return { position: { x, y, z } };
  }
  const { lng, lat, height = 0 } = label;
  if (![lng, lat, height].every(Number.isFinite) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
    throw new Error('经纬度模式下，请填写有效的 lng（-180～180）、lat（-90～90）和 height 数字');
  }
  return { lngLat: { lng, lat, height } };
}
