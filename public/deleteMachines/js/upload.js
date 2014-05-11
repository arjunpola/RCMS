$(document).ready(function(){
    status('Choose a file :)');

/*
var timerId;
timerId = setInterval(function() {
if($('#userPhoto').val()!= '')
{
    clearInterval(timerId);
    $('#uploadForm').submit();
}
},500);
*/

$('#uploadForm').submit(function(evt) {

	/*
document.getElementById("loader").style.visibility="visible";
	$("#loaderSub").html("Connecting to Server...");
	document.getElementById("cancel").style.visibility="visible";
	document.getElementById("loaderSub").style.visibility="visible";
	document.getElementById("uploadForm").style.visibility="hidden";
	document.getElementById("img-wrap").style.visibility="hidden";
*/
	/* " background: darken(#82B3E8, 40%);"; */
	$('body').css("background","darken(#82B3E8, 40%)");
	/* $('#uploadForm').find('input, textarea, button, select').attr('disabled','disabled'); */
	console.log("Visible!");
	
	
    status('uploading the file ....');
	
	/*
var can = document.getElementById('mcanvas');
	var ct = can.getContext('2d');
	var data = ct.getImageData(0,0,can.width,can.height);
	document.getElementById("CH").value = data;
*/
	
	
	    $("#uploadForm").ajaxSubmit({
        error: function(xhr){
            status('Error: '+xhr.status);
        },

        success: function(response) {
            //Todo
            if(response.error){
                status('Opps, something bad happened');
                return;
        }
            var imageUrlOnServer = response.path;

            status('Success,file uploaded to: '+imageUrlOnServer);
            /* $('<img/>').attr('src',imageUrlOnServer).appendTo($('body')); */
    }
});
		
	});

    // Have to stop the form from submitting and causing
    // a page refresh - don't forget this

function status(message){
    console.log("Status: "+message);
}

});