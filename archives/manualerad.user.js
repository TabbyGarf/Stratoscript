// ==UserScript==
// @name         ManualErad
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Pour modifier tous vos messages par un texte défini, repris du code pokerad en retirant les pokemons et en mettant un replacement text au debut
// @author       TVN, Stay
// @match        https://avenoel.org/mes-messages
// @icon         https://www.google.com/s2/favicons?sz=64&domain=avenoel.org
// @grant        none
// ==/UserScript==

(() => {
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    const replacementText = "   "; // TEXTE D'ERAD, METTRE 3 ESPACES SI VOUS VOULEZ DU VIDE.

    const button_edit = document.createElement("button");
    const button_delete = document.createElement("button");
    const state = document.createElement("span");
    button_edit.innerHTML = "Edit";
    button_delete.innerHTML = "Supprimer";

    const body = document.querySelector('.pagination-topic');
    body.append(document.createElement("br"), button_edit, button_delete, document.createElement("br"), state);

    button_edit.addEventListener("click", edit_confirm);
    button_delete.addEventListener("click", delete_confirm);

    async function edit() {

        const nb_pages = parseInt(document.querySelector('.pagination-topic li:nth-last-child(2)').innerText)
        state.innerHTML = "Patientez..."

        for (let i=1; i<=nb_pages; i++) {
            const rawText = await fetch("https://avenoel.org/mes-messages/"+i).then(res => res.text())
            const doc = new DOMParser().parseFromString(rawText, 'text/html')
            const forms = doc.querySelectorAll('.message-edit-area')
            let nb_msg_editing = 0
            for (const form of forms) {
                const formData = new FormData(form)
                formData.append("content", replacementText);
                if (form.previousElementSibling.innerHTML.replace(/\s/g, '') != "<br>") {
                    await fetch(form.action, {
                        method: 'POST',
                        body: formData
                    })
                }
                nb_msg_editing++
                state.innerHTML = "Edit: Page "+i+ "/"+nb_pages+ ", Message "+ nb_msg_editing +"/"+forms.length
            }
            await delay(10)
        }
        state.innerHTML = "Terminé !";
    }

    async function delete_all() {

        //Suppression des topics
        let nb_page_topic = 1
        let nb_topic_deleting = 0
        let topics_here = true
        let topics = []
        const token = document.querySelector('[name="csrf-token"]').content
        state.innerHTML = "Recherche des topics...";
        while(topics_here) {
            const rawText = await fetch("https://avenoel.org/index.php/forum/"+nb_page_topic+"?search="+document.querySelector(".message-username").innerText+"&type=author").then(res => res.text())
            const doc = new DOMParser().parseFromString(rawText, 'text/html')
            Array.from(doc.querySelectorAll('.topics-author')).slice(1).filter(x => x.querySelector('a').innerText != document.querySelector(".message-username").innerText).map(x => x.parentNode.remove());
            topics = topics.concat([...doc.querySelectorAll('.topics-title a')])
            console.log(topics)
            if(doc.querySelectorAll('.topics-author').length==1) {
                topics_here = false
            }
            state.innerHTML = "Récupération des topics: "+topics.length;
            nb_page_topic++
        }
        const urlRegex = /^https:\/\/avenoel.org\/index.php\/topic\/(\d+)-(\d+)/i
        for (const topic of topics) {
            const [,id] = urlRegex.exec(topic.href)
            await fetch("https://avenoel.org/topic/"+id+"/delete/"+token)
            nb_topic_deleting++
            state.innerHTML = "Suppression des topics: Topic "+ nb_topic_deleting +"/"+topics.length;
        }
        await delay(10)

        //Supression des messages
        const nb_pages = parseInt(document.querySelector('.pagination-topic li:nth-last-child(2)').innerText)
        state.innerHTML = "Patientez..."
        let msg_here = true
        let nb_page_msg = 1

        while(msg_here) {
            const rawText = await fetch("https://avenoel.org/mes-messages/"+nb_page_msg).then(res => res.text())
            const doc = new DOMParser().parseFromString(rawText, 'text/html')
            const links = doc.querySelectorAll('.message-delete')
            let nb_msg_deleting = 0
            if(links.length==0) {
                if(nb_page_msg == nb_pages) {
                    msg_here = false
                } else {
                    nb_page_msg++
                }
            } else {
                for (const link of links) {
                    await fetch(link.href)
                    nb_msg_deleting++
                    state.innerHTML = "Suppression des messages: Page "+nb_page_msg+ ", Message "+ nb_msg_deleting +"/"+links.length;
                }
                await delay(10)
            }
        }
        state.innerHTML = "Terminé !";
    }

    function edit_confirm() {
        if (confirm(`Ceci éditera tous vos messages (éditables) par :\n\n"${replacementText}"\n\nContinuer ?`)) {
            edit();
        }
    }

    function delete_confirm() {
        if (confirm('ATTENTION, CHAQUE MESSAGE SUPPRIMÉ TE FERA PERDRE 5 POINTS ! Continuer ?')) {
            delete_all();
        }
    }
})();
