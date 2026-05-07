// Shared Mining Plans - backend ke liye
const MINING_PLANS = [
  { level: 1, min: 11,    max: 60,      dailyPercent: 10 },
  { level: 2, min: 61,    max: 200,     dailyPercent: 11 },
  { level: 3, min: 201,   max: 600,     dailyPercent: 12 },
  { level: 4, min: 601,   max: 2200,    dailyPercent: 13 },
  { level: 5, min: 2201,  max: 5550,    dailyPercent: 14 },
  { level: 6, min: 5551,  max: 9980,    dailyPercent: 15 },
  { level: 7, min: 9981,  max: 21580,   dailyPercent: 16 },
  { level: 8, min: 21581, max: 79880,   dailyPercent: 17 },
  { level: 9, min: 79881, max: 1000000, dailyPercent: 18 },
];

function getUserPlan(investment) {
  return MINING_PLANS.find((p) => investment >= p.min && investment <= p.max) || null;
}

module.exports = { MINING_PLANS, getUserPlan };
