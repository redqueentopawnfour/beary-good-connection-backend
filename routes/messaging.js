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
    let username;
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
            //send a notification of this message to ALL members with registered tokens
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

router.get("/getgroupchats", (req, res) => {
    let username = req.headers['username'];
    let query = `SELECT Chats.Chatid, Chats.Name FROM Chats
    INNER JOIN ChatMembers on Chats.ChatId=Chatmembers.ChatId
    WHERE Chatmembers.memberid=(SELECT Memberid FROM Members WHERE Username=$1) and NOT Name='primary'`
    db.manyOrNone(query, username).then((rows) => {
        res.send({
            success: true,
            messages: rows
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
    db.one("INSERT INTO Chats (name) VALUES ($1) RETURNING chatid", [name]).then((row) => {
        res.send({
            success: true,
            chatid: row
        })
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

router.post("/removegroupmembers", (req, res) => {
    
    let usernames = req.body['usernames'];
    let chatId = req.body['chatid'];
    let getMemberIds = "SELECT Memberid FROM Members WHERE Username IN"
    getMemberIds += '(' + usernames.map(addQuotes).join(", ") + ')';
    db.manyOrNone(getMemberIds).then(rows => {
        console.log(rows);
        let deleteStatement = "DELETE FROM Chatmembers WHERE";
        const memberArray = [];
        rows.forEach(row => {
            memberArray.push("(Chatid=" + chatId + " and Memberid=" + row['memberid'] + ")");
        });
        deleteStatement += memberArray.join(" OR ");
        console.log(deleteStatement);
        db.none(deleteStatement).then(() => {
            console.log(usernames + " deleted from chat " + chatId);
            res.send({
                sucess: true
            });
        }).catch((err) => {
            console.log("fail on delete");
            res.send({
                success: false,
                error: err
            })
        });
    }).catch((err) => {
        console.log("fail on select");
        res.send({
            success: false,
            error: err
        })
    });
});


module.exports = router;