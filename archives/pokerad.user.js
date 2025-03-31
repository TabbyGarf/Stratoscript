// ==UserScript==
// @name         Edit Messages AVN, Pokérad 3G edition
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Pour modifier tous vos messages par des monstres de pochent
// @author       TVN, isseCoul
// @match        https://avenoel.org/mes-messages
// @icon         https://www.google.com/s2/favicons?sz=64&domain=avenoel.org
// @grant        none
// ==/UserScript==

(() => {
    function delay (ms) {
        return new Promise((resolve, reject) => setTimeout(resolve, ms))
    }

    const button_edit = document.createElement("button")
    const button_delete = document.createElement("button")
    const state = document.createElement("span")
    button_edit.innerHTML = "Edit";
    button_delete.innerHTML = "Supprimer";

    const body = document.querySelector('.pagination-topic')
    body.append(document.createElement("br"), button_edit, button_delete, document.createElement("br"), state)

    button_edit.addEventListener("click", edit_confirm);
    button_delete.addEventListener("click", delete_confirm);

    function rand_int(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function get_poke() {
        let poke_url = "https://i.imgur.com/MsbQVpD.png";
        const poke_num = rand_int(0, 385);
        const shiny = (Math.random() < 2/100);
        const num_urls = pokedb['entries'][poke_num]['normal_urls'].length;
        if (num_urls == 1) {
            poke_url = shiny ? pokedb['entries'][poke_num]['shiny_urls'][0]['imgur'] : pokedb['entries'][poke_num]['normal_urls'][0]['imgur'];
        } else {
            const rand = rand_int(0, (num_urls - 1));
            poke_url = shiny ? pokedb['entries'][poke_num]['shiny_urls'][rand]['imgur'] : pokedb['entries'][poke_num]['normal_urls'][rand]['imgur'];
        }
        return poke_url;
    }

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
                formData.append("content", get_poke());
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
        if (confirm('Ceci éditera tous vos messages (éditables) par un Pokémon. Continuer ?'))
            edit()
    }

    function delete_confirm() {
        if (confirm('ATTENTION, CHAQUE MESSAGE SUPPRIMÉ TE FERA PERDRE 5 POINTS ! Continuer ?'))
            delete_all()
    }
    
    const pokedb = JSON.parse(`{
    "entries": [
        {
        "name": "Bulbizarre",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_001.gif",
            "imgur": "https://i.imgur.com/RYoq2us.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_001.gif",
            "imgur": "https://i.imgur.com/sbw7YO5.gif"
            }
        ]
        },
        {
        "name": "Herbizarre",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_002.gif",
            "imgur": "https://i.imgur.com/kN82eoh.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_002.gif",
            "imgur": "https://i.imgur.com/vP09I09.gif"
            }
        ]
        },
        {
        "name": "Florizarre",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_003.gif",
            "imgur": "https://i.imgur.com/aCU7Nky.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_003.gif",
            "imgur": "https://i.imgur.com/k4IZeKr.gif"
            }
        ]
        },
        {
        "name": "Salamèche",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_004.gif",
            "imgur": "https://i.imgur.com/R6jybTX.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_004.gif",
            "imgur": "https://i.imgur.com/ILgt7vm.gif"
            }
        ]
        },
        {
        "name": "Reptincel",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_005.gif",
            "imgur": "https://i.imgur.com/pEsEOuW.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_005.gif",
            "imgur": "https://i.imgur.com/VZHdFNF.gif"
            }
        ]
        },
        {
        "name": "Dracaufeu",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_006.gif",
            "imgur": "https://i.imgur.com/YiNnAXa.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_006.gif",
            "imgur": "https://i.imgur.com/rBOTZQM.gif"
            }
        ]
        },
        {
        "name": "Carapuce",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_007.gif",
            "imgur": "https://i.imgur.com/9xnzHZ3.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_007.gif",
            "imgur": "https://i.imgur.com/Vq9P8eD.gif"
            }
        ]
        },
        {
        "name": "Carabaffe",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_008.gif",
            "imgur": "https://i.imgur.com/ZFjbUn0.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_008.gif",
            "imgur": "https://i.imgur.com/TiYcVmd.gif"
            }
        ]
        },
        {
        "name": "Tortank",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_009.gif",
            "imgur": "https://i.imgur.com/yGzIJaC.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_009.gif",
            "imgur": "https://i.imgur.com/oJWpS1i.gif"
            }
        ]
        },
        {
        "name": "Chenipan",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_010.gif",
            "imgur": "https://i.imgur.com/ewABB9Y.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_010.gif",
            "imgur": "https://i.imgur.com/a2Elva5.gif"
            }
        ]
        },
        {
        "name": "Chrysacier",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_011.gif",
            "imgur": "https://i.imgur.com/4JyP9hU.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_011.gif",
            "imgur": "https://i.imgur.com/9tHImGf.gif"
            }
        ]
        },
        {
        "name": "Papilusion",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_012.gif",
            "imgur": "https://i.imgur.com/wk5xgpJ.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_012.gif",
            "imgur": "https://i.imgur.com/qdtinvW.gif"
            }
        ]
        },
        {
        "name": "Aspicot",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_013.gif",
            "imgur": "https://i.imgur.com/X0OF52O.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_013.gif",
            "imgur": "https://i.imgur.com/ZzMLF0i.gif"
            }
        ]
        },
        {
        "name": "Coconfort",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_014.gif",
            "imgur": "https://i.imgur.com/4XlQ2HF.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_014.gif",
            "imgur": "https://i.imgur.com/MnO1lqj.gif"
            }
        ]
        },
        {
        "name": "Dardargnan",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_015.gif",
            "imgur": "https://i.imgur.com/SeOZzdZ.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_015.gif",
            "imgur": "https://i.imgur.com/oBdqHBF.gif"
            }
        ]
        },
        {
        "name": "Roucool",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_016.gif",
            "imgur": "https://i.imgur.com/13qK1ZY.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_016.gif",
            "imgur": "https://i.imgur.com/W6Aa6Mk.gif"
            }
        ]
        },
        {
        "name": "Roucoups",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_017.gif",
            "imgur": "https://i.imgur.com/uzmYasa.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_017.gif",
            "imgur": "https://i.imgur.com/NUHFVRA.gif"
            }
        ]
        },
        {
        "name": "Roucarnage",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_018.gif",
            "imgur": "https://i.imgur.com/70o5isr.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_018.gif",
            "imgur": "https://i.imgur.com/zYWts0r.gif"
            }
        ]
        },
        {
        "name": "Rattata",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_019.gif",
            "imgur": "https://i.imgur.com/wESNgtP.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_019.gif",
            "imgur": "https://i.imgur.com/tgBFO6a.gif"
            }
        ]
        },
        {
        "name": "Rattatac",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_020.gif",
            "imgur": "https://i.imgur.com/lngzcrE.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_020.gif",
            "imgur": "https://i.imgur.com/4VUL09v.gif"
            }
        ]
        },
        {
        "name": "Piafabec",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_021.gif",
            "imgur": "https://i.imgur.com/OB77Y7L.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_021.gif",
            "imgur": "https://i.imgur.com/OzqzgBr.gif"
            }
        ]
        },
        {
        "name": "Rapasdepic",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_022.gif",
            "imgur": "https://i.imgur.com/QyVBTnV.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_022.gif",
            "imgur": "https://i.imgur.com/iwtEpjd.gif"
            }
        ]
        },
        {
        "name": "Abo",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_023.gif",
            "imgur": "https://i.imgur.com/oYnoOCM.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_023.gif",
            "imgur": "https://i.imgur.com/r2MOy9R.gif"
            }
        ]
        },
        {
        "name": "Arbok",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_024.gif",
            "imgur": "https://i.imgur.com/LJf4sbE.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_024.gif",
            "imgur": "https://i.imgur.com/KwuNS1D.gif"
            }
        ]
        },
        {
        "name": "Pikachu",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_025.gif",
            "imgur": "https://i.imgur.com/UApzfUU.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_025.gif",
            "imgur": "https://i.imgur.com/YYcLsXW.gif"
            }
        ]
        },
        {
        "name": "Raichu",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_026.gif",
            "imgur": "https://i.imgur.com/7XJf289.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_026.gif",
            "imgur": "https://i.imgur.com/o7qrllr.gif"
            }
        ]
        },
        {
        "name": "Sabelette",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_027.gif",
            "imgur": "https://i.imgur.com/vu9jml5.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_027.gif",
            "imgur": "https://i.imgur.com/buG8e7Q.gif"
            }
        ]
        },
        {
        "name": "Sablaireau",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_028.gif",
            "imgur": "https://i.imgur.com/siC3czk.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_028.gif",
            "imgur": "https://i.imgur.com/UoppzOo.gif"
            }
        ]
        },
        {
        "name": "Nidoran♀",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_029.gif",
            "imgur": "https://i.imgur.com/iz5B6ww.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_029.gif",
            "imgur": "https://i.imgur.com/sm6uhcv.gif"
            }
        ]
        },
        {
        "name": "Nidorina",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_030.gif",
            "imgur": "https://i.imgur.com/X8CoDQk.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_030.gif",
            "imgur": "https://i.imgur.com/mQ5N43B.gif"
            }
        ]
        },
        {
        "name": "Nidoqueen",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_031.gif",
            "imgur": "https://i.imgur.com/rV5392P.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_031.gif",
            "imgur": "https://i.imgur.com/g9sP2Lw.gif"
            }
        ]
        },
        {
        "name": "Nidoran♂",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_032.gif",
            "imgur": "https://i.imgur.com/8gjglY9.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_032.gif",
            "imgur": "https://i.imgur.com/AEgYR8M.gif"
            }
        ]
        },
        {
        "name": "Nidorino",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_033.gif",
            "imgur": "https://i.imgur.com/NMGUuMm.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_033.gif",
            "imgur": "https://i.imgur.com/jKUUBum.gif"
            }
        ]
        },
        {
        "name": "Nidoking",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_034.gif",
            "imgur": "https://i.imgur.com/J0ADsQg.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_034.gif",
            "imgur": "https://i.imgur.com/5nasUin.gif"
            }
        ]
        },
        {
        "name": "Mélofée",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_035.gif",
            "imgur": "https://i.imgur.com/dK5calV.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_035.gif",
            "imgur": "https://i.imgur.com/eNtlyFA.gif"
            }
        ]
        },
        {
        "name": "Mélodelfe",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_036.gif",
            "imgur": "https://i.imgur.com/RsB9vR9.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_036.gif",
            "imgur": "https://i.imgur.com/WYGyxiO.gif"
            }
        ]
        },
        {
        "name": "Goupix",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_037.gif",
            "imgur": "https://i.imgur.com/1mCEVul.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_037.gif",
            "imgur": "https://i.imgur.com/JEN8qGf.gif"
            }
        ]
        },
        {
        "name": "Feunard",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_038.gif",
            "imgur": "https://i.imgur.com/TbYe6aX.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_038.gif",
            "imgur": "https://i.imgur.com/RrLyElv.gif"
            }
        ]
        },
        {
        "name": "Rondoudou",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_039.gif",
            "imgur": "https://i.imgur.com/fhtG2ky.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_039.gif",
            "imgur": "https://i.imgur.com/mAl6OUT.gif"
            }
        ]
        },
        {
        "name": "Grodoudou",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_040.gif",
            "imgur": "https://i.imgur.com/iV3b24J.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_040.gif",
            "imgur": "https://i.imgur.com/NYbARkD.gif"
            }
        ]
        },
        {
        "name": "Nosferapti",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_041.gif",
            "imgur": "https://i.imgur.com/oUNxXp2.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_041.gif",
            "imgur": "https://i.imgur.com/fKDFYhY.gif"
            }
        ]
        },
        {
        "name": "Nosferalto",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_042.gif",
            "imgur": "https://i.imgur.com/JRtgga7.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_042.gif",
            "imgur": "https://i.imgur.com/hovADAj.gif"
            }
        ]
        },
        {
        "name": "Mystherbe",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_043.gif",
            "imgur": "https://i.imgur.com/LNqUUvs.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_043.gif",
            "imgur": "https://i.imgur.com/bPLWLeg.gif"
            }
        ]
        },
        {
        "name": "Ortide",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_044.gif",
            "imgur": "https://i.imgur.com/hNo1dP3.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_044.gif",
            "imgur": "https://i.imgur.com/K9wfBiG.gif"
            }
        ]
        },
        {
        "name": "Rafflesia",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_045.gif",
            "imgur": "https://i.imgur.com/e7tclFW.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_045.gif",
            "imgur": "https://i.imgur.com/9GRP8Rm.gif"
            }
        ]
        },
        {
        "name": "Paras",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_046.gif",
            "imgur": "https://i.imgur.com/Kqd5qaO.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_046.gif",
            "imgur": "https://i.imgur.com/MtXF1bi.gif"
            }
        ]
        },
        {
        "name": "Parasect",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_047.gif",
            "imgur": "https://i.imgur.com/5o5uDMG.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_047.gif",
            "imgur": "https://i.imgur.com/eQZtvGr.gif"
            }
        ]
        },
        {
        "name": "Mimitoss",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_048.gif",
            "imgur": "https://i.imgur.com/VDmuGiE.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_048.gif",
            "imgur": "https://i.imgur.com/XihhWKn.gif"
            }
        ]
        },
        {
        "name": "Aéromite",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_049.gif",
            "imgur": "https://i.imgur.com/H5Qmv1S.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_049.gif",
            "imgur": "https://i.imgur.com/MU71ehi.gif"
            }
        ]
        },
        {
        "name": "Taupiqueur",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_050.gif",
            "imgur": "https://i.imgur.com/RDk5b9j.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_050.gif",
            "imgur": "https://i.imgur.com/psToUCV.gif"
            }
        ]
        },
        {
        "name": "Triopikeur",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_051.gif",
            "imgur": "https://i.imgur.com/R2p7z8D.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_051.gif",
            "imgur": "https://i.imgur.com/4oQjtsd.gif"
            }
        ]
        },
        {
        "name": "Miaouss",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_052.gif",
            "imgur": "https://i.imgur.com/HDMuTzy.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_052.gif",
            "imgur": "https://i.imgur.com/RUtu8bM.gif"
            }
        ]
        },
        {
        "name": "Persian",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_053.gif",
            "imgur": "https://i.imgur.com/GnAiMfA.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_053.gif",
            "imgur": "https://i.imgur.com/ArEVxpO.gif"
            }
        ]
        },
        {
        "name": "Psykokwak",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_054.gif",
            "imgur": "https://i.imgur.com/IJnxckY.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_054.gif",
            "imgur": "https://i.imgur.com/lO0B42A.gif"
            }
        ]
        },
        {
        "name": "Akwakwak",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_055.gif",
            "imgur": "https://i.imgur.com/uY3YeSB.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_055.gif",
            "imgur": "https://i.imgur.com/WGZm02Z.gif"
            }
        ]
        },
        {
        "name": "Férosinge",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_056.gif",
            "imgur": "https://i.imgur.com/w4H0oVM.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_056.gif",
            "imgur": "https://i.imgur.com/qI5TinY.gif"
            }
        ]
        },
        {
        "name": "Colossinge",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_057.gif",
            "imgur": "https://i.imgur.com/KnzwC94.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_057.gif",
            "imgur": "https://i.imgur.com/OXUhdvq.gif"
            }
        ]
        },
        {
        "name": "Caninos",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_058.gif",
            "imgur": "https://i.imgur.com/2ip9c59.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_058.gif",
            "imgur": "https://i.imgur.com/xKAt5Z3.gif"
            }
        ]
        },
        {
        "name": "Arcanin",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_059.gif",
            "imgur": "https://i.imgur.com/FPlPFST.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_059.gif",
            "imgur": "https://i.imgur.com/IJhvI5b.gif"
            }
        ]
        },
        {
        "name": "Ptitard",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_060.gif",
            "imgur": "https://i.imgur.com/aiHmoiS.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_060.gif",
            "imgur": "https://i.imgur.com/KG7Ndcj.gif"
            }
        ]
        },
        {
        "name": "Têtarte",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_061.gif",
            "imgur": "https://i.imgur.com/ulBaHyd.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_061.gif",
            "imgur": "https://i.imgur.com/AEfOqWc.gif"
            }
        ]
        },
        {
        "name": "Tartard",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_062.gif",
            "imgur": "https://i.imgur.com/GKcBq6k.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_062.gif",
            "imgur": "https://i.imgur.com/NeWEZ1Z.gif"
            }
        ]
        },
        {
        "name": "Abra",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_063.gif",
            "imgur": "https://i.imgur.com/l6MtbIJ.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_063.gif",
            "imgur": "https://i.imgur.com/l3Jznau.gif"
            }
        ]
        },
        {
        "name": "Kadabra",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_064.gif",
            "imgur": "https://i.imgur.com/sgZfiiz.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_064.gif",
            "imgur": "https://i.imgur.com/04d4US2.gif"
            }
        ]
        },
        {
        "name": "Alakazam",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_065.gif",
            "imgur": "https://i.imgur.com/eNVcOg1.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_065.gif",
            "imgur": "https://i.imgur.com/AsMc9yT.gif"
            }
        ]
        },
        {
        "name": "Machoc",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_066.gif",
            "imgur": "https://i.imgur.com/LOu2s5B.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_066.gif",
            "imgur": "https://i.imgur.com/9c0nd9V.gif"
            }
        ]
        },
        {
        "name": "Machopeur",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_067.gif",
            "imgur": "https://i.imgur.com/dYUAM0g.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_067.gif",
            "imgur": "https://i.imgur.com/NMFYwpf.gif"
            }
        ]
        },
        {
        "name": "Mackogneur",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_068.gif",
            "imgur": "https://i.imgur.com/ad5WIV1.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_068.gif",
            "imgur": "https://i.imgur.com/vYFGhAg.gif"
            }
        ]
        },
        {
        "name": "Chétiflor",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_069.gif",
            "imgur": "https://i.imgur.com/Fu0cr9m.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_069.gif",
            "imgur": "https://i.imgur.com/gxNMgyy.gif"
            }
        ]
        },
        {
        "name": "Boustiflor",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_070.gif",
            "imgur": "https://i.imgur.com/HcIAX43.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_070.gif",
            "imgur": "https://i.imgur.com/xvt8dt3.gif"
            }
        ]
        },
        {
        "name": "Empiflor",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_071.gif",
            "imgur": "https://i.imgur.com/8FTrN2i.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_071.gif",
            "imgur": "https://i.imgur.com/1l14ToG.gif"
            }
        ]
        },
        {
        "name": "Tentacool",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_072.gif",
            "imgur": "https://i.imgur.com/3pcQ3sY.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_072.gif",
            "imgur": "https://i.imgur.com/1YKbf8c.gif"
            }
        ]
        },
        {
        "name": "Tentacruel",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_073.gif",
            "imgur": "https://i.imgur.com/BxQZJp9.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_073.gif",
            "imgur": "https://i.imgur.com/5AiqCZS.gif"
            }
        ]
        },
        {
        "name": "Racaillou",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_074.gif",
            "imgur": "https://i.imgur.com/X16bbxY.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_074.gif",
            "imgur": "https://i.imgur.com/bw9eNcR.gif"
            }
        ]
        },
        {
        "name": "Gravalanch",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_075.gif",
            "imgur": "https://i.imgur.com/iVldmh9.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_075.gif",
            "imgur": "https://i.imgur.com/57jlsI1.gif"
            }
        ]
        },
        {
        "name": "Grolem",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_076.gif",
            "imgur": "https://i.imgur.com/X8psgDD.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_076.gif",
            "imgur": "https://i.imgur.com/IIID3NL.gif"
            }
        ]
        },
        {
        "name": "Ponyta",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_077.gif",
            "imgur": "https://i.imgur.com/xtQb6fo.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_077.gif",
            "imgur": "https://i.imgur.com/acLfuys.gif"
            }
        ]
        },
        {
        "name": "Galopa",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_078.gif",
            "imgur": "https://i.imgur.com/JeGyC1P.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_078.gif",
            "imgur": "https://i.imgur.com/qiOxePa.gif"
            }
        ]
        },
        {
        "name": "Ramoloss",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_079.gif",
            "imgur": "https://i.imgur.com/YAyfoJu.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_079.gif",
            "imgur": "https://i.imgur.com/ASZXvnr.gif"
            }
        ]
        },
        {
        "name": "Flagadoss",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_080.gif",
            "imgur": "https://i.imgur.com/qG3ZEps.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_080.gif",
            "imgur": "https://i.imgur.com/Ecv4lye.gif"
            }
        ]
        },
        {
        "name": "Magnéti",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_081.gif",
            "imgur": "https://i.imgur.com/fTWBxOu.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_081.gif",
            "imgur": "https://i.imgur.com/O5jIFDV.gif"
            }
        ]
        },
        {
        "name": "Magnéton",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_082.gif",
            "imgur": "https://i.imgur.com/TncHlx3.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_082.gif",
            "imgur": "https://i.imgur.com/cJVdN8T.gif"
            }
        ]
        },
        {
        "name": "Canarticho",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_083.gif",
            "imgur": "https://i.imgur.com/dPr24b0.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_083.gif",
            "imgur": "https://i.imgur.com/Cv70q6p.gif"
            }
        ]
        },
        {
        "name": "Doduo",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_084.gif",
            "imgur": "https://i.imgur.com/ylK5FU9.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_084.gif",
            "imgur": "https://i.imgur.com/P3IZiU5.gif"
            }
        ]
        },
        {
        "name": "Dodrio",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_085.gif",
            "imgur": "https://i.imgur.com/xRSmuww.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_085.gif",
            "imgur": "https://i.imgur.com/9t0vsqx.gif"
            }
        ]
        },
        {
        "name": "Otaria",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_086.gif",
            "imgur": "https://i.imgur.com/k8GCuCA.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_086.gif",
            "imgur": "https://i.imgur.com/1ZsFZ1c.gif"
            }
        ]
        },
        {
        "name": "Lamantine",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_087.gif",
            "imgur": "https://i.imgur.com/hRQOZTW.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_087.gif",
            "imgur": "https://i.imgur.com/MH5sYuU.gif"
            }
        ]
        },
        {
        "name": "Tadmorv",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_088.gif",
            "imgur": "https://i.imgur.com/d09qQQE.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_088.gif",
            "imgur": "https://i.imgur.com/IY0TBNB.gif"
            }
        ]
        },
        {
        "name": "Grotadmorv",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_089.gif",
            "imgur": "https://i.imgur.com/ekNIlS3.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_089.gif",
            "imgur": "https://i.imgur.com/pi5ErUZ.gif"
            }
        ]
        },
        {
        "name": "Kokiyas",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_090.gif",
            "imgur": "https://i.imgur.com/bqtLvBv.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_090.gif",
            "imgur": "https://i.imgur.com/1l9Rc4B.gif"
            }
        ]
        },
        {
        "name": "Crustabri",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_091.gif",
            "imgur": "https://i.imgur.com/cV1OMB3.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_091.gif",
            "imgur": "https://i.imgur.com/3RzApAZ.gif"
            }
        ]
        },
        {
        "name": "Fantominus",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_092.gif",
            "imgur": "https://i.imgur.com/AEkv78o.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_092.gif",
            "imgur": "https://i.imgur.com/ZR2BRqN.gif"
            }
        ]
        },
        {
        "name": "Spectrum",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_093.gif",
            "imgur": "https://i.imgur.com/0yzbPRO.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_093.gif",
            "imgur": "https://i.imgur.com/8EBr3CL.gif"
            }
        ]
        },
        {
        "name": "Ectoplasma",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_094.gif",
            "imgur": "https://i.imgur.com/3TZP8Ge.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_094.gif",
            "imgur": "https://i.imgur.com/5Y9vrzC.gif"
            }
        ]
        },
        {
        "name": "Onix",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_095.gif",
            "imgur": "https://i.imgur.com/PniOhLD.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_095.gif",
            "imgur": "https://i.imgur.com/ijt7kqY.gif"
            }
        ]
        },
        {
        "name": "Soporifik",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_096.gif",
            "imgur": "https://i.imgur.com/EpkXzZ4.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_096.gif",
            "imgur": "https://i.imgur.com/0NSiqX2.gif"
            }
        ]
        },
        {
        "name": "Hypnomade",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_097.gif",
            "imgur": "https://i.imgur.com/EWE9Rt2.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_097.gif",
            "imgur": "https://i.imgur.com/fJySe7N.gif"
            }
        ]
        },
        {
        "name": "Krabby",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_098.gif",
            "imgur": "https://i.imgur.com/S2ufZWU.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_098.gif",
            "imgur": "https://i.imgur.com/OgLhOu6.gif"
            }
        ]
        },
        {
        "name": "Krabboss",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_099.gif",
            "imgur": "https://i.imgur.com/D7sQEVg.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_099.gif",
            "imgur": "https://i.imgur.com/aT1hahK.gif"
            }
        ]
        },
        {
        "name": "Voltorbe",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_100.gif",
            "imgur": "https://i.imgur.com/yN7Prwn.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_100.gif",
            "imgur": "https://i.imgur.com/iBl1ynq.gif"
            }
        ]
        },
        {
        "name": "Électrode",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_101.gif",
            "imgur": "https://i.imgur.com/rWTaThx.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_101.gif",
            "imgur": "https://i.imgur.com/7G7DYDE.gif"
            }
        ]
        },
        {
        "name": "Noeunoeuf",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_102.gif",
            "imgur": "https://i.imgur.com/XQG2Nj4.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_102.gif",
            "imgur": "https://i.imgur.com/1IVSRzH.gif"
            }
        ]
        },
        {
        "name": "Noadkoko",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_103.gif",
            "imgur": "https://i.imgur.com/IMPbdDF.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_103.gif",
            "imgur": "https://i.imgur.com/AkDR4fA.gif"
            }
        ]
        },
        {
        "name": "Osselait",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_104.gif",
            "imgur": "https://i.imgur.com/8Zc3LVF.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_104.gif",
            "imgur": "https://i.imgur.com/cac0PXg.gif"
            }
        ]
        },
        {
        "name": "Ossatueur",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_105.gif",
            "imgur": "https://i.imgur.com/MU3fbej.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_105.gif",
            "imgur": "https://i.imgur.com/2kRwPXY.gif"
            }
        ]
        },
        {
        "name": "Kicklee",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_106.gif",
            "imgur": "https://i.imgur.com/iJ5SpWN.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_106.gif",
            "imgur": "https://i.imgur.com/19NpU9o.gif"
            }
        ]
        },
        {
        "name": "Tygnon",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_107.gif",
            "imgur": "https://i.imgur.com/UNGsHPe.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_107.gif",
            "imgur": "https://i.imgur.com/wx9MJmG.gif"
            }
        ]
        },
        {
        "name": "Excelangue",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_108.gif",
            "imgur": "https://i.imgur.com/0AOyqbR.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_108.gif",
            "imgur": "https://i.imgur.com/NBxaXsN.gif"
            }
        ]
        },
        {
        "name": "Smogo",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_109.gif",
            "imgur": "https://i.imgur.com/qVx4330.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_109.gif",
            "imgur": "https://i.imgur.com/OMvSV23.gif"
            }
        ]
        },
        {
        "name": "Smogogo",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_110.gif",
            "imgur": "https://i.imgur.com/4WdBYMY.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_110.gif",
            "imgur": "https://i.imgur.com/sTl2CG0.gif"
            }
        ]
        },
        {
        "name": "Rhinocorne",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_111.gif",
            "imgur": "https://i.imgur.com/uZgX1yI.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_111.gif",
            "imgur": "https://i.imgur.com/fzQKief.gif"
            }
        ]
        },
        {
        "name": "Rhinoféros",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_112.gif",
            "imgur": "https://i.imgur.com/7Vl6Kn7.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_112.gif",
            "imgur": "https://i.imgur.com/FfYoyea.gif"
            }
        ]
        },
        {
        "name": "Leveinard",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_113.gif",
            "imgur": "https://i.imgur.com/62g3d4z.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_113.gif",
            "imgur": "https://i.imgur.com/IbHm5TH.gif"
            }
        ]
        },
        {
        "name": "Saquedeneu",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_114.gif",
            "imgur": "https://i.imgur.com/MTP3Ijc.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_114.gif",
            "imgur": "https://i.imgur.com/ijrA3o7.gif"
            }
        ]
        },
        {
        "name": "Kangourex",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_115.gif",
            "imgur": "https://i.imgur.com/W9ae8f5.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_115.gif",
            "imgur": "https://i.imgur.com/lqbNK3y.gif"
            }
        ]
        },
        {
        "name": "Hypotrempe",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_116.gif",
            "imgur": "https://i.imgur.com/Wyy96Cf.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_116.gif",
            "imgur": "https://i.imgur.com/YXslFPT.gif"
            }
        ]
        },
        {
        "name": "Hypocéan",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_117.gif",
            "imgur": "https://i.imgur.com/iwVBYPZ.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_117.gif",
            "imgur": "https://i.imgur.com/eBmiBPN.gif"
            }
        ]
        },
        {
        "name": "Poissirène",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_118.gif",
            "imgur": "https://i.imgur.com/baWvTfs.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_118.gif",
            "imgur": "https://i.imgur.com/RNk3SNM.gif"
            }
        ]
        },
        {
        "name": "Poissoroy",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_119.gif",
            "imgur": "https://i.imgur.com/rH2vHBH.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_119.gif",
            "imgur": "https://i.imgur.com/c9CBT55.gif"
            }
        ]
        },
        {
        "name": "Stari",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_120.gif",
            "imgur": "https://i.imgur.com/1iC9afV.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_120.gif",
            "imgur": "https://i.imgur.com/I0kN0vm.gif"
            }
        ]
        },
        {
        "name": "Staross",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_121.gif",
            "imgur": "https://i.imgur.com/DbD6DN2.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_121.gif",
            "imgur": "https://i.imgur.com/Iok1uoT.gif"
            }
        ]
        },
        {
        "name": "M. Mime",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_122.gif",
            "imgur": "https://i.imgur.com/6CD1HIm.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_122.gif",
            "imgur": "https://i.imgur.com/ju2cLnv.gif"
            }
        ]
        },
        {
        "name": "Insécateur",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_123.gif",
            "imgur": "https://i.imgur.com/FPEYgOY.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_123.gif",
            "imgur": "https://i.imgur.com/xKIsUSG.gif"
            }
        ]
        },
        {
        "name": "Lippoutou",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_124.gif",
            "imgur": "https://i.imgur.com/UUn0efR.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_124.gif",
            "imgur": "https://i.imgur.com/3cm0RCe.gif"
            }
        ]
        },
        {
        "name": "Élektek",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_125.gif",
            "imgur": "https://i.imgur.com/pDbv4ta.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_125.gif",
            "imgur": "https://i.imgur.com/iqNrbi0.gif"
            }
        ]
        },
        {
        "name": "Magmar",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_126.gif",
            "imgur": "https://i.imgur.com/IRfFPXI.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_126.gif",
            "imgur": "https://i.imgur.com/jPWkpAf.gif"
            }
        ]
        },
        {
        "name": "Scarabrute",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_127.gif",
            "imgur": "https://i.imgur.com/TY0kHrP.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_127.gif",
            "imgur": "https://i.imgur.com/yZnfrX8.gif"
            }
        ]
        },
        {
        "name": "Tauros",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_128.gif",
            "imgur": "https://i.imgur.com/LaNj0nj.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_128.gif",
            "imgur": "https://i.imgur.com/zshAyNl.gif"
            }
        ]
        },
        {
        "name": "Magicarpe",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_129.gif",
            "imgur": "https://i.imgur.com/QjY5g6m.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_129.gif",
            "imgur": "https://i.imgur.com/wXPp5zZ.gif"
            }
        ]
        },
        {
        "name": "Léviator",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_130.gif",
            "imgur": "https://i.imgur.com/doj5wM8.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_130.gif",
            "imgur": "https://i.imgur.com/wggeZt9.gif"
            }
        ]
        },
        {
        "name": "Lokhlass",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_131.gif",
            "imgur": "https://i.imgur.com/2aK4Okl.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_131.gif",
            "imgur": "https://i.imgur.com/ftGun4Q.gif"
            }
        ]
        },
        {
        "name": "Métamorph",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_132.gif",
            "imgur": "https://i.imgur.com/Jxk7bnf.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_132.gif",
            "imgur": "https://i.imgur.com/pEwyiNZ.gif"
            }
        ]
        },
        {
        "name": "Évoli",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_133.gif",
            "imgur": "https://i.imgur.com/TM6D2Lj.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_133.gif",
            "imgur": "https://i.imgur.com/fKzR1Hb.gif"
            }
        ]
        },
        {
        "name": "Aquali",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_134.gif",
            "imgur": "https://i.imgur.com/tM5X7b1.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_134.gif",
            "imgur": "https://i.imgur.com/oQc2wou.gif"
            }
        ]
        },
        {
        "name": "Voltali",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_135.gif",
            "imgur": "https://i.imgur.com/u9JwUB5.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_135.gif",
            "imgur": "https://i.imgur.com/N5z75u3.gif"
            }
        ]
        },
        {
        "name": "Pyroli",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_136.gif",
            "imgur": "https://i.imgur.com/yF0N3zq.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_136.gif",
            "imgur": "https://i.imgur.com/02Ppuw3.gif"
            }
        ]
        },
        {
        "name": "Porygon",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_137.gif",
            "imgur": "https://i.imgur.com/Zyw7TJX.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_137.gif",
            "imgur": "https://i.imgur.com/j2nmJLj.gif"
            }
        ]
        },
        {
        "name": "Amonita",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_138.gif",
            "imgur": "https://i.imgur.com/nZLWLhW.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_138.gif",
            "imgur": "https://i.imgur.com/xtS6H1f.gif"
            }
        ]
        },
        {
        "name": "Amonistar",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_139.gif",
            "imgur": "https://i.imgur.com/KRvdbxD.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_139.gif",
            "imgur": "https://i.imgur.com/Gt5AZce.gif"
            }
        ]
        },
        {
        "name": "Kabuto",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_140.gif",
            "imgur": "https://i.imgur.com/dIKORNx.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_140.gif",
            "imgur": "https://i.imgur.com/u0k4MUU.gif"
            }
        ]
        },
        {
        "name": "Kabutops",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_141.gif",
            "imgur": "https://i.imgur.com/6wyFYuq.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_141.gif",
            "imgur": "https://i.imgur.com/F1b1CjV.gif"
            }
        ]
        },
        {
        "name": "Ptéra",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_142.gif",
            "imgur": "https://i.imgur.com/qmTXMs0.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_142.gif",
            "imgur": "https://i.imgur.com/4DCA7DP.gif"
            }
        ]
        },
        {
        "name": "Ronflex",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_143.gif",
            "imgur": "https://i.imgur.com/T4WvSOe.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_143.gif",
            "imgur": "https://i.imgur.com/5B2SLNh.gif"
            }
        ]
        },
        {
        "name": "Artikodin",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_144.gif",
            "imgur": "https://i.imgur.com/QGoviI9.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_144.gif",
            "imgur": "https://i.imgur.com/fD7p3Z0.gif"
            }
        ]
        },
        {
        "name": "Électhor",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_145.gif",
            "imgur": "https://i.imgur.com/D0nnJSU.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_145.gif",
            "imgur": "https://i.imgur.com/ld23z2P.gif"
            }
        ]
        },
        {
        "name": "Sulfura",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_146.gif",
            "imgur": "https://i.imgur.com/p9CapTY.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_146.gif",
            "imgur": "https://i.imgur.com/jI2NhIW.gif"
            }
        ]
        },
        {
        "name": "Minidraco",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_147.gif",
            "imgur": "https://i.imgur.com/PW4OCMC.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_147.gif",
            "imgur": "https://i.imgur.com/tE3UYcu.gif"
            }
        ]
        },
        {
        "name": "Draco",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_148.gif",
            "imgur": "https://i.imgur.com/E3Hi1SN.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_148.gif",
            "imgur": "https://i.imgur.com/qFsnWKu.gif"
            }
        ]
        },
        {
        "name": "Dracolosse",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_149.gif",
            "imgur": "https://i.imgur.com/VpCnVDF.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_149.gif",
            "imgur": "https://i.imgur.com/U2znULX.gif"
            }
        ]
        },
        {
        "name": "Mewtwo",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_150.gif",
            "imgur": "https://i.imgur.com/YxxVA7X.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_150.gif",
            "imgur": "https://i.imgur.com/1HtM30N.gif"
            }
        ]
        },
        {
        "name": "Mew",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_151.gif",
            "imgur": "https://i.imgur.com/hSQpv9I.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_151.gif",
            "imgur": "https://i.imgur.com/HR43Dp5.gif"
            }
        ]
        },
        {
        "name": "Germignon",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_152.gif",
            "imgur": "https://i.imgur.com/S6ima17.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_152.gif",
            "imgur": "https://i.imgur.com/CKyxj3o.gif"
            }
        ]
        },
        {
        "name": "Macronium",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_153.gif",
            "imgur": "https://i.imgur.com/bufVRjs.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_153.gif",
            "imgur": "https://i.imgur.com/VkZYCm8.gif"
            }
        ]
        },
        {
        "name": "Méganium",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_154.gif",
            "imgur": "https://i.imgur.com/Nig7OLP.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_154.gif",
            "imgur": "https://i.imgur.com/36X8U5x.gif"
            }
        ]
        },
        {
        "name": "Héricendre",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_155.gif",
            "imgur": "https://i.imgur.com/rHxYrAq.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_155.gif",
            "imgur": "https://i.imgur.com/83aZEsO.gif"
            }
        ]
        },
        {
        "name": "Feurisson",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_156.gif",
            "imgur": "https://i.imgur.com/CEVFLs8.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_156.gif",
            "imgur": "https://i.imgur.com/0kvDVYp.gif"
            }
        ]
        },
        {
        "name": "Typhlosion",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_157.gif",
            "imgur": "https://i.imgur.com/FwM5dqX.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_157.gif",
            "imgur": "https://i.imgur.com/JQ9fqNH.gif"
            }
        ]
        },
        {
        "name": "Kaiminus",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_158.gif",
            "imgur": "https://i.imgur.com/xcM1V4X.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_158.gif",
            "imgur": "https://i.imgur.com/kM24DY7.gif"
            }
        ]
        },
        {
        "name": "Crocrodil",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_159.gif",
            "imgur": "https://i.imgur.com/Ov3hH39.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_159.gif",
            "imgur": "https://i.imgur.com/3pFhkHR.gif"
            }
        ]
        },
        {
        "name": "Aligatueur",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_160.gif",
            "imgur": "https://i.imgur.com/Qja7XhJ.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_160.gif",
            "imgur": "https://i.imgur.com/wQX4hwh.gif"
            }
        ]
        },
        {
        "name": "Fouinette",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_161.gif",
            "imgur": "https://i.imgur.com/xbHUvLo.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_161.gif",
            "imgur": "https://i.imgur.com/bmIyx13.gif"
            }
        ]
        },
        {
        "name": "Fouinar",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_162.gif",
            "imgur": "https://i.imgur.com/tdDvgAR.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_162.gif",
            "imgur": "https://i.imgur.com/GUvwv7f.gif"
            }
        ]
        },
        {
        "name": "Hoothoot",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_163.gif",
            "imgur": "https://i.imgur.com/mcsQurg.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_163.gif",
            "imgur": "https://i.imgur.com/O46l6Hp.gif"
            }
        ]
        },
        {
        "name": "Noarfang",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_164.gif",
            "imgur": "https://i.imgur.com/1f3DkcZ.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_164.gif",
            "imgur": "https://i.imgur.com/zYDi9Rj.gif"
            }
        ]
        },
        {
        "name": "Coxy",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_165.gif",
            "imgur": "https://i.imgur.com/IluKJ35.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_165.gif",
            "imgur": "https://i.imgur.com/BWpZdE9.gif"
            }
        ]
        },
        {
        "name": "Coxyclaque",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_166.gif",
            "imgur": "https://i.imgur.com/kCPZcOI.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_166.gif",
            "imgur": "https://i.imgur.com/GlJ5lZa.gif"
            }
        ]
        },
        {
        "name": "Mimigal",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_167.gif",
            "imgur": "https://i.imgur.com/8vbP6WC.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_167.gif",
            "imgur": "https://i.imgur.com/lCVYME4.gif"
            }
        ]
        },
        {
        "name": "Migalos",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_168.gif",
            "imgur": "https://i.imgur.com/TS0RE6y.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_168.gif",
            "imgur": "https://i.imgur.com/6xSfO6y.gif"
            }
        ]
        },
        {
        "name": "Nostenfer",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_169.gif",
            "imgur": "https://i.imgur.com/30pvdQx.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_169.gif",
            "imgur": "https://i.imgur.com/MukcZva.gif"
            }
        ]
        },
        {
        "name": "Loupio",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_170.gif",
            "imgur": "https://i.imgur.com/twG6eRG.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_170.gif",
            "imgur": "https://i.imgur.com/Ne6KtaG.gif"
            }
        ]
        },
        {
        "name": "Lanturn",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_171.gif",
            "imgur": "https://i.imgur.com/ZPiYJub.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_171.gif",
            "imgur": "https://i.imgur.com/xbfvEJE.gif"
            }
        ]
        },
        {
        "name": "Pichu",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_172.gif",
            "imgur": "https://i.imgur.com/SkYdHiA.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_172.gif",
            "imgur": "https://i.imgur.com/Ifposmw.gif"
            }
        ]
        },
        {
        "name": "Mélo",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_173.gif",
            "imgur": "https://i.imgur.com/BYbhbBI.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_173.gif",
            "imgur": "https://i.imgur.com/i35auM7.gif"
            }
        ]
        },
        {
        "name": "Toudoudou",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_174.gif",
            "imgur": "https://i.imgur.com/j0SkADG.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_174.gif",
            "imgur": "https://i.imgur.com/8OU3cLf.gif"
            }
        ]
        },
        {
        "name": "Togepi",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_175.gif",
            "imgur": "https://i.imgur.com/9A7suPB.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_175.gif",
            "imgur": "https://i.imgur.com/tILSNVH.gif"
            }
        ]
        },
        {
        "name": "Togetic",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_176.gif",
            "imgur": "https://i.imgur.com/D39cNMY.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_176.gif",
            "imgur": "https://i.imgur.com/Za5SjsX.gif"
            }
        ]
        },
        {
        "name": "Natu",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_177.gif",
            "imgur": "https://i.imgur.com/qlbBi2g.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_177.gif",
            "imgur": "https://i.imgur.com/BKjdGkw.gif"
            }
        ]
        },
        {
        "name": "Xatu",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_178.gif",
            "imgur": "https://i.imgur.com/Cx4pvpk.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_178.gif",
            "imgur": "https://i.imgur.com/u41z9vX.gif"
            }
        ]
        },
        {
        "name": "Wattouat",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_179.gif",
            "imgur": "https://i.imgur.com/fbNgGh1.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_179.gif",
            "imgur": "https://i.imgur.com/LoNrqVP.gif"
            }
        ]
        },
        {
        "name": "Lainergie",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_180.gif",
            "imgur": "https://i.imgur.com/q6VrJEv.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_180.gif",
            "imgur": "https://i.imgur.com/jWo3Hcd.gif"
            }
        ]
        },
        {
        "name": "Pharamp",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_181.gif",
            "imgur": "https://i.imgur.com/fxr0sdl.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_181.gif",
            "imgur": "https://i.imgur.com/0CPEnKW.gif"
            }
        ]
        },
        {
        "name": "Joliflor",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_182.gif",
            "imgur": "https://i.imgur.com/988Oq9E.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_182.gif",
            "imgur": "https://i.imgur.com/hVnP2iP.gif"
            }
        ]
        },
        {
        "name": "Marill",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_183.gif",
            "imgur": "https://i.imgur.com/1ijRe7n.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_183.gif",
            "imgur": "https://i.imgur.com/4H3tiYx.gif"
            }
        ]
        },
        {
        "name": "Azumarill",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_184.gif",
            "imgur": "https://i.imgur.com/Y4d9DuS.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_184.gif",
            "imgur": "https://i.imgur.com/818EPF8.gif"
            }
        ]
        },
        {
        "name": "Simularbre",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_185.gif",
            "imgur": "https://i.imgur.com/vvkkECu.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_185.gif",
            "imgur": "https://i.imgur.com/ZTYAic4.gif"
            }
        ]
        },
        {
        "name": "Tarpaud",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_186.gif",
            "imgur": "https://i.imgur.com/e09SIvc.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_186.gif",
            "imgur": "https://i.imgur.com/y3zL2Zr.gif"
            }
        ]
        },
        {
        "name": "Granivol",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_187.gif",
            "imgur": "https://i.imgur.com/2u7ioLC.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_187.gif",
            "imgur": "https://i.imgur.com/fW1mH7m.gif"
            }
        ]
        },
        {
        "name": "Floravol",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_188.gif",
            "imgur": "https://i.imgur.com/4BRt2Wp.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_188.gif",
            "imgur": "https://i.imgur.com/n2sd3fv.gif"
            }
        ]
        },
        {
        "name": "Cotovol",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_189.gif",
            "imgur": "https://i.imgur.com/ZjtuJHR.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_189.gif",
            "imgur": "https://i.imgur.com/qmLprVG.gif"
            }
        ]
        },
        {
        "name": "Capumain",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_190.gif",
            "imgur": "https://i.imgur.com/twLlBRt.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_190.gif",
            "imgur": "https://i.imgur.com/1PHqVBX.gif"
            }
        ]
        },
        {
        "name": "Tournegrin",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_191.gif",
            "imgur": "https://i.imgur.com/KZPCd7F.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_191.gif",
            "imgur": "https://i.imgur.com/fX6ZWDR.gif"
            }
        ]
        },
        {
        "name": "Héliatronc",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_192.gif",
            "imgur": "https://i.imgur.com/S539wj7.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_192.gif",
            "imgur": "https://i.imgur.com/FHQXaad.gif"
            }
        ]
        },
        {
        "name": "Yanma",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_193.gif",
            "imgur": "https://i.imgur.com/kdMRU4x.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_193.gif",
            "imgur": "https://i.imgur.com/cSJ6k1s.gif"
            }
        ]
        },
        {
        "name": "Axoloto",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_194.gif",
            "imgur": "https://i.imgur.com/DvH1lfj.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_194.gif",
            "imgur": "https://i.imgur.com/Awwr82y.gif"
            }
        ]
        },
        {
        "name": "Maraiste",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_195.gif",
            "imgur": "https://i.imgur.com/qspwsDB.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_195.gif",
            "imgur": "https://i.imgur.com/SF5oj1x.gif"
            }
        ]
        },
        {
        "name": "Mentali",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_196.gif",
            "imgur": "https://i.imgur.com/GjUONTo.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_196.gif",
            "imgur": "https://i.imgur.com/YLrh0aN.gif"
            }
        ]
        },
        {
        "name": "Noctali",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_197.gif",
            "imgur": "https://i.imgur.com/YQ2fzFp.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_197.gif",
            "imgur": "https://i.imgur.com/nFUlqTu.gif"
            }
        ]
        },
        {
        "name": "Cornèbre",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_198.gif",
            "imgur": "https://i.imgur.com/ftl8oCl.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_198.gif",
            "imgur": "https://i.imgur.com/gSQOfQn.gif"
            }
        ]
        },
        {
        "name": "Roigada",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_199.gif",
            "imgur": "https://i.imgur.com/0Upat2L.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_199.gif",
            "imgur": "https://i.imgur.com/Sg7CP1I.gif"
            }
        ]
        },
        {
        "name": "Feuforêve",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_200.gif",
            "imgur": "https://i.imgur.com/fwfuVgt.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_200.gif",
            "imgur": "https://i.imgur.com/9HTtZpW.gif"
            }
        ]
        },
        {
        "name": "Zarbi",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201--exclamation.gif",
            "imgur": "https://i.imgur.com/pLmMlHP.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201--question.gif",
            "imgur": "https://i.imgur.com/rdOvegD.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-a.gif",
            "imgur": "https://i.imgur.com/NFHqQv0.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-b.gif",
            "imgur": "https://i.imgur.com/XgjmcoN.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-c.gif",
            "imgur": "https://i.imgur.com/DuSWtQU.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-d.gif",
            "imgur": "https://i.imgur.com/qfalm5p.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-e.gif",
            "imgur": "https://i.imgur.com/5QyzQZ8.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-f.gif",
            "imgur": "https://i.imgur.com/84cpzeF.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-g.gif",
            "imgur": "https://i.imgur.com/N8z3xQm.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-h.gif",
            "imgur": "https://i.imgur.com/3EFPqY7.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-i.gif",
            "imgur": "https://i.imgur.com/umcEA04.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-j.gif",
            "imgur": "https://i.imgur.com/JvxNY8t.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-k.gif",
            "imgur": "https://i.imgur.com/CoAZVkm.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-l.gif",
            "imgur": "https://i.imgur.com/9S0xTP6.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-m.gif",
            "imgur": "https://i.imgur.com/r8vraEh.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-n.gif",
            "imgur": "https://i.imgur.com/7fMjtLc.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-o.gif",
            "imgur": "https://i.imgur.com/FPBtuuY.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-p.gif",
            "imgur": "https://i.imgur.com/iUA6L8B.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-q.gif",
            "imgur": "https://i.imgur.com/JfvvD95.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-r.gif",
            "imgur": "https://i.imgur.com/DjYqezW.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-s.gif",
            "imgur": "https://i.imgur.com/tKKyUxW.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-t.gif",
            "imgur": "https://i.imgur.com/K73MU8e.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-u.gif",
            "imgur": "https://i.imgur.com/uEyolbD.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-v.gif",
            "imgur": "https://i.imgur.com/euTXzRS.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-w.gif",
            "imgur": "https://i.imgur.com/3ok1xiU.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-x.gif",
            "imgur": "https://i.imgur.com/X2KZ3E8.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-y.gif",
            "imgur": "https://i.imgur.com/wsGiapT.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_201-z.gif",
            "imgur": "https://i.imgur.com/mMPSSxA.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201--exclamation.gif",
            "imgur": "https://i.imgur.com/lwP5tbV.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201--question.gif",
            "imgur": "https://i.imgur.com/IrgkUPQ.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-a.gif",
            "imgur": "https://i.imgur.com/8NVPLu0.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-b.gif",
            "imgur": "https://i.imgur.com/xdYFWhF.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-c.gif",
            "imgur": "https://i.imgur.com/yoS3FlR.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-d.gif",
            "imgur": "https://i.imgur.com/mEbYh1o.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-e.gif",
            "imgur": "https://i.imgur.com/bcGqwEf.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-f.gif",
            "imgur": "https://i.imgur.com/QDyizmZ.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-g.gif",
            "imgur": "https://i.imgur.com/J3cQo8V.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-h.gif",
            "imgur": "https://i.imgur.com/LDLep0Z.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-i.gif",
            "imgur": "https://i.imgur.com/Z2dUQ6M.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-j.gif",
            "imgur": "https://i.imgur.com/v9SDxos.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-k.gif",
            "imgur": "https://i.imgur.com/L9OGZGy.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-l.gif",
            "imgur": "https://i.imgur.com/Qht27Jz.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-m.gif",
            "imgur": "https://i.imgur.com/71183sd.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-n.gif",
            "imgur": "https://i.imgur.com/Jsy3CuM.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-o.gif",
            "imgur": "https://i.imgur.com/jhiUSNq.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-p.gif",
            "imgur": "https://i.imgur.com/v8hEG3r.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-q.gif",
            "imgur": "https://i.imgur.com/UgEZbU8.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-r.gif",
            "imgur": "https://i.imgur.com/H8PPJt5.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-s.gif",
            "imgur": "https://i.imgur.com/AZkOQAE.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-t.gif",
            "imgur": "https://i.imgur.com/UPpWMqr.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-u.gif",
            "imgur": "https://i.imgur.com/0LZaYeM.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-v.gif",
            "imgur": "https://i.imgur.com/tmu2eyj.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-w.gif",
            "imgur": "https://i.imgur.com/N0IFEKi.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-x.gif",
            "imgur": "https://i.imgur.com/4zy9Lgd.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-y.gif",
            "imgur": "https://i.imgur.com/A0U5wWQ.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_201-z.gif",
            "imgur": "https://i.imgur.com/DKptXOy.gif"
            }
        ]
        },
        {
        "name": "Qulbutoké",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_202.gif",
            "imgur": "https://i.imgur.com/o5f5ZnU.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_202.gif",
            "imgur": "https://i.imgur.com/kugp50R.gif"
            }
        ]
        },
        {
        "name": "Girafarig",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_203.gif",
            "imgur": "https://i.imgur.com/dIEXcW4.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_203.gif",
            "imgur": "https://i.imgur.com/0ITwyEz.gif"
            }
        ]
        },
        {
        "name": "Pomdepik",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_204.gif",
            "imgur": "https://i.imgur.com/GdUr33R.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_204.gif",
            "imgur": "https://i.imgur.com/LNkpBJi.gif"
            }
        ]
        },
        {
        "name": "Foretress",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_205.gif",
            "imgur": "https://i.imgur.com/vdtK0DK.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_205.gif",
            "imgur": "https://i.imgur.com/9ZHs1C3.gif"
            }
        ]
        },
        {
        "name": "Insolourdo",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_206.gif",
            "imgur": "https://i.imgur.com/fchBWQk.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_206.gif",
            "imgur": "https://i.imgur.com/ZaPbYi4.gif"
            }
        ]
        },
        {
        "name": "Scorplane",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_207.gif",
            "imgur": "https://i.imgur.com/wBZDWfO.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_207.gif",
            "imgur": "https://i.imgur.com/Rw38HbN.gif"
            }
        ]
        },
        {
        "name": "Steelix",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_208.gif",
            "imgur": "https://i.imgur.com/DLtOo2W.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_208.gif",
            "imgur": "https://i.imgur.com/TRE0VpG.gif"
            }
        ]
        },
        {
        "name": "Snubbull",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_209.gif",
            "imgur": "https://i.imgur.com/8vXebVK.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_209.gif",
            "imgur": "https://i.imgur.com/RUjBE0L.gif"
            }
        ]
        },
        {
        "name": "Granbull",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_210.gif",
            "imgur": "https://i.imgur.com/ugH3Kxm.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_210.gif",
            "imgur": "https://i.imgur.com/bYG65j4.gif"
            }
        ]
        },
        {
        "name": "Qwilfish",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_211.gif",
            "imgur": "https://i.imgur.com/6QPHcAo.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_211.gif",
            "imgur": "https://i.imgur.com/BcGr64z.gif"
            }
        ]
        },
        {
        "name": "Cizayox",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_212.gif",
            "imgur": "https://i.imgur.com/7G44DsY.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_212.gif",
            "imgur": "https://i.imgur.com/Silbj9l.gif"
            }
        ]
        },
        {
        "name": "Caratroc",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_213.gif",
            "imgur": "https://i.imgur.com/7RHi6Cl.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_213.gif",
            "imgur": "https://i.imgur.com/nC9hpEw.gif"
            }
        ]
        },
        {
        "name": "Scarhino",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_214.gif",
            "imgur": "https://i.imgur.com/TAag30F.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_214.gif",
            "imgur": "https://i.imgur.com/37na7j0.gif"
            }
        ]
        },
        {
        "name": "Farfuret",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_215.gif",
            "imgur": "https://i.imgur.com/c3Jo0Yu.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_215.gif",
            "imgur": "https://i.imgur.com/8kZoniE.gif"
            }
        ]
        },
        {
        "name": "Teddiursa",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_216.gif",
            "imgur": "https://i.imgur.com/TvYX288.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_216.gif",
            "imgur": "https://i.imgur.com/j85htN9.gif"
            }
        ]
        },
        {
        "name": "Ursaring",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_217.gif",
            "imgur": "https://i.imgur.com/S90b3mM.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_217.gif",
            "imgur": "https://i.imgur.com/UcHXBqg.gif"
            }
        ]
        },
        {
        "name": "Limagma",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_218.gif",
            "imgur": "https://i.imgur.com/7tq6UkD.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_218.gif",
            "imgur": "https://i.imgur.com/Fp6X2kQ.gif"
            }
        ]
        },
        {
        "name": "Volcaropod",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_219.gif",
            "imgur": "https://i.imgur.com/FWhvan2.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_219.gif",
            "imgur": "https://i.imgur.com/uuwgoBd.gif"
            }
        ]
        },
        {
        "name": "Marcacrin",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_220.gif",
            "imgur": "https://i.imgur.com/U21CMHv.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_220.gif",
            "imgur": "https://i.imgur.com/kby9kPb.gif"
            }
        ]
        },
        {
        "name": "Cochignon",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_221.gif",
            "imgur": "https://i.imgur.com/HvV1gYh.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_221.gif",
            "imgur": "https://i.imgur.com/YI645d3.gif"
            }
        ]
        },
        {
        "name": "Corayon",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_222.gif",
            "imgur": "https://i.imgur.com/jmtt1H6.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_222.gif",
            "imgur": "https://i.imgur.com/stRSpSD.gif"
            }
        ]
        },
        {
        "name": "Rémoraid",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_223.gif",
            "imgur": "https://i.imgur.com/ZgylhGf.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_223.gif",
            "imgur": "https://i.imgur.com/FzO3xVw.gif"
            }
        ]
        },
        {
        "name": "Octillery",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_224.gif",
            "imgur": "https://i.imgur.com/PMxZaa5.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_224.gif",
            "imgur": "https://i.imgur.com/Xr6O3bU.gif"
            }
        ]
        },
        {
        "name": "Cadoizo",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_225.gif",
            "imgur": "https://i.imgur.com/kEc6Cbe.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_225.gif",
            "imgur": "https://i.imgur.com/Lalx4bZ.gif"
            }
        ]
        },
        {
        "name": "Démanta",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_226.gif",
            "imgur": "https://i.imgur.com/IKR9PlK.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_226.gif",
            "imgur": "https://i.imgur.com/Mwa29J6.gif"
            }
        ]
        },
        {
        "name": "Airmure",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_227.gif",
            "imgur": "https://i.imgur.com/EsXWvZ7.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_227.gif",
            "imgur": "https://i.imgur.com/eeRvI8f.gif"
            }
        ]
        },
        {
        "name": "Malosse",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_228.gif",
            "imgur": "https://i.imgur.com/DeJ1xVX.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_228.gif",
            "imgur": "https://i.imgur.com/8QBV7ZM.gif"
            }
        ]
        },
        {
        "name": "Démolosse",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_229.gif",
            "imgur": "https://i.imgur.com/ZTV5oBP.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_229.gif",
            "imgur": "https://i.imgur.com/VnDBsnU.gif"
            }
        ]
        },
        {
        "name": "Hyporoi",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_230.gif",
            "imgur": "https://i.imgur.com/y60CNE0.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_230.gif",
            "imgur": "https://i.imgur.com/0u32WTs.gif"
            }
        ]
        },
        {
        "name": "Phanpy",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_231.gif",
            "imgur": "https://i.imgur.com/zMK7SB4.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_231.gif",
            "imgur": "https://i.imgur.com/jHVWXUP.gif"
            }
        ]
        },
        {
        "name": "Donphan",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_232.gif",
            "imgur": "https://i.imgur.com/oNAajy4.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_232.gif",
            "imgur": "https://i.imgur.com/vrT7fDv.gif"
            }
        ]
        },
        {
        "name": "Porygon2",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_233.gif",
            "imgur": "https://i.imgur.com/4yuh0AE.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_233.gif",
            "imgur": "https://i.imgur.com/vjfm70p.gif"
            }
        ]
        },
        {
        "name": "Cerfrousse",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_234.gif",
            "imgur": "https://i.imgur.com/t3jyFYs.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_234.gif",
            "imgur": "https://i.imgur.com/uNRtmL6.gif"
            }
        ]
        },
        {
        "name": "Queulorior",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_235.gif",
            "imgur": "https://i.imgur.com/UsXDO81.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_235.gif",
            "imgur": "https://i.imgur.com/DEvWB6K.gif"
            }
        ]
        },
        {
        "name": "Debugant",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_236.gif",
            "imgur": "https://i.imgur.com/Uou2m7m.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_236.gif",
            "imgur": "https://i.imgur.com/fgpuLxO.gif"
            }
        ]
        },
        {
        "name": "Kapoera",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_237.gif",
            "imgur": "https://i.imgur.com/Ez11xvd.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_237.gif",
            "imgur": "https://i.imgur.com/Y6yEjGf.gif"
            }
        ]
        },
        {
        "name": "Lippouti",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_238.gif",
            "imgur": "https://i.imgur.com/s9QJu32.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_238.gif",
            "imgur": "https://i.imgur.com/OevN6ke.gif"
            }
        ]
        },
        {
        "name": "Élekid",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_239.gif",
            "imgur": "https://i.imgur.com/12VMZNU.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_239.gif",
            "imgur": "https://i.imgur.com/4XflxrZ.gif"
            }
        ]
        },
        {
        "name": "Magby",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_240.gif",
            "imgur": "https://i.imgur.com/uSi30Qi.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_240.gif",
            "imgur": "https://i.imgur.com/iy86CMu.gif"
            }
        ]
        },
        {
        "name": "Écrémeuh",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_241.gif",
            "imgur": "https://i.imgur.com/05bMPdM.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_241.gif",
            "imgur": "https://i.imgur.com/jrA0Oll.gif"
            }
        ]
        },
        {
        "name": "Leuphorie",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_242.gif",
            "imgur": "https://i.imgur.com/UqWj0rs.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_242.gif",
            "imgur": "https://i.imgur.com/WzG0QfH.gif"
            }
        ]
        },
        {
        "name": "Raikou",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_243.gif",
            "imgur": "https://i.imgur.com/2kMrVMY.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_243.gif",
            "imgur": "https://i.imgur.com/BdCPCsv.gif"
            }
        ]
        },
        {
        "name": "Entei",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_244.gif",
            "imgur": "https://i.imgur.com/BDJu2lJ.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_244.gif",
            "imgur": "https://i.imgur.com/x0dQXPU.gif"
            }
        ]
        },
        {
        "name": "Suicune",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_245.gif",
            "imgur": "https://i.imgur.com/rmmEr9r.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_245.gif",
            "imgur": "https://i.imgur.com/zxiT6RZ.gif"
            }
        ]
        },
        {
        "name": "Embrylex",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_246.gif",
            "imgur": "https://i.imgur.com/WiTaF90.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_246.gif",
            "imgur": "https://i.imgur.com/MddkNGh.gif"
            }
        ]
        },
        {
        "name": "Ymphect",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_247.gif",
            "imgur": "https://i.imgur.com/rin9LJt.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_247.gif",
            "imgur": "https://i.imgur.com/wvCzSOp.gif"
            }
        ]
        },
        {
        "name": "Tyranocif",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_248.gif",
            "imgur": "https://i.imgur.com/OEzfjDg.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_248.gif",
            "imgur": "https://i.imgur.com/90HguyK.gif"
            }
        ]
        },
        {
        "name": "Lugia",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_249.gif",
            "imgur": "https://i.imgur.com/do2cE8a.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_249.gif",
            "imgur": "https://i.imgur.com/XGBv5zg.gif"
            }
        ]
        },
        {
        "name": "Ho-Oh",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_250.gif",
            "imgur": "https://i.imgur.com/PBDuCMw.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_250.gif",
            "imgur": "https://i.imgur.com/2mEh8aq.gif"
            }
        ]
        },
        {
        "name": "Celebi",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_251.gif",
            "imgur": "https://i.imgur.com/M7Zza5J.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_251.gif",
            "imgur": "https://i.imgur.com/jNAs72F.gif"
            }
        ]
        },
        {
        "name": "Arcko",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_252.gif",
            "imgur": "https://i.imgur.com/KR3Esk4.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_252.gif",
            "imgur": "https://i.imgur.com/hzOmZH5.gif"
            }
        ]
        },
        {
        "name": "Massko",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_253.gif",
            "imgur": "https://i.imgur.com/ZCSc0oL.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_253.gif",
            "imgur": "https://i.imgur.com/FmlK2Bd.gif"
            }
        ]
        },
        {
        "name": "Jungko",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_254.gif",
            "imgur": "https://i.imgur.com/JBpcLl6.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_254.gif",
            "imgur": "https://i.imgur.com/Cr1avta.gif"
            }
        ]
        },
        {
        "name": "Poussifeu",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_255.gif",
            "imgur": "https://i.imgur.com/3oylqi6.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_255.gif",
            "imgur": "https://i.imgur.com/mQ4DNC4.gif"
            }
        ]
        },
        {
        "name": "Galifeu",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_256.gif",
            "imgur": "https://i.imgur.com/pnClBOE.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_256.gif",
            "imgur": "https://i.imgur.com/k4Wnsmd.gif"
            }
        ]
        },
        {
        "name": "Braségali",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_257.gif",
            "imgur": "https://i.imgur.com/8wZNXXa.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_257.gif",
            "imgur": "https://i.imgur.com/xCuZTJs.gif"
            }
        ]
        },
        {
        "name": "Gobou",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_258.gif",
            "imgur": "https://i.imgur.com/3ax2ZPt.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_258.gif",
            "imgur": "https://i.imgur.com/btCvUlB.gif"
            }
        ]
        },
        {
        "name": "Flobio",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_259.gif",
            "imgur": "https://i.imgur.com/g6HbA8U.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_259.gif",
            "imgur": "https://i.imgur.com/tDY9VIZ.gif"
            }
        ]
        },
        {
        "name": "Laggron",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_260.gif",
            "imgur": "https://i.imgur.com/pgElsAk.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_260.gif",
            "imgur": "https://i.imgur.com/51r01x6.gif"
            }
        ]
        },
        {
        "name": "Medhyèna",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_261.gif",
            "imgur": "https://i.imgur.com/N5CMdw1.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_261.gif",
            "imgur": "https://i.imgur.com/SdqQlw4.gif"
            }
        ]
        },
        {
        "name": "Grahyèna",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_262.gif",
            "imgur": "https://i.imgur.com/kt0LsJI.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_262.gif",
            "imgur": "https://i.imgur.com/cnblsLO.gif"
            }
        ]
        },
        {
        "name": "Zigzaton",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_263.gif",
            "imgur": "https://i.imgur.com/OGmbB2S.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_263.gif",
            "imgur": "https://i.imgur.com/m95XyRY.gif"
            }
        ]
        },
        {
        "name": "Linéon",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_264.gif",
            "imgur": "https://i.imgur.com/HCuQbbd.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_264.gif",
            "imgur": "https://i.imgur.com/OHKGRZJ.gif"
            }
        ]
        },
        {
        "name": "Chenipotte",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_265.gif",
            "imgur": "https://i.imgur.com/UR5PZWM.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_265.gif",
            "imgur": "https://i.imgur.com/EOJvg6K.gif"
            }
        ]
        },
        {
        "name": "Armulys",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_266.gif",
            "imgur": "https://i.imgur.com/rp4YQVw.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_266.gif",
            "imgur": "https://i.imgur.com/nyt5fBP.gif"
            }
        ]
        },
        {
        "name": "Charmillon",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_267.gif",
            "imgur": "https://i.imgur.com/XIOwlir.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_267.gif",
            "imgur": "https://i.imgur.com/Lnm67BP.gif"
            }
        ]
        },
        {
        "name": "Blindalys",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_268.gif",
            "imgur": "https://i.imgur.com/jDHifA5.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_268.gif",
            "imgur": "https://i.imgur.com/LPH9feK.gif"
            }
        ]
        },
        {
        "name": "Papinox",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_269.gif",
            "imgur": "https://i.imgur.com/K8gP88w.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_269.gif",
            "imgur": "https://i.imgur.com/kJce7yL.gif"
            }
        ]
        },
        {
        "name": "Nénupiot",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_270.gif",
            "imgur": "https://i.imgur.com/d0qMuk6.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_270.gif",
            "imgur": "https://i.imgur.com/McaH7du.gif"
            }
        ]
        },
        {
        "name": "Lombre",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_271.gif",
            "imgur": "https://i.imgur.com/EHIgWIa.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_271.gif",
            "imgur": "https://i.imgur.com/zKf5wYM.gif"
            }
        ]
        },
        {
        "name": "Ludicolo",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_272.gif",
            "imgur": "https://i.imgur.com/MQPUFr3.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_272.gif",
            "imgur": "https://i.imgur.com/091sNMI.gif"
            }
        ]
        },
        {
        "name": "Grainipiot",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_273.gif",
            "imgur": "https://i.imgur.com/v6iCcjI.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_273.gif",
            "imgur": "https://i.imgur.com/qVbhLN7.gif"
            }
        ]
        },
        {
        "name": "Pifeuil",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_274.gif",
            "imgur": "https://i.imgur.com/jskrW9G.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_274.gif",
            "imgur": "https://i.imgur.com/H0bEp9T.gif"
            }
        ]
        },
        {
        "name": "Tengalice",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_275.gif",
            "imgur": "https://i.imgur.com/4sXEULk.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_275.gif",
            "imgur": "https://i.imgur.com/shMGBfB.gif"
            }
        ]
        },
        {
        "name": "Nirondelle",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_276.gif",
            "imgur": "https://i.imgur.com/8MbotVe.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_276.gif",
            "imgur": "https://i.imgur.com/DnjTwLA.gif"
            }
        ]
        },
        {
        "name": "Hélédelle",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_277.gif",
            "imgur": "https://i.imgur.com/dOvxUc5.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_277.gif",
            "imgur": "https://i.imgur.com/YM018uq.gif"
            }
        ]
        },
        {
        "name": "Goélise",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_278.gif",
            "imgur": "https://i.imgur.com/b8ekNYc.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_278.gif",
            "imgur": "https://i.imgur.com/7WNbd4z.gif"
            }
        ]
        },
        {
        "name": "Bekipan",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_279.gif",
            "imgur": "https://i.imgur.com/2NbbLyG.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_279.gif",
            "imgur": "https://i.imgur.com/BTSsRX0.gif"
            }
        ]
        },
        {
        "name": "Tarsal",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_280.gif",
            "imgur": "https://i.imgur.com/n8a0w8A.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_280.gif",
            "imgur": "https://i.imgur.com/o8Ohvb3.gif"
            }
        ]
        },
        {
        "name": "Kirlia",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_281.gif",
            "imgur": "https://i.imgur.com/Gp5Xc0E.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_281.gif",
            "imgur": "https://i.imgur.com/HN96XK8.gif"
            }
        ]
        },
        {
        "name": "Gardevoir",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_282.gif",
            "imgur": "https://i.imgur.com/6sIZaru.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_282.gif",
            "imgur": "https://i.imgur.com/iXOQ4lf.gif"
            }
        ]
        },
        {
        "name": "Arakdo",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_283.gif",
            "imgur": "https://i.imgur.com/pMMfDiL.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_283.gif",
            "imgur": "https://i.imgur.com/1VsDWmT.gif"
            }
        ]
        },
        {
        "name": "Maskadra",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_284.gif",
            "imgur": "https://i.imgur.com/oKfarnx.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_284.gif",
            "imgur": "https://i.imgur.com/s2N63RK.gif"
            }
        ]
        },
        {
        "name": "Balignon",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_285.gif",
            "imgur": "https://i.imgur.com/VRiBC8p.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_285.gif",
            "imgur": "https://i.imgur.com/6Gwaao7.gif"
            }
        ]
        },
        {
        "name": "Chapignon",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_286.gif",
            "imgur": "https://i.imgur.com/KVwDaer.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_286.gif",
            "imgur": "https://i.imgur.com/IJBrwDU.gif"
            }
        ]
        },
        {
        "name": "Parecool",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_287.gif",
            "imgur": "https://i.imgur.com/xRs40Bn.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_287.gif",
            "imgur": "https://i.imgur.com/ToSZ3Rp.gif"
            }
        ]
        },
        {
        "name": "Vigoroth",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_288.gif",
            "imgur": "https://i.imgur.com/wsjNv2V.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_288.gif",
            "imgur": "https://i.imgur.com/HlqR9nP.gif"
            }
        ]
        },
        {
        "name": "Monaflèmit",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_289.gif",
            "imgur": "https://i.imgur.com/ZkpNvso.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_289.gif",
            "imgur": "https://i.imgur.com/1Z4YfcO.gif"
            }
        ]
        },
        {
        "name": "Ningale",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_290.gif",
            "imgur": "https://i.imgur.com/RMm5lNg.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_290.gif",
            "imgur": "https://i.imgur.com/INGdJV5.gif"
            }
        ]
        },
        {
        "name": "Ninjask",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_291.gif",
            "imgur": "https://i.imgur.com/yLNPXLL.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_291.gif",
            "imgur": "https://i.imgur.com/uXOKC8R.gif"
            }
        ]
        },
        {
        "name": "Munja",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_292.gif",
            "imgur": "https://i.imgur.com/umC9aXz.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_292.gif",
            "imgur": "https://i.imgur.com/Cw1tdWJ.gif"
            }
        ]
        },
        {
        "name": "Chuchmur",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_293.gif",
            "imgur": "https://i.imgur.com/q4EHBiv.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_293.gif",
            "imgur": "https://i.imgur.com/WoMZ4Ca.gif"
            }
        ]
        },
        {
        "name": "Ramboum",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_294.gif",
            "imgur": "https://i.imgur.com/ch29Xct.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_294.gif",
            "imgur": "https://i.imgur.com/vekhjBx.gif"
            }
        ]
        },
        {
        "name": "Brouhabam",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_295.gif",
            "imgur": "https://i.imgur.com/3b3egvy.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_295.gif",
            "imgur": "https://i.imgur.com/0Ijb356.gif"
            }
        ]
        },
        {
        "name": "Makuhita",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_296.gif",
            "imgur": "https://i.imgur.com/g4HMqZl.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_296.gif",
            "imgur": "https://i.imgur.com/STC4gga.gif"
            }
        ]
        },
        {
        "name": "Hariyama",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_297.gif",
            "imgur": "https://i.imgur.com/ULmQYX7.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_297.gif",
            "imgur": "https://i.imgur.com/3JEDeAQ.gif"
            }
        ]
        },
        {
        "name": "Azurill",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_298.gif",
            "imgur": "https://i.imgur.com/k9xzfa3.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_298.gif",
            "imgur": "https://i.imgur.com/CCFXxhH.gif"
            }
        ]
        },
        {
        "name": "Tarinor",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_299.gif",
            "imgur": "https://i.imgur.com/JL3Q7iV.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_299.gif",
            "imgur": "https://i.imgur.com/BBNhymW.gif"
            }
        ]
        },
        {
        "name": "Skitty",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_300.gif",
            "imgur": "https://i.imgur.com/dYK9uqT.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_300.gif",
            "imgur": "https://i.imgur.com/JbuLVxf.gif"
            }
        ]
        },
        {
        "name": "Delcatty",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_301.gif",
            "imgur": "https://i.imgur.com/3zmltqx.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_301.gif",
            "imgur": "https://i.imgur.com/kSBXZe2.gif"
            }
        ]
        },
        {
        "name": "Ténéfix",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_302.gif",
            "imgur": "https://i.imgur.com/q0QlUzD.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_302.gif",
            "imgur": "https://i.imgur.com/3HPYGIo.gif"
            }
        ]
        },
        {
        "name": "Mysdibule",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_303.gif",
            "imgur": "https://i.imgur.com/Q8X3CjW.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_303.gif",
            "imgur": "https://i.imgur.com/8yRYVtu.gif"
            }
        ]
        },
        {
        "name": "Galekid",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_304.gif",
            "imgur": "https://i.imgur.com/NcLybS0.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_304.gif",
            "imgur": "https://i.imgur.com/JJcJ5yN.gif"
            }
        ]
        },
        {
        "name": "Galegon",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_305.gif",
            "imgur": "https://i.imgur.com/57eTZdo.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_305.gif",
            "imgur": "https://i.imgur.com/zltkRlt.gif"
            }
        ]
        },
        {
        "name": "Galeking",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_306.gif",
            "imgur": "https://i.imgur.com/37ungtl.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_306.gif",
            "imgur": "https://i.imgur.com/kq7xozl.gif"
            }
        ]
        },
        {
        "name": "Méditikka",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_307.gif",
            "imgur": "https://i.imgur.com/KG5sQF8.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_307.gif",
            "imgur": "https://i.imgur.com/aB7am2g.gif"
            }
        ]
        },
        {
        "name": "Charmina",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_308.gif",
            "imgur": "https://i.imgur.com/fq57hib.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_308.gif",
            "imgur": "https://i.imgur.com/lwP1xZP.gif"
            }
        ]
        },
        {
        "name": "Dynavolt",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_309.gif",
            "imgur": "https://i.imgur.com/DVrJtKw.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_309.gif",
            "imgur": "https://i.imgur.com/qJw0LGp.gif"
            }
        ]
        },
        {
        "name": "Élecsprint",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_310.gif",
            "imgur": "https://i.imgur.com/qPrPhUL.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_310.gif",
            "imgur": "https://i.imgur.com/gRyP0oo.gif"
            }
        ]
        },
        {
        "name": "Posipi",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_311.gif",
            "imgur": "https://i.imgur.com/DllQg8x.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_311.gif",
            "imgur": "https://i.imgur.com/xlCy8MI.gif"
            }
        ]
        },
        {
        "name": "Négapi",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_312.gif",
            "imgur": "https://i.imgur.com/t4hHQvV.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_312.gif",
            "imgur": "https://i.imgur.com/69dxf3W.gif"
            }
        ]
        },
        {
        "name": "Muciole",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_313.gif",
            "imgur": "https://i.imgur.com/yd9vGnR.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_313.gif",
            "imgur": "https://i.imgur.com/4ZakvrD.gif"
            }
        ]
        },
        {
        "name": "Lumivole",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_314.gif",
            "imgur": "https://i.imgur.com/9xO9vwT.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_314.gif",
            "imgur": "https://i.imgur.com/R6eNL8c.gif"
            }
        ]
        },
        {
        "name": "Rosélia",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_315.gif",
            "imgur": "https://i.imgur.com/Vt6c0tt.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_315.gif",
            "imgur": "https://i.imgur.com/iw5zEZT.gif"
            }
        ]
        },
        {
        "name": "Gloupti",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_316.gif",
            "imgur": "https://i.imgur.com/xl4plTk.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_316.gif",
            "imgur": "https://i.imgur.com/MAPHVw0.gif"
            }
        ]
        },
        {
        "name": "Avaltout",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_317.gif",
            "imgur": "https://i.imgur.com/G6JrLB3.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_317.gif",
            "imgur": "https://i.imgur.com/DEf0JJb.gif"
            }
        ]
        },
        {
        "name": "Carvanha",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_318.gif",
            "imgur": "https://i.imgur.com/zrghUAg.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_318.gif",
            "imgur": "https://i.imgur.com/58tVbUL.gif"
            }
        ]
        },
        {
        "name": "Sharpedo",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_319.gif",
            "imgur": "https://i.imgur.com/cM92ixC.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_319.gif",
            "imgur": "https://i.imgur.com/tdOpfEh.gif"
            }
        ]
        },
        {
        "name": "Wailmer",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_320.gif",
            "imgur": "https://i.imgur.com/AqjcTRU.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_320.gif",
            "imgur": "https://i.imgur.com/pN246M1.gif"
            }
        ]
        },
        {
        "name": "Wailord",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_321.gif",
            "imgur": "https://i.imgur.com/EGxsx7N.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_321.gif",
            "imgur": "https://i.imgur.com/j20N2Uo.gif"
            }
        ]
        },
        {
        "name": "Chamallot",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_322.gif",
            "imgur": "https://i.imgur.com/4VijTEc.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_322.gif",
            "imgur": "https://i.imgur.com/hnAeODt.gif"
            }
        ]
        },
        {
        "name": "Camérupt",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_323.gif",
            "imgur": "https://i.imgur.com/ROERmAJ.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_323.gif",
            "imgur": "https://i.imgur.com/eZ4KtJb.gif"
            }
        ]
        },
        {
        "name": "Chartor",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_324.gif",
            "imgur": "https://i.imgur.com/xSUbbEd.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_324.gif",
            "imgur": "https://i.imgur.com/t7N5lsj.gif"
            }
        ]
        },
        {
        "name": "Spoink",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_325.gif",
            "imgur": "https://i.imgur.com/J24pO2e.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_325.gif",
            "imgur": "https://i.imgur.com/CrqzgTC.gif"
            }
        ]
        },
        {
        "name": "Groret",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_326.gif",
            "imgur": "https://i.imgur.com/MR0TxV3.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_326.gif",
            "imgur": "https://i.imgur.com/c218itS.gif"
            }
        ]
        },
        {
        "name": "Spinda",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_327.gif",
            "imgur": "https://i.imgur.com/KRpc5Cu.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_327.gif",
            "imgur": "https://i.imgur.com/ViTvGMe.gif"
            }
        ]
        },
        {
        "name": "Kraknoix",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_328.gif",
            "imgur": "https://i.imgur.com/UHev9H1.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_328.gif",
            "imgur": "https://i.imgur.com/W03LWHG.gif"
            }
        ]
        },
        {
        "name": "Vibraninf",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_329.gif",
            "imgur": "https://i.imgur.com/BPGkIw3.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_329.gif",
            "imgur": "https://i.imgur.com/uqv6zEB.gif"
            }
        ]
        },
        {
        "name": "Libégon",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_330.gif",
            "imgur": "https://i.imgur.com/cFjrUbm.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_330.gif",
            "imgur": "https://i.imgur.com/DO1Jscr.gif"
            }
        ]
        },
        {
        "name": "Cacnea",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_331.gif",
            "imgur": "https://i.imgur.com/a7OrRuI.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_331.gif",
            "imgur": "https://i.imgur.com/LetM7ga.gif"
            }
        ]
        },
        {
        "name": "Cacturne",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_332.gif",
            "imgur": "https://i.imgur.com/w2m0Mvj.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_332.gif",
            "imgur": "https://i.imgur.com/cfuYIDq.gif"
            }
        ]
        },
        {
        "name": "Tylton",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_333.gif",
            "imgur": "https://i.imgur.com/F6RKRS6.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_333.gif",
            "imgur": "https://i.imgur.com/0N2H2qE.gif"
            }
        ]
        },
        {
        "name": "Altaria",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_334.gif",
            "imgur": "https://i.imgur.com/3cxJcCb.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_334.gif",
            "imgur": "https://i.imgur.com/SKnrlwL.gif"
            }
        ]
        },
        {
        "name": "Mangriff",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_335.gif",
            "imgur": "https://i.imgur.com/LxYQfLz.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_335.gif",
            "imgur": "https://i.imgur.com/3iHlZxo.gif"
            }
        ]
        },
        {
        "name": "Séviper",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_336.gif",
            "imgur": "https://i.imgur.com/hiHMozP.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_336.gif",
            "imgur": "https://i.imgur.com/Ulvdddk.gif"
            }
        ]
        },
        {
        "name": "Séléroc",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_337.gif",
            "imgur": "https://i.imgur.com/ETdPey6.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_337.gif",
            "imgur": "https://i.imgur.com/0Y6GuZB.gif"
            }
        ]
        },
        {
        "name": "Solaroc",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_338.gif",
            "imgur": "https://i.imgur.com/rFXVTAr.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_338.gif",
            "imgur": "https://i.imgur.com/0ejTeyq.gif"
            }
        ]
        },
        {
        "name": "Barloche",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_339.gif",
            "imgur": "https://i.imgur.com/h0m6rBF.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_339.gif",
            "imgur": "https://i.imgur.com/0E1Ki4q.gif"
            }
        ]
        },
        {
        "name": "Barbicha",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_340.gif",
            "imgur": "https://i.imgur.com/fePDer1.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_340.gif",
            "imgur": "https://i.imgur.com/hFBjyRh.gif"
            }
        ]
        },
        {
        "name": "Écrapince",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_341.gif",
            "imgur": "https://i.imgur.com/OVFcqI3.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_341.gif",
            "imgur": "https://i.imgur.com/q0ZLdgt.gif"
            }
        ]
        },
        {
        "name": "Colhomard",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_342.gif",
            "imgur": "https://i.imgur.com/6bW1VpO.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_342.gif",
            "imgur": "https://i.imgur.com/V4e1cUL.gif"
            }
        ]
        },
        {
        "name": "Balbuto",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_343.gif",
            "imgur": "https://i.imgur.com/Zz2E7CJ.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_343.gif",
            "imgur": "https://i.imgur.com/h8U1GrH.gif"
            }
        ]
        },
        {
        "name": "Kaorine",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_344.gif",
            "imgur": "https://i.imgur.com/xyk0AhU.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_344.gif",
            "imgur": "https://i.imgur.com/SL5Mcht.gif"
            }
        ]
        },
        {
        "name": "Lilia",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_345.gif",
            "imgur": "https://i.imgur.com/Q2QytlC.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_345.gif",
            "imgur": "https://i.imgur.com/TWL7yNr.gif"
            }
        ]
        },
        {
        "name": "Vacilys",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_346.gif",
            "imgur": "https://i.imgur.com/wj8eW8L.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_346.gif",
            "imgur": "https://i.imgur.com/L23HT56.gif"
            }
        ]
        },
        {
        "name": "Anorith",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_347.gif",
            "imgur": "https://i.imgur.com/P5kcelX.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_347.gif",
            "imgur": "https://i.imgur.com/pczApeb.gif"
            }
        ]
        },
        {
        "name": "Armaldo",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_348.gif",
            "imgur": "https://i.imgur.com/RMrti1j.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_348.gif",
            "imgur": "https://i.imgur.com/M48ynzI.gif"
            }
        ]
        },
        {
        "name": "Barpau",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_349.gif",
            "imgur": "https://i.imgur.com/my6MOW0.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_349.gif",
            "imgur": "https://i.imgur.com/wE6pqRa.gif"
            }
        ]
        },
        {
        "name": "Milobellus",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_350.gif",
            "imgur": "https://i.imgur.com/1a9pdLT.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_350.gif",
            "imgur": "https://i.imgur.com/txv5Z8e.gif"
            }
        ]
        },
        {
        "name": "Morphéo",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_351.gif",
            "imgur": "https://i.imgur.com/bc8Yrn8.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_351.gif",
            "imgur": "https://i.imgur.com/kArJCj7.gif"
            }
        ]
        },
        {
        "name": "Kecleon",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_352.gif",
            "imgur": "https://i.imgur.com/vmvIr3u.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_352.gif",
            "imgur": "https://i.imgur.com/vMXoDGZ.gif"
            }
        ]
        },
        {
        "name": "Polichombr",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_353.gif",
            "imgur": "https://i.imgur.com/KHqZLlY.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_353.gif",
            "imgur": "https://i.imgur.com/6R3j5BA.gif"
            }
        ]
        },
        {
        "name": "Branette",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_354.gif",
            "imgur": "https://i.imgur.com/DNhSMx6.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_354.gif",
            "imgur": "https://i.imgur.com/DcO5oyl.gif"
            }
        ]
        },
        {
        "name": "Skelénox",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_355.gif",
            "imgur": "https://i.imgur.com/JXzqG41.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_355.gif",
            "imgur": "https://i.imgur.com/uEwXj9P.gif"
            }
        ]
        },
        {
        "name": "Téraclope",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_356.gif",
            "imgur": "https://i.imgur.com/cn0WZTj.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_356.gif",
            "imgur": "https://i.imgur.com/uI6zD1p.gif"
            }
        ]
        },
        {
        "name": "Tropius",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_357.gif",
            "imgur": "https://i.imgur.com/RHwM1pO.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_357.gif",
            "imgur": "https://i.imgur.com/WPU3yJM.gif"
            }
        ]
        },
        {
        "name": "Éoko",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_358.gif",
            "imgur": "https://i.imgur.com/WHhNymc.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_358.gif",
            "imgur": "https://i.imgur.com/NUEZBMi.gif"
            }
        ]
        },
        {
        "name": "Absol",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_359.gif",
            "imgur": "https://i.imgur.com/ElCcGPu.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_359.gif",
            "imgur": "https://i.imgur.com/uzHsRwW.gif"
            }
        ]
        },
        {
        "name": "Okéoké",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_360.gif",
            "imgur": "https://i.imgur.com/ZQUZ7cz.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_360.gif",
            "imgur": "https://i.imgur.com/wJr1U9p.gif"
            }
        ]
        },
        {
        "name": "Stalgamin",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_361.gif",
            "imgur": "https://i.imgur.com/aHDFAat.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_361.gif",
            "imgur": "https://i.imgur.com/Ql0BkC1.gif"
            }
        ]
        },
        {
        "name": "Oniglali",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_362.gif",
            "imgur": "https://i.imgur.com/X2V5UJj.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_362.gif",
            "imgur": "https://i.imgur.com/Df4uIlr.gif"
            }
        ]
        },
        {
        "name": "Obalie",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_363.gif",
            "imgur": "https://i.imgur.com/HlD1Tv5.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_363.gif",
            "imgur": "https://i.imgur.com/9qNfpPA.gif"
            }
        ]
        },
        {
        "name": "Phogleur",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_364.gif",
            "imgur": "https://i.imgur.com/WN8f0uQ.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_364.gif",
            "imgur": "https://i.imgur.com/d6bV269.gif"
            }
        ]
        },
        {
        "name": "Kaimorse",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_365.gif",
            "imgur": "https://i.imgur.com/Gi6C44S.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_365.gif",
            "imgur": "https://i.imgur.com/V7INzNJ.gif"
            }
        ]
        },
        {
        "name": "Coquiperl",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_366.gif",
            "imgur": "https://i.imgur.com/rqA9Nam.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_366.gif",
            "imgur": "https://i.imgur.com/pcPnwU9.gif"
            }
        ]
        },
        {
        "name": "Serpang",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_367.gif",
            "imgur": "https://i.imgur.com/eiS51I7.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_367.gif",
            "imgur": "https://i.imgur.com/uY0cdlp.gif"
            }
        ]
        },
        {
        "name": "Rosabyss",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_368.gif",
            "imgur": "https://i.imgur.com/ZKSw04E.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_368.gif",
            "imgur": "https://i.imgur.com/QS8AH2k.gif"
            }
        ]
        },
        {
        "name": "Relicanth",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_369.gif",
            "imgur": "https://i.imgur.com/fOwxq2S.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_369.gif",
            "imgur": "https://i.imgur.com/ER2UzA7.gif"
            }
        ]
        },
        {
        "name": "Lovdisc",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_370.gif",
            "imgur": "https://i.imgur.com/CMinvWW.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_370.gif",
            "imgur": "https://i.imgur.com/WnmjsWM.gif"
            }
        ]
        },
        {
        "name": "Draby",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_371.gif",
            "imgur": "https://i.imgur.com/Sy0rFXQ.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_371.gif",
            "imgur": "https://i.imgur.com/uVuVtCy.gif"
            }
        ]
        },
        {
        "name": "Drackhaus",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_372.gif",
            "imgur": "https://i.imgur.com/yYRoeL1.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_372.gif",
            "imgur": "https://i.imgur.com/BvldMUe.gif"
            }
        ]
        },
        {
        "name": "Drattak",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_373.gif",
            "imgur": "https://i.imgur.com/8jT0xNS.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_373.gif",
            "imgur": "https://i.imgur.com/e7Nckoj.gif"
            }
        ]
        },
        {
        "name": "Terhal",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_374.gif",
            "imgur": "https://i.imgur.com/GJett7x.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_374.gif",
            "imgur": "https://i.imgur.com/Dj25Aib.gif"
            }
        ]
        },
        {
        "name": "Métang",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_375.gif",
            "imgur": "https://i.imgur.com/Af3RJcB.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_375.gif",
            "imgur": "https://i.imgur.com/jiKLKcx.gif"
            }
        ]
        },
        {
        "name": "Métalosse",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_376.gif",
            "imgur": "https://i.imgur.com/p6qL9Ip.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_376.gif",
            "imgur": "https://i.imgur.com/IhssN35.gif"
            }
        ]
        },
        {
        "name": "Regirock",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_377.gif",
            "imgur": "https://i.imgur.com/ijuI2pZ.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_377.gif",
            "imgur": "https://i.imgur.com/LgP52Eb.gif"
            }
        ]
        },
        {
        "name": "Regice",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_378.gif",
            "imgur": "https://i.imgur.com/06xPp9i.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_378.gif",
            "imgur": "https://i.imgur.com/BZH6egJ.gif"
            }
        ]
        },
        {
        "name": "Registeel",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_379.gif",
            "imgur": "https://i.imgur.com/Z1Ddmt7.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_379.gif",
            "imgur": "https://i.imgur.com/F4BlOIi.gif"
            }
        ]
        },
        {
        "name": "Latias",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_380.gif",
            "imgur": "https://i.imgur.com/eWU4PQJ.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_380.gif",
            "imgur": "https://i.imgur.com/L2LgAht.gif"
            }
        ]
        },
        {
        "name": "Latios",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_381.gif",
            "imgur": "https://i.imgur.com/SPym7G3.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_381.gif",
            "imgur": "https://i.imgur.com/zjSsMYX.gif"
            }
        ]
        },
        {
        "name": "Kyogre",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_382.gif",
            "imgur": "https://i.imgur.com/WFMxfq9.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_382.gif",
            "imgur": "https://i.imgur.com/CQY82hg.gif"
            }
        ]
        },
        {
        "name": "Groudon",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_383.gif",
            "imgur": "https://i.imgur.com/uuWOEfb.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_383.gif",
            "imgur": "https://i.imgur.com/EaCMyEO.gif"
            }
        ]
        },
        {
        "name": "Rayquaza",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_384.gif",
            "imgur": "https://i.imgur.com/AIunKaq.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_384.gif",
            "imgur": "https://i.imgur.com/YSh4NHK.gif"
            }
        ]
        },
        {
        "name": "Jirachi",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_385.gif",
            "imgur": "https://i.imgur.com/zzTm0Ta.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_385.gif",
            "imgur": "https://i.imgur.com/SOZgph5.gif"
            }
        ]
        },
        {
        "name": "Deoxys",
        "normal_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_386-speed.gif",
            "imgur": "https://i.imgur.com/Y7e1M2q.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald/ani_e_386.gif",
            "imgur": "https://i.imgur.com/bdeNtUx.gif"
            }
        ],
        "shiny_urls": [
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_386-speed.gif",
            "imgur": "https://i.imgur.com/MVbKiwC.gif"
            },
            {
            "pokenc": "https://www.pokencyclopedia.info/sprites/gen3/ani_emerald_shiny/ani_e-S_386.gif",
            "imgur": "https://i.imgur.com/44o7Pnu.gif"
            }
        ]
        }
    ]
    }`)
})()

