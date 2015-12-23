var RPATH = {};
// Set some variables
RPATH.DEBUG = true;
RPATH.tabs = {};
RPATH.REQUEST_FILTER = {'urls': ['<all_urls>'], 'types': ['main_frame']};
RPATH.EXTRA_INFO = ['responseHeaders'];
RPATH.init = function ()
{
    // Bind our Chrome events.
    try
    {
        // This is in a try/catch because Chrome 21 (dev) causes errors when debugging (chrome.webRequest can be undefined)
        chrome.webRequest.onBeforeRedirect.addListener(this.webRequestListener, this.REQUEST_FILTER, this.EXTRA_INFO);
        chrome.webRequest.onCompleted.addListener(this.webRequestListener, this.REQUEST_FILTER, this.EXTRA_INFO);
        chrome.tabs.onUpdated.addListener(this.tabUpdated);
        chrome.tabs.onCreated.addListener(this.tabUpdate);
        chrome.tabs.onRemoved.addListener(this.tabRemoved);
        chrome.webRequest.onCompleted.addListener(function (details)
        {
            if (this.DEBUG)
            {
                if (details.tabId > 0)
                {
                    if (typeof(RPATH.tabs[details.tabId]) != 'undefined')
                    {
                        RPATH.log('The following data was recorded and stored', RPATH.tabs[details.tabId]);
                    }
                }
            }
        }, this.REQUEST_FILTER, this.EXTRA_INFO);
        // Check if the version has changed.
        var currVersion = RPATH.getVersion();
        var prevVersion = localStorage['version'];
        if (currVersion != prevVersion)
        {
            // Check if we just installed this extension.
            if (typeof prevVersion == 'undefined')
            {
                RPATH.onInstall();
            }
            else
            {
                RPATH.onUpdate();
            }
            localStorage['version'] = currVersion;
        }
        RPATH.log('Current version is: ' + localStorage['version']);
    }
    catch (e)
    {
        RPATH.error(e);
    }
};
RPATH.webRequestListener = function (details)
{
    if (details.tabId > 0)
    {
        // Have we seen this tab before?
        if (typeof(RPATH.tabs[details.tabId]) == 'undefined')
        {
            // Not seen this tab, init it.
            RPATH.tabs[details.tabId] = {};
            RPATH.tabs[details.tabId].isRedirect = false;
        }
        RPATH.tabs[details.tabId].lastactive = new Date().getTime();
        RPATH.record(details);
        // Perform GC 30 out of every 100 requests.
        if (RPATH.rand(1, 100) <= 30)
        {
            RPATH.log('RANDOM GC STARTED');
            RPATH.garbageCollect();
        }
        return;
    }
};
RPATH.setCanvas = function(style,code) {
    var canvas = document.createElement("canvas"); 
    var ctx = canvas.getContext("2d");
    canvas.setAttribute("width", 19);
    canvas.setAttribute("height", 19);
    ctx.font = "12px bold tohama,arial,sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.fillRect(0, 0, 19, 19);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.strokeText(code, 9, 14);
    ctx.lineWidth = 0.8;
    ctx.fillStyle = style;
    ctx.fillText(code, 9, 14.4);
    return ctx.getImageData(0, 0, 19, 19);
}
RPATH.tabUpdated = function (tabId, changeInfo, tab)
{
    RPATH.tabUpdate(tab);
};
RPATH.tabUpdate = function (tab)
{
    // Look at all the status codes in the path,
    // decide which is the most important and make a
    // badge out of it.
    var tabId = tab.id;
    if (typeof( RPATH.tabs[tabId]) != 'undefined')
    {
        var currentPath = RPATH.tabs[tabId].path;
        var statusCode = currentPath[0].statusCode;
        var imageData;
        var statusTitle;
        if(statusCode >= 200 && statusCode < 300) {
            imageData = RPATH.setCanvas("#5d945a",statusCode);
        }
        else if(statusCode >= 300 && statusCode < 400) {
            imageData = RPATH.setCanvas("#f0a012",statusCode);
        } else {
            imageData = RPATH.setCanvas("#e22b2b",statusCode);
        }
        chrome.pageAction.setIcon({ 
            tabId: tabId,
            imageData: imageData
        });
        if (currentPath[0].type == "redirect"){
            statusTitle = currentPath[0].statusLine + " ( " + currentPath[0].url + " )";
        } else {
            statusTitle = currentPath[0].statusLine;
        }
        chrome.pageAction.setTitle({ tabId : tabId, title: statusTitle });
        chrome.pageAction.show(tabId);
    }
};
RPATH.tabRemoved = function (tabId, removeInfo)
{
    RPATH.log('Tab ' + tabId + ' is being removed');
    if (typeof(RPATH.tabs[tabId]) != 'undefined')
    {
        RPATH.log('We had data for ' + tabId + ', freeing now', RPATH.tabs);
        delete RPATH.tabs[tabId];
    }
    else
    {
        RPATH.log('We had no data for tab ' + tabId, RPATH.tabs);
    }
    RPATH.garbageCollect();
};
RPATH.record = function (details)
{
    details.type = 'normal';
    var url = details.url;
    if (typeof(details.redirectUrl) != 'undefined')
    {
        details.type = 'redirect';
        RPATH.tabs[details.tabId].isRedirect = true;
    }
    if (typeof(RPATH.tabs[details.tabId].lastrequest) == 'undefined' || RPATH.tabs[details.tabId].lastrequest != details.requestId)
    {
        RPATH.tabs[details.tabId].lastrequest = details.requestId;
        RPATH.tabs[details.tabId].path = []; // init or reset.
    }
    RPATH.tabs[details.tabId].path.push(details);
    if (!details.ip) details.ip = '(not available)';
    RPATH.log(details.type + ' request recorded, tab ' + details.tabId, details);
};
RPATH.getTab = function (tabId)
{
    if (typeof(RPATH.tabs[tabId]) != 'undefined')
    {
        return RPATH.tabs[tabId];
    }
    return false;
};
RPATH.copyTabPath = function (tabId)
{
    //RPATH.log('wat');
    if (typeof(RPATH.tabs[tabId]) != 'undefined')
    {
        var tab = RPATH.tabs[tabId];
        //RPATH.log(tab);
        tab.path.forEach(function (item)
        {
            //  RPATH.log(item);
        });
        return str;
    }
};
/******
 UTILITY
 ******/
