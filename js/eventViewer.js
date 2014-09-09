var stream_msg_handler_list = [];
var control_msg_handler_list = [];
var msgCount = 0;
var oldmsgCount = 0;

var stream_websocket;
var control_websocket;

var interval_function;


//Stream data store
var seriesData = [ new Array(0) ];
var series = [
		{
			data: seriesData[0],
			name: '0',
      pid: 0,
      updated:false
		}
	]

//Source data store
var sources = [
  /*
  {
    multicastIP: '236.9.1.1',
    multicastPort: 5000,
    wsUri: 'localhost:8889'
  },
  */
]

var source_request_message = JSON.stringify({"Request" : "source_list"});

function closingCode()
{
  if (stream_websocket)
  {
    stream_websocket.close();
  }
  if (control_websocket)
  {
    control_websocket.close();
  }
  return null;
}

var new_bitrate_arrived = function(pid, bitrate, time)
{
  var i;
  var found = false;
  for(i = 0; i < series.length && pid >= series[i].pid; i++)
  {
    if (pid === series[i].pid)
    {
      series[i].data.push({
        x:time,
        y:bitrate
      });
      series[i].updated = true;
      found = true;
    }
  }

  if (!found)
  {
    var j;
    // insert new series into array
    seriesData.splice(i,0, [])
    for(j = 0; j < seriesData[0].length; j++)
    {
      seriesData[i].push({x:seriesData[0][0].x, y:0});
    }
    seriesData[i][seriesData[i].length - 1].y = bitrate;

    series.splice(i, 0,
                  {
                    data: seriesData[i],
                    name: pid.toString(),
                    pid: pid,
                    updated:true
                  });
  }

  msgCount += 1;
}

var bitrate_event_handler = function(msg)
{
  msg.pid = parseInt(msg.pid);
  msg.bitrate = parseInt(msg.bitrate);

  new_bitrate_arrived(msg.pid, msg.bitrate);

  return msg;
}

var bitrate_list_handler = function(msg)
{
  var numBitrates = msg.bitrates.length;
  var i = 0;

  var timeBase = Math.floor(new Date().getTime() / 1000);

  for(i = 0; i < numBitrates; i++)
  {
    var pid = parseInt(msg.bitrates[i].pid);
    var br = parseInt(msg.bitrates[i].bitrate);

    new_bitrate_arrived(pid, br, timeBase);
  }

  // Go round all the series that weren't updated and set a 0 bitrate
  for(i = 0; i < series.length; i++)
  {
    if (!series[i].updated)
    {
      series[i].data.push({
        x:timeBase,
        y:0
      });
    }

    series[i].updated = false;
  }

  if (seriesData.length > 100)
  {
    seriesData.forEach( function(series) {
			series.shift();
	  });
  }

  updateBitrateTable(series);

  msgCount += 1;
  return msg;
}






var filterMessages = function (msg, msg_handler_list)
{
  var i = 0;
  var processed_msg = null;

  for (i = 0; i < msg_handler_list.length; i++)
  {
    if (msg_handler_list[i].type === msg.type)
    {
      processed_msg = msg_handler_list[i].handler(msg);
      return true;
    }
  }

  console.log("Unkown message received");
  return false;
};


function connectWebSocket(host, port, msg_handler_list)
{
  // Create the websocket and configure the callback functions
  var ws_uri = "ws://" + host + ":" + port;
  var websocket = new WebSocket(ws_uri);
  websocket.onmessage = function(evt) {
    obj = JSON && JSON.parse(evt.data) || $.parseJSON(evt.data);

    msg = filterMessages(obj, msg_handler_list);
  };

  return websocket;
}


function doSend(message, websocket)
{
  console.log("SENT: " + message);
}




function start_new_session(server_address, server_port)
{
  if ((server_address !== undefined) && (server_port !== undefined))
  {
    var port = parseInt(server_port);

    control_websocket = connectToSource(server_address, server_port, 'server');
    stream_websocket = connectToSource(server_address, (port+1).toString(), 'source');


    //control_websocket.send(source_request_message);
    //stream_websocket.send(message);

    if (interval_function)
    {
      clearInterval(interval_function);
    }

    // Add a function to reset the bitrates when we haven't received an
    // updated for more than 3 seconds.
    interval_function = setInterval( function()
                                    {
                                      if (msgCount === oldmsgCount)
                                      {
                                        temp = {bitrates:{length:0}};
                                        bitrate_list_handler(temp);
                                      }

                                      oldmsgCount = msgCount;
                                    }, 3000);
  }
}



function connectToSource(host, port, name)
{
  var websckt = connectWebSocket(host, port, stream_msg_handler_list);
  websckt.onopen = function() {
    $('.status-'+name).html("Connected to source: " + host + ":" + port);
    $('.status-'+name+'-box').removeClass('alert-danger');
    $('.status-'+name+'-box').addClass('alert-success');
    if (name === "server")
    {
      $('.status-server-badge').html('Connected');
    }
  };
  websckt.onclose = function() {
    $('.status-'+name).html("Not connected");
    $('.status-'+name+'-box').removeClass('alert-success');
    $('.status-'+name+'-box').addClass('alert-danger');
    if (name === "server")
    {
      $('.status-server-badge').html('Disconnected');
    }
  };

  return websckt
}









var main = function() {

  stream_msg_handler_list.push({type:"bitrate_event", handler:bitrate_event_handler});
  stream_msg_handler_list.push({type:"bitrate_list", handler:bitrate_list_handler});

  $('.menu-selector').click( function()
  {
    // Highlight the current selection
    $('.menu-selector').removeClass('active-primary');
    $(this).addClass('active-primary');


    $('.container').hide();
    $('.container' + $(this).attr('name')).show();
  });

  $('#setServer').click(function ()
  {
      var input_field = document.getElementById('iserver');
      var details = input_field.value.split(':')
      var server_address = details[0]
      var port = details[1]

      start_new_session(server_address, port);

      msgCount = 0;
      seriesData = [ new Array(0) ];
      series = [
                {
                  data: seriesData[0],
                  name: '0',
                  pid: 0,
                  updated:false
                }
              ]
  });

  window.onbeforeunload = closingCode;

  var qs = QueryString();
  start_new_session(qs.ip, qs.port);



}




$(document).ready(main);



