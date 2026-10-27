const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const connectWithDB = () => {
    mongoose.set('strictQuery', false);
    return mongoose.connect(process.env.DB_URL, { serverSelectionTimeoutMS: 5000 })
        .then(() => {
            console.log('Connected to database successfully');
        });
};

module.exports = connectWithDB;
