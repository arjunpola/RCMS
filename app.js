
/**
 * Module dependencies.
 */
var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var process = require('process');
var path = require('path');
var exec = require('child_process').exec,child;
var fs = require('fs');
var app = express();
var server = http.createServer(app);
var io = require('socket.io');
var mysql = require('mysql');
var Canvas =  require('canvas');
var crypto = require("crypto");
var net = require('net');
var session = require('sesh').session;
var mongoose = require('mongoose');
var moment = require('moment');

var PORT = 3030;

var CMD_PORT = 1234;
var CMD_HOST = undefined;

var tcp_client = net.Socket();
var cmd_client = net.Socket();

var ftp_user = "admin";
var ftp_pass = "";

var monitorFile="",monitorFTP="",curHead=0,ORG="",trigger_count=0,machines="",fileName="";
var cancelTrans = false;
var can = "",overlay="",

Repo = "/root/NodeApps/RCMS/public/repository/",
PublicDir = "/root/NodeApps/RCMS/public/";
RepoDir = "/repository/";
HOST = MyLocalIP = "10.0.0.13";
var Logins = new Object();


// SQL & MongoDB Configuration & Connection

var con = mysql.createConnection({
	host:"127.0.0.1",
	port:3306,
    	user:"root",
    	database:"Looms",
    	password:"NACN"
});

con.connect(function(err){
	if(err != null){
	console.log("Mysql Connection Failed");
	throw err;
	}
	else
	console.log("Mysql Connection Successful");
});

mongoose.connect('mongodb://localhost/looms');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
console.log("Mongoose DB Connection Successful!");
  
});

// SQL & MongoDB

//MongoDB Schema & Module Loading.
//Defining Schema
var OptSchemaModel = mongoose.Schema({
	timeStamp: String,
	cmd: String,
	name: String,
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
}

//Loading Schema into Model
var OSM = mongoose.model("OSM",OptSchemaModel)
var ADSM = mongoose.model("ADSM",AggregateDayStatModel)
// End of SQL & MongoDB Schema Loading.

// COMMAND LOG Function
// data.machine = Machine Info
// data.cmd = Command
//data.arg = Additional Arguments

function cmdLog(data)
{

JSON.stringify(data);
ADSM.find({date:moment().format('D-M-YYYY')},function (err, today) {
  if (err)
  {
	  console.log("MongoDB Query Error!");
	  return;
  }
  if(today == ""){
  	console.log("New Stats Document created for the day!");
  	
  	operation = new OSM({timeStamp:moment().format('H:m:s'), cmd:data.cmd, name:data.machine.name,arg:data.arg});
  	today = new ADSM({ date: moment().format('D-M-YYYY'),operations:[operation]})
  	today.save(function(err,today){
	if(err) return console.log(err);
	today.speak();
	
});
  	}
  else{
  	//console.log("Attempted to Delete:"+today)
  	operation = new OSM({timeStamp:moment().format('H:m:s'),cmd:data.cmd,name:data.machine.name,arg:data.arg});
  	ADSM.findOneAndUpdate({date:moment().format('D-M-YYYY')},{$push:{operations:operation.toObject()}},{safe: true, upsert: true},function(err,operation){
  	if(err) return console.log(err);
  	console.log("Updated!");
  	operation.speak();
  	});

  	}
});

}

function getTodayStats()
{

/*
				ADSM.find({date:moment().format('D-M-YYYY')},function (err, today) {
					
					if(err)
					{
						console.log("Error Err:"+err);
					}
					else 
					{
						if(today == ""){
							console.log("Stats Null");
							return;
							}
						else{						
							socketServer.sockets.emit("stats",today.toString());
							console.log("Stats:"+today.toString());
							}
							
							
					}
				
				});
*/


//lean().exec() to get Json convertable data
ADSM.find({date:moment().format('D-M-YYYY')}).lean().exec(function(err,today){
	
	if(today == "")
		console.log("Stats is NULL");
	else
		{
			socketServer.sockets.emit("stats",JSON.stringify(today));
/* 			console.log("Stats: "+JSON.stringify(today)); */
		}
	
});

}

function getMonthStats()
{

	m = moment().format('M');
ADSM.find({date: new RegExp(".*-"+m+"-.*")}).lean().exec(function(err,today){
	
	if(today == "")
		console.log("Month Stats is NULL");
	else
	{
		socketServer.sockets.emit("monthly_stats",JSON.stringify(today));
		console.log(" Monthly Stats: "+JSON.stringify(today));
	}
	
});

}


//FTP setup

var JSFTP = require('jsftp')

//   /SENDFILE.CFG  - Monitor File Name
//   /WEAVENO

/*
var Ftp = new JSFTP({
	host:"www.amsler.co.nf",
    	port:21,
    	user:"1508059",
    	pass:"netfundu"
});
*/

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.logger('dev'));

app.use(express.cookieParser());
app.use(express.cookieSession({secret: 'EJCSREMOTECONTROL770077'}));

app.use(express.json());
app.use(express.multipart());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));




// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

//-----------------------              DEPRECATED                ------------------------

app.post('/trialPost',function(req,res){
	
	console.log(JSON.stringify(req.body));
	res.end();
});

app.get('/postlogin',function(req,res){

	res.writeHead(200,{"Content-type":"text/html"});
	
		fs.readFile(path.join(__dirname,'public')+"/postlogin/postlogin.html",function(err,loginPage){
			if(err!= null){
			console.log("Login");
			throw err;
			}
	
	loginPage = loginPage.toString();
	loginPage = replaceAll("localhost", MyLocalIP, loginPage);
	res.write(loginPage);
	res.end();
	});
});


//-----------------------              Updated                ------------------------

app.get('/admin/sending_design',function(req,res){
session(req,res,function(req,res){
	res.writeHead(200,{"Content-Type":"text/html"});
	if(req.session.UserSession != undefined)
	{
		name = req.session.UserSession.user[0].name;
				
			fs.readFile(path.join(__dirname,'public')+"/admin/sending_design.html",function(err,uploadPage){
				if(err != null){
					throw err;
					console.log("Add machines Get error");
				}
				
				uploadPage = uploadPage.toString();
				uploadPage = replaceAll("localhost", MyLocalIP, uploadPage);
				uploadPage = uploadPage.replace("ADMIN_NAME_HERE",name);
				
				res.write(uploadPage);
				res.end();

			});
	}
	else
	{
		res.write("<script>window.location='http://"+MyLocalIP+":3000/admin/'</script>");
		res.end();
	}
	
});// End of Session;	
	
});


