let promise = require('bluebird')
let jwt = promise.promisifyAll(require("jsonwebtoken"))
let TOKEN_EXPIRATION_SEC = "2h";

let genUserToken =(user)=>{
    // console.log("into token")
    let options = {expiresIn : TOKEN_EXPIRATION_SEC};
    return jwt.signAsync(user,process.env.JWT_SECRET_KEY , options).then(function(jwtToken){
    
    return jwtToken
    }).catch((err)=>{
     throw new exceptions.tokenGenException();
    })
}

module.exports = {
    genUserToken,
}