require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const { UserModel } = require('../models/user.model');
const { TransactionModel } = require('../models/transaction.model');
const { PackageModel } = require('../models/package.model');
const { IncomeModel } = require('../models/income.model');
const { sponsorIncomeCalculate, levelIncomeCalculate } = require('../utils/levelIncome.calculation');
const { generateCustomId } = require('../utils/generator.uniqueid');
const connectDB = require('../utils/config.db');

const investmentRanges = [
    { min: 100, max: 1000 },
    { min: 1100, max: 5000 },
    { min: 5001, max: 10000 },
    { min: 10001, max: 20000 }
];

const getRandomInvestment = () => {
    const range = investmentRanges[Math.floor(Math.random() * investmentRanges.length)];
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
};

const createDemoUsers = async () => {
    try {
        await connectDB();

        let sponsor = await UserModel.findOne({ username: 'MainSponsor' });
        if (!sponsor) {
            const sponsorId = generateCustomId({ prefix: 'AVI', max: 10, min: 10 });
            sponsor = await UserModel.create({
                id: sponsorId,
                username: 'MainSponsor',
                email: 'mainsponsor@avi.com',
                password: 'password',
                investment: 100000,
                active: {
                    isVerified: true,
                    isActive: true,
                }
            });
            const sponsorIncome = await IncomeModel.create({ user: sponsor._id });
            sponsor.incomeDetails = sponsorIncome._id;
            await sponsor.save();
        }

        let previousUser = sponsor;

        for (let i = 1; i <= 100; i++) {
            const username = `Avi${i}`;
            const investment = getRandomInvestment();
            const id = generateCustomId({ prefix: 'AVI', max: 10, min: 10 });

            const packages = await PackageModel.find();
            const selectedPackage = packages.find(p => investment >= p.minAmount && investment <= p.maxAmount);

            const newUser = new UserModel({
                id,
                username,
                email: `${username.toLowerCase()}@avi.com`,
                password: 'password',
                investment,
                sponsor: previousUser._id,
                active: {
                    isVerified: true,
                    isActive: true,
                    activeDate: new Date(),
                },
                packages: [selectedPackage._id]
            });

            const income = await IncomeModel.create({ user: newUser._id });
            newUser.incomeDetails = income._id;

            await newUser.save();

            const transaction = new TransactionModel({
                id: generateCustomId({ prefix: 'AVITX', max: 14, min: 14 }),
                user: newUser._id,
                package: selectedPackage._id,
                investment,
                type: 'Deposit',
                status: 'Completed',
            });
            await transaction.save();

            newUser.transactions.push(transaction._id);
            await newUser.save();
            
            previousUser.partners.push(newUser._id);
            await previousUser.save();

            // console.log(`Created user: ${username} with investment: ${investment}`);

            await sponsorIncomeCalculate({ userId: newUser._id, amount: investment });
            await levelIncomeCalculate({ userId: newUser._id, amount: investment });

            previousUser = newUser;
        }

        // console.log('Successfully created 100 demo users.');
    } catch (error) {
        console.error('Error creating demo users:', error);
    } finally {
        mongoose.disconnect();
    }
};

createDemoUsers();
