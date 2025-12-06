const { AppDataSource } = require('../config/typeorm');
const logger = require('../config/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const maintenanceAttachmentRepository = AppDataSource.getRepository('MaintenanceAttachment');
const maintenanceRepository = AppDataSource.getRepository('Maintenance');

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
    const maintenance = await maintenanceRepository
      .createQueryBuilder('m')
      .innerJoin('m.vehicle', 'v')
      .where('m.id = :maintenanceId', { maintenanceId })
      .andWhere('v.user_id = :userId', { userId })
      .select(['m.id'])
      .getOne();

    if (!maintenance) {
      return res.status(404).json({
        error: 'Manutenção não encontrada',
        message: 'Manutenção não existe ou não pertence ao usuário'
      });
    }

    const attachments = await maintenanceAttachmentRepository.find({
      where: { maintenance_id: maintenanceId },
      select: ['id', 'maintenance_id', 'file_name', 'file_path', 'file_type', 'file_size', 'uploaded_at'],
      order: { uploaded_at: 'DESC' }
    });

    logger.info('Maintenance attachments retrieved', {
      maintenanceId,
      userId,
      attachmentCount: attachments.length
    });

    res.json({
      success: true,
      data: attachments,
      count: attachments.length
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

    const attachment = await maintenanceAttachmentRepository
      .createQueryBuilder('a')
      .innerJoin('a.maintenance', 'm')
      .innerJoin('m.vehicle', 'v')
      .where('a.id = :id', { id })
      .andWhere('v.user_id = :userId', { userId })
      .select(['a.id', 'a.maintenance_id', 'a.file_name', 'a.file_path', 'a.file_type', 'a.file_size', 'a.uploaded_at'])
      .getOne();

    if (!attachment) {
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
      data: attachment
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
    const maintenance = await maintenanceRepository
      .createQueryBuilder('m')
      .innerJoin('m.vehicle', 'v')
      .where('m.id = :maintenanceId', { maintenanceId })
      .andWhere('v.user_id = :userId', { userId })
      .select(['m.id'])
      .getOne();

    if (!maintenance) {
      // Remover arquivos já enviados se manutenção não existe
      await Promise.all(files.map(file => fs.unlink(file.path).catch(() => { })));
      return res.status(404).json({
        error: 'Manutenção não encontrada',
        message: 'Manutenção não existe ou não pertence ao usuário'
      });
    }

    // Inserir registros dos arquivos no banco
    const attachments = [];

    for (const file of files) {
      const attachment = maintenanceAttachmentRepository.create({
        maintenance_id: maintenanceId,
        file_name: file.originalname,
        file_path: file.path,
        file_type: file.mimetype,
        file_size: file.size
      });

      const saved = await maintenanceAttachmentRepository.save(attachment);
      attachments.push(saved);
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
      await Promise.all(req.files.map(file => fs.unlink(file.path).catch(() => { })));
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

    const attachment = await maintenanceAttachmentRepository
      .createQueryBuilder('a')
      .innerJoin('a.maintenance', 'm')
      .innerJoin('m.vehicle', 'v')
      .where('a.id = :id', { id })
      .andWhere('v.user_id = :userId', { userId })
      .select(['a.id', 'a.maintenance_id', 'a.file_name', 'a.file_path', 'a.file_type', 'a.file_size'])
      .getOne();

    if (!attachment) {
      return res.status(404).json({
        error: 'Anexo não encontrado',
        message: 'Anexo não existe ou não pertence ao usuário'
      });
    }

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
    const attachment = await maintenanceAttachmentRepository
      .createQueryBuilder('a')
      .innerJoin('a.maintenance', 'm')
      .innerJoin('m.vehicle', 'v')
      .where('a.id = :id', { id })
      .andWhere('v.user_id = :userId', { userId })
      .select(['a.id', 'a.file_path', 'a.file_name'])
      .getOne();

    if (!attachment) {
      return res.status(404).json({
        error: 'Anexo não encontrado',
        message: 'Anexo não existe ou não pertence ao usuário'
      });
    }

    // Excluir do banco de dados
    await maintenanceAttachmentRepository.delete(id);

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
    const attachment = await maintenanceAttachmentRepository
      .createQueryBuilder('a')
      .innerJoin('a.maintenance', 'm')
      .innerJoin('m.vehicle', 'v')
      .where('a.id = :id', { id })
      .andWhere('v.user_id = :userId', { userId })
      .select(['a.id'])
      .getOne();

    if (!attachment) {
      return res.status(404).json({
        error: 'Anexo não encontrado',
        message: 'Anexo não existe ou não pertence ao usuário'
      });
    }

    await maintenanceAttachmentRepository.update(id, {
      file_name: file_name.trim()
    });

    const updatedAttachment = await maintenanceAttachmentRepository.findOne({
      where: { id }
    });

    logger.info('Attachment updated', {
      attachmentId: id,
      userId,
      newFileName: file_name
    });

    res.json({
      success: true,
      message: 'Nome do anexo atualizado com sucesso',
      data: updatedAttachment
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