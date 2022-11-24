'use strict';
console.log('//************************* Social Internal**************************//');
var res = require('dotenv').config();
//Import Config
const config = require('./lib/config');

config.mongoDBConfig(config.defaultMongoDBConfig, (err) => {
	if (err) {
		console.log({ err });
		return;
	}
	const express = require('express');
	// init express app
	const app = express();
	//app.use(express.static('img'))
	// config express
	config.expressConfig(app);
	if (err) return res.json(err);
	// attach the routes to the app
	require('./lib/routes')(app);
	// start server
	app.listen(process.env.PORT || 6000, () => {
		console.log(`Express server listening on ${process.env.PORT}`);
	});
   
});