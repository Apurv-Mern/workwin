const cron = require('node-cron');
const { Users, EmployeeXpResults, UserLevel, UserXpLog, sequelize } = require('../models'); // Adjust path
const { Op } = require('sequelize');

class GameResetCron {

    static initialize() {
        console.log('🕐 Initializing Game Reset Cron Job...');

        // Schedule for January 5, 2026 at 2:00 AM IST
        cron.schedule('0 2 5 1 *', async () => {
            await GameResetCron.executeReset();
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata"
        });

        console.log('✅ Game Reset scheduled for January 5, 2026 at 2:00 AM IST');
    }

    static async executeReset() {
        const transaction = await sequelize.transaction();

        try {
            console.log('🚨 GAME RESET STARTED - ' + new Date().toISOString());
            const currentYear = new Date().getFullYear();
            if (currentYear !== 2026) {
                console.log(`⚠️ Wrong year: ${currentYear}. Reset only scheduled for 2026.`);
                return;
            }

            console.log('🗑️ Deleting employee_xp_results...');
            await EmployeeXpResults.destroy({
                where: {},
                truncate: true,
                transaction
            });

            console.log('🗑️ Deleting user_levels...');
            await UserLevel.destroy({
                where: {},
                truncate: true,
                transaction
            });

            console.log('🗑️ Deleting user_xp_logs...');
            await UserXpLog.destroy({
                where: {},
                truncate: true,
                transaction
            });

            console.log('🔄 Resetting user XP and levels...');
            await Users.update(
                {
                    totalUserXp: 0,
                    curr_levels: 1,
                    updated_at: new Date()
                },
                {
                    where: {},
                    transaction
                }
            );

            await transaction.commit();

            console.log('✅ GAME RESET COMPLETED SUCCESSFULLY - ' + new Date().toISOString());

            GameResetCron.sendNotification();

        } catch (error) {
            await transaction.rollback();
            console.error('❌ GAME RESET FAILED:', error);

            GameResetCron.sendErrorNotification(error.message);
        }
    }

    // static async sendNotification() {
    //     // Optional: Send email notification
    //     console.log('📧 Game reset notification sent');
    // }

    // static async sendErrorNotification(errorMessage) {
    //     // Optional: Send error email notification
    //     console.error('📧 Game reset error notification:', errorMessage);
    // }
}

module.exports = GameResetCron;
