//==============================================================================
require.config({
    paths: {
        jquery: '../bower_components/jquery/dist/jquery',
        vue: '../bower_components/vue/dist/vue',
        vueLoader: '../bower_components/requirejs-vue/requirejs-vue'
    }
});


// re-evaluate lazy loading ?
// or switch to ES6 / Typescript import
//==============================================================================
require(['jquery', 'vue', './WebSocketMgr', 'components/error', 'components/header', 'components/userList', 'components/textChat', 'components/callRequest', 'components/videoChat', 'components/fileSharing', 'components/fileOfferRequest'], function($, Vue, WebSocketMgr) {

    var l_oLastTransferChunk = null;
    //==========================================================================
    function _onCallOffered(i_sFrom) {
        if (!l_oAnswerResolver) {
            l_oAppData.fromClient = i_sFrom;
            l_oAppData.popUpView = "wrtc-call-request";

            return new Promise((i_oResolve) => {
                l_oAnswerResolver = i_oResolve;
            });
        }
    }

    //==========================================================================
    function _onFileOffered(i_sFrom, i_oFileInfos) {
        l_oAppData.fromClient = i_sFrom;
        l_oAppData.popUpView = "wrtc-file-offer-request";
        l_oAppData.requestData = i_oFileInfos;
        console.log("File offered from : ", i_sFrom, i_oFileInfos);
    }

    //==========================================================================
    function _onFileTransferProgress(i_oProgressInfos) {
        var l_nTransfered,
            l_nTime,
            l_nBytesPerSeconds;

        console.log("Upload Progress Infos : ", i_oProgressInfos);
        // fileName: i_oFile.name,
        // currentBytes: l_nOffset,
        // totalBytes: i_oFile.size
        l_oAppData.currentBytes = i_oProgressInfos.currentBytes;
        l_oAppData.totalBytes = i_oProgressInfos.totalBytes;

        if (l_oLastTransferChunk === null) {
            l_oLastTransferChunk = {
                startTime: Date.now()
            };
            l_oAppData.bytesPerSeconds = 0;
        } else {
            // calculate diffs
            l_nTransfered = l_oAppData.currentBytes;
            l_nTime = i_oProgressInfos.tstamp - l_oLastTransferChunk.startTime; // millis difference
            l_nBytesPerSeconds = (l_nTransfered / l_nTime) * 1000;
            l_oAppData.bytesPerSeconds = Number(l_nBytesPerSeconds.toFixed(2));
        }

        l_oLastTransferChunk.bytes = l_oAppData.currentBytes;
        l_oLastTransferChunk.total = l_oAppData.totalBytes;
        l_oLastTransferChunk.tstamp = i_oProgressInfos.tstamp;


    }

    //==========================================================================
    function _onFileReceived(i_oFileInfos) {
        var l_oBlob = new Blob(i_oFileInfos.data, {
                type: i_oFileInfos.type
            }),
            l_sFileURL = URL.createObjectURL(l_oBlob);

        l_oAppData.receivedFiles.push({
            name: i_oFileInfos.name,
            url: l_sFileURL,
            type: i_oFileInfos.type
        });

        l_oLastTransferChunk = null;
    }

    //==========================================================================
    function _onCallAnswered(i_sCallWith) {
        l_oAppData.callActive = true;
        l_oAppData.callWith = i_sCallWith;
    }

    //==========================================================================
    function _onPeerDisconnected() {
        l_oAppData.callActive = false;
    }

    //==========================================================================
    // MAIN EXECUTION
    //==========================================================================
    var l_oMediaStream,
        l_oWebSocketMgr = new WebSocketMgr(),
        l_oAppData,
        l_oAnswerResolver,
        l_oApp;

    l_oAppData = {
        callWith: "",
        popUpView: "",
        fromClient: "",
        errorView: "",
        errorMsg: "",
        clientName: "",
        requestData: null,
        socket: null,
        callActive: false,
        clients: l_oWebSocketMgr.getClients(),
        chatlogs: l_oWebSocketMgr.getChatLogs(),
        currentBytes: 0,
        totalBytes: 1,
        receivedFiles: [],
        bytesPerSeconds: 0
    };

    l_oWebSocketMgr.setCallOfferedCallback(_onCallOffered);
    l_oWebSocketMgr.setCallAnsweredCallback(_onCallAnswered);
    l_oWebSocketMgr.setPeerDisconnectedCallback(_onPeerDisconnected);

    // register to events
    l_oWebSocketMgr.on("fileOffer", _onFileOffered);
    l_oWebSocketMgr.on("transferProgress", _onFileTransferProgress);
    l_oWebSocketMgr.on("fileReceived", _onFileReceived);

    l_oApp = new Vue({
        el: '#app-container',
        data: l_oAppData,
        methods: {
            onConnect: function(i_sName) {
                var l_oSelf = this;

                l_oWebSocketMgr
                    .connect(arguments[0])
                    .then((i_oSocket) => {
                        l_oSelf.socket = i_oSocket;
                        l_oSelf.clientName = i_oSocket.clientName;
                    });
            },

            onDisconnect: function() {
                l_oWebSocketMgr.disconnect();
                this.socket = null;
            },

            onSendMessage: function(i_sMsg) {
                console.log("On Send Message receiveing in App View -> ", i_sMsg);
                l_oWebSocketMgr.sendChatMsg(i_sMsg);
            },

            onCallPeer: function(i_sName) {
                var l_oSelf = this;
                console.log("Initiating call to ", i_sName);

                l_oWebSocketMgr
                    .call(i_sName)
                    .then(() => {
                            l_oSelf.callActive = true;
                            l_oSelf.callWith = i_sName;
                            console.log("***** Call Connected with ", i_sName, " ******")
                        },
                        (i_sReason) => {
                            l_oSelf.callActive = false;
                            l_oSelf.callWith = "";
                            console.log(" ***** COULD NOT ESTABLISH CALL: ", i_sReason, "*******");
                        });
            },

            onHangUp: function() {
                console.log("Hanging up ...");
                l_oWebSocketMgr.hangUp();
                this.callActive = false;
            },

            onRequestResponse: function(i_bAccepted) {
                if (this.popUpView === "wrtc-call-request") {
                    if (l_oAnswerResolver) {
                        l_oAnswerResolver(i_bAccepted);
                    }
                    l_oAnswerResolver = null;
                } else if (this.popUpView === "wrtc-file-offer-request") {
                    // send file request response here
                    l_oWebSocketMgr.respondToFileOffer(this.fromClient, i_bAccepted);
                }
                this.popUpView = "";
            },

            isConnected: function() {
                return this.socket !== null;
            },

            onError: function(i_sErrorMsg) {
                this.errorView = "wrtc-error";
                this.errorMsg = i_sErrorMsg;
            },

            onErrorDismissed: function() {
                this.errorView = "";
                this.errorMsg = "";
            },

            onUploadFile: function(i_oFile) {
                var l_oFileInfos = {
                    name: i_oFile.name,
                    size: i_oFile.size,
                    type: i_oFile.type
                };

                // offer file, if file is accepted
                // send files in X bytes chunks ? (16k) (slice file with offset)

                console.log("Offering file ", i_oFile, " to ", this.callWith);
                // use promises ?
                l_oWebSocketMgr.offerFile(l_oFileInfos, this.callWith, (i_bAccepted) => {
                    console.log("Reponse from File Offer -> ", i_bAccepted);
                    if (i_bAccepted) {
                        l_oWebSocketMgr.sendFile(i_oFile)
                            .then(() => {
                                console.log("File Uploaded");
                                l_oLastTransferChunk = null;
                            });
                    } else {
                        console.log("File Rejected");
                    }
                });
            }
        }
    });
});
