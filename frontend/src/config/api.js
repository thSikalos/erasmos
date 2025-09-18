// Auto-detection logic for different environments
const getBaseUrl = () => {
    // Priority: Environment variables
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL;
    }

    // Auto-detect based on current environment
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Development environment
        return `${protocol}//${hostname}:3000`;
    }

    // Production environment
    return `${protocol}//${hostname}`;
};

// Centralized API configuration
export const API_CONFIG = {
    // Use intelligent BASE_URL detection
    BASE_URL: getBaseUrl(),

    // Timeout configuration
    TIMEOUT: import.meta.env.VITE_API_TIMEOUT || 30000, // 30 seconds

    // Rate limiting headers to check
    RATE_LIMIT_HEADERS: {
        LIMIT: 'x-ratelimit-limit',
        REMAINING: 'x-ratelimit-remaining',
        RESET: 'x-ratelimit-reset'
    },

    // Request configuration
    REQUEST_CONFIG: {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        withCredentials: false
    }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${API_CONFIG.BASE_URL}/api/${cleanEndpoint}`;
};

// Helper function to get authenticated headers
export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        ...API_CONFIG.REQUEST_CONFIG.headers,
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

// Always show API configuration for debugging
console.log('🔧 API Configuration:');
console.log('- BASE_URL:', API_CONFIG.BASE_URL);
console.log('- TIMEOUT:', API_CONFIG.TIMEOUT);
console.log('- Environment variables:', {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_API_TIMEOUT: import.meta.env.VITE_API_TIMEOUT,
    VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
    VITE_ENABLE_DEBUG_LOGGING: import.meta.env.VITE_ENABLE_DEBUG_LOGGING
});

// Export individual pieces for backward compatibility
export const API_BASE_URL = API_CONFIG.BASE_URL;
export default API_CONFIG;