RPATH.log = function (msg)
{
    if (this.DEBUG)
    {
        if (arguments.length == 1)
        {
            console.log(msg);
        }
        else
        {
            console.log(arguments);
        }
    }
};
RPATH.error = function (msg)
{
    if (this.DEBUG)
    {
        if (typeof(msg) == 'object' && msg.stack)
        {
            console.error(msg.stack);
        }
        else if (arguments.length == 1)
        {
            console.error(msg);
        }
        else
        {
            console.error(arguments);
        }
    }
};
// Look at all active tabs and remove data we have for any
// tabs that arent visible & more than 30 seconds old.
RPATH.garbageCollect = function ()
{
    chrome.windows.getAll({populate: true}, function (windows)
    {
        var visibleTabs = [];
        for (var i = 0; i < windows.length; i++)
        {
            var windowscan = windows[i];
            for (var ii = 0; ii < windowscan.tabs.length; ii++)
            {
                var tab = windowscan.tabs[ii];
                visibleTabs.push(tab.id.toString());
            }
        }
        var stamp = new Date().getTime();
        for (var tabId in RPATH.tabs)
        {
            var age = (stamp - RPATH.tabs[tabId].lastactive);
            if (visibleTabs.indexOf(tabId) == -1 && age > 30000) // 30 seconds
            {
                delete RPATH.tabs[tabId];
                RPATH.log('GC: tab ' + tabId + ' wasnt visible and is stale, so was freed', RPATH.tabs);
            }
        }
    });
};
RPATH.rand = function (min, max)
{
    return Math.random() * (max - min) + min;
};
RPATH.onInstall = function ()
{
    RPATH.log("Extension Installed");
};
RPATH.onUpdate = function ()
{
    RPATH.log("Extension Updated");
};
RPATH.getVersion = function ()
{
    var details = chrome.app.getDetails();
    return details.version;
};
RPATH.init();