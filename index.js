//express is the framework we're going to use to handle requests
const express = require('express');
//Create a new instance of express
const app = express();
//Https required
const http = require('https');


let middleware = require('./utilities/middleware');

const bodyParser = require("body-parser");
//This allows parsing of the body of POST requests, that are encoded in JSON
app.use(bodyParser.json());

//pg-promise is a postgres library that uses javascript promises
const pgp = require('pg-promise')();
//We have to set ssl usage to true for Heroku to accept our connection
pgp.pg.defaults.ssl = true;

app.use('/login', require('./routes/login.js'));
app.use('/register', require('./routes/register.js'));
app.use('/verify', require('./routes/verify.js'));
app.use('/wait', require('./routes/wait.js'));
app.use('/contacts', require('./routes/contacts.js'));
//app.use('/messaging', require('./routes/messaging.js'));
app.use('/weather', require('./routes/weather.js'));
app.use('/messaging', middleware.checkToken, require('./routes/messaging.js'));

/*
 * Return HTML for the / end point. 
 * This is a nice location to document your web service API
 * Create a web page in HTML/CSS and have this end point return it. 
 * Look up the node module 'fs' ex: require('fs');
 */
app.get("/", (req, res) => {
    res.writeHead(200, {'Content-Type': 'text/html'});
    for (i = 1; i < 7; i++) {
        //write a response to the client
        res.write('<h' + i + ' style="color:blue">Hello World!</h' + i + '>'); 
    }
    res.end(); //end the response
});

/*
app.get("/weather", (req, res) => { 
    const options = new URL('https://api.openweathermap.org/data/2.5/weather?q=Seattle,us&APPID=256b3fac9d8ec8ce35e6be9487360e9c');
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

app.get("/weatherParams", (req, res) => { 
    const {lat, lon} = req.query;
    //const options = new URL('https://api.openweathermap.org/data/2.5/weather?lat={37.39}&lon={122.33}&APPID=256b3fac9d8ec8ce35e6be9487360e9c');
    const options = new URL(`https://api.weatherbit.io/v2.0/current?lat=${lat}&lon=${lon}&key=f991b0a6c72941ecb4103f79eee8a9f2`);
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
*/

/* 
* Heroku will assign a port you can use via the 'PORT' environment variable
* To accesss an environment variable, use process.env.<ENV>
* If there isn't an environment variable, process.env.PORT will be null (or undefined)
* If a value is 'falsy', i.e. null or undefined, javascript will evaluate the rest of the 'or'
* In this case, we assign the port to be 5000 if the PORT variable isn't set
* You can consider 'let port = process.env.PORT || 5000' to be equivalent to:
* let port; = process.env.PORT;
* if(port == null) {port = 5000} 
*/ 
app.listen(process.env.PORT || 5000, () => {
    console.log("Server up and running on port: " + (process.env.PORT || 5000));
});