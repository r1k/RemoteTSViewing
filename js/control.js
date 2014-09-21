var control_msg_handler_list = [];

function stream_list_handler(msg) {
  stream_list = msg.streams;

  // TODO: work out how to parse list
}

control_msg_handler_list.push({type:"stream_list", handler:stream_list_handler});
