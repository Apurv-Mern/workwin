const { UserLevel, Users, LevelDefinition } = require('../models/init-models')(require('../models').sequelize);
function successObj(message, result) {
    if (isObject(result)) {
        return {
            flag: true,
            message: message,
            result: result
        };
    }
    else {
        return {
            flag: true,
            message: message,
            result: { data: result }
        };
    }
}
function errorObj(message, error, code = 000000) {
    return {
        flag: false,
        message: message,
        error: error,
        code: code
    };
}

function successResponseOBJ(message,result) {
    if (isObject(result)) {
        console.log(`********************************** Event Name = ${message} ********************************`);
        console.log(`RESPONSE EVENT NAME + ${message}`);
        console.log("DATA", result);
        console.log(`********************************** event end ********************************`);
        
        return {
            en: message,
            data: JSON.stringify(result)
        };

    }
    else {
        return {
            en: message,
            data: {}
        };
    }  
} 

function successResponseOBJNew(message,result) {
    if (isObject(result)) {
        console.log(`********************************** Event Name = ${message} ********************************`);
        console.log(`RESPONSE EVENT NAME + ${message}`);
        console.log("DATA", result);
        console.log(`********************************** event end ********************************`);
        
        return {
            en: message,
            data: result
        };

    }
    else {
        return {
            en: message,
            data: {}
        };
    }  
} 

function isObject(obj) {
    return (typeof obj === "object" && !Array.isArray(obj) && obj !== null);
}

//To convert from string to MD5.
function MD5(string) {
    var crypto = require('crypto');
    var md5crypt = crypto.createHash('md5');
    md5crypt.update(string);
    return md5crypt.digest('hex');
}

function str_shuffle(string) {
    var parts = string.split('');
    for (var i = parts.length; i > 0;) {
        var random = parseInt(Math.random() * i);
        var temp = parts[--i];
        parts[i] = parts[random];
        parts[random] = temp;
    }
    return parts.join('');
}

function generateUUID() {
    var currentTime = new Date().getTime();

    var randNumber = Math.random();

    var shuffledString = str_shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");

    return MD5(currentTime + randNumber + shuffledString);
}

function generateOTP() {
    var min = 100000;
    var max = 999999;
    var num = Math.floor(Math.random() * (max - min + 1)) + min;
    return num;
}

function errorResponseObj(message, error, code = 000000) {
    console.log('errorResponseObj :>> ', error);
    return {
        en: message,
        success : false,
        data: JSON.stringify(error)
    };
}

function errorResponseObjNew(message, error, code = 000000) {
    console.log('errorResponseObj :>> ', error);
    return {
        en: message,
        success : false,
        data: error
    };
}

// const getActiveSeason = async () => {
//     const today = new Date().toISOString().split('T')[0];
//     const season = await Season.findOne({
//       where: {
//         start_date: { [Op.lte]: today },
//         end_date: { [Op.gte]: today },
//         status: 1 // or 'started'
//       }
//     });
//     return season;
//   };


module.exports = {
    successObj: successObj,
    errorObj: errorObj,
    generateOTP: generateOTP,
    generateUUID: generateUUID,
    successResponseOBJ: successResponseOBJ,
    successResponseOBJNew:successResponseOBJNew,
    errorResponseObjNew:errorResponseObjNew,
    errorResponseObj: errorResponseObj,
    getActiveSeason:getActiveSeason
}