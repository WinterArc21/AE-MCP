/**
 * CSInterface.js — Minimal Adobe CEP bridge library for AE MCP Bridge panel.
 *
 * Provides the standard CEP JavaScript-to-ExtendScript bridge used inside
 * Adobe Creative Cloud extension panels.  Only the subset of the full
 * CSInterface API required by this panel is implemented here; for a complete
 * reference implementation see Adobe's open-source CEP resources.
 *
 * Key design notes:
 *  - evalScript() is the core method: it hands a string of ExtendScript code
 *    to the AE engine and invokes an optional callback with the string result.
 *  - All CEP host communication goes through window.__adobe_cep__, which is
 *    injected by the AE browser process when a panel loads.
 *  - getSystemPath() exposes well-known folder paths from the host OS.
 *  - addEventListener() proxies to the CEP event system for panel lifecycle
 *    and application events.
 */

(function (global) {
    "use strict";

    // -----------------------------------------------------------------------
    // SystemPath constants — mirrors Adobe's CSInterface.SystemPath enum.
    // -----------------------------------------------------------------------
    var SystemPath = {
        /** The root folder of the current extension. */
        EXTENSION: "extension",
        /** The user's home directory. */
        USER_DATA: "userData",
        /** The application's installation folder. */
        APPLICATION: "application",
        /** The user's desktop folder. */
        MY_DOCUMENTS: "myDocuments",
        /** Common files shared across all users. */
        COMMON_FILES: "commonFiles",
        /** The host application's appdata folder. */
        HOST_APPLICATION: "hostApplication"
    };

    // -----------------------------------------------------------------------
    // AppSkinInfo — lightweight placeholder.
    // -----------------------------------------------------------------------
    function AppSkinInfo() {
        this.panelBackgroundColor = { color: { red: 30, green: 30, blue: 30, alpha: 255 } };
        this.systemHighlightColor = { color: { red: 70, green: 128, blue: 255, alpha: 255 } };
        this.baseFontSize = 11;
    }

    // -----------------------------------------------------------------------
    // CSInterface constructor
    // -----------------------------------------------------------------------
    function CSInterface() {
        this._cep = null;
    }

    CSInterface.prototype._getCEP = function () {
        if (!this._cep) {
            if (typeof window !== "undefined" && window.__adobe_cep__) {
                this._cep = window.__adobe_cep__;
            }
        }
        return this._cep;
    };

    // -----------------------------------------------------------------------
    // evalScript(script, callback)
    // -----------------------------------------------------------------------
    CSInterface.prototype.evalScript = function (script, callback) {
        var cep = this._getCEP();
        if (!cep) {
            if (typeof callback === "function") {
                callback("EvalScript error.");
            }
            return;
        }
        try {
            cep.evalScript(script, callback || function () {});
        } catch (e) {
            if (typeof callback === "function") {
                callback("EvalScript error.");
            }
        }
    };

    // -----------------------------------------------------------------------
    // getSystemPath(pathType)
    // -----------------------------------------------------------------------
    CSInterface.prototype.getSystemPath = function (pathType) {
        var cep = this._getCEP();
        if (!cep) { return ""; }
        try {
            return cep.getSystemPath(pathType) || "";
        } catch (e) {
            return "";
        }
    };

    // -----------------------------------------------------------------------
    // getExtensionID()
    // -----------------------------------------------------------------------
    CSInterface.prototype.getExtensionID = function () {
        var cep = this._getCEP();
        if (!cep) { return "com.motiona.ae-mcp.panel"; }
        try {
            return cep.getExtensionID() || "com.motiona.ae-mcp.panel";
        } catch (e) {
            return "com.motiona.ae-mcp.panel";
        }
    };

    // -----------------------------------------------------------------------
    // getHostEnvironment()
    // -----------------------------------------------------------------------
    CSInterface.prototype.getHostEnvironment = function () {
        var cep = this._getCEP();
        if (!cep) {
            return { appName: "AEFT", appVersion: "0.0", appLocale: "en_US", appUILocale: "en_US" };
        }
        try {
            var raw = cep.getHostEnvironment();
            if (typeof raw === "string") { return JSON.parse(raw); }
            return raw || {};
        } catch (e) {
            return { appName: "AEFT", appVersion: "0.0", appLocale: "en_US", appUILocale: "en_US" };
        }
    };

    // -----------------------------------------------------------------------
    // getApplicationSkinInfo()
    // -----------------------------------------------------------------------
    CSInterface.prototype.getApplicationSkinInfo = function () {
        var cep = this._getCEP();
        if (!cep) { return new AppSkinInfo(); }
        try {
            var raw = cep.getApplicationSkinInfo();
            if (typeof raw === "string") { return JSON.parse(raw); }
            return raw || new AppSkinInfo();
        } catch (e) {
            return new AppSkinInfo();
        }
    };

    // -----------------------------------------------------------------------
    // addEventListener(type, listener, obj)
    // -----------------------------------------------------------------------
    CSInterface.prototype.addEventListener = function (type, listener, obj) {
        var cep = this._getCEP();
        if (!cep) { return; }
        try {
            cep.addEventListener(type, listener, false);
        } catch (e) {
            // Swallow — non-critical.
        }
    };

    // -----------------------------------------------------------------------
    // removeEventListener(type, listener, obj)
    // -----------------------------------------------------------------------
    CSInterface.prototype.removeEventListener = function (type, listener, obj) {
        var cep = this._getCEP();
        if (!cep) { return; }
        try {
            cep.removeEventListener(type, listener, false);
        } catch (e) {
            // Swallow.
        }
    };

    // -----------------------------------------------------------------------
    // dispatchEvent(event)
    // -----------------------------------------------------------------------
    CSInterface.prototype.dispatchEvent = function (event) {
        var cep = this._getCEP();
        if (!cep) { return; }
        try {
            if (typeof cep.dispatchEvent === "function") {
                cep.dispatchEvent(JSON.stringify(event));
            }
        } catch (e) {
            // Swallow.
        }
    };

    // -----------------------------------------------------------------------
    // closeExtension()
    // -----------------------------------------------------------------------
    CSInterface.prototype.closeExtension = function () {
        var cep = this._getCEP();
        if (!cep) { return; }
        try {
            cep.closeExtension();
        } catch (e) {
            // Swallow.
        }
    };

    // -----------------------------------------------------------------------
    // openURLInDefaultBrowser(url)
    // -----------------------------------------------------------------------
    CSInterface.prototype.openURLInDefaultBrowser = function (url) {
        var cep = this._getCEP();
        if (!cep) { return; }
        try {
            if (typeof cep.openURLInDefaultBrowser === "function") {
                cep.openURLInDefaultBrowser(url);
            }
        } catch (e) {
            // Swallow.
        }
    };

    // -----------------------------------------------------------------------
    // Static constants
    // -----------------------------------------------------------------------
    /** @static */ CSInterface.EXTENSION = SystemPath.EXTENSION;
    /** @static */ CSInterface.USER_DATA  = SystemPath.USER_DATA;
    /** @static */ CSInterface.APPLICATION = SystemPath.APPLICATION;
    /** @static */ CSInterface.MY_DOCUMENTS = SystemPath.MY_DOCUMENTS;
    /** @static */ CSInterface.SystemPath = SystemPath;

    // -----------------------------------------------------------------------
    // Expose to global scope
    // -----------------------------------------------------------------------
    global.CSInterface  = CSInterface;
    global.SystemPath   = SystemPath;
    global.AppSkinInfo  = AppSkinInfo;

}(typeof window !== "undefined" ? window : this));