app.post('/api/send_design',function(req,res){

console.log(JSON.stringify(req.body));

session(req,res,function(req,res){

res.writeHead(200,{"Content-Type":"text/html"});

	if(req.files.userPhoto.name == ""){
		 res.write("<script>alert('Please Select Valid File!'); window.location='http://"+MyLocalIP+":3000/admin/send_design'</script>");
	     res.end();
		}
	else if(req.body.Machine === undefined){
		
		res.write("<script>alert('Please Select atleast 1 Machine'); window.location='http://"+MyLocalIP+":3000/admin/send_design'</script>");
	    res.end();
		
	}
	else{
		
	fileName = req.files.userPhoto.name;
	machines = req.session.machines = req.body.Machine;

	
    req.session.globalPath = ORG.Machine[0].localDir + fileName;
    
    require('fs').rename(
        req.files.userPhoto.path,req.session.globalPath,
        function(error){
            if(error){
			  console.log("Error in File Rename: "+error);
			  res.write("<script>alert('OOPS! Theres some problem. Please try again later.'); window.location='http://"+MyLocalIP+":3000/admin/send_design'</script>");
			  res.end();
			  return;	  	
/*               socketServer.socket.emit("TransRes",{Data:"OOPS! Theres some proble. Please Try Again!"}); */
        }
        
			
			res.write("<script>window.location='http://"+MyLocalIP+":3000/admin/sending_design'</script>");
						

console.log("Transferring File");

	var transFtp = new JSFTP({
		host:req.session.ORG.Machine[req.session.machines[0]].host,
    	port:21,
    	user:"arjunpola",
    	pass:"NACN"
	});
	
	
			
			transFtp.put(req.session.globalPath,"/Users/arjunpola/Desktop/"+fileName,function(err){
			
				if(err){
					console.log("Sending Failed to Machine: "+req.session.ORG.Machine[req.session.machines[0]].name+"\n");
					console.log("Err:"+err);
					res.write("<script>alert('OOPS! Theres some problem. Please try again later.'); window.location='http://"+MyLocalIP+":3000/admin/send_design'</script>");						res.end();
				}
				else{
					
					res.end();
					console.log("File Sent");
					socketServer.sockets.emit("TransRes",{success:1,name:req.session.ORG.Machine[req.session.machines[0]].name});
					socketServer.sockets.emit("ClientTrigger",{Data:"NEXT"});
					trigger_count++;
					
				}
				
					
			});    
			
		transFtp.on("error",function(err){
			
			console.log("FTP onError: "+err);
			socketServer.sockets.emit("FTP_Error",{Data:ORG.Machine[req.session.machines[0]].name});
			trigger_count++;
		});
			   			
			
        });

        /* }); *///End of LMK Rename;
		}//End of Else
	});//Session
});

app.get("/admin/stats",function(req,res)
		{
		
		session(req,res,function(req,res){
		
			res.writeHead(200,{"Content-type":"text/html"});
			
			if(req.session.UserSession != undefined){
			
			name = req.session.UserSession.user[0].name;
				
			fs.readFile(path.join(__dirname,'public')+"/admin/statistics.html",function(err,uploadPage){
				if(err != null){
					throw err;
					console.log("Add machines Get error");
				}
				
				uploadPage = uploadPage.toString();
				uploadPage = replaceAll("localhost", MyLocalIP, uploadPage);
				uploadPage = uploadPage.replace("ADMIN_NAME_HERE",name);
				
				res.write(uploadPage);
				res.end();
				
			});
			}
			else
			{
				res.write("<script>window.location='http://"+MyLocalIP+":3000/login/'</script>");
				res.end();
			}
	});//Session
});

app.post('/api/photos',function(req,res){

console.log(JSON.stringify(req.body));

session(req,res,function(req,res){

res.writeHead(200,{"Content-Type":"text/html"});

	if(req.files.userPhoto.name == ""){
		 res.write("<script>alert('Please Select Valid File!'); window.location='http://"+MyLocalIP+":3000/admin/send_design'</script>");
	     res.end();
		}
	else if(req.body.Machine === undefined){
		
		res.write("<script>alert('Please Select atleast 1 Machine'); window.location='http://"+MyLocalIP+":3000/admin/send_design'</script>");
	    res.end();
		
	}
	else{
		
	fileName = req.files.userPhoto.name;
	machines = req.session.machines = req.body.Machine;
	


/*
	for(i=1;i<req.session.machines.length;i++)
	{
		// console.log("Sending To Machine "+req.session.ORG.Machine[req.session.machines[i]].name); 
		fs.renameSync(req.files.userPhoto.path,req.session.ORG.Machine[i].localDir+fileName);
		console.log("File Renamed to Machine "+req.session.ORG.Machine[req.session.machines[i]].name);
	}
*/

	
    req.session.globalPath = ORG.Machine[0].localDir + fileName;
    
    require('fs').rename(
        req.files.userPhoto.path,req.session.globalPath,
        function(error){
            if(error){
			  console.log("Error in File Rename: "+error);
			  res.write("<script>alert('OOPS! Theres some problem. Please try again later.'); window.location='http://"+MyLocalIP+":3000/admin/send_design'</script>");
			  res.end();
			  return;	  	
/*               socketServer.socket.emit("TransRes",{Data:"OOPS! Theres some proble. Please Try Again!"}); */
        }
        
			
			res.write("<script>window.location='http://"+MyLocalIP+":3000/uploading/'</script>");
						

console.log("Transferring File");

	var transFtp = new JSFTP({
		host:req.session.ORG.Machine[req.session.machines[0]].host,
    	port:21,
    	user:"arjunpola",
    	pass:"NACN"
	});
	
	
			
			transFtp.put(req.session.globalPath,"/Users/arjunpola/Desktop/"+fileName,function(err){
			
				if(err){
					console.log("Sending Failed to Machine: "+req.session.ORG.Machine[req.session.machines[0]].name+"\n");
					console.log("Err:"+err);
					res.write("<script>alert('OOPS! Theres some problem. Please try again later.'); window.location='http://"+MyLocalIP+":3000/admin/send_design'</script>");						res.end();
				}
				else{
					
					res.end();
					console.log("File Sent");
					socketServer.sockets.emit("TransRes",{success:1,name:"Transfer to Machine: "+req.session.ORG.Machine[req.session.machines[0]].name+" Successful"});
					socketServer.sockets.emit("ClientTrigger",{Data:"NEXT"});
					trigger_count++;
					
				}
				
					
			});    
			
		transFtp.on("error",function(err){
			
			console.log("FTP onError: "+err);
			socketServer.sockets.emit("FTP_Error",{Data:ORG.Machine[req.session.machines[0]].name});
			trigger_count++;
		});
			   			
			
        });

        /* }); *///End of LMK Rename;
		}//End of Else
	});//Session
}); //End of /api/photos


