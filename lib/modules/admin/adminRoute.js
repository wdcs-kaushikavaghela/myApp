const router = require("express").Router();
const service = require("./adminService");
const validators = require("./adminValidators");
const adminConst = require("./adminConstants");
const mapper = require("./adminMapper");

router.route("/createTemplate/:id").post([validators.checkCreateTemplateRequest], (req, res) => {
    let { id } = req.params;
    let templateDetails = req.body;
    service.createTemplate(id, templateDetails).then((result) => {
        res.send(result);
      }).catch((err) => {
        console.log({ err });
        res.send(
          mapper.responseMapping(
            adminConst.CODE.INTRNLSRVR,
            adminConst.MESSAGE.internalServerError
          )
        );
      });
  });

router.route("/sendCode").post([validators.checkSendCodeRequest], (req, res) => {
    let details = req.body;
    service.sendCode(details).then((result) => {
        res.send(result);
      }).catch((err) => {
        res.send(
          mapper.responseMapping(
            adminConst.CODE.INTRNLSRVR,
            adminConst.MESSAGE.internalServerError
          )
        );
      });
  });

router.route("/login").post([validators.checkLoginRequest], (req, res) => {
  let details = req.body;
  service.login(details).then((result) => {
      res.send(result);
    }).catch((err) => {
      res.send(
        mapper.responseMapping(
          adminConst.CODE.INTRNLSRVR,
          adminConst.MESSAGE.internalServerError
        )
      );
    });
});

router.route("/verifySecurityCode/:id").post([validators.checkSecurityCodeVerificationRequest], (req, res) => {
    let { id } = req.params;
    let { OTP } = req.body;
    service.verifySecurityCode(id, OTP).then((result) => {
        res.send(result);
      }).catch((err) => {
        res.send(
          mapper.responseMapping(
            adminConst.CODE.INTRNLSRVR,
            adminConst.MESSAGE.internalServerError
          )
        );
      });
  });

router.route("/updateTemplate/:id/:templateId").put([validators.checkUpdateTemplateRequest], (req, res) => {
    let { id, templateId } = req.params;
    let templateUpdateDetails = req.body;
    service.updateTemplate(id, templateId, templateUpdateDetails).then((result) => {
        res.send(result);
      }).catch((error) => {
        res.send(
          mapper.responseMapping(
            adminConst.CODE.INTRNLSRVR,
            adminConst.MESSAGE.internalServerError
          )
        );
      });
  });

router.route("/getAllUsers").get((req,res) => {
    let {key,skip,limit} = req.query;
    service.getUsers(key,skip,limit).then((result)=>{
      res.send(result);
    }).catch((error) =>{
      res.send( mapper.responseMapping(
        adminConst.CODE.INTRNLSRVR,
        adminConst.MESSAGE.internalServerError
      ))
    })
  })

router.route("/editUser").put([validators.checkeditUserRequest],(req,res) => {
  let details = req.body;
    service.editUser(details).then((result)=>{
      res.send(result);
    }).catch((error) =>{
      console.log(error);
      res.send( mapper.responseMapping(
        adminConst.CODE.INTRNLSRVR,
        adminConst.MESSAGE.internalServerError
      ))
    })
})

router.route("/getAllTemplates").get((req,res) => {
    service.getAllTemplates().then((result)=>{
      res.send(result);
    }).catch((error) =>{
      console.log(error);
      res.send( mapper.responseMapping(
        adminConst.CODE.INTRNLSRVR,
        adminConst.MESSAGE.internalServerError
      ))
    })
})

module.exports = router;
