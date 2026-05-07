// const mongoose = require('mongoose');

// const connectDB = async () => {
//     try {
//         await mongoose.connect(process.env.DATABASE_URL);
//         // console.log('MongoDB connected successfully');
//     } catch (error) {
//         console.error('MongoDB connection error:', error);
//         process.exit(1);
//     }
// };

// module.exports = connectDB;

const mongoose = require("mongoose");
const dns = require("dns");
const logger = require("./logger");

// Set DNS servers to reliable ones (Google DNS and Cloudflare DNS)
// This fixes EREFUSED errors on SRV record queries
dns.setServers([
  "8.8.8.8",      // Google DNS
  "8.8.4.4",      // Google DNS secondary
  "1.1.1.1",      // Cloudflare DNS
  "1.0.0.1"       // Cloudflare DNS secondary
]);

// const { tradingNodeCron } = require("./levelIncome.calculation");

const connectDB = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    logger.info('Attempting to connect to MongoDB');
    
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      retryReads: true,
      directConnection: false,
    };

    let connectionString = process.env.DATABASE_URL;
    
    if (connectionString.startsWith('mongodb+srv://')) {
      logger.info('Using MongoDB Atlas SRV connection');
    } else {
      logger.info('Using direct MongoDB connection');
    }

    await mongoose.connect(connectionString, options);
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    logger.info('MongoDB Connected Successfully');
  } catch (err) {
    logger.error('MongoDB connection failed', {
      error: err.message,
      code: err.code,
      stack: err.stack
    });
    
    if (err.code === 'EREFUSED' || err.code === 'ENOTFOUND') {
      logger.error('DNS Resolution Error - Check internet connection and MongoDB Atlas settings');
    } else if (err.message.includes('authentication')) {
      logger.error('Authentication Error - Check username and password');
    } else if (err.message.includes('IP')) {
      logger.error('IP Whitelist Error - Add your IP in MongoDB Atlas Network Access');
    }
    
    process.exit(1);
  }
};

module.exports = connectDB;