app.get("/admin/send_design",function(req,res)
		{
		
		session(req,res,function(req,res){
			
			res.writeHead(200,{"Content-type":"text/html"});
			
			if(req.session.UserSession != undefined){
			name = req.session.UserSession.user[0].name;
			
			fs.readFile(path.join(__dirname,'public')+"/admin/send_design.html",function(err,uploadPage){
				if(err != null){
					console.log("Home");
					throw err;
					}
				
				console.log("Org: "+userSession.user[0].org);
				
					
					console.log("\n\n"+JSON.stringify(req.session.ORG));
					
						uploadPage = uploadPage.toString();
						uploadPage = replaceAll("localhost", MyLocalIP, uploadPage);
						uploadPage = uploadPage.replace("ADMIN_NAME_HERE",name);															
						
					res.write(uploadPage);
					res.end();
			});
			}
			else
			{
				res.write("<script>window.location='http://"+MyLocalIP+":3000/login/'</script>");
				res.end();
			}
	});//Session
});

app.post("/admin/del",function(req,res){

session(req,res,function(req,res){

if(req.session.UserSession != undefined){
	
	res.writeHead(200, {'Content-Type':'text/html'});			 
					 					 
	if(req.body.Machine === undefined){
		res.write("<script>alert('Please Select atleast 1 Machine to delete'); window.location='http://"+MyLocalIP+":3000/admin/delete_machine'</script>");
	    res.end();
	    return;	
	}
	else
	{
		console.log("length="+req.body.Machine.length);
			for(i=0;i<req.body.Machine.length;i++)
			{
			
				machine = req.session.ORG.Machine[req.body.Machine[i]];
				if(machine == undefined)
				{
					console.log("Machine Already Deleted!");
				  res.write("<script type=text/javascript>alert('Machine Already Deleted! '); window.location='http://"+MyLocalIP+":3000/admin/delete_machine'</script>");
				  res.end();
				  return;
				}
				machineName=machine.name;
				console.log("DELETED Machine is "+machineName+ "i = "+i);
				var query = con.query('DELETE FROM SaiLoomTech WHERE mname="'+machineName+'"', function(err, result) {
			  if(err)
			  {
				  console.log("Mysql Query Error : "+ err );
				  res.write("<script type=text/javascript>alert('SQL Error! Please Try Again.'); window.location='http://"+MyLocalIP+":3000/admin/delete_machine'</script>");
				  res.end();
				  return;
						//throw err; 
			  }
			  else
			  {
				  console.log("machine "+machineName+" deleted Successfully");
				  chid = exec('rm -r '+Repo+machineName,function(error,stdout,stderr){
					console.log(Repo+machineName+"deleted");
					console.log('stdout: '+stdout);
					console.log('stderr: '+stderr);
					if(error !== null){
						console.log('exec error: '+error);
					}
				  }); 
			  }
			});
		}
		
		con.query("select * from SaiLoomTech",function(err,rows,fields){
					
					if(err){
						console.log("update machines Query Error on delete machines");
						 res.write("<script type=text/javascript>alert('Something wrong Cannot Delete'); window.location='http://"+MyLocalIP+":3000/admin/delete_machine'</script>");
						res.end();
						//throw err;
					}
					else
					{
							console.log("--------"+userSession.user[0].org+"----------\nName \t Host \t Port \t Type \t User \t Pass \t Local \t Remote\n\n ");
							console.log("Rows: "+rows.length)
							ORG = req.session.ORG = new Object();
							ORG.count = req.session.ORG.count = rows.length; 
							ORG.Machine = req.session.ORG.Machine = new Array();
							
							for(i=0;i<rows.length;i++)
							{
								console.log(rows[i].mname+" \t "+rows[i].mhost+" \t "+rows[i].port+" \t "+rows[i].mtype+" \t "+rows[i].muser+" \t "+rows[i].mpwd+" \t "+rows[i].mldir+" \t "+rows[i].mrdir);
								m = new Object;
								m.name = rows[i].mname;
								m.host = rows[i].mhost;
								m.localDir = rows[i].mldir;
								m.type = rows[i].mtype; 
								ORG.Machine[i] = req.session.ORG.Machine[i] = m;						
							}
							//write response txt saying delete successful
							
							res.write("<script type=text/javascript>alert('Machines Successfully Deleted'); window.location='http://"+MyLocalIP+":3000/admin/'</script>");
						res.end();
					}
			});		
	
	}
}//Session Undefined
else
{

res.write("<script>window.location='http://"+MyLocalIP+":3000/login/'</script>");
res.end();

}
	
	});
});


app.get("/admin/delete_machine",function(req,res)
		{
		
		session(req,res,function(req,res){
			
			res.writeHead(200,{"Content-type":"text/html"});
			
			if(req.session.UserSession != undefined){
			
			name = req.session.UserSession.user[0].name;
			fs.readFile(path.join(__dirname,'public')+"/admin/del_machine.html",function(err,uploadPage){
				if(err != null){
					console.log("delete machines error: "+err);
					}
					
					uploadPage = uploadPage.toString();
					uploadPage = replaceAll("localhost", MyLocalIP, uploadPage);
					uploadPage = uploadPage.replace("ADMIN_NAME_HERE",name);
					
					res.write(uploadPage);
					res.end();
			});
			}
			else
			{
				res.write("<script>window.location='http://"+MyLocalIP+":3000/admin/'</script>");
				res.end();
			}
	});//Session
});

app.post("/admin/add",function(req,res){

session(req,res,function(req,res){
	

	var machineName=req.body.machine_name;
	var ipAddr=req.body.ip_addr;
	var loomType=req.body.loom_type;
	
	userSession = req.session.UserSession;
	table = userSession.user[0].org;
	
	
	console.log("machine name = "+machineName);
	console.log("Ip Addr = "+ipAddr);
	console.log("loom type = "+loomType);
	console.log("Belongs to: "+table);
	
	res.writeHead(200,{"Content-type":"text/html"});
	
	var post  = {mname: machineName, mhost: ipAddr,port:21,mtype:parseInt(loomType),mldir:Repo+machineName+"/"};
	var query = con.query('INSERT INTO '+table+' SET ?', post, function(err, result) {
	  if(err)
	  {
		  console.log("Mysql Query Error!: "+err);
		  res.write("<script type=text/javascript>alert(\"This machine ip already exists\");window.location='http://"+MyLocalIP+":3000/admin/add_machine/'</script>");
					res.end(); 
	  }
	  else
	  {
		  console.log("machine "+machineName+" added Successfully");
		  res.write("<script type=text/javascript>alert(\"Machine added successfully\");window.location='http://"+MyLocalIP+":3000/admin/'</script>");
		  res.end();
		  
		  m = new Object();
		  m.host = ipAddr;
		  m.name = machineName;
		  m.type = loomType;
		  m.localDir = Repo+machineName+"/";
		  
		  req.session.ORG.Machine[ORG.count] = m;
		  req.session.ORG.count++;
		  
		  ORG = req.session.ORG;
		  
					
					chid = exec('mkdir '+Repo+machineName,function(error,stdout,stderr){
        console.log('stdout: '+stdout);
        console.log('stderr: '+stderr);
        if(error !== null){
            console.log('exec error: '+error);
        }
    }); 
	  }
	});

  }); //Session
});

