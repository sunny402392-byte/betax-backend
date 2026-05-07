const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const dns = require('dns');

// Set DNS servers to reliable ones
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
  "1.1.1.1",
  "1.0.0.1"
]);

// Environment variables load karein
dotenv.config({ path: path.join(__dirname, "../.env") });

// Models import karein
const { UserModel } = require("../models/user.model");
const { TransactionModel } = require("../models/transaction.model");
const { PackageModel } = require("../models/package.model");
const { CommissionIncome } = require("../models/commission.model");
const { IncomeModel } = require("../models/income.model");

// Simple ID Generator
const generateId = () => `REF-${Math.floor(100000 + Math.random() * 900000)}`;

const activateUser = async () => {
  try {
    // 1. Database Connect karein
    // console.log("⏳ Connecting to Database...");
    await mongoose.connect(process.env.DATABASE_URL);
    // console.log("✅ Database Connected");

    // --- CONFIGURATION ---
    const targetUserId = "BSG1036535"; // Sandeep
    const investmentAmount = 500;       // $500 Investment
    // ---------------------

    // 2. User ko find karein
    const user = await UserModel.findOne({ id: targetUserId });
    if (!user) {
      console.error(`❌ User ${targetUserId} not found!`);
      process.exit(1);
    }

    // console.log(`👤 User Found: ${user.username} (${user.email})`);
    // console.log(`💰 Old Investment: $${user.investment || 0}`);
    
    // 3. User Data Update karein
    user.investment = (user.investment || 0) + investmentAmount;
    
    if (!user.active) user.active = {};
    user.active.isActive = true; // User ko Active karein
    
    await user.save();
    // console.log(`✅ User Updated: New Investment $${user.investment}, Status: Active`);

    // 4. Transaction Record Create karein
    const pkg = await PackageModel.findOne({ title: "LIVE AC" });
    
    const newTransaction = new TransactionModel({
      user: user._id,
      investment: investmentAmount,
      type: "Deposit",
      status: "Completed",
      package: pkg ? pkg._id : null,
      description: "Manual Activation via Script (Admin)",
      createdAt: new Date()
    });

    await newTransaction.save();
    // console.log("✅ Transaction Record Created Successfully");

    // 5. Referral Income Logic (Check Sponsor)
    if (user.sponsor) {
        const sponsor = await UserModel.findById(user.sponsor);
        if (sponsor) {
            // console.log(`\n🔗 Sponsor Found: ${sponsor.username} (${sponsor.id})`);
            
            const referralPercent = 5; // 5% Referral
            const referralAmount = (investmentAmount * referralPercent) / 100;
            
            // Create Commission Record
            const newCommission = new CommissionIncome({
                id: generateId(),
                user: sponsor._id,
                fromUser: user._id,
                amount: investmentAmount, // Investment amount
                income: referralAmount,   // Commission amount ($25)
                percentage: referralPercent,
                type: "Referral Income",
                status: "Completed",
                createdAt: new Date()
            });
            
            await newCommission.save();
            // console.log(`💵 Referral Commission Created: $${referralAmount}`);

            // Update Sponsor Income Details (IncomeModel)
            let incomeDetails = await IncomeModel.findOne({ user: sponsor._id });
            if (!incomeDetails) {
                incomeDetails = new IncomeModel({ user: sponsor._id });
            }
            
            // Ensure nested objects exist
            if (!incomeDetails.income) incomeDetails.income = { totalIncome: 0, currentIncome: 0 };
            
            // Update Totals
            incomeDetails.income.totalIncome = (incomeDetails.income.totalIncome || 0) + referralAmount;
            incomeDetails.income.currentIncome = (incomeDetails.income.currentIncome || 0) + referralAmount;
            
            await incomeDetails.save();
            // console.log(`✅ Sponsor Income Updated (Total: $${incomeDetails.income.totalIncome})`);
        } else {
            // console.log("\n⚠️ Sponsor ID exists but user not found in DB.");
        }
    } else {
        // console.log("\n⚠️ No Sponsor found for this user.");
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    // console.log("👋 Connection Closed");
    process.exit(0);
  }
};

activateUser();
