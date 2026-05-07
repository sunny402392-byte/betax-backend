const crypto = require('crypto');

exports.generatorUniqueId = ({name,start,end}) => {
    const randomId = crypto.randomInt(start || 100000, end || 999999).toString(); // Generate a random string
    return `${name || 'BT7'}${randomId}`;
};

exports.generateCustomId = ({prefix = 'BT7', min = 8, max = 9}) => {
    const length = Math.floor(Math.random() * (max - min + 1)) + min;
    let randomDigits = '';
    for (let i = 0; i < length; i++) {
      randomDigits += Math.floor(Math.random() * 10); // 0-9
    }
    return prefix + randomDigits;
  }
  
