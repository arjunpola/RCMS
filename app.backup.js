
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



var userSession="",currGet = "",ORG= "",machines="",globalPath="";
var cancelTrans = false,trigger_count=0;
var can = "",overlay="",curHead="",
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
/*
var Ftp = new JSFTP({
	host:"172.16.18.65",
	port:21,
	user:"admin",
	pass:""
});
*/

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
app.use(express.favicon());
app.use(express.logger('dev'));
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
	fs.readFile(path.join(__dirname,'public')+"/login/index.html",function(err,loginPage){
		if(err!= null){
			console.log("Login");
			throw err;
			}
	res.writeHead(200,{"Content-type":"text/html"});
	res.write(loginPage);
	res.end();
	});
});

//------------------------------------------------            START LOGIN Authentication                -------------------------------------------------

app.post("/login/auth",function(req,res){

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
				userSession = {"user":[{"name":rows[0].name,"email":rows[0].email,"org":rows[0].org}]};
				console.log("Authentication Successful.");
				console.log("User Session: \n"+JSON.stringify(userSession));
				res.write("<script type=text/javascript>window.location='http://localhost:3000/postlogin/'</script>");
				res.end();
			}
			else{
				console.log("Authentication Failed!");
				res.write("<html><body><p>Authentication Failed!</p></body></html>");
				res.end();
			}
		}
	});

});

//-----------------------------------------------------------              START HOME                -----------------------------------------------------------

app.get("/home",function(req,res)
		{
			
			if(userSession != ""){
			fs.readFile(path.join(__dirname,'public')+"/home/index.html",function(err,uploadPage){
				if(err != null){
					console.log("Home");
					throw err;
					}
				
				console.log("Org: "+userSession.user[0].org);
				
				con.query("select * from "+userSession.user[0].org,function(err,rows,fields){
					
					if(err){
						console.log("Organization Query Error");
						throw err;
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
						ORG.Machine[i] = m;
						
					}
					
					console.log("\n\n"+JSON.stringify(ORG));
					
					res.writeHead(200,{"Content-type":"text/html"});	
														
/*
					res.write("<script> a = document.getElementById('MNames'); b = document.getElementById('MTypes');");
					for(i=0;i<rows.length;i++)
					{
						res.write("a.appendChild(<input type=checkbox name=Machine value="+rows[i].mhost+">"+rows[i].mname+");");
						res.write("b.appendChild(<input type=radio name=Type value="+rows[i].type+">"+rows[i].type+");");
					}
					res.write("</script>");
*/
					
					res.write(uploadPage);
					res.end();
					
				});
			});
			}
			else
			{
				res.write("Invalid Access!");
				res.end();
			}
});

//-----------------------------------------------------              POST LOGIN                --------------------------------------------------------

app.get("/postlogin",function(req,res)
		{
			res.writeHead(200,{"Content-type":"text/html"});
			if(userSession != ""){
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
});

//-----------------------------------------------------              ADD MACHINES GET                --------------------------------------------------------

app.get("/addmachines",function(req,res)
		{
			res.writeHead(200,{"Content-type":"text/html"});
			if(userSession != ""){
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
});


//-----------------------------------------------------              ADD MACHINES POST                --------------------------------------------------------

app.post("/addmachines/add",function(req,res){
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
					
					chid = exec('mkdir '+Repo+machineName,function(error,stdout,stderr){
        console.log('stdout: '+stdout);
        console.log('stderr: '+stderr);
        if(error !== null){
            console.log('exec error: '+error);
        }
    });
    
    
	  }
	});
/* 	console.log(query.sql); */
});



/*
var fTransfer = function(localPath,remotePath)
{
console.log("File Transfer Temporarily Commented!");	
}
*/


//app.get('/', routes.index);
//app.get('/users', user.list);

//Gambling Code

//--------------------------------------------------------              START MONITOR                -----------------------------------------------------------

app.get('/ctrial',function(req,res){

if (req.url === '/favicon.ico') {
    res.writeHead(200, {'Content-Type': 'image/x-icon'});
    res.end();
    return;
  }

res.writeHead(200,{"Content-Type":"text/html"});

	fs.readFile(path.join(__dirname,'public')+"/repository/672.lmk",function(err,lmk){
		if(err){
			console.log("FTP Throw");
			throw err;
			}
			
			buft = new Uint8Array(lmk);
			No_of_Legs =7;
			No_Of_Hooks = 672;
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
			res.write("<script>alert('InValid LMKFile...');</script>");
			res.write("window.href='http://localhost:3000/postlogin/'");
			res.end();	
		}
		else
		{
			/* res.write("<script>alert('Valid LMKFile...');</script>"); */
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
		setInterval(updateOverlay, 9000);
	});

//res.write("<img src="+canvas.toDataURL()+">");
});

