const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RecipeRestriction = sequelize.define(
  'RecipeRestriction',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    recipe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'recipes',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    restriction_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'restrictions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    ingrediente_restritivo: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'O ingrediente restritivo é obrigatório'
        }
      }
    },
    palavras_chave: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('palavras_chave');
        if (!value) return [];
        try {
          return JSON.parse(value);
        } catch {
          return value.split(',').map((s) => s.trim());
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
    tableName: 'recipe_restrictions',
    timestamps: true,
    underscored: true
  }
);

module.exports = RecipeRestriction;

