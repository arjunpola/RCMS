
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

var session = require('sesh').session;



var monitorFile="",monitorFTP="",curHead=0,ORG="",trigger_count=0,machines="",fileName="";
var cancelTrans = false;
var can = "",overlay="",

Repo = "/Users/arjunpola/Node_Apps/exp_trial/public/repository/",
PublicDir = "/Users/arjunpola/Node_Apps/exp_trial/public/";
RepoDir = "/repository/";


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

//-----------------------------------------------------------              START LOGIN                -----------------------------------------------------------

app.get('/login',function(req,res){

session(req,res,function(req,res){
	fs.readFile(path.join(__dirname,'public')+"/login/index.html",function(err,loginPage){
		if(err!= null){
			console.log("Login");
			throw err;
			}
	res.writeHead(200,{"Content-type":"text/html"});
	
	if(req.session.UserSession != undefined){
		res.write("<script type='text/javascript'>window.location='http://localhost:3000/postlogin/'</script>");
		res.end();
		return;
	}
	
	res.write(loginPage);
	res.end();
	});
 });
});

//------------------------------------------------            START LOGIN Authentication                -------------------------------------------------

app.post("/login/auth",function(req,res){

session(req,res,function(req,res){

//Set Session Variables
/*
req.session.curHead = 0;
req.session.trigger_count=0;
*/

var login=req.body.user.email,
    pwd=req.body.user.pwd;

/* console.log("Login: "+login); */
md5 = crypto.createHash("md5");
md5.update(pwd);
pwd = md5.digest('hex')
/* console.log("Pwd: "+pwd); */
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
				req.session.UserSession = userSession = {"user":[{"name":rows[0].name,"email":rows[0].email,"org":rows[0].org}]}; //Set Additional Variables.
				console.log("Authentication Successful.");
				console.log("User Session: \n"+JSON.stringify(userSession));
				res.write("<script type=text/javascript>window.location='http://localhost:3000/postlogin/'</script>");
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

//-----------------------------------------------------------              START HOME                -----------------------------------------------------------

app.get("/home",function(req,res)
		{
		
		session(req,res,function(req,res){
			
			res.writeHead(200,{"Content-type":"text/html"});
			
			if(req.session.UserSession != undefined){
			fs.readFile(path.join(__dirname,'public')+"/home/index.html",function(err,uploadPage){
				if(err != null){
					console.log("Home");
					throw err;
					}
				
				console.log("Org: "+userSession.user[0].org);
				
					
					console.log("\n\n"+JSON.stringify(req.session.ORG));															
					
					res.write(uploadPage);
					res.end();
			});
			}
			else
			{
				res.write("<script>window.location='http://localhost:3000/login/'</script>");
				res.end();
			}
	});//Session
});

//-----------------------------------------------------              POST LOGIN                --------------------------------------------------------

app.get("/postlogin",function(req,res)
		{
		
session(req,res,function(req,res){

			if(req.session.indervalId != undefined)
				clearInterval(req.session.indervalId);
				
				console.log("MySession: \n"+JSON.stringify(req.session));
				
			res.writeHead(200,{"Content-type":"text/html"});
			if(req.session.UserSession != undefined){
			fs.readFile(path.join(__dirname,'public')+"/postlogin/postlogin.html",function(err,uploadPage){
				if(err != null)
				{
					console.log("Post Login Get error!");
					throw err;
				}
				res.write(uploadPage);
				res.end();
			});
			}
			else
			{
				res.write("<script>window.location='http://localhost:3000/login/'</script>");
				res.end();
			}
	});//Session
});

//-----------------------------------------------------              ADD MACHINES GET                --------------------------------------------------------

app.get("/addmachines",function(req,res)
		{
		
		session(req,res,function(req,res){
		
			res.writeHead(200,{"Content-type":"text/html"});
			
			if(req.session.UserSession != undefined){
			fs.readFile(path.join(__dirname,'public')+"/addMachines/addMachines.html",function(err,uploadPage){
				if(err != null){
					throw err;
					console.log("Add machines Get error");
				}
				res.write(uploadPage);
				res.end();
			});
			}
			else
			{
				res.write("<script>window.location='http://localhost:3000/login/'</script>");
				res.end();
			}
	});//Session
});


//-----------------------------------------------------              ADD MACHINES POST                --------------------------------------------------------

app.post("/addmachines/add",function(req,res){

session(req,res,function(req,res){
	

	var machineName=req.body.machine_name;
	var ipAddr=req.body.ip_addr;
	var loomType=req.body.loom_type;
	
	console.log("machine name = "+machineName);
	console.log("Ip Addr = "+ipAddr);
	console.log("loom type = "+loomType);
	
	res.writeHead(200,{"Content-type":"text/html"});
	
	var post  = {mname: machineName, mhost: ipAddr,port:21,mtype:parseInt(loomType),mldir:Repo+machineName};
	var query = con.query('INSERT INTO looms.sailoomtech SET ?', post, function(err, result) {
	  if(err)
	  {
		  console.log("Mysql Query Error!");
		  res.write("<script type=text/javascript>alert(\"This machine ip already exists\");window.location='http://localhost:3000/addmachines/'</script>");
					res.end();
				//throw err; 
	  }
	  else
	  {
		  console.log("machine "+machineName+" added Successfully");
		  res.write("<script type=text/javascript>alert(\"Machine added successfully\");window.location='http://localhost:3000/addmachines/'</script>");
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
		res.write("<script>alert('Machine not connected.');window.location='http://localhost:3000/monitor/'</script>");
		res.end();
		}
		
		s.on("data",function(data){
			console.log("File to FTP Get: "+data.toString());
			req.session.monitorFile = data.toString();
			ftp.get("/"+data.toString(),Repo+data.toString(),function(err){
				if(err)
				{
					console.log("Error in file Get");
					res.write("<script>alert('Machine not connected.');window.location='http://localhost:3000/monitor/'</script>");
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
			res.write("<script>alert(.Memory Full. Please Delete some Files.);window.location='http://localhost:3000/monitor/'</script>");
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
			res.write("<script>alert('InValid LMKFile...'); window.location='http://localhost:3000/postlogin/'; </script>");
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
		
		
		res.write("<script>window.location='http://localhost:3000/MonitorPrint/'</script>");
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
			res.write("<script>window.location='http://localhost:3000/login/';</script>");
			res.end();
		}
	});
});

//--------------------------------------------------------            START TRANSFER                -----------------------------------------------------------

app.post('/api/photos',function(req,res){

console.log(JSON.stringify(req.body));

session(req,res,function(req,res){

res.writeHead(200,{"Content-Type":"text/html"});

	if(req.files.userPhoto.name == ""){
		 res.write("<script>alert('Please Select Valid File!'); window.location='http://localhost:3000/home/'</script>");
	     res.end();
		}
	else if(req.body.Machine === undefined){
		
		res.write("<script>alert('Please Select atleast 1 Machine'); window.location='http://localhost:3000/home/'</script>");
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
			  res.write("<script>alert('OOPS! Theres some problem. Please try again later.'); window.location='http://localhost:3000/home/'</script>");
			  res.end();
			  return;	  	
/*               socketServer.socket.emit("TransRes",{Data:"OOPS! Theres some proble. Please Try Again!"}); */
        }
        
			
			res.write("<script>window.location='http://localhost:3000/uploading/'</script>");
						

console.log("Transferring File");

	var transFtp = new JSFTP({
		host:req.session.ORG.Machine[req.session.machines[0]].host,
    	port:21,
    	user:"admin",
    	pass:""
	});
	
	
			
			transFtp.put(req.session.globalPath,"/"+fileName,function(err){
			
				if(err){
					console.log("Sending Failed to Machine: "+req.session.ORG.Machine[req.session.machines[0]].name+"\n");
					console.log("Err:"+err);
					res.write("<script>alert('OOPS! Theres some problem. Please try again later.'); window.location='http://localhost:3000/home/'</script>");						res.end();
				}
				else{
					
					res.end();
					console.log("File Sent");
					socketServer.sockets.emit("TransRes",{Data:"Transfer to Machine: "+req.session.ORG.Machine[req.session.machines[0]].name+" Successful"});
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
				fs.readFile(path.join(__dirname, 'public')+"/Monitor/index.html",function(err,html){
			if(err != null){
				console.log("Monitor");
				throw err;
				}
			res.write(html);	
			res.end();
			});
			}
			else
			{
				res.write("<script>window.location='http://localhost:3000/login/'</script>");
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

app.get("/home/logout/",function(req,res){

/*
 userSession="",currGet = "",ORG= "",machines="",globalPath="",monitorFile="",monitorFTP="";
 cancelTrans = false,trigger_count=0;
 indervalId = "";
 can = "",overlay="",curHead=0,
*/

	session(req,res,function(req,res){

		req.session.UserSession = undefined;

	res.writeHead(200,{"Content-type":"text/html"});
	res.write("<script>window.location='http://localhost:3000/login/'</script>");
	res.end();
	
});//session
	
});

//-----------------------------------------------------------              END LOGOUT                -----------------------------------------------------------



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

socket.on('PrintStatus',function(data){
	console.log("Socket id: "+socket.id);
});

socket.on('ReqOrg',function(data){
	socket.emit("ResOrg",{"Data":JSON.stringify(ORG)});
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

});





app.get('/slogin',function(req,res){
	fs.readFile(path.join(__dirname,'public')+"/login/index.html",function(err,loginPage){
		if(err!= null){
			console.log("Login");
			//throw err;
			}
			
			session(req, res, function(req, res){

      // now we can access request.session
      req.session = {User:"Arjun"};

      // after the session middleware has executed, let's finish processing the request
      	res.writeHead(200,{"Content-type":"text/html"});
	  	res.write(loginPage);
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
				res.write("<script type=text/javascript>window.location='http://localhost:3000/postlogin/'</script>");
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


app.get("/cPanel",function(req,res){
	session(req,res,function(req,res){
		
		
		html = fs.readFileSync(path.join(__dirname,'public')+"/cPanel/index.html",'utf8'); 
		res.writeHead(200,{"Content-Type":"text/html"});
		res.write(html);
		res.end();
		
	});
});


app.get("/user",function(req,res){
	
	session(req,res,function(req,res){
		
		console.log("My Session: \n"+JSON.stringify(req.session));
		res.end();
	});
	
});


app.get("/MonitorTrial",function(req,res){

var ipAddr = new Object;

session(req,res,function(req,res){
	
res.writeHead(200,{"Content-Type":"text/html"});

var count = -1, rowsNum =0;
var handler = function(error, content){
count++;
if(error){
		console.log("FTP Throw");
		res.write("<script>alert(.Memory Full. Please Delete some Files.);window.location='http://localhost:3000/monitor/'</script>");
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
			res.write("<script>alert('InValid LMKFile...'); window.location='http://localhost:3000/postlogin/'; </script>");
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
			
		ctx.save();
	/* 	<div class="img-wrap"><canvas id="mcanvas" ></canvas> */
		m = count+1;
		res.write("<div class='image-container'> <p class='subtitle'> Machine "+m+" </p> <div class='img-wrap'><img src='"+can.toDataURL()+"' width="+can.width+" height="+can.height+"/><canvas class='mcanvas' id='mcanvas"+count+"' width="+can.width+" height="+can.height+"></canvas></div></div>");
		
		
/*
		res.write("<div class='image-container'> <p class='subtitle'> Machine 2 </p> <div class='img-wrap'><img src='"+can.toDataURL()+"' width="+can.width+" height="+can.height+"/><canvas class='mcanvas' id='mcanvas1' width="+can.width+" height="+can.height+"></canvas></div></div>");
		
		res.write("<div class='image-container'><p class='subtitle'> Machine 3 </p> <div class='img-wrap'><img src='"+can.toDataURL()+"' width="+can.width+" height="+can.height+"/><canvas class='mcanvas' id='mcanvas2' width="+can.width+" height="+can.height+"></canvas></div></div></div>");
		res.write("<script>var v ="+count+"</script>");
*/
		
	/* res.write(content); */
}

if(count == (rowsNum -1 ) ){
	res.write("</div><script> var v = "+count+";</script>");
	var html = fs.readFileSync(PublicDir+"MonitorTrial/index.html");
	res.write(html);
	res.end();
	}
}



con.query("Select * from "+req.session.UserSession.user[0].org+" where curFile IS NOT NULL;",function(err,rows,fields)
{

if(err)
	console.log("Machine File Error");

res.write("<div class='container'> <div class ='loaderSub' id='loaderSub'><pre>Waiting for Server...</pre></div>");
console.log(JSON.stringify(rows));

res.write("<script>var ipAddr = new Object();</script>");

rowsNum = rows.length;

for(i = 0;i<rows.length;i++)
res.write("<script>ipAddr['"+rows[i].mhost+"'] = "+i+";</script>");

for(i = 0;i<rows.length;i++)
	fs.readFile(rows[i].mldir+rows[i].curFile,handler);

if(rows.length == 0)
	res.end();

});

}); //Session


});
