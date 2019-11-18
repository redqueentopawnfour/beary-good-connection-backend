//Get the connection to Heroku Database
let db = require('./sql_conn.js');

//We use this create the SHA256 hash
const crypto = require("crypto");

var nodemailer = require("nodemailer");

function sendEmail(from, receiver, subj, message) {
  var transporter = nodemailer.createTransport({
    service: "gmail"
    , auth: {
      user: "bearygoodconnection@gmail.com"
      , pass: process.env.EMAIL_PASS
      // Add the password to your env variables: "tcss450Fall"
    }
  });

  var mailOptions = {
    from: from
    , to: receiver
    , subject: subj
     , html: message
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log("Couldn't send email because: " + error);
    } else {
      console.log("Email sent: " + info.response);
    }
  }); 
}

/**
 * Method to get a salted hash.
 * We put this in its own method to keep consistency
 * @param {string} pw the password to hash
 * @param {string} salt the salt to use when hashing
 */
function getHash(pw, salt) {
    return crypto.createHash("sha256").update(pw + salt).digest("hex");
}

let messaging = require('./pushy_services.js');

module.exports = { 
    db, getHash, sendEmail, messaging
};
