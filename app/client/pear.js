'use strict';
var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection ||
                        window.webkitRTCPeerConnection;
var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription ||
                            window.webkitRTCSessionDescription;
var RTCIceCandidate =  window.RTCIceCandidate || window.mozRTCIceCandidate;
var servers = { iceServers: [{ urls: 'stun:stun.1.google.com:19302' }] };
var peerID = sessionStorage.tabID ? sessionStorage.tabID : sessionStorage.tabID =
                 Math.random();
var wsUri = 'ws://localhost:8090/';
var signalingChannel = createSignalingChannel(wsUri, peerID);
var peerConnections = {}; // Keeps collections of established peers
var channel = {}; // Keeps collection of opened data channels
var ready = []; // Keeps collection of peers connected to the signalling server

window.addEventListener('load', startConnection(), false);

function startConnection() {
  window.setTimeout(connectToPeers, 1000);

  function connectToPeers() {
    var listedPeers = [];
    $(document).ready($('ul').children().each(function () { listedPeers.push($(this).text());}));

    console.log('here are the listed peers:', listedPeers);
    var readyLength = ready.length;
    if (ready.indexOf(peerID, -1) === readyLength - 1) {
      listedPeers.forEach(function (peer) {
        var tmpPeer = Number(peer);
        distributeOffer(tmpPeer);
      });
    }
  }
}

// Called to send data on opened channel
function sendDataStream(tmpPeerID) {
  var message = $('textarea#peertext').val();
  channel[tmpPeerID].send(message);
}

// Used by ondatachannel event handlers to display messages
function receiveDataStream(rcvmsg) {
  $('#viewpeer').text(rcvmsg);
}

// Used to create SDP Offer
function distributeOffer(peerID) {
  var pc = uniquePC(peerID);
  dataCommunication(pc, peerID);
  pc.createOffer(function (offer) {
    pc.setLocalDescription(offer);
    console.log('send offer');
    signalingChannel.sendOffer(offer, peerID);
  }, function (e) {

  console.error(e);});
}

// Creates RTCDataChannel connection
function dataCommunication(pc, peerID) {
  // Opens a data channel to the remote peer for commnunication
  //:warning the dataChannel must be opened BEFORE creating the offer.
  var _commChannel = pc.createDataChannel('communication', {
          reliable: false,
        });

  channel[peerID] = _commChannel;

  _commChannel.onclose = function (evt) {
    console.log('dataChannel closed');
  };

  _commChannel.onerror = function (evt) {
    console.error('dataChannel error');
  };

  _commChannel.onopen = function () {
    console.log('dataChannel opened');
  };

  _commChannel.onmessage = function (message) {
    receiveDataStream(message.data);
  };

  return channel;
}

function uniquePC(peerID) {
  if (peerConnections[peerID]) {
    return peerConnections[peerID];
  }

  var pc = new RTCPeerConnection(servers, { optional: [{ DtlsSrtpKeyAgreement: true, }] });
  peerConnections[peerID] = pc;

  pc.onicecandidate = function (evt) {
    if (evt.candidate) { // empty candidate (wirth evt.candidate === null) are often generated
      signalingChannel.sendICECandidate(evt.candidate, peerID);
    }
  };

  pc.ondatachannel = function (event) {
    var receiveChannel = event.channel;
    console.log('channel received');
    channel[peerID] = receiveChannel;
    receiveChannel.onmessage = function (event) {
      receiveDataStream(event.data);
    };

    return channel;
  };

  return pc;

}

// Checks for message with event onReady from Signalling server and lists them on the webpage
signalingChannel.onReady = function (ready) {
  console.log('receiving the connected peers:', ready);
  $(document).ready($('li').remove());
  ready.filter(function (peer) {
    if (peer !== Number(peerID)) {return peer;}
  }).map(function (peer) {
    $('#listConnectedPeer').append('<li>' + '<a href="#">' + peer);
  });

  return ready;
};

signalingChannel.onICECandidate = function (ICECandidate, source) {
  console.log('receiving ICE candidate from ', source);
  var pc = uniquePC(source);
  pc.addIceCandidate(new RTCIceCandidate(ICECandidate));
};

signalingChannel.onAnswer = function (answer, source) {
  console.log('receive answer from ', source);
  var pc = uniquePC(source);
  pc.setRemoteDescription(new RTCSessionDescription(answer));
};

signalingChannel.onOffer = function (offer, source) {
  console.log('receive offer');
  var pc = uniquePC(source);
  pc.setRemoteDescription(new RTCSessionDescription(offer));
  pc.createAnswer(function (answer) {
    pc.setLocalDescription(answer);
    console.log('send answer');
    signalingChannel.sendAnswer(answer, source);
  }, function (e) {

    console.error(e);
  });
};
