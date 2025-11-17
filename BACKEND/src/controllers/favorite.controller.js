const RecipeFavorite = require('../models/RecipeFavorite');
const Recipe = require('../models/Recipe');
const logger = require('../utils/logger');

/**
 * Adicionar receita aos favoritos
 * POST /api/recipes/:id/favorite
 */
const addFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const recipeId = req.params.id;

    // Verificar se receita existe
    const recipe = await Recipe.findByPk(recipeId);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Receita não encontrada'
      });
    }

    // Verificar se já está nos favoritos
    const existing = await RecipeFavorite.findOne({
      where: { user_id: userId, recipe_id: recipeId }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Receita já está nos favoritos'
      });
    }

    // Adicionar aos favoritos
    const favorite = await RecipeFavorite.create({
      user_id: userId,
      recipe_id: recipeId
    });

    return res.status(201).json({
      success: true,
      message: 'Receita adicionada aos favoritos',
      data: favorite
    });
  } catch (error) {
    logger.error('Erro ao adicionar favorito', error, { userId, recipeId });
    return res.status(500).json({
      success: false,
      message: 'Erro ao adicionar favorito'
    });
  }
};

/**
 * Remover receita dos favoritos
 * DELETE /api/recipes/:id/favorite
 */
const removeFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const recipeId = req.params.id;

    // Verificar se está nos favoritos
    const favorite = await RecipeFavorite.findOne({
      where: { user_id: userId, recipe_id: recipeId }
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Receita não está nos favoritos'
      });
    }

    // Remover dos favoritos
    await favorite.destroy();

    return res.status(200).json({
      success: true,
      message: 'Receita removida dos favoritos'
    });
  } catch (error) {
    logger.error('Erro ao remover favorito', error, { userId, recipeId });
    return res.status(500).json({
      success: false,
      message: 'Erro ao remover favorito'
    });
  }
};

/**
 * Listar receitas favoritas do usuário
 * GET /api/users/favorites
 */
const listFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await RecipeFavorite.findAndCountAll({
      where: { user_id: userId },
      include: [
        {
          model: Recipe,
          as: 'recipe',
          include: [
            {
              model: require('../models/User'),
              as: 'author',
              attributes: ['id', 'nome_completo', 'foto_perfil']
            }
          ]
        }
      ],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['created_at', 'DESC']]
    });

    const favorites = rows.map(fav => ({
      id: fav.id,
      recipe: fav.recipe,
      added_at: fav.created_at
    }));

    return res.json({
      success: true,
      data: {
        favorites,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Erro ao listar favoritos', error, { userId });
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar favoritos'
    });
  }
};

/**
 * Verificar se receita está nos favoritos
 * GET /api/recipes/:id/favorite
 */
const checkFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const recipeId = req.params.id;

    const favorite = await RecipeFavorite.findOne({
      where: { user_id: userId, recipe_id: recipeId }
    });

    return res.json({
      success: true,
      data: {
        isFavorite: !!favorite,
        favoriteId: favorite?.id || null
      }
    });
  } catch (error) {
    logger.error('Erro ao verificar favorito', error, { userId, recipeId });
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar favorito'
    });
  }
};

module.exports = {
  addFavorite,
  removeFavorite,
  listFavorites,
  checkFavorite
};

