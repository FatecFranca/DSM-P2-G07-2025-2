/**
 * Modelo OTIMIZADO de RecipeRestriction
 * 
 * MUDANÇAS:
 * - Adicionado restriction_id (FK para restrictions)
 * - Removido palavras_chave (agora vem de restrictions)
 * - Mantido ingrediente_restritivo (para casos específicos não catalogados)
 * 
 * ATENÇÃO: Este é um modelo de referência. 
 * Substitua o RecipeRestriction.js atual após executar as migrações.
 */

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
      allowNull: true, // Nullable para permitir ingredientes não catalogados
      references: {
        model: 'restrictions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'FK para restrictions. Null se for ingrediente não catalogado.'
    },
    ingrediente_restritivo: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'O ingrediente restritivo é obrigatório'
        }
      },
      comment: 'Ingrediente específico que causa restrição. Pode ser genérico ou específico.'
    }
  },
  {
    tableName: 'recipe_restrictions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // A tabela não tem updated_at
    underscored: true,
    indexes: [
      {
        unique: false,
        fields: ['recipe_id', 'restriction_id'],
        name: 'idx_recipe_restrictions_recipe_restriction'
      },
      {
        fields: ['restriction_id'],
        name: 'idx_recipe_restrictions_restriction_id'
      }
    ]
  }
);

module.exports = RecipeRestriction;

