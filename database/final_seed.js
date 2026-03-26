const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config({ path: 'c:/Users/dell/Desktop/LocalLink/locallink/.env' });

async function finalSeed() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database. Starting final seed...');

        // Clear tables
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        await connection.execute('TRUNCATE TABLE queue_tokens');
        await connection.execute('TRUNCATE TABLE bookings');
        await connection.execute('TRUNCATE TABLE services');
        await connection.execute('TRUNCATE TABLE reviews');
        await connection.execute('TRUNCATE TABLE providers');
        await connection.execute('TRUNCATE TABLE users');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        // 1. Insert 5 Specific Users (Customers)
        const customers = [
            { name: 'Harshad Gupta', email: 'harshad@gmail.com' },
            { name: 'Soham Kumar', email: 'soham@gmail.com' },
            { name: 'Faiz Ahmed', email: 'faiz@gmail.com' },
            { name: 'Suhani Shah', email: 'suhani@gmail.com' },
            { name: 'Mallika Singh', email: 'mallika@gmail.com' }
        ];

        for (const c of customers) {
            await connection.execute(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                [c.name, c.email, hashedPassword, 'customer']
            );
        }
        console.log('5 Customer users seeded.');

        // 2. Insert 20 Provider Users (ram@gmail.com, sham@gmail.com...)
        const providerNames = ['Ram', 'Sham', 'Gopal', 'Madhav', 'Keshav', 'Arjun', 'Bheem', 'Nakul', 'Sahdev', 'Karan', 'Vikram', 'Aditya', 'Rohan', 'Sunil', 'Vijay', 'Rahul', 'Sanjay', 'Amit', 'Rajesh', 'Deepak'];
        const serviceTypes = ['Plumbing', 'Electrical', 'Carpentry', 'House Cleaning', 'Landscaping', 'AC Repair', 'Painting', 'Pest Control'];
        
        // Ensure all categories exist
        const allCategories = ['Plumbing', 'Electrical', 'Carpentry', 'House Cleaning', 'Landscaping', 'Appliance Repair', 'Painting', 'Pest Control'];
        for (const catName of allCategories) {
            await connection.execute('INSERT IGNORE INTO categories (name) VALUES (?)', [catName]);
        }

        // Get category IDs mapping
        const [catRows] = await connection.execute('SELECT id, name FROM categories');
        const catMap = {};
        catRows.forEach(row => { catMap[row.name] = row.id; });

        for (let i = 0; i < providerNames.length; i++) {
            const name = providerNames[i];
            const email = `${name.toLowerCase()}@gmail.com`;
            
            const [uRes] = await connection.execute(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                [name, email, hashedPassword, 'provider']
            );
            const userId = uRes.insertId;

            const serviceType = serviceTypes[i % serviceTypes.length];
            const [pRes] = await connection.execute(
                'INSERT INTO providers (user_id, service_type, location, description, is_approved) VALUES (?, ?, ?, ?, ?)',
                [userId, serviceType, 'Mumbai, Maharashtra', `${name} is a professional ${serviceType} specialist.`, 1]
            );
            const providerId = pRes.insertId;

            // Mapping serviceType to category_id
            let categoryName = serviceType;
            if (serviceType === 'AC Repair') categoryName = 'Appliance Repair';
            
            let catId = catMap[categoryName];

            // Add 2 varied services for each provider
            await connection.execute(
                'INSERT INTO services (provider_id, category_id, name, description, price) VALUES (?, ?, ?, ?, ?)',
                [providerId, catId, `Standard ${serviceType} Service`, 'Reliable and fast professional work.', 49.99 + i]
            );
            await connection.execute(
                'INSERT INTO services (provider_id, category_id, name, description, price) VALUES (?, ?, ?, ?, ?)',
                [providerId, catId, `Express ${serviceType} Repair`, 'Urgent repair service with quick turnaround.', 89.99 + i]
            );

            // Add 1-2 Reviews for each provider from random customers
            const customerIds = [1, 2, 3, 4, 5];
            const reviewComments = [
                'Excellent work! Very professional and punctual.',
                'The service was good, but a bit more expensive than expected.',
                'Highly recommended. Great attention to detail.',
                'Did a fantastic job. Will hire again!',
                'Very polite and got the job done quickly.'
            ];
            
            const numReviews = 1 + (i % 2); // 1 or 2 reviews
            for (let j = 0; j < numReviews; j++) {
                const customerId = customerIds[(i + j) % customerIds.length];
                const rating = 4 + (j % 2); // 4 or 5 stars
                const comment = reviewComments[(i + j) % reviewComments.length];
                await connection.execute(
                    'INSERT INTO reviews (user_id, provider_id, rating, comment) VALUES (?, ?, ?, ?)',
                    [customerId, providerId, rating, comment]
                );
            }
        }
        console.log('20 Provider users, profiles and reviews seeded.');

        // 3. Add 1 Admin
        await connection.execute(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            ['System Admin', 'admin@gmail.com', hashedPassword, 'admin']
        );

        console.log('Admin user seeded.');
        console.log('Successfully completed full data population!');

    } catch (error) {
        console.error('Seeding Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

finalSeed();
