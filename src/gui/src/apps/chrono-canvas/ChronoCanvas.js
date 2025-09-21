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

/**
 * ChronoCanvas - A real-time collaborative pixel art game
 * This class manages the frontend interface for the Chrono-Canvas game
 */
class ChronoCanvas {
    constructor(options = {}) {
        this.canvas = null;
        this.ctx = null;
        this.socket = null;
        this.isDrawing = false;
        this.currentColor = '#000000';
        this.pixelSize = 4; // Size of each pixel in screen pixels
        this.canvasWidth = 1000;
        this.canvasHeight = 1000;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Pixel data cache
        this.pixelData = new Map();
        
        this.init();
    }

    async init() {
        try {
            this.createInterface();
            this.setupCanvas();
            this.setupToolbar();
            this.connectSocket();
            await this.loadCanvasData();
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize Chrono-Canvas:', error);
        }
    }

    createInterface() {
        // Create the main container
        this.container = $(`
            <div class="chrono-canvas-container" style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #2a2a2a;">
                <div class="chrono-canvas-toolbar" style="height: 50px; background: #3a3a3a; border-bottom: 1px solid #555; display: flex; align-items: center; padding: 0 10px;">
                    <div class="color-picker-container" style="margin-right: 15px;">
                        <label style="color: white; margin-right: 5px;">Color:</label>
                        <input type="color" class="color-picker" value="#000000" style="width: 40px; height: 30px; border: none; cursor: pointer;">
                    </div>
                    <div class="zoom-controls" style="margin-right: 15px;">
                        <button class="zoom-in" style="background: #4a4a4a; color: white; border: 1px solid #666; padding: 5px 10px; margin-right: 5px; cursor: pointer;">Zoom In</button>
                        <button class="zoom-out" style="background: #4a4a4a; color: white; border: 1px solid #666; padding: 5px 10px; margin-right: 5px; cursor: pointer;">Zoom Out</button>
                        <button class="reset-view" style="background: #4a4a4a; color: white; border: 1px solid #666; padding: 5px 10px; cursor: pointer;">Reset View</button>
                    </div>
                    <div class="info-display" style="color: white; font-size: 12px;">
                        <span class="connected-users">Users: 0</span>
                        <span style="margin: 0 10px;">|</span>
                        <span class="cursor-position">Position: (0, 0)</span>
                    </div>
                </div>
                <div class="chrono-canvas-content" style="flex: 1; position: relative; overflow: hidden; background: #1a1a1a;">
                    <canvas class="chrono-canvas-main" style="cursor: crosshair; image-rendering: pixelated; position: absolute; top: 0; left: 0;"></canvas>
                </div>
            </div>
        `);
    }

    setupCanvas() {
        this.canvas = this.container.find('.chrono-canvas-main')[0];
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size to fit container
        this.resizeCanvas();
        
        // Set up canvas properties for pixel art
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        
        // Initial draw
        this.drawCanvas();
    }

    resizeCanvas() {
        const container = this.container.find('.chrono-canvas-content');
        this.canvas.width = container.width();
        this.canvas.height = container.height();
        this.drawCanvas();
    }

    setupToolbar() {
        const colorPicker = this.container.find('.color-picker');
        const zoomInBtn = this.container.find('.zoom-in');
        const zoomOutBtn = this.container.find('.zoom-out');
        const resetViewBtn = this.container.find('.reset-view');

        colorPicker.on('change', (e) => {
            this.currentColor = e.target.value;
        });

        zoomInBtn.on('click', () => this.zoomIn());
        zoomOutBtn.on('click', () => this.zoomOut());
        resetViewBtn.on('click', () => this.resetView());
    }

    setupEventListeners() {
        const $canvas = $(this.canvas);

        // Mouse events for drawing and panning
        $canvas.on('mousedown', (e) => this.handleMouseDown(e));
        $canvas.on('mousemove', (e) => this.handleMouseMove(e));
        $canvas.on('mouseup', () => this.handleMouseUp());
        $canvas.on('mouseleave', () => this.handleMouseUp());

        // Wheel event for zooming
        $canvas.on('wheel', (e) => this.handleWheel(e));

        // Window resize
        $(window).on('resize', () => this.resizeCanvas());

        // Prevent context menu on right click
        $canvas.on('contextmenu', (e) => e.preventDefault());
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.lastMouseX = x;
        this.lastMouseY = y;

        if (e.button === 0) { // Left click - draw
            this.isDrawing = true;
            this.drawPixel(x, y);
        } else if (e.button === 2) { // Right click - pan
            this.isDragging = true;
            this.canvas.style.cursor = 'grabbing';
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Update cursor position display
        const canvasX = Math.floor((x - this.offsetX) / (this.pixelSize * this.scale));
        const canvasY = Math.floor((y - this.offsetY) / (this.pixelSize * this.scale));
        this.container.find('.cursor-position').text(`Position: (${canvasX}, ${canvasY})`);

        if (this.isDrawing) {
            this.drawPixel(x, y);
        } else if (this.isDragging) {
            const deltaX = x - this.lastMouseX;
            const deltaY = y - this.lastMouseY;
            this.offsetX += deltaX;
            this.offsetY += deltaY;
            this.drawCanvas();
        }

        this.lastMouseX = x;
        this.lastMouseY = y;
    }

    handleMouseUp() {
        this.isDrawing = false;
        this.isDragging = false;
        this.canvas.style.cursor = 'crosshair';
    }

    handleWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const wheel = e.originalEvent.deltaY < 0 ? 1 : -1;
        const zoom = Math.exp(wheel * 0.1);
        const newScale = Math.max(0.1, Math.min(10, this.scale * zoom));

        if (newScale !== this.scale) {
            // Zoom towards mouse position
            this.offsetX = mouseX - (mouseX - this.offsetX) * (newScale / this.scale);
            this.offsetY = mouseY - (mouseY - this.offsetY) * (newScale / this.scale);
            this.scale = newScale;
            this.drawCanvas();
        }
    }

