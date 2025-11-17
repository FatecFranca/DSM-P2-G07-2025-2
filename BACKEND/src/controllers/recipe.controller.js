const Recipe = require('../models/Recipe');
const RecipeRestriction = require('../models/RecipeRestriction');
const RecipeRating = require('../models/RecipeRating');
const RecipeFavorite = require('../models/RecipeFavorite');
const UserRestriction = require('../models/UserRestriction');
const { User } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { saveFile, deleteFile } = require('../services/storageService');
const {
  extractIngredients,
  identifyRestrictionsFromIngredients
} = require('../utils/ingredientParser');
const logger = require('../utils/logger');

/**
 * Listar receitas com paginação, filtros e ordenação
 * GET /api/recipes
 * Query params:
 * - search: busca por nome ou descrição
 * - restrictions: filtro por IDs de restrições (ex: restrictions=1,2,3)
 * - compatible: true para filtrar receitas compatíveis com restrições do usuário (requer autenticação)
 * - status: filtro por status (padrão: 'publicada')
 * - orderBy: campo para ordenação (created_at, nome, visualizacoes, rating)
 * - order: ASC ou DESC (padrão: DESC)
 * - sort: atalho para ordenação ('recent', 'popular', 'rating')
 * - page: número da página (padrão: 1)
 * - limit: itens por página (padrão: 20)
 */
