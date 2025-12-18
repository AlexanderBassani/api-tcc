const express = require('express');
const router = express.Router();
const {
  getKPIs,
  getMonthlyExpenses,
  getUpcomingMaintenances,
  getRecentActivities,
  getDashboardOverview
} = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');
const {
  validateDashboardQuery,
  validateVehicleIdQuery
} = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard statistics and overview endpoints
 */

/**
 * @swagger
 * /api/dashboard/kpis:
 *   get:
 *     summary: Get dashboard KPIs (Key Performance Indicators)
 *     description: Returns main dashboard KPIs including total vehicles, pending maintenances, fuel records, and average cost per km
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: integer
 *         description: Filter by specific vehicle (optional)
 *         example: 1
 *     responses:
 *       200:
 *         description: Dashboard KPIs data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardKPIs'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/kpis', authenticateToken, validateVehicleIdQuery, getKPIs);

/**
 * @swagger
 * /api/dashboard/overview:
 *   get:
 *     summary: Get complete dashboard overview
 *     description: Returns a complete dashboard overview including monthly expenses, recent activities, upcoming maintenances, and total vehicles
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: integer
 *         description: Filter by specific vehicle (optional)
 *         example: 1
 *     responses:
 *       200:
 *         description: Dashboard overview data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardOverview'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/overview', authenticateToken, validateVehicleIdQuery, getDashboardOverview);

/**
 * @swagger
 * /api/dashboard/monthly-expenses:
 *   get:
 *     summary: Get monthly expenses breakdown
 *     description: Returns monthly expenses aggregated by type (fuel, maintenance, others) with totals and percentages
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 6
 *           minimum: 1
 *           maximum: 12
 *         description: Number of months to retrieve
 *         example: 6
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: integer
 *         description: Filter by specific vehicle (optional)
 *         example: 1
 *     responses:
 *       200:
 *         description: Monthly expenses data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MonthlyExpensesResponse'
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/monthly-expenses', authenticateToken, validateDashboardQuery, getMonthlyExpenses);

/**
 * @swagger
 * /api/dashboard/upcoming-maintenances:
 *   get:
 *     summary: Get upcoming maintenances
 *     description: Returns upcoming maintenances/reminders ordered by proximity (date or kilometers)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *           minimum: 1
 *           maximum: 20
 *         description: Maximum number of items to return
 *         example: 5
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: integer
 *         description: Filter by specific vehicle (optional)
 *         example: 1
 *     responses:
 *       200:
 *         description: Upcoming maintenances list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UpcomingMaintenance'
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/upcoming-maintenances', authenticateToken, validateDashboardQuery, getUpcomingMaintenances);

/**
 * @swagger
 * /api/dashboard/recent-activities:
 *   get:
 *     summary: Get recent activities (fuel records and maintenances)
 *     description: Returns a combined timeline of recent fuel records and maintenance activities
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *         description: Maximum number of items to return
 *         example: 10
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: integer
 *         description: Filter by specific vehicle (optional)
 *         example: 1
 *     responses:
 *       200:
 *         description: Recent activities list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RecentActivity'
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/recent-activities', authenticateToken, validateDashboardQuery, getRecentActivities);

module.exports = router;
