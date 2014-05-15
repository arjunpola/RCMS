var net = require('net');
var io = require('socket.io');
var mysql = require('mysql');


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

var HOST = '0.0.0.0';
var PORT = 3030;
var trialIP = "192.168.1.10";
var login = true;
var ORG;
var	c = new Object();

var socketServer = io.listen(3031);

var tcp_server = net.createServer(function(tcpSocket)
		{
			
			console.log('Connected: ' + tcpSocket.remoteAddress + ':'+ tcpSocket.remotePort);
				
				c[tcpSocket.remoteAddress]="G";
				tcpSocket.address = tcpSocket.remoteAddress;
				console.log(JSON.stringify(c));
			
			tcpSocket.on('data',function(data)
				{
				
				logInfo = data.toString().split(":");
				
				if(logInfo[0] == "SSO"){
					login = true;
					console.log('DATA : ' + data);
					return;
					}
				else if(logInfo[0] == "SLO"){
					login = false;
					console.log('DATA: '+ data);
					return;
					}
				else if(logInfo[0] == "LINF")
				{
					ORG = logInfo[1];
					console.log('DATA : ' + data);
					return;
				}
				
				if(login == true){
				
					console.log('DATA '+  tcpSocket.remoteAddress +': ' + data);
					data = data.toString().split(":");
					
					switch(data[0])
					{
						case "FILE":
					//	data[1]=data[1].split(".")[0]+".lmk";
						console.log("Machine at "+ tcpSocket.remoteAddress+" is printing "+data[1]+". \n");
				query = "update SaiLoomTech set curFile='"+data[1]+"' where mhost='"+ tcpSocket.remoteAddress+"';";
						con.query(query,function(err,rows,field)
						{
						if(err){
							console.log("Mysql Error\n");
							console.log("Query: "+query);
							console.log("Err: "+ err);
							}
						else
							console.log("File Updated");
							
						});
						break;
						
						case "UPDATE":
						console.log("Machine at "+ tcpSocket.remoteAddress+" updated print to line"+data[1]+". \n");
						socketServer.sockets.emit("UpdatePrint",{Data:tcpSocket.remoteAddress+":"+data[1]});
						break;
						
						case "DONE":
						console.log("Machine at "+ tcpSocket.remoteAddress+" finished printing file. \n");
						socketServer.sockets.emit("FIN",{Data: tcpSocket.remoteAddress+":FIN"});
						break;
					}
				}
					
				});
				

			tcpSocket.on('end',function(data){
			
			console.log("Closed: "+JSON.stringify(data));
			c[tcpSocket.address] = "";
			console.log(JSON.stringify(c));
			
			});
			
			
		}).listen(PORT,HOST);


tcp_server.on("error",function(err){
	console.log("Error: "+err);
});

console.log('Server listening on ' +HOST+ ':' +PORT);

//Code for Socket Communication

socketServer.sockets.on('connection',function(socket){

socket.on('getConnected',function(data){

	console.log("getConnected:"+data);
/*
	c["10.0.0.3"] = "G";
	c["10.0.0.51"] = "G";
*/
	socket.emit('getConnected',{data:JSON.stringify(c)});
});

socket.emit('news',{hello:'world'});

});
