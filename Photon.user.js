// ==UserScript==
// @name Photon
// @namespace photon
// @author Rob Just (rob.just@rackspace.com)
// @description Block storage related enhancements for Rackspace tools.
// @include omitted for github*
// @version     0.9
// @require		https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @require     https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js
// @run-at document-idle
// @grant GM_xmlhttpRequest
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_addStyle
// @downloadURL https://rax.io/Photon
// ==/UserScript==
var authToken;
var tokenExpiration;
var tokenValid = false;


$("head").append(
    '<link ' +
    'href="//ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/base/jquery-ui.min.css" ' +
    'rel="stylesheet" type="text/css">'
);

const wwnVNXUnity = new RegExp(/\b6006016\S{25}\b|\b60\:06\:01\:6\S\:\S{2}\:\S{2}\:\S{2}\:\S{2}:\S{2}\:\S{2}\:\S{2}\:\S{2}\:\S{2}\:\S{2}\:\S{2}\:\S{2}\b/g);
const wwnVMAX = new RegExp(/\b6000097\S{25}\b|\b60\:00\:09\:7\S\:\S{2}\:\S{2}\:\S{2}\:\S{2}:\S{2}\:\S{2}\:\S{2}\:\S{2}\:\S{2}\:\S{2}\:\S{2}\:\S{2}\b/g);
const apiBase = 'omitted for github';
const vmaxWWNEndpoint = 'emc/vmax/assets/volumes?wwn=';
const vnxWWNEndpoint = 'emc/vnx/assets/luns?uid=';
const unityWWNEndpoint = 'emc/unity/configuration/luns?wwn=';
const vmaxArrayEndpoint = 'emc/vmax/';
const vnxArrayEndpoint = 'emc/vnx/';
const unityArrayEndpoint = 'emc/unity/';
const vnxStorageCenterURL = 'omitted for github';
const unityStorageCenterURL = 'omitted for github';
const vmaxStorageCenterURL = 'omitted for github';
const identityAuthURL = 'omitted for github';
const coreDeviceURL = 'omitted for github';

function getAuthToken(username, tokenKey) {
    console.log('getAuthToken');
    return new Promise(function(resolve, reject) {

        GM_xmlhttpRequest({
            method: "POST",
            url: identityAuthURL,
            headers: {
                'Content-type': 'application/json',
                'Accept': 'application/json'
            },
            data: JSON.stringify({
                "auth": {
                    "RAX-AUTH:domain": {
                        "name": "Rackspace"
                    },
                    "RAX-AUTH:rsaCredentials": {
                        "tokenKey": tokenKey,
                        "username": username
                    }
                }
            }),
            onload: function(response) {
                if (response.status === 200) {
                    console.log(response);
                    resolve(response);
                } else {
                    console.log('error: ' + response.status);
                    reject(Error(response.statusText));
                }

            }
        });
    });
}

function getGMValues() {
    return new Promise(function(resolve) {
        authToken = GM_getValue('authToken', 0);
        tokenExpiration = GM_getValue('tokenExpiration', 0);
        var returnVals = [authToken, tokenExpiration];
        resolve(returnVals);
    });
}

function checkToken() {
    getGMValues().then(function(returnVals) {
        var date = new Date();
        var now = date.getTime();
        if (now < returnVals[1]) {
            console.log('Identity (SC) Token is valid.');
            authToken = returnVals[0];
            tokenExpiration = returnVals[1];
            console.log('token:' + returnVals[0]);
            console.log('expires: ' + returnVals[1]);
            tokenValid = true;
        } else {
            console.log('Identity (SC) Token expired.');
            tokenValid = false;
        }
    });
}

checkToken(); // check on load




$("pre.comment_container").each(function() {
    var src_str = $(this).html();
    src_str = src_str.replace(wwnVNXUnity, "<div id='accordion' class='wwnVNXUnity' style='display:inline-block'><h3>$&</h3><div id='tabs' class='tabs'><ul><li><a href='#lun_tab'>LUN</a></li><li><a href='#array_tab'>Array</a></li></ul><div id='lun_tab' class='lun_tab'></div><div id='array_tab' class='array_tab'></div></div></div>");
    src_str = src_str.replace(wwnVMAX, "<div id='accordion' class='wwnVMAX' style='display:inline-block'><h3>$&</h3><div id='tabs' class='tabs'><ul><li><a href='#lun_tab'>LUN</a></li><li><a href='#array_tab'>Array</a></li></ul><div id='lun_tab' class='lun_tab'></div><div id='array_tab' class='array_tab'></div></div></div>");
    $(this).html(src_str);
});

