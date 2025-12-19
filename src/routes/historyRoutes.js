const express = require('express');
const router = express.Router();
const {
  getHistory,
  getStatistics,
  compareVehicles
} = require('../controllers/historyController');
const { authenticateToken } = require('../middleware/auth');
const {
  validateHistoryFilters,
  validateStatisticsQuery,
  validateCompareVehicles
} = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: History
 *   description: Unified history and statistics endpoints
 */

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Get unified history timeline
 *     description: Returns a chronological timeline combining maintenances and fuel records with advanced filtering and pagination
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: integer
 *         description: Filter by specific vehicle (optional)
 *         example: 1
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, maintenance, fuel]
 *           default: all
 *         description: Filter by type
 *         example: all
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [preventive, corrective, inspection, other]
 *         description: Filter maintenances by category
 *         example: preventive
 *       - in: query
 *         name: fuel_type
 *         schema:
 *           type: string
 *           enum: [gasoline, ethanol, diesel]
 *         description: Filter fuel records by fuel type
 *         example: gasoline
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *         example: "2024-07-01"
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *         example: "2025-01-15"
 *       - in: query
 *         name: min_cost
 *         schema:
 *           type: number
 *         description: Minimum cost filter
 *         example: 50.00
 *       - in: query
 *         name: max_cost
 *         schema:
 *           type: number
 *         description: Maximum cost filter
 *         example: 500.00
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [date, km, cost]
 *           default: date
 *         description: Sort by field
 *         example: date
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *         example: desc
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 200
 *         description: Results limit (max 200)
 *         example: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Results offset for pagination
 *         example: 0
 *     responses:
 *       200:
 *         description: Unified history timeline
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HistoryResponse'
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticateToken, validateHistoryFilters, getHistory);

/**
 * @swagger
 * /api/history/statistics:
 *   get:
 *     summary: Get advanced statistics for a period
 *     description: Returns comprehensive statistics including costs, fuel consumption, maintenance breakdown, and projections
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: integer
 *         description: Filter by specific vehicle (optional)
 *         example: 1
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *         example: "2024-07-01"
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *         example: "2025-01-15"
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [last_month, last_3_months, last_6_months, last_year, all_time]
 *         description: Predefined period (overrides start_date/end_date)
 *         example: last_6_months
 *     responses:
 *       200:
 *         description: Advanced statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatisticsResponse'
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/statistics', authenticateToken, validateStatisticsQuery, getStatistics);

/**
 * @swagger
 * /api/history/compare-vehicles:
 *   get:
 *     summary: Compare vehicles statistics
 *     description: Compare performance and costs between 2-5 vehicles for a given period
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vehicle_ids
 *         schema:
 *           type: string
 *         required: true
 *         description: Comma-separated list of vehicle IDs (min 2, max 5)
 *         example: "1,2,3"
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *         example: "2024-07-01"
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *         example: "2025-01-15"
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [last_month, last_3_months, last_6_months, last_year, all_time]
 *         description: Predefined period (overrides start_date/end_date)
 *         example: last_6_months
 *     responses:
 *       200:
 *         description: Vehicle comparison data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompareVehiclesResponse'
 *       400:
 *         description: Invalid parameters (need 2-5 vehicles)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (vehicles don't belong to user)
 *       500:
 *         description: Server error
 */
router.get('/compare-vehicles', authenticateToken, validateCompareVehicles, compareVehicles);

module.exports = router;
