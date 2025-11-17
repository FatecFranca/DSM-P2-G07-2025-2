const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Recipe = sequelize.define(
  'Recipe',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'O nome da receita é obrigatório'
        }
      }
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ingredientes: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Os ingredientes são obrigatórios'
        }
      },
      get() {
        const value = this.getDataValue('ingredientes');
        if (!value) return [];
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      },
      set(value) {
        if (Array.isArray(value)) {
          this.setDataValue('ingredientes', JSON.stringify(value));
        } else {
          this.setDataValue('ingredientes', value);
        }
      }
    },
    modo_preparo: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'O modo de preparo é obrigatório'
        }
      }
    },
    tempo_preparo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    rendimento: {
      type: DataTypes.STRING,
      allowNull: true
    },
    propriedades: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('propriedades');
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      },
      set(value) {
        if (typeof value === 'object' && value !== null) {
          this.setDataValue('propriedades', JSON.stringify(value));
        } else {
          this.setDataValue('propriedades', value);
        }
      }
    },
    imagem_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'rascunho',
      validate: {
        isIn: {
          args: [['publicada', 'rascunho']],
          msg: 'Status deve ser "publicada" ou "rascunho"'
        }
      }
    },
    visualizacoes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Visualizações não pode ser negativo'
        }
      }
    }
  },
  {
    tableName: 'recipes',
    timestamps: true,
    underscored: true
  }
);

module.exports = Recipe;

