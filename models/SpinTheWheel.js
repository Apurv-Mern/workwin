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
            type: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            // reward_images: {
            //     type: DataTypes.TEXT,
            //     allowNull: true,
            //     get() {
            //         const rawValue = this.getDataValue('reward_images');
            //         console.log('Raw reward_images from DB:', rawValue);
            //         return rawValue ? `https://localhost:3008/${JSON.parse(rawValue)}` : [];
            //     },
            //     set(value) {
            //         this.setDataValue('reward_images', JSON.stringify(value || []));
            //     }
            // },
            reward_images: {
                type: DataTypes.TEXT,
                allowNull: true,
                get() {
                    const rawValue = this.getDataValue('reward_images');
                    if (!rawValue) {
                        return [];
                    }

                    try {
                        // Parse the JSON string from database
                        let parsed = JSON.parse(rawValue);

                        // Ensure it's an array
                        if (!Array.isArray(parsed)) {
                            parsed = [parsed];
                        }

                        // Convert relative paths to full URLs, but keep empty strings as null
                        return parsed.map(imagePath => {
                            if (!imagePath || imagePath.trim() === '') {
                                return null;
                            }
                            return imagePath.startsWith('http')
                                ? imagePath
                                : `https://workwin.24livehost.com:3025${imagePath}`;
                        });

                    } catch (error) {
                        console.error('Error parsing reward_images:', error, 'Raw value:', rawValue);
                        return [];
                    }
                },
                set(value) {
                    console.log('SpinTheWheel reward_images setter called with:', value);
                    if (!value || (Array.isArray(value) && value.length === 0)) {
                        console.log('Setting reward_images to null (empty)');
                        this.setDataValue('reward_images', null);
                    } else {
                        // Store as JSON string in database
                        const arrayValue = Array.isArray(value) ? value : [value];
                        const jsonString = JSON.stringify(arrayValue);
                        console.log('Setting reward_images to:', jsonString);
                        this.setDataValue('reward_images', jsonString);
                    }
                }
            }
            ,
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
