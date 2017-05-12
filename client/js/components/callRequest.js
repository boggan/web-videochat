define(function(require) {
    var Vue = require("vue"),
        $ = require("jquery"),
        l_sTemplate = `
        <div class="overlay">
            <div id="call-request-content" class="pop-up">
                <h1> Incoming call from:</h1>
                <h2>{{fromClient}}</h2>
                <button v-on:click="onAcceptCall">Accept</button>
                <button v-on:click="onRejectCall">Reject</button>
            </div>
        </div>
        `;

    return Vue.component('wrtc-call-request', {
        template: l_sTemplate,
        props: ["from-client"],
        methods: {
            onAcceptCall: function() {
                this.$emit("offer-response", true);
            },

            onRejectCall: function() {
                this.$emit("offer-response", false);
            }
        }
    });
});
