const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RecipeFavorite = sequelize.define(
  'RecipeFavorite',
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
    }
  },
  {
    tableName: 'recipe_favorites',
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

module.exports = RecipeFavorite;

