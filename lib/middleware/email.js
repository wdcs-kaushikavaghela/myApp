const nodemailer = require("nodemailer");

const createMailOptions = (sender, receivers, subject, body) => {
  let mailDetails = {
    from: sender,
    to: receivers,
    subject: subject,
    html: body,
    // html:html
  };
  return mailDetails;
};

function sendEmail(mailOptions) {
  let EMAIL_CONFIG = {
    service: "gmail",
    auth: {
      // type:'PLAIN',
      user: process.env.EMAIL_SENDER_NAME, // generated ethereal user
      pass: process.env.EMAIL_PASSWORD, // generated ethereal password
    },
  };
  let transporter = nodemailer.createTransport(EMAIL_CONFIG);
  // transporter.sendMail(mailOptions, function(err, data) {
  //     if(err) {
  //         console.log('Error Occurs');
  //     } else {
  //         console.log('Email sent successfully');
  //     }
  // });

  return transporter.sendMail(mailOptions);
}

function value(cn) {
  return cn.replace(/\${(\w+)}/, "$1");
}

async function send_mail_logic(mailUserDetails, templateDetails) {
  if (templateDetails) {
    let mailBody = templateDetails.mailBody;
    let idx = mailBody.match(new RegExp(/\${\w+}/g));
    if (idx && idx.length > 0) {
      idx.map((val, id) => {
        mailBody = mailBody.replace(/\${\w+}/, mailUserDetails[value(idx[id])]);
        return val;
      });
    }
    let returnedValue = await createMailOptions(
      process.env.EMAIL_SENDER_NAME,
      mailUserDetails.email,
      templateDetails.mailSubject,
      mailBody
    );
    return sendEmail(returnedValue);
  } else {
    return true;
  }
}

function SEND_MAIL(mailUserDetails, templateDetails) {
  return send_mail_logic(mailUserDetails, templateDetails);
}

module.exports = {
  SEND_MAIL,
  createMailOptions,
};
