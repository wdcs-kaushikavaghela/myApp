let promise = require('bluebird')
let jwt = promise.promisifyAll(require("jsonwebtoken"))
let TOKEN_EXPIRATION_SEC = "2h";

let genUserToken =(user)=>{
    // console.log("into token")
    console.log("user...............................",user)
    let options = {expiresIn : TOKEN_EXPIRATION_SEC};
    return jwt.signAsync(user,process.env.JWT_SECRET_KEY,options).then(function(jwtToken){
    console.log("jwtToken",jwtToken)
    return jwtToken
    }).catch((err)=>{
     throw new exceptions.tokenGenException();
    })
}
let verifyUserToken= async (acsToken)=>{
    console.log(acsToken);
    const token = acsToken.split(" ")[1] || acsToken;
    //  console.log("in verification of token");
     return jwt.verifyAsync(token,process.env.JWT_SECRET_KEY).then(function(tokenPayload){
        this.tokenPayload = tokenPayload
        // console.log("this.tokenPayload",this.tokenPayload)
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