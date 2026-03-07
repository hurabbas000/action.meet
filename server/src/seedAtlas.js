const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const seedDB = async () => {
    try {
        console.log(`Connecting to: ${process.env.MONGODB_URI}`);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');

        // Check if admin exists
        const adminExists = await User.findOne({ email: 'admin@actionmeet.com' });
        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);

            await User.create({
                name: 'System Admin',
                email: 'admin@actionmeet.com',
                password: hashedPassword,
                role: 'admin',
                isActive: true
            });
            console.log('🌱 Seeded initial Admin user: admin@actionmeet.com / admin123');
        } else {
            console.log('⚡ Admin already exists. Skipping seed.');
        }

        console.log('🎉 Seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seedDB();
