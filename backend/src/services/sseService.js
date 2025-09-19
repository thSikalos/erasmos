class SSEService {
    constructor() {
        // Map of user_id -> Set of SSE response objects
        this.connections = new Map();
    }

    /**
     * Add a new SSE connection for a user
     * @param {number} userId - User ID
     * @param {Object} res - Express response object
     */
    addConnection(userId, res) {
        if (!this.connections.has(userId)) {
            this.connections.set(userId, new Set());
        }

        this.connections.get(userId).add(res);

        // Remove connection when client disconnects
        res.on('close', () => {
            this.removeConnection(userId, res);
        });

        console.log(`📡 SSE connection added for user ${userId}. Total connections: ${this.getTotalConnections()}`);
    }

    /**
     * Remove an SSE connection for a user
     * @param {number} userId - User ID
     * @param {Object} res - Express response object
     */
    removeConnection(userId, res) {
        const userConnections = this.connections.get(userId);
        if (userConnections) {
            userConnections.delete(res);
            if (userConnections.size === 0) {
                this.connections.delete(userId);
            }
        }
        console.log(`📡 SSE connection removed for user ${userId}. Total connections: ${this.getTotalConnections()}`);
    }

    /**
     * Send a message to a specific user
     * @param {number} userId - User ID
     * @param {Object} data - Data to send
     */
    sendToUser(userId, data) {
        const userConnections = this.connections.get(userId);
        if (!userConnections || userConnections.size === 0) {
            console.log(`📡 No SSE connections for user ${userId}`);
            return false;
        }

        const message = `data: ${JSON.stringify(data)}\n\n`;
        let sentCount = 0;

        // Send to all connections for this user (they might have multiple tabs open)
        for (const res of userConnections) {
            try {
                res.write(message);
                sentCount++;
            } catch (error) {
                console.error(`📡 Failed to send SSE message to user ${userId}:`, error);
                // Remove broken connection
                this.removeConnection(userId, res);
            }
        }

        console.log(`📡 Sent SSE message to user ${userId} (${sentCount} connections)`);
        return sentCount > 0;
    }

    /**
     * Send a message to all connected users
     * @param {Object} data - Data to send
     */
    broadcast(data) {
        let totalSent = 0;
        for (const [userId] of this.connections) {
            if (this.sendToUser(userId, data)) {
                totalSent++;
            }
        }
        console.log(`📡 Broadcast message sent to ${totalSent} users`);
        return totalSent;
    }

    /**
     * Get total number of active connections
     */
    getTotalConnections() {
        let total = 0;
        for (const [, connections] of this.connections) {
            total += connections.size;
        }
        return total;
    }

    /**
     * Get number of connected users
     */
    getConnectedUsersCount() {
        return this.connections.size;
    }

    /**
     * Send heartbeat to all connections to keep them alive
     */
    sendHeartbeat() {
        const heartbeat = `: heartbeat ${Date.now()}\n\n`;
        let totalSent = 0;

        for (const [userId, userConnections] of this.connections) {
            for (const res of userConnections) {
                try {
                    res.write(heartbeat);
                    totalSent++;
                } catch (error) {
                    console.error(`📡 Failed to send heartbeat to user ${userId}:`, error);
                    this.removeConnection(userId, res);
                }
            }
        }

        if (totalSent > 0) {
            console.log(`📡 Heartbeat sent to ${totalSent} connections`);
        }
    }

    /**
     * Start heartbeat interval to keep connections alive
     */
    startHeartbeat(intervalMs = 30000) {
        setInterval(() => {
            this.sendHeartbeat();
        }, intervalMs);
        console.log(`📡 SSE heartbeat started (${intervalMs}ms interval)`);
    }
}

// Create singleton instance
const sseService = new SSEService();

module.exports = sseService;