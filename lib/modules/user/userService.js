const dao = require("./userDao");
const userConstant = require("./userConstants");
const mapper = require("./userMapper");
const constants = require("../../constants");
const appUtils = require("../../appUtils");
const ObjectId = require("mongoose").Types.ObjectId;
const mailHandler = require("../../middleware/email");
const jwtHandler = require("../../middleware/jwtHandler");
const fileUtils = require("../../middleware/multer");
const { query } = require("express");

async function registerUser(details) {
  try {
    let emailQuery = {
      email: details.email,
    };
    let userNameQuery = {
      userName: details.userName,
    };
    const isEmail = await dao.getUserDetails(emailQuery);
    const isUserName = await dao.getUserDetails(userNameQuery);
    if (isEmail) {
      return mapper.responseMapping(
        userConstant.CODE.BadRequest,
        userConstant.MESSAGE.EmailAlreadyExists
      );
    } else if (isUserName) {
      return mapper.responseMapping(
        userConstant.CODE.BadRequest,
        userConstant.MESSAGE.UsernameAlreadyExists
      );
    } else {
      let convertedPass = await appUtils.convertPass(details.password);
      details.password = convertedPass;
      details.createdAt = new Date().getTime();
      details.dob = details.dob.split("-").reverse().join("-");
      const date = new Date(details.dob);
      details.dob = date;
      const userCreate = await dao.createUser(details);
      if (userCreate) {
        return mapper.responseMappingWithData(
          userConstant.CODE.Success,
          userConstant.MESSAGE.Success,
          userCreate
        );
      } else {
        return mapper.responseMappingWithData(
          userConstant.CODE.INTRNLSRVR,
          userConstant.MESSAGE.internalServerError,
          userCreate
        );
      }
    }
  } catch (error) {
    return mapper.responseMapping(
      userConstant.CODE.INTRNLSRVR,
      userConstant.MESSAGE.internalServerError
    );
  }
}

async function sendCode(details) {
  try {
    if (!details || Object.keys(details).length == 0) {
      return mapper.responseMapping(
        userConstant.CODE.BadRequest,
        userConstant.MESSAGE.InvalidDetails
      );
    } else {
      let query = {};
      if (details.email) {
        query.email = details.email.toLowerCase();
      } else {
        query.userName = details.userName.toLowerCase();
      }
      const userDetails = await dao.getUserDetails(query);
      try {
        if (userDetails) {
          let verificationCode = Math.floor(
            Math.random() * (999999 - 100000) + 100000
          );
          let updateObj = {};
          updateObj.OTP = verificationCode;
          updateObj.OTPExpiryTime = new Date().getTime() + 60 * 1000;
          if (details.email) {
            let mailQuery = {};
            if (details.resendOTP && details.resendOTP === true) {
              mailQuery.mailName = constants.EMAIL_TEMPLATES.NEW_RESEND_CODE;
            } else {
              mailQuery.mailName =
                constants.EMAIL_TEMPLATES.NEW_VERIFICATION_CODE;
            }
            let templateDetails = await dao.getTemplateDetails(mailQuery);
            if (templateDetails) {
              let mailUserDetails = {
                userName: userDetails.userName,
                email: userDetails.email,
                verificationCode: verificationCode,
              };
              mailHandler.SEND_MAIL(mailUserDetails, templateDetails);
            }
          }
          const userOTPUpdate = await dao.updateProfile(query, updateObj);
          try {
            if (userOTPUpdate) {
              if (details.email || details.userName) {
                if (details.resendOTP && details.resendOTP === true) {
                  return mapper.responseMapping(
                    userConstant.CODE.Success,
                    userConstant.MESSAGE.ResendVerificationOTPsendSuccess
                  );
                } else {
                  return mapper.responseMappingWithData(
                    userConstant.CODE.Success,
                    userConstant.MESSAGE.VerificationOTPsendSuccess,
                    details._id
                  );
                }
              }
            } else {
              return mapper.responseMapping(
                userConstant.CODE.INTRNLSRVR,
                userConstant.MESSAGE.internalServerError
              );
            }
          } catch (error) {
            return mapper.responseMapping(
              userConstant.CODE.INTRNLSRVR,
              userConstant.MESSAGE.internalServerError
            );
          }
        } else {
          return mapper.responseMapping(
            userConstant.CODE.DataNotFound,
            userConstant.MESSAGE.InvalidCredentials
          );
        }
      } catch (error) {
        return mapper.responseMapping(
          userConstant.CODE.INTRNLSRVR,
          userConstant.MESSAGE.internalServerError
        );
      }
    }
  } catch (error) {
    return mapper.responseMapping(
      userConstant.CODE.INTRNLSRVR,
      userConstant.MESSAGE.internalServerError
    );
  }
}

