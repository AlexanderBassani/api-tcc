const pool = require('../config/database');
const logger = require('../config/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/maintenance-attachments');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      // Verificar permissões de escrita
      await fs.access(uploadDir, fs.constants.W_OK);
      cb(null, uploadDir);
    } catch (error) {
      logger.error('Error accessing upload directory', { 
        uploadDir, 
        error: error.message 
      });
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Gerar nome único: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${uniqueSuffix}-${name}${ext}`);
  }
});

// Filtro de tipos de arquivo permitidos
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Use apenas: JPEG, PNG, GIF, PDF, TXT'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // Máximo 5 arquivos por upload
  },
  fileFilter: fileFilter
});

// Listar anexos de uma manutenção
const getMaintenanceAttachments = async (req, res) => {
  try {
    const { maintenanceId } = req.params;
    const userId = req.user.id;
    
    // Verificar se a manutenção pertence ao usuário
    const maintenanceCheck = await pool.query(
      `SELECT m.id 
       FROM maintenances m
       INNER JOIN vehicles v ON m.vehicle_id = v.id
       WHERE m.id = $1 AND v.user_id = $2`,
      [maintenanceId, userId]
    );
    
    if (maintenanceCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Manutenção não encontrada',
        message: 'Manutenção não existe ou não pertence ao usuário'
      });
    }
    
    const result = await pool.query(
      `SELECT id, maintenance_id, file_name, file_path, file_type, file_size, uploaded_at
       FROM maintenance_attachments
       WHERE maintenance_id = $1
       ORDER BY uploaded_at DESC`,
      [maintenanceId]
    );
    
    logger.info('Maintenance attachments retrieved', { 
      maintenanceId,
      userId,
      attachmentCount: result.rows.length
    });
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error retrieving maintenance attachments', {
      maintenanceId: req.params.maintenanceId,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar os anexos da manutenção'
    });
  }
};

// Buscar anexo específico
const getAttachmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT a.id, a.maintenance_id, a.file_name, a.file_path, a.file_type, a.file_size, a.uploaded_at
       FROM maintenance_attachments a
       INNER JOIN maintenances m ON a.maintenance_id = m.id
       INNER JOIN vehicles v ON m.vehicle_id = v.id
       WHERE a.id = $1 AND v.user_id = $2`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Anexo não encontrado',
        message: 'Anexo não existe ou não pertence ao usuário'
      });
    }
    
    logger.info('Attachment retrieved by ID', { 
      attachmentId: id,
      userId 
    });
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error retrieving attachment by ID', {
      attachmentId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar o anexo'
    });
  }
};

// Fazer upload de anexos
const uploadAttachments = async (req, res) => {
  try {
    const { maintenanceId } = req.params;
    const userId = req.user.id;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'Nenhum arquivo fornecido',
        message: 'É necessário enviar pelo menos um arquivo'
      });
    }
    
    // Verificar se a manutenção pertence ao usuário
    const maintenanceCheck = await pool.query(
      `SELECT m.id 
       FROM maintenances m
       INNER JOIN vehicles v ON m.vehicle_id = v.id
       WHERE m.id = $1 AND v.user_id = $2`,
      [maintenanceId, userId]
    );
    
    if (maintenanceCheck.rows.length === 0) {
      // Remover arquivos já enviados se manutenção não existe
      await Promise.all(files.map(file => fs.unlink(file.path).catch(() => {})));
      return res.status(404).json({
        error: 'Manutenção não encontrada',
        message: 'Manutenção não existe ou não pertence ao usuário'
      });
    }
    
    // Inserir registros dos arquivos no banco
    const attachments = [];
    
    for (const file of files) {
      const result = await pool.query(
        `INSERT INTO maintenance_attachments (
          maintenance_id, file_name, file_path, file_type, file_size, uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *`,
        [
          maintenanceId,
          file.originalname,
          file.path,
          file.mimetype,
          file.size
        ]
      );
      
      attachments.push(result.rows[0]);
    }
    
    logger.info('Attachments uploaded', { 
      maintenanceId,
      userId,
      fileCount: files.length,
      attachmentIds: attachments.map(a => a.id)
    });
    
    res.status(201).json({
      success: true,
      message: `${files.length} arquivo(s) enviado(s) com sucesso`,
      data: attachments
    });
  } catch (error) {
    logger.error('Error uploading attachments', {
      maintenanceId: req.params.maintenanceId,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    // Tentar remover arquivos em caso de erro
    if (req.files) {
      await Promise.all(req.files.map(file => fs.unlink(file.path).catch(() => {})));
    }
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível fazer upload dos arquivos'
    });
  }
};