const listRecipes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      restrictions,
      compatible,
      status = 'publicada',
      orderBy,
      order,
      sort
    } = req.query;

    const userId = req.user?.id; // Opcional, pode ser null se não autenticado
    const where = {};

    // Filtrar apenas receitas publicadas por padrão
    where.status = status;

    // Busca por nome ou descrição
    if (search) {
      where[Op.or] = [
        { nome: { [Op.iLike]: `%${search}%` } },
        { descricao: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filtro por restrições específicas
    let recipeIdsByRestrictions = null;
    if (restrictions) {
      const restrictionIds = restrictions
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id) && id > 0);

      if (restrictionIds.length > 0) {
        const recipeRestrictions = await RecipeRestriction.findAll({
          where: {
            restriction_id: { [Op.in]: restrictionIds }
          },
          attributes: ['recipe_id'],
          raw: true
        });

        // Obter IDs únicos de receitas
        recipeIdsByRestrictions = [...new Set(recipeRestrictions.map(rr => rr.recipe_id))];

        if (recipeIdsByRestrictions.length === 0) {
          // Se não há receitas com essas restrições, retornar vazio
          return res.json({
            success: true,
            data: [],
            meta: {
              total: 0,
              page: parseInt(page, 10),
              limit: parseInt(limit, 10),
              totalPages: 0
            }
          });
        }
      }
    }

    // Filtro para receitas compatíveis com restrições do usuário autenticado
    let compatibleRecipeIds = null;
    if (compatible === 'true' && userId) {
      // Obter restrições do usuário
      const userRestrictions = await UserRestriction.findAll({
        where: { user_id: userId },
        attributes: ['restriction_id']
      });

      const userRestrictionIds = userRestrictions
        .map(ur => ur.restriction_id)
        .filter(id => id !== null);

      if (userRestrictionIds.length > 0) {
        // Buscar receitas que têm essas restrições (para excluir)
        const conflictingRecipes = await RecipeRestriction.findAll({
          where: {
            restriction_id: { [Op.in]: userRestrictionIds }
          },
          attributes: ['recipe_id'],
          raw: true
        });

        // Obter IDs únicos de receitas com conflito
        const conflictingRecipeIds = [...new Set(conflictingRecipes.map(rr => rr.recipe_id))];

        // Buscar todas as receitas publicadas
        const allRecipes = await Recipe.findAll({
          where: { status: 'publicada' },
          attributes: ['id']
        });

        // Filtrar receitas que não têm conflito
        compatibleRecipeIds = allRecipes
          .map(r => r.id)
          .filter(id => !conflictingRecipeIds.includes(id));

        if (compatibleRecipeIds.length === 0) {
          return res.json({
            success: true,
            data: [],
            meta: {
              total: 0,
              page: parseInt(page, 10),
              limit: parseInt(limit, 10),
              totalPages: 0
            }
          });
        }
      }
    }

    // Aplicar filtros de IDs de receitas
    if (recipeIdsByRestrictions !== null || compatibleRecipeIds !== null) {
      let finalRecipeIds = [];

      if (recipeIdsByRestrictions !== null && compatibleRecipeIds !== null) {
        // Intersecção: receitas que têm as restrições especificadas E são compatíveis
        finalRecipeIds = recipeIdsByRestrictions.filter(id => compatibleRecipeIds.includes(id));
      } else if (recipeIdsByRestrictions !== null) {
        finalRecipeIds = recipeIdsByRestrictions;
      } else {
        finalRecipeIds = compatibleRecipeIds;
      }

      if (finalRecipeIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          meta: {
            total: 0,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            totalPages: 0
          }
        });
      }

      where.id = { [Op.in]: finalRecipeIds };
    }

    // Determinar ordenação
    let finalOrderBy = 'created_at';
    let finalOrder = 'DESC';

    // Se usar sort (atalho), mapear para orderBy/order
    if (sort) {
      switch (sort.toLowerCase()) {
        case 'recent':
          finalOrderBy = 'created_at';
          finalOrder = 'DESC';
          break;
        case 'popular':
          finalOrderBy = 'visualizacoes';
          finalOrder = 'DESC';
          break;
        case 'rating':
          // Ordenação por rating será feita após a query
          finalOrderBy = 'created_at';
          finalOrder = 'DESC';
          break;
        default:
          finalOrderBy = 'created_at';
          finalOrder = 'DESC';
      }
    } else {
      // Validação de ordenação manual
      const validOrderBy = ['created_at', 'nome', 'visualizacoes', 'updated_at'];
      const validOrder = ['ASC', 'DESC'];
      finalOrderBy = validOrderBy.includes(orderBy) ? orderBy : 'created_at';
      finalOrder = validOrder.includes(order?.toUpperCase()) ? order.toUpperCase() : 'DESC';
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // Query base
    const queryOptions = {
      where,
      limit: parseInt(limit, 10),
      offset,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'nome_completo', 'email', 'foto_perfil']
        },
        {
          model: RecipeRating,
          as: 'ratings',
          attributes: ['rating'],
          required: false
        }
      ]
    };

    // Se não for ordenação por rating, aplicar order normal
    if (sort?.toLowerCase() !== 'rating') {
      queryOptions.order = [[finalOrderBy, finalOrder]];
    } else {
      queryOptions.order = [['created_at', 'DESC']]; // Ordenação temporária
    }

    const { rows, count } = await Recipe.findAndCountAll(queryOptions);

    // Calcular média de avaliações para cada receita
    let recipesWithRatings = rows.map(recipe => {
      const ratings = recipe.ratings || [];
      const averageRating =
        ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;

      const recipeData = recipe.toJSON();
      recipeData.averageRating = Math.round(averageRating * 10) / 10;
      recipeData.totalRatings = ratings.length;

      // Remover ratings do objeto principal (já calculamos a média)
      delete recipeData.ratings;

      return recipeData;
    });

    // Se ordenação por rating, ordenar após calcular médias
    if (sort?.toLowerCase() === 'rating') {
      recipesWithRatings.sort((a, b) => {
        // Primeiro por média de avaliação (descendente)
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        // Se empate, por número de avaliações (descendente)
        if (b.totalRatings !== a.totalRatings) {
          return b.totalRatings - a.totalRatings;
        }
        // Se ainda empate, por data de criação (descendente)
        return new Date(b.created_at) - new Date(a.created_at);
      });
    }

    return res.json({
      success: true,
      data: recipesWithRatings,
      meta: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10))
      }
    });
  } catch (err) {
    logger.error('Erro ao listar receitas', err);
    return res.status(500).json({ success: false, message: 'Erro ao listar receitas' });
  }
};

