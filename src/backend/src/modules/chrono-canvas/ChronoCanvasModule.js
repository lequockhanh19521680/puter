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
        const services = context.get('services');

        // Register the main canvas service
        const { CanvasService } = require('./CanvasService.js');
        services.registerService('chrono-canvas', CanvasService);
    }
}

module.exports = ChronoCanvasModule;