import axios from 'axios';

class PushService {
    constructor() {
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        this.registration = null;
        this.subscription = null;
        this.vapidPublicKey = null;
    }

    /**
     * Check if push notifications are supported
     */
    isNotificationSupported() {
        return this.isSupported && 'Notification' in window;
    }

    /**
     * Get current notification permission status
     */
    getPermissionStatus() {
        if (!this.isNotificationSupported()) {
            return 'unsupported';
        }
        return Notification.permission;
    }

    /**
     * Register service worker
     */
    async registerServiceWorker() {
        if (!this.isSupported) {
            throw new Error('Service Workers not supported');
        }

        try {
            console.log('📦 Registering service worker...');

            this.registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('✅ Service Worker registered:', this.registration);

            // Listen for service worker updates
            this.registration.addEventListener('updatefound', () => {
                console.log('🔄 Service Worker update found');
            });

            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event);
            });

            return this.registration;
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
            throw error;
        }
    }

    /**
     * Handle messages from service worker
     */
    handleServiceWorkerMessage(event) {
        const { type, data } = event.data || {};

        switch (type) {
            case 'NAVIGATE':
                // Navigate to specific URL when notification is clicked
                if (data?.url && window.location.pathname !== data.url) {
                    console.log('🔗 Navigating to:', data.url);
                    window.location.href = data.url;
                }
                break;

            default:
                console.log('💬 Service Worker message:', event.data);
        }
    }

    /**
     * Request notification permission
     */
    async requestNotificationPermission() {
        if (!this.isNotificationSupported()) {
            throw new Error('Notifications not supported');
        }

        if (Notification.permission === 'granted') {
            return 'granted';
        }

        if (Notification.permission === 'denied') {
            throw new Error('Notification permission denied by user');
        }

        try {
            console.log('🔔 Requesting notification permission...');
            const permission = await Notification.requestPermission();
            console.log('📋 Permission result:', permission);
            return permission;
        } catch (error) {
            console.error('❌ Permission request failed:', error);
            throw error;
        }
    }

    /**
     * Get VAPID public key from server
     */
    async getVAPIDPublicKey() {
        if (this.vapidPublicKey) {
            return this.vapidPublicKey;
        }

        try {
            const response = await axios.get('/api/notifications/push/vapid-public-key');

            if (response.data.success) {
                this.vapidPublicKey = response.data.publicKey;
                console.log('🔑 VAPID public key received');
                return this.vapidPublicKey;
            } else {
                throw new Error(response.data.message || 'Failed to get VAPID public key');
            }
        } catch (error) {
            console.error('❌ Failed to get VAPID public key:', error);
            throw error;
        }
    }

    /**
     * Subscribe to push notifications
     */
    async subscribeToPush() {
        try {
            // Check support
            if (!this.isSupported) {
                throw new Error('Push notifications not supported');
            }

            // Register service worker if not already registered
            if (!this.registration) {
                await this.registerServiceWorker();
            }

            // Request permission
            const permission = await this.requestNotificationPermission();
            if (permission !== 'granted') {
                throw new Error('Notification permission not granted');
            }

            // Get VAPID public key
            const vapidPublicKey = await this.getVAPIDPublicKey();

            // Convert VAPID key to Uint8Array
            const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

            // Subscribe to push manager
            console.log('📱 Creating push subscription...');
            this.subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });

            console.log('✅ Push subscription created:', this.subscription);

            // Send subscription to server
            await this.sendSubscriptionToServer(this.subscription);

            return this.subscription;
        } catch (error) {
            console.error('❌ Push subscription failed:', error);
            throw error;
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribeFromPush() {
        try {
            if (!this.subscription) {
                // Try to get existing subscription
                if (this.registration) {
                    this.subscription = await this.registration.pushManager.getSubscription();
                }
            }

            if (!this.subscription) {
                console.log('📵 No active push subscription found');
                return false;
            }

            console.log('📵 Unsubscribing from push notifications...');

            // Unsubscribe from push manager
            const unsubscribed = await this.subscription.unsubscribe();

            if (unsubscribed) {
                // Notify server about unsubscription
                await this.removeSubscriptionFromServer(this.subscription.endpoint);
                this.subscription = null;
                console.log('✅ Successfully unsubscribed from push notifications');
            }

            return unsubscribed;
        } catch (error) {
            console.error('❌ Push unsubscription failed:', error);
            throw error;
        }
    }

    /**
     * Check if user is currently subscribed
     */
    async isSubscribed() {
        try {
            if (!this.registration) {
                return false;
            }

            const subscription = await this.registration.pushManager.getSubscription();
            this.subscription = subscription;
            return !!subscription;
        } catch (error) {
            console.error('❌ Failed to check subscription status:', error);
            return false;
        }
    }

    /**
     * Send subscription to server
     */
    async sendSubscriptionToServer(subscription) {
        try {
            const response = await axios.post('/api/notifications/push/subscribe', {
                subscription: subscription.toJSON()
            });

            if (response.data.success) {
                console.log('✅ Subscription sent to server successfully');
                return response.data;
            } else {
                throw new Error(response.data.message || 'Failed to save subscription');
            }
        } catch (error) {
            console.error('❌ Failed to send subscription to server:', error);
            throw error;
        }
    }

    /**
     * Remove subscription from server
     */
    async removeSubscriptionFromServer(endpoint) {
        try {
            const response = await axios.delete('/api/notifications/push/subscribe', {
                data: { endpoint }
            });

            if (response.data.success) {
                console.log('✅ Subscription removed from server successfully');
                return response.data;
            } else {
                throw new Error(response.data.message || 'Failed to remove subscription');
            }
        } catch (error) {
            console.error('❌ Failed to remove subscription from server:', error);
            throw error;
        }
    }

    /**
     * Test push notification (for debugging)
     */
    async sendTestNotification() {
        if (!this.isNotificationSupported() || Notification.permission !== 'granted') {
            throw new Error('Notifications not available');
        }

        const notification = new Notification('🧪 Test Notification', {
            body: 'This is a test notification from Erasmos',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'test-notification',
            requireInteraction: false
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);

        return notification;
    }

    /**
     * Comprehensive diagnostic info
     */
    getDiagnosticInfo() {
        const info = {
            browserSupport: {
                serviceWorker: 'serviceWorker' in navigator,
                pushManager: 'PushManager' in window,
                notification: 'Notification' in window,
                supported: this.isSupported
            },
            permissions: {
                notification: this.getPermissionStatus(),
                granted: Notification.permission === 'granted'
            },
            registration: {
                hasRegistration: !!this.registration,
                scope: this.registration?.scope || null,
                active: !!this.registration?.active
            },
            subscription: {
                hasSubscription: !!this.subscription,
                endpoint: this.subscription?.endpoint?.substring(0, 50) + '...' || null
            }
        };

        console.log('📊 Push Service Diagnostic Info:', info);
        return info;
    }

    /**
     * Convert base64 VAPID key to Uint8Array
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray;
    }

    /**
     * Initialize push service
     */
    async initialize() {
        try {
            if (!this.isSupported) {
                console.log('📵 Push notifications not supported');
                return false;
            }

            // Register service worker
            await this.registerServiceWorker();

            // Check if already subscribed
            const isSubscribed = await this.isSubscribed();
            console.log('📱 Push subscription status:', isSubscribed);

            return isSubscribed;
        } catch (error) {
            console.error('❌ Push service initialization failed:', error);
            return false;
        }
    }

    /**
     * Get service worker version
     */
    async getServiceWorkerVersion() {
        if (!this.registration) {
            throw new Error('Service worker not registered');
        }

        return new Promise((resolve) => {
            const messageChannel = new MessageChannel();

            messageChannel.port1.onmessage = (event) => {
                resolve(event.data);
            };

            this.registration.active.postMessage(
                { type: 'GET_VERSION' },
                [messageChannel.port2]
            );
        });
    }
}

// Export singleton instance
const pushService = new PushService();
export default pushService;