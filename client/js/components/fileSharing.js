define(function(require) {
    var Vue = require("vue"),
        $ = require("jquery"),
        l_sTemplate = `
        <!-- hook up v-if/v-show here? -->
        <div id="file-sharing-container" class="side-container">
            <h4>Files Sharing</h4>
            <h5>Received files</h5>
            <div id="available-files-container" class="boxed">
                <ul>
                    <li v-for="file in receivedFiles">
                        <a v-bind:href="file.url" v-bind:download="file.name">{{file.name}}</a>
                    </li>
                </ul>

            </div>
            <div v-show="callActive">
                <h5>File Upload</h5>
                <div id="transfer-speed">{{(bytesPerSeconds / 1024).toFixed(2)}}k/s</div>
                <progress id="transfer-progress" v-bind:value="currentBytes" v-bind:max="totalBytes"></progress>
                <div id="file-upload-container">
                    <div id="drop-zone" style="display: none">
                        <span>Drag and Drop files here</span>
                    </div>
                    <div id="file-input-container">
                        <p>Choose file on disk: </p>
                        <input type="file"  @change="processFile($event)" />
                    </div>
                </div>
            </div>
        </div>
        `;

    return Vue.component('wrtc-files', {
        template: l_sTemplate,
        props: ["call-active", "current-bytes", "total-bytes", "received-files", "bytes-per-seconds"], // video stream
        methods: {
            processFile: function(i_oEvent) {
                this.$emit("upload-file", i_oEvent.target.files[0]);
                i_oEvent.target.value = "";
            }
        }
    });
});
