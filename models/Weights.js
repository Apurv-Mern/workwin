const { Model, DataTypes } = require("sequelize");

class Weights extends Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        attendance: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
        },
        punctuality: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
        },
        shift_completion: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
        },
        consistency: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        tableName: "weights",
        timestamps: true,
      }
    );
  }
}

module.exports = Weights;