$("div.tabs").tabs();

$("div.tabs").css('padding', '0');
$("ul.ui-tabs-nav").css('display', 'flex'); // Fix firefox tab display bug
$("div.wwnVNXUnity").css("border-color", 'lightgreen')
$("div.wwnVNXUnity").css("border-width", '0 10px 0 0')
$("div.wwnVNXUnity").css("border-style", 'solid')
$("div.wwnVNXUnity").css("border-radius", '5px')


$("div.wwnVMAX").css("border-color", 'lightblue')
$("div.wwnVMAX").css("border-width", '0 10px 0 0')
$("div.wwnVMAX").css("border-style", 'solid')
$("div.wwnVMAX").css("border-radius", '5px')

$("div.wwnVMAX").accordion({
    collapsible: true,
    active: false,
    heightStyle: "content",
    icons: {
        "header": "ui-icon-plus",
        "activeHeader": "ui-icon-minus"
    },
    animate: 100
});

$("div.wwnVNXUnity").accordion({
    collapsible: true,
    active: false,
    heightStyle: "content",
    icons: {
        "header": "ui-icon-plus",
        "activeHeader": "ui-icon-minus"
    },
    animate: 100
});


function getLUNDetails(wwn, wwnType) {
    var lookupURL = '';
    if (wwnType === 'VNX') {
        lookupURL = vnxWWNEndpoint;
    } else if (wwnType === 'Unity') {
        lookupURL = unityWWNEndpoint;
    } else if (wwnType === 'VMAX') {
        lookupURL = vmaxWWNEndpoint;
    }
    console.log('apiBase: ' + apiBase);
    console.log('lookupURL: ' + lookupURL);
    console.log('wwn: ' + wwn);
    console.log('token: ' + authToken);

    return new Promise(function(resolve, reject) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: apiBase + lookupURL + wwn,
            headers: {
                'Content-type': 'application/json',
                'Accept': 'application/json',
                'X-Auth-Token': authToken
            },
            onload: function(response) {
                // if (response.status === 200 && JSON.parse(response.responseText).totalItems > 0) {
                if (response.status === 200) {
                    console.log(response);
                    resolve(response);
                    // } else if (response.status === 200 && JSON.parse(response.responseText).totalItems == 0) {
                    //     console.log(response);
                    //     reject(Error(response.statusText));
                } else {
                    console.log(response);
                }
            },
            onerror: function(error) {
                console.log([
                    error.status,
                    error.statusText,
                    error.readyState,
                    error.responseHeaders,
                    error.responseText,
                    error.finalUrl
                ]);
            }
        });
    });
}

function getArrayInfo(deviceNumber, arrayType) {
    var lookupURL = '';
    if (arrayType === 'VNX') {
        lookupURL = vnxArrayEndpoint;
    } else if (arrayType === 'Unity') {
        lookupURL = unityArrayEndpoint;
    } else if (arrayType === 'VMAX') {
        lookupURL = vmaxArrayEndpoint;
    }
    return new Promise(function(resolve, reject) {
        var arrayName = '';
        var arrayModel = '';
        getSCData(lookupURL, deviceNumber).then(function(response) {
            var jsonData = JSON.parse(response.responseText);
            arrayName = jsonData.name;
            arrayModel = jsonData.model;
            resolve([arrayName, arrayModel]);
        });
    });
}

function getArrayIPs(deviceNumber) {
    return new Promise(function(resolve, reject) {
        var arrayIPs = {};
        getSCData(deviceNumber, '/management').then(function(response) {
            var jsonData = JSON.parse(response.responseText);
            for (let item of jsonData.items) {
                arrayIPs[item.name] = item.address;
                console.log(item);
            }
            resolve(arrayIPs);
        });
    });
}

