
function cSocketClientInfos(i_oSocket) {
    //=============================================================================
    // Public methods
    //=============================================================================
    this.SetName = function(i_sName) {
        m_sName = i_sName;
    };

    //=============================================================================
    this.GetName = function() {
        return m_sName;
    };

    this.GetSocket = function() {
        return m_oSocket;
    }

    //=============================================================================
    // Private methods
    //=============================================================================

    //=============================================================================
    // Private Members
    //=============================================================================
    var m_oInterface = this,
        m_sName = "Unknown " + Date.now(),
        m_oSocket = i_oSocket;
}

module.exports = cSocketClientInfos;
