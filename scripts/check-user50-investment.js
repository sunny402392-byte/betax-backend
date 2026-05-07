const dns = require('dns');
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
  "1.1.1.1",
  "1.0.0.1"
]);

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const { UserModel } = require('../models/user.model');

const checkInvestment = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    // console.log('Connected to database.');

    const user = await UserModel.findOne({ id: 'BSG3560296' });

    if (user) {
      // console.log(`User found: ${user.username} (ID: ${user.id})`);
      // console.log(`Investment value: ${user.investment}`);
    } else {
      // console.log('User with ID BSG3560296 not found.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    // console.log('Database connection closed.');
  }
};

checkInvestment();
