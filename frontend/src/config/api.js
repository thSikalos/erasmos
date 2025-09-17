// Centralized API configuration
export const API_CONFIG = {
    // Use current backend URL
    BASE_URL: 'http://localhost:8080',

    // Timeout configuration
    TIMEOUT: 30000, // 30 seconds

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

// Export individual pieces for backward compatibility
export const API_BASE_URL = API_CONFIG.BASE_URL;
export default API_CONFIG;