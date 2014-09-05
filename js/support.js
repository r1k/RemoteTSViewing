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

function writeToScreen(message)
{
  console.log(message);
}

var updateBitrateTable = function (data_series)
{
  var tableString = ""
  var simplebitrateArray = [];
  var totalBitrate = 0;
  var i;
  for (i = 0; i < data_series.length; i++)
  {
    //First grab bitrates
    var br = data_series[i].data[data_series[i].data.length - 1].y;
    totalBitrate += br;
    simplebitrateArray.push({name:data_series[i].name, bitrate:br});
  }


  for (i = 0; i < simplebitrateArray.length; i++)
  {
    // then generate table

    var line = '<tr><td>' + simplebitrateArray[i].name + '</td>';
    line += '<td>' + prettifyBitrate(simplebitrateArray[i].bitrate) + '</td>';
    var prcnt = simplebitrateArray[i].bitrate*100.00 / totalBitrate;
    line += '<td><div class="progress"><div class="progress-bar" style="width: ';
    line += Math.round(10 * Math.pow(prcnt, 0.5)).toString();
    line += '%;"></div></div></td>';
    line += '</tr>';

    tableString += line;

  }

  var line = "<tr><td>Total</td><td>" + prettifyBitrate(totalBitrate) + "</td></tr>"
  tableString += line;

  $('#bitrateTableBody').html(tableString);
}
