import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class UserRoles extends Model {
  static init(sequelize, DataTypes) {
  return super.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'roles',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'user_roles',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "userId",
        using: "BTREE",
        fields: [
          { name: "userId" },
        ]
      },
      {
        name: "roleId",
        using: "BTREE",
        fields: [
          { name: "roleId" },
        ]
      },
    ]
  });
  }
}