    drawPixel(screenX, screenY) {
        // Convert screen coordinates to canvas coordinates
        const canvasX = Math.floor((screenX - this.offsetX) / (this.pixelSize * this.scale));
        const canvasY = Math.floor((screenY - this.offsetY) / (this.pixelSize * this.scale));

        // Validate coordinates
        if (canvasX < 0 || canvasX >= this.canvasWidth || canvasY < 0 || canvasY >= this.canvasHeight) {
            return;
        }

        // Send pixel placement to server
        this.placePixel(canvasX, canvasY, this.currentColor);
    }

    async placePixel(x, y, color) {
        try {
            if (this.socket && this.socket.connected) {
                // Use socket for real-time placement
                this.socket.emit('place-pixel', { x, y, color });
            } else {
                // Fallback to HTTP API
                const response = await fetch('/api/chrono-canvas/pixel', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${window.auth_token || ''}`,
                    },
                    body: JSON.stringify({ x, y, color }),
                });

                const result = await response.json();
                if (result.success) {
                    this.updatePixel(x, y, color);
                }
            }
        } catch (error) {
            console.error('Failed to place pixel:', error);
        }
    }

    updatePixel(x, y, color) {
        const key = `${x},${y}`;
        this.pixelData.set(key, { color, x, y });
        this.drawCanvas();
    }

    drawCanvas() {
        // Clear canvas
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw pixels
        for (const [key, pixel] of this.pixelData.entries()) {
            const screenX = pixel.x * this.pixelSize * this.scale + this.offsetX;
            const screenY = pixel.y * this.pixelSize * this.scale + this.offsetY;
            const size = this.pixelSize * this.scale;

            if (screenX + size >= 0 && screenX < this.canvas.width &&
                screenY + size >= 0 && screenY < this.canvas.height) {
                this.ctx.fillStyle = pixel.color;
                this.ctx.fillRect(screenX, screenY, size, size);
            }
        }

        // Draw grid when zoomed in
        if (this.scale > 2) {
            this.drawGrid();
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = '#E0E0E0';
        this.ctx.lineWidth = 0.5;
        
        const pixelSizeScaled = this.pixelSize * this.scale;
        const startX = -this.offsetX % pixelSizeScaled;
        const startY = -this.offsetY % pixelSizeScaled;

        // Vertical lines
        for (let x = startX; x < this.canvas.width; x += pixelSizeScaled) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = startY; y < this.canvas.height; y += pixelSizeScaled) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    zoomIn() {
        this.scale = Math.min(10, this.scale * 1.5);
        this.drawCanvas();
    }

    zoomOut() {
        this.scale = Math.max(0.1, this.scale / 1.5);
        this.drawCanvas();
    }

    resetView() {
        this.scale = 1;
        this.offsetX = (this.canvas.width - this.canvasWidth * this.pixelSize) / 2;
        this.offsetY = (this.canvas.height - this.canvasHeight * this.pixelSize) / 2;
        this.drawCanvas();
    }

    async loadCanvasData() {
        try {
            const response = await fetch('/api/chrono-canvas/canvas');
            const result = await response.json();
            
            if (result.success) {
                this.pixelData.clear();
                for (const [key, pixelInfo] of Object.entries(result.canvas)) {
                    const [x, y] = key.split(',').map(Number);
                    this.pixelData.set(key, {
                        x, y,
                        color: pixelInfo.color
                    });
                }
                this.drawCanvas();
            }
        } catch (error) {
            console.error('Failed to load canvas data:', error);
        }
    }

    connectSocket() {
        if (typeof io !== 'undefined') {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('Connected to Chrono-Canvas server');
            });

            this.socket.on('canvas-state', (data) => {
                this.pixelData.clear();
                for (const [key, pixelInfo] of Object.entries(data.canvas)) {
                    const [x, y] = key.split(',').map(Number);
                    this.pixelData.set(key, {
                        x, y,
                        color: pixelInfo.color
                    });
                }
                this.drawCanvas();
            });

            this.socket.on('pixel-update', (data) => {
                this.updatePixel(data.x, data.y, data.color);
            });

            this.socket.on('pixel-placed', (data) => {
                if (data.success) {
                    this.updatePixel(data.x, data.y, data.color);
                } else {
                    console.error('Failed to place pixel:', data.error);
                }
            });
        }
    }

    // Public method to get the container element
    getElement() {
        return this.container[0];
    }

    // Cleanup method
    destroy() {
        if (this.socket) {
            this.socket.disconnect();
        }
        $(window).off('resize');
        if (this.container) {
            this.container.remove();
        }
    }
}

// Make ChronoCanvas available globally
window.ChronoCanvas = ChronoCanvas;