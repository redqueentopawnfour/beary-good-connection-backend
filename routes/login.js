//express is the framework we're going to use to handle requests
const express = require('express');

let db = require('../utilities/utils').db;

let getHash = require('../utilities/utils').getHash;

var router = express.Router();

const bodyParser = require("body-parser");

router.use(bodyParser.json());

let jwt = require('jsonwebtoken');

let config = {
    secret: process.env.JSON_WEB_TOKEN
};

router.post('/', (req, res) => {
    let email = req.body['email'];
    let theirPw = req.body['password'];
    let wasSuccessful = false;
    let pushyToken = req.body['token'];   
    if(email && theirPw && pushyToken) {
        db.one('SELECT Password, Salt, Memberid, isverified FROM Members WHERE Email=$1', [email])
        .then(row => { 
            let salt = row['salt'];
            let ourSaltedHash = row['password']; 
            let theirSaltedHash = getHash(theirPw, salt); 
            let wasCorrectPw = ourSaltedHash === theirSaltedHash;  
            if (wasCorrectPw) {
                let token = jwt.sign({username: email},
                    config.secret,
                    { 
                        expiresIn: '24h' // expires in 24 hours
                    }
                );
                let isVerified = row['isverified']; 
                if (isVerified == true)
                {
                    let params = [row['memberid'], pushyToken];
                    db.none('UPDATE MEMBERS SET Pushtoken = $2 WHERE Memberid = $1', params).then(() => {
                        res.json({
                            success: true,
                            message: 'Authentication successful!',
                            token: token
                        });
                    }).catch(err =>
                        {
                            console.log("Error on updating token");
                            console.log(err);
                            res.send({
                                success:false
                            });
                        });
                } else {
                    res.send({
                        success: false ,
                        message: 'Email not verified'
                    });
                }
            } else {
                res.send({
                    success: false ,
                    message: 'Credentials do not match'
                });
            }
        })
        .catch((err) => {
            res.send({
                success: false,
                message: 'Invalid credentials'
            });
        });
    } else {
        res.send({
            success: false,
            message: 'Missing credentials'
        });
    }
});

module.exports = router;
