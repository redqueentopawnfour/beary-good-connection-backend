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
    var memberId_a;
    console.log(email);

    if(email) {
        db.one('SELECT memberid FROM members WHERE email = $1', [email])
        .then(row => { 
            memberId_a = row['memberid'];
            console.log("Member ID: " + memberId_a);
            
            if (memberId_a) {
                db.manyOrNone('SELECT m.memberid, m.firstname, m.lastname, m.username, m.email, m.usericon, m.isVerified as "emailverified", c.requestnumber, c.isverified as "contactverified" ' + 
                "from contacts c join members m on m.memberid = c.memberid_b where c.memberid_a = $1 order by m.username asc", [memberId_a])
                .then(rows => { 
                    var returnContacts = [];
                    var count = 0;
                    var numContacts = rows.length;

                    rows.forEach(row => { 
                        var memberId_b = row['memberid'];
                        var firstname = row['firstname'];
                        var lastname = row['lastname'];
                        var username = row['username'];
                        var email = row['email'];
                        var usericon = row['usericon'];
                        var emailverified = row['emailverified'];
                        var requestnumber = row['requestnumber'];
                        var contactverified = row['contactverified'];

                        db.manyOrNone("select * from chats ch join chatmembers chm on chm.chatid = ch.chatid " +
                        "join chatmembers chm2 on chm2.chatid = ch.chatid where ch.name = $1 and chm.memberid = $2 and chm2.memberid = $3", ['primary', memberId_b, memberId_a])
                        .then(rows => { 
                            var chatId = 0;                     // default to 0
                            rows.forEach(row => { 
                                chatId = row['chatid'];
                            });

                            console.log("Chat ID: " + chatId);


                            var contact = {
                                firstname: firstname
                                , lastname: lastname
                                , username: username
                                , email: email
                                , usericon: usericon
                                , emailverified: emailverified
                                , requestnumber: requestnumber
                                , contactverified: contactverified
                                , chatId: chatId
                            }
                            returnContacts.push(contact);    // push to array of contacts
                            count = count + 1;

                            if (count == numContacts) {
                                res.send({
                                    success: true,
                                    message: returnContacts
                                });
                            }
                        })
                        .catch((err) => {
                            res.send({
                                success: false,
                                message: 'no chat id found'
                            });
                        });
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
                                    require('../utilities/utils').messaging
                                    .sendToIndividual(row['pushtoken'], "testing topic all", "Testing");
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
                    db.none("Insert into Chats(name) values ($1)", "primary")    // Create the chat on friend request accept
                    .then(() => { 
                        console.log("Chat created");
    
                        db.one("SELECT MAX(chatid) from Chats")        // get Chat ID by returning last highest chat ID from chat table
                        .then(row => { 
                            console.log(row);
                            var chatId = row['max'];
        
                            db.none("Insert into ChatMembers values ($1, $2)", [chatId, memberid_sender])        // insert first member
                            .then(() => { 
                                console.log("first member has joined chat");
            
                                db.none("Insert into ChatMembers values ($1, $2)", [chatId, memberid_requested])        // insert second member
                                .then(() => { 
                                    console.log("Second member has joined chat");
                
                                    res.send({
                                        success: true,
                                        message: chatId
                                    });
                                })
                                .catch((err) => {
                                    res.send({
                                        success: false,
                                        error: "Insert member sender failed"
                                    });
                                });
                            })
                            .catch((err) => {
                                res.send({
                                    success: false,
                                    error: "Insert member sender failed"
                                });
                            });
                        })
                        .catch((err) => {
                            res.send({
                                success: false,
                                error: "No ChatId found"
                            });
                        });
                    })
                    .catch((err) => {
                        res.send({
                            success: false,
                            error: "Chat creation failed"
                        });
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



module.exports = router;
