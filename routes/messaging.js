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
    let getUser = `SELECT Username FROM Members where Email=$1`
    db.one(getUser, [email]).then(row=> {
        username = row['username'];
    }).catch(err => {
        res.send( {
            success: false,
            error: err,
            message: "Could not find your username!"
        })
    });
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
                        msg_functions.sendToIndividual(element['pushtoken'], message, username, 'msg');
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


router.post("/getAll", (req, res) => {
    let chatId = req.body['chatId'];
    
    let query = `SELECT Members.Username, Messages.Message,
     to_char(Messages.Timestamp AT TIME ZONE 'PDT', 'YYYY-MM-DD HH24:MI:SS.US') AS Timestamp
     FROM Messages
     INNER JOIN Members ON Messages.MemberId=Members.MemberId
     WHERE ChatId=$1
     ORDER BY Timestamp DESC`
    db.manyOrNone(query, [chatId])
    .then((rows) => {
        res.send({
            messages: rows
        })
    }).catch((err) => {
        res.send({
            success: false,
            error: err
        })
    });
});

module.exports = router;