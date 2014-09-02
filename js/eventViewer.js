var server_address;
var port;
var serverFound = true;

var wsUri = "ws://10.20.9.1:8889";

var msg_handler_list = [];
var msgCount = 0;

var websocket;

//Rickshaw stuff
var palette = new Rickshaw.Color.Palette( { scheme: 'classic9' } );
var graph;
var messages = [
      "Changed home page welcome message",
      "Minified JS and CSS",
      "Changed button color from blue to green",
      "Refactored SQL query to use indexed columns",
      "Added additional logging for debugging",
      "Fixed typo",
      "Rewrite conditional logic for clarity",
      "Added documentation for new methods"
    ];

//Data store
var seriesData = [ new Array(0) ];
var series = [
		{
			color: palette.color(),
			data: seriesData[0],
			name: '0',
      pid: 0,
      updated:false
		}
	]

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
  var totalBitrate = 0;
  var i;
  for (i = 0; i < series.length; i++)
  {
    var br = series[i].data[series[i].data.length - 1].y;
    totalBitrate += br;
    var line = "<tr><td>" + series[i].name + "</td><td>" + prettifyBitrate(br) + "</td></tr>"

    tableString += line;

  }

  var line = "<tr><td>Total</td><td>" + prettifyBitrate(totalBitrate) + "</td></tr>"
  tableString += line;

  $('#bitrateTableBody').html(tableString);
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
                    color: palette.color(),
                    data: seriesData[i],
                    name: pid.toString(),
                    pid: pid,
                    updated:true
                  });
  }
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
  obj = JSON && JSON.parse(evt.data) || $.parseJSON(evt.data);

  msg = filterMessages(obj);

  if (msg)
  {
    msgCount += 1;
    if (msgCount > 25)
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

  //var smoothie = new SmoothieChart();
  //smoothie.streamTo(document.getElementById("mycanvas"));

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
      seriesData = [ new Array(0) ];
      series = [
                {
                  color: palette.color(),
                  data: seriesData[0],
                  name: '0',
                  pid: 0,
                  updated:false
                }
              ]

      testWebSocket();

  });

  window.onbeforeunload = closingCode;




  // Rickshaw code below







// instantiate our graph!
  var create_graph = function()
  {

    graph = new Rickshaw.Graph( {
      element: document.getElementById("chart"),
      width: 720,
      height: 400,
      renderer: 'area',
      stroke: true,
      preserve: true,
      series: series
    } );

    graph.render();

    var preview = new Rickshaw.Graph.RangeSlider( {
      graph: graph,
      element: document.getElementById('preview'),
    } );

    var hoverDetail = new Rickshaw.Graph.HoverDetail( {
      graph: graph,
      xFormatter: function(x) {
        return new Date(x * 1000).toString();
      }
    } );

    var annotator = new Rickshaw.Graph.Annotate( {
      graph: graph,
      element: document.getElementById('timeline')
    } );

    var legend = new Rickshaw.Graph.Legend( {
      graph: graph,
      element: document.getElementById('legend')

    } );

    var shelving = new Rickshaw.Graph.Behavior.Series.Toggle( {
      graph: graph,
      legend: legend
    } );

    var order = new Rickshaw.Graph.Behavior.Series.Order( {
      graph: graph,
      legend: legend
    } );

    var highlighter = new Rickshaw.Graph.Behavior.Series.Highlight( {
      graph: graph,
      legend: legend
    } );

    var smoother = new Rickshaw.Graph.Smoother( {
      graph: graph,
      element: document.querySelector('#smoother')
    } );

    var ticksTreatment = 'glow';

    var xAxis = new Rickshaw.Graph.Axis.Time( {
      graph: graph,
      ticksTreatment: ticksTreatment,
      timeFixture: new Rickshaw.Fixtures.Time.Local()
    } );

    xAxis.render();

    var yAxis = new Rickshaw.Graph.Axis.Y( {
      graph: graph,
      tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
      ticksTreatment: ticksTreatment
    } );

    yAxis.render();


    var controls = new RenderControls( {
      element: document.querySelector('#side_panel'),
      graph: graph
    } );

    // add some data every so often
    function addAnnotation(force) {
      if (messages.length > 0 && (force || Math.random() >= 0.95)) {
        annotator.add(seriesData[2][seriesData[2].length-1].x, messages.shift());
        annotator.update();
      }
    }

    addAnnotation(true);
    setTimeout( function() { setInterval( addAnnotation, 6000 ) }, 6000 );

    var previewXAxis = new Rickshaw.Graph.Axis.Time({
      graph: preview.previews[0],
      timeFixture: new Rickshaw.Fixtures.Time.Local(),
      ticksTreatment: ticksTreatment
    });

    previewXAxis.render();

  }

  setInterval( function() {
    if (graph===undefined && seriesData[0].length > 20)
    {
      create_graph();
    }
    else
    {
      graph && graph.update();
    }

  }, 500 );






}




$(document).ready(main);



