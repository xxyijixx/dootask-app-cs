import { isMicroApp, getUserToken, getLanguageName } from '@dootask/tools';
import {  ApiError, NetworkError } from '../types/api';
import type { ApiResponse} from '../types/api';
/**
 * API配置
 */
interface ApiConfig {
  baseURL: string;
  timeout?: number;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const basePath = import.meta.env.VITE_BASE_PATH
/**
 * 默认API配置
 */
const DEFAULT_CONFIG: ApiConfig = {
//   baseURL: 'http://192.168.31.214:8888/api/v1',
  baseURL: `${apiBaseUrl || ''}${basePath || ''}/api/v1`,
  timeout: 10000,
};

/**
 * 通用API请求方法
 * @param url 请求URL
 * @param options 请求选项
 * @param config API配置
 * @returns 响应数据
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {},
  config: Partial<ApiConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  try {
    // 构建请求头
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...options.headers,
    });

    // 添加认证头
    headers.set('Authorization', 'Bearer 123456');
    if (await isMicroApp()) {
      headers.set('Token', await getUserToken());
    }

    // 添加语言头
    const language = await getLanguageName();
    if (language) {
      headers.set('Accept-Language', language);
    }

    const response = await fetch(`${finalConfig.baseURL}${url}`, {
      ...options,
      headers,
    });

    // 检查HTTP状态码
    if (!response.ok) {
      throw new NetworkError(
        `网络请求失败: ${response.status} ${response.statusText}`,
        response.status,
        response.statusText
      );
    }

    const result: ApiResponse<T> = await response.json();
    
    // 检查业务状态码
    if (result.code !== 200) {
      throw new ApiError(
        result.code,
        result.message || '请求失败',
        result.error
      );
    }

    return result.data as T;
  } catch (error) {
    // 重新抛出已知的错误类型
    if (error instanceof ApiError || error instanceof NetworkError) {
      throw error;
    }
    
    // 处理其他未知错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError('网络连接失败，请检查网络设置');
    }
    
    throw new NetworkError('请求处理失败，请稍后重试');
  }
}

/**
 * GET请求
 * @param url 请求URL
 * @param config API配置
 * @returns 响应数据
 */
export async function get<T = any>(
  url: string,
  config?: Partial<ApiConfig>
): Promise<T> {
  return apiRequest<T>(url, { method: 'GET' }, config);
}

/**
 * POST请求
 * @param url 请求URL
 * @param data 请求数据
 * @param config API配置
 * @returns 响应数据
 */
export async function post<T = any>(
  url: string,
  data?: any,
  config?: Partial<ApiConfig>
): Promise<T> {
  return apiRequest<T>(
    url,
    {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    },
    config
  );
}

/**
 * PUT请求
 * @param url 请求URL
 * @param data 请求数据
 * @param config API配置
 * @returns 响应数据
 */
export async function put<T = any>(
  url: string,
  data?: any,
  config?: Partial<ApiConfig>
): Promise<T> {
  return apiRequest<T>(
    url,
    {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    },
    config
  );
}

/**
 * DELETE请求
 * @param url 请求URL
 * @param config API配置
 * @returns 响应数据
 */
export async function del<T = any>(
  url: string,
  config?: Partial<ApiConfig>
): Promise<T> {
  return apiRequest<T>(url, { method: 'DELETE' }, config);
}