app.get("/admin/add_machine",function(req,res)
		{
		
		session(req,res,function(req,res){
		
			res.writeHead(200,{"Content-type":"text/html"});
			
			if(req.session.UserSession != undefined){
			
			name = req.session.UserSession.user[0].name;
				
			fs.readFile(path.join(__dirname,'public')+"/admin/add_machine.html",function(err,uploadPage){
				if(err != null){
					throw err;
					console.log("Add machines Get error");
				}
				
				uploadPage = uploadPage.toString();
				uploadPage = replaceAll("localhost", MyLocalIP, uploadPage);
				uploadPage = uploadPage.replace("ADMIN_NAME_HERE",name);
				
				res.write(uploadPage);
				res.end();
			});
			}
			else
			{
				res.write("<script>window.location='http://"+MyLocalIP+":3000/login/'</script>");
				res.end();
			}
	});//Session
});

app.post("/machine_command",function(req,res)
{
session(req,res,function(req,res){

if (req.method === 'OPTIONS') {
      console.log('!OPTIONS');
      var headers = {};
      // IE8 does not allow domains to be specified, just the *
      // headers["Access-Control-Allow-Origin"] = req.headers.origin;
      headers["Access-Control-Allow-Origin"] = "*";
      headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
      headers["Access-Control-Allow-Credentials"] = false;
      headers["Access-Control-Max-Age"] = '86400'; // 24 hours
      headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
      res.writeHead(200, headers);
      res.end();
}

if(req.session.UserSession != undefined)
{

res.writeHead(200, {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*"
});

if(req.session.CurrentMachine != undefined)
req.session.CurrentMachine.CMD = req.body.MCMD;
else
{
res.end(); //Send Error
console.log("Current Machine is undefined");
}
console.log(JSON.stringify(req.session));
CurMachine = req.session.ORG.Machine[req.session.CurrentMachine.NUM];
CMD_HOST = CurMachine.host;
arg = "--";
cmd_client.connect(CMD_PORT,"10.0.0.3",function(){
	console.log("Connected to CMD Server! \nSending Command to Machine:"+CurMachine.name);
	cmd_client.write("CMD:"+req.session.CurrentMachine.CMD);
	if(req.session.CurrentMachine.CMD == "START-W" || req.session.CurrentMachine.CMD == "STOP-W")
		arg = "672.lmk";
	cmdLog({machine:req.session.ORG.Machine[req.session.CurrentMachine.NUM],cmd:req.session.CurrentMachine.CMD,arg:arg});
	res.write(JSON.stringify({message:"Command Logged",cmd:req.session.CurrentMachine.CMD,ack:"SUCCESS"}));
	//cmd_client.end();
});

cmd_client.on("data",function(data){
	data = data.toString();
	console.log("Recieved ACK \n"+data);
	//Enter The Command & Time into Database.
	data = data.split(':');
	if(data[0] == "ACK" && data[2] == "SUCCESS")
		console.log("ACK Success");
	else
		console.log("ACK FAIL for CMD:"+data[1]);
	cmd_client.end();
	res.end();
});

cmd_client.on("error",function(err)
{
console.log("CMD Socket Error: "+err);
});

}
else
{
console.log("Illegal Post");
res.end();
}
	
});//Session
});

app.post("/machine-info",function(req,res)
{
session(req,res,function(req,res){

if(req.session.UserSession != undefined)
{
req.session.CurrentMachine = {};
req.session.CurrentMachine.NUM = req.body.machine_num;
console.log(JSON.stringify(req.session));
//res.write("<script>window.location='http://"+MyLocalIP+":3000/admin/control_panel'</script>")
res.end();
}
else
{
//res.write("<script>window.location='http://"+MyLocalIP+":3000/login/'</script>");
console.log("Illegal Post");
res.end();
}
	
});//Session
});

app.get("/admin/control_panel",function(req,res){
	session(req,res,function(req,res){
		
		if(req.session.UserSession != undefined){
					name = req.session.UserSession.user[0].name;
		
		console.log(req.session.CurrentMachine);
		
		uploadPage = fs.readFileSync(path.join(__dirname,'public')+"/admin/c_panel.html",'utf8'); 
		res.writeHead(200,{"Content-Type":"text/html"});
		
		uploadPage = uploadPage.toString();
		uploadPage = uploadPage.replace("ADMIN_NAME_HERE",name);
		uploadPage = replaceAll("localhost", MyLocalIP, uploadPage);
		
		res.write(uploadPage);
		res.end();
		}
		else
		{
			res.write("<script>window.location='http://"+MyLocalIP+":3000/login/'</script>");
			res.end();
		}
		
	});
});


//Machine List Page
app.get("/admin/mpanel",function(req,res)
		{
		
session(req,res,function(req,res){
				
				if(req.session.ORG != undefined)
					ORG = req.session.ORG;
				
			res.writeHead(200,{"Content-type":"text/html"});
			if(req.session.UserSession != undefined){
					name = req.session.UserSession.user[0].name;
			
			
			fs.readFile(path.join(__dirname,'public')+"/admin/machines.html",function(err,uploadPage){
				if(err != null)
				{
					console.log("Post Login Get error!");
					throw err;
				}
				
				uploadPage = uploadPage.toString();
				uploadPage = uploadPage.replace("ADMIN_NAME_HERE",name);
				uploadPage = replaceAll("localhost", MyLocalIP, uploadPage);
				
				res.write(uploadPage);
				
				res.end();
			});
			}
			else
			{
				res.write("<script>window.location='http://"+MyLocalIP+":3000/login/'</script>");
				res.end();
			}
	});//Session
});

//Admin Control Panel Page
app.get("/admin",function(req,res)
		{
		
session(req,res,function(req,res){

			if(req.session.indervalId != undefined)
				clearInterval(req.session.indervalId);
				
				console.log("MySession: \n"+JSON.stringify(req.session));
				
				if(req.session.UserSession != undefined)
					name = req.session.UserSession.user[0].name;
				
			res.writeHead(200,{"Content-type":"text/html"});
			if(req.session.UserSession != undefined){
			fs.readFile(path.join(__dirname,'public')+"/admin/home.html",function(err,uploadPage){
				if(err != null)
				{
					console.log("Post Login Get error!");
					throw err;
				}
				
				uploadPage = uploadPage.toString();
				uploadPage = uploadPage.replace("ADMIN_NAME_HERE",name);
				uploadPage = replaceAll("localhost", MyLocalIP, uploadPage);
				
				res.write(uploadPage);
				res.end();
			});
			}
			else
			{
				res.write("<script>window.location='http://"+MyLocalIP+":3000/login/'</script>");
				res.end();
			}
	});//Session
});


