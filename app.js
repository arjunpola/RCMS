
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

var app = express();

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



var fTransfer = function(localPath,remotePath)
{
    chid = exec('/home/ubuntu/./sendFile.sh '+localPath+' '+remotePath,function(error,stdout,stderr){
        console.log('stdout: '+stdout);
        console.log('stderr: '+stderr);
        if(error !== null){
            console.log('exec error: '+error);
        }
    });
    }

//app.get('/', routes.index);
//app.get('/users', user.list);

app.post('/api/photos',function(req,res){
//    console.log("Request: "+req.userPhoto);
console.log(JSON.stringify(req.files));

    var fileName = req.files.userPhoto.name;
    var serverPath = '/images/'+fileName;
    var globalPath = '/home/ubuntu/exp_trial/public' + serverPath;

    require('fs').rename(
        req.files.userPhoto.path,
        '/home/ubuntu/exp_trial/public' + serverPath,
        function(error){
            if(error){
                res.send({
                    error: 'Ah crap! Something bad happened'
                });
                return;
        }


            res.send({
                path:serverPath
               // fTransfer(globalPath,"/amsler.co.nf/images/"+fileName);
            });

            res.end();
            fTransfer(globalPath,"/amsler.co.nf/ftpImages/"+fileName);
        }
      );
});


http.createServer(app).listen(app.get('port'), function(){
 console.log('Express server listening on port ' + app.get('port'));
});
