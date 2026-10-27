const path = require('path');
const apiDir = path.join(__dirname, '../api');

const fs = require('fs');

// Load environment from api/.env
try {
    require(path.join(apiDir, 'node_modules/dotenv')).config({ path: path.join(apiDir, '.env') });
} catch (e) {
    const envFile = path.join(apiDir, '.env');
    if (fs.existsSync(envFile)) {
        const lines = fs.readFileSync(envFile, 'utf8').split('\n');
        for (const line of lines) {
            const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
            if (m && !process.env[m[1]]) {
                process.env[m[1]] = (m[2] || '').trim().replace(/^['"](.*)['"]$/, '$1');
            }
        }
    }
}

let mongoose, User, Place, bcrypt;

try {
    bcrypt = require(path.join(apiDir, 'node_modules/bcryptjs'));
    mongoose = require(path.join(apiDir, 'node_modules/mongoose'));
    User = require(path.join(apiDir, 'models/User'));
    Place = require(path.join(apiDir, 'models/Place'));
} catch (e) {
    try {
        bcrypt = require('bcryptjs');
        mongoose = require('mongoose');
        User = require('../api/models/User');
        Place = require('../api/models/Place');
    } catch (err2) {
        console.error('Please run "npm install" inside the api directory first.');
        process.exit(1);
    }
}

const DB_URL = process.env.DB_URL;
if (!DB_URL) {
    console.error('DB_URL not found in api/.env. Please configure DB_URL first.');
    process.exit(1);
}

const samplePlaces = [
    {
        title: "Mountain Mist Luxury Chalet",
        address: "Old Manali, Himachal Pradesh, India",
        photos: [
            "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80"
        ],
        description: "Escape to this breathtaking cedar wood chalet overlooking snow-capped Himalayan peaks. Features high-speed WiFi, cozy fireplace, panoramic balcony, and organic breakfast served fresh every morning.",
        perks: ["wifi", "parking", "tv", "radio"],
        extraInfo: "Check-in after 2:00 PM. Bonfire and heater available on request. Pets are welcome.",
        maxGuests: 4,
        price: 4500,
    },
    {
        title: "Sunset Wave Villa & Private Pool",
        address: "Anjuna Beach, Goa, India",
        photos: [
            "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80"
        ],
        description: "Contemporary tropical sanctuary located just 200m from the shoreline. Relax in your private plunge pool, enjoy open-air living, and watch mesmerizing sunsets right from the patio.",
        perks: ["wifi", "parking", "tv", "pets", "entrance"],
        extraInfo: "Quiet hours after 11 PM. Beach gear and scooters available for rent.",
        maxGuests: 6,
        price: 8200,
    },
    {
        title: "Royal Heritage Courtyard Haveli",
        address: "C-Scheme, Jaipur, Rajasthan, India",
        photos: [
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80"
        ],
        description: "Experience authentic royal Rajasthani hospitality. Intricately carved stone archways, antique decor, private inner courtyard garden, and rooftop dining with views of Nahargarh Fort.",
        perks: ["wifi", "parking", "tv", "radio", "entrance"],
        extraInfo: "Traditional Rajasthani thali dinner can be arranged. Authentic artisanal tours available.",
        maxGuests: 5,
        price: 5800,
    },
    {
        title: "Emerald Estate Tea Plantation Cottage",
        address: "Munnar Hills, Idukki, Kerala, India",
        photos: [
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80"
        ],
        description: "Nestled in rolling hills of lush tea estates, this tranquil stone cottage offers fresh mountain air, guided plantation walks, birdwatching spots, and home-cooked South Indian delicacies.",
        perks: ["wifi", "parking", "tv", "pets"],
        extraInfo: "Mornings can be chilly; warm blankets and hot water provided. Fresh tea tasting included.",
        maxGuests: 4,
        price: 3900,
    }
];

async function seedDatabase() {
    console.log('\x1b[36m%s\x1b[0m', 'Connecting to MongoDB to seed sample data...');
    mongoose.set('strictQuery', false);
    await mongoose.connect(DB_URL, { serverSelectionTimeoutMS: 5000 });
    console.log('\x1b[32m%s\x1b[0m', '[✓] Connected to MongoDB!');

    // 1. Create Demo Host & Administrator Accounts (Dynamic from api/.env)
    const hostEmail = (process.env.HOST_EMAIL || 'demo@homestays.com').toLowerCase().trim();
    const hostPassword = process.env.HOST_PASSWORD || 'Demo@123';
    const hostName = process.env.HOST_NAME || 'Demo Host';

    let user = await User.findOne({ email: hostEmail });
    if (!user && hostEmail !== 'demo@homestays.com') {
        user = await User.findOne({ email: 'demo@homestays.com' });
        if (user) {
            console.log('\x1b[33m%s\x1b[0m', `[*] Migrating host email in MongoDB from demo@homestays.com to ${hostEmail}`);
        }
    }

    if (!user) {
        user = await User.create({
            name: hostName,
            email: hostEmail,
            password: bcrypt.hashSync(hostPassword, 10),
            role: 'admin',
        });
        console.log('\x1b[32m%s\x1b[0m', `[✓] Created Host Account: ${hostEmail} (Password: ${hostPassword}, Role: admin)`);
    } else {
        user.email = hostEmail;
        user.name = hostName;
        user.password = bcrypt.hashSync(hostPassword, 10);
        user.role = 'admin';
        await user.save();
        console.log('\x1b[33m%s\x1b[0m', `[*] Synchronized Host credentials: ${hostEmail}`);
    }

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@homestays.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const adminName = process.env.ADMIN_NAME || 'Platform Administrator';

    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser && adminEmail !== 'admin@homestays.com') {
        adminUser = await User.findOne({ email: 'admin@homestays.com' });
        if (adminUser) {
            console.log('\x1b[33m%s\x1b[0m', `[*] Migrating admin email in MongoDB from admin@homestays.com to ${adminEmail}`);
        }
    }

    if (!adminUser) {
        adminUser = await User.create({
            name: adminName,
            email: adminEmail,
            password: bcrypt.hashSync(adminPassword, 10),
            role: 'admin',
        });
        console.log('\x1b[32m%s\x1b[0m', `[✓] Created Dedicated Admin Account: ${adminEmail} (Password: ${adminPassword}, Role: admin)`);
    } else {
        adminUser.email = adminEmail;
        adminUser.name = adminName;
        adminUser.password = bcrypt.hashSync(adminPassword, 10);
        adminUser.role = 'admin';
        await adminUser.save();
        console.log('\x1b[33m%s\x1b[0m', `[*] Synchronized Admin credentials: ${adminEmail}`);
    }

    // 2. Create Sample Places
    let createdCount = 0;
    for (const placeData of samplePlaces) {
        const exists = await Place.findOne({ title: placeData.title });
        if (!exists) {
            await Place.create({
                ...placeData,
                owner: user._id,
            });
            createdCount++;
        }
    }

    console.log('\x1b[32m%s\x1b[0m', `[✓] Successfully added ${createdCount} sample homestay listings!`);
    console.log('\n======================================================');
    console.log(' Active Credentials (Configured in api/.env):');
    console.log(` 1. Host Account:    ${hostEmail}  (${hostPassword})`);
    console.log(` 2. Admin Portal:    ${adminEmail} (${adminPassword})`);
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
}

seedDatabase().catch((err) => {
    console.error('Error seeding database:', err.message);
    process.exit(1);
});