async function verifySecurityCode(id, OTP) {
  try {
    if (!id || !ObjectId.isValid(id) || !OTP) {
      return mapper.responseMapping(
        userConstant.CODE.BadRequest,
        userConstant.MESSAGE.InvalidDetails
      );
    } else {
      let query = {
        _id: id,
        OTP: OTP,
      };
      const userDetails = await dao.getUserDetails(query);
      if (userDetails) {
        let currentTime = Date.now();
        if (userDetails.OTPExpiryTime > currentTime) {
          let updatedObj = {
            isOTPVerified: true,
          };
          const userUpdated = await dao.updateProfile(query, updatedObj);
          if (userUpdated) {
            let filteredUserResponseFields =
              mapper.filteredUserResponseFields(userUpdated);
            let usrObj = {
              _id: userUpdated._id,
              email: userUpdated.email.toLowerCase(),
            };
            const results = await Promise.all([
              jwtHandler.genUserToken(usrObj),
            ]);
            if (results) {
              let token = results[0];
              filteredUserResponseFields.token = token;
              return mapper.responseMappingWithData(
                userConstant.CODE.Success,
                userConstant.MESSAGE.LoginSuccess,
                filteredUserResponseFields
              );
            } else {
              return mapper.responseMapping(
                userConstant.CODE.INTRNLSRVR,
                userConstant.MESSAGE.internalServerError
              );
            }
          } else {
            return mapper.responseMapping(
              userConstant.CODE.INTRNLSRVR,
              userConstant.MESSAGE.internalServerError
            );
          }
        } else {
          return mapper.responseMapping(
            userConstant.CODE.BadRequest,
            userConstant.MESSAGE.TimeOut
          );
        }
      } else {
        return mapper.responseMapping(
          userConstant.CODE.BadRequest,
          userConstant.MESSAGE.InvalidVerificationCode
        );
      }
    }
  } catch (err) {
    return mapper.responseMapping(
      constants.CODE.INTRNLSRVR,
      constants.MESSAGE.internalServerError
    );
  }
}

async function login(details) {
  try {
    if (!details || Object.keys(details).length == 0) {
      return mapper.responseMapping(
        userConstant.CODE.BadRequest,
        userConstant.MESSAGE.InvalidDetails
      );
    } else {
      let query = {
        role: details.role,
      };
      if (details.email) {
        query.email = details.email;
      }
      if (details.userName) {
        query.userName = details.userName;
      }
      const userDetails = await dao.getUserDetails(query);
      if (userDetails) {
        if (userDetails.status === "ACTIVE") {
          let isValidPassword = await appUtils.verifyPassword(
            details.password,
            userDetails.password
          );
          if (isValidPassword) {
            let prevLoginActivities = userDetails.loginActivity;
            prevLoginActivities.push({
              device: details.device,
              date: details.date,
              browser: details.browser,
              ipaddress: details.ipaddress,
              country: details.country,
              state: details.state,
            });
            if (userDetails.twoFactorAuthentication === true) {
              let result = await sendCode(userDetails);
              return result;
            } else {
              let updateObj = {
                loginActivity: prevLoginActivities,
              };
              const userUpdated = await dao.updateProfile(query, updateObj);
              console.log("userUpdated", userUpdated);
              try {
                if (userUpdated) {
                  let filteredUserResponseFields =
                    mapper.filteredUserResponseFields(userUpdated);
                  let usrObj = {
                    _id: userUpdated._id,
                    email: userUpdated.email.toLowerCase(),
                    // userName: userUpdated.userName,
                  };
                  const results = await Promise.all([
                    jwtHandler.genUserToken(usrObj),
                  ]);
                  let token = results[0];
                  filteredUserResponseFields.token = token;
                  if (details.email) {
                    return mapper.responseMappingWithData(
                      userConstant.CODE.Success,
                      userConstant.MESSAGE.LoginSuccess,
                      filteredUserResponseFields
                    );
                  } else {
                    return mapper.responseMappingWithData(
                      userConstant.CODE.Success,
                      userConstant.MESSAGE.UserNameLoginSuccess,
                      filteredUserResponseFields
                    );
                  }
                } else {
                  // console.log("inside else");
                  return mapper.responseMapping(
                    userConstant.CODE.INTRNLSRVR,
                    userConstant.MESSAGE.internalServerError
                  );
                }
              } catch (err) {
                console.log({ err });
                return mapper.responseMapping(
                  userConstant.CODE.INTRNLSRVR,
                  userConstant.MESSAGE.internalServerError
                );
              }
            }
          } else {
            return mapper.responseMapping(
              userConstant.CODE.BadRequest,
              userConstant.MESSAGE.InvalidPassword
            );
          }
        } else {
          return mapper.responseMapping(
            userConstant.CODE.FRBDN,
            userConstant.MESSAGE.DeactivatedUser
          );
        }
      } else {
        return mapper.responseMapping(
          userConstant.CODE.DataNotFound,
          userConstant.MESSAGE.InvalidCredentials
        );
      }
    }
  } catch (err) {
    console.log({ err });
    return mapper.responseMapping(
      userConstant.CODE.INTRNLSRVR,
      userConstant.MESSAGE.internalServerError
    );
  }
}

