const { Model, DataTypes } = require('sequelize');

class UserLevel extends Model {
  static init(sequelize) {
    return super.init({
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
      },
      totalXp: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      xpForNext: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 200
      },
      progress: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      lastUpdatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      sequelize,
      tableName: 'user_levels',
      timestamps: true
    });
  }
}

module.exports = UserLevel;
