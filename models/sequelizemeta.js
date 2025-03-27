const { Model, DataTypes } = require('sequelize');

class Sequelizemeta extends Model {
  static init(sequelize) {
    return super.init({
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        primaryKey: true
      }
    }, {
      sequelize,
      tableName: 'sequelizemeta',
      timestamps: false,
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "name" }]
        },
        {
          name: "name",
          unique: true,
          using: "BTREE",
          fields: [{ name: "name" }]
        }
      ]
    });
  }
}

module.exports = Sequelizemeta;