async function setNewPassword(token, password, tokenData) {
  try {
    if (!token || !password) {
      return mapper.responseMapping(
        userConstant.CODE.BadRequest,
        userConstant.MESSAGE.InvalidDetails
      );
    } else {
      let query = { email: tokenData.email };
      let isUserExists = await dao.getUserDetails(query);
      console.log("isUserExists", isUserExists);
      // return false
      if (isUserExists && isUserExists.forgotPasswordToken === token) {
        // if(isUserExists.forgotPasswordToken === token){
        // return("valid token yes")

        // }
        let currentTime = Date.now();
        if (isUserExists.tokenExpiryTime > currentTime) {
          // return("not expired yet")

          let newPass = await appUtils.convertPass(password);
          let query = {
            email: isUserExists.email,
          };
          let updateObj = {
            password: newPass,
          };
          const updateDone = await dao.updateProfile(query, updateObj);
          if (updateDone) {
            return mapper.responseMapping(
              userConstant.CODE.Success,
              userConstant.MESSAGE.Success
            );
          }
        } else {
          return mapper.responseMapping(
            userConstant.CODE.ReqTimeOut,
            userConstant.MESSAGE.TimeOut
          );
        }
      } else {
        return mapper.responseMapping(
          userConstant.CODE.DataNotFound,
          userConstant.MESSAGE.InvalidToken
        );
      }
    }
  } catch (err) {
    console.log({ err });
    return mapper.responseMapping(
      userConstant.CODE.INTRNLSRVR,
      userConstant.MESSAGE.internalServerError
    );
  }
}

async function getAllUsers(key, skip, limit, id) {
  try {
    let aggregateQuery = [{ $sort: { userName: 1 } }];
    aggregateQuery.push({ $match: { role: constants.USER_TYPE.USER } });

    console.log(id);

    if (id) {
      aggregateQuery.push(
        {
          // $match: {_id: ObjectId(queryParams.id)},
          $match: {
            _id: ObjectId(id),
          },
        },
        {
          $unwind: "$friends",
        },
        {
          $lookup: {
            from: "users",
            localField: "friends._id",
            foreignField: "_id",
            as: "friendsInfo",
          },
        },
        {
          $unwind: "$friends",
        }
      );
      if (key && key !== "") {
        aggregateQuery.push({
          $match: {
            $or: [
              { "friendsInfo.userName": { $regex: key } },
              // { "friendsInfo.gender": { $regex: key } },
              // { "friendsInfo.email": { $regex: key } },
            ],
          },
        });
      }
      aggregateQuery.push(
        { $skip: skip ? parseInt(skip) : 0 },
        { $limit: limit ? parseInt(limit) : 10 }
      );
      aggregateQuery.push({
        $project: {
          "friendsInfo.userName": 1,
          "friendsInfo.email": 1,
          "friendsInfo.gender": 1,
          "friendsInfo.posts": 1,
          "friendsInfo.status": 1,
          "friendsInfo.dob": 1,
          "friendsInfo.friends": 1,
          "friendsInfo.requests": 1,
        },
      });
    } else {
      if (key && key !== "") {
        aggregateQuery.push({
          $match: {
            $or: [
              { userName: { $regex: key } },
              // { "gender": { $regex: key } },
              // { "email": { $regex: key } },
            ],
          },
        });
      }

      aggregateQuery.push(
        { $skip: skip ? parseInt(skip) : 0 },
        { $limit: limit ? parseInt(limit) : 10 }
      );
      aggregateQuery.push({
        $project: {
          userName: 1,
          email: 1,
          gender: 1,
          friendsInfo: 1,
          posts: 1,
          // status: 1,
          dob: 1,
          friends: 1,
          requests: 1,
          profilePhoto:1
        },
      });
    }

    const aggregatedResult = await dao.getAllUserDetailsByQuery(aggregateQuery);
    console.log(aggregatedResult);

    if (aggregatedResult.length > 0) {
      let total = aggregatedResult.length;

      let responseObj = {
        totalRecords: total,
        records: aggregatedResult,
      };
      return mapper.responseMappingWithData(
        userConstant.CODE.Success,
        userConstant.MESSAGE.Success,
        responseObj
      );
    } else {
      let total = aggregatedResult.length;

      let responseObj = {
        totalRecords: total,
        records: aggregatedResult,
        message: "Records not found",
      };
      return mapper.responseMappingWithData(
        userConstant.CODE.Success,
        userConstant.MESSAGE.Success,
        responseObj
      );
    }
  } catch (error) {
    console.log(error);
    return mapper.responseMapping(
      userConstant.CODE.INTRNLSRVR,
      userConstant.MESSAGE.internalServerError
    );
  }
}

