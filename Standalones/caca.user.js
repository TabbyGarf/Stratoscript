// ==UserScript==
// @name         Modifier le profil de pseudo à peu de caractères
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       Ence, fix by Stay
// @match        https://avenoel.org/compte
// @icon         https://www.google.com/s2/favicons?sz=64&domain=avenoel.org
// @grant        none
// ==/UserScript==

async function getUserId() {
    try {
        const response = await fetch("https://avenoel.org/auth");
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const userData = await response.json();
        return userData.user.id;
    } catch (error) {
        console.error(error);
        return null;
    }
}

function hookFetch(userId) {
    const realFetch = fetch;
    fetch = async function(...args) {
        const url = args[0];
        if (url.includes("/username:")) {
            args[0] = url.replace(/username:[^/]+/, "id:" + userId);
        }
        return realFetch.apply(this, args);
    };
}
function replaceForms(userId) {
    const forms = Array.from(document.querySelectorAll("form[action*='/user/username:']"));
    for (const form of forms) {
        form.action = form.action.replace(/username:[^/]+/, "id:" + userId);
    }
}

(async function() {
    const userId = await getUserId();
    if (userId) {
        hookFetch(userId);
        replaceForms(userId);
    }
})();
