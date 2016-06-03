var connectedPeers = {};
var readyPeers = []; // Array to store connected peers
function onMessage(ws, message) {
  var type = message.type;
  switch (type) {
    case 'ICECandidate':
      onICECandidate(message.ICECandidate, message.destination, ws.id);
      break;
    case 'offer':
      onOffer(message.offer, message.destination, ws.id);
      break;
    case 'answer':
      onAnswer(message.answer, message.destination, ws.id);
      break;
    case 'init':
      onInit(ws, message.init);
      break;
    default:
      throw new Error('invalid message type');
  }

}

function onInit(ws, id) {
  console.log('init from peer:', id);
  ws.id = id;
  connectedPeers[id] = ws;

  // Check to see connected peers is already in array else add to array.
  if (readyPeers.indexOf(Number(id)) === -1) {
    readyPeers.push(Number(id));
  }

  // Sending an event with data fo connected peers to the signalling server.
  connectedPeers[id].send(JSON.stringify({
    type:'ready',
    ready:readyPeers,
  }));
}

function onOffer(offer, destination, source) {
  console.log('offer from peer:', source, 'to peer', destination);
  connectedPeers[destination].send(JSON.stringify({
    type:'offer',
    offer:offer,
    source:source,
  }));
  console.log('What is inside this:', connectedPeers[destination]);
}

function onAnswer(answer, destination, source) {
  console.log('answer from peer:', source, 'to peer', destination);
  connectedPeers[destination].send(JSON.stringify({
    type: 'answer',
    answer: answer,
    source: source,
  }));
}

function onICECandidate(ICECandidate, destination, source) {
  console.log('ICECandidate from peer:', source, 'to peer', destination);
  connectedPeers[destination].send(JSON.stringify({
    type: 'ICECandidate',
    ICECandidate: ICECandidate,
    source: source,
  }));
}

module.exports = onMessage;

//exporting for unit tests only
module.exports._connectedPeers = connectedPeers;
