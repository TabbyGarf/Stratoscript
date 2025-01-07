// ==UserScript==
// @name         Stratoscript - Options de modération
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description
// @author       Stratosphere
// @match        https://avenoel.org/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

/* jshint esversion: 8 */

( function () {
    'use strict';
    var path = window.location.pathname;
    var indexPhp = '';
    if ( path.match( /\/index\.php\// ) ) {
        indexPhp = 'index.php/';
    }

    var mode_parametres = {};
    var mode_logs = [];
    var mode_blacklist = [];
    var mode_hashs_perceptuels = [];

    var theme_noir = true;

    var compteur_floods_pseudos = {};
    var mode_rapide = false;

    var token = null;
    var tokenStaff = null;
    var tokenCSRF = null;

    let ssDatabaseModo;

    /* ==========================================================
    |                                                           |
    |                      INITIALISATION                       |
    |                                                           |
    ========================================================== */

    async function initialisation() {
        if ( document.getElementById( 'stratoscriptPanel' ) !== null || path.startsWith( "/admin" ) || path.startsWith( "/index.php/admin" ) ) {
            // Si Stratoscript est chargé OU qu'on est sur le pannel admin
            console.log( "Options de moderation chargées !" );
            // Charger les parametres
            mode_parametres = localStorage_chargement( "ss_mode_parametres" );
            mode_logs = localStorage_chargement( "ss_mode_logs" );
            mode_blacklist = localStorage_chargement( "ss_mode_blacklist" );

            // IndexedDB
            ssDatabaseModo = new SSDatabaseModo( 1 );
            // TOUTES LES PAGES, SAUF LE PANNEL ADMIN
            if ( !path.startsWith( "/admin" ) ) {
                // Modifications du pannel pour y ajouter les trucs de modération
                modifPannelStratoscript();
                // Bouton 'Posts récents'
                ajoutBtnPostsRecents();
            }
            // LISTE DES TOPICS
            if ( path.startsWith( "/forum" ) || path.startsWith( "/index.php/forum" ) ) {
                // Modifier le contenu (blacklist...)
                modifListeTopics( document );
            }
            // TOPIC
            if ( path.startsWith( "/topic/" ) ) {
                // Boutons d'errad rapides
                ajouterRacourcisErad();
            }
            // CHAT
            if ( path.startsWith( "/chat" ) || path.startsWith( "/index.php/chat" ) ) {
                // Afficher la zone antiflood du chat dans le pannel
                $( ".zone-surveillance-chat" ).removeClass( "hidden" );
                $( ".hr-surveillance-chat" ).removeClass( "hidden" );
            }
            // PANNEL ADMIN
            if ( path.startsWith( "/admin" ) || path.startsWith( "/index.php/admin" ) ) {
                //
            }
        } else {
            // Si Stratoscript n'est pas chargé
            console.error( 'Impossible de charger les options de modération : Stratoscript non détecté !' );
        }

    }

    /* ==========================================================
    |                                                           |
    |                         BORDEL                            |
    |                                                           |
    ========================================================== */

    /////////////////////
    //  AUTRE DOCUMENT  |
    /////////////////////
    var getDoc = function ( url ) {
        return new Promise( async function ( resolution, rejet ) {
            try {
                const rawText = await fetch( url ).then( res => res.text() );
                const doc = new DOMParser().parseFromString( rawText, "text/html" );

                resolution( doc );
            } catch ( erreur ) {
                console.error( "Erreur dans la récupération de la page : " + url );
                rejet( erreur );
            }
        } );
    };

    //////////////////////
    //  AJOUT AU ONLOAD  |
    //////////////////////
    // Rajoute une fonction dans le onload sans écraser la précédente.
    function addLoadEvent( func ) {
        var oldonload = window.onload;
        if ( typeof window.onload != 'function' ) {
            window.onload = func;
        } else {
            window.onload = function () {
                if ( oldonload ) {
                    oldonload();
                }
                func();
            };
        }
    }

    ////////////
    //  TOKEN  |
    ////////////
    var getToken = function () {
        return new Promise( async function ( resolution, rejet ) {
            try {
                let pageMonCompte = await getDoc( 'https://avenoel.org/compte' );
                let token = pageMonCompte.querySelector( '#token' ).value;
                resolution( token );
            } catch ( erreur ) {
                rejet( erreur );
            }
        } );
    };
    var getTokenStaff = function () {
        return document.querySelector( 'meta[name="staff-token"]' ).content;
    };
    var getTokenCSRF = function () {
        return new Promise( async function ( resolution, rejet ) {
            try {
                let pageCompte = await getDoc( 'https://avenoel.org/compte' );
                let token = pageCompte.querySelector( 'form input[name="_token"]' ).value;
                resolution( token );
            } catch ( erreur ) {
                rejet( erreur );
            }
        } );
    };

    ////////////
    //  PAUSE  |
    ////////////
    function sleep( delai ) {
        return new Promise( resolve => setTimeout( resolve, delai ) );
    }

    /* ==========================================================
    |                                                           |
    |                    INTERFACE / NAVBAR                     |
    |                                                           |
    ========================================================== */

    //////////////////////////
    //  Interface - Partout  |
    //////////////////////////
    function ajoutBtnPostsRecents() {
        // Création du bouton
        let zone_droite = document.querySelector( '.pull-right > .aside > ul' );
        if ( zone_droite ) {
            let btn = document.createElement( 'li' );
            btn.setAttribute( 'id', 'ss-btnPostsRecents' );
            let href = document.createElement( 'a' );
            href.setAttribute( 'style', 'cursor: pointer' );
            href.innerText = 'Post récents';
            btn.appendChild( href );
            // Ajout du bouton (Si le nombre de boutons existants est impair, ajouter un espace)
            if ( zone_droite.childNodes.length % 2 != 0 ) {
                zone_droite.appendChild( document.createTextNode( " " ) );
            }
            zone_droite.appendChild( btn );

            // Event - Clic sur le bouton de suppression des topics cochés
            $( "#ss-btnPostsRecents" ).click( async function () {
                if ( !window.affichagePostsRecentsLance ) {
                    window.affichagePostsRecentsLance = true;
                    affichagePostsRecents();
                }
            } );

            // Affichage de la pseudo page des posts récents
            async function affichagePostsRecents() {
                while ( true ) {
                    // Récupérer les tokens
                    token = await getToken();
                    tokenStaff = await getTokenStaff();
                    // Récupérer les posts( token, tokenStaff, decalage, nombre, withDetails )
                    var posts = await getPosts( token, tokenStaff, 0, '20', true );
                    // Purger la zone
                    let zone_principale = document.querySelectorAll( 'section' )[ 2 ];
                    while ( zone_principale.firstChild ) {
                        zone_principale.removeChild( zone_principale.firstChild );
                    }

                    posts.forEach( ( post, i ) => {

                        let post_id = post.id;
                        let post_content = post.content;
                        let post_date = post.created_at;
                        let user_pseudo = post.user.username;
                        let user_pts = post.user.points;
                        let user_msgs = post.user.message_count;
                        let user_avatar = post.user.avatar;

                        let htmlPost = `
                        <article class="row topic-message odd flex" id="` + post_id + `">
                           <aside class="message-aside hidden-xs">
                              <div class="message-avatar relative"><img src="/images/avatars/` + user_avatar + `" alt="` + user_pseudo + `"></div>
                              <p class="message-infos"><u>Messages</u> : ` + user_msgs + `<br> <u>Points</u> : ` + user_pts + `</p>
                           </aside>
                           <div class="message-wrapper">
                              <header class="message-header">
                                 <img class="visible-xs avatar-thumb" src="/images/avatars/` + user_avatar + `" alt="Avatar de ` + user_pseudo + `"> <span class="message-username "><a href="https://avenoel.org/profil/` + user_pseudo + `">
                                 ` + user_pseudo + `
                                 </a></span>
                                 <div class="message-date"><a href="https://avenoel.org/message/` + post_id + `">Posté le ` + post_date + `</a></div>
                                 <ul class="message-actions">
                                 </ul>
                              </header>
                              <div class="message-content">
                                 ` + post_content + `
                              </div>
                              <footer class="message-footer relative">
                                 <p class="message-edited italic leading-none hidden-xs"></p>
                                 <a href="#` + post_id + `" class="message-permalink">#` + post_id + `</a>
                              </footer>
                           </div>
                        </article>`;

                        let postElement = document.createElement( 'div' );
                        postElement.innerHTML = htmlPost;
                        postElement.querySelector( '.message-content' ).innerText = post_content;

                        zone_principale.appendChild( postElement );
                    } );

                    // Pulse
                    document.querySelector( '.navbar' ).setAttribute( 'style', 'border-bottom: 4px solid #e77b7b !important' );
                    setTimeout( function () {
                        document.querySelector( '.navbar' ).setAttribute( 'style', '' );
                    }, 100 );

                    await sleep( mode_parametres.tempsPauseAPI );
                }
            }
        }
    }

    ////////////////////////
    //  Interface - Topic  |
    ////////////////////////
    function ajouterRacourcisErad() {
        document.querySelectorAll( 'article' ).forEach( function ( e ) {
            let pseudoForumeur = e.querySelector( 'article .message-username' ).innerText.trim();
            let btnErad = document.createElement( 'input' );
            btnErad.setAttribute( 'type', 'image' );
            btnErad.setAttribute( 'style', 'filter: grayscale(100%);' );
            btnErad.setAttribute( 'height', '20' );
            btnErad.setAttribute( 'src', '/images/topic/delete.png' );
            btnErad.onclick = function () {
                erradiquerForumeurParPseudo( pseudoForumeur );
            };

            e.querySelector( '.message-actions' ).appendChild( btnErad );
        } );
    }
    ///////////////////////////////////
    //  Interface - Liste des topics  |
    ///////////////////////////////////
    // Modif de la liste des topics
    function modifListeTopics( page ) {
        /////////////////
        //  DROPDDONWS  |
        /////////////////
        // Colonne du menu déroulant d'options sur les topics
        if ( mode_parametres[ "sw-dropdown-mode" ] == true ) {
            $( ".table.topics" ).last().children().first().children().append( "<th></th>" );
        }
        // Parcourir les topics de la liste des topics
        $( ".table.topics" ).last().children().last().children().each( async function ( i ) {
            // Si le dropdown de modé est activé dans les paramètres
            if ( mode_parametres[ "sw-dropdown-mode" ] == true ) {
                let id_topic = /https:\/\/avenoel\.org\/topic\/([0-9]+)/.exec( $( this ).children().first().next().children().attr( "href" ) )[ 1 ];

                // Code du menu déroulant sans son contenu
                let html_menu_deroulant = "" + '<td class="dropdown pull-right" style="display: flex;justify-content: center;align-items: center;margin-top:2px">' + '<button style="height:20px" class="btn btn-xs dropdown-toggle btn-modif-topic" data-toggle="dropdown" aria-expanded="false" title="Options du topic" alt="Icône modification" height="16">' + '<span class=" glyphicon glyphicon-chevron-down "></span></button>' + '<ul class="dropdown-menu"></ul>' + '<form method="post" id="update-topic-title" class="form-inline" action="https://avenoel.org/topic/' + id_topic + '"></form></td>';

                $( this ).append( html_menu_deroulant );
            }
        } );
        // Event - Clic sur le bouton d'options d'un topic
        $( ".btn-modif-topic" ).click( async function () {
            var doc_topic = await getDoc( $( this ).parent().parent().children().children().first().attr( "href" ) );
            var menu_deroulant = $( ".dropdown-menu", doc_topic ).html();
            var formulaire_chgmt_nom_topic = $( "#update-topic-title", doc_topic ).html();

            $( this ).next().html( menu_deroulant );
            $( this ).next().next().html( formulaire_chgmt_nom_topic );
        } );

        ///////////////
        //  CHECKBOX  |
        ///////////////
        // Colonne des checkbox d'options sur les topics
        if ( mode_parametres[ "sw-checkbox-mode" ] == true ) {
            // Checkbox sélectionner-tout
            $( ".table.topics" ).last().children().first().children().prepend( '<th class="form-check"><input style="margin: 0px" class="form-check-input" type="checkbox" id ="checkbox-modif-topic-all"></th>' );
        }
        // Parcourir les topics de la liste des topics
        $( ".table.topics" ).last().children().last().children().each( async function ( i ) {
            // Si le dropdown de modé est activé dans les paramètres
            if ( mode_parametres[ "sw-checkbox-mode" ] == true ) {
                let id_topic = /https:\/\/avenoel\.org\/topic\/([0-9]+)/.exec( $( this ).children().first().next().children().attr( "href" ) )[ 1 ];
                // Ajout du checkbox
                let html_checkbox = "" + '<td class="form-check">' + '<div> <input style="margin: 0px" class="checkbox-modif-topic form-check-input" type="checkbox" value="' + id_topic + '" id ="checkbox-modif-topic"> </div> ' + '</td>';

                $( this ).prepend( html_checkbox );
            }
        } );
        if ( mode_parametres[ "sw-checkbox-mode" ] == true ) {
            // Ajouter les boutons de modération groupée de topics
            let btns_mode_groupe = '<div class="form-inline"><button class="btn btn-primary mb-2">Supprimer</button></div>';
            $( ".table.topics" ).before( '<div class="form-group mb-2"><div class="form-inline" style="margin-bottom:10px"><button class="btn-suppr-checkbox-topics btn btn-sm grey-btn">Supprimer</button></div></div>' );
            // Retirer la margin inférieure de la paginatin du dessus
            document.querySelector( '.pagination' ).setAttribute( 'style', 'margin-bottom: 0px' );

            // Event - Clic sur le checkbox "sélectrionner tout"
            $( "#checkbox-modif-topic-all" ).click( async function () {
                let etat = document.getElementById( "checkbox-modif-topic-all" ).checked;
                // Tout cocher ou décocher
                document.querySelectorAll( '.checkbox-modif-topic' ).forEach( function ( e ) {
                    e.checked = etat;
                } );
            } );
            // Event - Clic sur le bouton de suppression des topics cochés
            $( ".btn-suppr-checkbox-topics" ).click( async function () {
                let topicsASuppr = [];
                // Récupérer tous les topics cochés
                document.querySelectorAll( '.checkbox-modif-topic' ).forEach( function ( e ) {
                    if ( e.checked ) {
                        topicsASuppr.push( e.value );
                    }
                } );
                // Supprimer ces topics
                topicsASuppr.forEach( async function ( id ) {
                    await sleep( 100 );
                    // Supression
                    await suppressionTopic( id, tokenCSRF );
                } );
                await sleep( 2500 );
                location.reload();
                console.log( topicsASuppr );
            } );
        }
    }

    ///////////////////////////////////
    //  Interface - Toutes les pages  |
    ///////////////////////////////////
    // Mise à jour des logs de modération sur le panel
    function majPannel_LogsMode() {
        // Vider la liste
        $( ".table-logs-mode" ).children().last().empty();

        // Parcourir les logs
        for ( let i = 0; i < mode_logs.length; ++i ) {
            let donnees_liste = "" + "<tr>" + "<th></th>" + "<td>" + mode_logs[ i ] + "</td>" + "<td></td>" + "</tr>";

            // Ajouter les éléments
            $( ".table-logs-mode" ).children().last().append( donnees_liste );
        }
    }

    function modifPannelStratoscript() {
        // Ajouter la zone des paramètres d'Antiflood
        let zone_antiflood = document.createElement( 'div' );
        zone_antiflood.setAttribute( "id", "zone-antiflood" );
        zone_antiflood.setAttribute( "class", "ss-zone ss-col" );
        let html_zone_antiflood = '<div id="ss-zone-antiflood" class="ss-zone ss-col" > <div class="ss-mini-panel"> <h3>Paramétrage</h3> <div class="ss-col ss-space-childs ss-full-width"> <div class="ss-row ss-full-width ss-space-childs"> <div class="ss-row" style="width:300px">Temps de pause entre les requêtes API</div> <input type="number" class="ss-fill inputTempsPauseAPI" placeholder="En millisecondes" style="height:36px;min-width:200px"> </div> <div class="ss-row ss-full-width ss-space-childs"> <div class="ss-row" style="width:300px">Lien du topic de modération</div> <input type="text" class="ss-fill inputLienTopicMode" placeholder="URL" style="height:36px;min-width:200px"> </div> </div> </div> <div id="ss-zone-methodes-mode" class="ss-mini-panel ss-space-childs"> <h3>Méthode de modération</h3> <div class="ss-option"> <label id="sw-mode-antiflood-rapide" class="ss-switch sw-mode-antiflood-rapide"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>⚡ Mode rapide ⚡</div> </div> <div class="ss-groupe-options"> <div class="ss-option" id="sw-mode-antiflood-blacklist"> <label class="ss-switch sw-mode-antiflood-blacklist"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Utiliser la blacklist</div> </div> <div class="ss-option" id="sw-mode-antiflood-hash-imgur"> <label class="ss-switch sw-mode-antiflood-hash-imgur"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Hashage images Imgur</div> </div> <div class="ss-option" id="sw-mode-antiflood-ddb-flood" > <label class="ss-switch sw-mode-antiflood-ddb-flood"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Détection des DDBs</div> </div> <div class="ss-option" id="sw-mode-antiflood-up"> <label class="ss-switch sw-mode-antiflood-up"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Détection du flood par up </div> </div> </div> </div> <div class="ss-mini-panel"> <div class="ss-fill ss-row ss-space-between ss-full-width"> <div class="ss-row ss-space-childs"> <button id="btn-moderation-auto" class="ss-btn ss-rouge " type="button">Activation</button> <button id="btn-zone-blacklist-mode" class="ss-btn ss-gris-clair" type="button">Blacklist</button> <button id="btn-zone-logs-mode" class="ss-btn ss-gris-clair" type="button">Logs</button> </div> <span id="ss-zone-statut-antiflood" class="ss-row" style="font-family: monospace;font-size: 14;"></span> </div> </div> <div class="ss-row" style="margin:0px 20px 20px 20px"> <div id="ss-antiflood-progressbar" class="ss-progressbar ss-full-width" style="display:block"> <div class="ss-col" style="width:0%"></div> </div> </div> <div id="ss-zone-blacklist-mode" class="ss-row" style="display:none"> <div class="ss-mini-panel-xs ss-sans-bordures"> <div class="ss-col ss-space-childs"> <div> <div class="ss-label">Blacklister un élément</div> <div class="ss-row"> <input type="text" class="ss-fill" placeholder="Contenu à blacklister" style="height:36px;min-width:200px"> <button class="ss-btn ss-vert btn_mode_blacklist_ajout" type="button" style="height:36px;width:36px"><b style="transform: rotate(-45deg)">&times;</b></button> </div> </div> <div> <div class="ss-label">Déblacklister un élément</div> <div class="ss-row"> <input type="text" class="ss-fill" placeholder="Contenu à déblacklister" style="height:36px;min-width:200px"> <button class="ss-btn ss-rouge btn_mode_blacklist_suppr" type="button" style="height:36px;width:36px"><b style="transform: rotate(-45deg)">&times;</b></button> </div> </div> <div> <br> <button class="ss-btn ss-gris-clair btn_mode_blacklist_defaut" type="button">Par défaut</button> </div> </div> </div> <div class="ss-mini-panel"> <h3>Blacklist de modération</h3> <div class="ss-full-width" style="height:260px;overflow:auto;"> <table class="table table-condensed table-blacklist-images-mode"> <thead> <tr class="hidden"> <th style="width:40px"></th> <th></th> <th style="width:30px"></th> </tr> </thead> <tbody></tbody> </table> </div> </div> </div> <div id="ss-zone-logs-mode" class="ss-mini-panel" style="display:none"> <h3>Logs de modération</h3> <div class="ss-col ss-full-width" style="max-height:260px;overflow:auto;"> <table class="table table-condensed table-logs-mode"> <thead> <tr class="hidden"> <th style="width:40px"></th> <th></th> <th style="width:30px"></th> </tr> </thead> <tbody></tbody> </table> </div> <button class="ss-btn ss-gris-clair btnPurgeLogsMode" type="button">Vider</button> </div> </div> </div>';
        zone_antiflood.innerHTML = html_zone_antiflood;
        document.querySelector( '.ss-panel-body' ).appendChild( zone_antiflood );

        // Ajouter la zone des paramètres de Moderation
        let zone_moderation = document.createElement( 'div' );
        zone_moderation.setAttribute( "id", "zone-moderation" );
        zone_moderation.setAttribute( "class", "ss-zone ss-col" );
        let html_zone_moderation = '<!-- ONGLET MODO --> <div id="ss-zone-moderation" class="ss-zone "> <!-- LISTE DES TOPICS --> <div class="ss-row"> <div class="ss-mini-panel"> <h3>Modération - Liste des topics</h3> <div class="ss-groupe-options"><div class="ss-option"> <label class="ss-switch sw-dropdown-mode"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Dropdowns de modération</div> </div> <div class="ss-option"> <label class="ss-switch sw-checkbox-mode"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Checkbox de modération</div> </div></div> </div> </div> </div> <!-- FIN ONGLET MODO -->';
        zone_moderation.innerHTML = html_zone_moderation;
        document.querySelector( '.ss-panel-body' ).appendChild( zone_moderation );

        // Ajouter la zone BDD
        let zone_bdd = document.createElement( 'div' );
        zone_bdd.setAttribute( "id", "zone-bdd" );
        zone_bdd.setAttribute( "class", "ss-zone ss-col" );
        let html_zone_bdd = `
        <!-- ONGLET BDD -->
        <div id="ss-zone-bdd" class="ss-zone" >
            <div class="ss-row">
                <div class="ss-mini-panel">
                    <h3>BDD</h3>
                    <div class="ss-groupe-options">
                        <button class="ss-bdd-btn-dump ss-btn ss-gris-clair">Dump</button>
                        <button class="ss-bdd-btn-scan ss-btn ss-gris-clair">Scan</button>
                    </div>
                </div>
            </div>
        </div>
        <!-- FIN ONGLET BDD -->`;
        zone_bdd.innerHTML = html_zone_bdd;
        document.querySelector( '.ss-panel-body' ).appendChild( zone_bdd );

        majPannel_BlacklistMode();
        majPannel_LogsMode();
        majPannel_Parametres();

        // Afficher / Masquer les choix possibles selon si le mode rapide est activé ou non
        let mode_rapide_active = $( "#sw-mode-antiflood-rapide" ).find( "input" ).prop( "checked" );
        if ( mode_rapide_active ) {
            document.getElementById( 'sw-mode-antiflood-hash-imgur' ).classList.add( 'hidden' );
            document.getElementById( 'sw-mode-antiflood-ddb-flood' ).classList.add( 'hidden' );
            document.getElementById( 'sw-mode-antiflood-up' ).classList.add( 'hidden' );
        } else {
            document.getElementById( 'sw-mode-antiflood-hash-imgur' ).classList.remove( 'hidden' );
            document.getElementById( 'sw-mode-antiflood-ddb-flood' ).classList.remove( 'hidden' );
            document.getElementById( 'sw-mode-antiflood-up' ).classList.remove( 'hidden' );
        }

        // Mise à jour de la blacklist des images de modération sur le pannel
        function majPannel_BlacklistMode() {
            // Vider la liste
            $( ".table-blacklist-images-mode" ).children().last().empty();

            // Parcourir la blacklist
            for ( let i = 0; i < mode_blacklist.length; ++i ) {
                let donnees_liste = "" + "<tr>" + "<th>" + ( i + 1 ) + "</th>" + '<td><a href="' + mode_blacklist[ i ] + '">' + mode_blacklist[ i ] + "</a></td>" + "<td>"/* <input class="btnSupressionImage_mode" type="image" src="/images/topic/delete.png" title="Supprimer" height="16"></td><td class="hidden">' + i + ' */ + "</td>" + "</tr>";

                // Ajouter les éléments
                $( ".table-blacklist-images-mode" ).children().last().append( donnees_liste );
            }
        }
        // Mise à jour des logs de modération sur le panel
        function majPannel_LogsMode() {
            // Vider la liste
            $( ".table-logs-mode" ).children().last().empty();

            // Parcourir les logs
            for ( let i = 0; i < mode_logs.length; ++i ) {
                let donnees_liste = "" + "<tr>" + "<th></th>" + "<td>" + mode_logs[ i ] + "</td>" + "<td></td>" + "</tr>";

                // Ajouter les éléments
                $( ".table-logs-mode" ).children().last().append( donnees_liste );
            }
        }
        // Mise à jour des parametres sur le pannel
        function majPannel_Parametres() {
            console.log( mode_parametres );

            // Paramètres avancés
            $( ".inputTempsPauseAPI" ).val( mode_parametres.tempsPauseAPI );
            $( ".inputLienTopicMode" ).val( mode_parametres.lienTopicMode );
            // Liste des topics
            $( ".sw-dropdown-mode" ).find( "input" ).prop( "checked", mode_parametres[ "sw-dropdown-mode" ] );
            $( ".sw-checkbox-mode" ).find( "input" ).prop( "checked", mode_parametres[ "sw-checkbox-mode" ] );
            // Topic
            $( ".sw-btn-erad-posts" ).find( "input" ).prop( "checked", mode_parametres[ "sw-btn-erad-posts" ] );
            // Modération
            $( ".sw-mode-antiflood-rapide" ).find( "input" ).prop( "checked", mode_parametres[ "sw-mode-antiflood-rapide" ] );
            $( ".sw-mode-antiflood-ddb-flood" ).find( "input" ).prop( "checked", mode_parametres[ "sw-mode-antiflood-ddb-flood" ] );
            $( ".sw-mode-antiflood-blacklist" ).find( "input" ).prop( "checked", mode_parametres[ "sw-mode-antiflood-blacklist" ] );
            $( ".sw-mode-antiflood-hash-imgur" ).find( "input" ).prop( "checked", mode_parametres[ "sw-mode-antiflood-hash-imgur" ] );
            $( ".sw-mode-antiflood-hash-autres" ).find( "input" ).prop( "checked", mode_parametres[ "sw-mode-antiflood-hash-autres" ] );
            $( ".sw-mode-antiflood-up" ).find( "input" ).prop( "checked", mode_parametres[ "sw-mode-antiflood-up" ] );
            $( ".sw-mode-experimental" ).find( "input" ).prop( "checked", mode_parametres[ "sw-mode-experimental" ] );
        }

        //////////////////////////
        //  BOUTONS - MODERATON  |
        //////////////////////////
        // Event - BTN purge logs
        $( ".btnPurgeLogsMode" ).click( function () {
            mode_logs = [];
            // Mettre à jour le LocalStorage
            localStorage.setItem( "ss_mode_logs", JSON.stringify( mode_logs ) );
            // Affichage
            mode_logs = localStorage_chargement( "ss_mode_logs" );
            majPannel_LogsMode();
        } );

        // Event - BTN mode rapide (Ajouter/retirer les fonctionnalités selon le mode choisi)
        $( "#sw-mode-antiflood-rapide" ).click( function () {
            let mode_rapide_active = $( "#sw-mode-antiflood-rapide" ).find( "input" ).prop( "checked" );
            if ( mode_rapide_active ) {
                document.getElementById( 'sw-mode-antiflood-hash-imgur' ).classList.add( 'hidden' );
                document.getElementById( 'sw-mode-antiflood-ddb-flood' ).classList.add( 'hidden' );
                document.getElementById( 'sw-mode-antiflood-up' ).classList.add( 'hidden' );
            } else {
                document.getElementById( 'sw-mode-antiflood-hash-imgur' ).classList.remove( 'hidden' );
                document.getElementById( 'sw-mode-antiflood-ddb-flood' ).classList.remove( 'hidden' );
                document.getElementById( 'sw-mode-antiflood-up' ).classList.remove( 'hidden' );
            }
        } );
        // Event - BTN modé auto
        $( "#btn-moderation-auto" ).click( function () {
            toggleModerationAuto();
        } );
        // Event - BTN ouverture logs
        $( "#btn-zone-logs-mode" ).click( function () {
            let zone = document.getElementById( 'ss-zone-logs-mode' );
            if ( zone.style.display == 'none' ) {
                zone.style.display = 'flex';
            } else {
                zone.style.display = 'none';
            }
        } );
        // Event - BTN ouverture blacklist modé
        $( "#btn-zone-blacklist-mode" ).click( function () {
            let zone = document.getElementById( 'ss-zone-blacklist-mode' );
            if ( zone.style.display == 'none' ) {
                zone.style.display = 'flex';
            } else {
                zone.style.display = 'none';
            }
        } );
        // Event - Blacklist modé : Clic bouton d'ajout
        $( ".btn_mode_blacklist_ajout" ).click( function () {
            var element_blackliste = $( this ).parent().children().first().val();

            // Ajouter l'image à la liste
            localStorage_ajout( element_blackliste, mode_blacklist, "ss_mode_blacklist" );
            majPannel_BlacklistMode();

            console.log( element_blackliste + " ajouté à la blacklist" );
            console.log( mode_blacklist.length + " éléments sont blacklistées" );
        } );
        // Event - Blacklist modé : Clic bouton de suppression
        $( ".btn_mode_blacklist_suppr" ).click( function () {
            var element_blackliste = $( this ).parent().children().first().val();

            localStorage_suppression( element_blackliste, mode_blacklist, "ss_mode_blacklist" );
            majPannel_BlacklistMode();

            console.log( element_blackliste );
            console.log( mode_blacklist.length + " éléments sont blacklistées" );
        } );
        // Event - Blacklist modé : Clic valeurs par défaut
        $( ".btn_mode_blacklist_defaut" ).click( function () {
            console.log( "Contenu de backlist modé par défaut" );
            blacklistMode_ParDefaut();
            majPannel_BlacklistMode();
        } );

        ////////////////////////
        //  BOUTONS - ONGLETS  |
        ////////////////////////

        // Ajouter l'onglet "Antiflood"
        let onglet_antiflood = document.createElement( 'div' );
        onglet_antiflood.setAttribute( "id", "onglet-antiflood" );
        onglet_antiflood.innerHTML = '<a>Antiflood</a>';
        document.querySelector( '.ss-panel-onglets' ).appendChild( onglet_antiflood );

        // Event - Clic sur l'onglet Antiflood
        document.getElementById( 'onglet-antiflood' ).onclick = function () {
            // Onglets
            document.querySelectorAll( '.ss-panel-onglets > div' ).forEach( function ( e ) {
                e.classList.remove( 'active' );
            } );
            document.getElementById( 'onglet-antiflood' ).classList.add( 'active' );
            // Zones
            document.querySelectorAll( '.ss-panel-body > div' ).forEach( function ( e ) {
                e.style.display = 'none';
            } );
            document.getElementById( 'zone-antiflood' ).style.display = 'block';

            // Mémoriser l'onglet actif
            let parametres = localStorage_chargement( "ss_parametres" );
            parametres.onglet_actif = document.getElementById( "stratoscriptPanel" ).querySelector( '.ss-panel-onglets .active' ).id;
            localStorage.setItem( "ss_parametres", JSON.stringify( parametres ) );
        };

        // Ajouter l'onglet "Moderation"
        let onglet_moderation = document.createElement( 'div' );
        onglet_moderation.setAttribute( "id", "onglet-moderation" );
        onglet_moderation.innerHTML = '<a>Modération</a>';
        document.querySelector( '.ss-panel-onglets' ).appendChild( onglet_moderation );

        // Event - Clic sur l'onglet Modération
        document.getElementById( 'onglet-moderation' ).onclick = function () {
            // Onglets
            document.querySelectorAll( '.ss-panel-onglets > div' ).forEach( function ( e ) {
                e.classList.remove( 'active' );
            } );
            document.getElementById( 'onglet-moderation' ).classList.add( 'active' );
            // Zones
            document.querySelectorAll( '.ss-panel-body > div' ).forEach( function ( e ) {
                e.style.display = 'none';
            } );
            document.getElementById( 'zone-moderation' ).style.display = 'block';

            // Mémoriser l'onglet actif
            let parametres = localStorage_chargement( "ss_parametres" );
            parametres.onglet_actif = document.getElementById( "stratoscriptPanel" ).querySelector( '.ss-panel-onglets .active' ).id;
            localStorage.setItem( "ss_parametres", JSON.stringify( parametres ) );
        };

        // Ajouter l'onglet "BDD"
        let onglet_bdd = document.createElement( 'div' );
        onglet_bdd.setAttribute( "id", "onglet-bdd" );
        onglet_bdd.innerHTML = '<a>BDD</a>';
        document.querySelector( '.ss-panel-onglets' ).appendChild( onglet_bdd );

        // Event - Clic sur l'onglet BDD
        document.getElementById( 'onglet-bdd' ).onclick = function () {
            // Onglets
            document.querySelectorAll( '.ss-panel-onglets > div' ).forEach( function ( e ) {
                e.classList.remove( 'active' );
            } );
            document.getElementById( 'onglet-bdd' ).classList.add( 'active' );
            // Zones
            document.querySelectorAll( '.ss-panel-body > div' ).forEach( function ( e ) {
                e.style.display = 'none';
            } );
            document.getElementById( 'zone-bdd' ).style.display = 'block';

            // Mémoriser l'onglet actif
            let parametres = localStorage_chargement( "ss_parametres" );
            parametres.onglet_actif = document.getElementById( "stratoscriptPanel" ).querySelector( '.ss-panel-onglets .active' ).id;
            localStorage.setItem( "ss_parametres", JSON.stringify( parametres ) );
        };

        // Affichage de la version
        document.getElementById( 'versionScript' );
        // Affichage de la version
        document.querySelectorAll( '#ss-version' ).forEach( ( e ) => {
            e.innerHTML += ' | Options de modération version 3.0';
        } );

        ///////////////////////////
        //  BOUTONS - PARAMETRES  |
        ///////////////////////////

        // Event - Clic sur le bouton de validation des paramètres
        document.querySelectorAll( '#btn-validation-parametres' ).forEach( function ( e ) {
            // Récupérer ce que fait le onclick sur l'autre partie du script (càd save les paramètres genre BL forumeurs, lecteurs etc...)
            // Faire en sorte de ne pas écraser l'Event précédent sur le bouton, mais le rajouter
            let oldonclick = e.onclick;

            e.onclick = function () {
                saveParametresModeLocalStorage();
                oldonclick();
            };
        } );

    }

    // Event - Clic sur le bouton de rétablissement des paramètres par defaut
    $( ".btnParametresAvancesParDefaut" ).click( async function () {
        mode_parametres.tempsPauseAPI = "700";
        mode_parametres.lienTopicMode = "https://avenoel.org/topic/819446-1-moderation";
        // Mettre à jour le LocalStorage
        localStorage.setItem( "ss_mode_parametres", JSON.stringify( mode_parametres ) );
        // Affichage des nvx parametres
        majPannel_Parametres();
        // Recharger la page
        location.reload();
    } );

    ///////////////////
    //  LOCALSTORAGE  |
    ///////////////////

    function localStorage_chargement( emplacementLS ) {
        if ( localStorage.getItem( emplacementLS ) === null ) {
            return [];
        } else {
            return JSON.parse( localStorage.getItem( emplacementLS ) );
        }
    }
    function localStorage_ajout( element, liste, emplacementLS ) {
        // Ajout à la liste
        liste.push( element );
        // Mettre à jour le LocalStorage
        localStorage.setItem( emplacementLS, JSON.stringify( liste ) );

        return liste;
    }
    function localStorage_suppression( element, liste, emplacementLS ) {
        // Retirer de la liste
        let index = liste.indexOf( element );
        if ( index !== -1 ) {
            liste.splice( index, 1 );
        }
        // Mettre à jour le LocalStorage
        localStorage.setItem( emplacementLS, JSON.stringify( liste ) );

        return liste;
    }

    function saveParametresModeLocalStorage() {
        mode_parametres = {};
        // Paramètres avancés
        mode_parametres.tempsPauseAPI = $( ".inputTempsPauseAPI" ).val();
        mode_parametres.lienTopicMode = $( ".inputLienTopicMode" ).val();
        mode_parametres[ "sw-dropdown-mode" ] = $( ".sw-dropdown-mode" ).find( "input" ).prop( "checked" );
        mode_parametres[ "sw-checkbox-mode" ] = $( ".sw-checkbox-mode" ).find( "input" ).prop( "checked" );
        // Topic
        mode_parametres[ "sw-btn-erad-posts" ] = $( ".sw-btn-erad-posts" ).find( "input" ).prop( "checked" );
        // Modération
        mode_parametres[ "sw-mode-antiflood-rapide" ] = $( ".sw-mode-antiflood-rapide" ).find( "input" ).prop( "checked" );
        mode_parametres[ "sw-mode-antiflood-ddb-flood" ] = $( ".sw-mode-antiflood-ddb-flood" ).find( "input" ).prop( "checked" );
        mode_parametres[ "sw-mode-antiflood-blacklist" ] = $( ".sw-mode-antiflood-blacklist" ).find( "input" ).prop( "checked" );
        mode_parametres[ "sw-mode-antiflood-hash-imgur" ] = $( ".sw-mode-antiflood-hash-imgur" ).find( "input" ).prop( "checked" );
        mode_parametres[ "sw-mode-antiflood-hash-autres" ] = $( ".sw-mode-antiflood-hash-autres" ).find( "input" ).prop( "checked" );
        mode_parametres[ "sw-mode-antiflood-up" ] = $( ".sw-mode-antiflood-up" ).find( "input" ).prop( "checked" );
        mode_parametres[ "sw-mode-experimental" ] = $( ".sw-mode-experimental" ).find( "input" ).prop( "checked" );

        // Mettre à jour le LocalStorage
        localStorage.setItem( "ss_mode_parametres", JSON.stringify( mode_parametres ) );
    }

    /* ==========================================================
    |                                                           |
    |                        MODERATON                          |
    |                                                           |
    ========================================================== */

    ///////////////////////////////////////////////////
    //                      BDD                       |
    ///////////////////////////////////////////////////

    setTimeout( function () {

        document.querySelector( '#ss-zone-bdd button.ss-bdd-btn-dump' ).onclick = async function () {
            console.log( 'Dump' );

            // Récupérer les tokens
            token = await getToken();
            tokenStaff = await getTokenStaff();
            tokenCSRF = await getTokenCSRF();
            // Scan posts
            let offset = 0;
            while ( true ) {
                await sleep( 3000 );
                var posts = await getPosts( token, tokenStaff, offset, '200', false );
                posts.forEach( function ( post ) {
                    console.log( post.id );
                    ssDatabaseModo.posts_add( post.id, post.as_user, post.content, post.created_at, post.deleted, post.deleted_at, post.deleted_by_author, post.grade_class, post.moderable, post.original, post.topic, post.topic_id, post.updated_at, post.updated_by, post.user_id );
                } );
                offset += 200;
            }
        };

        document.querySelector( '#ss-zone-bdd button.ss-bdd-btn-scan' ).onclick = async function () {

            // Récupérer les tokens
            token = await getToken();
            tokenStaff = await getTokenStaff();
            tokenCSRF = await getTokenCSRF();

            console.log( 'Récup démarrée' );
            let posts = await ssDatabaseModo.posts_get();
            console.log( 'Récup terminée' );

            console.log( posts );

            for ( const post of posts ) {
                if ( post.user_id == '66803' && post.deleted == false ) {
                    restaurationPost( post.id, tokenCSRF );
                    await sleep( 500 );
                }
            }

            console.log( 'Foreach terminé' );
        };

    }, 2000 );

    var moderationAutoActivee = false;

    ///////////////////////////////////////////////////
    //               MODERATION AUTO                  |
    ///////////////////////////////////////////////////
    async function moderationAuto_main() {
        // Récupérer les tokens
        token = await getToken();
        tokenStaff = await getTokenStaff();
        tokenCSRF = await getTokenCSRF();
        // Récupération de l'id du topic modé dans les parametres
        let id_topic_mode = /https:\/\/avenoel\.org\/topic\/([0-9]+)/.exec( mode_parametres.lienTopicMode )[ 1 ];
        // Mode de scan
        if ( mode_parametres[ "sw-mode-antiflood-rapide" ] ) {
            mode_rapide = true;
        } else {
            mode_rapide = false;
        }

        while ( moderationAutoActivee ) {
            var posts = [];
            await sleep( mode_parametres.tempsPauseAPI );
            if ( mode_rapide ) {
                /* ===================================================================
                                             MODE RAPIDE
                                   Récupération des x derniers posts
                =================================================================== */
                majProgressBar( 0, 2 );
                // Récupération des posts
                posts = await getPosts( token, tokenStaff, 0, '50', true );
                majProgressBar( 1, 2 );
                // Traitement des posts
                await traitementPosts( posts );
                majProgressBar( 2, 2 );
            } else {
                /* ===================================================================
                                              MODE LENT
                   Récupération des x derniers posts des topics de la première page
                =================================================================== */
                // Récupération des IDs des topics de la première page
                let doc = await getDoc( 'https://avenoel.org/forum' );
                let ids_topics = [];
                doc.querySelectorAll( '.topics tbody tr .topics-title a' ).forEach( ( e ) => {
                    let id_topic = e.href.match( /avenoel\.org\/topic\/([0-9]+)-/ )[ 1 ];
                    ids_topics.push( id_topic );
                } );
                majProgressBar( 0, ids_topics.length );
                // Pour chaque topic, récupérer et traiter les posts
                for ( var i = 0; i < ids_topics.length; i++ ) {
                    if ( moderationAutoActivee ) {
                        await sleep( mode_parametres.tempsPauseAPI );
                        // Récupération des posts
                        let posts = await getPostsTopic( ids_topics[i], 0, 10 );
                        // Traitement des posts
                        await traitementPosts( posts );
                        // Maj Progressbar
                        majProgressBar( i + 1, ids_topics.length );
                    } else {
                        break;
                    }
                }
            }
        }

        /* ==================================
                     PROGRESSBAR
        ===================================*/
        function majProgressBar( mtn, max ) {
            let progressbar = document.getElementById( "ss-antiflood-progressbar" );
            let pourcentage = Math.ceil( mtn * 100 / max );
            progressbar.style.display = "block";
            progressbar.children[ 0 ].setAttribute( "style", "width:" + pourcentage + "%" );
            progressbar.children[ 0 ].innerText = pourcentage + '%';

            let status_zone = document.getElementById( "ss-zone-statut-antiflood" );
            status_zone.innerText = 'Progression : ' + mtn + '/' + max;
        }

        /* ==================================
                TRAITEMENT DES POSTS
        ===================================*/
        async function traitementPosts( posts ) {
            if ( posts ) {
                posts.forEach( async ( post, i ) => {
                    if ( post.deleted != true ) {

                        ////////////////////////////////////
                        //  Détection de ups intempestifs  |
                        ////////////////////////////////////
                        if ( mode_rapide == false && mode_parametres[ "sw-mode-antiflood-up" ] == true ) {
                            if ( i > 0 ) {
                                let post_suivant = posts[i - 1];
                                // Dates
                                let date_post = new Date( post.created_at );
                                let date_post_suivant = new Date( post_suivant.created_at );
                                // Calcul
                                let ecart = Math.abs( date_post - date_post_suivant );
                                let ecart_minutes = ecart / 1000 / 60;
                                let ecart_heures = ecart_minutes / 60;
                                if ( ecart_heures > 14 ) {

                                    console.log( post_suivant.user.ban );

                                    // Compter le nouveau flood de ce pseudo
                                    let nbFlood = compterFlood( post_suivant.id, post_suivant.user.username );
                                    console.log( "Up d'environ " + Math.round( ecart_heures ) + " heures détecté (" + nbFlood + "), par " + post_suivant.user.username + " post " + post_suivant.id );
                                    // Si 2 floods OU que le carton est déjà banni
                                    if ( post_suivant.user.points > -10 && post_suivant.user.points <= 100 && ( nbFlood >= 2 || post_suivant.user.ban == -1 ) ) {
                                        logModeration( 'Flood par up significatif détecté, par ' + post_suivant.user.username );
                                        // BAN
                                        if ( post_suivant.user.ban != -1 ) {
                                            await banForumeur( post_suivant.user.username, 'Up abusif' );
                                        }
                                        // LOCK TOPIC
                                        /*
                                        if ( topic.locked == false ) {
                                            await lockTopic( post.topic_id, tokenCSRF );
                                        }
                                        */
                                        // SUPRESSION
                                        await suppressionPost( post_suivant.id, post_suivant.topic_id, tokenCSRF );
                                    }
                                }
                            }
                        }

                        ////////////////////////
                        //  Détection de DDBS  |
                        ////////////////////////
                        if ( mode_rapide == false && mode_parametres[ "sw-mode-antiflood-ddb-flood" ] == true ) {
                            // Récupération de l'id du topic modé dans les parametres
                            let id_topic_mode = /https:\/\/avenoel\.org\/topic\/([0-9]+)/.exec( mode_parametres.lienTopicMode )[ 1 ];

                            // Si le post vient du topic de modération
                            if ( post.topic_id == id_topic_mode ) {
                                let motsClesDDB = [];
                                motsClesDDB.push( 'colis' );
                                motsClesDDB.push( 'sarah' );
                                motsClesDDB.push( 'puma' );
                                motsClesDDB.push( 'pumerde' );
                                motsClesDDB.push( 'sp' );
                                motsClesDDB.push( 'pedo' );
                                motsClesDDB.push( 'noban' );
                                let detectionDDB = false;
                                motsClesDDB.forEach( ( item, i ) => {
                                    if ( post.content.toLowerCase().includes( item.toLowerCase() ) ) {
                                        detectionDDB = true;
                                    }
                                } );
                                // Si le post contient un truc en rapport avec le flood
                                if ( detectionDDB ) {
                                    // Chercher le pseudo du floodeur dans le post ( https://avenoel.org/profil/FLOODEUR ou @FLOODEUR )
                                    try {
                                        let pseudo_floodeur = /(https:\/\/avenoel\.org\/index\.php\/profil\/|https:\/\/avenoel\.org\/profil\/|@)([A-z0-9-]+)/.exec( post.content )[ 2 ].toLowerCase();
                                        // Récupérer le compte correpondant au pseudo
                                        let compte = await getProfilParPseudo( pseudo_floodeur );
                                        if ( compte && compte.message_count <= 50 && compte.ban == 0 ) {
                                            logModeration( "Floodeur détecté par DDB : " + pseudo_floodeur );
                                            // ERADICATION
                                            await erradiquerForumeur( compte.id );
                                        }
                                    } catch ( e ) {
                                        // console.error(e);
                                    }
                                }
                            }
                        }

                        /////////////////////////////////////
                        //  Détection par simple blacklist  |
                        /////////////////////////////////////
                        if ( isBlacklisted_flood( post.content ) == 1 ) {
                            // Compter le nouveau flood de ce pseudo
                            let nbFlood = compterFlood( post.id, post.user.username );
                            logModeration( "Flood détecté (contenu blacklisté) (" + nbFlood + "), par " + post.user.username + " post " + post.id );
                            // Erradiquer si le compte n'est pas déjà banni, qu'il a moins de 200 points et qu'il a flood x fois
                            if ( post.user.ban == 0 && post.user.points < 50 && nbFlood >= 1 ) {
                                // ERADICATION
                                await erradiquerForumeur( post.user.id );
                            } else {
                                console.log( post.user );
                                console.log( "Erradication impossible. Compte déjà banni, ou de rang supérieur à carton" );
                                await suppressionPost( post.id, post.topic_id, tokenCSRF );
                            }

                        } else {
                            //////////////////////////////////////////////////////////////////
                            //  Détection par hashage perceptuel des images de la blacklist  |
                            //////////////////////////////////////////////////////////////////
                            isAdishoed( post.content ).then( async function ( isAdishoed ) {
                                if ( isAdishoed == 1 ) {
                                    // Compter le nouveau flood de ce pseudo
                                    let nbFlood = compterFlood( post.id, post.user.username );
                                    logModeration( "Flood détecté (hashage perceptuel) (" + nbFlood + "), par " + post.user.username + " post " + post.id );
                                    // Si le compte n'est pas déjà banni et qu'il est rang carton
                                    if ( post.user.ban == 0 && post.user.points < 200 && nbFlood >= 2 ) {
                                        // ERADICATION
                                        erradiquerForumeur( post.user.id );
                                    } else {
                                        console.log( post.user );
                                        console.log( "Erradication impossible. Compte déjà banni, ou de rang supérieur à carton" );
                                        await suppressionPost( post.id, post.topic_id, tokenCSRF );
                                    }
                                }
                            } );
                        }
                        //console.log( post );
                    }
                } ); // Fin foreach des posts
            } else {
                // Attendre si échec de la récupération des posts
                await sleep( 500 );
            }

        } // Fin fonction traitement des posts
    }

    function toggleModerationAuto() {
        let bouton = document.querySelector( '#btn-moderation-auto' );
        if ( moderationAutoActivee ) {
            // Désactiver
            moderationAutoActivee = false;
            bouton.innerText = 'Activation';
            bouton.classList.remove( 'ss-vert' );
            bouton.classList.add( 'ss-rouge' );
            // Remettre les btns de choix de méthode de modé
            setTimeout( function () {
                document.getElementById( 'ss-zone-methodes-mode' ).classList.remove( 'disabled' );
            }, 4000 );
            // Bloquer le bouton de modé auto et le remettre 4s plus tard
            document.getElementById( 'btn-moderation-auto' ).classList.add( 'disabled' );
            setTimeout( function () {
                document.getElementById( 'btn-moderation-auto' ).classList.remove( 'disabled' );
            }, 4000 );

        } else {
            // Activer
            moderationAutoActivee = true;
            bouton.innerText = 'En cours...';
            bouton.classList.remove( 'ss-rouge' );
            bouton.classList.add( 'ss-vert' );
            // Désactiver les btns de choix de méthode de modé
            document.getElementById( 'ss-zone-methodes-mode' ).classList.add( 'disabled' );
            // Bloquer le bouton de modé auto et le remettre 4s plus tard
            document.getElementById( 'btn-moderation-auto' ).classList.add( 'disabled' );
            setTimeout( function () {
                document.getElementById( 'btn-moderation-auto' ).classList.remove( 'disabled' );
            }, 4000 );

            saveParametresModeLocalStorage();
            moderationAuto_main();
        }
    }

    ///////////////////////////////////////////////////
    //          DERNIERS POSTS D'UN TOPIC             |
    ///////////////////////////////////////////////////
    var getPostsTopic = function ( id_topic, decalage, quantite_posts ) {
        return new Promise( function ( resolution, rejet ) {
            // Headers
            let headers = new Headers();
            let requestOptions = {
                method: 'GET',
                headers: headers,
                redirect: 'follow'
            };
            // Requête
            fetch( "https://avenoel.org/api/v1/topics/" + id_topic + "/messages?start=" + decalage + "&size=" + quantite_posts + "&reverse=1", requestOptions ).then( response => response.text() ).then( result => resolution( JSON.parse( result ).data ) ).catch( error => rejet( error ) );
        } );
    };

    ///////////////////////////////////////////////////
    //                 DERNIERS POSTS                 |
    ///////////////////////////////////////////////////
    var getPosts = function ( token, tokenStaff, decalage, nombre, withDetails ) {
        return new Promise( function ( resolution, rejet ) {
            // Headers
            let headers = new Headers();
            headers.append( "X-Authorization", token );
            headers.append( "X-Staff-Authorization", tokenStaff );
            let requestOptions = {
                method: 'GET',
                headers: headers,
                redirect: 'follow'
            };
            // Requête
            fetch( "https://avenoel.org/api/v1/messages?size=" + nombre + "&start=" + decalage + "&reverse=true&with_user=" + withDetails + "&with_topic=" + withDetails, requestOptions ).then( response => response.text() ).then( result => resolution( JSON.parse( result ).data ) ).catch( error => rejet( error ) );
        } );
    };

    ///////////////////
    //  BANNISSEMENT  |
    ///////////////////
    async function banForumeur( pseudo_forumeur, motif ) {

        logModeration( "Tentative de bannissement de " + pseudo_forumeur );

        let data = {
            username: pseudo_forumeur,
            reason: motif
        };

        $.ajax( {
            url: "https://avenoel.org/user/ban",
            type: "post",
            data: data,
            success: function () {
                logModeration( "Bannissement de " + pseudo_forumeur + " effectué" );
            },
            error: function () {
                logModeration( "Echec du bannissement de " + pseudo_forumeur );
            }
        } );
    }

    //////////////////
    //  ERADICATION  |
    //////////////////
    async function erradiquerForumeur( id_forumeur ) {

        logModeration( "Tentative d'erradication du forumeur n° " + id_forumeur );

        $.ajax( {
            url: "https://avenoel.org/user/" + id_forumeur + "/soft-destroy",
            type: "post",
            success: function () {
                logModeration( "Erradication du compte n° " + id_forumeur + " effectuée" );
            },
            error: function () {
                logModeration( "Echec de l'érradication du compte n° " + id_forumeur );
            }
        } );
    }
    async function erradiquerForumeurParPseudo( pseudo ) {
        // Récupération de l'id par le pseudo
        let profil = await getProfilParPseudo( pseudo );
        let id_forumeur = profil.id;
        // ERADICATION
        await erradiquerForumeur( id_forumeur );
        location.reload();
    }

    //////////////////////////
    //  SUPPRESSION DE POST  |
    //////////////////////////
    async function suppressionPost( id_post, id_topic, token ) {

        logModeration( "Tentative de suppression du post n° " + id_post );

        $.ajax( {
            url: "https://avenoel.org/message/" + id_post + "/delete/" + token,
            type: "get",
            error: function ( request, error ) {
                logModeration( "Echec de la supression du post n° " + id_post );
                console.error( error );
            },
            success: function () {
                logModeration( "Suppression du post n° " + id_post + " effectuée" );
            }
        } );
    }

    ///////////////////////////
    //  RESTAURATION DE POST  |
    ///////////////////////////
    async function restaurationPost( id_post, token ) {
        //logModeration( "Tentative de restauration du post n° " + id_post );
        $.ajax( {
            url: "https://avenoel.org/message/" + id_post + "/restore/" + token,
            type: "get",
            error: function ( request, error ) {
                //logModeration( "Echec de la restauration du post n° " + id_post );
                console.error( error );
            },
            success: function () {
                //logModeration( "Restauration du post n° " + id_post + " effectuée" );
                console.log( id_post + ' restauré' );
            }
        } );
    }

    ///////////////////////////
    //  SUPPRESSION DE TOPIC  |
    ///////////////////////////
    async function suppressionTopic( id_topic, token ) {

        logModeration( "Tentative de suppression du topic n° " + id_topic );

        $.ajax( {
            url: "https://avenoel.org/topic/" + id_topic + "/delete/" + token,
            type: "get",
            error: function ( request, error ) {
                logModeration( "Echec de la supression du topic n° " + id_topic );
                console.error( error );
            },
            success: function () {
                logModeration( "Suppression du topic n° " + id_topic + " effectuée" );
            }
        } );
    }

    ////////////////////
    //  LOCK DE TOPIC  |
    ////////////////////
    async function lockTopic( id_topic, token ) {

        logModeration( "Tentative de lock du topic n° " + id_topic );

        $.ajax( {
            url: "https://avenoel.org/topic/" + id_topic + "/lock/" + token,
            type: "get",
            error: function ( request, error ) {
                logModeration( "Echec du lock du topic n° " + id_topic );
                console.error( error );
            },
            success: function () {
                logModeration( "Lock du topic n° " + id_topic + " effectué" );
            }
        } );
    }

    /////////////////////////////////////////////////////////
    //  TESTER SI LA CHAINE CONTIENT UN ELEMENT BLACKLISTE  |
    /////////////////////////////////////////////////////////
    function isBlacklisted_flood( contenu ) {
        // MODE AUTO PAR BLACKLIST
        if ( mode_parametres[ "sw-mode-antiflood-blacklist" ] == true ) {
            // Parcourir la blacklist
            for ( let i = 0; i < mode_blacklist.length; ++i ) {
                // Si le post contient clairement un flood
                if ( contenu.toLowerCase().indexOf( mode_blacklist[ i ].toLowerCase() ) >= 0 ) {
                    return 1;
                }
            }
        }

        return 0;
    }
    async function isAdishoed( contenu ) {

        let trouve = 0;

        // MODO FLOOD AUTO D'IMAGES IMGUR
        if ( mode_rapide == false && mode_parametres[ "sw-mode-antiflood-hash-imgur" ] == true ) {

            // Si le post à analyser contiennent un lien Imgur
            if ( contenu.match( /(https:\/\/(i\.imgur\.com)\/([A-z0-9-]+)(\.png|\.jpg|\.jpeg|\.gif))/ ) ) {

                let urlImagePost = /(https:\/\/(i\.imgur\.com)\/([A-z0-9-]+)(\.png|\.jpg|\.jpeg|\.gif))/.exec( contenu )[ 1 ];

                // pHash
                var hashImgPost = await pHash( urlImagePost );

                // Si image similaire à une image BL...
                mode_hashs_perceptuels.forEach( async ( e ) => {
                    let difference_images = distance( e, hashImgPost );

                    /*
                    if ( urlImagePost == 'https://i.imgur.com/SdmNQaI.png' ) {
                        console.log( urlImagePost + " " + e + ' - Différence : ' + difference_images );
                    }
                    */

                    if ( difference_images < 10 ) {
                        trouve = 1;
                    }
                } );
            }
        }

        // MODE FLOOD AUTO D'IMAGES NOELSACK ET AVESHACK
        // ! NECESSITE UNE EXTENSION FORCANT LES ENTETES "ACCESS-CONTROL-ALLOW-ORIGIN" SUR LE NAVIGATEUR !
        if ( mode_rapide == false && mode_parametres[ "sw-mode-antiflood-hash-autres" ] == true ) {

            // Si le post à analyser contiennent un lien Aveshack ou Noelshack
            if ( contenu.match( /(https:\/\/(i\.aveshack\.com|image\.noelshack\.com)\/([\/A-z0-9-]+)(\.png|\.jpg|\.jpeg|\.gif))/ ) ) {

                let urlImagePost = /(https:\/\/(i\.aveshack\.com|image\.noelshack\.com)\/([\/A-z0-9-]+)(\.png|\.jpg|\.jpeg|\.gif))/.exec( contenu )[ 1 ];

                // pHash
                var hashImgPost = await pHash( urlImagePost );

                // Si image similaire à une image BL...
                mode_hashs_perceptuels.forEach( async ( e ) => {
                    let difference_images = distance( e, hashImgPost );

                    //console.log( e + ' - Différence : ' + difference_images );
                    if ( difference_images < 10 ) {
                        trouve = 1;
                    }
                } );
            }
        }
        return trouve;
    }

    //////////////////////
    //   COMPTER FLOOD   |
    //////////////////////
    function compterFlood( id_post, pseudo ) {
        // Concerver ce post s'il ne l'est pas déjà
        if ( compteur_floods_pseudos[ id_post ] == null ) {
            // Compter le premier flood
            compteur_floods_pseudos[ id_post ] = pseudo;
        }

        let nb_flood = 0;
        for ( let flood in compteur_floods_pseudos ) {
            if ( compteur_floods_pseudos.hasOwnProperty( flood ) ) {
                if ( compteur_floods_pseudos[ flood ] == pseudo ) {
                    nb_flood++;
                }
            }
        }

        return nb_flood;
    }

    ///////////////////////////////////////
    //  HASHER UNE IMAGE PAR URL (PHASH)  |
    ///////////////////////////////////////
    // Retourne le hash perceptuel d'une image via son URL
    async function pHash( url ) {
        // on récupère l'image
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;
        // on attend qu'elle charge
        await once( "load", img );

        // https://github.com/naptha/phash.js/blob/master/phash.js

        var size = 32,
            smallerSize = 8;

        var canvas = document.createElement( "canvas" ),
            ctx = canvas.getContext( "2d" );

        // document.body.appendChild(canvas)

        /* 1. Reduce size.
         * Like Average Hash, pHash starts with a small image.
         * However, the image is larger than 8x8; 32x32 is a good size.
         * This is really done to simplify the DCT computation and not
         * because it is needed to reduce the high frequencies.
         */

        canvas.width = size;
        canvas.height = size;
        // ctx.drawImage(img, 0, 0, size, size);
        ctx.drawImage( img, 0, -size, size, size * 3 );
        var im = ctx.getImageData( 0, 0, size, size );

        /* 2. Reduce color.
         * The image is reduced to a grayscale just to further simplify
         * the number of computations.
         */

        var vals = new Float64Array( size * size );
        for ( var i = 0; i < size; i++ ) {
            for ( var j = 0; j < size; j++ ) {
                var base = 4 * ( size * i + j );
                vals[size * i + j] = 0.299 * im.data[ base ] + 0.587 * im.data[base + 1] + 0.114 * im.data[base + 2];
            }
        }

        /* 3. Compute the DCT.
         * The DCT separates the image into a collection of frequencies
         * and scalars. While JPEG uses an 8x8 DCT, this algorithm uses
         * a 32x32 DCT.
         */

        function applyDCT2( N, f ) {
            // initialize coefficients
            var c = new Float64Array( N );
            for ( let i = 1; i < N; i++ )
                c[ i ] = 1;
            c[ 0 ] = 1 / Math.sqrt( 2 );

            // output goes here
            var F = new Float64Array( N * N );

            // construct a lookup table, because it's O(n^4)
            var entries = 2 * N * ( N - 1 );
            var COS = new Float64Array( entries );
            for ( let i = 0; i < entries; i++ )
                COS[ i ] = Math.cos( ( i / ( 2 * N ) ) * Math.PI );

            // the core loop inside a loop inside a loop...
            for ( let u = 0; u < N; u++ ) {
                for ( let v = 0; v < N; v++ ) {
                    let sum = 0;
                    for ( let i = 0; i < N; i++ ) {
                        for ( let j = 0; j < N; j++ ) {
                            sum += COS[( 2 * i + 1 ) * u] * COS[( 2 * j + 1 ) * v] * f[N * i + j];
                        }
                    }
                    sum *= ( c[ u ] * c[ v ] ) / 4;
                    F[N * u + v] = sum;
                }
            }
            return F;
        }

        var dctVals = applyDCT2( size, vals );

        // for(var x = 0; x < size; x++){
        //     for(var y = 0; y < size; y++){
        //         ctx.fillStyle = (dctVals[size * x + y] > 0) ? 'white' : 'black';
        //         ctx.fillRect(x, y, 1, 1)
        //     }
        // }
        /* 4. Reduce the DCT.
         * This is the magic step. While the DCT is 32x32, just keep the
         * top-left 8x8. Those represent the lowest frequencies in the
         * picture.
         */

        var vals = [];
        for ( let x = 1; x <= smallerSize; x++ ) {
            for ( var y = 1; y <= smallerSize; y++ ) {
                vals.push( dctVals[size * x + y] );
            }
        }

        /* 5. Compute the average value.
         * Like the Average Hash, compute the mean DCT value (using only
         * the 8x8 DCT low-frequency values and excluding the first term
         * since the DC coefficient can be significantly different from
         * the other values and will throw off the average).
         */

        var median = vals.slice( 0 ).sort( function ( a, b ) {
            return a - b;
        } )[Math.floor( vals.length / 2 )];

        /* 6. Further reduce the DCT.
         * This is the magic step. Set the 64 hash bits to 0 or 1
         * depending on whether each of the 64 DCT values is above or
         * below the average value. The result doesn't tell us the
         * actual low frequencies; it just tells us the very-rough
         * relative scale of the frequencies to the mean. The result
         * will not vary as long as the overall structure of the image
         * remains the same; this can survive gamma and color histogram
         * adjustments without a problem.
         */

        return vals.map( function ( e ) {
            return e > median
                ? "1"
                : "0";
        } ).join( "" );
    }

    async function once( name, ee ) {
        let resolve,
            reject;
        const p = new Promise( ( r, rr ) => {
            resolve = r;
            reject = rr;
        } );

        function onevent( data ) {
            ee.removeEventListener( "error", onerror );
            resolve( data );
        }

        function onerror( err ) {
            ee.removeEventListener( name, onevent );
            reject( err );
        }

        ee.addEventListener( name, onevent, { once: true } );
        ee.addEventListener( "error", onerror, { once: true } );

        return p;
    }
    // Similarité entre 2 hashs
    function distance( a, b ) {
        var dist = 0;
        for ( var i = 0; i < a.length; i++ )
            if ( a[ i ] != b[ i ] )
                dist++;
    return dist;
    }

    /////////////////////
    // LOG DE MODERATON |
    /////////////////////

    function logModeration( message ) {
        // Conservation de la ligne de log dans le localStorage
        localStorage_ajout( getHeure() + " : " + message, mode_logs, "ss_mode_logs" );
        console.log( getHeure() + " : " + message );

        // Affichage des logs
        majPannel_LogsMode();
    }

    //////////////////
    //  PARSE POSTS  |
    //////////////////
    async function parseMessageContent( content_to_parse ) {
        return new Promise( ( resolve, reject ) => {
            $.post( '/previsualisation', { content: content_to_parse } ).done( function ( body ) {
                if ( body.error !== null ) {
                    reject( body.error );
                } else {
                    resolve( body.content );
                }
            } );
        } );
    }

    //////////////////////
    //  OBTENIR L'HEURE  |
    //////////////////////
    function getHeure() {
        var mtn = new Date();
        var heure;
        if ( mtn.getMinutes() < 10 ) {
            return mtn.getHours() + ":0" + mtn.getMinutes() + ":" + mtn.getSeconds();
        } else {
            return mtn.getHours() + ":" + mtn.getMinutes() + ":" + mtn.getSeconds();
        }
    }

    ////////////////////////////
    //  GET PROFIL PAR PSEUDO  |
    ////////////////////////////
    var getProfilParPseudo = function ( pseudo ) {
        return new Promise( function ( resolution, rejet ) {
            let requestOptions = {
                method: 'GET',
                redirect: 'follow'
            };
            // Requête
            fetch( "https://avenoel.org/api/v1/users/username:" + pseudo, requestOptions ).then( response => response.text() ).then( result => resolution( JSON.parse( result ).data ) ).catch( error => rejet( error ) );
        } );
    };

    ////////////////
    //  INDEXEDDB  |
    ////////////////
    // https://www.tutorialspoint.com/html5/html5_indexeddb.htm
    // https://gist.github.com/JamesMessinger/a0d6389a5d0e3a24814b
    class SSDatabaseModo {
        // Return true if the browser supports IndexedDB
        static isSupported() {
            if ( window.indexedDB ) {
                return true;
            } else {
                return false;
            }
        }
        constructor( version ) {
            // Open (or create) the database
            this.request = indexedDB.open( "Stratoscript - Modo", version );
            // Update needed
            this.request.onupgradeneeded = function ( event ) {
                let db = event.target.result;
                // Schemas
                db.createObjectStore( "Posts", { keyPath: "id" } );
            };
        }
        // Posts
        posts_add( id, as_user, content, created_at, deleted, deleted_at, deleted_by_author, grade_class, moderable, original, topic, topic_id, updated_at, updated_by, user_id ) {
            let db = this.request.result;
            let tx = db.transaction( "Posts", "readwrite" );
            let store = tx.objectStore( "Posts" );

            store.put( {
                id: id,
                as_user: as_user,
                content: content,
                created_at: created_at,
                deleted: deleted,
                deleted_at: deleted_at,
                deleted_by_author: deleted_by_author,
                grade_class: grade_class,
                moderable: moderable,
                original: original,
                topic: topic,
                topic_id: topic_id,
                updated_at: updated_at,
                updated_by: updated_by,
                user_id: user_id
            } );
        }
        async posts_get() {
            return new Promise( ( resolve, reject ) => {
                let db = this.request.result;
                let tx = db.transaction( "Posts", "readonly" );
                let store = tx.objectStore( "Posts" );

                let db_messages = store.getAll();
                tx.oncomplete = ( e ) => {
                    resolve( db_messages.result );
                };
            } );
        }

        // Database close
        close() {
            let db = this.request.result;
            db.close();
        }
    }

    //========================================================================//

    /////////////////////
    //  INITIALISATION  |
    /////////////////////
    // Ajoute la fonction d'initialisation au onload, sans écraser la précédente
    addLoadEvent( function () {
        setTimeout( function () {
            initialisation();
        }, 100 );
    } );

} )();