function updateOverlay()
{

console.log("Updating Overlay.....");
//Debug File: /amsler.co.nf/status.txt
Ftp.get("/WEAVENO",function(err,s){
	console.log("Status.txt Callback:");
	
	if(err){
		console.log("Overlay Throw");
		throw err;
		}
		
	 //socketServer.sockets.emit("PrintStatus",{"update":d.toString()});
	s.on('data',function(d){
     	octx = overlay.getContext('2d');
	 	imageData = octx.getImageData(0,0,overlay.width,overlay.height);
	 	newHead = d.toString();
	 	console.log("Recieved  NewHead "+newHead);
	 if(newHead > curHead && newHead < can.height)
	 {
	 	 	console.log("Updating Pixels from Cur "+curHead+"-> New "+newHead);
	 	px = imageData.data;
	 	for(i = overlay.width*curHead*4 ; i < overlay.width*4*newHead; i+=4){
				px[i+3] = 0;
			}
		 
	 }
	 
	 curHead = newHead;
	 octx.putImageData(imageData,0,0);
	 octx.save();
		
	});

 	s.resume(); 
	//socketServer.sockets.emit("PrintStatus",{update:printStatus});
});

}

app.get("/MonitorPrint",function(req,res){
	
		
		res.writeHead(200,{"Content-Type":"text/html"});
		res.write("<meta http-equiv='refresh' content='10' >");
		res.write("<style type='text/css'> #mcanvas{position:absolute; top:0px; left:0px; opacity:0.8;}   #cvs-src{ position:relative; top:0; left:0;} .img-wrap{position:relative;overflow: scroll;max-height: 500px;max-width: 500px;top: 0;left: 0;}</style>");
		res.write("<div class='img-wrap'>");
		res.write("<img id='lmkImage' src="+can.toDataURL()+"> <img id='mcanvas' src="+overlay.toDataURL()+"> </div>");
		res.end();
});


/*
app.post('/trial/form',function(req,res){
	console.log(JSON.stringify(req.body));
	res.end();
});
*/

//Gambling Code

//-----------------------------------------------------------            START TRANSFER                -----------------------------------------------------------

app.post('/api/photos',function(req,res){

console.log(JSON.stringify(req.body));
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
		
	var fileName = req.files.userPhoto.name;
	machines = req.body.Machine;
	

	for(i=0;i<machines.length;i++)
	{
		console.log("Sending To Machine "+ORG.Machine[machines[i]].name);
	}
	
	
	var serverPath = '/Users/arjunpola/Node_Apps/exp_trial/public/repository/'
    globalPath = serverPath + fileName;
    
    require('fs').rename(
        req.files.userPhoto.path,globalPath,
        function(error){
            
            if(error){
			  console.log("Error in File Rename");
			  res.write("<script>alert('OOPS! Theres some problem. Please try again later.'); window.location='http://localhost:3000/home/'</script>");
			  res.end();	  	
/*               socketServer.socket.emit("TransRes",{Data:"OOPS! Theres some proble. Please Try Again!"}); */
        }
        
/*
        fs.readFile(path.join(__dirname,'public')+"/uploading/index.html",function(err,uploadingPage){
		if(err!= null){
			console.log("Login");
			throw err;
			}
*/
			
			res.write("<script>window.location='http://localhost:3000/uploading/'</script>");
						
			
/*
			var transFtp = new JSFTP({
				host:ORG.Machine[machines[0]].host,
				port:21,
				user:"admin",
				pass:""
			});
*/

console.log("Transferring File");

	var transFtp = new JSFTP({
		host:ORG.Machine[machines[0]].host,
    	port:21,
    	user:"admin",
    	pass:""
	});
			
			transFtp.put(globalPath,"/"+fileName,function(err){
			
				if(err){
					console.log("Sending Failed to Machine: "+ORG.Machine[machines[0]].name+"\n");
					res.write("<script>alert('OOPS! Theres some problem. Please try again later.'); window.location='http://localhost:3000/home/'</script>");						res.end();
				}
				else{
					
					res.end();
					console.log("File Sent");
					socketServer.sockets.emit("TransRes",{Data:"Transfer to Machine: "+ORG.Machine[machines[0]].name+" Successful"});
					socketServer.sockets.emit("ClientTrigger",{Data:"NEXT"});
					trigger_count++;
					
				}
				
					
			});

/* 		}); */
        
/*
        var i=0,ti=0,successCount=0;
        for(i=0;i<machines.length;i++)
        {
*/
/*         	console.log("Iteration "+i); */

/*
        if(!cancelTrans)
         {
*/
	        	/*
socketServer.sockets.emit("TransRes",{Data:"Configuring FTP for Machine:"+ORG.Machine[machines[i]].name});
	        	  
	        	var transFtp = new JSFTP({
				host:ORG.Machine[machines[i]].host,
				port:21,
				user:"admin",
				pass:""
				});
					
				sleep(1000);
*/	
				
/*
				transFtp.put(globalPath,"/"+fileName,function(err)
				{
					if(err)
						{
							console.log("Sending to Machine:"+machines[i]+" Failed\n");
							res.write("<script>alert('OOPS! Theres some problem. Please try again later.'); window.location='http://localhost:3000/home/'</script>");		
							res.end();
						}
						else{
							console.log("Successfully sent to Machine:"+machines[i]+"\n");
							successCount++;
							socketServer.sockets.emit("TransRes",{Data:"Sent to Machine:"+ORG.Machine[machines[i]].name});
							console.log("Successfully sent to Machine:"+machines[i]+"\n");
							sleep(1000);
							//res.end();
						}
				});
*/


			//}//Cancel Transfer is False
		/*
else{
				socketServer.sockets.emit("TransRes",{Data:"Cancelling Transfer, Please Wait!"});
				console.log("Cancelling Transfer, Please Wait!");
				sleep(1000);
				res.write("<script>alert('Transfer Cancelled.'); window.location='http://localhost:3000/home/'</script>");		
				res.end();
				console.log("Transfer Cancelled.");
			}
*/
	//} //End of Machines For Loop
			
/*
										if(successCount == machines.length)
										{
											socketServer.sockets.emit("TransRes",{Data:"File Transfer Successful!"});
											res.write("<script>alert('Transfer Complete'); window.location='http://localhost:3000/home/'</script>");
											res.end();
											console.log("Transfer Complete");		
										}
*/
/*
			else
			{
				socketServer.sockets.emit("TransRes",{Data:"File Transfer Successful!"});
				res.write("<script>alert('Transfer Failed!.'); window.location='http://localhost:3000/home/'</script>");
				res.end();
				console.log("Transfer Failed!");
			}
*/
       			
			
        });
        
/*
        Ftp.put(globalPath,"amsler.co.nf/"+fileName,function(hadError)
        {
            if(!hadError){
    console.log("File transferred successfully!\nLocal Path: "+globalPath+"\nRemote Path: "+fileName);
     res.end();
    }
            else{
    console.log("File Transfer failed \nLocal: "+serverPath+"\nRemote:"+fileName);
    res.end();
    }
        });
*/
       //res.end();

        /* }); *///End of LMK Rename;
		}//End of Else
}); //End of /api/photos


