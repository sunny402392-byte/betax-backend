const { UserModel } = require("../models/user.model");
const { MatchingPairModel } = require("../models/matchingpair.model");


async function calculateMatchingBonus(newUserId, commissionPercentage = 10) {
  try {
    const newUser = await UserModel.findById(newUserId).populate('sponsor');
    if (!newUser) throw new Error("New user not found");

    let currentUser = newUser.sponsor;
    const investmentAmount = newUser.investment || 0;

    let level = 1;
    while (currentUser && level <= 10) {
      const leftChild = await UserModel.findById(currentUser.leftChild);
      const rightChild = await UserModel.findById(currentUser.rightChild);

      if (leftChild && rightChild) {
        // check if pair already exists
        const existingPair = await MatchingPairModel.findOne({
          user: currentUser._id,
          left: leftChild._id,
          right: rightChild._id,
        });

        if (!existingPair) {
          // calculate commission
          const commission = (investmentAmount * commissionPercentage) / 100;

          // create new matching pair
          await MatchingPairModel.create({
            user: currentUser._id,
            left: leftChild._id,
            right: rightChild._id,
            commition: commission,
          });

          // update currentUser's wallet/ledger if needed
          currentUser.investment = (currentUser.investment || 0) + commission;
          await currentUser.save();
        }
      }

      // move up the tree
      currentUser = currentUser.sponsor;
      level++;
    }
  } catch (err) {
    console.error("Error calculating matching bonus:", err);
    throw err;
  }
}

module.exports = { calculateMatchingBonus };