//Login Page
app.get('/login',function(req,res){

session(req,res,function(req,res){
	res.writeHead(200,{"Content-type":"text/html"});
	
	if(req.session.UserSession != undefined){
		res.write("<script type='text/javascript'>window.location='http://"+MyLocalIP+":3000/admin/'</script>");
		res.end();
		return;
	}
	else
		fs.readFile(path.join(__dirname,'public')+"/login/index.html",function(err,loginPage){
			if(err!= null){
			console.log("Login");
			throw err;
			}
	
	loginPage = loginPage.toString();
	loginPage = replaceAll("localhost", MyLocalIP, loginPage);
	res.write(loginPage);
	res.end();
	});
 });
});

//------------------------------------------------            START LOGIN Authentication                -------------------------------------------------

app.post("/login/auth",function(req,res){

session(req,res,function(req,res){

//Set Session Variables

 login=req.body.user.email
 pwd=req.body.user.pwd;
    
 
res.writeHead(200,{"Content-type":"text/html"});
    
   if(Logins[login] == true)
   {
	   			console.log("User with login:"+login+" is already logged in.");
				res.write("<script type=text/javascript>alert('You have already logged in from different source. Please logout and try again.');window.location='http://"+MyLocalIP+":3000/login/'</script>");
				res.end();
				return;
   } 

/* console.log("Login: "+login); */
md5 = crypto.createHash("md5");
md5.update(pwd);
pwd = md5.digest('hex')
/* console.log("Pwd: "+pwd); */

con.query("select * from owner where email='"+login+"';",function(err,rows,fields)
	{
		if(err != null)
		{
			console.log("Mysql Query Error!");
			throw err;
		}
		else if(rows.length == 0){
		
				console.log("Authentication Failed!");
				res.write("<html><body><p>Authentication Failed!</p></body></html>");
				res.end();	
		}
		else{
			if(pwd == rows[0].pwd){
				req.session.UserSession = userSession = {"user":[{"name":rows[0].name,"email":rows[0].email,"org":rows[0].org}]};
				Logins[login] = true;
				//Set Additional Variables.
				console.log("Authentication Successful.");
				console.log("User Session: \n"+JSON.stringify(userSession));
				res.write("<script type=text/javascript>window.location='http://"+MyLocalIP+":3000/admin/'</script>");
				res.end();
				
								con.query("select * from "+userSession.user[0].org,function(err,rows,fields){
					
					if(err){
						console.log("Organization Query Error");
						res.end();
						//throw err;
					}
					
					console.log("--------"+userSession.user[0].org+"----------\nName \t Host \t Port \t Type \t User \t Pass \t Local \t Remote\n\n ");
					console.log("Rows: "+rows.length)
					ORG = req.session.ORG = new Object();
					ORG.count = req.session.ORG.count = rows.length; 
					ORG.Machine = req.session.ORG.Machine = new Array();
					
					for(i=0;i<rows.length;i++)
					{
						console.log(rows[i].mname+" \t "+rows[i].mhost+" \t "+rows[i].port+" \t "+rows[i].mtype+" \t "+rows[i].muser+" \t "+rows[i].mpwd+" \t "+rows[i].mldir+" \t "+rows[i].mrdir);
						
						m = new Object;
						m.name = rows[i].mname;
						m.host = rows[i].mhost;
						m.localDir = rows[i].mldir;
						m.type = rows[i].mtype; 
						ORG.Machine[i] = req.session.ORG.Machine[i] = m;
						
					}
					
					tcp_client.connect(PORT,HOST, function() {
						console.log('Connected');
						tcp_client.write("SSO:true");
						tcp_client.write("LINF:"+JSON.stringify(ORG));
						tcp_client.end();
						});
						
					tcp_client.on("error",function(err){
						console.log("TCP Socket Error:"+err);
					});
					
					
				});
				
			}
			else{
				console.log("Authentication Failed!");
				res.write("<html><body><p>Authentication Failed!</p></body></html>");
				res.end();
			}
		}
	});
	
	}); //Session

});

//--------------------------------------------------------              START MONITOR                -----------------------------------------------------------

