const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BlacklistedToken = sequelize.define(
  'BlacklistedToken',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    token_hash: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    expires_at: { type: DataTypes.DATE, allowNull: true }
  },
  {
    tableName: 'blacklisted_tokens',
    timestamps: true,
    underscored: true
  }
);

module.exports = BlacklistedToken;
