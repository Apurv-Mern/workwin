const { Model, DataTypes } = require('sequelize');

class UserAttribute extends Model {
  static init(sequelize) {
    return super.init({
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      attendance: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      punctuality: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      communication: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      cooperation: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      ownership: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      }
    }, {
      sequelize,
      tableName: 'user_attributes',
      timestamps: true
    });
  }
}

module.exports = UserAttribute;
