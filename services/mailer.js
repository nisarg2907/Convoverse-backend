const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SG_KEY);

const dotenv = require("dotenv");
dotenv.config({path: "../config.env"});

const sendSGMail = async({
    recipient,
    sender,
    subject,
    html,
    attachments
})=>{


    try {
       const from = sender || "workwithnisarg29@gmail.com";
        const msg = {
            to : recipient,
            from: from,
            subject,
            html: html,
            text : text ,
            attachments,
        }
    return sgMail.send(msg);


    } catch (error) {
        console.log(error);
    }
};




exports.sendEmail = async(args)=>{
  if(process.env.NODE_ENV==="development"){
 return new Promise.resolve();
  }else{
    return sendSGMail(args);
  }
}