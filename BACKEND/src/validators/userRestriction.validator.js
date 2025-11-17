const Joi = require('joi');

/**
 * Schema de validação para adicionar restrição ao usuário
 */
const addRestrictionSchema = Joi.object({
  restriction_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'O ID da restrição deve ser um número',
      'number.integer': 'O ID da restrição deve ser um número inteiro',
      'number.positive': 'O ID da restrição deve ser um número positivo',
      'any.required': 'O ID da restrição é obrigatório'
    })
});

/**
 * Schema de validação para atualizar palavras-chave de restrição
 */
const updateRestrictionKeywordsSchema = Joi.object({
  keywords: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().min(1)).min(1),
      Joi.string().min(1)
    )
    .required()
    .messages({
      'any.required': 'As palavras-chave são obrigatórias',
      'array.min': 'Deve haver pelo menos uma palavra-chave',
      'string.min': 'As palavras-chave não podem estar vazias'
    })
});

/**
 * Middleware de validação genérico
 */
const validate = schema => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors
      });
    }

    // Substituir req.body pelos valores validados e sanitizados
    req.body = value;
    next();
  };
};

module.exports = {
  addRestrictionSchema,
  updateRestrictionKeywordsSchema,
  validate
};

