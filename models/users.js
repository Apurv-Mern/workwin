const { Model, DataTypes } = require('sequelize');

class Users extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      totalUserXp: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: 0
      },
      curr_levels: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1
      },
      userCode: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
      }
    }, {
      sequelize,
      tableName: 'users',
      timestamps: true,
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "id" }]
        },
        {
          name: "email",
          unique: true,
          using: "BTREE",
          fields: [{ name: "email" }]
        }
      ]
    });
  }
}

module.exports = Users;
