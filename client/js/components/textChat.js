define(function(require) {
    var Vue = require("vue"),
        $ = require("jquery"),
        l_sTemplate = `
        <div id="chat-container">
            <h4>Chat Log</h4>
            <div id="chat-window">
                <div v-for="data in chatlogs" class="chat-line">{{data.from}} - [{{data.tstamp}}]: {{data.message}}</div>
            </div>
            <div id="chat-input-container">
                <input @keyup.enter="onSendMessage" id="chat-text-input" type="text" />
                <button v-on:click="onSendMessage">send</button>
                <button v-on:click="onClearMessages">clear</button>
            </div>
        </div>
        `;

    return Vue.component('wrtc-chat', {
        template: l_sTemplate,
        props: ["chatlogs"],
        methods: {
            onSendMessage: function() {
                console.log("Sending message", $("#chat-text-input").val());
                this.$emit("send-message", $("#chat-text-input").val());
                $("#chat-text-input").val('');
            },

            onClearMessages: function() {
                $('#chat-window').empty();
            }
        },
        updated: function() {
            $('#chat-window')[0].scrollTop = 1e10;
        }
    });
});