// Baixar anexo
const downloadAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT a.id, a.maintenance_id, a.file_name, a.file_path, a.file_type, a.file_size
       FROM maintenance_attachments a
       INNER JOIN maintenances m ON a.maintenance_id = m.id
       INNER JOIN vehicles v ON m.vehicle_id = v.id
       WHERE a.id = $1 AND v.user_id = $2`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Anexo não encontrado',
        message: 'Anexo não existe ou não pertence ao usuário'
      });
    }
    
    const attachment = result.rows[0];
    
    try {
      await fs.access(attachment.file_path);
    } catch {
      return res.status(404).json({
        error: 'Arquivo não encontrado',
        message: 'O arquivo não existe no sistema de arquivos'
      });
    }
    
    // Definir headers para download
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
    res.setHeader('Content-Type', attachment.file_type);
    res.setHeader('Content-Length', attachment.file_size);
    
    logger.info('Attachment downloaded', { 
      attachmentId: id,
      userId,
      fileName: attachment.file_name
    });
    
    // Enviar arquivo
    res.sendFile(path.resolve(attachment.file_path));
  } catch (error) {
    logger.error('Error downloading attachment', {
      attachmentId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível baixar o arquivo'
    });
  }
};

// Excluir anexo
const deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Buscar anexo e verificar permissão
    const result = await pool.query(
      `SELECT a.id, a.file_path, a.file_name
       FROM maintenance_attachments a
       INNER JOIN maintenances m ON a.maintenance_id = m.id
       INNER JOIN vehicles v ON m.vehicle_id = v.id
       WHERE a.id = $1 AND v.user_id = $2`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Anexo não encontrado',
        message: 'Anexo não existe ou não pertence ao usuário'
      });
    }
    
    const attachment = result.rows[0];
    
    // Excluir do banco de dados
    await pool.query('DELETE FROM maintenance_attachments WHERE id = $1', [id]);
    
    // Tentar remover arquivo do sistema de arquivos
    try {
      await fs.unlink(attachment.file_path);
    } catch (fileError) {
      logger.warn('File not found when trying to delete', {
        attachmentId: id,
        filePath: attachment.file_path,
        error: fileError.message
      });
    }
    
    logger.info('Attachment deleted', { 
      attachmentId: id,
      userId,
      fileName: attachment.file_name
    });
    
    res.json({
      success: true,
      message: 'Anexo excluído com sucesso'
    });
  } catch (error) {
    logger.error('Error deleting attachment', {
      attachmentId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível excluir o anexo'
    });
  }
};

// Atualizar informações do anexo (apenas file_name)
const updateAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const { file_name } = req.body;
    const userId = req.user.id;
    
    if (!file_name || !file_name.trim()) {
      return res.status(400).json({
        error: 'Nome do arquivo é obrigatório',
        message: 'É necessário fornecer um nome válido para o arquivo'
      });
    }
    
    // Verificar se anexo pertence ao usuário
    const attachmentCheck = await pool.query(
      `SELECT a.id 
       FROM maintenance_attachments a
       INNER JOIN maintenances m ON a.maintenance_id = m.id
       INNER JOIN vehicles v ON m.vehicle_id = v.id
       WHERE a.id = $1 AND v.user_id = $2`,
      [id, userId]
    );
    
    if (attachmentCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Anexo não encontrado',
        message: 'Anexo não existe ou não pertence ao usuário'
      });
    }
    
    const result = await pool.query(
      `UPDATE maintenance_attachments SET file_name = $1
       WHERE id = $2
       RETURNING *`,
      [file_name.trim(), id]
    );
    
    logger.info('Attachment updated', { 
      attachmentId: id,
      userId,
      newFileName: file_name
    });
    
    res.json({
      success: true,
      message: 'Nome do anexo atualizado com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating attachment', {
      attachmentId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível atualizar o anexo'
    });
  }
};

module.exports = {
  upload,
  getMaintenanceAttachments,
  getAttachmentById,
  uploadAttachments,
  downloadAttachment,
  deleteAttachment,
  updateAttachment
};