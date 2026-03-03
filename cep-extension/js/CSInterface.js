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
    // Pass these to CSInterface.prototype.getSystemPath().
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
    // Real CEP exposes detailed theme/skin data; here we surface only the
    // panel background color so callers can match the AE dark theme.
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
        // Lazily capture __adobe_cep__ so this file can be loaded before the
        // host injects the bridge object.
        this._cep = null;
    }

    /**
     * Returns window.__adobe_cep__ or null if not yet available.
     * @private
     */
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
    //
    // Sends a string of ExtendScript code to the host application for
    // execution.  The host evaluates the script synchronously (it blocks AE's
    // main thread), then calls back with the string-serialised return value.
    //
    // @param {string}   script    ExtendScript source to evaluate.
    // @param {function} callback  Optional. Called with a single string arg:
    //                             the value returned by the script, or
    //                             "EvalScript error." on failure.
    // -----------------------------------------------------------------------
    CSInterface.prototype.evalScript = function (script, callback) {
        var cep = this._getCEP();
        if (!cep) {
            // Panel is loading or running outside AE (e.g. in a browser for
            // development).  Call back with a safe error string.
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
    //
    // Returns the filesystem path string for a well-known system location.
    // @param  {string} pathType  One of the SystemPath constants.
    // @return {string}           Absolute filesystem path, or empty string.
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
    //
    // Returns the bundle ID of this extension as declared in manifest.xml.
    // @return {string}
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
    //
    // Returns an object with information about the host application.
    // Fields: appName, appVersion, appLocale, appUILocale.
    // @return {Object}
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
    //
    // Returns an AppSkinInfo object describing the host app's current theme.
    // @return {AppSkinInfo}
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
    //
    // Registers a listener for CEP application/extension events.
    //
    // Common event types:
    //   com.adobe.csxs.events.ApplicationActivate
    //   com.adobe.csxs.events.ApplicationDeactivate
    //   com.adobe.csxs.events.ExtensionUnloaded
    //   com.adobe.csxs.events.WorkspaceLoaded
    //
    // @param {string}   type      The event type string.
    // @param {function} listener  Function to call when the event fires.
    //                             Receives a CSEvent object.
    // @param {Object}   [obj]     Ignored (kept for API compatibility).
    // -----------------------------------------------------------------------
    CSInterface.prototype.addEventListener = function (type, listener, obj) {
        var cep = this._getCEP();
        if (!cep) { return; }
        try {
            cep.addEventListener(type, listener, false);
        } catch (e) {
            // Swallow — non-critical if event registration fails.
        }
    };

    // -----------------------------------------------------------------------
    // removeEventListener(type, listener, obj)
    //
    // Removes a previously registered event listener.
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
    //
    // Dispatches a CSEvent to other extensions or the host application.
    // @param {Object} event  Object with { type, scope, appId, extensionId, data }.
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
    //
    // Closes this extension panel.
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
    //
    // Opens a URL in the user's default web browser.
    // @param {string} url
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

    /** @static — expose the full enum for callers that need other paths. */
    CSInterface.SystemPath = SystemPath;

    // -----------------------------------------------------------------------
    // Expose to global scope
    // -----------------------------------------------------------------------
    global.CSInterface  = CSInterface;
    global.SystemPath   = SystemPath;
    global.AppSkinInfo  = AppSkinInfo;

}(typeof window !== "undefined" ? window : this));
