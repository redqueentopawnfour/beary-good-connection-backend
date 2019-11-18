const express = require('express');

const crypto = require("crypto");

let db = require('../utilities/utils').db;

var router = express.Router();

const bodyParser = require("body-parser");

let msg_functions = require('../utilities/utils').messaging;

router.use(bodyParser.json());

router.post('/', (req, res) => {
    res.type("application/json");

    var email = req.body['email'];
    var memberId;
    console.log(email);

    if(email) {
        db.one('SELECT memberid FROM members WHERE email = $1', [email])
        .then(row => { 
            console.log(row);
            memberId = row['memberid'];

            console.log(memberId);
            if (memberId) {
                db.manyOrNone('SELECT m.firstname, m.lastname, m.username, m.email, m.usericon, m.isVerified as "emailverified", c.requestnumber, c.isverified as "contactverified" ' + 
                'from contacts c join members m on m.memberid = c.memberid_b where c.memberid_a = $1', [memberId])
                .then(rows => { 
                    console.log(rows);
                    
                    rows.forEach(row => { 
                        console.log(row); 
                      }); 

                      res.send({
                        success: true,
                        message: rows
                    });
                })
                .catch((err) => {
                    res.send({
                        success: false,
                        message: 'no contacts found'
                    });
                });
            }
        })
        .catch((err) => {
            res.send({
                success: false,
                message: 'no memberId found'
            });
        });
    } else {
        res.send({
            success: false,
            message: 'no email found'
        });
    }
});


router.post('/add', (req, res) => {
    res.type("application/json");

    var email_sender = req.body['email_sender'];
    var username_requested = req.body['username_requested'];
    var memberid_requested;
    var memberid_sender;

    console.log("Email sender: " + email_sender);
    console.log("Username requested: " + username_requested);
   
    db.one("SELECT memberid FROM MEMBERS WHERE username = $1", username_requested)
    .then(row => { 
        console.log(row);
        memberid_requested = row['memberid'];
     
        if(memberid_requested) 
        {
            console.log("MemberId requested: " + memberid_requested);

            db.one("SELECT memberid FROM MEMBERS WHERE email = $1", email_sender)
            .then(row => { 
                var memberid_sender = row['memberid'];

                if (memberid_sender && memberid_requested) {
                    console.log("memberid_sender requested: " + memberid_requested);

                    db.one("SELECT primarykey FROM contacts WHERE (memberid_a = $1 and memberid_b = $2) or (memberid_b = $2 and memberid_a = $1)", [memberid_sender, memberid_requested])
                    .then(row => { 
                        res.send({
                            success: false,
                            error: "This person is already your contact." 
                        });
                    })
                    .catch((err) => {
                        var rand=Math.floor((Math.random() * 100) + 54);
                        console.log("Contact will be added to member A with a randomly generated request number to show this person is the requester.");
                        db.none("INSERT INTO Contacts(memberid_a, memberid_b, requestnumber, isverified) VALUES ($1, $2, $3, $4)", [memberid_sender, memberid_requested, rand, false])
                        .then(() => {
                            console.log("Contact will be added to member B with request number as 0 to show this person is the receiver.");
                            db.none("INSERT INTO Contacts(memberid_a, memberid_b, requestnumber, isverified) VALUES ($1, $2, $3, $4)", [memberid_requested, memberid_sender, 0, false])
                            .then(() => {
                                db.one('SELECT Pushtoken FROM MEMBERS WHERE memberid = $1', memberid_requested)
                                .then(row => {
                                        console.log("Pushtoken of requested person: " + row['pushtoken']);
                                       // msg_functions.sendToIndividual(rows['pushtoken'], message, email);
                                    res.send({
                                        success: true
                                        , message: "contact successfully added"
                                    });
                                }).catch(err => {
                                    res.send({
                                        success: false,
                                        error: err
                                    });
                                })
                            }).catch((err) => {
                                //log the error
                                console.log(err);
                                res.send({
                                    success: false,
                                    error: err
                                });
                            });
                        }).catch((err) => {
                            //log the error
                            console.log(err);
                            res.send({
                                success: false,
                                error: err
                            });
                        });
                    });
                }
            })
            .catch((err) => {
                console.log("No member ID found for sender.");
            });
        }
        else
        {
            res.send({
                success: false,
                error: "User requested does not have a member Id."
            });
        }
    })
    .catch((err) => {
        console.log("User requested does not exist");
        
        res.send({
            success: false,
            error: "User requested does not exist."
        });
    });
});