/**
 * Obter receita por ID
 * GET /api/recipes/:id
 */
const getRecipeById = async (req, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user?.id; // Opcional, pode ser null se não autenticado

    const recipe = await Recipe.findByPk(recipeId, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'nome_completo', 'email', 'foto_perfil']
        },
        {
          model: RecipeRating,
          as: 'ratings',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'nome_completo', 'foto_perfil']
            }
          ],
          order: [['created_at', 'DESC']]
        },
        {
          model: RecipeRestriction,
          as: 'restrictions',
          attributes: ['id', 'restriction_id', 'ingrediente_restritivo', 'palavras_chave'],
          include: [
            {
              model: require('../models/Restriction'),
              as: 'restriction',
              attributes: ['id', 'nome']
            }
          ]
        }
      ]
    });

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Receita não encontrada' });
    }

    // Incrementar visualizações
    recipe.visualizacoes = (recipe.visualizacoes || 0) + 1;
    await recipe.save();

    // Calcular média de avaliações
    const ratings = recipe.ratings || [];
    const averageRating =
      ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;

    // Verificar restrições do usuário (se autenticado)
    let hasRestrictionConflict = false;
    const conflictingRestrictions = [];

    if (userId && recipe.restrictions && recipe.restrictions.length > 0) {
      // Obter IDs das restrições do usuário
      const userRestrictionsData = await UserRestriction.findAll({
        where: { user_id: userId },
        attributes: ['restriction_id']
      });

      const userRestrictionIds = userRestrictionsData
        .map(ur => ur.restriction_id)
        .filter(id => id !== null);

      // Verificar se a receita tem restrições que conflitam com as do usuário
      const recipeRestrictionIds = recipe.restrictions
        .map(rr => rr.restriction_id)
        .filter(id => id !== null);

      const conflicts = userRestrictionIds.filter(urId => recipeRestrictionIds.includes(urId));

      if (conflicts.length > 0) {
        hasRestrictionConflict = true;
        // Buscar informações das restrições conflitantes
        const Restriction = require('../models/Restriction');
        const restrictionDetails = await Restriction.findAll({
          where: { id: conflicts },
          attributes: ['id', 'nome']
        });

        conflictingRestrictions.push(
          ...restrictionDetails.map(r => ({
            restrictionId: r.id,
            restrictionName: r.nome,
            ingredient: recipe.restrictions.find(rr => rr.restriction_id === r.id)
              ?.ingrediente_restritivo
          }))
        );
      }
    }

    return res.json({
      success: true,
      data: {
        ...recipe.toJSON(),
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: ratings.length,
        hasRestrictionConflict,
        conflictingRestrictions
      }
    });
  } catch (err) {
    logger.error('Erro ao obter receita por ID', err);
    return res.status(500).json({ success: false, message: 'Erro ao obter receita' });
  }
};

/**
 * Criar receita
 * POST /api/recipes
 */
