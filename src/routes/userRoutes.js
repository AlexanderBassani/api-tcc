const express = require('express');
const { getAllUsers, getUserById, createUser } = require('../controllers/userController');

const router = express.Router();

router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);

module.exports = router;