const express = require('express');

const pgp = require('pg-promise')();

pgp.pg.defaults.ssl = true;

const db = pgp(process.env.DATABASE_URL);

if(!db) {
   console.log("SHAME! Follow the instructions and set your DATABASE_URL correctly");
   process.exit(1);
}

module.exports = db;
