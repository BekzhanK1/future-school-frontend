import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    AxiosError,
    InternalAxiosRequestConfig,
} from 'axios';
import { redirect } from 'next/navigation';

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
    metadata?: {
        startTime: Date;
    };
}

interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

const axiosInstance: AxiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

let isRefreshing = false;

const refreshAccessToken = async (): Promise<string | null> => {
    try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
            return null;
        }

        const response = await axios.post(
            `${
                process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
            }/auth/refresh/`,
            { refresh: refreshToken }
        );

        const { access, refresh: newRefreshToken } = response.data;

        if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', access);
            localStorage.setItem('refreshToken', newRefreshToken);
        }

        return access;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
};

axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('accessToken');

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            console.log('⚠️ No token found for request');
        }

        (config as CustomAxiosRequestConfig).metadata = {
            startTime: new Date(),
        };

        console.log('🚀 Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            headers: config.headers,
            data: config.data,
        });

        return config;
    },
    (error: AxiosError) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
        const endTime = new Date();
        const startTime = (response.config as CustomAxiosRequestConfig).metadata
            ?.startTime;
        const duration = startTime
            ? endTime.getTime() - startTime.getTime()
            : 0;

        console.log('✅ Response:', {
            status: response.status,
            statusText: response.statusText,
            url: response.config.url,
            duration: `${duration}ms`,
            data: response.data,
        });

        return response;
    },
    async (error: AxiosError) => {
        const endTime = new Date();
        const startTime = (error.config as CustomAxiosRequestConfig)?.metadata
            ?.startTime;
        const duration = startTime
            ? endTime.getTime() - startTime.getTime()
            : 0;

        // Handle network errors (no response)
        if (!error.response) {
            console.error('❌ Network Error:', {
                message: error.message,
                code: error.code,
                url: error.config?.url,
                baseURL: error.config?.baseURL,
                fullUrl: error.config?.baseURL
                    ? `${error.config.baseURL}${error.config.url}`
                    : error.config?.url,
                duration: `${duration}ms`,
                error: error,
            });
            
            // Check if it's a connection error
            if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
                console.error('🔴 Cannot connect to API server. Is the backend running on http://localhost:8000?');
            }
        } else {
            // Extract error message from Django REST Framework response
            const errorData = error.response?.data;
            let errorMessage = error.message;
            let errorDetails: any = null;

            if (errorData) {
                // DRF validation errors format: { "field": ["error1", "error2"] }
                if (typeof errorData === 'object' && !Array.isArray(errorData)) {
                    const errorObj = errorData as Record<string, any>;
                    
                    // Check for detail field (general errors)
                    if (errorObj.detail) {
                        errorMessage = typeof errorObj.detail === 'string' 
                            ? errorObj.detail 
                            : JSON.stringify(errorObj.detail);
                    }
                    // Check for non_field_errors
                    else if (errorObj.non_field_errors) {
                        errorMessage = Array.isArray(errorObj.non_field_errors)
                            ? errorObj.non_field_errors.join(', ')
                            : String(errorObj.non_field_errors);
                    }
                    // Format field-specific validation errors
                    else {
                        const fieldErrors = Object.entries(errorObj)
                            .map(([field, messages]) => {
                                const msg = Array.isArray(messages) 
                                    ? messages.join(', ') 
                                    : String(messages);
                                return `${field}: ${msg}`;
                            })
                            .join('; ');
                        if (fieldErrors) {
                            errorMessage = fieldErrors;
                            errorDetails = errorObj;
                        }
                    }
                } else if (typeof errorData === 'string') {
                    errorMessage = errorData;
                }
            }

            const isLogin401 = error.response?.status === 401 && error.config?.url?.includes('/auth/login');
            if (!isLogin401) {
                console.error('❌ Response Error:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    url: error.config?.url,
                    baseURL: error.config?.baseURL,
                    fullUrl: error.config?.baseURL
                        ? `${error.config.baseURL}${error.config.url}`
                        : error.config?.url,
                    duration: `${duration}ms`,
                    message: errorMessage,
                    rawData: errorData,
                    details: errorDetails,
                });
            }

            // Attach formatted error message to error object for easier access
            (error as any).formattedMessage = errorMessage;
        }

        if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
            console.error(
                '🔒 Authentication Error - Token may be invalid or expired'
            );
        }

        const originalRequest = error.config;

        if (error.response?.status === 401 && originalRequest) {
            if (originalRequest?.url?.includes('/auth/refresh')) {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login?session_expired=true';
                }
                return Promise.reject(error);
            }
            // Не пытаться обновлять токен при ошибке логина (ещё нет refresh)
            if (originalRequest?.url?.includes('/auth/login')) {
                return Promise.reject(error);
            }

            (originalRequest as CustomInternalAxiosRequestConfig)._retry = true;
            isRefreshing = true;

            try {
                const newToken = await refreshAccessToken();

                if (newToken) {
                    if (originalRequest?.headers) {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    }

                    return axiosInstance(originalRequest);
                } else {
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('refreshToken');
                        window.location.href = '/login?session_expired=true';
                    }
                    return Promise.reject(error);
                }
            } catch (refreshError) {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login?session_expired=true';
                }
                return Promise.reject(error);
            } finally {
                isRefreshing = false;
            }
        }

        if (error.response?.status && error.response.status >= 500) {
            console.error('Server Error:', error.response.data);
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
