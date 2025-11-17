const Joi = require('joi');

/**
 * Schema de validação para adicionar restrição ao usuário
 */
const addUserRestrictionSchema = Joi.object({
  restriction_id: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'O ID da restrição deve ser um número',
      'number.integer': 'O ID da restrição deve ser um número inteiro',
      'number.positive': 'O ID da restrição deve ser um número positivo'
    }),
  nome: Joi.string()
    .min(2)
    .max(255)
    .when('restriction_id', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required()
    })
    .messages({
      'string.empty': 'O nome da restrição é obrigatório',
      'string.min': 'O nome deve ter pelo menos 2 caracteres',
      'string.max': 'O nome deve ter no máximo 255 caracteres',
      'any.required': 'O nome é obrigatório quando não fornecendo restriction_id'
    }),
  palavras_chave: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().min(1)),
      Joi.string().min(1)
    )
    .allow(null, '')
    .optional()
    .messages({
      'array.base': 'Palavras-chave devem ser um array ou string',
      'string.min': 'Palavras-chave não podem estar vazias'
    })
})
  .or('restriction_id', 'nome')
  .messages({
    'object.missing': 'Deve fornecer restriction_id ou nome'
  });

/**
 * Schema de validação para atualizar restrição do usuário
 */
const updateUserRestrictionSchema = Joi.object({
  palavras_chave_personalizadas: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().min(1)),
      Joi.string().min(1)
    )
    .allow(null, '')
    .optional()
    .messages({
      'array.base': 'Palavras-chave personalizadas devem ser um array ou string',
      'string.min': 'Palavras-chave não podem estar vazias'
    }),
  notes: Joi.string()
    .max(1000)
    .allow(null, '')
    .optional()
    .messages({
      'string.max': 'As notas devem ter no máximo 1000 caracteres'
    })
})
  .min(1)
  .messages({
    'object.min': 'Pelo menos um campo deve ser fornecido para atualização'
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
  addUserRestrictionSchema,
  updateUserRestrictionSchema,
  validate
};

