class SSEService {
    constructor() {
        this.eventSource = null;
        this.isConnected = false;
        this.listeners = new Map();
        this.reconnectTimeout = null;
        this.maxReconnectAttempts = 5;
        this.reconnectAttempts = 0;
        this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    }

    /**
     * Connect to SSE endpoint
     * @param {string} token - JWT token for authentication
     */
    connect(token) {
        if (this.eventSource && this.isConnected) {
            console.log('📡 SSE already connected');
            return;
        }

        try {
            // EventSource doesn't support custom headers, so pass token as query parameter
            const url = `${this.baseURL}/api/sse/events?token=${encodeURIComponent(token)}`;

            this.eventSource = new EventSource(url);

            this.eventSource.onopen = () => {
                console.log('📡 SSE connection opened');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.emit('connected');
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 SSE message received:', data);

                    // Emit specific event type
                    this.emit(data.type, data);

                    // Also emit general 'message' event
                    this.emit('message', data);
                } catch (error) {
                    console.error('📡 Failed to parse SSE message:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('📡 SSE connection error:', error);
                this.isConnected = false;
                this.emit('error', error);

                // Attempt to reconnect
                this.handleReconnect(token);
            };

        } catch (error) {
            console.error('📡 Failed to create SSE connection:', error);
            this.emit('error', error);
        }
    }

    /**
     * Handle reconnection logic
     */
    handleReconnect(token) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('📡 Max reconnection attempts reached');
            this.emit('maxReconnectAttemptsReached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s

        console.log(`📡 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        this.reconnectTimeout = setTimeout(() => {
            this.disconnect();
            this.connect(token);
        }, delay);
    }

    /**
     * Disconnect from SSE
     */
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        this.isConnected = false;
        this.reconnectAttempts = 0;
        console.log('📡 SSE disconnected');
        this.emit('disconnected');
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {function} callback - Callback function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {function} callback - Callback function to remove
     */
    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`📡 Error in SSE event callback for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }

    /**
     * Send test notification (for debugging)
     * @param {string} token - JWT token
     * @param {object} notification - Notification data
     */
    async sendTestNotification(token, notification = {}) {
        try {
            const response = await fetch(`${this.baseURL}/api/sse/test-notification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(notification)
            });

            const result = await response.json();
            console.log('📡 Test notification sent:', result);
            return result;
        } catch (error) {
            console.error('📡 Failed to send test notification:', error);
            throw error;
        }
    }
}

// Create singleton instance
const sseService = new SSEService();

export default sseService;