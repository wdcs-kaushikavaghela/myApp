let promise = require('bluebird')
let jwt = promise.promisifyAll(require("jsonwebtoken"))
let TOKEN_EXPIRATION_SEC = "1m";

let genUserToken =(user)=>{
    // console.log("into token")
    let options = {expiresIn : TOKEN_EXPIRATION_SEC};
    return jwt.signAsync(user,process.env.JWT_SECRET_KEY , options).then(function(jwtToken){
    
    return jwtToken
    }).catch((err)=>{
     throw new exceptions.tokenGenException();
    })
}
let verifyUserToken= async (acsToken)=>{
    const token = acsToken.split(" ")[1];

     return jwt.verifyAsync(token,process.env.JWT_SECRET_KEY).then(function(tokenPayload){
        this.tokenPayload = tokenPayload

        return tokenPayload
     }).catch((err)=>{
         console.log("...............................................",err);
       return err
     })
}

module.exports = {
    genUserToken,
    verifyUserToken
}