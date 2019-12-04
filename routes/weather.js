//express is the framework we're going to use to handle requests 
const express = require('express');
//retrieve the router pobject from express 
var router = express.Router();
//Https required
const http = require('https');

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
    const options = new URL('https://api.openweathermap.org/data/2.5/weather?lat={47.606}&lon={-122.33}&APPID=256b3fac9d8ec8ce35e6be9487360e9c');
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
  //const options = new URL('https://api.openweathermap.org/data/2.5/weather?lat={37.39}&lon={122.33}&APPID=256b3fac9d8ec8ce35e6be9487360e9c');
  // &days=10 only need 10 days of info :D don't over use webservice!
  const options = new URL('https://api.weatherbit.io/v2.0/forecast/daily?lat=47.606&lon=-122.33&units=I&key=f991b0a6c72941ecb4103f79eee8a9f2');
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



module.exports = router;