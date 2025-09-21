/*
 * Copyright (C) 2024-present Puter Technologies Inc.
 *
 * This file is part of Puter.
 *
 * Puter is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const BaseService = require('../../services/BaseService');
const express = require('express');
const auth = require('../../middleware/auth');

/**
 * CanvasService manages the Chrono-Canvas collaborative pixel art game.
 * It handles canvas state, pixel operations, real-time updates, and persistence.
 */
class CanvasService extends BaseService {
    async _construct() {
        // Canvas configuration
        this.CANVAS_WIDTH = 1000;
        this.CANVAS_HEIGHT = 1000;
        this.DEFAULT_COLOR = '#FFFFFF';
        
        // Initialize canvas data structure
        // Using a Map for efficient pixel storage: key = "x,y", value = { color, userId, timestamp }
        this.canvas = new Map();
        
        // Track active users
        this.activeUsers = new Map();
    }

    async _init() {
        // Initialize canvas with default background
        this.initializeCanvas();
        
        // Set up API routes
        this.setupRoutes();
        
        // Set up real-time socket handlers
        this.setupSocketHandlers();
    }

    /**
     * Register routes when web server is ready
     */
    async ['__on_ready.webserver'] () {
        if (this.router) {
            const webService = this.services.get('web-server');
            if (webService && webService.app) {
                webService.app.use('/api', this.router);
                console.log('Chrono-Canvas API routes registered');
            }
        }
    }

    /**
     * Initialize the canvas with default background pixels
     */
    initializeCanvas() {
        // For now, start with an empty canvas - pixels are added on demand
        console.log(`Chrono-Canvas initialized: ${this.CANVAS_WIDTH}x${this.CANVAS_HEIGHT}`);
    }

    /**
     * Set up REST API routes for canvas operations
     */
    setupRoutes() {
        const router = express.Router();

        // Get canvas data (for initial load and synchronization)
        router.get('/chrono-canvas/canvas', (req, res) => {
            try {
                const canvasData = this.getCanvasData();
                res.json({
                    success: true,
                    canvas: canvasData,
                    width: this.CANVAS_WIDTH,
                    height: this.CANVAS_HEIGHT
                });
            } catch (error) {
                console.error('Error getting canvas data:', error);
                res.status(500).json({ success: false, error: 'Failed to get canvas data' });
            }
        });

        // Get canvas metadata
        router.get('/chrono-canvas/info', (req, res) => {
            res.json({
                success: true,
                width: this.CANVAS_WIDTH,
                height: this.CANVAS_HEIGHT,
                totalPixels: this.canvas.size,
                activeUsers: this.activeUsers.size
            });
        });

        // Place a pixel (authenticated endpoint)
        router.post('/chrono-canvas/pixel', auth, express.json(), (req, res) => {
            try {
                const { x, y, color } = req.body;
                const userId = req.user ? req.user.id : 'anonymous';
                
                const result = this.placePixel(x, y, color, userId);
                
                if (result.success) {
                    // Broadcast pixel update to all connected clients
                    this.broadcastPixelUpdate(x, y, color, userId);
                    res.json(result);
                } else {
                    res.status(400).json(result);
                }
            } catch (error) {
                console.error('Error placing pixel:', error);
                res.status(500).json({ success: false, error: 'Failed to place pixel' });
            }
        });

        // Get pixel information
        router.get('/chrono-canvas/pixel/:x/:y', (req, res) => {
            try {
                const x = parseInt(req.params.x);
                const y = parseInt(req.params.y);
                const pixelInfo = this.getPixelInfo(x, y);
                res.json({ success: true, pixel: pixelInfo });
            } catch (error) {
                console.error('Error getting pixel info:', error);
                res.status(500).json({ success: false, error: 'Failed to get pixel info' });
            }
        });

        // Store the router for later registration
        this.router = router;
    }