function getSCData(firstEndpoint, secondEndpoint) {
    return new Promise(function(resolve, reject) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: apiBase + firstEndpoint + secondEndpoint,
            headers: {
                'Content-type': 'application/json',
                'Accept': 'application/json',
                'X-Auth-Token': authToken
            },
            onload: function(response) {
                if (response.status === 200) {
                    console.log(response);
                    resolve(response);
                } else if (response.status != 200) {
                    console.log(response);
                    reject(Error(response.statusText));
                } else {
                    console.log(response);
                }
            },
            onerror: function(error) {
                console.log([
                    error.status,
                    error.statusText,
                    error.readyState,
                    error.responseHeaders,
                    error.responseText,
                    error.finalUrl
                ]);
            }
        });
    });
}

$("div.wwnVNXUnity").accordion({
    beforeActivate: function(event, ui) {
        var opened = $(this).find('.ui-accordion-header.ui-state-active').length;
        $(this).children('div.tabs').children('div.lun_tab').html('Loading...');
        $(this).children('div.tabs').children('div.array_tab').html('');
        checkToken();
        if (tokenValid && !opened) {
            console.log('token vaild and accordion not opened');
            if ($(this).children('h3').text().length <= 47) {
                console.log('h3 text less than or equal to 47');
                var selected_wwn = $(this).children('h3').text().split('\n')[0];
                var parsed_wwn;
                if (selected_wwn.length === 32) {
                    parsed_wwn = selected_wwn.replace(/(.{2})/g, "$1:").slice(0, -1).toUpperCase();
                } else {
                    parsed_wwn = selected_wwn.toUpperCase();
                }
                var isVNX = true;
                getLUNDetails(parsed_wwn, "VNX")
                    .then((response) => {
                            if (JSON.parse(response.responseText).totalItems <= 0) {
                                isVNX = false;
                            } else {
                                if (JSON.parse(response.responseText).totalItems > 0) {
                                    console.log("Success! VNX");
                                    let lunDetails = JSON.parse(response.responseText).items[0];
                                    let deviceNumber = lunDetails.deviceNumber;
                                    let lunID = lunDetails.lunID;
                                    let name = lunDetails.name;
                                    let poolName = lunDetails.poolName;
                                    let raidType = lunDetails.raidType;
                                    let userCapacityGB = lunDetails.userCapacityGB;
                                    let detailString = parsed_wwn +
                                        '\nLUN Name: ' + name +
                                        '\nLUN ID: ' + lunID +
                                        '\nCapacity GB: ' + userCapacityGB +
                                        '\nPool: ' + poolName +
                                        '\nRaid type: ' + raidType + '\n';
                                    $(this).children('div.tabs').children('div.lun_tab').html(detailString);
                                    return deviceNumber;
                                }
                            }
                        },
                        (error) => {
                            console.log("No WWN found for VNX");
                            $(this).children('div.tabs').children('div.lun_tab').html('This WWN was not found in StorageCenter.');
                        })
                    .then((deviceNumber) => {
                        if (isVNX == false) {
                            console.log("No WWN found for VNX, trying Unity");
                            deviceNumber = getLUNDetails(parsed_wwn, "Unity")
                                .then((response) => {
                                        if (JSON.parse(response.responseText).totalItems > 0) {
                                            console.log("Success! Unity");
                                            let lunDetails = JSON.parse(response.responseText).items[0];
                                            let tempDeviceNumber = lunDetails.deviceNumber;
                                            let lunID = lunDetails.lunID;
                                            let name = lunDetails.name;
                                            let poolName = lunDetails.pool;
                                            let userCapacityGB = lunDetails.sizeTotal / 1024 / 1024 / 1024;
                                            let isThin = lunDetails.isThinEnabled;
                                            let detailString = parsed_wwn +
                                                '\nLUN Name: ' + name +
                                                '\nLUN ID: ' + lunID +
                                                '\nTotal Capacity GB: ' + userCapacityGB +
                                                '\nPool: ' + poolName +
                                                '\nThin: ' + isThin;
                                            $(this).children('div.tabs').children('div.lun_tab').html(detailString);
                                            return tempDeviceNumber;
                                        } else {
                                            console.log("No WWN found for VNX or Unity");
                                            $(this).children('div.tabs').children('div.lun_tab').html('This WWN was not found in StorageCenter.');
                                        }
                                    },
                                    (error) => {
                                        console.log("No WWN found for Unity");
                                        $(this).children('div.tabs').children('div.lun_tab').html('This WWN was not found in StorageCenter.');
                                    });
                        }
                        return deviceNumber;
                    })
                    .then((deviceNumber) => {
                        console.log(deviceNumber);
                        console.log('isVNX: ' + isVNX);
                        if (isVNX) {
                            getArrayInfo(deviceNumber, 'VNX')
                                .then((arrayInfoArray) => {
                                    arrayName = arrayInfoArray[0];
                                    arrayModel = arrayInfoArray[1];
                                    var arrayInfo = '\nArray: <a target="_blank" href="' + vnxStorageCenterURL + deviceNumber + '/overview">' + arrayName + '</a> ' + arrayModel +
                                        '\nCore: <a target="_blank" href="' + coreDeviceURL + deviceNumber + '">' + deviceNumber + '</a>';
                                    $(this).children('div.tabs').children('div.array_tab').append(arrayInfo);
                                });
                        } else {
                            getArrayInfo(deviceNumber, 'Unity')
                                .then((arrayInfoArray) => {
                                    arrayName = arrayInfoArray[0];
                                    arrayModel = arrayInfoArray[1];
                                    var arrayInfo = '\nArray: <a target="_blank" href="' + unityStorageCenterURL + deviceNumber + '/overview">' + arrayName + '</a> ' + arrayModel +
                                        '\nCore: <a target="_blank" href="' + coreDeviceURL + deviceNumber + '">' + deviceNumber + '</a>';
                                    $(this).children('div.tabs').children('div.array_tab').append(arrayInfo);
                                });
                        }
                        return deviceNumber;
                    })
                    .then((deviceNumber) => {
                        getArrayIPs(deviceNumber)
                            .then((ipDictionary) => {
                                arrayIPs = ipDictionary;
                                var arrayIPInfo = '';
                                for (var key in arrayIPs) {
                                    // check if the property/key is defined in the object itself, not in parent
                                    if (arrayIPs.hasOwnProperty(key)) {
                                        arrayIPInfo += '\n' + key + ': <a target="_blank" href="https://' + arrayIPs[key] + '">' + arrayIPs[key] + '</a>';
                                    }
                                }
                                $(this).children('div.tabs').children('div.array_tab').append(arrayIPInfo);
                            });
                    });

            } else {
                console.log('wwn error');
                // var selected_wwn = $(this).text().split('\n')[0];
                // $(this).html(selected_wwn);
            }
        } else if (!tokenValid) {
            promptForLogin(this);
        }

    }
});

