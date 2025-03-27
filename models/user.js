module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define("User", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: DataTypes.STRING,
      email: { type: DataTypes.STRING, unique: true },
      password: DataTypes.STRING,
      status: { type: DataTypes.ENUM("active", "inactive"), defaultValue: "active" }
    });
  
    User.associate = models => {
      User.belongsToMany(models.Role, { through: 'user_roles', foreignKey: 'userId' });
    };
  
    return User;
  };
  