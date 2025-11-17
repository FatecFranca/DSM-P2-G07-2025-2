const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RecipeRating = sequelize.define(
  'RecipeRating',
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
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'A avaliação deve ser no mínimo 1'
        },
        max: {
          args: [5],
          msg: 'A avaliação deve ser no máximo 5'
        }
      }
    },
    comentario: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'recipe_ratings',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['recipe_id', 'user_id']
      }
    ]
  }
);

module.exports = RecipeRating;

