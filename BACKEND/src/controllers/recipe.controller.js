const Recipe = require('../models/Recipe');
const RecipeRestriction = require('../models/RecipeRestriction');
const RecipeRating = require('../models/RecipeRating');
const RecipeFavorite = require('../models/RecipeFavorite');
const UserRestriction = require('../models/UserRestriction');
const { User, Restriction } = require('../models');
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

    // Busca apenas por nome
    if (search) {
      where.nome = { [Op.iLike]: `%${search}%` };
    }

    // Filtro por restrições específicas
    // Nota: Como recipe_restrictions não tem FK para restrictions, vamos buscar por palavras-chave das restrições
    let recipeIdsByRestrictions = null;
    if (restrictions) {
      const restrictionIds = restrictions
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id) && id > 0);

      if (restrictionIds.length > 0) {
        // Buscar as palavras-chave das restrições solicitadas
        const restrictionDetails = await Restriction.findAll({
          where: { id: { [Op.in]: restrictionIds } },
          attributes: ['id', 'palavras_chave']
        });

        // Extrair todas as palavras-chave para busca
        const keywords = [];
        restrictionDetails.forEach(r => {
          if (r.palavras_chave) {
            if (Array.isArray(r.palavras_chave)) {
              keywords.push(...r.palavras_chave.map(k => k.toLowerCase()));
            } else if (typeof r.palavras_chave === 'string') {
              keywords.push(...r.palavras_chave.split(',').map(k => k.trim().toLowerCase()));
            }
          }
        });

        if (keywords.length > 0) {
          // Buscar receitas que têm esses ingredientes/palavras-chave
          // Construir condições OR para cada palavra-chave
          const conditions = [];
          keywords.forEach(keyword => {
            conditions.push({ ingrediente_restritivo: { [Op.iLike]: `%${keyword}%` } });
            conditions.push({ palavras_chave: { [Op.iLike]: `%${keyword}%` } });
          });

          const recipeRestrictions = await RecipeRestriction.findAll({
            where: {
              [Op.or]: conditions
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
    const recipeId = parseInt(req.params.id, 10);
    
    // Validar ID
    if (isNaN(recipeId) || recipeId <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID da receita inválido' 
      });
    }
    
    const userId = req.user?.id; // Opcional, pode ser null se não autenticado

    // Buscar receita com relacionamentos básicos
    const recipe = await Recipe.findByPk(recipeId, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'nome_completo', 'email', 'foto_perfil'],
          required: false
        },
        {
          model: RecipeRating,
          as: 'ratings',
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'nome_completo', 'foto_perfil'],
              required: false
            }
          ],
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Receita não encontrada' });
    }

    // Buscar restrições - usar campo JSON se disponível, senão usar tabela recipe_restrictions
    let restrictions = [];
    
    logger.info(`🔍 Buscando restrições para receita ${recipeId}`);
    logger.info(`📋 restricoes_detectadas:`, recipe.restricoes_detectadas);
    
    // Priorizar campo JSON restricoes_detectadas (nova solução simplificada)
    if (recipe.restricoes_detectadas && Array.isArray(recipe.restricoes_detectadas) && recipe.restricoes_detectadas.length > 0) {
      logger.info(`✅ Usando restricoes_detectadas (${recipe.restricoes_detectadas.length} itens)`);
      // Buscar informações completas das restrições para obter palavras_chave
      const restrictionIds = recipe.restricoes_detectadas
        .map(r => r.restricao_id)
        .filter(id => id != null);
      
      let restrictionsMap = {};
      if (restrictionIds.length > 0) {
        const restrictionsData = await Restriction.findAll({
          where: { id: { [Op.in]: restrictionIds } },
          attributes: ['id', 'nome', 'categoria', 'palavras_chave']
        });
        restrictionsData.forEach(r => {
          restrictionsMap[r.id] = r;
        });
      }
      
      // Remover duplicatas baseado no restricao_id
      const seenRestrictionIds = new Set();
      restrictions = recipe.restricoes_detectadas
        .filter(r => {
          if (r.restricao_id && !seenRestrictionIds.has(r.restricao_id)) {
            seenRestrictionIds.add(r.restricao_id);
            return true;
          }
          return false;
        })
        .map(r => {
          const restrictionData = restrictionsMap[r.restricao_id];
          return {
            id: null,
            ingrediente_restritivo: r.ingrediente,
            palavras_chave: restrictionData ? (restrictionData.palavras_chave || r.palavras_chave || []) : (r.palavras_chave || []),
            restricao_id: r.restricao_id,
            restricao_nome: r.restricao_nome || (restrictionData ? restrictionData.nome : null),
            restriction: restrictionData ? {
              id: restrictionData.id,
              nome: restrictionData.nome,
              categoria: restrictionData.categoria,
              palavras_chave: restrictionData.palavras_chave || []
            } : null
          };
        });
    } else {
      // Fallback: buscar da tabela recipe_restrictions (compatibilidade)
      logger.info(`📋 Buscando da tabela recipe_restrictions`);
      const recipeRestrictions = await RecipeRestriction.findAll({
        where: { recipe_id: recipeId },
        attributes: ['id', 'ingrediente_restritivo', 'restriction_id'],
        include: [{
          model: Restriction,
          as: 'restriction',
          attributes: ['id', 'nome', 'categoria', 'palavras_chave'],
          required: false
        }]
      });
      
      logger.info(`📋 Encontradas ${recipeRestrictions.length} restrições na tabela`);
      
      // Remover duplicatas baseado no restriction_id
      const seenRestrictionIds = new Set();
      restrictions = recipeRestrictions
        .filter(rr => {
          if (rr.restriction_id && !seenRestrictionIds.has(rr.restriction_id)) {
            seenRestrictionIds.add(rr.restriction_id);
            return true;
          }
          return false;
        })
        .map(rr => ({
          id: rr.id,
          ingrediente_restritivo: rr.ingrediente_restritivo,
          restriction_id: rr.restriction_id,
          restricao_id: rr.restriction_id, // Alias para compatibilidade
          restricao_nome: rr.restriction ? rr.restriction.nome : null,
          palavras_chave: rr.restriction ? (rr.restriction.palavras_chave || []) : [],
          restriction: rr.restriction ? {
            id: rr.restriction.id,
            nome: rr.restriction.nome,
            categoria: rr.restriction.categoria,
            palavras_chave: rr.restriction.palavras_chave || []
          } : null
        }));
    }
    
    logger.info(`✅ Total de restrições encontradas: ${restrictions.length}`);

    // Adicionar restrições ao objeto da receita
    recipe.restrictions = restrictions;

    // Incrementar visualizações (não bloquear se falhar)
    try {
      recipe.visualizacoes = (recipe.visualizacoes || 0) + 1;
      await recipe.save();
    } catch (saveErr) {
      logger.warn('Erro ao incrementar visualizações', saveErr);
      // Continuar mesmo se falhar ao salvar visualizações
    }

    // Calcular média de avaliações
    const ratings = recipe.ratings || [];
    const averageRating =
      ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length 
        : 0;

    // Verificar restrições do usuário (se autenticado)
    // Nota: Como recipe_restrictions não tem FK para restrictions, vamos verificar por palavras-chave
    let hasRestrictionConflict = false;
    const conflictingRestrictions = [];

    if (userId && recipe.restrictions && recipe.restrictions.length > 0) {
      try {
        // Obter restrições do usuário com suas palavras-chave
        const userRestrictionsData = await UserRestriction.findAll({
          where: { user_id: userId },
          include: [
            {
              model: Restriction,
              as: 'restriction',
              attributes: ['id', 'nome', 'palavras_chave'],
              required: false
            }
          ]
        });

        // Extrair todas as palavras-chave das restrições do usuário
        const userKeywords = new Set();
        userRestrictionsData.forEach(ur => {
          if (ur.restriction && ur.restriction.palavras_chave) {
            const keywords = Array.isArray(ur.restriction.palavras_chave) 
              ? ur.restriction.palavras_chave 
              : (typeof ur.restriction.palavras_chave === 'string' 
                  ? ur.restriction.palavras_chave.split(',').map(k => k.trim().toLowerCase())
                  : []);
            keywords.forEach(k => userKeywords.add(k));
          }
          // Também verificar palavras-chave personalizadas do usuário
          if (ur.palavras_chave_personalizadas) {
            const customKeywords = typeof ur.palavras_chave_personalizadas === 'string'
              ? ur.palavras_chave_personalizadas.split(',').map(k => k.trim().toLowerCase())
              : [];
            customKeywords.forEach(k => userKeywords.add(k));
          }
        });

        // Verificar se algum ingrediente restritivo da receita corresponde às palavras-chave do usuário
        recipe.restrictions.forEach(rr => {
          const ingrediente = (rr.ingrediente_restritivo || '').toLowerCase();
          const palavrasChave = Array.isArray(rr.palavras_chave)
            ? rr.palavras_chave.map(k => k.toLowerCase())
            : (typeof rr.palavras_chave === 'string'
                ? rr.palavras_chave.split(',').map(k => k.trim().toLowerCase())
                : []);

          // Verificar se há correspondência
          const hasMatch = userKeywords.has(ingrediente) || 
                          palavrasChave.some(pk => userKeywords.has(pk)) ||
                          Array.from(userKeywords).some(uk => ingrediente.includes(uk) || palavrasChave.some(pk => pk.includes(uk)));

          if (hasMatch) {
            hasRestrictionConflict = true;
            conflictingRestrictions.push({
              ingredient: rr.ingrediente_restritivo,
              palavrasChave: palavrasChave
            });
          }
        });
      } catch (restrictionErr) {
        logger.warn('Erro ao verificar restrições do usuário', restrictionErr);
        // Continuar mesmo se falhar ao verificar restrições
      }
    }

    // Converter para JSON de forma segura
    let recipeData;
    try {
      recipeData = recipe.toJSON();
      // Garantir que restricoes_detectadas está incluído
      if (!recipeData.restricoes_detectadas) {
        recipeData.restricoes_detectadas = recipe.restricoes_detectadas || [];
      }
      // Garantir que restrictions está incluído
      if (!recipeData.restrictions) {
        recipeData.restrictions = restrictions || [];
      }
    } catch (jsonErr) {
      logger.error('Erro ao converter receita para JSON', jsonErr);
      // Se toJSON falhar, construir manualmente
      recipeData = {
        id: recipe.id,
        nome: recipe.nome,
        descricao: recipe.descricao,
        ingredientes: recipe.ingredientes,
        modo_preparo: recipe.modo_preparo,
        tempo_preparo: recipe.tempo_preparo,
        rendimento: recipe.rendimento,
        imagem_url: recipe.imagem_url,
        status: recipe.status,
        visualizacoes: recipe.visualizacoes,
        created_at: recipe.created_at,
        updated_at: recipe.updated_at,
        user_id: recipe.user_id,
        restricoes_detectadas: recipe.restricoes_detectadas || [],
        author: recipe.author ? {
          id: recipe.author.id,
          nome_completo: recipe.author.nome_completo,
          email: recipe.author.email,
          foto_perfil: recipe.author.foto_perfil
        } : null,
        ratings: ratings.map(r => ({
          id: r.id,
          rating: r.rating,
          comentario: r.comentario,
          user: r.user ? {
            id: r.user.id,
            nome_completo: r.user.nome_completo,
            foto_perfil: r.user.foto_perfil
          } : null
        })),
        restrictions: restrictions.map(rr => ({
          id: rr.id,
          restriction_id: rr.restriction_id || rr.restricao_id || null,
          restricao_id: rr.restriction_id || rr.restricao_id || null, // Alias para compatibilidade
          ingrediente_restritivo: rr.ingrediente_restritivo,
          palavras_chave: rr.palavras_chave || [],
          restriction: rr.restriction ? {
            id: rr.restriction.id,
            nome: rr.restriction.nome,
            categoria: rr.restriction.categoria,
            palavras_chave: rr.restriction.palavras_chave || []
          } : null
        }))
      };
    }
    
    logger.info(`📤 Retornando receita com ${recipeData.restrictions?.length || 0} restrições`);

    return res.json({
      success: true,
      data: {
        ...recipeData,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: ratings.length,
        hasRestrictionConflict,
        conflictingRestrictions
      }
    });
  } catch (err) {
    logger.error('Erro ao obter receita por ID', err);
    logger.error('Stack trace:', err.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao obter receita',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Criar receita
 * POST /api/recipes
 */
const createRecipe = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Processar restriction_ids do FormData (pode vir como array ou múltiplos campos)
    let restriction_ids = req.body.restriction_ids;
    if (restriction_ids) {
      // Se for array, manter como está
      if (Array.isArray(restriction_ids)) {
        // Já está correto
      } else if (typeof restriction_ids === 'string') {
        // Se for string, tentar parsear JSON ou dividir por vírgula
        try {
          restriction_ids = JSON.parse(restriction_ids);
        } catch {
          restriction_ids = restriction_ids.split(',').map(id => id.trim()).filter(id => id);
        }
      } else {
        // Se for um único valor, converter para array
        restriction_ids = [restriction_ids];
      }
    }
    
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

    // Extração e identificação automática de restrições
      try {
        const extracted = extractIngredients(ingredientesArray);
        
        // Validar ingredientes extraídos (filtrar valores muito longos que podem ser erros)
        const validIngredients = extracted.filter(ing => ing && ing.length > 0 && ing.length <= 100);
        
        if (validIngredients.length > 0) {
          const matches = await identifyRestrictionsFromIngredients(validIngredients);

          if (matches && matches.length > 0) {
            // Remover duplicatas baseado no restriction_id
            const uniqueMatches = [];
            const seenRestrictionIds = new Set();
            
            for (const m of matches) {
              if (m.restrictionId && !seenRestrictionIds.has(m.restrictionId)) {
                seenRestrictionIds.add(m.restrictionId);
                uniqueMatches.push(m);
              }
            }
            
            // Armazenar restrições detectadas no campo JSON da receita (solução simplificada)
            const restricoesDetectadas = uniqueMatches.map(m => {
              let ingredienteTexto = (m.ingrediente || '').trim();
              
              // Limitar tamanho do ingrediente
              if (ingredienteTexto.length > 100) {
                const palavras = ingredienteTexto.split(/\s+/).slice(0, 10);
                ingredienteTexto = palavras.join(' ');
              }
              
              return {
                ingrediente: ingredienteTexto.substring(0, 255),
                palavras_chave: [m.matchedKeyword],
                restricao_id: m.restrictionId,
                restricao_nome: m.restrictionName,
                detectado_em: new Date().toISOString()
              };
            });

            // Salvar no campo JSON da receita
            recipe.restricoes_detectadas = restricoesDetectadas;
            recipe.has_restriction_alert = true;
            await recipe.save();

            // Opcional: Também salvar na tabela recipe_restrictions para compatibilidade
            // (pode ser removido depois se não for mais necessário)
            for (const m of uniqueMatches) {
              let ingredienteTexto = (m.ingrediente || '').trim();
              if (ingredienteTexto.length > 100) {
                const palavras = ingredienteTexto.split(/\s+/).slice(0, 10);
                ingredienteTexto = palavras.join(' ');
              }
              ingredienteTexto = ingredienteTexto.substring(0, 255);
              
              if (ingredienteTexto.length > 0) {
                try {
                  await RecipeRestriction.create({
                    recipe_id: recipe.id,
                    restriction_id: m.restrictionId || null,
                    ingrediente_restritivo: ingredienteTexto
                  });
                } catch (restrictionCreateErr) {
                  logger.warn('Erro ao criar recipe_restriction (não crítico)', restrictionCreateErr);
                }
              }
            }
          }
        }
    } catch (restrictionErr) {
      // Logar erro mas não falhar a criação da receita
      logger.warn('Erro ao processar restrições da receita', restrictionErr);
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

    // Processar restriction_ids do FormData (pode vir como array ou múltiplos campos)
    let restriction_ids = req.body.restriction_ids;
    if (restriction_ids) {
      // Se for array, manter como está
      if (Array.isArray(restriction_ids)) {
        // Já está correto
      } else if (typeof restriction_ids === 'string') {
        // Se for string, tentar parsear JSON ou dividir por vírgula
        try {
          restriction_ids = JSON.parse(restriction_ids);
        } catch {
          restriction_ids = restriction_ids.split(',').map(id => id.trim()).filter(id => id);
        }
      } else {
        // Se for um único valor, converter para array
        restriction_ids = [restriction_ids];
      }
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

    // Atualizar restrições detectadas automaticamente
    try {
      const ingredientsArr = Array.isArray(recipe.ingredientes) ? recipe.ingredientes : [];
      const validIngredients = ingredientsArr.filter(ing => ing && typeof ing === 'string' && ing.length > 0 && ing.length <= 100);
      
      if (validIngredients.length > 0) {
        const extracted = extractIngredients(validIngredients);
        const matches = await identifyRestrictionsFromIngredients(extracted);

        if (matches && matches.length > 0) {
          // Remover duplicatas baseado no restriction_id
          const uniqueMatches = [];
          const seenRestrictionIds = new Set();
          
          for (const m of matches) {
            if (m.restrictionId && !seenRestrictionIds.has(m.restrictionId)) {
              seenRestrictionIds.add(m.restrictionId);
              uniqueMatches.push(m);
            }
          }
          
          // Armazenar no campo JSON da receita
          const restricoesDetectadas = uniqueMatches.map(m => {
            let ingredienteTexto = (m.ingrediente || '').trim();
            if (ingredienteTexto.length > 100) {
              const palavras = ingredienteTexto.split(/\s+/).slice(0, 10);
              ingredienteTexto = palavras.join(' ');
            }
            return {
              ingrediente: ingredienteTexto.substring(0, 255),
              palavras_chave: [m.matchedKeyword],
              restricao_id: m.restrictionId,
              restricao_nome: m.restrictionName,
              detectado_em: new Date().toISOString()
            };
          });

          recipe.restricoes_detectadas = restricoesDetectadas;
          recipe.has_restriction_alert = true;

            // Opcional: Também atualizar recipe_restrictions para compatibilidade
            await RecipeRestriction.destroy({ where: { recipe_id: recipe.id } });
            for (const m of uniqueMatches) {
            let ingredienteTexto = (m.ingrediente || '').trim();
            if (ingredienteTexto.length > 100) {
              const palavras = ingredienteTexto.split(/\s+/).slice(0, 10);
              ingredienteTexto = palavras.join(' ');
            }
            ingredienteTexto = ingredienteTexto.substring(0, 255);
            if (ingredienteTexto.length > 0) {
              try {
                await RecipeRestriction.create({
                  recipe_id: recipe.id,
                  restriction_id: m.restrictionId || null,
                  ingrediente_restritivo: ingredienteTexto
                });
              } catch (restrictionCreateErr) {
                logger.warn('Erro ao criar recipe_restriction (não crítico)', restrictionCreateErr);
              }
            }
          }
        } else {
          recipe.restricoes_detectadas = [];
          recipe.has_restriction_alert = false;
          // Limpar recipe_restrictions também
          await RecipeRestriction.destroy({ where: { recipe_id: recipe.id } });
        }
      } else {
        recipe.restricoes_detectadas = [];
        recipe.has_restriction_alert = false;
        await RecipeRestriction.destroy({ where: { recipe_id: recipe.id } });
      }
    } catch (restrictionErr) {
      logger.warn('Erro ao processar restrições na atualização', restrictionErr);
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