$("div.wwnVMAX").accordion({
    beforeActivate: function(event, ui) {
        var opened = $(this).find('.ui-accordion-header.ui-state-active').length;
        console.log(opened);
        console.log(tokenValid);
        $(this).children('div.tabs').children('div.lun_tab').html('Loading...');
        $(this).children('div.tabs').children('div.array_tab').html('');
        checkToken();
        if (tokenValid && !opened) {
            if ($(this).children('h3').text().length <= 47) {
                console.log('h3 text less than or equal to 47');
                var selected_wwn = $(this).children('h3').text().split('\n')[0];
                var parsed_wwn;
                if (selected_wwn.length === 47) {
                    parsed_wwn = selected_wwn.replace(/:/g, "");
                } else {
                    parsed_wwn = selected_wwn;
                }
                getLUNDetails(parsed_wwn, "VMAX")
                    .then((response) => {
                            if (JSON.parse(response.responseText).totalItems > 0) {
                                console.log("Success! VMAX");
                                let lunDetails = JSON.parse(response.responseText).items[0];
                                let deviceNumber = lunDetails.deviceNumber;
                                let lunID = lunDetails.hexID;
                                let name = lunDetails.name;
                                let poolName = lunDetails.boundPool;
                                let userCapacityGB = round(lunDetails.capacityMB / 1024, 3);
                                let detailString = 'LUN Name: ' + name + '\nHEX ID: ' + lunID + '\nCapacity GB: ' + userCapacityGB + '\nPool: ' + poolName;
                                //$(this).html(selected_wwn + detailString);
                                $(this).children('div.tabs').children('div.lun_tab').html(detailString);
                                return deviceNumber;
                            } else {
                                console.log("No WWN found for VMAX");
                                $(this).children('div.tabs').children('div.lun_tab').html('This WWN was not found in StorageCenter.');
                            }
                        },
                        (error) => {
                            console.log("No WWN found for VMAX");
                            $(this).children('div.tabs').children('div.lun_tab').html('This WWN was not found in StorageCenter.');
                        })
                    .then((deviceNumber) => {
                        console.log(deviceNumber);
                        getArrayInfo(deviceNumber, 'VMAX')
                            .then((arrayInfoArray) => {
                                arrayName = arrayInfoArray[0];
                                arrayModel = arrayInfoArray[1];
                                var arrayInfo = '\nArray: <a target="_blank" href="' + vmaxStorageCenterURL + deviceNumber + '/overview">' + arrayName + '</a> ' + arrayModel +
                                    '\nCore: <a target="_blank" href="' + coreDeviceURL + deviceNumber + '">' + deviceNumber + '</a>';
                                $(this).children('div.tabs').children('div.array_tab').append(arrayInfo);
                            });
                        return deviceNumber;
                    })
                    .then((deviceNumber) => {
                        getArrayIPs(deviceNumber)
                            .then((ipDictionary) => {
                                arrayIPs = ipDictionary;
                                var arrayIPInfo = '';
                                for (var key in arrayIPs) {
                                    // check if the property/key is defined in the object itself, not in parent
                                    if (arrayIPs.hasOwnProperty(key)) {
                                        if (key.includes("Unisphere")) {
                                            arrayIPInfo += '\n' + key + ': <a target="_blank" href="https://' + arrayIPs[key] + ':8443/univmax">' + arrayIPs[key] + '</a>';
                                        } else {
                                            arrayIPInfo += '\n' + key + ': ' + arrayIPs[key];
                                        }

                                    }
                                }
                                $(this).children('div.tabs').children('div.array_tab').append(arrayIPInfo);
                            });
                    });
            } else {
                //var selected_wwn = $(this).text().split('\n')[0];
                //$(this).html(selected_wwn);
            }
        } else if (!tokenValid) {
            promptForLogin(this);
        }
    }
});

