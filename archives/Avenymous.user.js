// ==UserScript==
// @name         Avenymous
// @namespace    http://tampermonkey.net/
// @version      2024-01-10
// @description  try to take over the world!
// @author       You
// @match        https://avenoel.org/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=avenoel.org
// @grant        none
// @run-at       document-start
// ==/UserScript==

async function hash(string) {
  const utf8 = new TextEncoder().encode(string);
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((bytes) => bytes.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

async function anonymize(username) {
    return (await hash(username)).slice(0, 8)
}

async function replaceUsername(username) {
    username.classList?.remove?.("admin")
    username.classList?.remove?.("mod")
    username.href = ""
    username.textContent = await anonymize(username.textContent?.trim?.())
}

function replaceAvatar(message) {
    message.querySelector(".message-avatar img").src = "https://avenoel.org/images/noavatar.png"
}

function hideInfo(message) {
    const info = message.querySelector(".message-infos")
    info.parentNode.removeChild(info)
}

async function handleMessages(document) {
    const messages = Array.from(document.querySelectorAll(".topic-message"))

    await Promise.all(messages.map(message => {
        const usernames = [
            message.querySelector(".message-username a"),
            message.querySelectorAll(".message-edited a"),
            ...Array.from(message.querySelectorAll(".message-content-quote-author")),
        ]

        const promises = usernames.map(replaceUsername)
        replaceAvatar(message)
        hideInfo(message)

        return Promise.all(promises)
    }))

}

async function handleTopics(document) {
    return Promise.all(Array.from(document.querySelectorAll(".topics-author a")).map(replaceUsername))
}

async function handleDMs(document) {
    return Promise.all(Array.from(document.querySelectorAll(".author a")).map(replaceUsername))
}

async function handle(window) {
    if (/^\/(topic|message)/i.test(window.location.pathname)) {
        await handleMessages(window.document)
    }

    if (/^\/forum/i.test(window.location.pathname)) {
        await handleTopics(window.document)
    }

    if (/^\/messagerie/i.test(window.location.pathname)) {
        await handleDMs(window.document)
    }
}

function hideApp(document) {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync('#app {visibility: hidden}')

    document.adoptedStyleSheets.push(sheet)

    return function revealApp() {
        const index = document.adoptedStyleSheets.indexOf(sheet)
        document.adoptedStyleSheets.splice(index, 1)
    }
}

const revealApp = hideApp(document)

document.addEventListener("DOMContentLoaded", async () => {
    await handle(window)
    revealApp()
})
