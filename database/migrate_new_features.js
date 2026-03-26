const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config({ path: 'c:/Users/dell/Desktop/LocalLink/locallink/.env' });

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected. Running feature migrations...');

        // 1. Provider Availability Table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS provider_availability (
                id INT AUTO_INCREMENT PRIMARY KEY,
                provider_id INT NOT NULL,
                date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                slot_duration INT NOT NULL DEFAULT 60,
                max_slots INT NOT NULL DEFAULT 1,
                is_available TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
                UNIQUE KEY unique_slot (provider_id, date, start_time)
            )
        `);
        console.log('✅ provider_availability table created/exists');

        // 2. Payments Table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id INT NOT NULL,
                user_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(10) NOT NULL DEFAULT 'INR',
                status ENUM('pending','processing','success','failed','refunded') NOT NULL DEFAULT 'pending',
                payment_method ENUM('card','upi','netbanking','wallet') NOT NULL DEFAULT 'card',
                transaction_id VARCHAR(100) UNIQUE,
                card_last4 VARCHAR(4),
                upi_id VARCHAR(100),
                gateway_response TEXT,
                paid_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ payments table created/exists');

        // 3. Loyalty Points Table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS loyalty_points (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                total_points INT NOT NULL DEFAULT 0,
                lifetime_points INT NOT NULL DEFAULT 0,
                tier ENUM('bronze','silver','gold','platinum') NOT NULL DEFAULT 'bronze',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ loyalty_points table created/exists');

        // 4. Loyalty Transactions Table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS loyalty_transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                points INT NOT NULL,
                type ENUM('earned','redeemed','bonus','expired') NOT NULL DEFAULT 'earned',
                description VARCHAR(255),
                booking_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ loyalty_transactions table created/exists');

        // 5. Notifications Table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                type ENUM('booking','payment','queue','loyalty','system') NOT NULL DEFAULT 'system',
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ notifications table created/exists');

        // 6. Add payment_status column to bookings if not exists
        try {
            await connection.execute(`ALTER TABLE bookings ADD COLUMN payment_status ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid'`);
            console.log('✅ payment_status column added to bookings');
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') throw e;
            console.log('ℹ️  payment_status column already exists');
        }

        // 7. Seed loyalty points rows for existing users
        await connection.execute(`
            INSERT IGNORE INTO loyalty_points (user_id, total_points, lifetime_points, tier)
            SELECT id, 0, 0, 'bronze' FROM users WHERE role = 'customer'
        `);
        console.log('✅ Loyalty rows seeded for existing customers');

        // 8. Seed some provider availability for the next 7 days
        const [providers] = await connection.execute('SELECT id FROM providers LIMIT 5');
        for (const p of providers) {
            for (let d = 1; d <= 7; d++) {
                const date = new Date();
                date.setDate(date.getDate() + d);
                const dateStr = date.toISOString().split('T')[0];
                const slots = [
                    { start: '09:00:00', end: '10:00:00' },
                    { start: '10:00:00', end: '11:00:00' },
                    { start: '11:00:00', end: '12:00:00' },
                    { start: '14:00:00', end: '15:00:00' },
                    { start: '15:00:00', end: '16:00:00' },
                    { start: '16:00:00', end: '17:00:00' },
                ];
                for (const slot of slots) {
                    await connection.execute(
                        `INSERT IGNORE INTO provider_availability (provider_id, date, start_time, end_time, slot_duration, max_slots, is_available)
                         VALUES (?, ?, ?, ?, 60, 1, 1)`,
                        [p.id, dateStr, slot.start, slot.end]
                    );
                }
            }
        }
        console.log('✅ Availability slots seeded for 5 providers (next 7 days)');

        console.log('\n🎉 All migrations completed successfully!');
    } catch (error) {
        console.error('Migration Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
