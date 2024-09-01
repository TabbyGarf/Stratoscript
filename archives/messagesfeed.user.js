// ==UserScript==
// @name         Messages Feed
// @version      1.ent
// @description  bn malek
// @author       Coulisse
// @include      https://avenoel.org/forum
// @icon         https://www.google.com/s2/favicons?sz=64&domain=avenoel.org
// @grant        none
// ==/UserScript==

(() => {
    function avn_date_to_iso_date(date_avn) {
        const date_parts = date_avn.trim().split(' ');
        const ddmm = date_parts[0].split('/').reverse().join('-')
        const hhmmss = date_parts[1];
        const date_iso = yy + '-' + ddmm + 'T' + hhmmss;
        return new Date(date_iso);
    }

    function clear_forum() {
        for (let i = 0; i < 4; i++) {
            forum_main.children[2].remove();
        }
        document.querySelector(".hstack").remove();
    }

    function setup_div() {
        const messages_div = document.createElement("div");
        messages_div.classList.add("topic-messages");
        forum_main.appendChild(messages_div);
        return messages_div;
    }

    function refresh_messages() {
        if (refresh_button.classList.contains("processing")) {
            return;
        }
        messages_div.replaceChildren();
        get_and_display_messages();
    }

    async function get_and_display_messages() {
        refresh_button.classList.add("processing");
        await get_last_messages();
        messages.forEach(message => messages_div.appendChild(message));
        refresh_button.classList.remove("processing");
    }

    function update_quote_button(message_doc) {
        const quote_button = message_doc.querySelector(".message-quote");
        quote_button.classList.remove("message-quote");
        quote_button.setAttribute("href", quote_button.getAttribute("href") + "#form");
        quote_button.setAttribute("target", "_blank");
    }

    async function get_last_messages() {
        let to_fetch = max_messages;
        let latest_message = null;

        while (!latest_message) {
            const forum = await fetch("https://avenoel.org/forum").then(res => res.text());
            const forum_doc = new DOMParser().parseFromString(forum, "text/html");

            const topics = Array.from(forum_doc.querySelectorAll("td.topic-icon")).map(topic => topic.parentElement);

            topics.sort((x, y) => {
                const date_x = avn_date_to_iso_date(x.children[4].innerText);
                const date_y = avn_date_to_iso_date(y.children[4].innerText);
                return (date_y - date_x);
            });

            const latest_topic_id = topics[0].children[1].children[0].href.split('/')[4].split('-')[0];
            latest_message = await fetch("https://avenoel.org/api/v1/topics/" + latest_topic_id + "/messages?size=1&reverse=1").then(res => res.json());
        }

        const latest_message_id = latest_message.data[0].id;

        if (prev_latest_message_id) {
            to_fetch = latest_message_id - prev_latest_message_id;
            messages.splice(messages.length - to_fetch, to_fetch);
        }

        prev_latest_message_id = latest_message_id;

        const new_messages = new Array();
        for (let messages_count = 0, message_id = latest_message_id; messages_count < to_fetch; messages_count++, message_id--) {
            const message = await fetch("https://avenoel.org/message/" + message_id).then(res => (res.status == 200 ? res.text() : null));
            if (!message) {
                continue;
            }
            const message_doc = new DOMParser().parseFromString(message, "text/html");
            update_quote_button(message_doc);
            new_messages.push(message_doc.querySelector(".topic-message"));
        }

        Array.prototype.unshift.apply(messages, new_messages);
    }

    const forum_main = document.querySelector(".breadcrumb").parentNode;

    const max_messages = 20;
    const messages = new Array();
    let prev_latest_message_id = undefined;
    const yy = new Date().getFullYear();

    clear_forum();

    const messages_div = setup_div();
    const refresh_button = document.querySelector(".glyphicon-refresh").parentElement;

    refresh_button.removeAttribute("href");
    refresh_button.removeAttribute("data-refresh");

    get_and_display_messages();

    refresh_button.addEventListener("click", refresh_messages);
})();
