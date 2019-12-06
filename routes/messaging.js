//express is the framework we're going to use to handle requests
const express = require('express');

//Create connection to Heroku Database
let db = require('../utilities/utils').db;

var router = express.Router();
const bodyParser = require("body-parser");

//This allows parsing of the body of POST requests, that are encoded in JSON
router.use(bodyParser.json());

let msg_functions = require('../utilities/utils').messaging;


//send a message to all users "in" the chat session with chatId
router.post("/send", (req, res) => {
    let email = req.body['email'];
    let message = req.body['message'];
    let chatId = req.body['chatid'];


    if(!email || !message || !chatId) {
        res.send({
            success: false,
            error: "email, message, or chatId not supplied"
        });
        return;
    }
    let verify = `SELECT * FROM Chatmembers 
    JOIN Members
    ON Members.MemberId = Chatmembers.MemberId
    WHERE Members.email=$1 AND Chatmembers.chatId=$2`
    db.one(verify, [email, chatId]).then(row => {
        console.log("member" + row['memberid'] + "is a member of this chat!");
        //add the message to the database
        let insert = `INSERT INTO Messages (chatId, Message, MemberId) SELECT $1, $2, MemberId FROM Members WHERE Email=$3`
        db.none(insert, [chatId, message, email])
        .then(() => {
            let selectTokens = `SELECT members.pushtoken
            FROM members
            JOIN chatmembers
            on members.memberid = chatmembers.memberid
            WHERE chatmembers.chatid=$1`
            db.manyOrNone(selectTokens, chatId)
            .then(rows => {
                db.one("select username from Members where email = $1", email)
                .then((row) => {
                    var username = row['username'];
                    rows.forEach(element => {
                        msg_functions.sendToIndividual(element['pushtoken'], message, username, 'msg', chatId);
                    });
                    res.send({
                        success: true
                        , username: username
                    });
                }).catch(err => {
                    res.send({
                        success: false,
                        error: err
                    });
                })
            }).catch(err => {
                res.send({
                    success: false,
                    error: err
                });
            })
        }).catch((err) => {
            res.send({
                success: false,
                error: err,
            });
        });
    }).catch(err => {
        res.send( {
            success: false,
            message: "You cannot message this member!",
            error: err
        })
    });
   
});

router.post("/addfavorite", (req, res) => {
    let chatId = req.body['chatid'];
    let email = req.body['email'];
    console.log(email);
    console.log(chatId);
    let select = `SELECT memberid FROM members WHERE email=$1`
    db.one(select, email).then(row => {
        let insert = `INSERT INTO chatfavorites (chatid, memberid) 
        VALUES($1, $2)`
        db.none(insert, [chatId, row['memberid']]).then(() => {
            res.send({
                success: true
            });
        }).catch((err) => {
            res.send({
                success: false,
                error: err
            })
        });
    }).catch((err) => {
        res.send({
            success: false,
            error: err
        })
    });
});

router.get("/getfavorites", (req, res) => {
    let email = req.headers['email'];
    let query = `SELECT Chatfavorites.Chatid FROM Chatfavorites
    INNER JOIN Members ON Members.Memberid=ChatFavorites.Memberid
    WHERE Members.email = $1`
    db.manyOrNone(query, email).then(rows => {
        console.log(rows);
        let namequery = "SELECT NAME, Chatid FROM CHATS WHERE Chatid IN";
        const chatIdArray = [];
        rows.forEach(row => {
            chatIdArray.push(row['chatid']);
        });
        namequery += '(' + chatIdArray.join(', ') + ')';
        console.log(namequery);
        db.manyOrNone(namequery).then(chatDetails => {
            res.send({
                success: true,
                details: chatDetails
            });
        }).catch((err => {
            res.send({
                success: false,
                error: err
            });
        }));
        
    }).catch((err) => {
        res.send({
            success: false,
            error: err
        });
    });
});

router.get("/getchatmembers", (req, res) => {
    let chatId = req.headers['chatid'];
    let query = `SELECT Members.Username FROM Members
    INNER JOIN Chatmembers  ON 
    Members.Memberid=Chatmembers.Memberid WHERE Chatid=$1`
    db.manyOrNone(query, [chatId])
    .then((names) => {
            res.send({
                success: true,
                usernames: names,
                chatid: chatId
            })
        }).catch((err) => {
            res.send({
                success: false,
                error: err
            })
        });
});

