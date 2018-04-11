// ==UserScript==
// @name        EncorePinHandoffs
// @version         0.9
// @description Pins Handoff tickets to top of selected queues
// @author        Rob Just (rob.just@rackspace.com)
// @namespace    encorepinhandoffs
// @include omitted for github*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect		rackspace.com
// @downloadURL https://rax.io/EncorePinHandoffsGM
// @require		https://gm.thirdlin.com/assets/gm_lib.js
// @run-at document-start
// ==/UserScript==


var queuesToCheck = {
    75: "Storage - Block",
    1828: "Storage - Block Alerts",
    74: "Storage - File",
    2349: "Storage - File Alerts",
    1650: "Storage - Block Provisioning",
    2665: "Storage - File Provisioning"
};

var jQuery_1_9_1 = $.noConflict(true);

var DEV = true; //DEBUGging output to console log (info)

var w = unsafeWindow;
var thisdomain = w.location.host;
var thispath = w.location.href;
var splitThisPath = "";
var queuesInThisPath = "";

var ang;
var appDOM;
var appframesel = 'iframe[name="origin-canvas"]';
var appframe;

$(function() {
    var w = unsafeWindow;

    function hidePageShowLoader() {
        return;
    }

    function showPageHideLoader() {
        return;

    }

    ////////////////////////////////////////////////////////////////////////////////
    // WAIT FOR AngularJS views TO LOAD - Encore specific

    // Encore Origin workaround: Abstract the app iframe (jquery object) and access/manipulate with $app("selector") rather than $("selector")
    var $app = function(selector, context) {
        appframe = $('[name="origin-canvas"]');
        appDOM = appframe.contents().find('[ng-app="encore.tix"]');
        if (selector === null || selector === undefined) {
            //no selector specified, work with the app stage DOM itself
            if (_.size(appDOM) > 0) {
                DEBUG("APPDOM: App stage requested, IS ready.", appDOM, appframe, appframesel);
                return appDOM;
            } else {
                DEBUG("APPDOM: App stage requested, NOT ready.", appDOM, appframe, appframesel);
            }
        } else {
            //work with a selector in the app stage DOM
            var jqNode = (_.isEmpty(context)) ?
                appDOM.find(selector) :
                appDOM.find(context).find(selector);
            if (_.size(appDOM) > 0) {
                if (_.size(jqNode) > 0) {
                    DEBUG("APPDOM: Selector '" + selector + "' AVAILABLE", jqNode, appDOM, appframe, appframesel);
                    return jqNode;
                } else {
                    DEBUG("APPDOM: Selector '" + selector + "' N/A", jqNode, appDOM, appframe, appframesel);
                }
            } else {
                DEBUG("APPDOM: App stage inner DOM (iframe) NOT ready, ignoring selector '" + selector + "'", appDOM, appframe, appframesel);
            }
        }
        //nothing to work with, just return empty jquery object so we don't error
        return $();
    };

    //App iframe exists and has started loading
    function appframeReady() {
        return; // do nothing
    }

    //App workspace loaded, we can start our stuff
    function appframeComplete() {
        domChanges(); // Begin to make changes
    }

    function watchappload(appframesel) {
        appframe = $(appframesel);
        if (appframe) {

            watchNode({
                sel: '[ng-app="encore.tix"]',
                text: "",
                parent: appframe,
                cbdone: {
                    cb: appframeReady,
                    dbg: "App workspace is ready"
                },
                cbretry: {
                    cb: hidePageShowLoader,
                    dbg: "Waiting for app workspace arrival..."
                }
            });

            watchNode({
                sel: ".data-row",
                text: "",
                parent: appframe,
                cbdone: {
                    cb: appframeComplete,
                    dbg: "App workspace is complete"
                },
                cbretry: {
                    cb: hidePageShowLoader,
                    dbg: "Waiting for app workspace completion..."
                }
            });
        } else {
            DEBUG("waiting for app iframe (origin wrapper).", appframe);
            watchappload(frameelem);
        }
    }

    function watchoriginload(frameelem) {
        setTimeout(function() {
            var originscopeobj = ang.element(frameelem).data('$injector').get('$rootScope');
            if (originscopeobj && w.location.href.match("/ticketing/list")) {
                //ORIGIN WRAPPER LOADED - Start working, can do stuff that modifies the menu and outer interface here immediately
                var angEl = ang.element(frameelem);
                DEBUG('AngularJS Framework, Library v.' + ang.version.full + ' for frameLoc: ' + thisdomain + '  ng-app: ' + $(angEl).attr('ng-app'), angEl, frameelem, originscopeobj, ang);
                watchappload(appframesel);
            } else {
                DEBUG("waiting for origin scope (AngularJS object).", frameelem);
                watchoriginload(frameelem);
            }
        }, 10000);
    }

    //PRELOAD OF DATA COMPLTE (callback) - by this time, we expect to have acquired all remote data and can work with it
    function domChanges() {
        DEBUG("EncorePinHandoffs - Loading handoffs from CORE and injecting into Encore ticket list...");
        moveHandoffs();
        setInterval(function() {
            moveHandoffs();
        }, 30000);
    }

    function moveHandoffs() {
        var splitThisPath = w.location.href.split("=");
        var queuesInThisPath = splitThisPath[1].split(",");
        console.log(queuesInThisPath);
        var queueNameArray = [];
        var queueString = "[";
        queuesInThisPath.forEach(function(item) {
            if (queuesToCheck[item] !== null) {
                queueNameArray.push(queuesToCheck[item]);
            }
        });
        for (i = 0; i < queueNameArray.length; i++) {
            if (i === 0 && queueNameArray.length == 1) {
                queueString += '[ "queue_name", "=", "' + queueNameArray[i] + '" ]]';
                break;
            } else if (i === queueNameArray.length - 1) {
                queueString += '"|", [ "queue_name", "=", "' + queueNameArray[i] + '" ]]';
                break;
            } else if (i === 0 && queueNameArray.length > 0) {
                queueString += '[ "queue_name", "=", "' + queueNameArray[i] + '" ],';
                continue;
            } else {
                queueString += '"|", [ "queue_name", "=", "' + queueNameArray[i] + '" ],';
                continue;
            }
        }
        //  console.log(queueString);

        (function($) {
            $(function() {
                console.log('loading handoffs');
                var thisAuthToken = readCookie('rackspace_admin_session');

                //How many tickets to show per queue
                var ticketsFoundPerQueue = {};

                for (var i = 0; i < queuesToCheck.length; i++) {
                    ticketsFoundPerQueue[queuesToCheck[i]] = 0;
                }

                getHandoffTickets(thisAuthToken);

                function readCookie(name) {
                    var nameEQ = name + '=';
                    var ca = document.cookie.split(';');
                    for (var i = 0; i < ca.length; i++) {
                        var c = ca[i];
                        while (c.charAt(0) == ' ')
                            c = c.substring(1, c.length);
                        if (c.indexOf(nameEQ) === 0) {
                            //     console.log(c.substring(nameEQ.length, c.length));
                            return c.substring(nameEQ.length, c.length);
                        }
                    }
                    return null;
                }

                function getHandoffTickets(authToken) {
                    var lookupUrl = 'https://ws.core.rackspace.com/ctkapi/query/';
                    var number,
                        subject,
                        status,
                        assignee,
                        queue,
                        account,
                        team;
                    var handoff_string = '';
                    if ($app('.handoffs').length === 0) {
                        $app('.filters-menu').after('<h4 class="data-table-title header handoffs"><span class="header-text">Handoffs</span></h4><div class="data-header"><div class="data-header-cell flex-columns-3"><div class="data-header-cell-content"><span class="btn-link data-link">Group</span></div></div><div class="data-header-cell flex-columns-3"><span class="btn-link data-link">Ticket</span></div><div class="data-header-cell flex-columns-7"><span class="btn-link data-link">Title</span></div><div class="data-header-cell flex-columns-3"><span class="btn-link data-link">Account</span></div><div class="data-header-cell flex-columns-3"><span class="btn-link data-link">Team</span></div><div class="data-header-cell flex-columns-3"><span class="btn-link data-link">Status</span></div></div><div class="handoff-table"></div>');
                    }


                    var lookupFunc = GM_xmlhttpRequest({
                        method: 'POST',
                        url: lookupUrl,
                        data: '{"class": "Ticket.Ticket","load_arg": {"class":"Ticket.TicketWhere","values":[["status_name", "=", "Handoff"],"&",' + queueString + ']},"attributes": {"account": "account.name", "assignee": "assignee.name", "number": "number", "subject": "subject", "status": "status.name", "queue": "queue.name", "team": "support_team.name"}}',
                        headers: {
                            'Content-type': 'application/json',
                            'X-Auth': authToken
                        },
                        synchronous: true,
                        onload: function(response) {
                            if ($.parseJSON(response.status) != 200) {
                                $app('.handoff-table').html('<div>Error: Could not connect to CORE to retrieve Handoff tickets. Please login to CORE by clicking <a href="https://core.rackspace.com/py/core_login_page.pt" target="_blank">here.</a> Once logged in, handoff tickets should appear within 30 seconds.</div>');
                            } else {
                                //   console.log(response);
                                var openTickets = $.parseJSON(response.responseText);
                                totalTicketsFound = openTickets[0].result.length;
                                if (totalTicketsFound > 1) {

                                    for (var i = 0; i < openTickets[0].result.length; i++) {
                                        number = openTickets[0].result[i].number;
                                        subject = openTickets[0].result[i].subject;
                                        status = openTickets[0].result[i].status;
                                        assignee = openTickets[0].result[i].assignee;
                                        queue = openTickets[0].result[i].queue;
                                        account = openTickets[0].result[i].account;
                                        team = openTickets[0].result[i].team;
                                        if (assignee === null) {
                                            handoff_string += '<div class="data-row"><div class="data-cell flex-columns-3"><div class="data-cell-content">' + queue + '</div></div><div class="data-cell flex-columns-3"><div class="data-cell-content"><a target="_blank" href="https://core.rackspace.com/ticket/' + number + '">' + number + '</a></div></div><div class="data-cell flex-columns-7"><div class="data-cell-content"><a target="_blank" href="https://core.rackspace.com/ticket/' + number + '">' + subject + '</div></a></div><div class="data-cell flex-columns-3"><div class="data-cell-content">' + account + '</div></div><div class="data-cell flex-columns-3 ticket-status active"><div class="data-cell-content">' + team + '</div></div><div class="data-cell flex-columns-3 ticket-status active"><div class="data-cell-content">' + status + '</div></div></div>';
                                        }
                                        ticketsFoundPerQueue[queue]++;

                                    }
                                    $app('.handoff-table').html(handoff_string);

                                } else {
                                    $app('.handoff-table').html('<div>No unassigned handoffs found.</div>');
                                }
                            }
                        }
                    });

                }

            });
        })(jQuery_1_9_1);
    }

    //WORK ON OUTER FRAME (ORIGIN)

    ang = w.angular;
    var ngapp = $('[ng-app="encore.origin"]').get(0);
    DEBUG("Watching Origin...", thisdomain, ngapp);
    watchoriginload(ngapp);

});