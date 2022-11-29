let BaseDao = require("../../dao/BaseDao");

const User = require("../../models/userModel");
const userDao = new BaseDao(User);

const Template = require("../../models/EmailTemplateModel");
const templateDao = new BaseDao(Template)

function getUserDetails(query){
    return userDao.findOne(query);
}

function getFrinedsDetails(query){
    return userDao.find(query);
}


function getAllUserDetails(query){
    return userDao.aggregate(query);
}

function updateProfile(query, updateObj) {
    let options = {
      new: true,
      
    };
    return userDao.findOneAndUpdate(query, updateObj, options);
  }

  function update(query, updateObj) {
    let options = {
      new: true,
    };
    return userDao.update(query, updateObj, options);
  }

function createUser(obj){
    let userObj = new User(obj);
    return userDao.save(userObj);
}

function getTemplateDetails(query) {
    return templateDao.findOne(query);
  }

  function getAllUserDetailsByQuery(query) {
    return userDao.aggregate(query);
  }
module.exports = {
    getUserDetails,
    getFrinedsDetails,
    getAllUserDetails,
    createUser,
    getTemplateDetails,
    updateProfile,
    getAllUserDetailsByQuery,
    update
}