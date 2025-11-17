const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserRestriction = sequelize.define(
  'UserRestriction',
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
    restriction_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'restrictions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    palavras_chave_personalizadas: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('palavras_chave_personalizadas');
        if (!value) return [];
        try {
          return JSON.parse(value);
        } catch {
          return value.split(',').map((s) => s.trim());
        }
      },
      set(value) {
        if (Array.isArray(value)) {
          this.setDataValue('palavras_chave_personalizadas', JSON.stringify(value));
        } else {
          this.setDataValue('palavras_chave_personalizadas', value);
        }
      }
    }
  },
  {
    tableName: 'user_restrictions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'restriction_id']
      }
    ]
  }
);

module.exports = UserRestriction;

