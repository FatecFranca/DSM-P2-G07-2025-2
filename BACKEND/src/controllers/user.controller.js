const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Obter perfil do usuário autenticado
 * GET /api/users/profile
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Construir URL completa da foto se existir
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const photoUrl = user.foto_perfil ? `${baseUrl}${user.foto_perfil}` : null;

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          nome_completo: user.nome_completo,
          email: user.email,
          telefone: user.telefone,
          idade: user.idade,
          foto_perfil: photoUrl,
          tem_restricao: user.tem_restricao,
          email_verificado: user.email_verificado,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Erro ao obter perfil', error);

    res.status(500).json({
      success: false,
      message: 'Erro ao obter perfil',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Atualizar perfil do usuário autenticado
 * PUT /api/users/profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nome_completo, telefone, idade } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Preparar dados para atualização
    const updateData = {};
    if (nome_completo !== undefined) updateData.nome_completo = nome_completo;
    if (telefone !== undefined) updateData.telefone = telefone || null;
    if (idade !== undefined) updateData.idade = idade || null;

    // Atualizar usuário
    await user.update(updateData);

    // Construir URL completa da foto se existir
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const photoUrl = user.foto_perfil ? `${baseUrl}${user.foto_perfil}` : null;

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: {
        user: {
          id: user.id,
          nome_completo: user.nome_completo,
          email: user.email,
          telefone: user.telefone,
          idade: user.idade,
          foto_perfil: photoUrl,
          email_verificado: user.email_verificado,
          updated_at: user.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Erro ao atualizar perfil', error);

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

    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Atualizar foto de perfil
 * PUT /api/users/profile/photo
 */
const updateProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);

    if (!user) {
      // Se houver arquivo, deletar
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Se houver foto antiga, deletar
    if (user.foto_perfil) {
      const oldPhotoPath = path.join(
        process.env.UPLOAD_PATH || './uploads',
        path.basename(user.foto_perfil)
      );
      if (fs.existsSync(oldPhotoPath)) {
        try {
          fs.unlinkSync(oldPhotoPath);
        } catch (err) {
          logger.error('Erro ao deletar foto antiga', err);
        }
      }
    }

    // Salvar caminho da nova foto (caminho relativo para acesso via API)
    const photoPath = `/uploads/${req.file.filename}`;
    await user.update({ foto_perfil: photoPath });

    // Recarregar usuário para obter dados atualizados
    await user.reload();

    // Construir URL completa da foto
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const photoUrl = user.foto_perfil ? `${baseUrl}${user.foto_perfil}` : null;

    res.json({
      success: true,
      message: 'Foto de perfil atualizada com sucesso',
      data: {
        user: {
          id: user.id,
          foto_perfil: photoUrl,
          foto_perfil_path: user.foto_perfil
        }
      }
    });
  } catch (error) {
    logger.error('Erro ao atualizar foto de perfil', error);

    // Se houver arquivo, deletar em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        logger.error('Erro ao deletar arquivo após erro', err);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar foto de perfil',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Remover foto de perfil
 * DELETE /api/users/profile/photo
 */
const removeProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Se houver foto, deletar arquivo físico
    if (user.foto_perfil) {
      const oldPhotoPath = path.join(
        process.env.UPLOAD_PATH || './uploads',
        path.basename(user.foto_perfil)
      );
      if (fs.existsSync(oldPhotoPath)) {
        try {
          fs.unlinkSync(oldPhotoPath);
        } catch (err) {
          logger.error('Erro ao deletar foto antiga', err);
        }
      }
    }

    // Remover referência da foto no banco de dados
    await user.update({ foto_perfil: null });
    await user.reload();

    res.json({
      success: true,
      message: 'Foto de perfil removida com sucesso',
      data: {
        user: {
          id: user.id,
          foto_perfil: null
        }
      }
    });
  } catch (error) {
    logger.error('Erro ao remover foto de perfil', error);

    res.status(500).json({
      success: false,
      message: 'Erro ao remover foto de perfil',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateProfilePhoto,
  removeProfilePhoto
};
