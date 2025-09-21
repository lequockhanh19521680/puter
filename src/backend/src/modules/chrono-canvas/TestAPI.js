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
 * Simple test API endpoint for Chrono-Canvas
 * This is a basic endpoint that doesn't require complex service setup
 */

const express = require('express');

const router = express.Router();

// Simple test endpoint
router.get('/chrono-canvas/test', (req, res) => {
    res.json({
        success: true,
        message: 'Chrono-Canvas API is working!',
        timestamp: new Date().toISOString()
    });
});

// Canvas info endpoint (simplified)
router.get('/chrono-canvas/info', (req, res) => {
    res.json({
        success: true,
        width: 1000,
        height: 1000,
        totalPixels: 0,
        activeUsers: 0,
        message: 'Chrono-Canvas backend is running'
    });
});

// Simple canvas data endpoint
router.get('/chrono-canvas/canvas', (req, res) => {
    res.json({
        success: true,
        canvas: {},
        width: 1000,
        height: 1000,
        message: 'Canvas data (empty for now)'
    });
});

module.exports = router;