app.post('/ctrial',function(req,res){

session(req,res,function(req,res){

if (req.url === '/favicon.ico') {
    res.writeHead(200, {'Content-Type': 'image/x-icon'});
    res.end();
    return;
  }

res.writeHead(200,{"Content-Type":"text/html"});

mMachine = req.body.Machine;

console.log("Machine to Monitor: "+mMachine);

var ftp = new JSFTP({
	host:req.session.ORG.Machine[mMachine].host,
	port:21,
	user:"admin",
	pass:""
});

ftp.get("/SENDFILE.CFG",function(err,s){
	console.log("Retrieving current printing file");
	
	if(err){
		console.log("Sendfile Throw");
		//throw err;
		res.write("<script>alert('Machine not connected.');window.location='http://"+MyLocalIP+":3000/monitor/'</script>");
		res.end();
		}
		
		s.on("data",function(data){
			console.log("File to FTP Get: "+data.toString());
			req.session.monitorFile = data.toString();
			ftp.get("/"+data.toString(),Repo+data.toString(),function(err){
				if(err)
				{
					console.log("Error in file Get");
					res.write("<script>alert('Machine not connected.');window.location='http://"+MyLocalIP+":3000/monitor/'</script>");
					res.end();
					s.end();
				}
				else
				{
					console.log("File Retrieved!");
					s.end();
					
					fs.readFile(Repo+req.session.monitorFile,function(err,lmk){
		if(err){
			console.log("FTP Throw");
			res.write("<script>alert(.Memory Full. Please Delete some Files.);window.location='http://"+MyLocalIP+":3000/monitor/'</script>");
			res.end();
			}
			
			buft = new Uint8Array(lmk);
			No_of_Legs =7;
			No_Of_Hooks = 672; //Change this
			loomtype=buft[0] + buft[1] *  256;
			LC = buft[2] + buft[3] *  256;
			No_of_LoomcontrollerCards=LC;
			max_weaveno = buft[4] + (buft[5] * 256);	
			No_of_Weavelines=max_weaveno;//reassignment//reassignment//reassignment
		 
		if (loomtype == 0 || loomtype == 64)
				Size_of_Leg = 64;
		else
			Size_of_Leg = loomtype;
			
			
			//loom configuration calculation
			Size_of_LoomcontrollerCard = No_of_Legs * Size_of_Leg;
			No_Of_CardsPerLeg = Size_of_Leg / 8;
			No_Of_BytesPerCard = No_Of_CardsPerLeg * 7;
			if (No_Of_BytesPerCard <= 64)
                    No_Of_BytesPerCard = 64;
			
		if((No_of_Legs * Size_of_Leg * LC) != No_Of_Hooks)
		{
			console.log(No_of_Legs * Size_of_Leg * LC);
			res.write("<script>alert('InValid LMKFile...'); window.location='http://"+MyLocalIP+":3000/admin/'; </script>");
			res.end();	
			return;
		}
		
		var xx=18;
		var data = new Array(No_of_Weavelines*No_of_LoomcontrollerCards);
                for (i = 0; i < (No_of_Weavelines*No_of_LoomcontrollerCards); i++)
                {
                    
                    //data[i] = new byte[64];hcjcjjjgc
				
                    data[i] = new Array(No_Of_BytesPerCard);
                    //fs.Read(data[i], 0, 64);
					for(j=0;j<No_Of_BytesPerCard;j++)
					data[i][j]=buft[xx++];
                    //fs.Read(data[i], 0, No_Of_BytesPerCard);
                }
		
		
		//rendering starts here loom display logic for handlooms
		c = new Object;
		c.width=No_of_LoomcontrollerCards * Size_of_LoomcontrollerCard;
		c.height=No_of_Weavelines;
		console.log(c.width);
		console.log(c.height);
		
		can = new Canvas(c.width,c.height);
		ctx = can.getContext('2d');
		// create a new batch of pixels with the same
		// dimensions as the image:
		var imageData = ctx.createImageData(can.width, can.height);
		
		var dig_data = new Array(No_of_LoomcontrollerCards * No_Of_BytesPerCard);
		
		for (lines = 0; lines < No_of_Weavelines; lines++)
         {
		 	var v=0;
			for (i = 0; i < No_of_LoomcontrollerCards; i++)
				for (j = 0; j < No_Of_BytesPerCard; j++)
					dig_data[v++] = data[lines * No_of_LoomcontrollerCards + i][j];
				
			v = 0;
			for (LCS = 0; LCS < No_of_LoomcontrollerCards; LCS++)
			{
				for (i = 0; i < 7; i++)
				{
					 mask = 0x01;
					for (l = 0; l < 8; l++)
					{
						for (k = 0; k < No_Of_CardsPerLeg; k++)
						{
							
							if ((dig_data[LCS * No_Of_BytesPerCard + i * No_Of_CardsPerLeg + k] & (1 << l)) != 0)
							{
								setPixel(imageData, v, lines, 255, 255, 255, 255); // 255 opaque
							}
							else
							{
								setPixel(imageData, v, lines, 0, 0, 0, 255)
							}
							v++;
							// b.SetPixel(v++, lines, Color.White);

						}
					}
				}

            }
       }
		//for(i=18;i<av.length;i++)
		//console.log(av[i]);
		
		// copy the image data back onto the canvas
		ctx.putImageData(imageData, 0, 0);	
			
		
		function setPixel(imageData, x, y, r, g, b, a) {
			index = (x + y * imageData.width) * 4;
			imageData.data[index+0] = r;
			imageData.data[index+1] = g;
			imageData.data[index+2] = b;
			imageData.data[index+3] = a;
		}	
			
		//console.log(buft);
		ctx.save();
		console.log("Redirected");
		
		
		overlay = new Canvas(c.width,c.height);
		Octx = overlay.getContext('2d');
		Octx.rect(0,0,c.width,c.height);
		var grd = Octx.createLinearGradient(0,0,c.width,c.height);
			//light blue
			grd.addColorStop(0,'#3A539B');
			// dark blue
			grd.addColorStop(1,'#2C3E50');
			Octx.fillStyle = grd;
			Octx.fill();
			Octx.save();
		
		
		res.write("<script>window.location='http://"+MyLocalIP+":3000/MonitorPrint/'</script>");
		res.end();
		req.session.monitorFTP = ftp;
		
	});

				}
				
			});
			
		});
		
		req.session.indervalId = setInterval(updateOverlay, 9000);
	
	s.resume();
		
		});

	});//Session
});

function updateOverlay()
{
console.log("Updating Overlay.....");
//Debug File: /amsler.co.nf/status.txt
monitorFTP.get("/WEAVENO",function(err,s){
	console.log("Status.txt Callback:");
	
	if(err){
		console.log("Overlay Throw");
//		throw err;
		}
		
	 //socketServer.sockets.emit("PrintStatus",{"update":d.toString()});
	s.on('data',function(d){
     	octx = overlay.getContext('2d');
	 	imageData = octx.getImageData(0,0,overlay.width,overlay.height);
	 	newHead =  d.toString();
	 	console.log("Recieved  NewHead "+newHead);
	 	
	 	if(newHead > can.height){
	 		newHead = can.height;
	 		
	 	}
	 	
	 	curHead = 0;
	 	
	 if(newHead > curHead && newHead <= can.height)
	 {
	 	 	console.log("Updating Pixels from Cur "+curHead+"-> New "+newHead);
	 	px = imageData.data;
	 	for(i = overlay.width*curHead*4 ; i < overlay.width*4*newHead; i+=4){
				px[i+3] = 0;
			}
		 
		 curHead = newHead;
	 }
	 
	 
	 octx.putImageData(imageData,0,0);
	 octx.save();
		
	});

 	s.resume(); 
	//socketServer.sockets.emit("PrintStatus",{update:printStatus});
});

}

app.get("/MonitorPrint",function(req,res){
	
	session(req,res,function(req,res){
		
			res.writeHead(200,{"Content-type":"text/html"});
			
			if(req.session.UserSession != undefined){
			
		res.write("<meta http-equiv='refresh' content='10' >");
		res.write("<style type='text/css'> #mcanvas{position:absolute; top:0px; left:0px; opacity:0.8;}   #cvs-src{ position:relative; top:0; left:0;} .img-wrap{position:relative;overflow: scroll;max-height: 500px;max-width: 500px;top: 0;left: 0;}</style>");
		res.write("<div class='img-wrap'>");
		res.write("<img id='lmkImage' src="+can.toDataURL()+"> <img id='mcanvas' src="+overlay.toDataURL()+"> </div>");
		res.end();
		}
		else{
			res.write("<script>window.location='http://"+MyLocalIP+":3000/login/';</script>");
			res.end();
		}
	});
});

//--------------------------------------------------------            START TRANSFER                -----------------------------------------------------------


function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}


app.get('/monitor',function(req,res){
	//response.writeHead(statusCode,[reasonPhase],[headers])
	session(req,res,function(req,res){
			res.writeHead(200,{"Content-type":"text/html"});
			if(req.session.UserSession != undefined){
				fs.readFile(path.join(__dirname, 'public')+"/Monitor/index.html",function(err,uploadPage){
			if(err != null){
				console.log("Monitor");
				throw err;
				}
				
				uploadPage = uploadPage.toString();
				uploadPage = replaceAll("localhost", MyLocalIP, uploadPage);
				
			res.write(uploadPage);	
			res.end();
			});
			}
			else
			{
				res.write("<script>window.location='http://"+MyLocalIP+":3000/login/'</script>");
				res.end();
			}
	});//session
});