async function acceptFriendRequest(details) {
  try {
    let userQuery = {
      _id: details.userId,
      status: constants.STATUS.ACTIVE,
      role: constants.USER_TYPE.USER,
    };
    const userDetails = await dao.getUserDetails(userQuery);
    console.log("userDetails", userDetails);
    if (userDetails) {
      let friendQuery = {
        _id: details.friendId,
        status: constants.STATUS.ACTIVE,
        role: constants.USER_TYPE.USER,
      };
      const friendsDetails = await dao.getUserDetails(friendQuery);
      // console.log("friendsDetails", friendsDetails);
      if (friendsDetails) {
        let userFriendsArray = userDetails.friends;
        let userRequestsArray = userDetails.requests;

        // console.log("userRequestsArray", userRequestsArray);

        if (userRequestsArray.length > 0) {
          for (let i = 0; i < userRequestsArray.length; i++) {
            // console.log(userRequestsArray[i]._id)

            if (userRequestsArray[i]._id == details.friendId) {
              console.log(
                "inside iffffffffffffffffffffffffffffffffffffffffffff"
              );
              userRequestsArray.splice(i, 1);
              userFriendsArray.push({
                _id: details.friendId,
              });
            }
          }

          // console.log(userRequestsArray ,userFriendsArray);
          // return false;
          let userUpdateObj = {
            friends: userFriendsArray,
            requests: userRequestsArray,
          };
          let friendUpdateObj = {
            friends: { _id: details.userId },
          };

          const updateListOfUsersFriend = await dao.updateProfile(
            userQuery,
            userUpdateObj
          );

          const updateListOfFriends = await dao.updateProfile(
            friendQuery,
            friendUpdateObj
          );

          if (updateListOfUsersFriend && updateListOfFriends) {
            return mapper.responseMapping(
              userConstant.CODE.Success,
              userConstant.MESSAGE.Success
            );
          } else {
            return mapper.responseMapping(
              userConstant.CODE.INTRNLSRVR,
              userConstant.MESSAGE.internalServerError
            );
          }
        } else {
          return mapper.responseMapping(
            userConstant.CODE.DataNotFound,
            userConstant.MESSAGE.NoRequestsFound
          );
        }
      } else {
        return mapper.responseMapping(
          userConstant.CODE.DataNotFound,
          userConstant.MESSAGE.NoUserFound
        );
      }
    } else {
      return mapper.responseMapping(
        userConstant.CODE.DataNotFound,
        userConstant.MESSAGE.NoUserFound
      );
    }
  } catch (error) {
    console.log("err", error);
    return mapper.responseMapping(
      userConstant.CODE.INTRNLSRVR,
      userConstant.MESSAGE.internalServerError
    );
  }
}

async function addToFriend(userId, friendId) {
  try {
    let query = {
      _id: userId,
      role: constants.USER_TYPE.USER,
      status: constants.STATUS.ACTIVE,
    };
    let userDetails = await dao.getUserDetails(query);

    if (userDetails) {
      let friendQuery = {
        _id: friendId,
        role: constants.USER_TYPE.USER,
        status: constants.STATUS.ACTIVE,
      };
      let friendsDeatils = await dao.getUserDetails(friendQuery);

      if (friendsDeatils) {
        let friendRequests = friendsDeatils.requests;

        friendRequests.push({
          _id: userId,
        });
        let updateQuery = {
          _id: friendId,
        };
        let updateObj = {
          requests: friendRequests,
        };
        let updateAddFriendList = await dao.updateProfile(
          updateQuery,
          updateObj
        );
        if (updateAddFriendList) {
          return mapper.responseMapping(
            userConstant.CODE.Success,
            userConstant.MESSAGE.Success
          );
        } else {
          return mapper.responseMapping(
            userConstant.CODE.INTRNLSRVR,
            userConstant.MESSAGE.internalServerError
          );
        }
      } else {
        return mapper.responseMapping(
          userConstant.CODE.DataNotFound,
          userConstant.MESSAGE.NoUserFound
        );
      }
    } else {
      return mapper.responseMapping(
        userConstant.CODE.DataNotFound,
        userConstant.MESSAGE.NoUserFound
      );
    }
  } catch (error) {
    return mapper.responseMapping(
      userConstant.CODE.INTRNLSRVR,
      userConstant.MESSAGE.internalServerError
    );
  }
}

