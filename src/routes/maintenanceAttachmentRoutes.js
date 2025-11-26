const express = require('express');
const {
  upload,
  getMaintenanceAttachments,
  getAttachmentById,
  uploadAttachments,
  downloadAttachment,
  deleteAttachment,
  updateAttachment
} = require('../controllers/maintenanceAttachmentController');
const { authenticateToken } = require('../middleware/auth');
const {
  validateMaintenanceIdParam,
  validateAttachmentId,
  validateUpdateAttachment
} = require('../middleware/validation');

const router = express.Router();

// Rotas para anexos de manutenção (todas requerem autenticação)

// GET /api/maintenance-attachments/maintenance/:maintenanceId - Listar anexos de uma manutenção
router.get('/maintenance/:maintenanceId', 
  authenticateToken, 
  validateMaintenanceIdParam, 
  getMaintenanceAttachments
);

// GET /api/maintenance-attachments/:id - Buscar anexo específico
router.get('/:id', 
  authenticateToken, 
  validateAttachmentId, 
  getAttachmentById
);

// POST /api/maintenance-attachments/maintenance/:maintenanceId/upload - Upload de anexos
router.post('/maintenance/:maintenanceId/upload', 
  authenticateToken, 
  validateMaintenanceIdParam, 
  upload.array('files', 5), // Máximo 5 arquivos
  uploadAttachments
);

// GET /api/maintenance-attachments/:id/download - Download de anexo
router.get('/:id/download', 
  authenticateToken, 
  validateAttachmentId, 
  downloadAttachment
);

// PUT /api/maintenance-attachments/:id - Atualizar nome do anexo
router.put('/:id', 
  authenticateToken, 
  validateAttachmentId, 
  validateUpdateAttachment, 
  updateAttachment
);

// DELETE /api/maintenance-attachments/:id - Excluir anexo
router.delete('/:id', 
  authenticateToken, 
  validateAttachmentId, 
  deleteAttachment
);

module.exports = router;