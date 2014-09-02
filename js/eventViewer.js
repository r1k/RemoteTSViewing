var server_address;
var port;
var serverFound = true;

var wsUri = "ws://10.20.9.1:8889";
var bitrateLookup = {};

var msg_handler_list = [];
var msgCount = 0;

var websocket;

var QueryString = function ()
{
  // This function is anonymous, is executed immediately and
  // the return value is assigned to QueryString!
  var query_string = {};
  var query = window.location.search.substring(1);
  var vars = query.split("&");

  for (var i = 0; i < vars.length; i++)
  {

    var pair = vars[i].split("=");

    if (typeof query_string[pair[0]] === "undefined")
    {
      // If first entry with this name
      query_string[pair[0]] = pair[1];
    }
    else if (typeof query_string[pair[0]] === "string")
    {
      // If second entry with this name
      var arr = [ query_string[pair[0]], pair[1] ];
      query_string[pair[0]] = arr;

    }
    else
    {
      // If third or later entry with this name
      query_string[pair[0]].push(pair[1]);
    }
  }
  return query_string;
};

var prettifyBitrate = function ( br )
{
  var units = " bps";
  br = parseFloat(br);

  if (br > 1000)
  {
    br /= 1000;
    units = " kbps";
  }

  if (br > 1000)
  {
    br /= 1000;
    units = " Mbps"
  }

  return parseFloat(br).toFixed(2).toString() + units
}

var updateDisplay = function ()
{
  var tableString = ""
  for (pid in bitrateLookup)
  {
    var line = "<tr><td>" + pid + "</td><td>" + prettifyBitrate(bitrateLookup[pid]) + "</td></tr>"

    tableString += line;
  }

  $('#bitrateTableBody').html(tableString);
}

var new_bitrate_arrived = function(pid, bitrate)
{
  bitrateLookup[pid] = bitrate;
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
  bitrateLookup = {};
  var numBitrates = msg.bitrates.length;
  var i = 0;

  for(i = 0; i < numBitrates; i++)
  {
    var pid = parseInt(msg.bitrates[i].pid);
    msg.bitrates[i].pid = pid;
    var br = parseInt(msg.bitrates[i].bitrate);
    msg.bitrates[i].bitrate = br;

    new_bitrate_arrived(pid, br);
  }

  return msg;
}

var filterMessages = function (msg)
{
  var i = 0;
  var processed_msg = null;

  for (i = 0; i < msg_handler_list.length; i++)
  {
    if (msg_handler_list[i].type === msg.type)
    {
      processed_msg = msg_handler_list[i].handler(msg);
      break;
    }
  }

  if (processed_msg)
  {
    updateDisplay();
  }
  else
  {
    console.log("Unkown message received");
  }

  return processed_msg;
};

function testWebSocket()
{
  // Create the websocket and configure the callback functions
  websocket = new WebSocket(wsUri);
  websocket.onopen = function(evt) { onOpen(evt) };
  websocket.onclose = function(evt) { onClose(evt) };
  websocket.onmessage = function(evt) { onMessage(evt) };
  websocket.onerror = function(evt) { onError(evt) };
}

function onOpen(evt)
{
  console.log("CONNECTED");
}

function onClose(evt)
{
  console.log("DISCONNECTED");
}

function onMessage(evt)
{
  writeToScreen('RESPONSE: ' + evt.data);

  obj = JSON && JSON.parse(evt.data) || $.parseJSON(evt.data);

  msg = filterMessages(obj);

  if (msg)
  {
    msgCount += 1;
    if (msgCount > 1000)
    {
      websocket.close();
    }
  }
}

function onError(evt)
{
  console.log('ERROR: ' + evt.data);
}

function doSend(message)
{
  console.log("SENT: " + message);
  websocket.send(message);
}

function writeToScreen(message)
{
  console.log(message);
}

function closingCode()
{
  websocket.close();
   return null;
}

var main = function() {

  msg_handler_list.push({type:"bitrate_event", handler:bitrate_event_handler});
  msg_handler_list.push({type:"bitrate_list", handler:bitrate_list_handler});

  $('.navmenu-nav > li').click( function()
  {
    // Highlight the current selection
    $('.navmenu-nav > li').removeClass('active-primary');
    $(this).addClass('active-primary');


    $('.container').hide();
    $('.container' + $(this).attr('name')).show();
  });

  QueryString();

  server_address = QueryString.ip;
  port = QueryString.port;
  if (server_address === undefined)
  {
    server_address = "---";
    port = "---"
    serverFound = false;
  }
  else
  {
    wsUri = "ws://" + server_address + ":" + port;
    console.log(wsUri);

    testWebSocket();
    serverFound = true;
  }

  var server_details = document.getElementById("server");
  server_details.innerHTML += " " + server_address + " " + port;

  var smoothie = new SmoothieChart();
  smoothie.streamTo(document.getElementById("mycanvas"));

  $('#setServer').click(function ()
  {
      var input_field = document.getElementById('iserver');
      var server_details = document.getElementById("server");
      var details = input_field.value.split(':')
      server_address = details[0]
      port = details[1]
      server_details.innerHTML = "Server: " + server_address + " port: " + port;
      serverFound = true;

      wsUri = "ws://" + server_address + ":" + port;

      console.log(wsUri);

      msgCount = 0;

      testWebSocket();
  });

  window.onbeforeunload = closingCode;

}




$(document).ready(main);



