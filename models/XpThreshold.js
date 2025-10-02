const { DataTypes, Model, Op } = require('sequelize');

class XpThreshold extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            game_name: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    len: [1, 255]
                }
            },
            game_type: {
                type: DataTypes.ENUM('spin_wheel', 'quiz', 'daily_challenge', 'achievement', 'custom', 'app_login', 'new_registration'),
                allowNull: false
            },
            min_xp_required: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: 0
                }
            },
            level_required: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: 1
                }
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            unlock_message: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            lock_message: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            icon_url: {
                type: DataTypes.STRING,
                allowNull: true
            },
            sort_order: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            requires_consecutive_days: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: 1
                }
            },
            additional_requirements: {
                type: DataTypes.TEXT,
                allowNull: true,
                get() {
                    const rawValue = this.getDataValue('additional_requirements');
                    return rawValue ? JSON.parse(rawValue) : null;
                },
                set(value) {
                    this.setDataValue('additional_requirements', value ? JSON.stringify(value) : null);
                }
            },
            reward_on_unlock: {
                type: DataTypes.TEXT,
                allowNull: true,
                get() {
                    const rawValue = this.getDataValue('reward_on_unlock');
                    return rawValue ? JSON.parse(rawValue) : null;
                },
                set(value) {
                    this.setDataValue('reward_on_unlock', value ? JSON.stringify(value) : null);
                }
            },
            cooldown_hours: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: 0
                }
            },
            max_plays_per_day: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: 1
                }
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
            tableName: 'xp_thresholds',
            timestamps: false,
            hooks: {
                beforeUpdate: (instance) => {
                    instance.updated_at = new Date();
                }
            }
        });
    }

    // Instance methods
    isUnlockedForUser(userXp, userLevel = null) {
        if (!this.is_active) return false;

        // Check XP requirement
        if (userXp < this.min_xp_required) return false;

        // Check level requirement if specified
        if (this.level_required && userLevel && userLevel < this.level_required) {
            return false;
        }

        return true;
    }

    // Static methods
    static async getActiveThresholds() {
        return await this.findAll({
            where: { is_active: true },
            order: [['sort_order', 'ASC'], ['min_xp_required', 'ASC']]
        });
    }

    static async getUnlockedGamesForUser(userXp, userLevel = null) {
        const thresholds = await this.getActiveThresholds();
        return thresholds.filter(threshold =>
            threshold.isUnlockedForUser(userXp, userLevel)
        );
    }

    static async getLockedGamesForUser(userXp, userLevel = null) {
        const thresholds = await this.getActiveThresholds();
        return thresholds.filter(threshold =>
            !threshold.isUnlockedForUser(userXp, userLevel)
        );
    }

    static async getGamesByType(gameType) {
        return await this.findAll({
            where: {
                game_type: gameType,
                is_active: true
            },
            order: [['sort_order', 'ASC']]
        });
    }

    static async getNextUnlockTarget(userXp, userLevel = null) {
        const lockedGames = await this.getLockedGamesForUser(userXp, userLevel);
        if (lockedGames.length === 0) return null;

        // Find the game with the lowest XP requirement that's still locked
        return lockedGames.reduce((closest, current) => {
            if (!closest) return current;
            if (current.min_xp_required < closest.min_xp_required) {
                return current;
            }
            return closest;
        }, null);
    }
}

module.exports = XpThreshold;