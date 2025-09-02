const { Model, DataTypes } = require('sequelize');

class Rewards extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                autoIncrement: true,
                type: DataTypes.INTEGER,
                allowNull: false,
                primaryKey: true
            },
            winner_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            description: {
                type: DataTypes.STRING,
                allowNull: true
            },
            reward_state: {
                type: DataTypes.ENUM('current', 'upcoming'),
                allowNull: false,
                defaultValue: 'current'
            },
            filename: {
                type: DataTypes.STRING,
                allowNull: false
            },
            expiresAt: {
                type: DataTypes.DATE,
                allowNull: true
            }
        }, {
            sequelize,
            tableName: 'rewards',
            timestamps: true,
        });
    }
}

module.exports = Rewards;
