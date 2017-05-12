define(function(require) {
    var Vue = require("vue"),
        $ = require("jquery"),
        l_sTemplate = `
        <header>
        <h3>Web Videochat</h3>

        <!-- if not connected -->
        <span v-show="socket == null" class="unconnected">
            <input @keyup.enter="onConnectClicked" id="login-name" type="text" placeholder="enter a name" v-model.trim="inputName" /><button id="connect-btn" v-on:click="onConnectClicked">connect</button>
        </span>

        <!-- if connected in -->
        <span v-show="socket" class="connected">
            <b>{{inputName}}</b>
            <button id="disconnect-btn" v-show="!callActive" v-on:click="onDisconnectClicked">disconnect</button>
            <button id="hangup-btn" v-show="callActive" v-on:click="onHangUpClicked">Hang up</button>
        </span>
        <br />
        </header>`;

    return Vue.component('wrtc-header', {
        template: l_sTemplate,
        props: ["socket", "clientName", "callActive"],
        computed: {
            inputName: {
                get: function() {
                    return this.clientName;
                },
                set: function(i_sName) {
                    this.parsedName = i_sName;
                }
            }
        },

        methods: {
            onConnectClicked: function() {
                if(this.parsedName) {
                    this.$emit("connect", this.parsedName);
                } else {
                    this.$emit("error", "Invalid client name");
                }
            },
            onDisconnectClicked: function() {
                this.$emit("disconnect");
            },
            onHangUpClicked: function() {
                this.$emit("hang-up");
            }
        }
    });
});
