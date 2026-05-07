const mongoose = require("mongoose");
const { UserModel } = require("../models/user.model");
const { IncomeModel } = require("../models/income.model");
const { CommissionIncome } = require("../models/commission.model");
const { generateCustomId } = require("./generator.uniqueid");
const connectDB = require("./config.db");
require('dotenv').config();

// Add profit to user by their custom ID
async function addProfitToUser(userId, profitAmount) {
  try {
    // Connect to database
    await connectDB();

    // Find user by custom id field
    const user = await UserModel.findOne({ id: userId });

    if (!user) {
      // console.log(`❌ User with ID ${userId} not found.`);
      return { success: false, message: `User with ID ${userId} not found.` };
    }

    // console.log(`✅ User found: ${user.username} (${user.id})`);
    // console.log(`📊 Current Investment: $${user.investment || 0}`);

    // Get or create income details
    let incomeDetails = await IncomeModel.findById(user.incomeDetails);
    if (!incomeDetails) {
      incomeDetails = await IncomeModel.create({ user: user._id });
      user.incomeDetails = incomeDetails._id;
      await user.save();
    }

    const previousBalance = incomeDetails.income.currentIncome;
    const previousTotal = incomeDetails.income.totalIncome;

    // Add profit to income
    incomeDetails.income.currentIncome += profitAmount;
    incomeDetails.income.totalIncome += profitAmount;

    // Create commission record
    const commissionId = generateCustomId({ prefix: 'BSG-PROFIT', max: 14, min: 14 });
    const commissionRecord = new CommissionIncome({
      id: commissionId,
      user: user._id,
      income: profitAmount,
      amount: user.investment || 0,
      percentage: user.investment > 0 ? (profitAmount / user.investment) * 100 : 0,
      type: "Trading Profit Income", // Using valid enum value
      status: "Completed"
    });

    await commissionRecord.save();
    await incomeDetails.save();

    // console.log(`\n💰 Profit Added Successfully!`);
    // console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    // console.log(`User ID: ${user.id}`);
    // console.log(`Username: ${user.username}`);
    // console.log(`Principal Amount: $${user.investment || 0}`);
    // console.log(`Profit Added: $${profitAmount}`);
    // console.log(`Previous Balance: $${previousBalance.toFixed(2)}`);
    // console.log(`New Balance: $${incomeDetails.income.currentIncome.toFixed(2)}`);
    // console.log(`Previous Total Income: $${previousTotal.toFixed(2)}`);
    // console.log(`New Total Income: $${incomeDetails.income.totalIncome.toFixed(2)}`);
    // console.log(`Commission ID: ${commissionId}`);
    // console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return {
      success: true,
      message: `Profit of $${profitAmount} added successfully to user ${user.id}`,
      data: {
        userId: user.id,
        username: user.username,
        principalAmount: user.investment || 0,
        profitAdded: profitAmount,
        previousBalance,
        newBalance: incomeDetails.income.currentIncome,
        previousTotalIncome: previousTotal,
        newTotalIncome: incomeDetails.income.totalIncome,
        commissionId
      }
    };
  } catch (error) {
    console.error("❌ Error adding profit:", error.message);
    return { success: false, message: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  const userId = process.argv[2] || "BSG5908491";
  const profitAmount = parseFloat(process.argv[3]) || 200;

  addProfitToUser(userId, profitAmount)
    .then((result) => {
      if (result.success) {
        // console.log("✅ Process completed successfully!");
        process.exit(0);
      } else {
        // console.log("❌ Process failed:", result.message);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Fatal error:", error);
      process.exit(1);
    });
}

module.exports = { addProfitToUser };