async function forgotPassword(email) {
  try {
    let query = {
      email: email.toLowerCase(),
    };
    const userDetails = await dao.getUserDetails(query);
    // console.log("userDetails",userDetails);
    if (userDetails) {
      // console.log("inside the block");
      let usrObj = {
        email: userDetails.email.toLowerCase(),
        tokenExpiryTime: new Date().getTime() + 30 * 60 * 1000,
      };
      const results = await Promise.all([jwtHandler.genUserToken(usrObj)]);
      console.log("results in forgotpass", results);
      let token = results[0];
      console.log("inside forgot password token", token);
      let updateObj = {
        forgotPasswordToken: token,
        tokenExpiryTime: new Date().getTime() + 30 * 60 * 1000,
      };
      let updateToken = await dao.updateProfile(query, updateObj);
      // console.log("updateToken", updateToken);
      let templateQuery = {
        mailName: constants.EMAIL_TEMPLATES.USER_FORGOT_PASSWORD,
      };
      let templateDetails = await dao.getTemplateDetails(templateQuery);

      if (templateDetails) {
        let mailUserDetails = {
          userName: userDetails.userName,
          email: userDetails.email.toLowerCase(),
          forgotPasswordUrl: `${process.env.URL}setNewPassword/${token}`,
        };
        mailHandler.SEND_MAIL(mailUserDetails, templateDetails);
        return mapper.responseMapping(
          userConstant.CODE.Success,
          userConstant.MESSAGE.ResetPasswordMailSent
        );
      } else {
        return mapper.responseMapping(
          userConstant.CODE.DataNotFound,
          userConstant.MESSAGE.TemplateNotFound
        );
      }
    } else {
      return mapper.responseMapping(
        userConstant.CODE.DataNotFound,
        userConstant.MESSAGE.InavalidEmailAddress
      );
    }
  } catch (error) {
    return mapper.responseMapping(
      userConstant.CODE.INTRNLSRVR,
      userConstant.MESSAGE.internalServerError
    );
  }
}

async function changePassword(id, details) {
  try {
    let query = {
      _id: id,
    };
    const userDetails = await dao.getUserDetails(query);
    if (userDetails) {
      let isMatchingPassword = await appUtils.verifyPassword(
        details.currentPassword,
        userDetails.password
      );
      if (isMatchingPassword) {
        let newPasswordForUser = await appUtils.convertPass(
          details.newPassword
        );
        let updateObj = {
          password: newPasswordForUser,
        };
        const updatePassword = await dao.updateProfile(query, updateObj);
        if (updatePassword) {
          let templateQuery = {
            mailName: constants.EMAIL_TEMPLATES.USER_RESET_PASSWORD,
          };
          let templateDetails = await dao.getTemplateDetails(templateQuery);

          if (templateDetails) {
            let mailUserDetails = {
              email: userDetails.email,
              userName: userDetails.userName,
            };
            mailHandler.SEND_MAIL(mailUserDetails, templateDetails);
          } else {
            return mapper.responseMapping(
              userConstant.CODE.DataNotFound,
              userConstant.MESSAGE.TemplateNotFound
            );
          }
          return mapper.responseMapping(
            userConstant.CODE.Success,
            userConstant.MESSAGE.PasswordUpdateSuccess
          );
        } else {
          return mapper.responseMapping(
            userConstant.CODE.BadRequest,
            userConstant.MESSAGE.PasswordUpdatedFailed
          );
        }
      } else {
        return mapper.responseMapping(
          userConstant.CODE.BadRequest,
          userConstant.MESSAGE.OldPasswordDoesNotMatch
        );
      }
    } else {
      return mapper.responseMapping(
        userConstant.CODE.DataNotFound,
        userConstant.MESSAGE.InvalidCredentials
      );
    }
  } catch (error) {
    return mapper.responseMapping(
      userConstant.CODE.INTRNLSRVR,
      userConstant.MESSAGE.internalServerError
    );
  }
}

async function twoFactorAuthToggle(details) {
  try {
    let query = {
      email: details.email,
    };
    let userDetails = await dao.getUserDetails(query);
    if (userDetails) {
      let updateObj = {
        twoFactorAuthentication: details.twoFactorAuthentication,
      };
      let updatedUser = await dao.updateProfile(query, updateObj);
      if (updatedUser) {
        return mapper.responseMapping(
          userConstant.CODE.Success,
          userConstant.MESSAGE.Success
        );
      } else {
        return mapper.responseMapping(
          userConstant.CODE.INTRNLSRVR,
          userConstant.MESSAGE.internalServerError
        );
      }
    } else {
      return mapper.responseMapping(
        userConstant.CODE.DataNotFound,
        userConstant.MESSAGE.DATANOTFOUND
      );
    }
  } catch (error) {
    return mapper.responseMapping(
      userConstant.CODE.INTRNLSRVR,
      userConstant.MESSAGE.internalServerError
    );
  }
}

