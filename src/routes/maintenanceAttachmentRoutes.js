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

/**
 * @swagger
 * components:
 *   schemas:
 *     MaintenanceAttachment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID do anexo
 *         maintenance_id:
 *           type: integer
 *           description: ID da manutenção
 *         file_name:
 *           type: string
 *           description: Nome original do arquivo
 *         file_path:
 *           type: string
 *           description: Caminho de armazenamento do arquivo
 *         file_type:
 *           type: string
 *           description: Tipo MIME do arquivo
 *         file_size:
 *           type: integer
 *           description: Tamanho do arquivo em bytes
 *         uploaded_at:
 *           type: string
 *           format: date-time
 *           description: Data e hora do upload
 *     AttachmentUpdate:
 *       type: object
 *       required:
 *         - file_name
 *       properties:
 *         file_name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           example: Nota_Fiscal_Revisao.pdf
 *     UploadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MaintenanceAttachment'
 *         summary:
 *           type: object
 *           properties:
 *             total_uploaded:
 *               type: integer
 *             total_size:
 *               type: integer
 */

/**
 * @swagger
 * /api/maintenance-attachments/maintenance/{maintenanceId}:
 *   get:
 *     summary: Listar anexos de uma manutenção
 *     tags: [Anexos de Manutenção]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: maintenanceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da manutenção
 *     responses:
 *       200:
 *         description: Lista de anexos da manutenção
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MaintenanceAttachment'
 *       404:
 *         description: Manutenção não encontrada
 *       401:
 *         description: Não autenticado
 */
router.get('/maintenance/:maintenanceId',
  authenticateToken,
  validateMaintenanceIdParam,
  getMaintenanceAttachments
);

/**
 * @swagger
 * /api/maintenance-attachments/{id}:
 *   get:
 *     summary: Buscar anexo específico
 *     tags: [Anexos de Manutenção]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do anexo
 *     responses:
 *       200:
 *         description: Anexo encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MaintenanceAttachment'
 *       404:
 *         description: Anexo não encontrado
 *       401:
 *         description: Não autenticado
 */
router.get('/:id',
  authenticateToken,
  validateAttachmentId,
  getAttachmentById
);

/**
 * @swagger
 * /api/maintenance-attachments/maintenance/{maintenanceId}/upload:
 *   post:
 *     summary: Upload de anexos para manutenção
 *     description: Permite upload de até 5 arquivos (imagens ou documentos). Tamanho máximo 10MB por arquivo.
 *     tags: [Anexos de Manutenção]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: maintenanceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da manutenção
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Arquivos para upload (máximo 5)
 *                 maxItems: 5
 *           encoding:
 *             files:
 *               contentType: image/jpeg, image/jpg, image/png, image/gif, application/pdf, text/plain
 *     responses:
 *       201:
 *         description: Arquivos enviados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Erro de validação (nenhum arquivo enviado, tipo inválido, tamanho excedido)
 *       404:
 *         description: Manutenção não encontrada
 *       401:
 *         description: Não autenticado
 */
router.post('/maintenance/:maintenanceId/upload',
  authenticateToken,
  validateMaintenanceIdParam,
  (req, res, next) => {
    // Processamento do upload via callback do multer
    upload.array('files', 5)(req, res, (err) => {
      if (err) {
        // Propagar erro para o errorHandler global
        return next(err);
      }
      // Se não houver erro, chamar o próximo middleware
      next();
    });
  },
  uploadAttachments
);

/**
 * @swagger
 * /api/maintenance-attachments/{id}/download:
 *   get:
 *     summary: Download de anexo
 *     description: Faz download do arquivo anexo
 *     tags: [Anexos de Manutenção]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do anexo
 *     responses:
 *       200:
 *         description: Arquivo para download
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Anexo ou arquivo não encontrado
 *       401:
 *         description: Não autenticado
 */
router.get('/:id/download',
  authenticateToken,
  validateAttachmentId,
  downloadAttachment
);

/**
 * @swagger
 * /api/maintenance-attachments/{id}:
 *   put:
 *     summary: Atualizar nome do anexo
 *     tags: [Anexos de Manutenção]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do anexo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AttachmentUpdate'
 *     responses:
 *       200:
 *         description: Anexo atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/MaintenanceAttachment'
 *       404:
 *         description: Anexo não encontrado
 *       401:
 *         description: Não autenticado
 *       400:
 *         description: Dados inválidos
 */
router.put('/:id',
  authenticateToken,
  validateAttachmentId,
  validateUpdateAttachment,
  updateAttachment
);

/**
 * @swagger
 * /api/maintenance-attachments/{id}:
 *   delete:
 *     summary: Excluir anexo
 *     description: Remove o anexo do banco de dados e exclui o arquivo físico
 *     tags: [Anexos de Manutenção]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do anexo
 *     responses:
 *       200:
 *         description: Anexo excluído com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Anexo não encontrado
 *       401:
 *         description: Não autenticado
 */
router.delete('/:id',
  authenticateToken,
  validateAttachmentId,
  deleteAttachment
);

module.exports = router;