const createRecipe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { titulo, descricao, ingredientes, modo_preparo, tempo_preparo, rendimento, status } =
      req.body;

    // Processar e salvar imagem se enviada
    let imagemUrl = null;
    if (req.file) {
      try {
        // Usar o caminho do arquivo (já processado se PROCESS_IMAGES=true)
        const filePath = req.file.path;
        const fileName = path.basename(filePath);
        imagemUrl = await saveFile(filePath, fileName, 'recipe');

        // Deletar arquivo original se foi processado (com delay para evitar EBUSY)
        if (req.file.originalPath && req.file.originalPath !== filePath) {
          setTimeout(async () => {
            try {
              if (fs.existsSync(req.file.originalPath)) {
                fs.unlinkSync(req.file.originalPath);
              }
            } catch (err) {
              // Ignorar erros ao deletar arquivo original
            }
          }, 500);
        }
      } catch (error) {
        logger.error('Erro ao salvar imagem', error);
        // Continuar sem imagem se houver erro
      }
    }

    // Converter ingredientes para array se necessário
    let ingredientesArray = [];
    if (Array.isArray(ingredientes)) {
      ingredientesArray = ingredientes;
    } else if (typeof ingredientes === 'string') {
      try {
        ingredientesArray = JSON.parse(ingredientes);
      } catch {
        ingredientesArray = ingredientes
          .split(',')
          .map(i => i.trim())
          .filter(i => i);
      }
    }

    const recipe = await Recipe.create({
      user_id: userId,
      nome: titulo,
      descricao: descricao || null,
      ingredientes: ingredientesArray,
      modo_preparo: modo_preparo,
      tempo_preparo: tempo_preparo || null,
      rendimento: rendimento || null,
      imagem_url: imagemUrl,
      status: status || 'rascunho'
    });

    // Extração e identificação de restrições
    const extracted = extractIngredients(ingredientesArray);
    const matches = await identifyRestrictionsFromIngredients(extracted);

    if (matches && matches.length > 0) {
      // Popular recipe_restrictions
      for (const m of matches) {
        await RecipeRestriction.create({
          recipe_id: recipe.id,
          restriction_id: m.restrictionId,
          ingrediente_restritivo: m.ingrediente,
          palavras_chave: JSON.stringify([m.matchedKeyword])
        });
      }
      recipe.has_restriction_alert = true;
      await recipe.save();
    }

    return res.status(201).json({ success: true, data: recipe });
  } catch (err) {
    logger.error('Erro ao criar receita', err);

    // Deletar arquivos temporários se houver erro
    if (req.file) {
      const filesToDelete = [];

      // Arquivo processado (se existir)
      if (req.file.processedPath && fs.existsSync(req.file.processedPath)) {
        filesToDelete.push(req.file.processedPath);
      }

      // Arquivo original (se ainda existir e não foi processado)
      if (req.file.path && fs.existsSync(req.file.path) && !req.file.processedPath) {
        filesToDelete.push(req.file.path);
      }

      // Deletar arquivos com delay para evitar EBUSY
      filesToDelete.forEach(filePath => {
        setTimeout(() => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (unlinkErr) {
            logger.error('Erro ao deletar arquivo temporário', unlinkErr);
          }
        }, 100);
      });
    }

    return res
      .status(500)
      .json({ success: false, message: 'Erro ao criar receita', error: err.message });
  }
};

/**
 * Atualizar receita
 * PUT /api/recipes/:id
 */
