var mongoose = require('mongoose');
var moment = require('moment');

moment().format('D-M-YYYY');

mongoose.connect('mongodb://localhost/looms');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log("Mongoose DB Connection Successful!");
});

//Defining Schema
var OptSchemaModel = mongoose.Schema({
	timeStamp: String,
	cmd: String,
	arg: Object
})

var AggregateDayStatModel = mongoose.Schema({
    date: String,
    operations: [OptSchemaModel]
})

//Adding Methods to Schema
OptSchemaModel.methods.speak = function () {
  info = "This sub-document(OSM) refers to user Generated Commands:"+this.date;
  console.log(info);
}

AggregateDayStatModel.methods.speak = function(){
	info = "This document refers to Date:"+this.date;
	console.log(info);
	process.exit(0);
}

//Loading Schema into Model
var OSM = mongoose.model("OSM",OptSchemaModel)
var ADSM = mongoose.model("ADSM",AggregateDayStatModel)

//console.log(JSON.stringify(today));
//Saving Documents.

ADSM.find({date:moment().format('D-M-YYYY')},function (err, today) {
  if (err) return console.error(err);
  if(today == ""){
  	console.log("New Stats Document created for the day!");
  	
  	today = new ADSM({ date: moment().format('D-M-YYYY'),Opt:[]})
  	today.save(function(err,today){
	if(err) return console.log(err);
	today.speak();
	
});
  	}
  else{
  	console.log("Deleted:"+today)
  	ADSM.remove({date:moment().format('D-M-YYYY')},function(err){
	  	if(err)
	  		console.log("Delete Failed");
	  	else
	  		console.log("Deleted Today's Object");
  	})
/*   	process.exit(0); */
  	}
});

