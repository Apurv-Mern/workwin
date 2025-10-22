const { DataTypes, Model } = require('sequelize');

class BonusSeason extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [1, 255]
                }
            },
            employer_code: {
                type: DataTypes.STRING,
                allowNull: true
            },
            season_type: {
                type: DataTypes.ENUM('easter', 'christmas', 'summer', 'winter', 'custom'),
                allowNull: true
            },
            duration_months: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 1,
                validate: {
                    min: 1,
                    max: 12
                }
            },

            start_date: {
                type: DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: true
                }
            },
            end_date: {
                type: DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: true,
                    isAfterStartDate(value) {
                        if (this.start_date && value <= this.start_date) {
                            throw new Error('End date must be after start date');
                        }
                    }
                }
            },
            bonus_multiplier: {
                type: DataTypes.DECIMAL(4, 2),
                allowNull: false,
                defaultValue: 1.00,
                validate: {
                    min: 0.01,
                    max: 99.99
                }
            },
            bonus_type: {
                type: DataTypes.ENUM('percentage', 'fixed_amount'),
                allowNull: false,
                defaultValue: 'percentage'
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
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
            tableName: 'bonus_seasons',
            timestamps: false,
            hooks: {
                beforeUpdate: (instance) => {
                    instance.updated_at = new Date();
                }
            }
        });
    }

    // Instance methods
    isCurrentlyActive() {
        const now = new Date();
        return this.is_active &&
            this.start_date <= now &&
            this.end_date >= now;
    }

    // Static methods
    static async getActiveSeason(employerCode = null) {
        const now = new Date();
        const where = {
            is_active: true,
            start_date: { [require('sequelize').Op.lte]: now },
            end_date: { [require('sequelize').Op.gte]: now }
        };
        if (employerCode) {
            where.employer_code = employerCode;
        }
        return await this.findOne({ where });
    }

    static async getUpcomingSeasons() {
        const now = new Date();
        return await this.findAll({
            where: {
                is_active: true,
                start_date: { [require('sequelize').Op.gt]: now }
            },
            order: [['start_date', 'ASC']]
        });
    }
}

module.exports = BonusSeason;