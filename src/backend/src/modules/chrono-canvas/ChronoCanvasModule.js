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

const { AdvancedBase } = require("@heyputer/putility");

/**
 * ChronoCanvasModule provides the backend infrastructure for the Chrono-Canvas
 * real-time collaborative pixel art game. This module registers all necessary
 * services for canvas management, real-time collaboration, and pixel operations.
 */
class ChronoCanvasModule extends AdvancedBase {
    async install (context) {
        console.log('ChronoCanvasModule: Installing module...');
        const services = context.get('services');

        // Register the main canvas service
        const { CanvasService } = require('./CanvasService.js');
        services.registerService('chrono-canvas', CanvasService);
        console.log('ChronoCanvasModule: CanvasService registered');

        // Register test API routes directly
        this.registerTestAPI(context);
    }

    registerTestAPI(context) {
        try {
            console.log('ChronoCanvasModule: Registering test API...');
            const services = context.get('services');
            
            // Try to get the web service and register routes directly
            process.nextTick(() => {
                try {
                    const webService = services.get('web-server');
                    if (webService && webService.app) {
                        const testRouter = require('./TestAPI.js');
                        webService.app.use('/api', testRouter);
                        console.log('ChronoCanvasModule: Test API routes registered successfully');
                    } else {
                        console.log('ChronoCanvasModule: Web service not ready, will retry...');
                        
                        // Retry after a delay
                        setTimeout(() => {
                            const webService2 = services.get('web-server');
                            if (webService2 && webService2.app) {
                                const testRouter = require('./TestAPI.js');
                                webService2.app.use('/api', testRouter);
                                console.log('ChronoCanvasModule: Test API routes registered on retry');
                            } else {
                                console.log('ChronoCanvasModule: Web service still not available');
                            }
                        }, 5000);
                    }
                } catch (error) {
                    console.error('ChronoCanvasModule: Error registering test API:', error);
                }
            });
        } catch (error) {
            console.error('ChronoCanvasModule: Error in registerTestAPI:', error);
        }
    }
}

module.exports = ChronoCanvasModule;