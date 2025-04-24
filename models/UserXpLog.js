const { Model, DataTypes } = require('sequelize');

class UserXpLog extends Model {
  static init(sequelize) {
    return super.init({
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      source: {
        type: DataTypes.ENUM('attribute', 'game', 'manual'),
        allowNull: false
      },
      type: {
        type: DataTypes.STRING,
        allowNull: true
      },
      xp: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true
      }
    }, {
      sequelize,
      tableName: 'user_xp_logs',
      timestamps: true
    });
  }
}

module.exports = UserXpLog;