const { UserModel } = require("../models/user.model");

async function getTeamsDownline(userId, currentTeam = 1, maxTeams = 5) {
  const teams = [0, 0, 0, 0, 0];
  const result = { teamA: [], teamB: [], teamC: [] };
  if (currentTeam > maxTeams) return result;
  const partners = await UserModel.find({ sponsor: userId }, { _id: 1, username: 1, account: 1, investment: 1, active: 1, createdAt: 1 });
  const currentTeamResult = {
    level: currentTeam,
    required: teams[currentTeam - 1],
    partners: partners.filter(partner => (partner.active.isActive && partner.active.isVerified)).map(partner => ({
      _id: partner._id,
      username: partner.username,
      walletAddress: partner.account.walletAddress,
      investment: partner.investment,
      active: partner.active,
      isVerified: partner.active.isVerified,
      createdAt: partner.createdAt,
    })),
    completed: partners.filter(partner => (partner.active.isActive && partner.active.isVerified)).length >= teams[currentTeam - 1], // Check if requirement is met
  };

  if (currentTeam === 1) result.teamA = currentTeamResult.partners;
  if (currentTeam === 2) result.teamB = currentTeamResult.partners;
  if (currentTeam === 3) result.teamC = currentTeamResult.partners;

  for (const partner of partners) {
    const partnerDownline = await getTeamsDownline(partner._id, currentTeam + 1, maxTeams);
    result.teamA.push(...partnerDownline.teamA);
    result.teamB.push(...partnerDownline.teamB);
    result.teamC.push(...partnerDownline.teamC);
  }
  return result;
}

async function getAllTeamsDownline(userId, currentTeam = 1, maxTeams = 5) {
  const teams = [0, 0, 0, 0, 0];
  const result = { teamA: [], teamB: [], teamC: [], teamD: [], teamE: [] };
  if (currentTeam > maxTeams) return result;
  const partners = await UserModel.find({ sponsor: userId }, { _id: 1, username: 1, account: 1, investment: 1, active: 1, createdAt: 1, income: 1, partners: 1 }).populate({ path: "account", select: "-_id walletAddress" });
  const currentTeamResult = {
    level: currentTeam,
    required: teams[currentTeam - 1],
    partners: partners.filter(partner => (partner.active.isVerified)).map(partner => ({
      _id: partner._id,
      username: partner.username,
      walletAddress: partner.account.walletAddress,
      investment: partner.investment,
      income: partner.income,
      active: partner.active,
      isVerified: partner.active.isVerified,
      partnerLength: partner.partners.length,
      createdAt: partner.createdAt,
    })),
    completed: partners.filter(partner => (partner.active.isVerified)).length >= teams[currentTeam - 1], // Check if requirement is met
  };

  if (currentTeam === 1) result.teamA = currentTeamResult.partners;
  if (currentTeam === 2) result.teamB = currentTeamResult.partners;
  if (currentTeam === 3) result.teamC = currentTeamResult.partners;
  if (currentTeam === 4) result.teamD = currentTeamResult.partners;
  if (currentTeam === 5) result.teamE = currentTeamResult.partners;

  for (const partner of partners) {
    const partnerDownline = await getAllTeamsDownline(partner._id, currentTeam + 1, maxTeams);
    result.teamA.push(...partnerDownline.teamA);
    result.teamB.push(...partnerDownline.teamB);
    result.teamC.push(...partnerDownline.teamC);
    result.teamD.push(...partnerDownline.teamD);
    result.teamE.push(...partnerDownline.teamE);
  }
  return result;
}


/**
 * Create a downline tree based on user partners.
 * @param {String} userId - ID of the root user.
 * @param {Number} depth - Maximum depth for the downline tree.
 * @returns {Object} - Tree structure representing the downline.
 */
const getDownlineTree = async (userId, depth = Infinity) => {
  try {
    let totalLength = 0;

    const buildTree = async (userId, currentDepth) => {
      if (currentDepth > depth) return null;

      const user = await UserModel.findById(userId, { _id: 1, id: 1, username: 1, account: 1, active: 1, investment: 1, referralLink: 1, partners: 1, createdAt: 1, income: 1 })
        .populate({
          path: "partners",
          match: { 'active.isVerified': true, 'active.isBlocked': false }, // Filter active and verified users
          select: "_id id username account active investment referralLink partners createdAt income", // Fetch only necessary fields
        }).populate({ path: "incomeDetails", select: 'income' })
        .lean();
      if (!user) {
        return null;
      }

      totalLength++; // Increment the total length for each user node

      const userNode = {
        id: user.id,
        username: user.username,
        referralLink: user.referralLink,
        walletAddress: user.account.walletAddress,
        investment: user.investment,
        income: user.income,
        active: user.active,
        partnersLength: user.partners.length,
        createdAt: user.createdAt,
        partners: [],
      };

      if (user.partners && user.partners.length > 0) {
        const partnerTrees = await Promise.all(
          user.partners.map(partner => buildTree(partner._id, currentDepth + 1))
        );
        userNode.partners = partnerTrees.filter(Boolean); // Filter out null values
      }

      return userNode;
    };

    const tree = await buildTree(userId, 0);
    return { tree, totalLength };
  } catch (error) {
    console.error("Error creating downline tree:", error.message);
    throw error;
  }
};


const mongoose = require("mongoose");

