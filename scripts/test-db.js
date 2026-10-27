const path = require('path');
const apiDir = path.join(__dirname, '../api');
let mongoose;

try {
    mongoose = require(path.join(apiDir, 'node_modules/mongoose'));
} catch (e) {
    try {
        mongoose = require('mongoose');
    } catch (e2) {
        console.error('Mongoose is not installed yet. Run npm install inside api directory.');
        process.exit(1);
    }
}

const uri = process.argv[2] || process.env.DB_URL;

if (!uri) {
    console.error('No DB_URL provided');
    process.exit(1);
}

mongoose.set('strictQuery', false);
mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 })
    .then(() => {
        console.log('SUCCESS');
        process.exit(0);
    })
    .catch((err) => {
        console.error(err.message);
        process.exit(1);
    });
