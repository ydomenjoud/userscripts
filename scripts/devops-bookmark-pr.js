// ==UserScript==
// @name         Bookmark PR
// @namespace    TFS
// @version      0.2
// @description  bookMark
// @author       yannick
// @match        https://*/*
// @grant        none
// ==/UserScript==

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + JSON.stringify(cvalue) + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function setActive(element, id) {
    element.style.backgroundColor = '#c1c7ee';
    element.style.opacity = 0.4;
}

function setUnactive(element, id) {
    element.style.backgroundColor = 'inherit';
    element.style.paddingLeft = '0px';
    element.style.opacity = 1;
}

function toggle(element, id) {
    if (isActive(id) ){
        delete active[id];
        setUnactive(element, id);
    } else {
        active[id] = new Date().toISOString();
        setActive(element, id);
    }
    setCookie('active', active, 365);

}

function isActive(id) {
    const lastView = active[id];
    if( lastView ) {
        if ( lastView < artifactStatsBatch[id].lastUpdatedDate ){
            delete active[id];
            setCookie('active', active, 365);
        } else {
            return true;
        }
    }
    return false;
}

// intercept ajax request
function addXMLRequestCallback(callback){
    var oldSend, i;
    if( XMLHttpRequest.callbacks ) {
        // we've already overridden send() so just add the callback
        XMLHttpRequest.callbacks.push( callback );
    } else {
        // create a callback queue
        XMLHttpRequest.callbacks = [callback];
        // store the native send()
        oldSend = XMLHttpRequest.prototype.send;
        // override the native send()
        XMLHttpRequest.prototype.send = function(){
            // process the callback queue
            // the xhr instance is passed into each callback but seems pretty useless
            // you can't tell what its destination is or call abort() without an error
            // so only really good for logging that a request has happened
            // I could be wrong, I hope so...
            // EDIT: I suppose you could override the onreadystatechange handler though
            for( i = 0; i < XMLHttpRequest.callbacks.length; i++ ) {
                XMLHttpRequest.callbacks[i]( this );
            }
            // call the native send()
            oldSend.apply(this, arguments);
        }
    }
}

function updateRow(id) {
    const row = document.querySelector('#pr_' + id + ':not(.' + processedClassName + ')');

    if (row) {
        if( isActive(id) ){
            setActive(row, id);
        } else {
            setUnactive(row, id);
        }

        const button = document.createElement('button');
        button.classList.add('custom-button');
        button.addEventListener('click', event => toggle(row, id));
        button.style.alignSelf = 'center';
        button.style.marginLeft = '20px';
        button.textContent = '🗘';

        row.querySelector('[role=presentation]').insertAdjacentElement('afterBegin', button);

        // set this link as processed
        row.classList.add(processedClassName);
    }
}


let artifactStatsBatch = {};

let active = JSON.parse(getCookie('active') || "{}") || {};

const processedClassName = 'processed';

(function() {

    // e.g.
    addXMLRequestCallback( function( xhr ) {
        xhr.onloadend = event => {
            const {responseURL, responseText} = event.target;
            if(responseURL.includes('artifactStatsBatch')){
                JSON.parse(responseText).value.forEach(v => {
                    const pr_id = +(v.artifactId.split("%2F").reverse()[0]);;
                    artifactStatsBatch[pr_id] = v;
                });
            }
        }

    });

    'use strict';
    var observer = new MutationObserver(function (mutations, me) {
        var list = Array.from(document.querySelectorAll('.vc-pullRequest-list-section-list .ms-List-page [role="listitem"]:not(.' + processedClassName + ')'));

        if (list.length > 0) {
            list.forEach( e => {
                const link = e.querySelector('.ms-Link.primary-text');
                // get date
                const [,pr_id] = link.getAttribute('href').match(/\/([0-9]+)\?/);
                e.id = 'pr_' + pr_id;

                if (artifactStatsBatch[pr_id]){
                    updateRow(pr_id);
                }

            });
            //me.disconnect(); // stop observing
            return;
        }
    });

    // start observing
    observer.observe(document, {
        childList: true,
        subtree: true
    });
    // Your code here...
})();