app.get("/test",function(req,res){

/*
      					chid = exec('mkdir '+Repo+"Machine1",function(error,stdout,stderr){
        console.log('stdout: '+stdout);
        console.log('stderr: '+stderr);
        if(error !== null){
            console.log('exec error: '+error);
        }
    });
*/
	//res.end();
	
});


//-----------------------------------------------------------              START LOGOUT                -----------------------------------------------------------

app.get("/logout",function(req,res){
	session(req,res,function(req,res){

		if(req.session.UserSession!= undefined){
		Logins[req.session.UserSession.user[0].email] = undefined;
		req.session.UserSession = undefined;
		}
		

	res.writeHead(200,{"Content-type":"text/html"});
	res.write("<script>window.location='http://"+MyLocalIP+":3000/login/'</script>");
	res.end();
	
});//session
	
});

//---------------------	             END LOGOUT                ----------------------------



//---------------------------------------------------             START SOCKET METHODS                -----------------------------------------------------


function sendToNextHost()
{

if(trigger_count < machines.length && !cancelTrans)
{
 
 socketServer.sockets.emit("Sending to Machine "+ORG.Machine[machines[trigger_count]].name)
 
 console.log("Transferring File");

/*
	var transFtp = new JSFTP({
		host:"www.amsler.co.nf",
    	port:21,
    	user:"1508059",
    	pass:"netfundu"
	});
*/

var transFtp = new JSFTP({
	host:ORG.Machine[machines[trigger_count]].host,
	port:21,
	user:"admin",
	pass:""
});

			transFtp.put(ORG.Machine[machines[trigger_count]].localDir+fileName,"/"+fileName,function(err){
				if(err){
					console.log("Sending Failed to Machine: "+ORG.Machine[machines[trigger_count]].name+"\n");
					console.log("Error: "+err);
				}
				else{					
					console.log("File Sent");
					socketServer.sockets.emit("TransRes",{Data:"Transfer to Machine: "+ORG.Machine[machines[trigger_count]].name+" Successful"});
					socketServer.sockets.emit("ClientTrigger",{Data:"NEXT"});
					trigger_count++;				
				}					
			});
			
			transFtp.on("error",function(err){
			console.log("FTP onError: "+err);
			socketServer.sockets.emit("FTP_Error",{Data:ORG.Machine[machines[trigger_count]].name});
			trigger_count++;
		});
}
else
{
socketServer.sockets.emit("TransRes",{Data:"DONE"});
console.log("File Transfer to all hosts is complete.");
}

};

server.listen(app.get('port'), function(){
 console.log('Express server listening on port ' + app.get('port'));
});

var socketServer = io.listen(server);

//Code for Socket Communication
socketServer.sockets.on('connection',function(socket){

socket.emit('news',{hello:'world'});

socket.on('Monitor',function(data){
	console.log(data['Status']);
});

socket.on('ReqOrg',function(data){
	socket.emit("ResOrg",{"Data":JSON.stringify(ORG)});
});

socket.on('ReqStats',function(data){
	todayStats = getTodayStats();
	//socket.emit('stats',{data:todayStats});
});

socket.on('CancelTrans',function(data){
	cancelTrans = true;
	console.log("Transfer Cancelled!");
	trigger_count = 1;
});

socket.on('ClientTrigger',function(data){
	console.log("Next File Triggered. Count= "+trigger_count);
	
	sendToNextHost();
});

socket.on("getMonthlyStats",function(data)
{
	getMonthStats();
});

});





app.get('/slogin',function(req,res){
	fs.readFile(path.join(__dirname,'public')+"/login/index.html",function(err,uploadPage){
		if(err!= null){
			console.log("Login");
			//throw err;
			}
			
			session(req, res, function(req, res){

      // now we can access request.session
      req.session = {User:"Arjun"};

      // after the session middleware has executed, let's finish processing the request
      	res.writeHead(200,{"Content-type":"text/html"});
      	
      	uploadPage = uploadPage.toString();
		uploadPage = replaceAll("localhost", MyLocalIP, uploadPage);
      	
	  	res.write(uploadPage);
	  	res.end();
    });
	});
});

app.post("/slogin/auth",function(req,res){

var login=req.body.user.email,
    pwd=req.body.user.pwd;

/* console.log("Login: "+login); */
md5 = crypto.createHash("md5");
md5.update(pwd);
pwd = md5.digest('hex')
/* console.log("Pwd: "+pwd); */

session(req, res, function(req, res){

console.log(JSON.stringify(req.session)+"\n");

res.writeHead(200,{"Content-type":"text/html"});

con.query("select * from owner where email='"+login+"';",function(err,rows,fields)
	{
		if(err != null)
		{
			console.log("Mysql Query Error!");
			throw err;
		}
		else if(rows.length == 0){
		
				console.log("Authentication Failed!");
				res.write("<html><body><p>Authentication Failed!</p></body></html>");
				res.end();	
		}
		else{
			if(pwd == rows[0].pwd){
				userSession = {"user":[{"name":rows[0].name,"email":rows[0].email,"org":rows[0].org}]};
				req.session.user = userSession;
				console.log("Authentication Successful.");
				//console.log("User Session: \n"+JSON.stringify(userSession));
				res.write("<script type=text/javascript>window.location='http://"+MyLocalIP+":3000/admin/'</script>");
				res.end();
				
								con.query("select * from "+userSession.user[0].org,function(err,rows,fields){
					
					if(err){
						console.log("Organization Query Error");
						res.end();
						//throw err;
					}
					
					console.log("--------"+userSession.user[0].org+"----------\nName \t Host \t Port \t Type \t User \t Pass \t Local \t Remote\n\n ");
					console.log("Rows: "+rows.length)
					ORG = new Object();
					ORG.count = rows.length; 
					ORG.Machine = new Array();
					for(i=0;i<rows.length;i++)
					{
						console.log(rows[i].mname+" \t "+rows[i].mhost+" \t "+rows[i].port+" \t "+rows[i].mtype+" \t "+rows[i].muser+" \t "+rows[i].mpwd+" \t "+rows[i].mldir+" \t "+rows[i].mrdir);
						
						m = new Object;
						m.name = rows[i].mname;
						m.host = rows[i].mhost;
						m.localDir = rows[i].mldir;
						m.type = rows[i].mtype; 
						ORG.Machine[i] = m;
						
					}
				});
				
			}
			else{
				console.log("Authentication Failed!");
				res.write("<html><body><p>Authentication Failed!</p></body></html>");
				res.end();
			}
		}
	});
	
});

});