async function addFeeds(req) {
  let details = req.body;
  if (!details || Object.keys(details).length == 0 || !details.userName) {
    return mapper.responseMapping(
      userConstant.CODE.BadRequest,
      userConstant.MESSAGE.InvalidDetails
    );
  } else {
    // fileUtils.upload(req, res, async (err) => {

    let query = {
      userName: details.userName,
      role: constants.USER_TYPE.USER,
    };
    const userDetails = await dao.getUserDetails(query);
    // console.log(userDetails)
    if (userDetails) {
      let file = req.file;
      console.log("file", file);
      const result = await appUtils.uploadImage(file);
      // console.log("result", result.url);

      if (result && result.url) {
        userDetails.posts.push({
          createdAt: Date.now(),
          description: details.description,
          imageURL: result.url,
        });
        let updateQuery = {
          _id: userDetails._id,
          userName: details.userName,
        };

        let updateObj = {
          posts: userDetails.posts,
        };
        let updatedProfile = await dao.updateProfile(updateQuery, updateObj);
        // console.log("updatedProfile",updatedProfile)
        if (updatedProfile) {
          // console.log("inside if");
          return mapper.responseMapping(
            userConstant.CODE.Success,
            userConstant.MESSAGE.Success
          );
        } else {
          return mapper.responseMapping(
            userConstant.CODE.INTRNLSRVR,
            userConstant.MESSAGE.internalServerError
          );
        }
      } else {
        return mapper.responseMapping(
          userConstant.CODE.INTRNLSRVR,
          userConstant.MESSAGE.internalServerError
        );
      }
    } else {
      // console.log("no found");
      return mapper.responseMapping(
        userConstant.CODE.DataNotFound,
        userConstant.MESSAGE.DATANOTFOUND
      );
    }
  }
  // })
}

// async function commonForLikeComment
async function addLike(details) {
  // let details = req.body;
  if (
    !details ||
    Object.keys(details).length == 0 ||
    !details.userName ||
    !details.friendsUserName
  ) {
    return mapper.responseMapping(
      userConstant.CODE.BadRequest,
      userConstant.MESSAGE.InvalidDetails
    );
  } else {
    let userQuery = {
      userName: details.userName,
      role: constants.USER_TYPE.USER,
    };
    let userDeatils = await dao.getUserDetails(userQuery);
    if (userDeatils) {
      let friendQuery = {
        userName: details.friendsUserName,
        role: constants.USER_TYPE.USER,
      };
      let friendsDeatils = await dao.getUserDetails(friendQuery);
      if (friendsDeatils) {
        let postArray = friendsDeatils.posts;

        let objIndex = postArray.findIndex(
          (array) => array._id == details.post_id
        );
        // console.log("objIndex",objIndex);
        if (objIndex === -1) {
          return mapper.responseMapping(
            userConstant.CODE.DataNotFound,
            userConstant.MESSAGE.NoPostsFound
          );
        } else {
          let likesArray = postArray[objIndex].likesBy;
          console.log("likesArray", likesArray);
          let filteredArray = likesArray.filter(
            (array) => array.userName === details.userName
          );
          // console.log("filterdArray",filteredArray);
          if (filteredArray.length > 0) {
            return mapper.responseMapping(
              userConstant.CODE.BadRequest,
              "you have already liked this post"
            );
          } else {
            likesArray.push({
              userName: details.userName,
            });
            // return false;
            postArray[objIndex].likesBy = likesArray;
            postArray[objIndex].likesCount = postArray[objIndex].likesCount + 1;
            // console.log("postArray",postArray)
            let updateObj = {};

            updateObj.posts = postArray;
            let updateFriendsProfile = await dao.updateProfile(
              friendQuery,
              updateObj
            );
            // console.log("updateFriendsProfile",updateFriendsProfile);
            if (updateFriendsProfile) {
              return mapper.responseMapping(
                userConstant.CODE.Success,
                userConstant.MESSAGE.Success
              );
            } else {
              return mapper.responseMapping(
                userConstant.CODE.INTRNLSRVR,
                userConstant.MESSAGE.internalServerError
              );
            }
          }
        }
      } else {
        return mapper.responseMapping(
          userConstant.CODE.DataNotFound,
          userConstant.MESSAGE.NoUserFound
        );
      }
    } else {
      return mapper.responseMapping(
        userConstant.CODE.DataNotFound,
        userConstant.MESSAGE.DATANOTFOUND
      );
    }
  }
}

async function addComment(details) {
  if (
    !details ||
    Object.keys(details).length == 0 ||
    !details.userName ||
    !details.friendsUserName
  ) {
    return mapper.responseMapping(
      userConstant.CODE.BadRequest,
      userConstant.MESSAGE.InvalidDetails
    );
  } else {
    let userQuery = {
      userName: details.userName,
      role: constants.USER_TYPE.USER,
    };
    let userDeatils = await dao.getUserDetails(userQuery);
    // console.log("userDetails" ,userDeatils)
    if (userDeatils) {
      let friendQuery = {
        userName: details.friendsUserName,
        role: constants.USER_TYPE.USER,
      };
      let friendsDeatils = await dao.getUserDetails(friendQuery);
      // console.log("friendsDeatils",friendsDeatils);
      if (friendsDeatils) {
        let postArray = friendsDeatils.posts;

        let objIndex = postArray.findIndex(
          (array) => array._id == details.post_id
        );
        console.log("objIndex", objIndex);
        if (objIndex === -1) {
          return mapper.responseMapping(
            userConstant.CODE.DataNotFound,
            userConstant.MESSAGE.NoPostsFound
          );
        } else {
          let commentsArray = postArray[objIndex].comments;

          commentsArray.push({
            userName: details.userName,
            description: details.description,
            createdAt: Date.now(),
          });
          // console.log("commentsArray", commentsArray);
          //
          postArray[objIndex].comments = commentsArray;
          // console.log("postArray", postArray);

          let updateObj = {};

          updateObj.posts = postArray;
          // console.log("updateObj", updateObj);
          let updateFriendsProfile = await dao.updateProfile(
            friendQuery,
            updateObj
          );
          // console.log("updateFriendsProfile", updateFriendsProfile.posts);
          if (updateFriendsProfile) {
            return mapper.responseMapping(
              userConstant.CODE.Success,
              userConstant.MESSAGE.Success
            );
          } else {
            return mapper.responseMapping(
              userConstant.CODE.INTRNLSRVR,
              userConstant.MESSAGE.internalServerError
            );
          }
        }
      } else {
        return mapper.responseMapping(
          userConstant.CODE.DataNotFound,
          userConstant.MESSAGE.NoUserFound
        );
      }
    } else {
      return mapper.responseMapping(
        userConstant.CODE.DataNotFound,
        userConstant.MESSAGE.DATANOTFOUND
      );
    }
  }
}