function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

/*
app.get('/transfer_control',function(req,res){

		currGet ="Transfer_Control";
        fs.readFile(path.join(__dirname,'public')+"/transfer_control/index.html",function(err,transferPage){
        	if(err)
        	{
	        	console.log("Error Reading File to be Transferred.");
	        	return;
        	}
        	res.writeHead(200,{"Content-Type":"text/html"});
        	res.write(transferPage);
        	res.end();
        });	
});
*/

/*
app.get('/monitor',function(req,res){
	//response.writeHead(statusCode,[reasonPhase],[headers])
	
	fs.readFile(path.join(__dirname, 'public')+"/Monitor/DynamicLayer.html",function(err,html){
		if(err != null){
			console.log("Monitor");
			throw err;
			}
	res.writeHead(200,{"Content-Type":"text/html"});
	res.write(html);
	res.end();
	});

//	setInterval(getFileAndUpdate,10000);
	//getFileAndUpdate();
});
*/


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
	userSession = "";
	currGet = "";
	res.writeHead(200,{"Content-type":"text/html"});
	res.write("<script>window.location='http://localhost:3000/login/'</script>");
	res.end();
	
});

//-----------------------------------------------------------              END LOGOUT                -----------------------------------------------------------

/*
var getFileAndUpdate = function(){
Ftp.get("/amsler.co.nf/status.txt",function(err,s){
	console.log("Status.txt Callback");
	
	if(err){
		throw err;
		}
	
	s.on("data",function(d){
	//console.log("Data: "+d.toString());
	//printStatus += d.toString();
	 socketServer.sockets.emit("PrintStatus",{"update":d.toString()});
	});
	s.on('close',function(err){
	if(err)
		console.log("File Retrival Failed!");
	});

	s.resume();
	//socketServer.sockets.emit("PrintStatus",{update:printStatus});
});

//console.log("PrintStatus:"+printStatus);

}*/

//-----------------------------------------------------------              START SOCKET METHODS                -----------------------------------------------------------


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

			transFtp.put(globalPath,"amsler.co.nf/"+fileName,function(err){
				if(err){
					console.log("Sending Failed to Machine: "+ORG.Machine[machines[trigger_count]].name+"\n");
					res.write("<script>alert('OOPS! Theres some problem. Please try again later.'); window.location='http://localhost:3000/home/'</script>");						res.end();
				}
				else{					
					res.end();
					console.log("File Sent");
					socketServer.sockets.emit("TransRes",{Data:"Transfer to Machine: "+ORG.Machine[machines[trigger_count]].name+" Successful"});
					socketServer.sockets.emit("ClientTrigger",{Data:"NEXT"});				
				}					
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
