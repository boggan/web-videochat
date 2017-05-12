define(function(require) {
    var Vue = require("vue"),
        $ = require("jquery"),
        l_sTemplate = `
        <!-- hook up v-if/v-show here? -->
        <div id="video-container" class="side-container">
            <h4>Video</h4>
            <div id="remote-video-container" class="boxed">
                <video id="remote-video" poster="assets/images/hamster.jpg" autoplay />
            </div>
            <!-- local video -->
            <div id="local-video-container">
                <video id="local-video" poster="assets/images/web_development.jpg" autoplay muted/>
            </div>
        </div>
        `;

    return Vue.component('wrtc-video', {
        template: l_sTemplate,
        props: [], // video stream
        methods: {
            onConnectClicked: function() {
                this.$emit("connect", $("#login-name").val());
            },
            onDisconnectClicked: function() {
                this.$emit("disconnect");
            }
        }
    });
});
