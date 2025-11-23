const User = require('../models/User');
const BlacklistedToken = require('../models/BlacklistedToken');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken, generateRefreshToken } = require('../utils/jwt');
const {
  generateResetToken,
  generateExpirationDate,
  isTokenExpired
} = require('../utils/resetToken');
const {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail
} = require('../services/email.service');
const logger = require('../utils/logger');

/**
 * Registro de novo usuário
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    // Log completo do body recebido
    logger.info('Body completo recebido:', JSON.stringify(req.body));
    logger.info('Keys do body:', Object.keys(req.body || {}));
    
    const { nome_completo, email, senha, telefone, idade, tem_restricao } = req.body;

    // Log para debug
    logger.info('Campos extraídos', { 
      nome_completo: !!nome_completo,
      email, 
      senha: !!senha,
      tem_restricao, 
      tipo: typeof tem_restricao,
      valor_bruto: tem_restricao,
      telefone,
      idade
    });

    // Verificar se o email já existe
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Este email já está cadastrado'
      });
    }

    // Hash da senha
    const senha_hash = await hashPassword(senha);

    // Gerar token de verificação de email
    const verificationToken = generateResetToken();
    const expirationDate = generateExpirationDate(24); // Expira em 24 horas

    // Converter tem_restricao para boolean
    // Pode vir como true, 'true', 1, '1', ou false
    let temRestricaoValue = false;
    if (tem_restricao !== undefined && tem_restricao !== null) {
      if (typeof tem_restricao === 'boolean') {
        temRestricaoValue = tem_restricao;
      } else if (typeof tem_restricao === 'string') {
        temRestricaoValue = tem_restricao.toLowerCase() === 'true' || tem_restricao === '1';
      } else if (typeof tem_restricao === 'number') {
        temRestricaoValue = tem_restricao === 1;
      }
    }

    logger.info('tem_restricao processado', { 
      valor_original: tem_restricao,
      valor_processado: temRestricaoValue 
    });

    // Criar usuário
    const user = await User.create({
      nome_completo,
      email,
      senha_hash,
      telefone: telefone || null,
      idade: idade || null,
      tem_restricao: temRestricaoValue,
      token_verificacao_email: verificationToken,
      data_expiracao_token: expirationDate
    });

    logger.info('Usuário criado', { 
      userId: user.id, 
      email: user.email,
      tem_restricao: user.tem_restricao 
    });

    // Enviar emails (não bloqueiam a resposta)
    // Email de boas-vindas
    sendWelcomeEmail(user.email, user.nome_completo).catch(error => {
      logger.error('Erro ao enviar email de boas-vindas no registro', error, { userId: user.id });
    });

    // Email de verificação
    sendVerificationEmail(user.email, verificationToken).catch(error => {
      logger.error('Erro ao enviar email de verificação no registro', error, { userId: user.id });
    });

    // Gerar token JWT
    const token = generateToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    // Retornar dados do usuário e token
    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: {
        user: {
          id: user.id,
          nome_completo: user.nome_completo,
          email: user.email,
          telefone: user.telefone,
          idade: user.idade,
          tem_restricao: user.tem_restricao,
          email_verificado: user.email_verificado,
          created_at: user.created_at
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Erro no registro', error);

    // Erro de validação do Sequelize
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors
      });
    }

    // Erro de constraint única (email duplicado)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Este email já está cadastrado'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao criar usuário',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login de usuário
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Buscar usuário pelo email (incluindo senha_hash)
    const user = await User.scope('withPassword').findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha inválidos'
      });
    }

    // Verificar senha
    const isPasswordValid = await comparePassword(senha, user.senha_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha inválidos'
      });
    }

    // Gerar token JWT
    const token = generateToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    // Retornar dados do usuário e token
    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user: {
          id: user.id,
          nome_completo: user.nome_completo,
          email: user.email,
          telefone: user.telefone,
          idade: user.idade,
          foto_perfil: user.foto_perfil,
          tem_restricao: user.tem_restricao,
          email_verificado: user.email_verificado,
          created_at: user.created_at
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Erro no login', error);

    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Refresh token
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token não fornecido'
      });
    }

    const { verifyToken } = require('../utils/jwt');
    const decoded = verifyToken(refreshToken);

    // Buscar usuário
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Gerar novo token
    const newToken = generateToken({ userId: user.id, email: user.email });
    const newRefreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    res.json({
      success: true,
      message: 'Token renovado com sucesso',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Refresh token inválido ou expirado'
    });
  }
};

/**
 * Solicitação de recuperação de senha
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Buscar usuário pelo email
    const user = await User.findOne({ where: { email } });

    // Por segurança, sempre retornar sucesso mesmo se o email não existir
    // Isso previne enumeração de emails
    if (!user) {
      return res.json({
        success: true,
        message:
          'Se o email estiver cadastrado, você receberá um email com instruções para recuperar sua senha'
      });
    }

    // Gerar token de recuperação
    const resetToken = generateResetToken();
    const expirationDate = generateExpirationDate(1); // Expira em 1 hora

    // Salvar token no banco de dados
    await user.update({
      token_recuperacao_senha: resetToken,
      data_expiracao_token: expirationDate
    });

    // Enviar email com token
    try {
      await sendPasswordResetEmail(user.email, resetToken);
    } catch (emailError) {
      logger.error('Erro ao enviar email de recuperação de senha', emailError);
      // Não falhar a requisição se o email não for enviado
      // Em produção, você pode querer tratar isso de forma diferente
    }

    res.json({
      success: true,
      message:
        'Se o email estiver cadastrado, você receberá um email com instruções para recuperar sua senha'
    });
  } catch (error) {
    logger.error('Erro na solicitação de recuperação de senha', error);

    res.status(500).json({
      success: false,
      message: 'Erro ao processar solicitação de recuperação de senha',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verificação de token de recuperação
 * POST /api/auth/verify-reset-token
 */
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token não fornecido'
      });
    }

    // Buscar usuário pelo token
    const user = await User.findOne({
      where: { token_recuperacao_senha: token }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido'
      });
    }

    // Verificar se o token está expirado
    if (isTokenExpired(user.data_expiracao_token)) {
      // Limpar token expirado
      await user.update({
        token_recuperacao_senha: null,
        data_expiracao_token: null
      });

      return res.status(400).json({
        success: false,
        message: 'Token expirado. Solicite uma nova recuperação de senha'
      });
    }

    res.json({
      success: true,
      message: 'Token válido',
      data: {
        email: user.email
      }
    });
  } catch (error) {
    logger.error('Erro na verificação de token', error);

    res.status(500).json({
      success: false,
      message: 'Erro ao verificar token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Redefinição de senha
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, senha } = req.body;

    if (!token || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Token e nova senha são obrigatórios'
      });
    }

    // Buscar usuário pelo token
    const user = await User.scope('withPassword').findOne({
      where: { token_recuperacao_senha: token }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido'
      });
    }

    // Verificar se o token está expirado
    if (isTokenExpired(user.data_expiracao_token)) {
      // Limpar token expirado
      await user.update({
        token_recuperacao_senha: null,
        data_expiracao_token: null
      });

      return res.status(400).json({
        success: false,
        message: 'Token expirado. Solicite uma nova recuperação de senha'
      });
    }

    // Hash da nova senha
    const senha_hash = await hashPassword(senha);

    // Atualizar senha e invalidar token
    await user.update({
      senha_hash,
      token_recuperacao_senha: null,
      data_expiracao_token: null
    });

    res.json({
      success: true,
      message: 'Senha redefinida com sucesso'
    });
  } catch (error) {
    logger.error('Erro na redefinição de senha', error);

    res.status(500).json({
      success: false,
      message: 'Erro ao redefinir senha',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Envio de email de verificação
 * POST /api/auth/send-verification-email
 */
const sendVerificationEmailHandler = async (req, res) => {
  try {
    const { email } = req.body;

    // Buscar usuário pelo email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Por segurança, sempre retornar sucesso mesmo se o email não existir
      return res.json({
        success: true,
        message:
          'Se o email estiver cadastrado, você receberá um email com instruções para verificar sua conta'
      });
    }

    // Verificar se o email já está verificado
    if (user.email_verificado) {
      return res.json({
        success: true,
        message: 'Este email já está verificado'
      });
    }

    // Gerar token de verificação
    const verificationToken = generateResetToken();
    const expirationDate = generateExpirationDate(24); // Expira em 24 horas

    // Salvar token no banco de dados
    await user.update({
      token_verificacao_email: verificationToken,
      data_expiracao_token: expirationDate
    });

    // Enviar email com token
    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (emailError) {
      logger.error('Erro ao enviar email de recuperação de senha', emailError);
      // Não falhar a requisição se o email não for enviado
    }

    res.json({
      success: true,
      message:
        'Se o email estiver cadastrado, você receberá um email com instruções para verificar sua conta'
    });
  } catch (error) {
    logger.error('Erro no envio de email de verificação', error);

    res.status(500).json({
      success: false,
      message: 'Erro ao enviar email de verificação',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verificação de email
 * POST /api/auth/verify-email
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token não fornecido'
      });
    }

    // Buscar usuário pelo token de verificação
    const user = await User.findOne({
      where: { token_verificacao_email: token }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido'
      });
    }

    // Verificar se o email já está verificado
    if (user.email_verificado) {
      // Limpar token mesmo se já estiver verificado
      await user.update({
        token_verificacao_email: null,
        data_expiracao_token: null
      });

      return res.json({
        success: true,
        message: 'Este email já estava verificado'
      });
    }

    // Verificar se o token está expirado
    if (isTokenExpired(user.data_expiracao_token)) {
      // Limpar token expirado
      await user.update({
        token_verificacao_email: null,
        data_expiracao_token: null
      });

      return res.status(400).json({
        success: false,
        message: 'Token expirado. Solicite um novo email de verificação'
      });
    }

    // Marcar email como verificado e limpar token
    await user.update({
      email_verificado: true,
      token_verificacao_email: null,
      data_expiracao_token: null
    });

    res.json({
      success: true,
      message: 'Email verificado com sucesso',
      data: {
        email: user.email,
        email_verificado: true
      }
    });
  } catch (error) {
    logger.error('Erro na verificação de email', error);

    res.status(500).json({
      success: false,
      message: 'Erro ao verificar email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const logout = async (req, res) => {
  try {
    // Pega token do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(400).json({ success: false, message: 'Token não fornecido' });
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer')
      return res.status(400).json({ success: false, message: 'Formato inválido' });
    const token = parts[1];

    // calcula expiração (opcional: decode para pegar exp)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    let expiresAt = null;
    if (decoded && decoded.exp) {
      expiresAt = new Date(decoded.exp * 1000);
    }

    await BlacklistedToken.create({
      token_hash: require('crypto').createHash('sha256').update(token).digest('hex'),
      expires_at: expiresAt
    });

    return res.status(204).send();
  } catch (err) {
    logger.error('Erro no logout', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  sendVerificationEmailHandler,
  verifyEmail,
  logout
};
