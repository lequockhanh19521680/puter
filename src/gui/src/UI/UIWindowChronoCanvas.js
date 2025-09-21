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
 * UIWindowChronoCanvas creates a window for the Chrono-Canvas collaborative pixel art game
 */
function UIWindowChronoCanvas(options) {
    options = options || {};

    const window_width = Math.min(1200, $(window).width() * 0.9);
    const window_height = Math.min(800, $(window).height() * 0.9);

    const h = `
        <div class="chrono-canvas-window-body" style="width: 100%; height: 100%; overflow: hidden;">
            <div class="chrono-canvas-loading" style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">
                <div>
                    <div style="font-size: 18px; margin-bottom: 10px;">Loading Chrono-Canvas...</div>
                    <div style="font-size: 14px;">Connecting to collaborative pixel art canvas</div>
                </div>
            </div>
        </div>
    `;

    const el_window = await UIWindow({
        title: 'Chrono-Canvas - Collaborative Pixel Art',
        app: 'chrono-canvas',
        single_instance: true,
        icon: '/icons/apps/chrono-canvas.svg',
        uid: null,
        is_dir: false,
        body_content: h,
        has_head: true,
        selectable_body: false,
        draggable_body: false,
        allow_context_menu: false,
        is_resizable: true,
        is_droppable: false,
        init_center: true,
        allow_native_ctxmenu: false,
        allow_user_select: false,
        width: window_width,
        height: window_height,
        minimum_width: 600,
        minimum_height: 400,
        ...options,
        onAppend: function(this_window) {
            // Initialize the Chrono-Canvas game when window is ready
            initializeChronoCanvas(this_window);
        }
    });

    async function initializeChronoCanvas(window_element) {
        try {
            // Load the ChronoCanvas script if not already loaded
            if (typeof ChronoCanvas === 'undefined') {
                await loadChronoCanvasScript();
            }

            // Create the game instance
            const chronoCanvas = new ChronoCanvas();
            
            // Replace loading content with the game
            const windowBody = $(window_element).find('.chrono-canvas-window-body');
            windowBody.empty().append(chronoCanvas.getElement());

            // Store reference for cleanup
            $(window_element).data('chronoCanvas', chronoCanvas);

            // Handle window resize
            $(window_element).on('window-resize', function() {
                if (chronoCanvas.resizeCanvas) {
                    chronoCanvas.resizeCanvas();
                }
            });

            // Handle window close
            $(window_element).on('window-close', function() {
                if (chronoCanvas.destroy) {
                    chronoCanvas.destroy();
                }
            });

        } catch (error) {
            console.error('Failed to initialize Chrono-Canvas:', error);
            const windowBody = $(window_element).find('.chrono-canvas-window-body');
            windowBody.html(`
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #d32f2f;">
                    <div style="text-align: center;">
                        <div style="font-size: 18px; margin-bottom: 10px;">Failed to load Chrono-Canvas</div>
                        <div style="font-size: 14px;">${error.message}</div>
                        <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
                    </div>
                </div>
            `);
        }
    }

    function loadChronoCanvasScript() {
        return new Promise((resolve, reject) => {
            if (typeof ChronoCanvas !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = '/src/apps/chrono-canvas/ChronoCanvas.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load ChronoCanvas script'));
            document.head.appendChild(script);
        });
    }

    return el_window;
}