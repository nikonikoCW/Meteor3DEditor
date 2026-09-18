// 自动读取环境变量 (开发: .env.development, 生产: .env.production)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const API_BASE_URL = `${BASE_URL}/api`;
export const ASSET_BASE_URL = BASE_URL;
