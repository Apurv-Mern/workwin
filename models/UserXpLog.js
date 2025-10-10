const { Model, DataTypes } = require('sequelize');

class UserXpLog extends Model {
  static init(sequelize) {
    return super.init({
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      season_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
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
      score: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      highscore: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true
      },
      reward_type: {
        type: DataTypes.STRING,
        allowNull: true
      },
      reward_value: {
        type: DataTypes.STRING,
        allowNull: true
      },
      rewardImageUrl: {
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