    /**
     * Set up Socket.io handlers for real-time collaboration
     */
    setupSocketHandlers() {
        const socketService = this.services.get('socketio');
        if (!socketService || !socketService.io) {
            console.warn('Socket.io service not available for Chrono-Canvas');
            return;
        }

        const io = socketService.io;

        io.on('connection', (socket) => {
            console.log('User connected to Chrono-Canvas:', socket.id);

            // Join the chrono-canvas room
            socket.join('chrono-canvas');

            // Track active user
            const userId = socket.user ? socket.user.id : socket.id;
            this.activeUsers.set(socket.id, {
                userId: userId,
                username: socket.user ? socket.user.username : 'Guest',
                connectedAt: new Date()
            });

            // Send current canvas state to new user
            socket.emit('canvas-state', {
                canvas: this.getCanvasData(),
                width: this.CANVAS_WIDTH,
                height: this.CANVAS_HEIGHT
            });

            // Handle pixel placement via socket
            socket.on('place-pixel', (data) => {
                try {
                    const { x, y, color } = data;
                    const result = this.placePixel(x, y, color, userId);
                    
                    if (result.success) {
                        // Broadcast to all users in the room except sender
                        socket.to('chrono-canvas').emit('pixel-update', {
                            x, y, color, userId,
                            username: this.activeUsers.get(socket.id)?.username || 'Guest'
                        });
                        
                        // Confirm to sender
                        socket.emit('pixel-placed', { success: true, x, y, color });
                    } else {
                        socket.emit('pixel-placed', { success: false, error: result.error });
                    }
                } catch (error) {
                    console.error('Socket pixel placement error:', error);
                    socket.emit('pixel-placed', { success: false, error: 'Failed to place pixel' });
                }
            });

            // Handle user disconnect
            socket.on('disconnect', () => {
                console.log('User disconnected from Chrono-Canvas:', socket.id);
                this.activeUsers.delete(socket.id);
            });
        });
    }

    /**
     * Place a pixel on the canvas
     */
    placePixel(x, y, color, userId) {
        // Validate coordinates
        if (!this.isValidCoordinate(x, y)) {
            return { success: false, error: 'Invalid coordinates' };
        }

        // Validate color (basic hex color validation)
        if (!this.isValidColor(color)) {
            return { success: false, error: 'Invalid color format' };
        }

        // Create pixel data
        const pixelKey = `${x},${y}`;
        const pixelData = {
            color: color,
            userId: userId,
            timestamp: new Date().toISOString()
        };

        // Store pixel
        this.canvas.set(pixelKey, pixelData);

        return { 
            success: true, 
            x, y, color, 
            timestamp: pixelData.timestamp 
        };
    }

    /**
     * Get information about a specific pixel
     */
    getPixelInfo(x, y) {
        if (!this.isValidCoordinate(x, y)) {
            return null;
        }

        const pixelKey = `${x},${y}`;
        const pixelData = this.canvas.get(pixelKey);

        if (!pixelData) {
            return {
                x, y,
                color: this.DEFAULT_COLOR,
                userId: null,
                timestamp: null
            };
        }

        return {
            x, y,
            ...pixelData
        };
    }

    /**
     * Get canvas data for transmission to clients
     */
    getCanvasData() {
        const data = {};
        for (const [key, pixelData] of this.canvas.entries()) {
            data[key] = pixelData;
        }
        return data;
    }

    /**
     * Broadcast pixel update to all connected clients
     */
    broadcastPixelUpdate(x, y, color, userId) {
        const socketService = this.services.get('socketio');
        if (socketService && socketService.io) {
            const user = this.activeUsers.get(userId);
            socketService.io.to('chrono-canvas').emit('pixel-update', {
                x, y, color, userId,
                username: user?.username || 'Guest'
            });
        }
    }

    /**
     * Validate coordinates are within canvas bounds
     */
    isValidCoordinate(x, y) {
        return Number.isInteger(x) && Number.isInteger(y) &&
               x >= 0 && x < this.CANVAS_WIDTH &&
               y >= 0 && y < this.CANVAS_HEIGHT;
    }

    /**
     * Validate color format (hex color)
     */
    isValidColor(color) {
        return typeof color === 'string' && 
               /^#[0-9A-Fa-f]{6}$/.test(color);
    }
}

module.exports = { CanvasService };