const express = require('express');
const {
    getAllUsers,
    getUserById,
    createUser,
    register,
    login,
    refreshToken,
    getProfile,
    updateProfile,
    changePassword
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rotas públicas - não requerem autenticação
router.post('/users/register', register);
router.post('/users/login', login);
router.post('/users/refresh-token', refreshToken);

// Rotas protegidas - requerem autenticação
router.get('/users', authenticateToken, getAllUsers);
router.get('/users/profile', authenticateToken, getProfile);
router.get('/users/:id', authenticateToken, getUserById);
router.post('/users', authenticateToken, createUser);
router.put('/users/profile', authenticateToken, updateProfile);

// Trocar senha - sem ID = troca própria senha, com ID = troca senha de outro usuário
router.put('/users/change-password', authenticateToken, changePassword);
router.put('/users/:id/change-password', authenticateToken, changePassword);

module.exports = router;