// Funções utilitárias para respostas padronizadas da API

class ApiResponse {
  static success(res, data, message = 'Operação realizada com sucesso', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static created(res, data, message = 'Recurso criado com sucesso') {
    return this.success(res, data, message, 201);
  }

  static error(res, message = 'Erro interno do servidor', statusCode = 500, errors = null) {
    const response = {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  static badRequest(res, message = 'Dados inválidos', errors = null) {
    return this.error(res, message, 400, errors);
  }

  static unauthorized(res, message = 'Acesso não autorizado') {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = 'Acesso negado') {
    return this.error(res, message, 403);
  }

  static notFound(res, message = 'Recurso não encontrado') {
    return this.error(res, message, 404);
  }

  static conflict(res, message = 'Conflito de dados', conflicts = null) {
    return this.error(res, message, 409, conflicts);
  }

  static validationError(res, errors, message = 'Erro de validação') {
    return this.error(res, message, 422, errors);
  }

  static serverError(res, message = 'Erro interno do servidor') {
    return this.error(res, message, 500);
  }

  static serviceUnavailable(res, message = 'Serviço indisponível') {
    return this.error(res, message, 503);
  }
}

// Wrapper para tratamento de erros async
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Função para paginação
const paginate = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return {
    limit: parseInt(limit),
    offset: parseInt(offset),
    page: parseInt(page)
  };
};

// Função para resposta paginada
const paginatedResponse = (res, data, total, page, limit, message = 'Dados encontrados') => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return res.json({
    success: true,
    message,
    data,
    pagination: {
      current_page: parseInt(page),
      total_pages: totalPages,
      total_items: parseInt(total),
      items_per_page: parseInt(limit),
      has_next: hasNext,
      has_previous: hasPrev
    },
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  ApiResponse,
  asyncHandler,
  paginate,
  paginatedResponse
};