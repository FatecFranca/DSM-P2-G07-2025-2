const crypto = require('crypto');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const BlacklistedToken = require('../models/BlacklistedToken');

const isTokenBlacklisted = async token => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return BlacklistedToken.findOne({ where: { token_hash: tokenHash } });
};

/**
 * Middleware de autenticação JWT
 * Verifica se o token é válido e adiciona o usuário à requisição
 */
const authenticate = async (req, res, next) => {
  try {
    // Obter token do header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação não fornecido'
      });
    }

    // Formato esperado: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Formato de token inválido. Use: Bearer <token>'
      });
    }

    const token = parts[1];

    // Verificar se token foi invalidado (logout)
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token invalidado. Faça login novamente.'
      });
    }

    // Verificar e decodificar token
    const decoded = verifyToken(token);

    // Buscar usuário no banco de dados
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Adicionar usuário à requisição
    req.user = {
      id: user.id,
      email: user.email,
      nome_completo: user.nome_completo
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Token inválido ou expirado'
    });
  }
};

/**
 * Middleware opcional de autenticação
 * Não retorna erro se o token não for fornecido, apenas adiciona o usuário se válido
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1];
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return next();
    }

    const decoded = verifyToken(token);
    const user = await User.findByPk(decoded.userId);

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        nome_completo: user.nome_completo
      };
    }

    next();
  } catch (error) {
    next();
  }
};
module.exports = {
  authenticate,
  optionalAuth
};
