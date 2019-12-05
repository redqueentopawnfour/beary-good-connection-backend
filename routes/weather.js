//express is the framework we're going to use to handle requests 
const express = require('express');
//retrieve the router pobject from express 
var router = express.Router();
//Https required
const http = require('https');

let db = require('../utilities/utils').db;


router.get('/', (req, res) => { 
    const options = new URL('https://api.openweathermap.org/data/2.5/weather?q=Seattle,us$units=imperial&APPID=256b3fac9d8ec8ce35e6be9487360e9c');
    //const options = new URL('https://api.weatherbit.io/v2.0/current?city=Seattle,WA&key=f991b0a6c72941ecb4103f79eee8a9f2')
    http.get(options, (resp) => {
        let responseString = '';
        resp.on('data', function(data) {
          responseString += data;
        });
    
        resp.on('end', function() {
          res.send(responseString);
          res.end();
        });
    });
});

router.get("/weatherParams", (req, res) => { 
    const {lat, lon} = req.query;
    const options = new URL(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&APPID=256b3fac9d8ec8ce35e6be9487360e9c`);
    //const options = new URL(`https://api.weatherbit.io/v2.0/current?lat=${lat}&lon=${lon}&key=f991b0a6c72941ecb4103f79eee8a9f2`);
    http.get(options, (resp) => {
        let responseString = '';
        resp.on('data', function(data) {
          responseString += data;
        });
        resp.on('end', function() {
          res.send(responseString);
          res.end();
        });
    });
});

router.get("/weatherForecast", (req, res) => { 
  const {lat, lon} = req.query;
  const options = new URL(`https://api.weatherbit.io/v2.0/forecast/daily?lat=${lat}&lon=${lon}&units=I&days=10&key=f991b0a6c72941ecb4103f79eee8a9f2`);
  http.get(options, (resp) => {
      let responseString = '';
      resp.on('data', function(data) {
        responseString += data;
      });
      resp.on('end', function() {
        res.send(responseString);
        res.end();
      });
  });
});

router.get("/zipCode", (req, res) => {
  const {zip} = req.query;
  // lol what even is this commented out one... use google
  const options = new URL(`https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=AIzaSyCGrS0Pay6qPRO237mEIpvgvP8tRT42zOw`);
  //const options = new URL(`https://www.zipcodeapi.com/rest/Lv1Ndnqf4AJ0oLeiKNnIRyVKfg1YBZ4lBbs6Z1e5h8iU80LmNF6tFD1vkvEXea0T/info.json/${zip}/degrees`);
  http.get(options, (resp) => {
      let responseString = '';
      resp.on('data', function(data) {
        responseString += data;
      });
      resp.on('end', function() {
        res.send(responseString);
        res.end();
      });
  });
});


router.get("/addlocation", (req, res) => { 
  const {username, lat, long} = req.query;
  var memberid;

  db.one("SELECT memberid FROM MEMBERS WHERE username = $1", username)
  .then(row => { 
    memberid = row['memberid'];
    console.log("memberid: " + memberid);

    db.none("INSERT INTO locations(memberid, lat, long) VALUES ($1, $2, $3)", [memberid, lat, long])
    .then(() => {
        res.send({
            success: true,
            error: "location successfully saved"
        });
    }).catch((err) => {
        //log the error
        console.log(err);
        res.send({
            success: false,
            error: err
        });        
    });
  })
  .catch((err) => {
      console.log(err);
  });
});


router.get("/removelocation", (req, res) => { 
  const {username, lat, long} = req.query;
  var memberid;

  db.one("SELECT memberid FROM MEMBERS WHERE username = $1", username)
  .then(row => { 
    memberid = row['memberid'];
    console.log("memberid: " + memberid);

    db.none("DELETE FROM locations WHERE lat = $1 AND long = $2 AND memberid = $3", [lat, long, memberid])
    .then(() => {
      res.send({
        success: true,
        error: "location successfully removed"
    });
    }).catch((err) => {
        //log the error
        console.log(err);
        res.send({
            success: false,
            error: err
        });
    });
  })
  .catch((err) => {
      console.log("No member ID found for sender.");
  });
});


router.get("/getlocations", (req, res) => { 
  res.type("application/json");

  db.manyOrNone("select memberid, lat, long from locations")
  .then(rows => {
    console.log(rows);
    res.send({
      success: true,
      msg: rows
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




module.exports = router;