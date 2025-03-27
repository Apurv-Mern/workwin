const { Model, DataTypes } = require('sequelize');

class Session extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      token: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    }, {
      sequelize,
      tableName: 'sessions',
      timestamps: true,
      uniqueKeys: {
        unique_userId: {
          fields: ['userId']
        }
      }
    });
  }
}

module.exports = Session;
