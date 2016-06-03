'use strict';

window.addEventListener('load', startConnection(), false);

function startConnection() {
  signalingConnection();

  // rtcDataConnection();
}

// Creates a Web RTC peer connection to the remote peer
function rtcPeerConnection() {
  var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection ||
                          window.webkitRTCPeerConnection;
  var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription ||
                              window.webkitRTCSessionDescription;
  var RTCIceCandidate =  window.RTCIceCandidate || window.mozRTCIceCandidate;
  var servers = { iceServers: [{ urls: 'stun:stun.1.google.com:19302' }] };

  var pc = new RTCPeerConnection(servers, {
    optional: [{
      DtlsSrtpKeyAgreement: true,
    },],
  });

  signalingChannel.onAnswer = function (answer, source) {
    console.log('receive answer from ', source);
    pc.setRemoteDescription(new RTCSessionDescription(answer));
  };

  signalingChannel.onICECandidate = function (ICECandidate, source) {
    console.log('receiving ICE candidate from ', source);
    pc.addIceCandidate(new RTCIceCandidate(ICECandidate));
  };

  pc.onicecandidate = function (evt) {
      if (evt.candidate) { // empty candidate (wirth evt.candidate === null) are often generated
        signalingChannel.sendICECandidate(evt.candidate, peerId);
      }
    };

  window.pc = pc;
}

// Opens a data channel to the remote peer for commnunication
function rtcDataConnection() {
  // Calling rtcPeerConnection to establish peer connection
  rtcPeerConnection();

  //:warning the dataChannel must be opened BEFORE creating the offer.
  var _commChannel = pc.createDataChannel('communication', {
    reliable: false,
  });

  pc.createOffer(function (offer) {
    pc.setLocalDescription(offer);
    console.log('send offer');
    signalingChannel.sendOffer(offer, peerId);
  }, function (e) {

    console.error(e);
  });

  window.channel = _commChannel;

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
    chatCallback(message.data);
  };

}

// Create a Web Socket connection to the signalling server @ url 'ws://localhost:8090'
function signalingConnection(pcCallback) {
  var wsUri = 'ws://localhost:8090/';
  var peerUserID = sessionStorage.tabID ? sessionStorage.tabID : sessionStorage.tabID =
                   Math.random();
  var signalingChannel = createSignalingChannel(wsUri, peerUserID);
  window.signalingChannel = signalingChannel;

  // Checks for message with event onReady from Signalling server and lists them on the webpage
  signalingChannel.onReady = function (ready) {
    console.log('receiving the connected peers:', ready);
    ready.filter(function (peer) {
      if (peer !== Number(peerUserID)) {return peer;}
    }).map(function (peer) {
      console.log('hello');
      $('#listConnectedPeer').append('<li>' + peer);
    });
  };

  pcCallback();
}

// Handler for the transmission of data streams between peers
function dataStream() {
  $('#viewpeer').text(message);

  $('#sendpeer').onclick = function () {
    var message = $('#peerText').val();
    channel.send(message);
  };
}
