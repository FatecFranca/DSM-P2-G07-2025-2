const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Restriction = sequelize.define(
  'Restriction',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'O nome da restrição é obrigatório'
        }
      }
    },
    categoria: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'A categoria é obrigatória'
        }
      }
    },
    palavras_chave: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('palavras_chave');
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value !== 'string') return [];
        try {
          return JSON.parse(value);
        } catch {
          return value.split(',').map((s) => s.trim()).filter(s => s);
        }
      },
      set(value) {
        if (Array.isArray(value)) {
          this.setDataValue('palavras_chave', JSON.stringify(value));
        } else {
          this.setDataValue('palavras_chave', value);
        }
      }
    }
  },
  {
    tableName: 'restrictions',
    timestamps: true,
    underscored: true
  }
);

module.exports = Restriction;

