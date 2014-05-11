(function()
 {
	 var supportsCanvas = !!document.createElement('canvas').getContext;
	 supportsCanvas && (window.onload = overlay());
		
	 function overlay()
	 {
		 var scon = false;
		 var socket = io.connect('http://localhost:3031');
	
		 socket.on('connect', function () 
		 {
			 //alert('Socket is connected.');
			 $('#loaderSub').html('<pre>Monitoring Started.....</pre>');
			 scon = true;
		 });
		 
		 socket.on('disconnect',function(){
			$('#loaderSub').html('<pre>Monitoring Server Disconnected...</pre>'); 
		 });
	
		 socket.on('UpdatePrint',function(data)
		 {
			 console.log(data.Data);
			 d = data.Data.toString().split(":");
			 colorLines(curLine[d[0]],d[1],ipAddr[d[0]]);
			 curLine[d[0]] = d[1];
		 });
		 
		 socket.on('FIN',function(data)
		 {
			 console.log(data.Data);
			 colorLines(curLine[d[0]],'FIN',ipAddr[d[0]]);
		 });
				for(i=0;i<=v;i++)
				{
					var canvas = document.getElementById('mcanvas'+i);
					if(canvas != undefined)
					{
						var ctx = canvas.getContext('2d');
						ctx.rect(0,0,canvas.width,canvas.height);
			
						var grd = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
						//light blue
						grd.addColorStop(0,'#3A539B');
						// dark blue
						grd.addColorStop(1,'#2C3E50');
						ctx.fillStyle = grd;
						ctx.fill();
					}
				}
			}
	})();