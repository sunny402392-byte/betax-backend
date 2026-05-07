// exports.NumberFixed = (startNumber, endNumber) => {
//   const sum = startNumber + endNumber;
//   return Math.round((sum + Number.EPSILON) * 100) / 100; // Avoid floating point errors
// };

const Decimal = require('decimal.js');

exports.NumberFixed = (startNumber, endNumber) => {
  // Use Decimal.js for precision
  const sum = new Decimal(startNumber).plus(new Decimal(endNumber));
  
  // Round the result to 2 decimal places and return as a number
  return sum.toDecimalPlaces(2).toNumber();
};