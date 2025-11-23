const { Restriction, UserRestriction } = require('../models');
const logger = require('../utils/logger');

module.exports = {
  async getUserRestrictions(req, res) {
    try {
      const userId = req.user.id;

      const userRestrictions = await UserRestriction.findAll({
        where: { user_id: userId },
        include: [
          {
            model: Restriction,
            as: 'restriction',
            attributes: ['id', 'nome', 'categoria', 'palavras_chave'],
            required: false
          }
        ]
      });

      // Converter para formato esperado
      const restrictionsData = userRestrictions.map(ur => {
        const urData = ur.toJSON ? ur.toJSON() : ur;
        return {
          id: urData.id,
          user_id: urData.user_id,
          restriction_id: urData.restriction_id,
          palavras_chave_personalizadas: urData.palavras_chave_personalizadas || [],
          restriction: urData.restriction
        };
      });

      return res.json({ success: true, data: restrictionsData });
    } catch (error) {
      logger.error('Erro ao obter restrições do usuário', error);
      return res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },

  async addRestriction(req, res) {
    try {
      const userId = req.user.id;
      const { restriction_id } = req.body;

      if (!restriction_id) {
        return res.status(400).json({ success: false, error: 'restriction_id é obrigatório' });
      }

      // Verificar se a restrição existe
      const restriction = await Restriction.findByPk(restriction_id);
      if (!restriction) {
        return res.status(404).json({ success: false, error: 'Restrição não encontrada' });
      }

      // Verificar se já existe associação
      const already = await UserRestriction.findOne({
        where: { user_id: userId, restriction_id }
      });
      
      if (already) {
        return res.status(409).json({ success: false, error: 'Restrição já associada' });
      }

      // Criar associação
      const userRestriction = await UserRestriction.create({
        user_id: userId,
        restriction_id
      });

      return res.json({ 
        success: true, 
        message: 'Restrição adicionada',
        data: userRestriction
      });
    } catch (error) {
      logger.error('Erro ao adicionar restrição ao usuário', error);
      return res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },

  async removeRestriction(req, res) {
    try {
      const userId = req.user.id;
      const id = req.params.id;

      // Verificar se a associação existe e pertence ao usuário
      const userRestriction = await UserRestriction.findByPk(id);
      if (!userRestriction) {
        return res.status(404).json({ success: false, error: 'Restrição não encontrada' });
      }

      if (userRestriction.user_id !== userId) {
        return res.status(403).json({ success: false, error: 'Não autorizado' });
      }

      // Remover associação
      await userRestriction.destroy();

      return res.json({ success: true, message: 'Restrição removida' });
    } catch (error) {
      logger.error('Erro ao remover restrição do usuário', error);
      return res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },

  async updateRestrictionKeywords(req, res) {
    try {
      const { keywords } = req.body;
      const id = req.params.id;
      const userId = req.user.id;

      if (!keywords) {
        return res.status(400).json({ success: false, error: 'keywords é obrigatório' });
      }

      // Verificar se a associação existe e pertence ao usuário
      const userRestriction = await UserRestriction.findByPk(id);
      if (!userRestriction) {
        return res.status(404).json({ success: false, error: 'Restrição não encontrada' });
      }

      if (userRestriction.user_id !== userId) {
        return res.status(403).json({ success: false, error: 'Não autorizado' });
      }

      // Atualizar palavras-chave personalizadas
      userRestriction.palavras_chave_personalizadas = Array.isArray(keywords) 
        ? keywords 
        : keywords.split(',').map(k => k.trim()).filter(k => k);
      
      await userRestriction.save();

      return res.json({ success: true, message: 'Palavras-chave atualizadas' });
    } catch (error) {
      logger.error('Erro ao atualizar palavras-chave', error);
      return res.status(500).json({ success: false, message: 'Erro interno' });
    }
  }
};