async function getAllRequests(key, skip, limit, id) {
  try {
    if (id && ObjectId.isValid(id)) {
      let query = {
        _id: id,
        role: constants.USER_TYPE.USER,
      };
      let user = await dao.getUserDetails(query);
      console.log(user)
      if (user) {
        let aggregateQuery = [{ $sort: { userName: 1 } }];
        aggregateQuery.push({ $match: { role: constants.USER_TYPE.USER } });

        console.log(id);
        aggregateQuery.push(
          {
            // $match: {_id: ObjectId(queryParams.id)},
            $match: {
              _id: ObjectId(id),
            },
          },
          {
            $unwind: "$requests",
          },
          {
            $lookup: {
              from: "users",
              localField: "requests._id",
              foreignField: "_id",
              as: "requestsInfo",
            },
          }
          // {
          //   $unwind: "$requests",
          // }
        );
        if (key && key !== "") {
          aggregateQuery.push({
            $match: {
              $or: [
                { "requestsInfo.userName": { $regex: key } },
                // { "friendsInfo.gender": { $regex: key } },
                // { "friendsInfo.email": { $regex: key } },
              ],
            },
          });
        }
        aggregateQuery.push(
          { $skip: skip ? parseInt(skip) : 0 },
          { $limit: limit ? parseInt(limit) : 10 }
        );
        aggregateQuery.push({
          $project: {
            "requestsInfo.userName": 1,
            "requestsInfo.email": 1,
            "requestsInfo.gender": 1,
            "requestsInfo.posts": 1,
            // "requestsInfo.status": 1,
            "requestsInfo.dob": 1,
            "requestsInfo.friends": 1,
            "requestsInfo.requests": 1,
            "requestsInfo.profilePhoto":1
          },
        });
        const aggregatedResult = await dao.getAllUserDetailsByQuery(
          aggregateQuery
        );
        console.log(aggregatedResult);

        if (aggregatedResult.length > 0) {
          let total = aggregatedResult.length;

          let responseObj = {
            totalRecords: total,
            records: aggregatedResult,
          };
          return mapper.responseMappingWithData(
            userConstant.CODE.Success,
            userConstant.MESSAGE.Success,
            responseObj
          );
        } else {
          let total = aggregatedResult.length;

          let responseObj = {
            totalRecords: total,
            records: aggregatedResult,
            message: "Records not found",
          };
          return mapper.responseMappingWithData(
            userConstant.CODE.Success,
            userConstant.MESSAGE.Success,
            responseObj
          );
        }
      } else {
        return mapper.responseMapping(
          userConstant.CODE.DataNotFound,
          userConstant.MESSAGE.NoUserFound
        );
      }
    } else {
      return mapper.responseMapping(
        userConstant.CODE.BadRequest,
        userConstant.MESSAGE.InvalidDetails
      );
    }
    //  else {
    //   if (key && key !== "") {
    //     aggregateQuery.push({
    //       $match: {
    //         $or: [
    //           { userName: { $regex: key } },
    //           // { "gender": { $regex: key } },
    //           // { "email": { $regex: key } },
    //         ],
    //       },
    //     });
    //   }

    //   aggregateQuery.push(
    //     { $skip: skip ? parseInt(skip) : 0 },
    //     { $limit: limit ? parseInt(limit) : 10 }
    //   );
    //   aggregateQuery.push({
    //     $project: {
    //       userName: 1,
    //       email: 1,
    //       gender: 1,
    //       requests0Info: 1,
    //       posts: 1,
    //       status: 1,
    //       dob: 1,
    //       friends: 1,
    //       requests: 1,
    //     },
    //   });
    // }
  } catch (error) {
    console.log(error);
    return mapper.responseMapping(
      userConstant.CODE.INTRNLSRVR,
      userConstant.MESSAGE.internalServerError
    );
  }
}

