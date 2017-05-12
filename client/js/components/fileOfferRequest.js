define(function(require) {
    var Vue = require("vue"),
        $ = require("jquery"),
        l_sTemplate = `
        <div class="overlay">
            <div id="file-request-content" class="pop-up">
                <h2>File request from: {{fromClient}}</h2>
                <ul>
                    <li><b>name: </b><span>{{requestData.name}}</span></li>
                    <li><b>Size: </b><span>{{requestData.size}}</span></li>
                </ul>
                <button v-on:click="onAcceptFile">Accept</button>
                <button v-on:click="onRejectFile">Reject</button>
            </div>
        </div>
        `;

    return Vue.component('wrtc-file-offer-request', {
        template: l_sTemplate,
        props: ["from-client", "request-data"],
        methods: {
            onAcceptFile: function() {
                this.$emit("offer-response", true);
            },

            onRejectFile: function() {
                this.$emit("offer-response", false);
            }
        }
    });
});
