const Restriction = require('../models/Restriction');
const UserRestriction = require('../models/UserRestriction');
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
    const userRestrictions = await UserRestriction.findAll({
      where: { user_id: userId },
      include: [{ model: Restriction, as: 'restriction' }]
    });
    return res.json({ success: true, data: userRestrictions });
  } catch (err) {
    logger.error('Erro ao obter restrições do usuário', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
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
