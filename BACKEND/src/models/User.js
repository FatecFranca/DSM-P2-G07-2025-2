const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome_completo: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'O nome completo é obrigatório'
        },
        len: {
          args: [2, 255],
          msg: 'O nome deve ter entre 2 e 255 caracteres'
        }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        name: 'email',
        msg: 'Este email já está cadastrado'
      },
      validate: {
        isEmail: {
          msg: 'Email inválido'
        },
        notEmpty: {
          msg: 'O email é obrigatório'
        }
      }
    },
    senha_hash: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'A senha é obrigatória'
        }
      }
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: {
          args: [0, 20],
          msg: 'O telefone deve ter no máximo 20 caracteres'
        }
      }
    },
    idade: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: {
          args: [0],
          msg: 'A idade deve ser um número positivo'
        },
        max: {
          args: [150],
          msg: 'A idade deve ser um número válido'
        }
      }
    },
    foto_perfil: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email_verificado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    token_verificacao_email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    token_recuperacao_senha: {
      type: DataTypes.STRING,
      allowNull: true
    },
    data_expiracao_token: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    defaultScope: {
      attributes: { exclude: ['senha_hash', 'token_verificacao_email', 'token_recuperacao_senha'] }
    },
    scopes: {
      withPassword: {
        attributes: { include: ['senha_hash'] }
      }
    }
  }
);

module.exports = User;

