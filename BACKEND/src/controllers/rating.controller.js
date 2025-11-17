const RecipeRating = require('../models/RecipeRating');
const Recipe = require('../models/Recipe');
const logger = require('../utils/logger');

const createRating = async (req, res) => {
  try {
    const userId = req.user.id;
    const recipeId = req.params.id;
    const { rating, comment } = req.body;
    const rVal = parseInt(rating, 10);
    if (!rVal || rVal < 1 || rVal > 5)
      return res.status(400).json({ success: false, message: 'rating inválido (1-5)' });

    const exists = await RecipeRating.findOne({ where: { user_id: userId, recipe_id: recipeId } });
    if (exists)
      return res
        .status(409)
        .json({ success: false, message: 'Usuário já avaliou. Use PUT para atualizar' });

    const created = await RecipeRating.create({
      user_id: userId,
      recipe_id: recipeId,
      rating: rVal,
      comment
    });

    const stats = await RecipeRating.findAll({ where: { recipe_id: recipeId } });
    const avg = stats.reduce((s, item) => s + item.rating, 0) / stats.length;
    await Recipe.update(
      { average_rating: avg, rating_count: stats.length },
      { where: { id: recipeId } }
    );

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    logger.error('Erro ao criar avaliação', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
};

const updateRating = async (req, res) => {
  try {
    const userId = req.user.id;
    const recipeId = req.params.id;
    const { rating, comment } = req.body;
    const rVal = rating !== undefined ? parseInt(rating, 10) : undefined;
    if (rVal !== undefined && (rVal < 1 || rVal > 5))
      return res.status(400).json({ success: false, message: 'rating inválido (1-5)' });

    const existing = await RecipeRating.findOne({
      where: { user_id: userId, recipe_id: recipeId }
    });
    if (!existing)
      return res.status(404).json({ success: false, message: 'Avaliação não encontrada' });

    if (rVal !== undefined) existing.rating = rVal;
    if (comment !== undefined) existing.comment = comment;
    await existing.save();

    const stats = await RecipeRating.findAll({ where: { recipe_id: recipeId } });
    const avg = stats.reduce((s, item) => s + item.rating, 0) / stats.length;
    await Recipe.update(
      { average_rating: avg, rating_count: stats.length },
      { where: { id: recipeId } }
    );

    return res.json({ success: true, data: existing });
  } catch (err) {
    logger.error('Erro ao atualizar avaliação', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
};

const deleteRating = async (req, res) => {
  try {
    const userId = req.user.id;
    const recipeId = req.params.id;
    const existing = await RecipeRating.findOne({
      where: { user_id: userId, recipe_id: recipeId }
    });
    if (!existing)
      return res.status(404).json({ success: false, message: 'Avaliação não encontrada' });

    await existing.destroy();

    const stats = await RecipeRating.findAll({ where: { recipe_id: recipeId } });
    const avg = stats.length ? stats.reduce((s, item) => s + item.rating, 0) / stats.length : 0;
    await Recipe.update(
      { average_rating: avg, rating_count: stats.length },
      { where: { id: recipeId } }
    );

    return res.status(204).send();
  } catch (err) {
    logger.error('Erro ao deletar avaliação', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
};

const getRatings = async (req, res) => {
  try {
    const recipeId = req.params.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const { count, rows } = await RecipeRating.findAndCountAll({
      where: { recipe_id: recipeId },
      include: [{ association: 'user', attributes: ['id', 'nome_completo'] }],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['created_at', 'DESC']]
    });

    const recipe = await Recipe.findByPk(recipeId);
    const meta = {
      average: recipe ? recipe.average_rating : 0,
      count: recipe ? recipe.rating_count : count
    };

    return res.json({ success: true, data: rows, meta });
  } catch (err) {
    logger.error('Erro ao obter avaliações', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
};

module.exports = {
  createRating,
  updateRating,
  deleteRating,
  getRatings
};
