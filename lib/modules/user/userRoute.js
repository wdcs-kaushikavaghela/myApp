// const multer = require("multer")
const router = require("express").Router();
const service = require("./userService");
const validators = require("./userValidators");
const userConstants = require("./userConstants");
const mapper = require("./userMapper");
const fileUtils = require("../../middleware/multer");
const appUtils = require("../../appUtils");

router
  .route("/register")
  .post([validators.checkRegisterRequest], (req, res) => {
    let details = req.body;
    service
      .registerUser(details)
      .then((result) => {
        res.send(result);
      })
      .catch((error) => {
        res.send(
          mapper.responseMapping(
            userConstants.CODE.INTRNLSRVR,
            userConstants.MESSAGE.internalServerError
          )
        );
      });
  });

router
  .route("/sendCode")
  .post([validators.checkSendCodeRequest], (req, res) => {
    let details = req.body;
    service
      .sendCode(details)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        res.send(
          mapper.responseMapping(
            userConstants.CODE.INTRNLSRVR,
            userConstants.MESSAGE.internalServerError
          )
        );
      });
  });

router
  .route("/verifySecurityCode/:id")
  .post([validators.checkSecurityCodeVerificationRequest], (req, res) => {
    let { id } = req.params;
    let { OTP } = req.body;
    service
      .verifySecurityCode(id, OTP)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        res.send(
          mapper.responseMapping(
            userConstants.CODE.INTRNLSRVR,
            userConstants.MESSAGE.internalServerError
          )
        );
      });
  });

router.route("/login").post([validators.checkLoginRequest], (req, res) => {
  let details = req.body;
  service
    .login(details)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      console.log({ err });
      res.send(
        mapper.responseMapping(
          userConstants.CODE.INTRNLSRVR,
          userConstants.MESSAGE.internalServerError
        )
      );
    });
});

router
  .route("/changePassword/:id")
  .post([validators.checkToken], (req, res) => {
    let { id } = req.params;
    let details = req.body;

    service
      .changePassword(id, details)
      .then((result) => {
        res.send(result);
      })
      .catch((error) => {
        res.send(
          mapper.responseMapping(
            userConstants.CODE.INTRNLSRVR,
            userConstants.MESSAGE.internalServerError
          )
        );
      });
  });

router
  .route("/forgotPassword/")
  .post([validators.checkForgotPasswordRequest], (req, res) => {
    let { email } = req.body;
    service
      .forgotPassword(email)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        res.send(
          mapper.responseMapping(
            userConstants.CODE.INTRNLSRVR,
            userConstants.MESSAGE.internalServerError
          )
        );
      });
  });

  router
  .route("/setNewPassword/:token")
  .post([validators.checkSetNewPasswordRequest], (req, res) => {
    let { token } = req.params;
    let { password } = req.body;
    let tokenData = req.tokenPayload
    service
      .setNewPassword(token, password , tokenData)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        console.log({ err });
        res.send(
          mapper.responseMapping(
            userConstants.CODE.INTRNLSRVR,
            userConstants.MESSAGE.internalServerError
          )
        );
      });
    // res.send("ok")
  });

router
  .route("/addToFriend")
  .put([validators.checkAddToFriendRequest], (req, res) => {
    let { from, to } = req.body;
    service
      .addToFriend(from, to)
      .then((result) => {
        res.send(result);
      })
      .catch((error) => {
        res.send(
          mapper.responseMapping(
            userConstants.CODE.INTRNLSRVR,
            userConstants.MESSAGE.internalServerError
          )
        );
      });
  });

router
  .route("/acceptFriendRequest")
  .put([validators.checkAcceptFriendRequest], (req, res) => {
    let details = req.body;
    service
      .acceptFriendRequest(details)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        res.send(
          mapper.responseMapping(
            userConstants.CODE.INTRNLSRVR,
            userConstants.MESSAGE.internalServerError
          )
        );
      });
  });

router.route("/getAllUsers").get((req, res) => {

 
  let request  = req.query

  service
    .getAllUsers(request)
    .then((result) => {
      res.send(result);
    })
    .catch((error) => {
      console.log(error);
      res.send(
        mapper.responseMapping(
          userConstants.CODE.INTRNLSRVR,
          userConstants.MESSAGE.internalServerError
        )
      );
    });
});

router.route("/getAllRequests").get((req, res) => {
  let { key, skip, limit ,id} = req.query;

  service
    .getAllRequests(key, skip, limit, id)
    .then((result) => {
      res.send(result);
    })
    .catch((error) => {
      console.log(error);
      res.send(
        mapper.responseMapping(
          userConstants.CODE.INTRNLSRVR,
          userConstants.MESSAGE.internalServerError
        )
      );
    });
});

router
  .route("/onTwoFactorAuthToggle")
  .put([validators.checkTwoFactorAuthToggle], (req, res) => {
    let details = req.body;
    service
      .twoFactorAuthToggle(details)
      .then((result) => {
        res.send(result);
      })
      .catch((error) => {
        console.log(error);
        res.send(
          mapper.responseMapping(
            userConstants.CODE.INTRNLSRVR,
            userConstants.MESSAGE.internalServerError
          )
        );
      });
  });

router.route("/addFeeds/:id").post([validators.checkToken],async (req, res) => {
  // try {
  fileUtils.upload(req, res, async (err) => {
    service
      .addFeeds(req)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        console.log(err);
        res.send(err);

      });
  });
});

router.route("/addLike").put(async (req, res) => {
  let details = req.body;
  service
    .addLike(details)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      console.log(err);
    });
});

router.route("/dislikePost").put(async (req, res) => {
  let details = req.body;
  service
    .dislikePost(details)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      console.log(err);
    });
});

router.route("/addComment").put(async (req, res) => {
  let details = req.body;
  service
    .addComment(details)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      console.log("err", err);
    });
});

router.route("/addReplyToComment").put([validators.checkReplyToComment],async (req,res)=>{
 let details = req.body
  service.replyToComment(details).then((result)=>{
       res.send(result)
  }).catch((err)=>{
   console.log("err", err);
  })
})

router.route("/uploadProfilePhoto").post(async (req,res)=>{
  try {
    fileUtils.uploadProfilePhoto(req, res, async (err) => {
      service
        .uploadProfilePic(req)
        .then((result) => {
          res.send(result);
        })
        .catch((err) => {
          console.log(err);
          res.send(err);
        });
    }); 
  } catch (error) {
    res.send(mapper.responseMapping(userConstants.CODE.INTRNLSRVR , userConstants.MESSAGE.internalServerError))
  }
})

router.route("/getOneUser/:id").get((req,res) => {
  let { id } = req.params;
  service.getOneUser(id).then((result)=>{
    res.send(result);
  }).catch((error) =>{
    console.log(error);
    res.send( mapper.responseMapping(
      userConstants.CODE.INTRNLSRVR,
      userConstants.MESSAGE.internalServerError
    ))
  })
})

module.exports = router;
