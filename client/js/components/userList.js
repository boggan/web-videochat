define(function(require) {
    var Vue = require("vue"),
        $ = require("jquery"),
        l_sTemplate = `
        <div id="users-container" class="side-container">
            <h4>Connected Users</h4>

            <!-- if no users connected -->
            <h5 v-show="clients.length < 2" id="no-users-label"> No Users Connected </h5>

            <!-- if users connected -->
            <ul v-show="clients.length > 1" id="users-list" class="boxed">
                <li v-for="name in clients" class="user-container">
                    <div class="user-info">
                        <span>{{name}}</span>
                        <div class="user-btn-container" v-if="socket && socket.clientName !== name">
                            <button v-show="!callActive"
                                    :data-callee="name"
                                    v-on:click="onCallPeer">call</button>
                        </div>
                        <span class="active-user" v-else>&#x2606;</span>
                    </div>
                </li>
            </ul>
        </div>
        `;

    return Vue.component('wrtc-userlist', {
        template: l_sTemplate,
        props: ["socket", "clients", "callActive"],
        methods: {
            onCallPeer: function(i_oEvent) {
                console.log("Calling Peer", this, arguments);
                this.$emit("call-peer", i_oEvent.target.getAttribute("data-callee"));
            }
        }
    });
});
