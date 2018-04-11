// ==UserScript==
// @name  Strategic Highlighter
// @namespace  strategichighlighter
// @author Rob Just (rob.just@rackspace.com)
// @description Flag Strategic and Custom accounts in ticket view
// @include omitted for github
// @version     1.1
// @downloadURL https://rax.io/StrategicHighlighterGM
// @grant none
// ==/UserScript==

var customAccountTeams = /Int 15|Int 16|Int 17|Int 18|Int 19/g

var accountTeamTicket = document.getElementById('summary_team')
var account = document.getElementById('summary_account')

if (accountTeamTicket.innerHTML.indexOf('ENTC') !== -1) {
    account.insertAdjacentHTML('afterbegin', "<div style='padding:5px;background-color:red'><p style='color:white;font-size:16pt'>Strategic Account</p></div>")
} else {
    if (accountTeamTicket.innerHTML.match(customAccountTeams) !== null) {
        account.insertAdjacentHTML('afterbegin', "<div style='padding:5px;background-color:black'><p style='color:white;font-size:16pt'>Custom Account</p></div>")
    }
}