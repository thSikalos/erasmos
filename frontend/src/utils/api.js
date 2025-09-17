// API configuration utility
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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