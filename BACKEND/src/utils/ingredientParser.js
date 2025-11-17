const Restriction = require('../models/Restriction');
const normalize = s => {
  if (!s) return '';
  return s
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const removeQty = line => {
  return line
    .replace(/^\s*\d+([.,]\d+)?\s*(g|kg|ml|l|xicaras?|colheres?|colher|unidades?)?(\s+de)?\s*/i, '')
    .trim();
};

const extractIngredients = textOrArray => {
  if (!textOrArray) return [];

  if (Array.isArray(textOrArray)) {
    return textOrArray.map(i => normalize(removeQty(i)));
  }
  const lines = textOrArray
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  return lines.map(l => normalize(removeQty(l)));
};

const identifyRestrictionsFromIngredients = async ingredients => {
  const all = await Restriction.findAll();
  const results = [];
  const normalizedIngredients = ingredients.map(i => normalize(i));
  for (const r of all) {
    const kws = r.palavras_chave && Array.isArray(r.palavras_chave) ? r.palavras_chave : [];
    const kwsNormalized = kws.map(k => normalize(k));
    for (const ing of normalizedIngredients) {
      for (const kw of kwsNormalized) {
        if (!kw) continue;
        if (ing.includes(kw) || kw.includes(ing)) {
          results.push({
            restrictionId: r.id,
            restrictionName: r.nome,
            ingrediente: ing,
            matchedKeyword: kw
          });
        }
      }
    }
  }
  const seen = new Set();
  const uniq = results.filter(x => {
    const key = `${x.restrictionId}::${x.ingrediente}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return uniq;
};

module.exports = {
  normalize,
  removeQty,
  extractIngredients,
  identifyRestrictionsFromIngredients
};