const updateRecipe = async (req, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user.id;
    const recipe = await Recipe.findByPk(recipeId);

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Receita não encontrada' });
    }

    if (recipe.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Não autorizado' });
    }

    const { titulo, descricao, ingredientes, modo_preparo, tempo_preparo, rendimento, status } =
      req.body;

    // Atualizar campos
    if (titulo !== undefined) recipe.nome = titulo;
    if (descricao !== undefined) recipe.descricao = descricao;
    if (modo_preparo !== undefined) recipe.modo_preparo = modo_preparo;
    if (tempo_preparo !== undefined) recipe.tempo_preparo = tempo_preparo;
    if (rendimento !== undefined) recipe.rendimento = rendimento;
    if (status !== undefined) recipe.status = status;

    // Processar ingredientes
    if (ingredientes !== undefined) {
      let ingredientesArray = [];
      if (Array.isArray(ingredientes)) {
        ingredientesArray = ingredientes;
      } else if (typeof ingredientes === 'string') {
        try {
          ingredientesArray = JSON.parse(ingredientes);
        } catch {
          ingredientesArray = ingredientes
            .split(',')
            .map(i => i.trim())
            .filter(i => i);
        }
      }
      recipe.ingredientes = ingredientesArray;
    }

    // Processar nova imagem se enviada
    if (req.file) {
      // Deletar imagem antiga se existir
      if (recipe.imagem_url) {
        try {
          await deleteFile(recipe.imagem_url);
        } catch (deleteErr) {
          logger.error('Erro ao deletar imagem antiga', deleteErr);
        }
      }

      // Salvar nova imagem
      try {
        const fileName = path.basename(req.file.path);
        recipe.imagem_url = await saveFile(req.file.path, fileName, 'recipe');
      } catch (error) {
        logger.error('Erro ao salvar nova imagem', error);
        // Continuar sem atualizar a imagem se houver erro
      }
    }

    await recipe.save();

    // Atualizar recipe_restrictions
    await RecipeRestriction.destroy({ where: { recipe_id: recipe.id } });

    const ingredientsArr = Array.isArray(recipe.ingredientes) ? recipe.ingredientes : [];
    const extracted = extractIngredients(ingredientsArr);
    const matches = await identifyRestrictionsFromIngredients(extracted);

    if (matches && matches.length > 0) {
      for (const m of matches) {
        await RecipeRestriction.create({
          recipe_id: recipe.id,
          restriction_id: m.restrictionId,
          ingrediente_restritivo: m.ingrediente,
          palavras_chave: JSON.stringify([m.matchedKeyword])
        });
      }
      recipe.has_restriction_alert = true;
    } else {
      recipe.has_restriction_alert = false;
    }
    await recipe.save();

    return res.json({ success: true, data: recipe });
  } catch (err) {
    logger.error('Erro ao atualizar receita', err);

    // Deletar arquivo se houver erro
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        logger.error('Erro ao deletar arquivo', unlinkErr);
      }
    }

    return res.status(500).json({ success: false, message: 'Erro ao atualizar receita' });
  }
};

/**
 * Deletar receita
 * DELETE /api/recipes/:id
 */
const deleteRecipe = async (req, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user.id;
    const recipe = await Recipe.findByPk(recipeId);

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Receita não encontrada' });
    }

    if (recipe.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Não autorizado' });
    }

    // Deletar imagem associada
    if (recipe.imagem_url) {
      try {
        await deleteFile(recipe.imagem_url);
      } catch (deleteErr) {
        logger.error('Erro ao deletar imagem', deleteErr);
      }
    }

    // Deletar relacionamentos (CASCADE deve cuidar disso, mas vamos garantir)
    await RecipeRestriction.destroy({ where: { recipe_id: recipe.id } });
    await RecipeRating.destroy({ where: { recipe_id: recipe.id } });
    await RecipeFavorite.destroy({ where: { recipe_id: recipe.id } });

    // Deletar receita
    await recipe.destroy();

    return res.status(204).send();
  } catch (err) {
    logger.error('Erro ao deletar receita', err);
    return res.status(500).json({ success: false, message: 'Erro ao deletar receita' });
  }
};

/**
 * Listar receitas do usuário
 * GET /api/recipes/user
 */
const listUserRecipes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const where = { user_id: userId };
    if (status) where.status = status;
    const offset = (page - 1) * limit;
    const { rows, count } = await Recipe.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['created_at', 'DESC']]
    });
    return res.json({ success: true, data: rows, meta: { count } });
  } catch (err) {
    logger.error('Erro ao listar receitas do usuário', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
};

/**
 * Listar receitas publicadas do usuário
 * GET /api/recipes/user/published
 */
const listUserPublishedRecipes = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await Recipe.findAll({
      where: { user_id: userId, status: 'publicada' },
      order: [['created_at', 'DESC']]
    });
    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Erro ao listar receitas publicadas do usuário', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
};

module.exports = {
  listRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  listUserRecipes,
  listUserPublishedRecipes
};
