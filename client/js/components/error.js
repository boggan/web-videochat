define(function(require) {
    var Vue = require("vue"),
        $ = require("jquery"),
        l_sTemplate = `
        <div id="error-container" class="overlay">
            <div id="error-content" class="pop-up">
                <h1>Error</h1>
                <h2>{{errorMsg}}</h2>
                <button id="dismiss-btn" @keyup.esc="onDismiss" @keyup.enter="onDismiss" v-on:click="onDismiss" autofocus>Dismiss</button>
            </div>
        </div>
        `;

    return Vue.component('wrtc-error', {
        template: l_sTemplate,
        props: ["errorMsg"],
        mounted: function() {
            $('#dismiss-btn').focus();
        },
        methods: {
            onDismiss: function() {
                this.$emit("dismiss-error");
            }
        }
    });
});
