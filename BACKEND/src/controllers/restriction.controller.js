const { Restriction, UserRestriction } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const getAllRestrictions = async (req, res) => {
  try {
    const { q } = req.query;
    const where = q
      ? {
          [Op.or]: [
            { nome: { [Op.iLike]: `%${q}%` } }, // Postgres-style (Sequelize)
            // fallback to keywords search using LIKE on palavras_chave
            { palavras_chave: { [Op.like]: `%${q}%` } }
          ]
        }
      : {};

    const list = await Restriction.findAll({ where, order: [['nome', 'ASC']] });
    return res.json({ success: true, data: list });
  } catch (err) {
    logger.error('Erro ao obter todas as restrições', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
};

const getUserRestrictions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Buscar usando raw: true para evitar problemas com getters
    const userRestrictions = await UserRestriction.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Restriction,
          as: 'restriction',
          attributes: ['id', 'nome', 'categoria', 'palavras_chave'],
          required: false
        }
      ],
      raw: false // Manter false para ter acesso aos métodos do modelo
    });

    // Converter para JSON de forma segura
    const restrictionsData = userRestrictions.map(ur => {
      try {
        // Usar getDataValue para evitar problemas com getters
        const palavrasChaveRaw = ur.getDataValue('palavras_chave_personalizadas');
        
        // Processar palavras_chave_personalizadas de forma segura
        let palavrasChavePersonalizadas = [];
        if (palavrasChaveRaw) {
          if (typeof palavrasChaveRaw === 'string') {
            try {
              palavrasChavePersonalizadas = JSON.parse(palavrasChaveRaw);
            } catch {
              // Se não for JSON válido, tratar como string separada por vírgula
              palavrasChavePersonalizadas = palavrasChaveRaw.split(',').map(p => p.trim()).filter(p => p);
            }
          } else if (Array.isArray(palavrasChaveRaw)) {
            palavrasChavePersonalizadas = palavrasChaveRaw;
          }
        }
        
        // Obter dados da restrição relacionada
        const restriction = ur.restriction;
        const restrictionData = restriction ? {
          id: restriction.id,
          nome: restriction.nome,
          categoria: restriction.categoria,
          palavras_chave: restriction.palavras_chave || []
        } : null;
        
        return {
          id: ur.id,
          user_id: ur.user_id,
          restriction_id: ur.restriction_id,
          palavras_chave_personalizadas: palavrasChavePersonalizadas,
          created_at: ur.created_at,
          updated_at: ur.updated_at,
          restriction: restrictionData
        };
      } catch (mapErr) {
        logger.warn('Erro ao processar restrição do usuário', mapErr);
        logger.warn('Stack trace:', mapErr.stack);
        // Retornar dados básicos mesmo se houver erro
        return {
          id: ur.id,
          user_id: ur.user_id,
          restriction_id: ur.restriction_id,
          palavras_chave_personalizadas: [],
          created_at: ur.created_at,
          restriction: null
        };
      }
    });

    return res.json({ success: true, data: restrictionsData });
  } catch (err) {
    logger.error('Erro ao obter restrições do usuário', err);
    logger.error('Stack trace:', err.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

const addUserRestriction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { restriction_id, nome, palavras_chave } = req.body;

    if (restriction_id) {
      // associar restrição existente
      const r = await Restriction.findByPk(restriction_id);
      if (!r) return res.status(404).json({ success: false, message: 'Restrição não encontrada' });

      const exists = await UserRestriction.findOne({
        where: { user_id: userId, restriction_id }
      });
      if (exists)
        return res.status(409).json({ success: false, message: 'Restrição já associada' });

      const ur = await UserRestriction.create({ user_id: userId, restriction_id });
      return res.status(201).json({ success: true, data: ur });
    } else {
      // criar nova restrição global e associar ao usuário
      if (!nome) return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
      const newR = await Restriction.create({
        nome,
        palavras_chave: Array.isArray(palavras_chave)
          ? JSON.stringify(palavras_chave)
          : palavras_chave || null
      });
      const ur = await UserRestriction.create({ user_id: userId, restriction_id: newR.id });
      return res
        .status(201)
        .json({ success: true, data: { restriction: newR, userRestriction: ur } });
    }
  } catch (err) {
    logger.error('Erro ao adicionar restrição ao usuário', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
};

const deleteUserRestriction = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = req.params.id; // id da associação user_restrictions

    const ur = await UserRestriction.findByPk(id);
    if (!ur) return res.status(404).json({ success: false, message: 'Associação não encontrada' });
    if (ur.user_id !== userId)
      return res.status(403).json({ success: false, message: 'Não autorizado' });

    await ur.destroy();
    return res.status(204).send();
  } catch (err) {
    logger.error('Erro ao deletar restrição do usuário', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
};

const updateUserRestriction = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    const { palavras_chave_personalizadas, notes } = req.body;

    const ur = await UserRestriction.findByPk(id);
    if (!ur) return res.status(404).json({ success: false, message: 'Associação não encontrada' });
    if (ur.user_id !== userId)
      return res.status(403).json({ success: false, message: 'Não autorizado' });

    if (palavras_chave_personalizadas !== undefined) {
      ur.palavras_chave_personalizadas = Array.isArray(palavras_chave_personalizadas)
        ? JSON.stringify(palavras_chave_personalizadas)
        : palavras_chave_personalizadas;
    }
    if (notes !== undefined) ur.notes = notes;
    await ur.save();
    return res.json({ success: true, data: ur });
  } catch (err) {
    logger.error('Erro ao atualizar restrição do usuário', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
};

module.exports = {
  getAllRestrictions,
  getUserRestrictions,
  addUserRestriction,
  deleteUserRestriction,
  updateUserRestriction
};
