const Package = require('../models/wallet.package.model');
const User = require('../models/wallet.user.model');
const Income = require('../models/wallet.income.model');

async function distributeMonthlyROI() {
  try {
    const packages = await Package.find({ active: true });
    
    for (const pkg of packages) {
      const monthlyROI = (pkg.amount * pkg.roiPercent) / 100;
      
      if (pkg.earned + monthlyROI <= pkg.maxReturn) {
        pkg.earned += monthlyROI;
        await pkg.save();
        
        await User.findOneAndUpdate(
          { walletAddress: pkg.walletAddress },
          { $inc: { withdrawable: monthlyROI, totalEarned: monthlyROI } }
        );
        
        await Income.create({
          walletAddress: pkg.walletAddress,
          type: 'ROI',
          amount: monthlyROI
        });
        
        // Distribute level income (27% of ROI)
        await distributeLevelIncome(pkg.walletAddress, monthlyROI);
      } else {
        pkg.active = false;
        await pkg.save();
      }
    }
    
    // console.log('Monthly ROI distributed');
  } catch (error) {
    console.error('ROI distribution error:', error);
  }
}

async function distributeLevelIncome(walletAddress, roiAmount) {
  const levelPercents = [10, 5, 3, 2, 2, 1, 1, 1, 1, 1];
  const user = await User.findOne({ walletAddress });
  let upline = user?.referrerAddress;
  
  for (let i = 0; i < 10 && upline; i++) {
    const uplineUser = await User.findOne({ walletAddress: upline });
    if (uplineUser && uplineUser.directCount >= (i + 1)) {
      const income = (roiAmount * levelPercents[i]) / 100;
      
      if (uplineUser.totalEarned + income <= uplineUser.totalInvestment * 3) {
        await User.findOneAndUpdate(
          { walletAddress: upline },
          { $inc: { withdrawable: income, totalEarned: income } }
        );
        
        await Income.create({
          walletAddress: upline,
          type: 'Level',
          amount: income,
          fromAddress: walletAddress,
          level: i + 1
        });
      }
    }
    upline = uplineUser?.referrerAddress;
  }
}

module.exports = { distributeMonthlyROI };