async function uploadProfilePic(req) {
  let details = req.body;
  if (!details || Object.keys(details).length == 0 || !details.userName) {
    return mapper.responseMapping(
      userConstant.CODE.BadRequest,
      userConstant.MESSAGE.InvalidDetails
    );
  } else {
    let query = {
      userName: details.userName,
      role: constants.USER_TYPE.USER,
    };
    const userDetails = await dao.getUserDetails(query);
    if (userDetails) {
      let file = req.file;
      console.log("file", file);
      const result = await appUtils.uploadImage(file);
      // console.log("result",result)
      if (result && result.url) {
        let updateQuery = {
          _id: userDetails._id,
          userName: details.userName,
          // role:constants.USER_TYPE.USER
        };
        let updateObj = {
          profilePhoto: result.url,
        };
        let updateProfile = await dao.updateProfile(updateQuery, updateObj);
        // console.log("updateProfile",updateProfile)
        if (updateProfile) {
          return mapper.responseMapping(
            userConstant.CODE.Success,
            userConstant.MESSAGE.Success
          );
        } else {
          return mapper.responseMapping(
            userConstant.CODE.INTRNLSRVR,
            userConstant.MESSAGE.internalServerError
          );
        }
      } else {
        return mapper.responseMapping(
          userConstant.CODE.INTRNLSRVR,
          userConstant.MESSAGE.internalServerError
        );
      }
    } else {
      return mapper.responseMapping(
        userConstant.CODE.DataNotFound,
        userConstant.MESSAGE.DATANOTFOUND
      );
    }
  }
}

async function replyToComment(details) {
  if (!details || !details.userName || Object.keys(details).length == 0) {
    return mapper.responseMapping(
      userConstant.CODE.BadRequest,
      userConstant.MESSAGE.InvalidDetails
    );
  } else {
    let userQuery = {
      userName: details.userName,
      role: constants.USER_TYPE.USER, //userName of that person : in who's post the another user are commenting
    };
    let userDetails = await dao.getUserDetails(userQuery);
    // console.log("userDetails" , userDetails)
    if (userDetails) {
      let fromUserQuery = {
        userName: details.from,
        role: constants.USER_TYPE.USER,
      };
      let fromUserDetails = await dao.getUserDetails(fromUserQuery);
      // console.log("fromUserDetails" , fromUserDetails);
      if (fromUserDetails) {
        // let array = userDetails.posts
        // console.log("array",array)
        let index = userDetails.posts.findIndex(
          (post) => post._id == details.post_id
        );
        console.log("index", index);
        if (index === -1) {
          return mapper.responseMapping(
            userConstant.CODE.DataNotFound,
            userConstant.MESSAGE.NoPostsFound
          );
        } else {
          console.log(userDetails.posts[index].comments);
          let commentsArray = userDetails.posts[index].comments;
          let commentIndex = commentsArray.findIndex(
            (comment) => comment._id == details.comment_id
          );
          console.log(commentIndex);
          if (commentIndex === -1) {
            return mapper.responseMapping(
              userConstant.CODE.DataNotFound,
              userConstant.MESSAGE.NoCommentFound
            );
          }else{
            console.log(commentsArray[commentIndex].commentReplies);
            let commentsRepliesArray = commentsArray[commentIndex].commentReplies 
            // console.log(commentsRepliesArray);
            commentsRepliesArray.push({
              
            })
          }
        }
      }
    }
  }
}

async function getOneUser(id) {
  try {
    let query = {
      _id: id,
    };
    let user = await dao.getUserDetails(query);

    if (user) {
      let filteredUserResponseFields = mapper.filteredUserResponseFields(user);
      return mapper.responseMappingWithData(
        userConstant.CODE.Success,
        userConstant.MESSAGE.Success,
        filteredUserResponseFields
      );
    } else {
      return mapper.responseMapping(
        userConstant.CODE.DataNotFound,
        userConstant.MESSAGE.TemplateNotFound
      );
    }
  } catch (error) {
    return mapper.responseMapping(
      userConstant.CODE.INTRNLSRVR,
      userConstant.MESSAGE.internalServerError
    );
  }
}

module.exports = {
  registerUser,
  sendCode,
  verifySecurityCode,
  login,
  setNewPassword,
  addToFriend,
  forgotPassword,
  getAllUsers,
  acceptFriendRequest,
  changePassword,
  twoFactorAuthToggle,
  addFeeds,
  addLike,
  addComment,
  getAllRequests,
  uploadProfilePic,
  replyToComment,
  getOneUser,
};
// try {

//   fileUtils.upload(req, res, async (err) => {
//     try {
//       console.log("err",err);
//       if (err) {
//         console.log("er",err);
//       }else{
//         let file = req.file;
//         console.log("file",file)
//         const result = await appUtils.uploadImage(file);
//         console.log("result", result);
//       }
//     } catch (error) {
//       console.log("error",error)
//     }
//   });
// } catch (error) {
//   console.log("error",error);
// }
