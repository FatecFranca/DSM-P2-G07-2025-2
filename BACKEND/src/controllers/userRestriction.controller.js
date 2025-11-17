const Restriction = require('../models/Restriction');
const UserRestriction = require('../models/UserRestriction');

module.exports = {
  async getUserRestrictions(req, res) {
    const userId = req.user.id;

    const restrictions = await UserRestriction.getByUserId(userId);
    return res.json(restrictions);
  },

  async addRestriction(req, res) {
    const userId = req.user.id;
    const { restriction_id } = req.body;

    if (!restriction_id) return res.status(400).json({ error: 'restriction_id é obrigatório' });

    const exists = await Restriction.getById(restriction_id);
    if (!exists) return res.status(404).json({ error: 'Restrição não encontrada' });

    const already = await UserRestriction.find(userId, restriction_id);
    if (already) return res.status(409).json({ error: 'Restrição já associada' });

    await UserRestriction.add(userId, restriction_id);
    return res.json({ message: 'Restrição adicionada' });
  },

  async removeRestriction(req, res) {
    const userId = req.user.id;
    const id = req.params.id;

    await UserRestriction.remove(userId, id);
    return res.json({ message: 'Restrição removida' });
  },

  async updateRestrictionKeywords(req, res) {
    const { keywords } = req.body;
    const id = req.params.id;

    if (!keywords) return res.status(400).json({ error: 'keywords é obrigatório' });

    await Restriction.updateKeywords(id, keywords);

    return res.json({ message: 'Palavras-chave atualizadas' });
  }
};
