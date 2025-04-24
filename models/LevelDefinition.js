const { Model, DataTypes } = require('sequelize');

class LevelDefinition extends Model {
  static init(sequelize) {
    return super.init({
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
      },
      xpRequired: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      reward: {
        type: DataTypes.STRING,
        allowNull: true
      }
    }, {
      sequelize,
      tableName: 'level_definitions',
      timestamps: true
    });
  }
}

module.exports = LevelDefinition;