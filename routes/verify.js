const express = require('express');

var router = express.Router();

const bodyParser = require("body-parser");

router.use(bodyParser.json());

let db = require('../utilities/utils').db;

router.get('/',function(req,res){

    var rand;

    db.one("SELECT verification FROM MEMBERS WHERE email = $1 ", req.query['email'])
    .then(row => { 
        rand = row['verification'];

        if((req.protocol + "://" + req.get('host')) == ("http://beary-good-connection.herokuapp.com")) // hardcode for right now
        {
            console.log("Domain is matched. Information is from Authentic email");
            if(req.query['id'] == rand)
            {
                console.log("email is verified");

                db.none('UPDATE MEMBERS SET isverified = $1 WHERE email = $2', [true, req.query['email']])
                .then(() => { 
                    // do nothing
                }) 
                .catch((err) => {
                    console.log(err);
                });

                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write('<h style="color:#4b2e83">Email has been verified!</h>'); 
                res.end();
            }
            else
            {
                db.none('UPDATE MEMBERS SET isverified = $1 WHERE email = $2', [false, req.query['email']])
                .then(() => { 
                    // do nothing
                }) 
                .catch((err) => {
                    console.log(err);
                });

                console.log("email is not verified");
                res.send({
                    success: false,
                    message: "<h1>Bad Request</h1>"
                });
            }
        }
        else
        {
            db.none('UPDATE MEMBERS SET isverified = $1 WHERE email = $2', [false, req.query['email']])
            .then(() => { 
                // do nothing
            }) 
            .catch((err) => {
                console.log(err);
            });

            res.send({
                success: false,
                message: "<h1>Request is from unknown source"
            });
        }
    })
    .catch((err) => {
        console.log("no verification found");
    });
});

module.exports = router;