function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

function promptForLogin(place) {
    if ($(place).children('h3').text().length <= 47) {
        injectLogin($(place).children('div.tabs').children('div.lun_tab')).then(() => {
            $(":button.login_identity").click(function() {
                console.log('click!');
                username = $(place).parent().find('#ssouser').val();
                password = $(place).parent().find('#rsatoken').val();
                console.log(username, password);
                getAuthToken(username, password).then((response) => {
                    if (response.status === 200) {
                        authToken = JSON.parse(response.responseText).access.token.id;
                        tokenExpiration = Date.parse(JSON.parse(response.responseText).access.token.expires);
                        console.log('token:' + authToken);
                        console.log('expires: ' + tokenExpiration);
                        GM_setValue('authToken', authToken);
                        GM_setValue('tokenExpiration', tokenExpiration);
                        tokenValid = true;
                        $("div.wwnVNXUnity").accordion({
                            active: false
                        });
                        $("div.wwnVMAX").accordion({
                            active: false
                        });
                    }
                }, function(error) {
                    console.log(error);
                    $(place).children('div.tabs').children('div.lun_tab').append('\nError: ' + error.message + ', try again.');
                });
            });

        });

    }
}

function injectLogin(place) {
    return new Promise(function(resolve, reject) {
        $(place).html('Identity token expired. \nPlease enter your SSO and RSA token:\n<div id="login_form"><form onsubmit="return false" method="post"><input type="text" id="ssouser" placeholder="SSO Username" /><input type="password" id="rsatoken" placeholder="RSA Token" /><button type="submit" class="login_identity">Submit</button></form></div>');
        resolve();
    });
}