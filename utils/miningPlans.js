// Shared Mining Plans - backend ke liye
const MINING_PLANS = [
  { level: 1, min: 13,    max: 70,      dailyPercent: 4  },
  { level: 2, min: 73,    max: 300,     dailyPercent: 5  },
  { level: 3, min: 331,   max: 660,     dailyPercent: 6  },
  { level: 4, min: 601,   max: 2250,    dailyPercent: 7  },
  { level: 5, min: 2251,  max: 6000,    dailyPercent: 8  },
  { level: 6, min: 6001,  max: 10000,   dailyPercent: 9  },
  { level: 7, min: 10001, max: 25000,   dailyPercent: 10 },
  { level: 8, min: 25001, max: 75000,   dailyPercent: 11 },
  { level: 9, min: 75001, max: 1000000, dailyPercent: 12 },
];

function getUserPlan(investment) {
  return MINING_PLANS.find((p) => investment >= p.min && investment <= p.max) || null;
}

module.exports = { MINING_PLANS, getUserPlan };