router.get("/getAll", (req, res) => {
    let chatId = req.headers['chatid'];
    let query = `SELECT Members.Username, Messages.Message,
     to_char(Messages.Timestamp AT TIME ZONE 'PDT', 'YYYY-MM-DD HH24:MI:SS.US') AS Timestamp
     FROM Messages
     INNER JOIN Members ON Messages.MemberId=Members.MemberId
     WHERE ChatId=$1
     ORDER BY Timestamp ASC`
    db.manyOrNone(query, [chatId])
    .then((rows) => {
        let getusers = `SELECT Members.Username FROM Members
        INNER JOIN Chatmembers  ON 
        Members.Memberid=Chatmembers.Memberid WHERE Chatid=$1`
        db.manyOrNone(getusers, chatId).then((names) => {
            res.send({
                success: true,
                messages: rows,
                usernames: names
            })
        }).catch((err) => {
            res.send({
                success: false,
                error: err
            })
        });
    }).catch((err) => {
        res.send({
            success: false,
            error: err
        })
    });
});

router.get("/getgroupchats", (req, res) => {
    let username = req.headers['username'];
    let query = `SELECT Chats.Chatid, Chats.Name FROM Chats
    INNER JOIN ChatMembers on Chats.ChatId=Chatmembers.ChatId
    WHERE Chatmembers.memberid=(SELECT Memberid FROM Members WHERE Username=$1) and NOT Name='primary'`
    db.manyOrNone(query, username).then((rows) => {
        res.send({
            success: true,
            chats: rows
        })
    }).catch((err) => {
        res.send({
            success: false,
            error: err
        })
    });
});

router.post("/creategroup", (req, res) => {
    let name = req.body['name'];
    let email = req.body['email'];
    db.one("INSERT INTO Chats (name) VALUES ($1) RETURNING chatid", [name]).then((row) => {
        let insertChatMember = `INSERT INTO Chatmembers (chatid, memberid) 
        SELECT $1, Memberid FROM Members WHERE Email=$2`
        db.none(insertChatMember, [row['chatid'], email]).then(() => {
            res.send({
                success: true,
                chatid: row['chatid']
            })
        }).catch((err) => {
            res.send({
                success: false,
                error: err
            })
        });
    }).catch((err) => {
        res.send({
            success: false,
            error: err
        })
    });
});


function addQuotes(myArrayItem) {
    return '\'' + myArrayItem + '\'';
}

router.post("/leavegroup", (req, res) => {
    let username = req.body['username'];
    let chatId = req.body['chatid'];
    console.log("before select " + username);
    console.log("before select " + chatId);
    db.one("SELECT Memberid FROM Members WHERE Username=$1", username).then(row => {
        console.log("after select " + row['memberid'])
        db.none("DELETE FROM Chatmembers WHERE chatid=$1 and Memberid=$2",
        [chatId, row['memberid']]).then(() => {
            res.send({
                success: true
            });
        });
    }).catch(err => {
        res.send({
            success: false,
            error: err
        });
    });
});

router.post("/addgroupmembers", (req, res) => {
    let usernames = req.body['usernames'];
    let chatId = req.body['chatid'];
    let getMemberIds = "SELECT Memberid FROM Members WHERE Username IN"
    getMemberIds += '(' + usernames.map(addQuotes).join(", ") + ')';
    db.manyOrNone(getMemberIds, ).then(rows => {
            let insert = "INSERT INTO ChatMembers (ChatId, Memberid) VALUES"
            console.log("rows after select" + rows.toString());
            const valueArray = [];
            rows.forEach(row => {
                valueArray.push("(" + chatId + ", " + row['memberid'] + ")");
            });
            // console.log(valueArray);
            insert += valueArray.join(", ");
            // console.log(insert);
            db.none(insert).then(() => {
                console.log(usernames + "added to chat" + chatId);
                res.send({
                    success: true
                });
            }).catch(err => {
                res.send({
                    success: false,
                    error: err
                });
            })
        })
    .catch(err => {
        res.send({
            success: false,
            error: err
        });
    });
});




module.exports = router;