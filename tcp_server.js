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

var socketServer = io.listen(3031);

var tcp_server = net.createServer(function(tcpSocket)
		{
			
			console.log('Connected: ' + tcpSocket.remoteAddress + ':'+ tcpSocket.remotePort);
			
			tcpSocket.on('data',function(data)
				{
					console.log('DATA '+ tcpSocket.remoteAddress +': ' + data);
					data = data.toString().split(":");
					
					switch(data[0])
					{
						case "FILE":
						console.log("Machine at "+tcpSocket.remoteAddress+" is printing "+data[1]+". \n");
						query = "update sailoomtech set curFile='"+data[1]+"' where mhost='"+tcpSocket.remoteAddress+"';";
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
						console.log("Machine at "+tcpSocket.remoteAddress+" updated print to line"+data[1]+". \n");
						socketServer.sockets.emit("UpdatePrint",{Data:tcpSocket.remoteAddress+":"+data[1]});
						break;
						
						case "DONE":
						console.log("Machine at "+tcpSocket.remoteAddress+" finished printing file. \n")
						break;
					}
					
				});
				

			tcpSocket.on('close',function(data){
				console.log('Connection CLOSED ');
			});
		}).listen(PORT,HOST);

tcp_server.on('connection',function(sock)
		{
			console.log('Connected');
		});

tcp_server.on("error",function(err){
	console.log("Error: "+err);
});

console.log('Server listening on ' +HOST+ ':' +PORT);

//Code for Socket Communication
socketServer.sockets.on('connection',function(socket){


/* socket.emit("UpdatePrint",{Data:"Print Update Status"}); */

socket.emit('news',{hello:'world'});

});
