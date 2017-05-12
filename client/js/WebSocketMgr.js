// make sure we have a handle on RTCPeerConnection
var RTCPeerConnection = RTCPeerConnection || webkitRTCPeerConnection || mozRTCPeerConnection;

function cWebSockerMgr() {
    //=============================================================================
    // Public methods
    //=============================================================================
    this.connect = function(i_sClientName) {
        return new Promise((i_oResolve, i_oFailure) => _connectWebSocket(i_sClientName, i_oResolve, i_oFailure));
    };

    //=============================================================================
    this.disconnect = function() {
        _disconnectWebSocket();
    };

    //=============================================================================
    this.sendChatMsg = function(i_sMsg) {
        if (m_oSocket && m_oSocket.connected) {
            _sendChatMsg(i_sMsg);
        }
    }

    //=============================================================================
    this.call = function(i_sClientName) {
        return _startCapturingMedia()
            .then(() => _initiateCall(i_sClientName));
    };

    //=============================================================================
    this.hangUp = function() {
        _hangUp();
    };

    //=============================================================================
    this.offerFile = function(i_oFileInfos, i_sToClientName, i_oCallback) {
        // return promise ?!
        if (m_bFileOfferInProgress) {
            i_oCallback(false);
        } else {
            m_bFileOfferInProgress = true;
            _sendFileOfferTo(i_sToClientName, i_oFileInfos);
            // set timeout delay to answer ?
            m_oOnFileOfferProcessed = i_oCallback;
        }
    };

    //=============================================================================
    this.sendFile = function(i_oFile) {
        return _sendFile(i_oFile);
    }

    //=============================================================================
    this.respondToFileOffer = function(i_bToClientName, i_bAccepted) {
        // repond on the offer from
        SB30m_bFileOfferInProgress = i_bAccepted;
        _sendFileOfferResponseTo(i_bToClientName, i_bAccepted);
    };

    //=============================================================================
    this.getClients = function() {
        return m_aClients;
    };

    //=============================================================================
    this.getChatLogs = function() {
        return m_aChatLogs;
    };

    //=============================================================================
    this.setCallOfferedCallback = function(i_oCallback) {
        m_oOnCallReceivedCallback = i_oCallback;
    };

    // change for onCallAnswered event ?
    //=============================================================================
    this.setCallAnsweredCallback = function(i_oCallback) {
        m_oOnCallAnsweredCallback = i_oCallback;
    };

    // change for onPeerDisconnected event ?
    //=============================================================================
    this.setPeerDisconnectedCallback = function(i_oCallback) {
        m_oPeerDisconnectedCallback = i_oCallback;
    };

    //=============================================================================
    this.on = function(i_sEventName, i_oCallback) {
        if (m_aSupportedEvents.includes(i_sEventName)) {
            if (m_oEvents[i_sEventName] === undefined) {
                m_oEvents[i_sEventName] = [];
            }

            m_oEvents[i_sEventName].push(i_oCallback);
        }
    };

    //=============================================================================
    this.off = function(i_sEventName, i_oCallback) {
        var l_nIdx;
        if (m_oEvents[i_sEventName]) {
            if (i_oCallback) {
                // remove just this function
                l_nIdx = m_oEvents[i_sEventName].findIndex(i_oFunc => i_oFunc === i_oCallback);
                if (l_nIdx > -1) {
                    m_oEvents[i_sEventName].splice(l_nIdx, 1);
                } else {
                    delete m_oEvents[i_sEventName];
                }
            } else {
                delete m_oEvents[i_sEventName];
            }
        }
    };

    //=============================================================================
    // Private Methods
    //=============================================================================

    //==============================================================================
    function _connectWebSocket(i_sClientName, i_oSuccessCB, i_oErrorCB) {
        m_oSocket = io();

        m_oSocket.on("reconnect", _registerClient.bind(m_oInterface, i_sClientName));
        m_oSocket.on("connect", () => {
            m_oSocket.off("connect");
            m_oSocket.off("error");

            m_bRegistrationInProgress = true;
            m_oOnRegistrationComplete = i_oSuccessCB;
            _registerClient(i_sClientName);
        });

        m_oSocket.on("error", (i_oError) => {
            m_oSocket.off("connect");
            m_oSocket.off("error");
            i_oErrorCB(i_oError);
        });

        m_oSocket.on("message", _onServerMsg.bind(m_oSocket));

        return m_oSocket;
    }

    //==============================================================================
    function _registerClient(i_sClientName) {
        var l_sName = i_sClientName || m_oSocket.clientName;

        m_oSocket.send({
            type: "register",
            data: l_sName
        });
    }

    //==============================================================================
    function _disconnectWebSocket() {
        if (m_oSocket && m_oSocket.connected) {
            m_oSocket.disconnect();
            m_oSocket = null;
        }
        _hangUp();
        m_aClients.length = 0;
    }


    //==============================================================================
    function _sendChatMsg(i_sMsg) {
        var l_sSanitized = i_sMsg.replace(/^\s+|\s+$/, "");

        if (l_sSanitized) {
            m_oSocket.send({
                type: "chat-msg",
                data: l_sSanitized
            });
        }

    }

    //==============================================================================
    function _sendCallTo(i_sToClientName, i_oOffer) {
        m_oSocket.send({
            type: "call-offer",
            data: {
                offer: i_oOffer,
                from: m_oSocket.clientName,
                to: i_sToClientName
            }
        });
    }

    //==============================================================================
    function _sendCallIgnoreTo(i_sToClientName) {
        m_oSocket.send({
            type: "call-ignore",
            data: {
                reason: "Refused Call", // hook up different reasons here ?!
                from: m_oSocket.clientName,
                to: i_sToClientName
            }
        });
    }

    //==============================================================================
    function _sendAnswerTo(i_sToClientName, i_oAnswer) {
        m_oSocket.send({
            type: "call-answer",
            data: {
                answer: i_oAnswer,
                from: m_oSocket.clientName,
                to: i_sToClientName
            }
        });
    }

    //==============================================================================
    function _sendICECandidateTo(i_sToClientName, i_oCandidate) {
        m_oSocket.send({
            type: "send-ice",
            data: {
                iceCandidate: i_oCandidate,
                from: m_oSocket.clientName,
                to: i_sToClientName
            }
        });
    }

    //==============================================================================
    function _sendFileOfferTo(i_sToClientName, i_oFileInfos) {
        m_oSocket.send({
            type: "file-offer",
            data: {
                fileInfos: i_oFileInfos,
                from: m_oSocket.clientName,
                to: i_sToClientName
            }
        });
    }

    //==============================================================================
    function _sendFileOfferResponseTo(i_sToClientName, i_bAccepted) {
        m_oSocket.send({
            type: "file-response",
            data: {
                accepted: i_bAccepted,
                from: m_oSocket.clientName,
                to: i_sToClientName
            }
        });
    }

    //==============================================================================
    function _sendFileOfferResponse(i_sToClientName) {
        m_oSocket.send({
            type: "file-offer",
            data: {
                fileInfos: i_oFileInfos,
                from: m_oSocket.clientName,
                to: i_sToClientName
            }
        });
    }

    //==============================================================================
    function _onCallOfferValidated(i_oMsg, i_bAccepted) {
        m_bCallOfferInProgress = false;
        if (i_bAccepted) {
            _startCapturingMedia()
                .then(() => _answerCall(i_oMsg.data));
        } else {
            // send explicit refusal
            _sendCallIgnoreTo(i_oMsg.data.from);
        }
    }

    //==============================================================================
    function _onServerMsg(i_sEvent, i_oMsg) {
        if (i_oMsg) {
            switch (i_oMsg.type) {
                case "register-ack":
                    if (m_bRegistrationInProgress) {
                        m_oSocket.clientName = i_oMsg.data;
                        m_bRegistrationInProgress = false;
                        if (m_oOnRegistrationComplete) {
                            m_oOnRegistrationComplete.call(m_oInterface, m_oSocket);
                        }
                    }
                    break;
                case "clientlist":
                    m_aClients.length = 0;
                    m_aClients.push(...i_oMsg.data);
                    break;
                case "chat-msg":
                    var l_dDate = new Date();
                    l_dDate.setTime(i_oMsg.tstamp);
                    i_oMsg.tstamp = l_dDate.toString();
                    m_aChatLogs.push(i_oMsg);
                    break;
                case "call-offer":
                    // add confirmation here to pick up or not ?
                    if (m_oOnCallReceivedCallback) {
                        if (m_bCallOfferInProgress) {
                            _sendCallIgnoreTo(i_oMsg.data.from);
                        } else {
                            m_bCallOfferInProgress = true;
                            m_oOnCallReceivedCallback(i_oMsg.data.from)
                                .then(_onCallOfferValidated.bind(m_oInterface, i_oMsg));
                        }
                    } else {
                        _onCallOfferValidated(i_oMsg, false);
                    }
                    break;
                case "call-ignore":
                    // call has been explicitaly ignored, closing RTCPeerConnection
                    console.log("_onServerMsg::Call ignored, hanging up");
                    _hangUp(i_oMsg.data.reason);
                    break;
                case "call-answer":
                    // call has been answered, finalize call
                    _FinalizeCall(i_oMsg.data);
                    break;
                case "file-offer":
                    // notify about a file-offer
                    if (m_bFileOfferInProgress) {
                        _onFileResponse(i_oMsg.data.from, false);
                        _sendFileOfferResponseTo(i_oMsg.data.from, false);
                    } else {
                        m_bFileOfferInProgress = true;
                        _notify("fileOffer", i_oMsg.data.from, i_oMsg.data.fileInfos);
                        m_oOfferedFileDetails = i_oMsg.data.fileInfos;
                    }
                    break;
                case "file-response":
                    _onFileResponse(i_oMsg.data.from, i_oMsg.data.accepted);
                    break;
                case "send-ice":
                    _addICECandidate(i_oMsg.data);
                    break;
            }
        }
    }

    //==============================================================================
    function _addICECandidate(i_oData) {
        if (m_oRTCPeerConnection) {
            m_oRTCPeerConnection.addIceCandidate(i_oData.iceCandidate)
                .then(
                    _onAddIceCandidateSuccess,
                    _onAddIceCandidateError

                );
            console.log(' ICE candidate: \n' + (i_oData.iceCandidate ? i_oData.iceCandidate : '(null)'));
        } else {
            console.log(' ICE candidate: ');
        }
    }

    //==============================================================================
    function _onIceCandidate(i_sClientName, i_oEvent) {
        console.log("_onIceCandidate:: ON ICE CANDIDATE...");
        // send ICE candidate to connecting end
        _sendICECandidateTo(i_sClientName, i_oEvent.candidate);
    }

    //==============================================================================
    function _onAddIceCandidateSuccess(i_oRTCPeer) {
        console.log("Add ICE candidate succeeded");
    }

    //==============================================================================
    function _onAddIceCandidateError(i_oError) {
        console.error('failed to add ICE Candidate: ' + i_oError.toString());
    }

    //==============================================================================
    function _onIceStateChange(i_oEvent) {
        var l_oCallback;

        if (m_oRTCPeerConnection) {
            console.log('ICE state: ' + m_oRTCPeerConnection.iceConnectionState);
            console.log('ICE state change i_oEvent: ', i_oEvent);

            if (m_oRTCPeerConnection.iceConnectionState === "connected") {
                l_oCallback = m_oRTCPeerConnection.resolve;
                delete m_oRTCPeerConnection.resolve;
                delete m_oRTCPeerConnection.reject;
                if (l_oCallback) {
                    l_oCallback();
                }
            } else if (/closed|disconnected/i.test(m_oRTCPeerConnection.iceConnectionState)) {
                $("#remote-video")[0].srcObject = null;
                _hangUp();
            }
        }
    }

    //==============================================================================
    function _onCreateSessionDescriptionError(error) {
        console.log('Failed to create session description: ' + error.toString());
    }

    //==============================================================================
    function _onDataChannelReceived(i_oEvent) {
        m_oRTCDataChannel = i_oEvent.channel;
        m_oRTCDataChannel.binaryType = 'arraybuffer';
        _registerChannelEvents();
    }

    //==============================================================================
    function _registerChannelEvents() {
        m_oRTCDataChannel.onopen = _onDataChannelStatusChanged;
        m_oRTCDataChannel.onclose = _onDataChannelStatusChanged;
        m_oRTCDataChannel.onmessage = _onDataChannelMessage;
    }

    // on Open / Close
    //==============================================================================
    function _onDataChannelStatusChanged(i_oEvent) {
        console.log("Data Channel Status changed! ", i_oEvent);
        if (i_oEvent.type === "close") {
            _hangUp();
        }
    }

    //==============================================================================
    function _onDataChannelMessage(i_oEvent) {
        var l_nTStamp = Date.now();
        console.log("Data Channel Message Received! ", i_oEvent);
        if (m_oOfferedFileDetails) {
            if (!m_oOfferedFileDetails.buffer) {
                m_oOfferedFileDetails.buffer = [];
                m_oOfferedFileDetails.received = 0;
            }

            m_oOfferedFileDetails.buffer.push(i_oEvent.data);
            m_oOfferedFileDetails.received += i_oEvent.data.byteLength;

            _notify("transferProgress", {
                fileName: m_oOfferedFileDetails.name,
                currentBytes: m_oOfferedFileDetails.received,
                totalBytes: m_oOfferedFileDetails.size,
                tstamp: l_nTStamp
            });

            if (m_oOfferedFileDetails.received === m_oOfferedFileDetails.size) {
                console.log("File Received entirely!");
                _notify("fileReceived", {
                    name: m_oOfferedFileDetails.name,
                    data: m_oOfferedFileDetails.buffer,
                    type: m_oOfferedFileDetails.type
                });
                m_oOfferedFileDetails = null;
                m_bFileOfferInProgress = false;
            }
        }
    }

    // move this into it's own class
    //==============================================================================
    function _createRTCPeerConnection(i_sClientName, i_oResolve, i_oReject) {
        _hangUp(); // make sure we hung up any active call before initiating a new one

        m_oRTCPeerConnection = new RTCPeerConnection(m_oRTCPeerConfig); // no configration
        m_oRTCDataChannel = m_oRTCPeerConnection.createDataChannel('dataexchange');
        m_oRTCDataChannel.binaryType = 'arraybuffer';
        _registerChannelEvents();

        m_oRTCPeerConnection.clientName = i_sClientName;
        m_oRTCPeerConnection.resolve = i_oResolve;
        m_oRTCPeerConnection.reject = i_oReject;

        console.log('Created local peer connection');

        m_oRTCPeerConnection.onremovestream = () => console.log("Local RTC PeerConnection onremovestream");
        m_oRTCPeerConnection.onaddstream = function(i_oStreamEvent) {
            let l_oRemoteVideo = $("#remote-video")[0];
            console.log("\n\n\n\n\n RTC PeerConnection onaddstream RECEIVED STREAM !!!! ", i_oStreamEvent, " \n\n\n\n\n");
            l_oRemoteVideo.srcObject = i_oStreamEvent.stream;
        };

        m_oRTCPeerConnection.ontrack = function(i_oStreamEvent) {
            console.log("\n\n\n\n\n RTC PeerConnection ontrack RECEIVED STREAM !!!! ", i_oStreamEvent, " \n\n\n\n\n");
            $("#remote-video")[0].srcObject = i_oStreamEvent.stream;
        };

        m_oRTCPeerConnection.onicecandidate = _onIceCandidate.bind(m_oInterface, i_sClientName);
        m_oRTCPeerConnection.oniceconnectionstatechange = _onIceStateChange;
        m_oRTCPeerConnection.ondatachannel = _onDataChannelReceived;

        if (m_oMediaStream) {
            m_oRTCPeerConnection.addStream(m_oMediaStream);
        }

        m_oRTCPeerConnection.onclose = function() {
            console.log("RTCPeerConnection Closed!")
        };
    }

    //==============================================================================
    function _initiateCall(i_sClientName) {
        return new Promise((i_oResolve, i_oReject) => _initiateCall_Internal(i_sClientName, i_oResolve, i_oReject));
    }

    //==============================================================================
    function _initiateCall_Internal(i_sClientName, i_oResolve, i_oReject) {
        // 1- create local peer connection object
        _createRTCPeerConnection(i_sClientName, i_oResolve, i_oReject);

        // 2- create offer
        console.log('m_oRTCPeerConnection createOffer start');
        m_oRTCPeerConnection.createOffer(m_oRTCConstraints)
            .then(
                _onCreateOfferSuccess.bind(m_oRTCPeerConnection, i_sClientName),
                _onCreateSessionDescriptionError
            );
    }

    //==============================================================================
    function _onCreateOfferSuccess(i_sToClientName, i_oOfferDesc) {
        console.log('Offer success from m_oRTCPeerConnection');
        console.log('Setting m_oRTCPeerConnection setLocalDescription...');

        m_oRTCPeerConnection.setLocalDescription(i_oOfferDesc).then(
            function() {
                console.log("Set Local Description succeeded!");
                _sendCallTo(i_sToClientName, i_oOfferDesc);
            },
            _onSetSessionDescriptionError
        );
    }

    //==============================================================================
    function _answerCall(i_oData) {
        // 1- create RTC Peer Connection
        _createRTCPeerConnection(i_oData.from);

        // 2- set received offer as remote description
        console.log('Answering offered call, m_oRTCPeerConnection setRemoteDescription ...');
        m_oRTCPeerConnection.setRemoteDescription(i_oData.offer)
            .then(() => console.log("_answerCall::setRemoteDescription successfull"),
                _onSetSessionDescriptionError
            );

        console.log('Creating call answer payload...');
        // Since the 'remote' side has no media stream we need
        // to pass in the right constraints in order for it to
        // accept the incoming offer of audio and video.
        m_oRTCPeerConnection.createAnswer(m_oRTCConstraints).then(
            _onCreateAnswerSuccess.bind(m_oRTCPeerConnection, i_oData.from),
            _onCreateSessionDescriptionError
        );

    }

    //==============================================================================
    function _onCreateAnswerSuccess(i_sToClientName, i_oAnswerDesc) {
        console.log('_onCreateAnswerSuccess::Answer from m_oRTCPeerConnection:');
        console.log('_onCreateAnswerSuccess::m_oRTCPeerConnection setLocalDescription start');
        m_oRTCPeerConnection.setLocalDescription(i_oAnswerDesc).then(
            function() {
                console.log("_onCreateAnswerSuccess::Answer creation success, sending answer to ", i_sToClientName);
                _sendAnswerTo(i_sToClientName, i_oAnswerDesc);
                if (m_oOnCallAnsweredCallback) {
                    m_oOnCallAnsweredCallback(i_sToClientName);
                }
            },
            _onSetSessionDescriptionError
        );
    }

    //==============================================================================
    function _FinalizeCall(i_oData) {
        m_oRTCPeerConnection.setRemoteDescription(i_oData.answer)
            .then(() => console.log("_FinalizeCall::Setting remote description successfull"),
                _onSetSessionDescriptionError
            );
    }

    //==============================================================================
    function _onSetSessionDescriptionError(error) {
        console.log('Failed to set session description: ' + error.toString());
    }

    //==============================================================================
    function _hangUp(i_sReason) {
        var l_oReject;

        if (m_oRTCPeerConnection) {
            m_oRTCPeerConnection.close();
            l_oReject = m_oRTCPeerConnection.reject;
            if (l_oReject) {
                delete m_oRTCPeerConnection.reject;
                l_oReject(i_sReason);
            }
            m_oRTCPeerConnection = null;

            if (m_oRTCDataChannel) {
                m_oRTCDataChannel.close();
                m_oRTCDataChannel = null;
            }

            if (m_oPeerDisconnectedCallback) {
                m_oPeerDisconnectedCallback();
            }

            _stopCapturingMedia();
        }
        // send hangup through signalingChannel ?
    }

    //==============================================================================
    function _startCapturingMedia() {
        return navigator
            .mediaDevices
            .getUserMedia({
                audio: true,
                video: {
                    width: {
                        min: 640,
                        ideal: 1280
                    },
                    height: {
                        min: 480,
                        ideal: 720
                    }
                }
            })
            .then(_onUserMediaSucceeded)
            .catch(_onUserMediaError);
    }

    //==============================================================================
    function _stopCapturingMedia() {
        var l_oLocalVideo = $('#local-video') && $('#local-video')[0],
            l_oRemoteVideo = $('#remote-video') && $('#remote-video')[0];

        if (m_oMediaStream) {
            m_oMediaStream.getTracks().forEach(i_oTrack => i_oTrack.stop());
        }

        m_oMediaStream = null;
        l_oLocalVideo.srcObject = null;
        l_oRemoteVideo.srcObject = null;
    }

    //==========================================================================
    function _onUserMediaSucceeded(i_oStream) {
        var l_oLocalVideo = $('#local-video') && $('#local-video')[0],
            l_oRemoteVideo = $('#remote-video') && $('#remote-video')[0];

        m_oMediaStream = i_oStream;

        if (l_oLocalVideo) {
            l_oLocalVideo.srcObject = m_oMediaStream;
        }

        l_oRemoteVideo.addEventListener('loadedmetadata', function() {
            console.log('Remote video videoWidth: ' + this.videoWidth + 'px,  videoHeight: ' + this.videoHeight + 'px');
        });

        l_oRemoteVideo.addEventListener("loadeddata", function() {});
        console.log("REMOTE VIDEO LOADED DATA CALLLED !!!!!!!!");

        l_oRemoteVideo.onresize = function() {
            console.log('Remote video size changed to ' + l_oRemoteVideo.videoWidth + 'x' + l_oRemoteVideo.videoHeight);
        };
    }

    //==========================================================================
    function _onUserMediaError(i_oError) {
        console.log("Error Accessing user media: ", i_oError);
    }

    //=============================================================================
    function _onFileResponse(i_sFromClient, i_bAccepted) {
        if (m_bFileOfferInProgress && m_oOnFileOfferProcessed) {
            m_oOnFileOfferProcessed(i_bAccepted);
        }

        if (!i_bAccepted) {
            m_oOfferedFileDetails = null;
        }
        m_bFileOfferInProgress = false;
    }

    //==========================================================================
    function _notify(i_sEventName) {
        var l_aArgs = Array.prototype.slice.call(arguments),
            l_bSameStack = false;
        l_aArgs.shift(); // event name

        l_bSameStack = i_sEventName === "transferProgress";
        if (m_oEvents[i_sEventName] !== undefined) {
            m_oEvents[i_sEventName].forEach(i_oCallback => {
                // same stack events
                if (l_bSameStack) {
                    i_oCallback.apply(m_oInterface, l_aArgs);
                } else {
                    setTimeout(() => {
                        i_oCallback.apply(m_oInterface, l_aArgs);
                    }, 0);
                }
            });
        }
    }

    //==========================================================================
    function _sendFile(i_oFile) {
        return new Promise((i_oResolve, i_oReject) => {
            _sendFile_Internal(i_oFile, i_oResolve, i_oReject);
        });
    }

    /**
     * sends file through data channel
     * @param  {File} i_oFile file object
     */
    //==========================================================================
    function _sendFile_Internal(i_oFile, i_oSuccessFunc, i_oFailureFunc) {
        var l_oFileReader = new FileReader();

        l_oFileReader.onerror = function(i_oError) {
            console.error("_sendFile_Internal::FILE READER ERROR: ", i_oError);
            i_oFailureFunc();
        };

        _sendFileSlice(i_oFile, l_oFileReader, 0, i_oSuccessFunc, i_oFailureFunc);
    }

    //==========================================================================
    function _sendFileSlice(i_oFile, i_oFileReader, i_nOffset, i_oSuccessFunc, i_oFailureFunc) {
        var l_oFileSlice,
            l_nTStamp = Date.now(),
            l_nOffset = i_nOffset;

        i_oFileReader.onload = function(i_oEvent) {
            // send chunk here
            m_oRTCDataChannel.send(i_oEvent.target.result);
            l_nOffset += i_oEvent.target.result.byteLength;
            console.log("Notifying upload progress ", l_nOffset, "/", i_oFile.size);
            _notify("transferProgress", {
                fileName: i_oFile.name,
                currentBytes: l_nOffset,
                totalBytes: i_oFile.size,
                tstamp: l_nTStamp
            });

            if (l_nOffset < i_oFile.size) {
                setTimeout(() => {
                    _sendFileSlice(i_oFile, i_oFileReader, l_nOffset, i_oSuccessFunc, i_oFailureFunc);
                }, 0);
            } else {
                if (l_nOffset === i_oFile.size) {
                    // success!
                    i_oSuccessFunc();
                }
            }
        }

        l_oFileSlice = i_oFile.slice(l_nOffset, l_nOffset + m_nChunkSize);
        i_oFileReader.readAsArrayBuffer(l_oFileSlice);
    }

    //=============================================================================
    // Private Members
    //=============================================================================
    var m_oInterface = this,
        m_oEvents = {},
        m_aSupportedEvents = ["fileOffer", "disconnect", "transferProgress", "fileReceived"],
        m_aClients = [],
        m_aChatLogs = [],
        m_oSocket = null,
        m_oRTCPeerConnection,
        m_oRTCDataChannel,
        m_oRTCConstraints = {
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 1
        },
        m_oRTCPeerConfig = {
            "rtcpMuxPolicy": "require",
            "bundlePolicy": "max-bundle",
            "iceServers": []
        },
        m_bCallOfferInProgress = false,
        m_bFileOfferInProgress = false,
        m_oOfferedFileDetails = null,
        m_oOnFileOfferProcessed = null,
        m_bRegistrationInProgress = false,
        m_oOnRegistrationComplete = null,
        m_nChunkSize = 1024 * 16, // 16k chunks, recommended for best portability
        m_oMediaStream,
        m_oOnCallReceivedCallback,
        m_oPeerDisconnectedCallback;
    // l_oICEServers = {
    //     "iceServers": [{
    //         "url": "stun:stun.stunprotocol.org:3478"
    //     }]
    // },
}

if (window.define) {
    define(function(require) {
        return cWebSockerMgr;
    });
}