/**
 * Get all downline users (referrals) recursively using $graphLookup.
 *
 * @param {Object} options
 * @param {string} options.userId - The root user ID to start from.
 * @param {boolean} [options.listShow=true] - Whether to return the downline list.
 * @param {number} [options.maxLength=Infinity] - Max depth/level to traverse.
 * @returns {Object} - Downline stats and optional list.
 */
const getDownlineArray = async ({ userId, listShow = true, maxLength = Infinity }) => {
  try {
    const graphLookupStage = {
      $graphLookup: {
        from: UserModel.collection.name,
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "sponsor",
        as: "downline",
        depthField: "level"
      }
    };

    // Only include maxDepth if maxLength is a finite number
    if (Number.isFinite(maxLength)) {
      graphLookupStage.$graphLookup.maxDepth = maxLength - 1;
    }
    const result = await UserModel.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(userId) }
      },
      graphLookupStage,
      {
        $project: {
          downline: {
            $map: {
              input: "$downline",
              as: "d",
              in: {
                _id: "$$d._id",
                id: "$$d.id",
                username: "$$d.username",
                account: "$$d.account",
                referralLink: "$$d.referralLink",
                sponsor: "$$d.sponsor",
                active: "$$d.active",
                investment: "$$d.investment",
                position: "$$d.position",
                createdAt: "$$d.createdAt",
              }
            }
          }
        }
      }
    ]);

    if (!result || result.length === 0) {
      return {
        downline: [],
        activeDownline: [],
        left: [],
        right: [],
        downlineUserIds: [],
        total: 0,
        totalActive: 0,
        totalInactive: 0
      };
    }

    const downline = result[0].downline;

    // Count stats
    const total = downline.length;
    const totalActive = downline.filter(u => u.active.isActive === true);
    const downlineUserIds = downline.map(user => new mongoose.Types.ObjectId(user._id));
    downlineUserIds.unshift(new mongoose.Types.ObjectId(userId)); // Add root user at start
    const leftArray = totalActive.filter(u => u.position == 'LEFT');
    const rightArray = totalActive.filter(u => u.position == 'RIGHT');
    const totalInactive = total - totalActive;

    return {
      downline: listShow ? downline : [],
      activeDownline: listShow ? totalActive : [],
      left: listShow ? leftArray : [],
      right: listShow ? rightArray : [],
      downlineUserIds: downlineUserIds || [],
      total,
      totalActive: totalActive.length,
      totalInactive
    };
  } catch (error) {
    console.error("Error fetching downline:", error);
    return {
      downline: [],
      activeDownline: [],
      left: [],
      right: [],
      downlineUserIds: [],
      total: 0,
      totalActive: 0,
      totalInactive: 0,
      error: "Internal server error"
    };
  }
};


const getDirectPartnersDownlines = async ({ userId, breakdownActive = false, downlinesActive = false }) => {
  try {
    if (!userId) return
    const directPartners = await UserModel.find( { sponsor: userId },{ _id: 1, username: 1, investment: 1 });
    if (directPartners.length === 0) return { totalBusiness: 0, powerLagBusiness: 0, weakerLagBusiness: 0, breakdown: [], downlines: {} };
    const directPartnerIds = directPartners.map(p => new mongoose.Types.ObjectId(p._id));
    const downlines = await UserModel.aggregate([
      { $match: { _id: { $in: directPartnerIds } }},
      {
        $graphLookup: {
          from: UserModel.collection.name,
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "sponsor",
          as: "downline",
          depthField: "level"
        }
      },
      {
        $project: {
          _id: 1,
          username: 1,
          investment: "$investment",
          downline: {
            $map: {
              input: "$downline",
              as: "d",
              in: {
                _id: "$$d._id",
                username: "$$d.username",
                sponsor: "$$d.sponsor",
                investment: "$$d.investment",
                createdAt: "$$d.createdAt"
              }
            }
          }
        }
      }
    ]);
    let totalBusiness = 0;
    let powerLagBusiness = 0;
    let weakerLagBusiness = 0;
    const breakdown = [];
    const directDownlines = {};

    downlines.forEach(partner => {
      const teamInvestment = partner.downline.reduce((acc, d) => acc + (d.investment || 0), 0);
      const selfInvestment = partner.investment || 0;
      // const total = selfInvestment + teamInvestment;
      const total = teamInvestment; // Only count team investment, not self

      totalBusiness += total;
      breakdown.push({ userId: partner._id, username: partner.username, selfInvestment, teamInvestment, total });
      directDownlines[partner._id] = partner.downline;
    });
    breakdown.sort((a, b) => b.total - a.total);
    powerLagBusiness = breakdown.length > 0 ? breakdown[0].total : 0;
    weakerLagBusiness = breakdown.slice(1).reduce((sum, item) => sum + item.total, 0);

    return { totalBusiness,powerLagBusiness,weakerLagBusiness, breakdown: breakdownActive ? breakdown : [], downlines: downlinesActive ? directDownlines : [] };
  } catch (err) {
    console.error("Error in getDirectBusiness:", err);
    return { totalBusiness: 0, powerLagBusiness: 0, weakerLagBusiness: 0, breakdown: [], downlines: [] };
  }
};



module.exports = { getTeamsDownline, getDirectPartnersDownlines, getAllTeamsDownline, getDownlineTree, getDownlineArray };