const express = require('express');

const crypto = require("crypto");

let db = require('../utilities/utils').db;

let getHash = require('../utilities/utils').getHash;

let sendEmail = require('../utilities/utils').sendEmail;

var router = express.Router();

const bodyParser = require("body-parser");

router.use(bodyParser.json());

router.post('/', (req, res) => {
    res.type("application/json");

    var first = req.body['first'];
    var last = req.body['last'];
    var username = req.body['username'];
    var email = req.body['email'];
    var password = req.body['password'];
    var usericon;

    if(first && last && username && email && password) {
        var iconNumber = getRandomIntInclusive(1, 5);
        var usericon = "bearicon" + iconNumber;
        
        if (email == "cfb3@uw.edu") {    // Red herring for Charles registering
            usericon = "fishicon1";
        }

        console.log(usericon);

        let salt = crypto.randomBytes(32).toString("hex");
        let salted_hash = getHash(password, salt);
        
        if (usericon) {
            let params = [first, last, username, email, salted_hash, salt, usericon, false];
            db.none("INSERT INTO MEMBERS(FirstName, LastName, Username, Email, Password, Salt, UserIcon, IsVerified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", params)
            .then(() => {
                var rand=Math.floor((Math.random() * 100) + 54);
                var link = "http://beary-good-connection.herokuapp.com/verify?id=" + rand + "&email=" + email;
                var memberId;
    
                db.none("UPDATE MEMBERS SET verification = $1 WHERE email = $2 ", [rand, email])
                .then(() => { 
                    console.log("verification updated in database for member: " + email);
                })
                .catch((err) => {
                    console.log(err);
                });;
                
                var message = "Hello,<br> Please Click on the link to verify your email.<br><a href=" + link + ">Click here to verify</a>";
               
                res.send({
                    success: true
                });
                sendEmail("bearygoodconnection@gmail.com", email, "Beary Good Connection welcomes you!", message);
            }).catch((err) => {
                console.log(err);
                res.send({
                    success: false,
                    error: "User already exists"
                });
            });
        }
    } else {
        res.send({
            success: false,
            input: req.body,
            error: "Missing required user information"
        });
    }
});

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
  }

module.exports = router;
