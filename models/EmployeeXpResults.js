const { Model, DataTypes } = require('sequelize');

class EmployeeXpResults extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                autoIncrement: true,
                type: DataTypes.BIGINT,
                allowNull: false,
                primaryKey: true
            },
            person_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            firstname: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            surname: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            full_name: {
                type: DataTypes.STRING(200),
                allowNull: true
            },
            location: {
                type: DataTypes.STRING(200),
                allowNull: true
            },
            client: {
                type: DataTypes.STRING(200),
                allowNull: true
            },
            total_xp: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            total_days_present: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            total_hours: {
                type: DataTypes.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            // Daily attendance flags
            sunday_present: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            monday_present: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            tuesday_present: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            wednesday_present: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            thursday_present: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            friday_present: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            saturday_present: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            // Daily hours
            sunday_hours: {
                type: DataTypes.DECIMAL(4, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            monday_hours: {
                type: DataTypes.DECIMAL(4, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            tuesday_hours: {
                type: DataTypes.DECIMAL(4, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            wednesday_hours: {
                type: DataTypes.DECIMAL(4, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            thursday_hours: {
                type: DataTypes.DECIMAL(4, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            friday_hours: {
                type: DataTypes.DECIMAL(4, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            saturday_hours: {
                type: DataTypes.DECIMAL(4, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            // Metadata
            upload_date: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            week_start_date: {
                type: DataTypes.DATEONLY,
                allowNull: true
            },
            week_end_date: {
                type: DataTypes.DATEONLY,
                allowNull: true
            },
            current_streak: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            max_streak: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            multiplier: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1
            },
            emp_code: {
                type: DataTypes.STRING(50),
                allowNull: true
            },
            email: {
                type: DataTypes.STRING(150),
                allowNull: true,
            },
            uploaded_by: {
                type: DataTypes.INTEGER,
                allowNull: true
            }
        }, {
            sequelize,
            tableName: 'employee_xp_results',
            timestamps: false, // Since you're using custom upload_date
            indexes: [
                {
                    fields: ['person_id']
                },
                {
                    fields: ['upload_date']
                },
                {
                    fields: ['total_xp']
                }
            ]
        });
    }
}

module.exports = EmployeeXpResults;
