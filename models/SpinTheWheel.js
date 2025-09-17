// models/WheelConfiguration.js
const { DataTypes, Model } = require('sequelize');

class SpinTheWheel extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            number_of_sections: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: 2,
                    max: 20
                }
            },
            sections: {
                type: DataTypes.TEXT,
                allowNull: false,
                comment: 'JSON array of section configurations'
            },
            total_xp_pool: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            is_big: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            created_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            },
            updated_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            }
        }, {
            sequelize,
            tableName: 'spin_the_wheel',
            timestamps: false,
        });
    }
}

module.exports = SpinTheWheel;