router.post('/profile', (req, res) => {
    res.type("application/json");

    var email = req.body['email'];
    console.log(email);

    if(email) {
        db.one('SELECT firstname, lastname, username, email, usericon, isverified as "emailverified" ' + 
            'FROM MEMBERS where email = $1', email)
        .then(row => { 
            console.log(row);

            res.send({
                success: true,
                message: row
            });
        })
        .catch((err) => {
            res.send({
                success: false,
                message: 'no member profile found'
            });
        });
    } else {
        res.send({
            success: false,
            message: 'no email found'
        });
    }
});

router.post('/accept', (req, res) => {
    res.type("application/json");

    var email_sender = req.body['email_sender'];
    var username_requested = req.body['username_requested'];
    var memberid_requested;
    var memberid_sender;

    console.log("Email sender: " + email_sender);
    console.log("Username requested: " + username_requested);
   
    db.one("SELECT memberid FROM MEMBERS WHERE username = $1", username_requested)
    .then(row => { 
        console.log(row);
        memberid_requested = row['memberid'];

        db.one("SELECT memberid FROM MEMBERS WHERE email = $1", email_sender)
        .then(row => { 
            var memberid_sender = row['memberid'];
            console.log("memberid_sender requested: " + memberid_requested);
            
            if (memberid_sender && memberid_requested) {
                
                db.none("update contacts set isverified = true where (memberid_a = $1 and memberid_b = $2) or (memberid_b = $1 and memberid_a = $2)", [memberid_sender, memberid_requested])
                .then(() => { 
                    console.log("Contact added");
                    res.send({
                        success: true,
                        error: "Contact added." 
                    });
                })
                .catch((err) => {
                    res.send({
                        success: false,
                        error: err
                    });
                });
            }
        })
        .catch((err) => {
            console.log("No member ID found for sender.");
        });

    })
    .catch((err) => {
        console.log("User requested does not exist");
        
        res.send({
            success: false,
            error: "User requested does not exist."
        });
    });
});

router.post('/reject', (req, res) => {
    res.type("application/json");

    var email_sender = req.body['email_sender'];
    var username_requested = req.body['username_requested'];
    var memberid_requested;
    var memberid_sender;

    console.log("Email sender: " + email_sender);
    console.log("Username requested: " + username_requested);
   
    db.one("SELECT memberid FROM MEMBERS WHERE username = $1", username_requested)
    .then(row => { 
        console.log(row);
        memberid_requested = row['memberid'];

        db.one("SELECT memberid FROM MEMBERS WHERE email = $1", email_sender)
        .then(row => { 
            var memberid_sender = row['memberid'];
            console.log("memberid_sender requested: " + memberid_requested);
            
            if (memberid_sender && memberid_requested) {
                
                db.none("delete from contacts where (memberid_a = $1 and memberid_b = $2) or (memberid_b = $1 and memberid_a = $2)", [memberid_sender, memberid_requested])
                .then(() => { 
                    console.log("Contact removed.");
                    res.send({
                        success: true,
                        error: "Contact removed." 
                    });
                })
                .catch((err) => {
                    res.send({
                        success: false,
                        error: err
                    });
                });
            }
        })
        .catch((err) => {
            console.log("No member ID found for sender.");
        });

    })
    .catch((err) => {
        console.log("User requested does not exist");
        
        res.send({
            success: false,
            error: "User requested does not exist."
        });
    });
});

// router.post('/isverified', (req, res) => {
//     res.type("application/json");

//     var email1 = req.body['email1'];
//     var email2 = req.body['email2'];
//     console.log(email1);
//     console.log(email2);

//     var memberid_a;
//     var memberid_b;
//     var isverified = false;

//     if(email1) {
//         db.one('SELECT memberid from members where email = $1', email1)
//         .then(row => { 
//             memberid_a = row['memberid'];
//             console.log(memberid_a);
//             if (email2) {
//                 db.one('SELECT memberid from members where email = $1', email2)
//                 .then(row => { 
//                     memberid_b = row['memberid'];
//                     console.log(memberid_b);
    
//                     if (memberid_a && memberid_b) {
//                         db.one('SELECT isverified from contacts where (memberid_a = $1 and memberid_b = $2) or (memberid_a = $2 and memberid_b = $1) ', [memberid_a, memberid_b])
//                         .then(row => { 
//                             isverified = row['isverified'];
//                             console.log(isverified);
//                             res.send({
//                                 success: true,
//                                 isverified: isverified
//                             });
//                         })
//                         .catch((err) => {
//                             res.send({
//                                 success: false,
//                                 message: 'no isverified found'
//                             });
//                         });
//                     }
//                 })
//                 .catch((err) => {
//                     res.send({
//                         success: false,
//                         message: 'no member id 2 found'
//                     });
//                 });
//             }
//         })
//         .catch((err) => {
//             res.send({
//                 success: false,
//                 message: 'no member id 1 found'
//             });
//         });
//     } else {
//         res.send({
//             success: false,
//             message: 'no email found'
//         });
//     }
// });


module.exports = router;