app.get("/user",function(req,res){
	
	session(req,res,function(req,res){
		name = req.session.UserSession.user[0].name;
		console.log("My Session: \n"+JSON.stringify(req.session));
		res.end();
	});
	
});


app.get("/admin/monitor",function(req,res){

var ipAddr = new Object;

session(req,res,function(req,res){

res.writeHead(200,{"Content-Type":"text/html"});

if(req.session.UserSession != undefined)
{

var count = -1, rowsNum =0;

var handler = function(error, content){
count++;
if(error){
		console.log("FTP Throw");
		res.write("<script>alert(.Memory Full. Please Delete some Files.);window.location='http://"+MyLocalIP+":3000/admin/'</script>");
		res.end();
		console.log(error);
}
else{

			buft = new Uint8Array(content);
			No_of_Legs =7;
			No_Of_Hooks = 672; //Change this
			loomtype=buft[0] + buft[1] *  256;
			LC = buft[2] + buft[3] *  256;
			No_of_LoomcontrollerCards=LC;
			max_weaveno = buft[4] + (buft[5] * 256);	
			No_of_Weavelines=max_weaveno;//reassignment//reassignment//reassignment
		 
		if (loomtype == 0 || loomtype == 64)
				Size_of_Leg = 64;
		else
			Size_of_Leg = loomtype;
			
			
			//loom configuration calculation
			Size_of_LoomcontrollerCard = No_of_Legs * Size_of_Leg;
			No_Of_CardsPerLeg = Size_of_Leg / 8;
			No_Of_BytesPerCard = No_Of_CardsPerLeg * 7;
			if (No_Of_BytesPerCard <= 64)
                    No_Of_BytesPerCard = 64;
			
		if((No_of_Legs * Size_of_Leg * LC) != No_Of_Hooks)
		{
			console.log(No_of_Legs * Size_of_Leg * LC);
			res.write("<script>alert('InValid LMKFile...'); window.location='http://"+MyLocalIP+":3000/admin/'; </script>");
			res.end();	
			return;
		}
		
		var xx=18;
		var data = new Array(No_of_Weavelines*No_of_LoomcontrollerCards);
                for (i = 0; i < (No_of_Weavelines*No_of_LoomcontrollerCards); i++)
                {
                    
                    //data[i] = new byte[64];hcjcjjjgc
				
                    data[i] = new Array(No_Of_BytesPerCard);
                    //fs.Read(data[i], 0, 64);
					for(j=0;j<No_Of_BytesPerCard;j++)
					data[i][j]=buft[xx++];
                    //fs.Read(data[i], 0, No_Of_BytesPerCard);
                }
		
		
		//rendering starts here loom display logic for handlooms
		c = new Object;
		c.width=No_of_LoomcontrollerCards * Size_of_LoomcontrollerCard;
		c.height=No_of_Weavelines;
		console.log(c.width);
		console.log(c.height);
		
		can = new Canvas(c.width,c.height);
		ctx = can.getContext('2d');
		// create a new batch of pixels with the same
		// dimensions as the image:
		var imageData = ctx.createImageData(can.width, can.height);
		
		var dig_data = new Array(No_of_LoomcontrollerCards * No_Of_BytesPerCard);
		
		for (lines = 0; lines < No_of_Weavelines; lines++)
         {
		 	var v=0;
			for (i = 0; i < No_of_LoomcontrollerCards; i++)
				for (j = 0; j < No_Of_BytesPerCard; j++)
					dig_data[v++] = data[lines * No_of_LoomcontrollerCards + i][j];
				
			v = 0;
			for (LCS = 0; LCS < No_of_LoomcontrollerCards; LCS++)
			{
				for (i = 0; i < 7; i++)
				{
					 mask = 0x01;
					for (l = 0; l < 8; l++)
					{
						for (k = 0; k < No_Of_CardsPerLeg; k++)
						{
							
							if ((dig_data[LCS * No_Of_BytesPerCard + i * No_Of_CardsPerLeg + k] & (1 << l)) != 0)
							{
								setPixel(imageData, v, lines, 255, 255, 255, 255); // 255 opaque
							}
							else
							{
								setPixel(imageData, v, lines, 0, 0, 0, 255)
							}
							v++;
							// b.SetPixel(v++, lines, Color.White);

						}
					}
				}

            }
       }
		//for(i=18;i<av.length;i++)
		//console.log(av[i]);
		
		// copy the image data back onto the canvas
		ctx.putImageData(imageData, 0, 0);	
			
		
		function setPixel(imageData, x, y, r, g, b, a) {
			index = (x + y * imageData.width) * 4;
			imageData.data[index+0] = r;
			imageData.data[index+1] = g;
			imageData.data[index+2] = b;
			imageData.data[index+3] = a;
		}	
			
		
/*
		grd = ctx.createLinearGradient(0,0,can.width,can.height);
						//light blue
						grd.addColorStop(0,'#3A539B');
						// dark blue
						grd.addColorStop(1,'#2C3E50');
						ctx.fillStyle = grd;
						ctx.fill();
*/
		ctx.save();
		
	/* 	<div class="img-wrap"><canvas id="mcanvas" ></canvas> */
		m = count+1;
		res.write("<br><br><br><div class='image-container'> <p class='subtitle'> Machine "+m+" </p> <div class='img-wrap'><img src='"+can.toDataURL()+"' width="+can.width+" height="+can.height+"/><canvas class='mcanvas' id='mcanvas"+count+"' width="+can.width+" height="+can.height+"></canvas></div></div>");
		
}

if(count == (rowsNum -1 ) ){

//First Entry
	res.write("</div><script> var v = "+count+";</script>");
	var uploadPage = fs.readFileSync(PublicDir+"admin/monitor.html");
	
	uploadPage = uploadPage.toString();
	uploadPage = replaceAll("localhost", MyLocalIP, uploadPage);
	uploadPage = uploadPage.replace("ADMIN_NAME_HERE", name);

	res.write(uploadPage);
//First Entry --	

	res.end();
	}
}


con.query("Select * from "+req.session.UserSession.user[0].org+" where curFile IS NOT NULL;",function(err,rows,fields)
{

if(err)
	console.log("Machine File Error");

console.log(JSON.stringify(rows));

res.write("<script>var ipAddr = new Object();</script>");

rowsNum = rows.length;

for(i = 0;i<rows.length;i++)
res.write("<script>ipAddr['"+rows[i].mhost+"'] = "+i+";</script>");

res.write("<div class ='loaderSub' id='loaderSub'><pre>Waiting for Server...</pre></div>");	
	

for(j = 0;j<rows.length;j++)
	fs.readFile(rows[j].mldir+rows[j].curFile,handler);


if(rows.length == 0)
	res.end();

});


}
else{
					res.write("<script>window.location='http://"+MyLocalIP+":3000/login/'</script>");
					res.end();
}

}); //Session



});
