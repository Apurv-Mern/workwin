import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class RolePermissions extends Model {
  static init(sequelize, DataTypes) {
  return super.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'roles',
        key: 'id'
      }
    },
    permissionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'permissions',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'role_permissions',
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
        name: "roleId",
        using: "BTREE",
        fields: [
          { name: "roleId" },
        ]
      },
      {
        name: "permissionId",
        using: "BTREE",
        fields: [
          { name: "permissionId" },
        ]
      },
    ]
  });
  }
}
