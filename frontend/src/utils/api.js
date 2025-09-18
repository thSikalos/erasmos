// API configuration utility with dynamic port support
const DEFAULT_BACKEND_PORT = 3000;
const DEFAULT_HOST = 'localhost';

// Primary API URL from environment
let apiBaseUrl = import.meta.env.VITE_API_URL;

// Fallback to constructed URL if not provided
if (!apiBaseUrl) {
    const port = import.meta.env.VITE_BACKEND_PORT || DEFAULT_BACKEND_PORT;
    const host = import.meta.env.VITE_HOST || DEFAULT_HOST;
    apiBaseUrl = `http://${host}:${port}`;
}

export const API_BASE_URL = apiBaseUrl;

// Debug logging
console.log('🔧 UTILS API Configuration:');
console.log('- API_BASE_URL:', API_BASE_URL);
console.log('- VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('- DEFAULT_BACKEND_PORT:', DEFAULT_BACKEND_PORT);

// Helper function to build API URLs
export const apiUrl = (endpoint) => {
    // Remove leading slash if present to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
    // Auth endpoints
    LOGIN: '/api/users/login',
    REGISTER: '/api/users/register',
    PROFILE: '/api/users/profile',

    // Application endpoints
    APPLICATIONS: '/api/applications',
    APPLICATION_DETAIL: (id) => `/api/applications/${id}`,

    // Other common endpoints can be added here as needed
};

export default {
    API_BASE_URL,
    apiUrl,
    API_ENDPOINTS
};