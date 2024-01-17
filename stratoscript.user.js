// ==UserScript==
// @name         Stratoscript
// @namespace    http://tampermonkey.net/
// @version      1.14.7
// @description  1.14.7 > Ajout Intégration Soundcloud
// @author       Stratosphere, StayNoided/TabbyGarf
// @match        https://avenoel.org/*
// @run-at       document-body
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
    var parametres = {};
    var blacklist_pseudos = [];
    var theme_noir = true;
    var mes_messages = {};
    let ssDatabase;

    const version = '1.14.7';

    /* ==========================================================
    |                                                           |
    |                      INITIALISATION                       |
    |                                                           |
    ========================================================== */

    function initialisation_preshot() {
        console.log( "Démarrage du Stratoscript..." );
        parametres = localStorage_chargement( "ss_parametres" );
        blacklist_pseudos = localStorage_chargement( "ss_blacklist_pseudos" );
        // IndexedDB
        ssDatabase = new SSDatabase( 1 );

        // Purger la BL si les données chargées sont dans un mauvais format
        function isObject( val ) {
            return val instanceof Object;
        }
        if ( blacklist_pseudos.length > 0 && !isObject( blacklist_pseudos[ 0 ] ) ) {
            blacklist_pseudos = [];
        }

        // TOUTES LES PAGES, SAUF LE PANNEL ADMIN
        if ( !path.startsWith( "/admin" ) ) {
            // Ajouter la zone du pannel de configuration du script dans la page
            let zonePannel = document.createElement( 'div' );
            zonePannel.setAttribute( "id", "stratoscriptPanel" );
            zonePannel.setAttribute( "class", "ss-panel-container" );
            document.querySelector( 'body' ).appendChild( zonePannel );
            // Virer de l'interface les éléments à l'abandon (sauf sur le profil)
            if ( parametres[ "sw-masquer-inutile" ] == true && !path.startsWith( "/profil" ) ) {
                virerTrucsAbandonnes();
            }
        }
        // TOPIC
        if ( path.startsWith( "/topic" ) || path.startsWith( "/index.php/topic" ) ) {
            // Appliquer la blacklist (1ère couche)
            appliquer_blacklist_posts( document );
        }
        // LISTE DES TOPICS
        if ( path.startsWith( "/forum" ) || path.startsWith( "/index.php/forum" ) ) {
            // Appliquer la blacklist (1ère couche)
            appliquer_blacklist_topics( document );
        }
        // PROFIL
        if ( path.startsWith( "/profil" ) ) {
            // Corriger les avatars étirés sur mobile
            let cssImgProfil = document.createElement( 'style' );
            cssImgProfil.setAttribute( "type", "text/css" );
            cssImgProfil.innerHTML = `
               .container-content .grid-cols-2 img
               {
                   max-height: 200px !important;
                   height: auto !important;
                   max-width: 100% !important;
               }
               `;
            document.querySelector( 'body' ).appendChild( cssImgProfil );
        }
    }

    async function initialisation() {
        // Script Twiter
        if ( parametres[ "sw-twitter" ] == true ) {
            var s = document.createElement( "script" );
            s.type = "text/javascript";
            s.src = "https://platform.twitter.com/widgets.js";
            s.async = true;
            document.head.append( s );
        }
        // Script Risibank
        if ( parametres[ "sw-risibank-officiel" ] == true ) {
            var s = document.createElement( "script" );
            s.type = "text/javascript";
            s.src = "https://risibank.fr/downloads/web-api/risibank.js";
            s.async = true;
            document.head.append( s );
        }

        // TOUTES LES PAGES, SAUF LE PANNEL ADMIN
        if ( !path.startsWith( "/admin" ) ) {
            // Ajouter les raccourcis pour mobile dans le dropdown de la navbar
            addMobileBtn( 'Mes messages', 'https://avenoel.org/mes-messages' );
            addMobileBtn( 'Topics favoris', 'https://avenoel.org/favoris' );
            addMobileBtn( 'Modération', 'https://avenoel.org/moderation' );
            // Créer le pannel de config du script
            creerPannelStratoscript();
            // Lecteurs Vocaroo, IssouTV, Webm etc...
            ajoutLecteursEtIntegrations(document.body);
            // Avatar anti-golem pour les sans-avatar
            sansAvatar_antiGolem();
            // Obtions supplémentaires dans le formulaire
            if ( parametres[ "sw-option-supplementaires" ] == true ) {
                ajoutBbcodesSupplementaires();
            }
            // Risibank officiel
            if ( parametres[ "sw-risibank-officiel" ] == true ) {
                ajoutRisibankOfficiel();
            }
        }
        // TOPIC
        if ( path.startsWith( "/topic" ) || path.startsWith( "/index.php/topic" ) ) {
            // Appliquer la blacklist (2ème couche)
            appliquer_blacklist_posts( document );

            if ( parametres[ "sw-refresh-posts" ] == true ) {
                ajoutAutorefreshPosts();
            }
            if ( parametres[ "sw-formulaire-posts" ] == true ) {
                // Mettre les events sur les citations permettant d'ouvrir le nv formulaire si on clic dessus
                preparation_nouveauFormulairePost();
                // Modification du formulaire d'envoi de posts
                nouveauFormulairePost();
            }
            if ( parametres[ "sw-recherche-posts" ] == true ) {
                ajoutRecherchePosts();
            }
            // Eviter la perte de nouveaux messages sur des topics lock ou supprimés
            if ( parametres[ "sw-prevoir-lock" ] == true ) {
                eviterPerteNouveauMessage();
            }
        }
        // LISTE DES TOPICS
        if ( path.startsWith( "/forum" ) || path.startsWith( "/index.php/forum" ) ) {
            // Appliquer la blacklist (2ème couche)
            appliquer_blacklist_topics( document );

            if ( parametres[ "sw-refresh-topics" ] == true && !path.startsWith( "/forum/recherche" ) ) {
                ajoutAutorefreshTopics();
            }
        }
        // MP
        if ( path.startsWith( "/messagerie/" ) || path.startsWith( "/index.php/messagerie/" ) ) {
            if ( parametres[ "sw-recherche-posts" ] == true ) {
                ajoutRechercheMPs();
            }

        } else if ( path.startsWith( "/messagerie" ) || path.startsWith( "/index.php/messagerie" ) ) {
            // LISTE DES MPS
            if ( parametres[ "sw-btn-quitter-mp" ] == true ) {
                ajoutBoutonQuitterMPs();
            }
        }
        // MES MESSAGES
        if ( path.startsWith( "/mes-messages" ) ) {
            ajoutRechercheMesMessages();
        }
        // PROFIL
        if ( path.startsWith( "/profil" ) ) {
            if ( parametres[ "sw-custom-profils" ] == true ) {
                assistant_profils();
            }

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

    ////////////////////////
    //  Interface - Topic  |
    ////////////////////////

    async function refreshPosts() {
        // Animation refresh
        document.querySelectorAll( '#btn-autorefresh-posts' ).forEach( function ( e ) {
            e.classList.add( "processing" );
        } );
        // Récupérer la liste des posts
        let url_topic = "https://avenoel.org" + path;
        let doc = await getDoc( url_topic );
        // Appliquer la blacklist
        appliquer_blacklist_posts( doc );
        // Stoper l'animation refresh
        document.querySelectorAll( '#btn-autorefresh-posts' ).forEach( function ( e ) {
            e.classList.remove( "processing" );
        } );

        // Affichage des posts
        document.querySelectorAll( '.topic-messages > article' ).forEach( function ( e ) {
            e.remove();
        } );
        doc.querySelectorAll( '.topic-messages > article' ).forEach( function ( e ) {
            document.querySelector( '.topic-messages' ).appendChild( e );
        } );
        // Affichage de la pagination
        document.querySelectorAll( '.pagination-topic > li' ).forEach( function ( e ) {
            e.remove();
        } );
        doc.querySelectorAll( '.pagination-topic' )[ 0 ].querySelectorAll( 'li' ).forEach( function ( e ) {
            document.querySelectorAll( '.pagination-topic' )[ 0 ].appendChild( e );
        } );
        doc.querySelectorAll( '.pagination-topic' )[ 1 ].querySelectorAll( 'li' ).forEach( function ( e ) {
            document.querySelectorAll( '.pagination-topic' )[ 1 ].appendChild( e );
        } );

        // Lecteurs Vocaroo, IssouTV, Webm etc...
        ajoutLecteursEtIntegrations(document.body);
        // Spoilers
        ajoutSpoilers();
        // Sans-avatar Anti-golems
        sansAvatar_antiGolem();
    }

    // Refresh et autorefresh
    async function autorefreshPosts( auto ) {
        if ( auto == 0 ) {
            // Simple refresh
            await refreshPosts();
            // Mettre en page les éventuels tweets si l'option est activée
            if ( parametres[ "sw-twitter" ] == true ) {
                await sleep( 500 );
                // Mettre en page les éventuels tweets si l'option est activée
                if ( parametres[ "sw-twitter" ] == true ) {
                    twttr.widgets.load();
                }
                // Mettre les events sur les citations permettant d'ouvrir le nv formulaire si on clic dessus
                if ( parametres[ "sw-formulaire-posts" ] == true ) {
                    preparation_nouveauFormulairePost();
                }

            }
        } else {
            // Boucle d'autorefresh
            while ( document.querySelector( '.btn-autorefresh-posts' ).classList.contains( 'btn-success' ) ) {
                await refreshPosts();
                await sleep( 500 );
                // Mettre en page les éventuels tweets si l'option est activée
                if ( parametres[ "sw-twitter" ] == true ) {
                    twttr.widgets.load();
                }
                // Mettre les events sur les citations permettant d'ouvrir le nv formulaire si on clic dessus
                if ( parametres[ "sw-formulaire-posts" ] == true ) {
                    preparation_nouveauFormulairePost();
                }
            }
        }
    }

    // Ajout de l'autorefresh sur les posts
    function ajoutAutorefreshPosts() {
        // Ajout du bouton d'autorefresh et suppression du bouton refresh normal
        document.querySelectorAll( '.glyphicon.glyphicon-refresh' ).forEach( function ( e ) {
            let ancienBoutonRefresh = e.parentNode;
            let boutonRefresh = document.createElement( 'a' );
            boutonRefresh.setAttribute( "id", "btn-autorefresh-posts" );
            boutonRefresh.setAttribute( "class", "btn-autorefresh-posts btn btn-grey" );
            boutonRefresh.setAttribute( "style", "font-size: .9em" );
            boutonRefresh.innerHTML = "<i class='glyphicon glyphicon-refresh'></i>";

            ancienBoutonRefresh.parentNode.insertBefore( boutonRefresh, ancienBoutonRefresh );
            ancienBoutonRefresh.remove();
        } );
        // Evenements
        let boutonsAutorefresh = document.querySelectorAll( "#btn-autorefresh-posts" );
        boutonsAutorefresh.forEach( function ( e ) {
            e.onclick = function () {
                // Si on clique sur le bouton pour couper l'auto-refresh...
                if ( !e.classList.contains( 'btn-grey' ) ) {
                    boutonsAutorefresh.forEach( function ( btn ) {
                        btn.classList.add( 'btn-grey' );
                        btn.classList.remove( 'btn-success' );
                    } );
                } else {
                    autorefreshPosts( 0 );
                }
            };
            e.ondblclick = function () {
                // Si on double-clique sur le bouton pour allumer l'auto-refresh...
                if ( e.classList.contains( 'btn-grey' ) ) {
                    boutonsAutorefresh.forEach( function ( btn ) {
                        btn.classList.add( 'btn-success' );
                        btn.classList.remove( 'btn-grey' );
                    } );
                    autorefreshPosts( 1 );
                }
            };
        } );
    }
    // Ajouter la recherche de posts à l'intérieur des topics
    function ajoutRecherchePosts() {
        let modalRecherche = '<!-- Fond modal--> <div id="ss-modal-recherche" class="ss-panel-background"> <!-- Modal --> <div class="ss-panel"> <!-- En-tête --> <div class="ss-panel-header"> <img src="https://media.discordapp.net/attachments/592805019590459403/1120881416989843587/NzyZTYz.png" alt="Stratoscript"> <span class="ss-panel-close">&times;</span> </div> <!-- Corps --> <div class="ss-panel-body"><div class="ss-col"> <!-- Filtres de recherche --> <div class="ss-mini-panel"> <h3>Filtres de recherche</h3> <div class="ss-row ss-space-childs ss-full-width"> <div class="ss-row ss-fill ss-space-childs"> <input type="text" class="ss-fill inputFiltreAuteur" style="height:36px;min-width:200px" placeholder="Auteur"> <input type="text" class="ss-fill inputFiltreContenu" style="height:36px;min-width:200px" placeholder="Contenu"> </div> <button id="btn-recherche" class="ss-btn ss-vert" type="button">Rechercher</button> </div> </div> <!-- Barre de progrssion --> <div class="ss-row" style="margin:0px 20px 20px 20px"> <div class="ss-progressbar ss-full-width" style="display:none"> <div class="ss-col" style="width:0%"></div> </div> </div><!-- Résultats de recherche --> <div class="ss-mini-panel"> <h3>Résultats de recherche</h3> <div class="ss-full-width zone-resultats-recherche ss-col" style="padding:10px"> </div> </div> </div></div> <!-- Footer --> <div class="ss-panel-footer"> <span class="label" id="ss-version">Version </span> <div class="ss-row"> <button type="button" class="ss-btn ss-panel-close">Fermer</button> </div></div> </div> <!-- Fin modal --> </div> <!-- Fin fond modal -->';

        let zoneRecherche = document.createElement( 'div' );
        zoneRecherche.setAttribute( "id", "zoneRecherche" );
        zoneRecherche.setAttribute( "class", "ss-panel-container" );
        zoneRecherche.innerHTML = modalRecherche;
        document.querySelector( 'body' ).appendChild( zoneRecherche );

        // Affichage de la version
        document.querySelectorAll( '#ss-version' ).forEach( ( e ) => {
            e.innerHTML = 'Version ' + version;
        } );

        // Ajout du bouton de recherche
        let btnRechercher = document.createElement( 'button' );
        btnRechercher.setAttribute( "style", "margin-right:3px" );
        btnRechercher.setAttribute( "class", "btn btn-primary btn-rechercher pull-right" );
        btnRechercher.innerText = 'Rechercher';
        document.querySelector( '.topic-moderation' ).append( btnRechercher );

        // Event - Clic sur le bouton de recherche
        document.getElementById( 'btn-recherche' ).onclick = function () {
            rechercheTopic();
        };

        // Event - Clic sur le bouton d'ouverture du panel de recherche
        document.querySelector( '.btn-rechercher' ).onclick = function () {
            let modal = document.getElementById( "ss-modal-recherche" );
            modal.style.display = "flex";
        };

        // Event - Clic sur un bouton de fermeture du panel de recherche
        document.querySelectorAll( '#ss-modal-recherche .ss-panel-close' ).forEach( ( e ) => {
            e.onclick = function () {
                let modal = document.getElementById( "ss-modal-recherche" );
                modal.style.display = "none";
            };
        } );

        async function rechercheTopic() {
            let progressbar = document.querySelector( "#ss-modal-recherche .ss-progressbar" );
            let filtre_auteur = document.querySelector( '#ss-modal-recherche .inputFiltreAuteur' ).value.toLowerCase().trim();
            let filtre_contenu = document.querySelector( '#ss-modal-recherche .inputFiltreContenu' ).value.toLowerCase().trim();

            let pagination = document.querySelector( '.pagination-topic ' ).querySelectorAll( 'li' );
            let page_max = pagination[pagination.length - 2].innerText;
            let id_topic = /topic\/([0-9]+)-/.exec( path )[ 1 ];

            // Vider la liste
            document.querySelector( '.zone-resultats-recherche' ).innerHTML = '';

            // Parcourir les pages
            for ( let page = 1; page <= page_max; page++ ) {
                let url = 'https://avenoel.org/topic/' + id_topic + '-' + page + '-';
                let doc = await getDoc( url );
                // Parcourir les posts
                doc.querySelectorAll( '.topic-messages > .topic-message' ).forEach( function ( e ) {
                    let auteur = e.querySelector( '.message-username ' ).innerText.toLowerCase().trim();
                    let contenu = e.querySelector( '.message-content ' ).innerText.toLowerCase().trim();
                    // Si les filtres matchent
                    if ( !( contenu.indexOf( filtre_contenu ) == -1 ) && ( auteur == filtre_auteur || filtre_auteur == "" ) ) {
                        document.querySelector( '.zone-resultats-recherche' ).append( e );
                    }
                } );
                // Affichage progressbar
                let pourcentage = Math.ceil( page * 100 / page_max );
                progressbar.style.display = "block";
                progressbar.children[ 0 ].setAttribute( "style", "width:" + pourcentage + "%" );
                progressbar.children[ 0 ].innerText = pourcentage + '%';
            }
            // Cacher progressbar
            progressbar.style.display = "none";
        }
    }

    // Eviter la perte de nouveaux messages sur des topics lock ou supprimés
    function eviterPerteNouveauMessage() {
        let form = document.querySelector( 'form#form' )
        form.addEventListener( 'submit', async ( e ) => {
            e.preventDefault();
            // Récupérer l'id du topic courant
            let id_topic = /topic\/([0-9]+)-/.exec( path )[ 1 ];
            // Tenter de récup le topic
            let topic = await getDoc( 'https://avenoel.org/topic/' + id_topic + '-1' );
            // Si topic récupéré (topic pas suppr)
            if ( topic && topic.querySelector( 'div.topic-messages' ) ) {
                if ( topic.querySelector( 'form#form' ) ) {
                    // Si le formulaire existe (topic pas lock)
                    form.submit();
                } else {
                    alert( 'Le topic est lock !' );
                }
            } else {
                alert( 'Le topic est supprimé !' );
            }
        } );
    }

    // Mettre les events sur les citations permettant d'ouvrir le nv formulaire si on clic dessus
    function preparation_nouveauFormulairePost() {
        // Event - Clic sur un bouton de citation d'un post
        document.querySelectorAll( '.message-quote' ).forEach( function ( e ) {
            e.onclick = function () {
                // Ouvrir le formulaire de post
                document.querySelector( '.btn-agrandir' ).click();
            };
        } );
    }

    // Modification du formulaire d'envoi de posts
    function nouveauFormulairePost() {
        let envoiFormulaire = false;

        // Zone du formulaire
        let zone = document.createElement( 'div' );
        zone.setAttribute( "style", "z-index: 1031; position:fixed;bottom:5px;padding:10px;height:50px" );
        zone.setAttribute( "class", "container-content container zoneNouveauFormulairePosts" );
        let section = document.createElement( 'section' );
        section.setAttribute( "style", "resize: horizontal;max-height:80vh;box-shadow: 0px 0px 5px black;overflow-y: auto;border:1px solid #d8d8d6" );
        section.setAttribute( "class", "hidden-xs hidden-sm-12 col-md-9" );
        zone.append( section );
        let form = document.querySelector( 'form#form' );
        section.append( form );
        document.querySelector( '.main-container' ).append( zone );
        // Zone des boutons du formulaire
        let reponse_actions = document.createElement( 'div' );
        reponse_actions.setAttribute( "class", "reponse-actions" );
        reponse_actions.setAttribute( "style", "position:absolute; top:4px; right:20px" );
        // Boutons du formulaire
        let reponse_agrandir = document.createElement( 'a' );
        reponse_agrandir.setAttribute( "class", "btn-agrandir btn btn-primary" );
        reponse_agrandir.setAttribute( "title", "Agrandir" );
        reponse_agrandir.setAttribute( "style", "height:35px;margin-left:5px" );
        reponse_agrandir.innerHTML = '<span class="glyphicon glyphicon-plus"></span>';
        reponse_actions.append( reponse_agrandir );
        let reponse_reduire = document.createElement( 'a' );
        reponse_reduire.setAttribute( "class", "btn-reduire btn btn-primary hidden" );
        reponse_reduire.setAttribute( "title", "Réduire" );
        reponse_reduire.setAttribute( "style", "height:35px;margin-left:5px" );
        reponse_reduire.innerHTML = '<span class="glyphicon glyphicon-minus"></span>';
        reponse_actions.append( reponse_reduire );
        form.append( reponse_actions );

        // Charger le brouillon s'il existe
        let brouillon = localStorage_chargement( "ss_brouillon" );
        document.querySelector( '.zoneNouveauFormulairePosts textarea' ).value = brouillon;

        // Event - Clic sur le bouton d'agrandissement
        reponse_reduire.onclick = function () {
            if ( form.querySelector( '.form-group.preview' ).getAttribute( "style" ) == "display: block;" ) {
                form.querySelector( '.form-group.preview' ).setAttribute( "style", "display:none" );
            } else {
                zone.setAttribute( "style", "z-index: 1031; position:fixed;bottom:5px;padding:10px;height:50px" );
                reponse_reduire.classList.add( 'hidden' );
                reponse_agrandir.classList.remove( 'hidden' );
            }
        };
        // Event - Clic sur le bouton de réduction
        reponse_agrandir.onclick = function () {
            if ( zone.getAttribute( "style" ) == "z-index: 1031; position:fixed;bottom:5px;padding:10px;height:50px" ) {
                zone.setAttribute( "style", "z-index: 1031; position:fixed;bottom:5px;padding:10px" );
                reponse_reduire.classList.remove( 'hidden' );
                reponse_agrandir.classList.add( 'hidden' );
            }
        };

        // Mémoriser le contenu du post en tant que brouillon, si la page est quittée avec le forumaire non vide
        window.onbeforeunload = function ( event ) {
            if ( envoiFormulaire == false ) {
                let saisie = document.querySelector( '.zoneNouveauFormulairePosts textarea' ).value;
                // Save le brouillon
                localStorage.setItem( "ss_brouillon", JSON.stringify( saisie ) );
            }
        };
        // Supprimer le brouillon si le post est envoyé
        document.querySelector( '.zoneNouveauFormulairePosts form' ).onsubmit = function () {
            envoiFormulaire = true;
            localStorage.setItem( "ss_brouillon", null );
        };

        ////////////////////////////////
        //  Drag & drop du formulaire  |
        ////////////////////////////////

        var contextmenu = document.querySelector( '.zoneNouveauFormulairePosts' );
        var initX,
            initY,
            mousePressX,
            mousePressY;

        contextmenu.addEventListener( 'mousedown', function ( event ) {
            // Drag & drop seulement si on chope le titre et si le formulaire n'est pas réduit
            if ( !event.target.classList.contains( 'bloc-title' ) || !reponse_agrandir.classList.contains( 'hidden' ) ) {
                return;
            }

            initX = this.offsetLeft;
            initY = this.offsetTop;
            mousePressX = event.clientX;
            mousePressY = event.clientY;

            this.addEventListener( 'mousemove', repositionElement, false );

            window.addEventListener( 'mouseup', function () {
                contextmenu.removeEventListener( 'mousemove', repositionElement, false );
            }, false );

        }, false );

        function repositionElement( event ) {
            this.style.left = initX + event.clientX - mousePressX + 'px';
            this.style.top = initY + event.clientY - mousePressY + 'px';
        }

        /*
        console.log( 'offset left : ', document.getElementById( "contextMenu" ).offsetLeft );
        console.log( 'offset top : ', document.getElementById( "contextMenu" ).offsetTop );
        console.log( 'offset width : ', document.getElementById( "contextMenu" ).offsetWidth );
        console.log( 'offset height : ', document.getElementById( "contextMenu" ).offsetHeight );
        */
    }

    // Appliquer la blacklist sur les posts
    async function appliquer_blacklist_posts( page ) {
        let niveau_blocage = 2;
        if ( parametres[ "ss-rg-blacklist-forumeurs" ] != null && parametres[ "ss-rg-blacklist-forumeurs" ] != '' ) {
            niveau_blocage = parametres[ "ss-rg-blacklist-forumeurs" ];
        }
        // Couleur du post
        let prochain_post_bleu = true;
        // Parcourir tous les messages du topic
        page.querySelectorAll( '.topic-messages > article' ).forEach( function ( e ) {

            // Appliquer la blacklist de pseudos
            if ( e.querySelector( '.message-username' ) ) {
                let pseudo = e.querySelector( '.message-username a' ).textContent.replace( /(\r\n|\n|\r)/gm, "" ).trim();
                blacklist_pseudos.forEach( function ( e_blackist, i ) {
                    // Si l'auteur du post est BL
                    if ( pseudo == e_blackist.pseudo ) {
                        // Si l'auteur du post est BL
                        if ( e_blackist.blocage_posts == 2 ) {
                            e.querySelector( '.message-content' ).textContent = ' [ Contenu blacklisté ] ';
                            e.setAttribute( 'style', 'background-color: rgba(247,24,24,.2)' );
                        } else if ( e_blackist.blocage_posts == 3 ) {
                            e.innerHTML = '<div style="margin:10px; text-align:center;width:100%"> [ Contenu blacklisté ] </div>';
                            e.setAttribute( 'style', 'background-color: rgba(247,24,24,.2)' );
                        } else if ( e_blackist.blocage_posts == 4 ) {
                            e.remove();
                            // Màj couleur post
                            prochain_post_bleu = !prochain_post_bleu;
                        }
                    }
                } );
                // Gérer les couleurs des posts en cas de suppression
                if ( prochain_post_bleu && !e.classList.contains( 'odd' ) ) {
                    e.classList.add( 'odd' );
                }
                if ( !prochain_post_bleu && e.classList.contains( 'odd' ) ) {
                    e.classList.remove( 'odd' );
                }
                // Màj couleur post
                prochain_post_bleu = !prochain_post_bleu;
            }
        } );

        // Parcourir toutes les citations du topic
        page.querySelectorAll( 'blockquote' ).forEach( function ( e ) {
            // Appliquer la blacklist de pseudos
            if ( e.querySelector( '.message-content-quote-author' ) ) {
                let pseudo = e.querySelector( '.message-content-quote-author' ).textContent.replace( /(\r\n|\n|\r)/gm, "" ).trim();

                blacklist_pseudos.forEach( function ( e_blackist, i ) {
                    // Si l'auteur du post est BL
                    if ( pseudo == e_blackist.pseudo ) {
                        // Si l'auteur du post est BL
                        if ( e_blackist.blocage_citations == 2 ) {
                            let pseudo_cite = document.querySelector( 'blockquote' ).querySelector( '.message-content-quote-caption' );
                            let div = document.createElement( 'div' );
                            div.innerText = '[ Contenu blacklisté ]';
                            e.innerHTML = "";
                            e.appendChild( pseudo_cite );
                            e.appendChild( div );
                        } else if ( e_blackist.blocage_citations == 3 ) {
                            e.textContent = " [ Contenu blacklisté ] ";
                        } else if ( e_blackist.blocage_citations == 4 ) {
                            e.parentNode.parentNode.parentNode.remove();
                        }
                    }
                } );
            }
        } );

    }

    // Intégrations
    function ajoutLecteursEtIntegrations(container) {
        // Trouver tous les URLs dans les posts
        document.querySelectorAll( '.message-content a' ).forEach( async function ( e ) {

            let url = e.getAttribute( 'href' );

            // Correction d'URL
            if ( parametres[ "sw-corr-url-odysee" ] == true ) {
                // Si le lien est un lien de profil (@Forumeur), immédiatement précédé d'un autre lien normal
                if ( document.location.host == e.host && e.previousSibling != null ) {
                    let previous = e.previousSibling;
                    let next = e.nextSibling;
                    if ( previous.className == "apercite" ) {
                        // Corriger le lien
                        let nouvelURL = previous.querySelector( 'a' ).href + e.text + next.textContent.split( " " )[ 0 ];
                        e.href = nouvelURL;
                        e.textContent = nouvelURL;
                        // Retirer le lien précedent
                        previous.remove();
                        // Retirer du texte suivant ce qui a été ajouté au lien
                        if ( next.textContent.split( " " )[ 0 ] ) {
                            if ( next.textContent.split( " " )[ 1 ] != undefined && next.textContent.split( " " )[ 1 ] != null ) {
                                next.textContent = " " + next.textContent.split( " " )[ 1 ];
                            } else {
                                next.textContent = "";
                            }
                        }
                    }
                }

                let urlCorrige = e.getAttribute( 'href' );

                // Odysee - Lecteurs
                if ( parametres[ "sw-odysee" ] == true && urlCorrige.match( /https:\/\/odysee\.com\/(@.+)\/(.+:.+)/ ) ) {
                    // Créer le lecteur
                    let lecteurOdysee = document.createElement( "iframe" );
                    let id_video = /https:\/\/odysee\.com\/(@.+)\/(.+:.+)/.exec( urlCorrige )[ 2 ];
                    lecteurOdysee.setAttribute( "id", "lbry-iframe" );
                    lecteurOdysee.setAttribute( "width", "380" );
                    lecteurOdysee.setAttribute( "height", "214" );
                    lecteurOdysee.setAttribute( "src", "https://odysee.com/$/embed/" + id_video );
                    lecteurOdysee.setAttribute( "allowfullscreen", "allowfullscreen" );
                    // Ramplacer le lien par le lecteur
                    e.parentNode.replaceChild( lecteurOdysee, e );
                }

                // Tiktok - Lecteurs
                if ( parametres[ "sw-tiktok" ] == true && urlCorrige.match( /(https:\/\/www\.tiktok\.com\/@(?:.+)\/video\/(?:[0-9]+))/ ) ) {
                    let id_video = urlCorrige.match( /(https:\/\/www\.tiktok\.com\/@(?:.+)\/video\/([0-9]+))/ )[ 2 ];
                    let iframeTiktok = document.createElement( 'iframe' );
                    iframeTiktok.style.width = 'auto';
                    iframeTiktok.frameBorder = "0";
                    iframeTiktok.height = '500';
                    iframeTiktok.src = 'https://www.tiktok.com/embed/' + id_video;
                    // Ramplacer le lien par le lecteur
                    e.parentNode.replaceChild( iframeTiktok, e );
                }
                // Streamable - Lecteurs
                if (parametres["sw-streamable"] == true && urlCorrige.match(/https:\/\/(staging\.)?streamable\.com\/(\w+)/)) {
                    let isStaging = urlCorrige.includes("staging."); // Check if it's staging or not
                    let videoId = urlCorrige.match(/https:\/\/(staging\.)?streamable\.com\/(\w+)/)[2];
                    let embedUrl = isStaging ? 'https://staging.streamable.com/e/' : 'https://streamable.com/e/';

                    let iframeStreamable = document.createElement('iframe');
                    iframeStreamable.setAttribute('width', '380');
                    iframeStreamable.setAttribute('height', '214');
                    iframeStreamable.setAttribute('frameborder', '0');
                    iframeStreamable.setAttribute('allowfullscreen', 'allowfullscreen');
                    iframeStreamable.src = embedUrl + videoId;

                    // Replace the link with the embedded player
                    e.parentNode.replaceChild(iframeStreamable, e);
                }
                // YouTube Shorts - Embed as regular YouTube videos
                if (parametres["sw-youtube-shorts"] == true && urlCorrige.match(/https:\/\/www\.youtube\.com\/shorts\/(\w+)/)) {
                    let shortVideoId = urlCorrige.match(/https:\/\/www\.youtube\.com\/shorts\/(\w+)/)[1];
                    let embedUrl = 'https://www.youtube.com/embed/' + shortVideoId;

                    let iframeYouTube = document.createElement('iframe');
                    iframeYouTube.setAttribute('width', '380');
                    iframeYouTube.setAttribute('height', '214');
                    iframeYouTube.setAttribute('frameborder', '0');
                    iframeYouTube.setAttribute('allowfullscreen', 'allowfullscreen');
                    iframeYouTube.src = embedUrl;

                    // Replace the Shorts link with the embedded YouTube player
                    e.parentNode.replaceChild(iframeYouTube, e);
                }
                // Spotify - Embeds
                if (parametres["sw-spotify"] == true) {
                    const spotifyPatterns = {
                        track: /https:\/\/open\.spotify\.com\/.*?track\/(\w+)/,
                        album: /https:\/\/open\.spotify\.com\/.*?album\/(\w+)/,
                        playlist: /https:\/\/open\.spotify\.com\/.*?playlist\/(\w+)/,
                        artist: /https:\/\/open\.spotify\.com\/.*?artist\/(\w+)/,
                        episode: /https:\/\/open\.spotify\.com\/.*?episode\/(\w+)/,
                        show: /https:\/\/open\.spotify\.com\/.*?show\/(\w+)/,
                    };

                    for (const [type, pattern] of Object.entries(spotifyPatterns)) {
                        const match = urlCorrige.match(pattern);
                        if (match) {
                            const id = match[1];
                            const src = `https://open.spotify.com/embed/${type}/${id}`;
                            const iframe = createSpotifyIframe(src);
                            replaceLinkWithEmbed(e, iframe);
                            break; // Stop processing after the first match
                        }
                    }
                }

                // Function to create a Spotify iframe
                function createSpotifyIframe(src) {
                    const iframe = document.createElement('iframe');
                    iframe.setAttribute('src', src);
                    iframe.setAttribute('width', '380');
                    iframe.setAttribute('height', '180');
                    iframe.setAttribute('frameborder', '0');
                    iframe.setAttribute('allowtransparency', 'true');
                    iframe.setAttribute('allow', 'encrypted-media');
                    return iframe;
                }

                // Function to replace the link with the embedded player
                function replaceLinkWithEmbed(linkElement, iframeElement) {
                    linkElement.parentNode.replaceChild(iframeElement, linkElement);
                    // Empecher le preview de base a la con
                    linkElement.parentNode.remove();
                }

                // SoundCloud - Embeds
                if (parametres["sw-soundcloud"] == true && urlCorrige.match(/https:\/\/soundcloud\.com\/(\S+)\/(\S+)/)) {
                    let username = urlCorrige.match(/https:\/\/soundcloud\.com\/(\S+)\/(\S+)/)[1];
                    let trackSlug = urlCorrige.match(/https:\/\/soundcloud\.com\/(\S+)\/(\S+)/)[2];
                    let trackUrl = `https://soundcloud.com/${username}/${trackSlug}`;

                    // Create iframe
                    let iframeSoundCloud = document.createElement('iframe');
                    iframeSoundCloud.setAttribute('width', '100%');
                    iframeSoundCloud.setAttribute('height', '166');
                    iframeSoundCloud.setAttribute('frameborder', 'no');
                    iframeSoundCloud.setAttribute('scrolling', 'no');
                    iframeSoundCloud.setAttribute('allow', 'autoplay');
                    iframeSoundCloud.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}&color=%236c6c6c&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;

                    // Replace the link with the embedded player and metadata
                    e.parentNode.replaceChild(iframeSoundCloud, e);
                }

            }

            // Event listener for spoiler-btn clicks
            document.querySelectorAll('.spoiler-btn').forEach(function (spoilerBtn) {
                spoilerBtn.addEventListener('click', function () {
                    // Find the closest parent with the class 'spoiler'
                    let spoilerContainer = spoilerBtn.closest('.spoiler');

                    // Check if a spoiler-container was found
                    if (spoilerContainer) {
                        // Find the associated spoiler-content div
                        setTimeout(function () {
                        let spoilerContent = spoilerContainer.querySelector('.spoiler-content');

                        // Parse and embed links within the spoiler-content
                        ajoutLecteursEtIntegrations(spoilerContent);
                        }, 1000);
                    }
                });
            });

            // Posts d'AVN
            if ( parametres[ "sw-posts-url" ] == true && url.match( /((https:\/\/avenoel\.org\/index\.php\/message\/|https:\/\/avenoel\.org\/index\.php\/topic\/.+#|https:\/\/avenoel\.org\/message\/|https:\/\/avenoel\.org\/topic\/.+#)([0-9]+))/ ) ) {
                // Récupérer le post
                let id_post = /((https:\/\/avenoel\.org\/index\.php\/message\/|https:\/\/avenoel\.org\/index\.php\/topic\/.+#|https:\/\/avenoel\.org\/message\/|https:\/\/avenoel\.org\/topic\/.+#)([0-9]+))/.exec( url )[ 3 ];
                let url_post = 'https://avenoel.org/' + indexPhp + 'message/' + id_post;
                let doc_post = await getDoc( url_post );
                // Créer le post
                let postIntegre;
                if ( doc_post.querySelector( '.topic-message' ) != null ) {
                    postIntegre = doc_post.querySelector( '.topic-message' ).cloneNode( true );
                    postIntegre.setAttribute( "style", "margin:10px" );
                    // Gérer la couleur du post
                    if ( !e.parentNode.parentNode.parentNode.parentNode.classList.contains( 'odd' ) ) {
                        postIntegre.setAttribute( "class", "flex row topic-message odd" );
                    } else if ( e.parentNode.parentNode.parentNode.parentNode.classList.contains( 'odd' ) ) {
                        postIntegre.setAttribute( "class", "flex row topic-message" );
                    }

                } else {
                    postIntegre = document.createElement( "div" );
                    postIntegre.setAttribute( "class", "topic-message message-deleted" );
                    postIntegre.setAttribute( "style", "margin:10px; padding:5px; display: flex;align-items: center;justify-content: center;" );
                    postIntegre.textContent = 'Message introuvable';
                }
                // Ajouter le post
                e.parentNode.parentNode.insertBefore( postIntegre, e.parentNode );
                // Supprimer le lien et un <br> en dessous
                e.parentNode.remove();
            }

            // IssouTV
            if ( parametres[ "sw-issoutv" ] == true && url.match( /(https:\/\/(issoutv\.com)(.+)\/(.+))/ ) ) {
                // Gérer l'URL IssouTV
                let path_video = "https://issoutv.com/storage/videos/";
                let id_video = /(https:\/\/(issoutv\.com)(.+)\/(.+))/.exec( url )[ 4 ];
                let url_video = path_video + id_video;
                if ( !url_video.match( /.+\.mp4|.+\.webm/ ) ) {
                    url_video += ".webm";
                }
                // Créer le lecteur
                let video = document.createElement( "video" );
                video.setAttribute( "src", url_video + "#t=0.1" );
                video.setAttribute( "controls", "" );
                video.setAttribute( "width", "380" );
                video.setAttribute( "height", "214" );
                video.setAttribute( "preload", "metadata" );
                video.setAttribute( "style", "background-color: black" );
                // Ramplacer le lien par le lecteur
                e.parentNode.parentNode.replaceChild( video, e.parentNode );
                // En cas de 404, afficher un 404 Larry, cliquable et menant vers le lien mort
                video.onerror = function () {
                    let lien404 = document.createElement( "a" );
                    lien404.setAttribute( "href", url );
                    let image404 = document.createElement( "img" );
                    image404.setAttribute( "src", "https://i.imgur.com/nfy6qFK.jpg" );
                    lien404.appendChild( image404 );
                    // Remplacer la video par le lien
                    video.parentNode.replaceChild( lien404, video );
                };

            } else {
                // .WEBM et .MP4
                if ( parametres[ "sw-mp4-webm" ] == true && url.match( /(https:\/\/(.+)(\.mp4|\.webm))/ ) ) {
                    // Gérer l'URL
                    let url_video = /(https:\/\/(.+)(\.mp4|\.webm))/.exec( url )[ 1 ];
                    // Créer le lecteur
                    let video = document.createElement( "video" );
                    video.setAttribute( "src", url_video + "#t=0.1" );
                    video.setAttribute( "controls", "" );
                    video.setAttribute( "width", "380" );
                    video.setAttribute( "height", "214" );
                    video.setAttribute( "preload", "metadata" );
                    video.setAttribute( "style", "background-color: black" );
                    // Ramplacer le lien par le lecteur
                    e.parentNode.parentNode.replaceChild( video, e.parentNode );
                    // En cas de 404, afficher un 404 Larry, cliquable et menant vers le lien mort
                    video.onerror = function () {
                        let lien404 = document.createElement( "a" );
                        lien404.setAttribute( "href", url );
                        let image404 = document.createElement( "img" );
                        image404.setAttribute( "src", "https://i.imgur.com/nfy6qFK.jpg" );
                        lien404.appendChild( image404 );
                        // Remplacer la video par le lien
                        video.parentNode.replaceChild( lien404, video );
                    };
                }
            }

            // Twitter
            if ( parametres[ "sw-twitter" ] == true && url.match( /(https:\/\/twitter\.com\/|https:\/\/mobile\.twitter\.com\/)(.+)\/status\/([0-9]+)/ ) ) {
                let htmlTweet;
                let id_compte = /(https:\/\/twitter\.com\/|https:\/\/mobile\.twitter\.com\/)(.+)\/status\/([0-9]+)/.exec( url )[ 2 ];
                let id_tweet = /(https:\/\/twitter\.com\/|https:\/\/mobile\.twitter\.com\/)(.+)\/status\/([0-9]+)/.exec( url )[ 3 ];
                await $.ajax( {
                    type: "GET",
                    url: "https://publish.twitter.com/oembed?url=https://twitter.com/" + id_compte + "/status/" + id_tweet,
                    dataType: "jsonp",
                    success: function ( retour ) {
                        htmlTweet = retour.html;
                        // Ramplacer le lien par le tweet
                        e.parentNode.innerHTML = htmlTweet;
                    }
                } );
            }

            // PornHub
            if ( parametres[ "sw-pornhub" ] == true && url.match( /(https:\/\/fr\.pornhub\.com\/view_video\.php\?viewkey=(.{15}))/ ) ) {
                // Créer le lecteur
                let lecteurPornHub = document.createElement( "iframe" );
                let id_video = /(https:\/\/fr\.pornhub\.com\/view_video\.php\?viewkey=(.{15}))/.exec( url )[ 2 ];
                lecteurPornHub.setAttribute( "width", "380" );
                lecteurPornHub.setAttribute( "height", "214" );
                lecteurPornHub.setAttribute( "src", "https://www.pornhub.com/embed/" + id_video );
                lecteurPornHub.setAttribute( "frameborder", "0" );
                lecteurPornHub.setAttribute( "allowfullscreen", "" );
                // Ajouter le lecteur
                e.parentNode.parentNode.insertBefore( lecteurPornHub, e.parentNode );
                // Supprimer le lien
                e.parentNode.remove();
            }
        } );
    }

    // Spoilers
    function ajoutSpoilers() {
        // Parcourir et préparer les spoilers
        document.querySelectorAll( 'spoiler' ).forEach( function ( e ) {
            e.setAttribute( "class", "spoiler" );
            // Contenu du spoiler
            let contenu = e.cloneNode( true );
            contenu.setAttribute( "class", "spoiler-content" );
            contenu.style.display = 'none';
            // Vider
            while ( e.firstChild ) {
                e.removeChild( e.firstChild );
            }
            // Bouton du spoiler
            let bouton = document.createElement( 'div' );
            bouton.setAttribute( "class", "spoiler-btn" );
            bouton.textContent = '[Afficher]';

            e.appendChild( bouton );
            e.appendChild( contenu );
        } );

        // Parcourir les boutons spoilers
        document.querySelectorAll( ".spoiler-btn" ).forEach( function ( e ) {
            // Event - Clic sur un spoiler...
            e.onclick = function () {
                if ( e.textContent == '[Afficher]' ) {
                    e.textContent = '[Cacher]';
                    e.nextSibling.style.display = 'block';
                } else {
                    e.textContent = '[Afficher]';
                    e.nextSibling.style.display = 'none';
                }
            };
        } );
    }

    // Ajouter le Risibank officiel
    function ajoutRisibankOfficiel() {
        // Ouverture de la popup risibank
        function openRisiBank() {
            let viewport = document.querySelector( "meta[name=viewport]" );
            viewport.setAttribute( 'content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0' );

            RisiBank.activate( {
                type: 'overlay',
                /**
                 * Theme to use for the embed
                 * @type {undefined|'light'|'dark'|'light-old'}
                 */
                theme: 'dark',
                /**
                 * Media size in the embed. Default is md.
                 * @type {'sm'|'md'|'lg'}
                 */
                mediaSize: 'md',
                /**
                * Bottom navigation navbar size. Default is md.
                * @type {'sm'|'md'|'lg'}
                */
                navbarSize: 'lg',
                /**
                 * Default tab to show. If chosing a non-existent tab, will show the most popular.
                 * @type {'search' | 'fav' | 'hot' | 'top' | 'new' | 'rand'}
                 */
                showCopyButton: false,
                defaultTab: 'top',
                showNSFW: true,
                allowUsernameSelection: true,
                onSelectMedia: RisiBank.addSourceImageToTextArea( 'textarea[data-active-textarea]' )
            } );
        }

        document.querySelectorAll( 'form div.bbcodes > button.risi-wlogo' ).forEach( function ( e ) {
            // Supprimer des boutons l'attribut permettant l'ouverture de l'ancien Risibank
            e.removeAttribute( "data-type" );
            // Au clic, ouvrir la popup officielle de Risibank
            e.addEventListener( "click", function ( event ) {
                openRisiBank();
            } );
        } );
    }

    // Ajouter plus d'options au formulaire
    function ajoutBbcodesSupplementaires() {
        // Vérifier si la zone existe
        if ( document.querySelector( 'div.textarea-container div.bbcodes' ) ) {
            document.querySelectorAll( 'div.textarea-container' ).forEach( ( zoneFormulaire, i ) => {
                // Récupérer le champs de texte ainsi que la barre d'outils/sa couleur de fond
                let bbcode_zone = zoneFormulaire.querySelector( 'div.bbcodes' );
                let bbcode_zone_background_color = getComputedStyle( bbcode_zone ).backgroundColor;
                bbcode_zone.setAttribute( 'style', 'display: flex;flex-direction: row;align-items: center;flex-wrap: wrap;' );
                let textarea = zoneFormulaire.querySelector( 'textarea.post-content' );
                // Ajouter les nouveaux éléments à la barre d'outil
                ajoutColorPicker();
                ajoutPuissancesIndices();
                ajoutTab();

                ////////////////
                //  FONCTIONS  |
                ////////////////
                // Ajoute des balises BBcode autour du texte sélectionné
                function addBBcodeAround( bbCode, bbCode_param ) {
                    let selectionStart = textarea.selectionStart;
                    let selectionEnd = textarea.selectionEnd;
                    let before = textarea.value.substring( 0, selectionStart );
                    let selected = textarea.value.substring( selectionStart, selectionEnd );
                    let after = textarea.value.substring( selectionEnd, textarea.value.length );
                    let baliseOuvrante;
                    let baliseFermante;
                    // Nouvelle valeur
                    let newValue;
                    if ( bbCode_param ) {
                        baliseOuvrante = '<' + bbCode + '=' + bbCode_param + '>';
                        baliseFermante = '</' + bbCode + '>';
                        textarea.value = before + baliseOuvrante + selected + baliseFermante + after;
                    } else {
                        baliseOuvrante = '<' + bbCode + '>';
                        baliseFermante = '</' + bbCode + '>';
                        textarea.value = before + baliseOuvrante + selected + baliseFermante + after;
                    }
                    // Replacer le curseur
                    textarea.focus();
                    textarea.selectionStart = selectionStart + baliseOuvrante.length;
                    textarea.selectionEnd = selectionEnd + baliseOuvrante.length;
                }

                // Tabulation
                function ajoutTab() {
                    // Puissance
                    let btnTab = document.createElement( 'button' );
                    btnTab.setAttribute( 'type', 'button' );
                    btnTab.setAttribute( 'class', 'btn' );
                    btnTab.setAttribute( 'tabindex', '-1' );
                    btnTab.setAttribute( 'title', 'Ajouter une tabulation' );
                    let icon = document.createElement( 'span' );
                    icon.setAttribute( 'class', 'glyphicon glyphicon-indent-left' );
                    btnTab.append( icon );
                    // Ajouter à l'éditeur de texte
                    bbcode_zone.appendChild( btnTab );

                    // EVENT - Bouton Indice
                    btnTab.onclick = function () {
                        let selectionStart = textarea.selectionStart;
                        let selectionEnd = textarea.selectionEnd;
                        let before = textarea.value.substring( 0, selectionStart );
                        let selected = textarea.value.substring( selectionStart, selectionEnd );
                        let after = textarea.value.substring( selectionEnd, textarea.value.length );
                        let indentation = ':alinea:';
                        // Nouvelle valeur
                        textarea.value = before + indentation + selected + after;
                        // Replacer le curseur
                        textarea.focus();
                        textarea.selectionStart = selectionStart + indentation.length;
                        textarea.selectionEnd = selectionEnd + indentation.length;
                    };
                }
                // Puissances & indices
                function ajoutPuissancesIndices() {
                    // Puissance
                    let btnPuissance = document.createElement( 'button' );
                    btnPuissance.setAttribute( 'type', 'button' );
                    btnPuissance.setAttribute( 'class', 'btn' );
                    btnPuissance.setAttribute( 'tabindex', '-1' );
                    btnPuissance.setAttribute( 'title', 'Puissance (25 m³)' );
                    let iconPuissance = document.createElement( 'span' );
                    iconPuissance.setAttribute( 'class', 'glyphicon glyphicon-superscript' );
                    btnPuissance.append( iconPuissance );
                    // Ajouter à l'éditeur de texte
                    bbcode_zone.appendChild( btnPuissance );

                    // Indice
                    let btnIndice = document.createElement( 'button' );
                    btnIndice.setAttribute( 'type', 'button' );
                    btnIndice.setAttribute( 'class', 'btn' );
                    btnIndice.setAttribute( 'tabindex', '-1' );
                    btnIndice.setAttribute( 'title', 'Indice (H₂O)' );
                    let iconIndice = document.createElement( 'span' );
                    iconIndice.setAttribute( 'class', 'glyphicon glyphicon-subscript' );
                    btnIndice.append( iconIndice );
                    // Ajouter à l'éditeur de texte
                    bbcode_zone.appendChild( btnIndice );

                    // EVENT - Bouton Puissance
                    btnPuissance.onclick = function () {
                        addBBcodeAround( 'sup', null );
                    };
                    // EVENT - Bouton Indice
                    btnIndice.onclick = function () {
                        addBBcodeAround( 'sub', null );
                    };
                }
                // Color Picker
                function ajoutColorPicker() {
                    // Créer les élements
                    let colorSelectorZone = document.createElement( 'div' );
                    // Menu popup et ses éléments
                    let colorMenu = document.createElement( 'div' );
                    colorMenu.setAttribute( 'id', 'menuCouleur' );
                    colorMenu.setAttribute( 'style', 'background-color: ' + bbcode_zone_background_color + '; padding: 10px; display: none; flex-direction: row; position: absolute;align-items: center;' );
                    colorMenu.setAttribute( 'class', `ss-space-childs ss-popup-couleur` );
                    let colorInput = document.createElement( 'input' );
                    colorInput.setAttribute( 'type', 'color' );
                    colorMenu.appendChild( colorInput );
                    let okButton = document.createElement( 'button' );
                    okButton.setAttribute( 'type', 'button' );
                    okButton.setAttribute( 'class', 'ss-btn ss-gris-clair' );
                    okButton.setAttribute( 'style', 'width: 75px;height: 25px;' );
                    okButton.innerText = 'Valider';
                    colorMenu.appendChild( okButton );
                    // Racourcis RGB
                    let redBtn = document.createElement( 'div' );
                    let greenBtn = document.createElement( 'div' );
                    let blueBtn = document.createElement( 'div' );
                    redBtn.setAttribute( 'style', 'height: 18px;width: 18px;background-color: red;cursor: pointer;border: solid 1px;' );
                    greenBtn.setAttribute( 'style', 'height: 18px;width: 18px;background-color: green;cursor: pointer;border: solid 1px;' );
                    blueBtn.setAttribute( 'style', 'height: 18px;width: 18px;background-color: blue;cursor: pointer;border: solid 1px;' );
                    colorMenu.appendChild( redBtn );
                    colorMenu.appendChild( greenBtn );
                    colorMenu.appendChild( blueBtn );
                    // Bouton d'ouverture de la popup
                    let btnToggleColorMenu = document.createElement( 'button' );
                    btnToggleColorMenu.setAttribute( 'type', 'button' );
                    btnToggleColorMenu.setAttribute( 'class', 'btn' );
                    btnToggleColorMenu.setAttribute( 'tabindex', '-1' );
                    btnToggleColorMenu.setAttribute( 'title', 'Choisir une couleur' );
                    let icon = document.createElement( 'span' );
                    icon.setAttribute( 'class', 'glyphicon glyphicon-tint' );
                    btnToggleColorMenu.append( icon );
                    // Ajouter à l'éditeur de texte
                    colorSelectorZone.appendChild( btnToggleColorMenu );
                    colorSelectorZone.appendChild( colorMenu );
                    //bbcode_zone.insertBefore( colorSelectorZone, bbcode_zone.querySelector( '[data-type="aveshack"]' ) );
                    bbcode_zone.appendChild( colorSelectorZone );

                    // EVENT - Bouton toggle menu
                    btnToggleColorMenu.onclick = function () {
                        if ( colorMenu.style.display == 'flex' ) {
                            colorMenu.style.display = 'none';
                        } else {
                            colorMenu.style.display = 'flex';
                        }
                    };
                    // EVENT - Bouton valider
                    okButton.onclick = function () {
                        let colorCode = colorInput.value;
                        addBBcodeAround( 'color', colorCode );
                        btnToggleColorMenu.click();
                    };
                    // EVENT - Rouge
                    redBtn.onclick = function () {
                        addBBcodeAround( 'color', 'red' );
                        btnToggleColorMenu.click();
                    };
                    // EVENT - Vert
                    greenBtn.onclick = function () {
                        addBBcodeAround( 'color', 'green' );
                        btnToggleColorMenu.click();
                    };
                    // EVENT - Bleu
                    blueBtn.onclick = function () {
                        addBBcodeAround( 'color', 'blue' );
                        btnToggleColorMenu.click();
                    };
                }
            } );
        }
    }

    ///////////////////////////////////
    //  Interface - Liste des topics  |
    ///////////////////////////////////

    async function refreshTopics() {
        // Animation refresh
        document.querySelector( '.btn-autorefresh-topics' ).classList.add( 'processing' );
        // Récupérer la liste des topics à la bonne page
        let doc = await getDoc( document.location );
        // Appliquer la blacklist
        appliquer_blacklist_topics( doc );
        // Stoper l'animation refresh
        document.querySelector( '.btn-autorefresh-topics' ).classList.remove( 'processing' );
        // Afficher les topics
        document.querySelectorAll( '.topics > tbody > tr' ).forEach( function ( e ) {
            e.remove();
        } );
        doc.querySelectorAll( '.topics > tbody > tr' ).forEach( function ( e ) {
            document.querySelector( '.topics > tbody' ).appendChild( e );
        } );
    }

    // Refresh et autorefresh
    async function autorefreshTopics( auto ) {
        if ( auto == 0 ) {
            // SIMPLE REFRESH
            await refreshTopics();
        } else {
            // BOUCLE D'AUTOREFRESH
            while ( document.querySelector( '.btn-autorefresh-topics' ).classList.contains( 'btn-success' ) ) {
                await refreshTopics();
                await sleep( 500 );
            }
        }
    }

    // Appliquer la blacklist sur la liste des topics
    function appliquer_blacklist_topics( page ) {
        // Parcourir les topics de la liste des topics
        page.querySelectorAll( '.topics > tbody > tr' ).forEach( ( e ) => {
            // Appliquer la blacklist de pseudos
            if ( e.querySelector( '.topics-author' ) ) {
                let pseudo = e.querySelector( '.topics-author' ).textContent.replace( /(\r\n|\n|\r)/gm, "" ).trim();
                blacklist_pseudos.forEach( function ( e_blackist, i ) {
                    // Si l'auteur du post est BL
                    if ( pseudo == e_blackist.pseudo ) {
                        if ( e_blackist.blocage_topics == 2 ) {
                            e.querySelector( ".topics-title" ).textContent = ' [ Contenu blacklisté ] ';
                        } else if ( e_blackist.blocage_topics == 3 ) {
                            e.innerHTML = '<td></td><td class="topics-title">[ Contenu blacklisté ]</td><td></td><td></td><td></td>';
                        } else if ( e_blackist.blocage_topics == 4 ) {
                            e.remove();
                        }

                    }
                } );
            }
        } );
    }

    // Ajout de l'autorefresh sur la liste des topics
    function ajoutAutorefreshTopics() {
        // Ajout du bouton d'autorefresh et suppression du bouton refresh normal
        let boutonRefresh = document.createElement( 'a' );
        boutonRefresh.setAttribute( 'id', 'btn-autorefresh-topics' );
        boutonRefresh.setAttribute( 'class', 'btn-autorefresh-topics btn btn-grey' );
        boutonRefresh.setAttribute( 'style', 'font-size: .9em' );
        boutonRefresh.innerHTML = "<i class='glyphicon glyphicon-refresh'></i>";
        let ancienBtnRefresh = document.querySelector( '.glyphicon.glyphicon-refresh' ).parentNode;
        ancienBtnRefresh.parentNode.replaceChild( boutonRefresh, ancienBtnRefresh );

        // Event - Simple clic sur le bouton refresh
        boutonRefresh.onclick = function () {
            // Si on clique sur le bouton pour couper l'auto-refresh...
            if ( !boutonRefresh.classList.contains( 'btn-grey' ) ) {
                // Mémoriser l'état
                parametres.etat_autorefresh_topics = false;
                localStorage.setItem( "ss_parametres", JSON.stringify( parametres ) );
                // Couper l'autorefresh
                boutonRefresh.classList.add( 'btn-grey' );
                boutonRefresh.classList.remove( 'btn-success' );
            } else {
                autorefreshTopics( 0 );
            }
        };
        // Event - Double clic sur le bouton refresh
        boutonRefresh.ondblclick = function () {
            // Si on double-clique sur le bouton pour allumer l'auto-refresh...
            if ( boutonRefresh.classList.contains( 'btn-grey' ) ) {
                // Mémoriser l'état
                parametres.etat_autorefresh_topics = true;
                localStorage.setItem( "ss_parametres", JSON.stringify( parametres ) );
                // Allumer autorefresh
                boutonRefresh.classList.add( 'btn-success' );
                boutonRefresh.classList.remove( 'btn-grey' );
                autorefreshTopics( 1 );
            }
        };

        // Activation auto de l'autorefresh, si déjà activé sur la page précédente
        if ( parametres.etat_autorefresh_topics == true ) {
            boutonRefresh.ondblclick();
        }
    }

    ////////////////////////////////
    //  Interface - Liste des MPs  |
    ////////////////////////////////

    function ajoutBoutonQuitterMPs() {
        let th = document.createElement( 'th' );
        // En-tête
        document.querySelector( "section > table > thead > tr" ).appendChild( th );
        // Tableau
        document.querySelectorAll( "section > table > tbody > tr" ).forEach( ( e ) => {
            let td = document.createElement( 'td' );
            // Ajout du bouton "Quitter le MP" sur chaque MP dans la liste des MPs
            td.innerHTML = '<input style="vertical-align: middle" class="btn-quitter-mp" type="image" src="/images/topic/delete.png" title="Quitter le MP" alt="Icône suppression" height="16">';
            e.appendChild( td );

            // Event - Clic sur le bouton pour quitter un MP
            td.querySelector( 'input' ).onclick = async function () {
                if ( confirm( "Voulez-vous vraiment quitter ce MP ?" ) ) {
                    // Extraction du numéro de MP
                    var id_mp = /https:\/\/avenoel\.org\/messagerie\/([0-9]+)/.exec( td.parentNode.querySelector( '.title a' ) )[ 1 ];
                    // Quitter le MP
                    await quitterMP( id_mp );
                    location.reload();
                }
            };
        } );
    }

    // Quitter un MP
    async function quitterMP( id_mp ) {
        const url = "https://avenoel.org/messagerie/" + id_mp + "-1-";
        const rawText = await fetch( url ).then( res => res.text() );
        const doc = new DOMParser().parseFromString( rawText, "text/html" );

        const form = doc.querySelector( "form" );
        await fetch( form.action, {
            method: "POST",
            body: new FormData( form )
        } );
    }

    ////////////////////
    //  Intrface - MP  |
    ////////////////////

    function ajoutRechercheMPs() {
        let modalRecherche = '<!-- Fond modal--> <div id="ss-modal-recherche" class="ss-panel-background"> <!-- Modal --> <div class="ss-panel"> <!-- En-tête --> <div class="ss-panel-header"> <img src="https://media.discordapp.net/attachments/592805019590459403/1120881416989843587/NzyZTYz.png" alt="Stratoscript"> <span class="ss-panel-close">&times;</span> </div> <!-- Corps --> <div class="ss-panel-body"><div class="ss-col"> <!-- Filtres de recherche --> <div class="ss-mini-panel"> <h3>Filtres de recherche</h3> <div class="ss-row ss-space-childs ss-full-width"> <div class="ss-row ss-fill ss-space-childs"> <input type="text" class="ss-fill inputFiltreAuteur" style="height:36px;min-width:200px" placeholder="Auteur"> <input type="text" class="ss-fill inputFiltreContenu" style="height:36px;min-width:200px" placeholder="Contenu"> </div> <button id="btn-recherche" class="ss-btn ss-vert" type="button">Rechercher</button> </div> </div> <!-- Barre de progrssion --> <div class="ss-row" style="margin:0px 20px 20px 20px"> <div class="ss-progressbar ss-full-width" style="display:none"> <div class="ss-col" style="width:0%"></div> </div> </div><!-- Résultats de recherche --> <div class="ss-mini-panel"> <h3>Résultats de recherche</h3> <div class="ss-full-width zone-resultats-recherche ss-col" style="padding:10px"> </div> </div> </div></div> <!-- Footer --> <div class="ss-panel-footer"> <span class="label" id="ss-version">Version </span> <div class="ss-row"> <button type="button" class="ss-btn ss-panel-close">Fermer</button> </div></div> </div> <!-- Fin modal --> </div> <!-- Fin fond modal -->';

        let zoneRecherche = document.createElement( 'div' );
        zoneRecherche.setAttribute( "id", "zoneRecherche" );
        zoneRecherche.setAttribute( "class", "ss-panel-container" );
        zoneRecherche.innerHTML = modalRecherche;
        document.querySelector( 'body' ).appendChild( zoneRecherche );

        // Affichage de la version
        document.querySelectorAll( '#ss-version' ).forEach( ( e ) => {
            e.innerHTML = 'Version ' + version;
        } );

        // Retirer la classe "col-md-2" au bouton refresh qui rend moche
        document.querySelector( '.topic-title' ).nextElementSibling.nextElementSibling.querySelector( '.col-md-2' ).classList.remove( 'col-md-2' );

        // Ajout du bouton de recherche
        let btnRechercher = document.createElement( 'button' );
        btnRechercher.setAttribute( "style", "margin-right:3px" );
        btnRechercher.setAttribute( "class", "btn btn-primary btn-rechercher pull-right" );
        btnRechercher.innerText = 'Rechercher';
        document.querySelector( '.topic-title' ).nextElementSibling.nextElementSibling.append( btnRechercher );

        // Event - Clic sur le bouton de recherche
        document.getElementById( 'btn-recherche' ).onclick = function () {
            rechercheMP();
        };

        // Event - Clic sur le bouton d'ouverture du panel de recherche
        document.querySelector( '.btn-rechercher' ).onclick = function () {
            let modal = document.getElementById( "ss-modal-recherche" );
            modal.style.display = "flex";
        };

        // Event - Clic sur un bouton de fermeture du panel de recherche
        document.querySelectorAll( '#ss-modal-recherche .ss-panel-close' ).forEach( ( e ) => {
            e.onclick = function () {
                let modal = document.getElementById( "ss-modal-recherche" );
                modal.style.display = "none";
            };
        } );

        async function rechercheMP() {
            let progressbar = document.querySelector( "#ss-modal-recherche .ss-progressbar" );
            let filtre_auteur = document.querySelector( '#ss-modal-recherche .inputFiltreAuteur' ).value.toLowerCase().trim();
            let filtre_contenu = document.querySelector( '#ss-modal-recherche .inputFiltreContenu' ).value.toLowerCase().trim();

            let pagination = document.querySelector( '.pagination-topic ' ).querySelectorAll( 'li' );
            let page_max = pagination[pagination.length - 2].innerText;
            let id_topic = /messagerie\/([0-9]+)-/.exec( path )[ 1 ];

            // Vider la liste
            document.querySelector( '.zone-resultats-recherche' ).innerHTML = '';

            // Parcourir les pages
            for ( let page = 1; page <= page_max; page++ ) {
                let url = 'https://avenoel.org/messagerie/' + id_topic + '-' + page + '-';
                let doc = await getDoc( url );
                // Parcourir les posts
                doc.querySelectorAll( '.topic-messages > .topic-message' ).forEach( function ( e ) {
                    let auteur = e.querySelector( '.message-username ' ).innerText.toLowerCase().trim();
                    let contenu = e.querySelector( '.message-content ' ).innerText.toLowerCase().trim();
                    // Si les filtres matchent
                    if ( !( contenu.indexOf( filtre_contenu ) == -1 ) && ( auteur == filtre_auteur || filtre_auteur == "" ) ) {
                        document.querySelector( '.zone-resultats-recherche' ).append( e );
                    }
                } );
                // Affichage progressbar
                let pourcentage = Math.ceil( page * 100 / page_max );
                progressbar.style.display = "block";
                progressbar.children[ 0 ].setAttribute( "style", "width:" + pourcentage + "%" );
                progressbar.children[ 0 ].innerText = pourcentage + '%';
            }
            // Cacher progressbar
            progressbar.style.display = "none";
        }
    }

    ///////////////////////////////
    //  Interface - Mes messages  |
    ///////////////////////////////

    function ajoutRechercheMesMessages() {
        let modalRecherche = '<!-- Fond modal  --> <div id="ss-modal-recherche" class="ss-panel-background"> <!-- Modal --> <div class="ss-panel"> <!-- En-tête --> <div class="ss-panel-header"> <img src="https://media.discordapp.net/attachments/592805019590459403/1108591534594596965/Untitled.png" alt="Stratoscript"> <span class="ss-panel-close">&times;</span> </div> <!-- Corps --> <div class="ss-panel-body"> <div class="ss-col"> <!-- Filtres de recherche --> <div class="ss-mini-panel"> <h3>Filtres de recherche</h3> <div class="ss-row ss-space-childs ss-full-width"> <div class="ss-row ss-fill ss-space-childs"> <input type="text" class="ss-fill inputFiltreAuteur" style="height:36px;min-width:200px" placeholder="Auteur"> <input type="text" class="ss-fill inputFiltreContenu" style="height:36px;min-width:200px" placeholder="Contenu"> </div> <button id="btn-filtrer" class="ss-btn ss-vert" type="button">Filtrer</button> <button id="btn-scanner" class="ss-btn ss-gris-clair" type="button">Scanner</button> </div> </div> <!-- Barre de progrssion --> <div class="ss-row" style="margin:0px 20px 20px 20px"> <div class="ss-progressbar ss-full-width" style="display:none"> <div class="ss-col" style="width:0%"></div> </div> </div> <!-- Résultats de recherche --> <div class="ss-mini-panel"> <h3>Résultats de recherche</h3> <div class="zone-resultats-recherche ss-col" style="padding:10px"> </div> </div> </div> </div> <!-- Footer --> <div class="ss-panel-footer"> <span class="label" id="ss-version">Version 1.0</span> <div class="ss-row"> <button type="button" class="ss-btn ss-panel-close">Fermer</button> </div> </div> </div> <!-- Fin modal --> </div> <!-- Fin fond modal -->';

        let zoneRecherche = document.createElement( 'div' );
        zoneRecherche.setAttribute( "id", "zoneRecherche" );
        zoneRecherche.setAttribute( "class", "ss-panel-container" );
        zoneRecherche.innerHTML = modalRecherche;
        document.querySelector( 'body' ).appendChild( zoneRecherche );

        // Affichage de la version
        document.querySelectorAll( '#ss-version' ).forEach( ( e ) => {
            e.innerHTML = 'Version ' + version;
        } );

        // Ajout du bouton de recherche
        let btnRechercher = document.createElement( 'button' );
        btnRechercher.setAttribute( "style", "margin-right:3px" );
        btnRechercher.setAttribute( "class", "btn btn-primary btn-rechercher pull-right" );
        btnRechercher.innerText = 'Rechercher';
        document.querySelector( '.pagination-topic' ).parentElement.insertBefore( btnRechercher, document.querySelector( '.pagination-topic' ) );

        // Event - Clic sur le bouton Filtrer
        document.getElementById( 'btn-filtrer' ).onclick = function () {
            document.getElementById( 'btn-filtrer' ).classList.add( 'disabled' );
            rechercheMesMessages();
        };
        // Event - Clic sur le bouton de recherche
        document.getElementById( 'btn-scanner' ).onclick = function () {
            document.getElementById( 'btn-scanner' ).classList.add( 'disabled' );
            recupMessagesDansBdd();
        };

        // Event - Clic sur le bouton d'ouverture du panel de recherche
        document.querySelector( '.btn-rechercher' ).onclick = function () {
            let modal = document.getElementById( "ss-modal-recherche" );
            modal.style.display = "flex";
        };

        // Event - Clic sur un bouton de fermeture du panel de recherche
        document.querySelectorAll( '#ss-modal-recherche .ss-panel-close' ).forEach( ( e ) => {
            e.onclick = function () {
                let modal = document.getElementById( "ss-modal-recherche" );
                modal.style.display = "none";
            };
        } );

        async function recupMessagesDansBdd() {
            let progressbar = document.querySelector( "#ss-modal-recherche .ss-progressbar" );
            let pagination = document.querySelector( '.pagination-topic ' ).querySelectorAll( 'li' );
            let page_max = pagination[pagination.length - 2].children[ 0 ].href.match( /.+\/([0-9]+)/ )[ 1 ];
            let page_min = pagination[ 1 ].children[ 0 ].href.match( /.+\/([0-9]+)/ )[ 1 ];
            // Parcourir les pages
            for ( let page = 1; page <= page_max; page++ ) {
                let url = 'https://avenoel.org/mes-messages/' + page;
                let doc = await getDoc( url );
                // Parcourir les posts
                doc.querySelectorAll( '.topic-messages > .topic-message' ).forEach( function ( e ) {
                    // Garder en indexedDB
                    let id_message = e.getAttribute( 'id' );
                    let contenu_message = e.querySelector( '.message-content ' ).innerText.toLowerCase().trim();
                    let html_message = e.querySelector( '.message-content ' ).innerHTML;
                    let date_message = e.querySelector( '.message-date' ).textContent.match( /Posté le (.+) à (.+)/ )[ 1 ];
                    let heure_message = e.querySelector( '.message-date' ).textContent.match( /Posté le (.+) à (.+)/ )[ 2 ];
                    let auteur_message = e.querySelector( '.message-username ' ).innerText.trim();
                    ssDatabase.mesMessages_add( id_message, contenu_message, html_message, date_message, heure_message, auteur_message );
                } );
                // Affichage progressbar
                let pourcentage = Math.ceil( page * 100 / page_max );
                progressbar.style.display = "block";
                progressbar.children[ 0 ].setAttribute( "style", "width:" + pourcentage + "%" );
                progressbar.children[ 0 ].innerText = pourcentage + '%';
            }
            // Cacher progressbar
            progressbar.style.display = "none";
            document.getElementById( 'btn-scanner' ).classList.remove( 'disabled' );
        }

        async function rechercheMesMessages() {
            let filtre_contenu = document.querySelector( '#ss-modal-recherche .inputFiltreContenu' ).value.trim().toLowerCase();
            let filtre_auteur = document.querySelector( '#ss-modal-recherche .inputFiltreAuteur' ).value.trim().toLowerCase();

            if ( filtre_contenu || filtre_auteur ) {
                // Vider la liste
                document.querySelector( '.zone-resultats-recherche' ).innerHTML = '';
                // Trouver par contenu
                let data = await ssDatabase.mesMessages_get();
                data.forEach( function ( e ) {
                    if ( ( filtre_contenu == '' || e.text.includes( filtre_contenu ) ) && ( e.auteur.trim().toLowerCase() == filtre_auteur.trim().toLowerCase() || filtre_auteur == '' ) ) {
                        let post = document.createElement( 'article' );
                        post.setAttribute( 'class', 'row topic-message flex' );
                        post.setAttribute( 'id', e.id );

                        let html_post = `
                        <div class="message-wrapper"><header class="message-header"> <span class="message-username "><a href="https://avenoel.org/profil/` + e.auteur + `">
                        ` + e.auteur + `
                        </a></span> <div class="message-date"><a href="https://avenoel.org/message/` + e.id + `">Posté le ` + e.date + ` à ` + e.heure + `</a></div> </header>
                        <div class="message-content">
                        ` + e.html + `
                        </div>  <footer class="message-footer relative"> <a href="#15432521" class="message-permalink">#15432521</a></footer></div>
                        `;

                        post.innerHTML = html_post;

                        document.querySelector( '.zone-resultats-recherche' ).appendChild( post );
                    }
                } );
                document.getElementById( 'btn-filtrer' ).classList.remove( 'disabled' );
            }
        }
    }

    ///////////////////////////////////
    //  Interface - Toutes les pages  |
    ///////////////////////////////////
    async function assistant_profils() {
        // Création de l'assistant de customization de profils
        let btnEditProfil = document.createElement( 'div' );
        let icon = document.createElement( 'i' );
        icon.setAttribute( 'class', 'glyphicon glyphicon-pencil' );
        icon.setAttribute( 'style', 'font-size: 18px' );
        btnEditProfil.setAttribute( 'id', 'btnEditProfil' );
        btnEditProfil.setAttribute( 'class', `ss-bouton-profil` );
        btnEditProfil.appendChild( icon );
        let modalEditProfil = document.createElement( 'div' );
        modalEditProfil.setAttribute( 'id', 'modalEditProfil' );
        modalEditProfil.setAttribute( 'style', 'width: 370px;display:none' );
        modalEditProfil.setAttribute( 'class', `ss-popup-profil` );
        document.querySelector( '.main-container' ).appendChild( btnEditProfil );
        document.querySelector( '.main-container' ).appendChild( modalEditProfil );
        let docProfil = await getDoc( 'https://avenoel.org/compte' );

        modalEditProfil.innerHTML = `<h3>Customization</h3><div><b>Avatar</b><input id="ss-input-avatar" type="file" name="" value="" style="width: 200px;" class="form-control"></div><div><b>Fond de profil</b><input id="ss-input-fond" type="text" name="" value="" style="width: 200px;" class="form-control"></div><div><b>Musique</b><input id="ss-input-musique" type="text" name="" value="" style="width: 200px;" class="form-control"></div><div style="justify-content: center;"><b>Biographie :</b></div><div><textarea class="form-control" id="ss-biographie" rows="5" maxlength="10000" style="width: 100%"></textarea></div><div style="margin-top: 24px;display: flex;justify-content: space-between;"><div id="ss-slots-profil" style="display:none"><button id="ss-slot1-profil" class="ss-btn" style="width:40px" type="button" name="button" title="Slot 1">1</button><button id="ss-slot2-profil" class="ss-btn" style="width:40px" type="button" name="button" title="Slot 2">2</button><button id="ss-slot3-profil" class="ss-btn" style="width:40px" type="button" name="button" title="Slot 3">3</button></div><div id="ss-load-save-profil"><button id="ss-btn-load-profil"  class="ss-btn" style="width:40px" type="button" name="button" title="Charger"><i class="glyphicon glyphicon-open" style="font-size: 18px"></i></button><button id="ss-btn-save-profil"  class="ss-btn" style="width:40px" type="button" name="button" title="Sauvegarder"><i class="glyphicon glyphicon-save" style="font-size: 18px"></i></button></div><div><button id="ss-btn-tester-profil" class="ss-btn" type="button" name="button">Visualiser</button><button id="ss-btn-valider-profil" class="ss-btn ss-vert disabled" type="button" name="button">Valider</button></div><button id="ss-btn-retour-profil" class="ss-btn" style="display:none" type="button" name="button">Retour</button></div>`;

        ///////////////////////////////
        //  Ajouter zones manquantes  |
        ///////////////////////////////
        // Bio
        if ( !document.querySelectorAll( '.surface' )[ 2 ] ) {
            // Si la zone de bio n'existe pas, la créer
            let zoneBio = document.createElement( 'div' );
            zoneBio.setAttribute( 'class', 'surface hidden' );
            zoneBio.innerHTML = `<div class="text-lg text-on-surface-emphasis font-medium mb-2">Biographie</div><div></div>`;
            document.querySelector( '.stack' ).appendChild( zoneBio );
        }
        // Player Youtube
        if ( !document.querySelector( '.player-wrapper iframe' ) ) {
            let player = document.createElement( 'div' );
            player.setAttribute( 'class', 'text-center hidden' );
            player.innerHTML = `
            <div class="player-wrapper">
                <iframe id="player-null" class="player" frameborder="0" allowfullscreen="1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" title="YouTube video player" width="0" height="0" src="https://www.youtube.com/embed/2anxA556cBc?enablejsapi=1&amp;origin=https%3A%2F%2Favenoel.org&amp;widgetid=1"></iframe>
                <i class="player-toggle glyphicon glyphicon-play"></i>
            </div>`;

            let parent = document.querySelector( '.stack .surface' );
            let pseudo = document.querySelector( '.stack .surface h1' );
            parent.insertBefore( player, pseudo.nextSibling );
        }

        // Zones du profil
        let pseudo_profil = document.querySelector( 'h1' ).innerText.trim();
        let bio_profil = document.querySelectorAll( '.surface' )[ 2 ].querySelectorAll( 'div' )[ 1 ];
        let avatar_profil = document.querySelectorAll( '.surface' )[ 1 ].querySelector( 'img' );
        let musique_profil = document.querySelector( '.player-wrapper iframe' );
        // Input de l'assistant de customization
        let inputAvatar = document.getElementById( 'ss-input-avatar' );
        let inputFond = document.getElementById( 'ss-input-fond' );
        let inputBio = document.getElementById( 'ss-biographie' );
        let inputMusique = document.getElementById( 'ss-input-musique' );
        // Obtenir les données du profil par l'API
        let compte_profil = await getProfilParPseudo( pseudo_profil );

        // Débloquer le bouton "Valider" si propre profil
        let utilisateur_connecte = document.querySelector( '.navbar-user li a' ).href.match( /.+\/(.+)/ )[ 1 ];
        if ( utilisateur_connecte == pseudo_profil ) {
            document.getElementById( 'ss-btn-valider-profil' ).classList.remove( 'disabled' );
        }

        let slots_affiches = false;
        let mode_profil;

        // Remplir les inputs au démarrage
        inputFond.value = compte_profil.profile_background;
        if ( compte_profil.music ) {
            inputMusique.value = 'https://www.youtube.com/watch?v=' + compte_profil.music;
        }
        inputBio.value = compte_profil.biography;

        ///////////////////////
        //  BOUTONS ASSISTANT  |
        ////////////////////////
        // Clic Retour
        document.getElementById( 'ss-btn-retour-profil' ).onclick = function () {
            if ( slots_affiches ) {
                document.getElementById( 'ss-slots-profil' ).style.display = 'none';
                document.getElementById( 'ss-btn-retour-profil' ).style.display = 'none';
                document.getElementById( 'ss-load-save-profil' ).style.display = '';
                document.getElementById( 'ss-btn-tester-profil' ).style.display = '';
                document.getElementById( 'ss-btn-valider-profil' ).style.display = '';
                slots_affiches = false;
            }
            mode_profil = null;
        };
        // Clic Load
        document.getElementById( 'ss-btn-load-profil' ).onclick = function () {
            if ( !slots_affiches ) {
                document.getElementById( 'ss-slots-profil' ).style.display = '';
                document.getElementById( 'ss-btn-retour-profil' ).style.display = '';
                document.getElementById( 'ss-load-save-profil' ).style.display = 'none';
                document.getElementById( 'ss-btn-tester-profil' ).style.display = 'none';
                document.getElementById( 'ss-btn-valider-profil' ).style.display = 'none';
                slots_affiches = true;
            }
            mode_profil = 'load';
        };
        // Clic Save
        document.getElementById( 'ss-btn-save-profil' ).onclick = function () {
            if ( !slots_affiches ) {
                document.getElementById( 'ss-slots-profil' ).style.display = '';
                document.getElementById( 'ss-btn-retour-profil' ).style.display = '';
                document.getElementById( 'ss-load-save-profil' ).style.display = 'none';
                document.getElementById( 'ss-btn-tester-profil' ).style.display = 'none';
                document.getElementById( 'ss-btn-valider-profil' ).style.display = 'none';
                slots_affiches = true;
            }
            mode_profil = 'save';
        };
        // Clic 1
        document.getElementById( 'ss-slot1-profil' ).onclick = async function () {
            if ( mode_profil == 'save' ) {
                let avatarBase64;
                if ( inputAvatar.files.length > 0 ) {
                    // Si avatar dans l'input
                    avatarBase64 = await inputToBase64( inputAvatar );
                } else {
                    // Si pas d'avatar dans l'input, récupérer celui du profil actuel
                    avatarBase64 = await urlToBase64( '/images/avatars/' + compte_profil.avatar );
                }
                ssDatabase.mesProfils_add( 1, inputFond.value, inputMusique.value, inputBio.value, avatarBase64 );
            } else if ( mode_profil == 'load' ) {
                loadProfil( 1 );
            }
            document.getElementById( 'ss-btn-retour-profil' ).click();
        };
        // Clic 2
        document.getElementById( 'ss-slot2-profil' ).onclick = async function () {
            if ( mode_profil == 'save' ) {
                let avatarBase64;
                if ( inputAvatar.files.length > 0 ) {
                    // Si avatar dans l'input
                    avatarBase64 = await inputToBase64( inputAvatar );
                } else {
                    // Si pas d'avatar dans l'input, récupérer celui du profil actuel
                    avatarBase64 = await urlToBase64( '/images/avatars/' + compte_profil.avatar );
                }
                ssDatabase.mesProfils_add( 2, inputFond.value, inputMusique.value, inputBio.value, avatarBase64 );
            } else if ( mode_profil == 'load' ) {
                loadProfil( 2 );
            }
            document.getElementById( 'ss-btn-retour-profil' ).click();
        };
        // Clic 3
        document.getElementById( 'ss-slot3-profil' ).onclick = async function () {
            if ( mode_profil == 'save' ) {
                let avatarBase64;
                if ( inputAvatar.files.length > 0 ) {
                    // Si avatar dans l'input
                    avatarBase64 = await inputToBase64( inputAvatar );
                } else {
                    // Si pas d'avatar dans l'input, récupérer celui du profil actuel
                    avatarBase64 = await urlToBase64( '/images/avatars/' + compte_profil.avatar );
                }
                ssDatabase.mesProfils_add( 3, inputFond.value, inputMusique.value, inputBio.value, avatarBase64 );
            } else if ( mode_profil == 'load' ) {
                loadProfil( 3 );
            }
            document.getElementById( 'ss-btn-retour-profil' ).click();
        };
        // Clic Visualiser
        document.getElementById( 'ss-btn-tester-profil' ).onclick = function () {
            modifProfilSelonInputs();
        };
        // Clic Valider
        document.getElementById( 'ss-btn-valider-profil' ).onclick = function () {
            validerModificationsProfil();
        };
        // Clic Crayon
        btnEditProfil.onclick = function () {
            if ( modalEditProfil.style.display == 'flex' ) {
                modalEditProfil.style.display = 'none';
            } else {
                modalEditProfil.style.display = 'flex';
            }
        };
        ////////////////
        //  FONCTIONS  |
        ////////////////
        function lockAll() {
            modalEditProfil.querySelectorAll( 'div' ).forEach( ( item, i ) => {
                item.classList.add( 'disabled' );
            } );
        }
        function unlockAll() {
            modalEditProfil.querySelectorAll( 'div' ).forEach( ( item, i ) => {
                item.classList.remove( 'disabled' );
            } );
        }
        function clearInputAvatar() {
            inputAvatar.type = "text";
            inputAvatar.type = "file";
        }
        async function loadProfil( slot ) {
            lockAll();
            clearInputAvatar();
            let mesProfils = await ssDatabase.mesProfils_get();
            mesProfils.forEach( ( monProfil, i ) => {
                if ( monProfil.id == slot ) {
                    inputFond.value = monProfil.fond;
                    inputMusique.value = monProfil.musique;
                    inputBio.value = monProfil.bio;
                    avatar_profil.src = monProfil.avatar;
                }
            } );
            modifProfilSelonInputs();
            unlockAll();
        }
        async function saveProfil( slot ) {
            lockAll();
            let avatarBase64;
            if ( inputAvatar.files.length > 0 ) {
                // Si avatar dans l'input
                avatarBase64 = await inputToBase64( inputAvatar );
            } else {
                // Si pas d'avatar dans l'input, récupérer celui du profil actuel
                avatarBase64 = await urlToBase64( '/images/avatars/' + compte_profil.avatar );
            }
            ssDatabase.mesProfils_add( slot, inputFond.value, inputMusique.value, inputBio.value, avatarBase64 );
            unlockAll();
        }
        // Modifier visuellement le profil selon ce qui est saisis dans les inputs de l'outil de customization
        async function modifProfilSelonInputs() {
            lockAll();
            // Changement de video Youtube de la musique
            if ( inputMusique.value.trim() && inputMusique.value.match( /\/\/.+\/(?:watch\?v=|)([A-z0-9-]{11})/ ) ) {
                let codeVideoYt = inputMusique.value.match( /\/\/.+\/(?:watch\?v=|)([A-z0-9-]{11})/ )[ 1 ];
                callPlayer( "player-null", "loadVideoById", [ codeVideoYt ] );
                musique_profil.parentNode.parentNode.classList.remove( 'hidden' );
            } else {
                musique_profil.parentNode.parentNode.classList.add( 'hidden' );
                callPlayer( "player-null", "stopVideo" );
            }
            // Changement du fond de profil
            if ( inputFond.value.trim() ) {
                document.querySelector( 'body' ).setAttribute( 'style', 'background-size: cover;background-attachment: fixed;' );
                document.querySelector( 'body' ).style.backgroundImage = "url('" + inputFond.value + "')";
            } else {
                document.querySelector( 'body' ).style.background = "#202225";
            }

            // Changeemnt de la bio
            if ( inputBio.value.trim() ) {
                console.log( bio_profil.classList );
                bio_profil.parentNode.classList.remove( 'hidden' );
                bio_profil.innerHTML = await parseMessageContent( inputBio.value );
                fixDecalageImgur( bio_profil );
            } else {
                bio_profil.parentNode.classList.add( 'hidden' );
            }
            // Changement d'avatar
            let avatar = inputAvatar.files[ 0 ];
            if ( avatar ) {
                let reader = new FileReader();
                reader.readAsDataURL( avatar, "UTF-8" );
                reader.onload = function ( evt ) {
                    avatar_profil.src = reader.result;
                    unlockAll();
                };
                reader.onerror = function ( evt ) {
                    console.log( 'Error: ', evt );
                    unlockAll();
                };
            } else {
                unlockAll();
            }
        }
        // Valider les modifications sur le profil
        async function validerModificationsProfil() {
            lockAll();
            // Avatar -> base 64
            let avatarBase64;
            if ( inputAvatar.files.length > 0 ) {
                // Si avatar dans l'input
                avatarBase64 = await inputToBase64( inputAvatar );
            } else {
                // Si pas d'avatar dans l'input, récupérer celui du profil actuel
                if ( !avatar_profil.src.match( /https.+/ ) ) {
                    avatarBase64 = avatar_profil.src;
                } else {
                    avatarBase64 = null;
                }
            }
            // Avatar base 64 -> fichier (si avatar changé)
            if ( avatarBase64 ) {
                function dataURLtoFile( dataurl, filename ) {
                    var arr = dataurl.split( ',' ),
                        mime = arr[ 0 ].match( /:(.*?);/ )[1],
                        bstr = atob( arr[ 1 ] ),
                        n = bstr.length,
                        u8arr = new Uint8Array( n );

                    while ( n-- ) {
                        u8arr[ n ] = bstr.charCodeAt( n );
                    }
                    return new File( [u8arr], filename, { type: mime } );
                }
                // Mise à jour des modifications du profil
                let avatarFile = dataURLtoFile( avatarBase64, 'filename.gif' );
                await uploadAvatar( avatarFile );
            }
            await postProfil();
            // Rechargement de la page
            location.reload();
        }
        // POST avatar
        function uploadAvatar( avatarFile ) {
            return new Promise( ( resolve, reject ) => {
                // Poster l'avatar
                let tokenAPI = docProfil.getElementById( 'token' ).value;
                var myHeaders = new Headers();
                myHeaders.append( "x-authorization", tokenAPI );
                var formdata = new FormData();
                formdata.append( "_method", "PUT" );
                formdata.append( "avatar", avatarFile );
                var requestOptions = {
                    method: 'POST',
                    headers: myHeaders,
                    body: formdata,
                    redirect: 'follow'
                };
                fetch( "https://avenoel.org/api/v1/users/username:" + utilisateur_connecte + "/avatar", requestOptions ).then( response => response.text() ).then( result => resolve( result ) ).catch( error => reject( 'error', error ) );
            } );
        }
        // POST profil
        function postProfil() {
            return new Promise( ( resolve, reject ) => {
                let lien_youtube_valide = "";
                // Changement de video Youtube de la musique
                if ( inputMusique.value.trim() && inputMusique.value.match( /\/\/.+\/(?:watch\?v=|)([A-z0-9-]{11})/ ) ) {
                    let codeVideoYt = inputMusique.value.match( /\/\/.+\/(?:watch\?v=|)([A-z0-9-]{11})/ )[ 1 ];
                    lien_youtube_valide = 'https://www.youtube.com/watch?v=' + codeVideoYt;
                }
                let tokencsrf = document.querySelector( 'meta[name="csrf-token"]' ).content;
                var myHeaders = new Headers();
                myHeaders.append( "Content-Type", "application/x-www-form-urlencoded" );
                var urlencoded = new URLSearchParams();
                urlencoded.append( "profile_background", inputFond.value );
                urlencoded.append( "music", lien_youtube_valide );
                urlencoded.append( "biography", inputBio.value );
                urlencoded.append( "_method", "PUT" );
                urlencoded.append( "_token", tokencsrf );
                var requestOptions = {
                    method: 'POST',
                    headers: myHeaders,
                    body: urlencoded,
                    redirect: 'follow'
                };
                fetch( "https://avenoel.org/user/username:" + utilisateur_connecte, requestOptions ).then( response => response.text() ).then( result => resolve( result ) ).catch( error => reject( 'error', error ) );
            } );
        }
        // Conversion du contenu d'un input file en base64
        function inputToBase64( input ) {
            return new Promise( ( resolve, reject ) => {
                let avatar = input.files[ 0 ];
                if ( avatar ) {
                    let reader = new FileReader();
                    reader.readAsDataURL( avatar, "UTF-8" );
                    reader.onload = function ( evt ) {
                        resolve( reader.result );
                    };
                    reader.onerror = function ( evt ) {
                        reject( 'Error: ', evt );
                    };
                }
            } );
        }
        // Récupération de l'avatar en base64 par URL
        function urlToBase64( url ) {
            return new Promise( ( resolve, reject ) => {
                var xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    var reader = new FileReader();
                    reader.readAsDataURL( xhr.response );
                    reader.onloadend = function () {
                        resolve( reader.result );
                    };
                };
                xhr.onerror = function ( evt ) {
                    reject( 'Error: ', evt );
                };
                xhr.open( 'GET', url );
                xhr.responseType = 'blob';
                xhr.send();

            } );
        }
        // Interractions avec le lecteur Youtube du Profil
        /**
        * @author       Rob W <gwnRob@gmail.com>
        * @website      https://stackoverflow.com/a/7513356/938089
        * @version      20190409
        * @description  Executes function on a framed YouTube video (see website link)
        *               For a full list of possible functions, see:
        *               https://developers.google.com/youtube/js_api_reference
        * @param String frame_id The id of (the div containing) the frame
        * @param String func     Desired function to call, eg. "playVideo"
        *        (Function)      Function to call when the player is ready.
        * @param Array  args     (optional) List of arguments to pass to function func*/
        function callPlayer( frame_id, func, args ) {
            if ( window.jQuery && frame_id instanceof jQuery )
                frame_id = frame_id.get( 0 ).id;
            var iframe = document.getElementById( frame_id );
            if ( iframe && iframe.tagName.toUpperCase() != 'IFRAME' ) {
                iframe = iframe.getElementsByTagName( 'iframe' )[ 0 ];
            }

            // When the player is not ready yet, add the event to a queue
            // Each frame_id is associated with an own queue.
            // Each queue has three possible states:
            //  undefined = uninitialised / array = queue / .ready=true = ready
            if ( !callPlayer.queue )
                callPlayer.queue = {};
            var queue = callPlayer.queue[frame_id],
                domReady = document.readyState == 'complete';

            if ( domReady && !iframe ) {
                // DOM is ready and iframe does not exist. Log a message
                window.console && console.log( 'callPlayer: Frame not found; id=' + frame_id );
                if ( queue )
                    clearInterval( queue.poller );
                }
            else if ( func === 'listening' ) {
                // Sending the "listener" message to the frame, to request status updates
                if ( iframe && iframe.contentWindow ) {
                    func = '{"event":"listening","id":' + JSON.stringify( '' + frame_id ) + '}';
                    iframe.contentWindow.postMessage( func, '*' );
                }
            } else if ( ( !queue || !queue.ready ) && ( !domReady || iframe && !iframe.contentWindow || typeof func === 'function' ) ) {
                if ( !queue )
                    queue = callPlayer.queue[ frame_id ] = [];
                queue.push( [ func, args ] );
                if ( !( 'poller' in queue ) ) {
                    // keep polling until the document and frame is ready
                    queue.poller = setInterval( function () {
                        callPlayer( frame_id, 'listening' );
                    }, 250 );
                    // Add a global "message" event listener, to catch status updates:
                    messageEvent( 1, function runOnceReady( e ) {
                        if ( !iframe ) {
                            iframe = document.getElementById( frame_id );
                            if ( !iframe )
                                return;
                            if ( iframe.tagName.toUpperCase() != 'IFRAME' ) {
                                iframe = iframe.getElementsByTagName( 'iframe' )[ 0 ];
                                if ( !iframe )
                                    return;
                                }
                            }
                        if ( e.source === iframe.contentWindow ) {
                            // Assume that the player is ready if we receive a
                            // message from the iframe
                            clearInterval( queue.poller );
                            queue.ready = true;
                            messageEvent( 0, runOnceReady );
                            // .. and release the queue:
                            while ( tmp = queue.shift() ) {
                                callPlayer( frame_id, tmp[0], tmp[ 1 ] );
                            }
                        }
                    }, false );
                }
            } else if ( iframe && iframe.contentWindow ) {
                // When a function is supplied, just call it (like "onYouTubePlayerReady")
                if ( func.call )
                    return func();

                // Frame exists, send message
                iframe.contentWindow.postMessage( JSON.stringify( {
                    "event": "command",
                    "func": func,
                    "args": args || [],
                    "id": frame_id
                } ), "*" );
            }
            /* IE8 does not support addEventListener... */
            function messageEvent( add, listener ) {
                var w3 = add
                    ? window.addEventListener
                    : window.removeEventListener;
                w3
                    ? w3( 'message', listener, !1 )
                    : (
                        add
                        ? window.attachEvent
                        : window.detachEvent)( 'onmessage', listener );
            }
        }
    }

    ///////////////////////////////////
    //  Interface - Toutes les pages  |
    ///////////////////////////////////

    // Sans-avatar anti-golem
    function sansAvatar_antiGolem() {
        setTimeout( function () {
            document.querySelectorAll( 'article .message-avatar > img, article img.avatar-thumb' ).forEach( function ( e ) {
                let avatar = e;
                if ( avatar.getAttribute( 'src' ) == '/images/noavatar.png' ) {
                    avatar.setAttribute( 'src', 'https://i.imgur.com/tpGuPkP.png' );
                }
            } );
        }, 50 );
    }

    // Mise à jour de la blacklist personnelle des pseudos sur le pannel
    function majPannel_BlacklistPseudos() {
        // Vider le tableau
        document.querySelectorAll( '#ss-table-blacklist-forumeurs > tbody > tr' ).forEach( function ( e ) {
            e.remove();
        } );
        // Parcourir la blacklist et remplir le tableau
        let corpsTableau = document.getElementById( 'ss-table-blacklist-forumeurs' ).getElementsByTagName( 'tbody' )[ 0 ];
        blacklist_pseudos.forEach( ( e, i ) => {
            // Colonnes
            let row = corpsTableau.insertRow( 0 );
            let cell_icone = row.insertCell( 0 );
            let cell_pseudo = row.insertCell( 1 );
            let cell_topics = row.insertCell( 2 );
            let cell_posts = row.insertCell( 3 );
            let cell_citations = row.insertCell( 4 );
            // Icone
            cell_icone.innerHTML = '<img class="ss-remove-btn" height="20px" src="/images/topic/delete.png" alt="Icône suppression" title="Déblacklister ce forumeur">';
            // Pseudo
            cell_pseudo.textContent = e.pseudo;
            cell_pseudo.setAttribute( 'id', 'ss-bl-pseudo' );
            // Range topics
            let input_topics = document.createElement( 'input' );
            input_topics.setAttribute( 'type', 'range' );
            input_topics.setAttribute( 'id', '#ss-bl-topics' );
            input_topics.setAttribute( 'class', 'ss-full-width' );
            input_topics.setAttribute( 'min', '1' );
            input_topics.setAttribute( 'max', '4' );
            input_topics.value = e.blocage_topics;
            cell_topics.appendChild( input_topics );
            // Range posts
            let input_posts = document.createElement( 'input' );
            input_posts.setAttribute( 'type', 'range' );
            input_posts.setAttribute( 'id', '#ss-bl-posts' );
            input_posts.setAttribute( 'class', 'ss-full-width' );
            input_posts.setAttribute( 'min', '1' );
            input_posts.setAttribute( 'max', '4' );
            input_posts.value = e.blocage_posts;
            cell_posts.appendChild( input_posts );
            // Range citations
            let input_citations = document.createElement( 'input' );
            input_citations.setAttribute( 'type', 'range' );
            input_citations.setAttribute( 'id', '#ss-bl-citations' );
            input_citations.setAttribute( 'class', 'ss-full-width' );
            input_citations.setAttribute( 'min', '1' );
            input_citations.setAttribute( 'max', '4' );
            input_citations.value = e.blocage_citations;
            cell_citations.appendChild( input_citations );
            // Events - Modif niveau de blocage
            input_topics.onchange = function () {
                let nouveau_niveau = input_topics.value;
                // Mémoriser le nouveau niveau pour les topics
                e.blocage_topics = nouveau_niveau;
            };
            input_posts.onchange = function () {
                let nouveau_niveau = input_posts.value;
                // Mémoriser le nouveau niveau pour les posts
                e.blocage_posts = nouveau_niveau;
            };
            input_citations.onchange = function () {
                let nouveau_niveau = input_citations.value;
                // Mémoriser le nouveau niveau pour les citations
                e.blocage_citations = nouveau_niveau;
            };
        } );
    }

    // Mise à jour des parametres sur le pannel
    function majPannel_Parametres() {
        // Toutes les pages
        document.getElementById( 'sw-corr-url-odysee' ).querySelector( 'input' ).checked = parametres[ "sw-corr-url-odysee" ];
        document.getElementById( 'sw-odysee' ).querySelector( 'input' ).checked = parametres[ "sw-odysee" ];
        document.getElementById( 'sw-twitter' ).querySelector( 'input' ).checked = parametres[ "sw-twitter" ];
        document.getElementById( 'sw-issoutv' ).querySelector( 'input' ).checked = parametres[ "sw-issoutv" ];
        document.getElementById( 'sw-pornhub' ).querySelector( 'input' ).checked = parametres[ "sw-pornhub" ];
        document.getElementById( 'sw-mp4-webm' ).querySelector( 'input' ).checked = parametres[ "sw-mp4-webm" ];
        document.getElementById( 'sw-tiktok' ).querySelector( 'input' ).checked = parametres[ "sw-tiktok" ];
        document.getElementById( 'sw-youtube-shorts' ).querySelector( 'input' ).checked = parametres[ "sw-youtube-shorts" ];
        document.getElementById( 'sw-spotify' ).querySelector( 'input' ).checked = parametres[ "sw-spotify" ];
        document.getElementById( 'sw-soundcloud' ).querySelector( 'input' ).checked = parametres[ "sw-soundcloud" ];
        document.getElementById( 'sw-streamable' ).querySelector( 'input' ).checked = parametres[ "sw-streamable" ];
        document.getElementById( 'sw-masquer-inutile' ).querySelector( 'input' ).checked = parametres[ "sw-masquer-inutile" ];
        document.getElementById( 'sw-posts-url' ).querySelector( 'input' ).checked = parametres[ "sw-posts-url" ];
        // Liste des topics
        document.getElementById( 'sw-refresh-topics' ).querySelector( 'input' ).checked = parametres[ "sw-refresh-topics" ];
        // Topic
        document.getElementById( 'sw-refresh-posts' ).querySelector( 'input' ).checked = parametres[ "sw-refresh-posts" ];
        document.getElementById( 'sw-recherche-posts' ).querySelector( 'input' ).checked = parametres[ "sw-recherche-posts" ];
        // Liste des MPs
        document.getElementById( 'sw-btn-quitter-mp' ).querySelector( 'input' ).checked = parametres[ "sw-btn-quitter-mp" ];
        // MPs
        document.getElementById( 'sw-recherche-mp' ).querySelector( 'input' ).checked = parametres[ "sw-recherche-mp" ];
        // Mes messages
        document.getElementById( 'sw-recherche-mes-messages' ).querySelector( 'input' ).checked = parametres[ "sw-recherche-mes-messages" ];
        // Profils
        document.getElementById( 'sw-custom-profils' ).querySelector( 'input' ).checked = parametres[ "sw-custom-profils" ];
        // Nouveaux messages
        document.getElementById( 'sw-prevoir-lock' ).querySelector( 'input' ).checked = parametres[ "sw-prevoir-lock" ];
        document.getElementById( 'sw-option-supplementaires' ).querySelector( 'input' ).checked = parametres[ "sw-option-supplementaires" ];
        document.getElementById( 'sw-formulaire-posts' ).querySelector( 'input' ).checked = parametres[ "sw-formulaire-posts" ];
        document.getElementById( 'sw-risibank-officiel' ).querySelector( 'input' ).checked = parametres[ "sw-risibank-officiel" ];
    }

    // Virer les trucs abandonnés sur l'interface
    function virerTrucsAbandonnes() {
        // Trucs de NoelRadio
        document.querySelectorAll( '.aside img' ).forEach( function ( e ) {
            e.remove();
        } );
        document.querySelectorAll( 'audio' ).forEach( function ( e ) {
            e.remove();
        } );
        if ( document.querySelectorAll( '.aside li' )[ 2 ] ) {
            document.querySelectorAll( '.aside li' )[ 2 ].remove();
        }
    }

    // Racourcis pour version mobile (mes messages, topics favoris et modération)
    function addMobileBtn( titre, url ) {
        // Créer le bouton
        let ulBtn = document.createElement( 'li' );
        let aBtn = document.createElement( 'a' );
        aBtn.innerText = titre;
        ulBtn.setAttribute( 'class', 'ss-mobile-only' );
        aBtn.setAttribute( 'href', url );
        ulBtn.appendChild( aBtn );
        // Ajouter à la navbar
        document.querySelector( '.nav.navbar-nav.navbar-links' ).appendChild( ulBtn );
    }

    // Créer le pannel de configuration du script
    function creerPannelStratoscript() {
        // Ajouter le bouton du script dans la barre de navigation
        let boutonScript = document.createElement( 'li' );
        boutonScript.innerHTML = '<a style="height:70px;width:55px" class="btnStratoscript" data-toggle="modal" data-target="#modalStratoscript" href="#stratoscriptPanel" ><img class="btnStratoscript" style="position:absolute" target="_blank" src="https://media.discordapp.net/attachments/592805019590459403/1120881416989843587/NzyZTYz.png" alt="Stratoscript" height="24"></a>';
        document.querySelector( '.navbar-links' ).appendChild( boutonScript );

        let css = '<style type="text/css"> /* Fix de histo de modé lorsque titre de topic trop long */ tbody a, tbody td:nth-of-type(4) { overflow-wrap: anywhere; } /* Fix des profils si long motif de ban sans espace */ div.surface div.text-center > div { overflow-wrap: anywhere; } /* ---------------- SLIDERS ---------------- */ /* The switch - the box around the slider */ .ss-switch { position: relative; display: inline-block; width: 60px; height: 34px; } /* Hide default HTML checkbox */ .ss-switch input { opacity: 0; width: 0; height: 0; } /* The slider */ .ss-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; -webkit-transition: 0.2s; transition: 0.2s; } .ss-slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: #242529; -webkit-transition: 0.2s; transition: 0.2s; } input:checked + .ss-slider { background-color: #fdde02; } input:focus + .ss-slider { box-shadow: 0 0 1px #fdde02; } input:checked + .ss-slider:before { -webkit-transform: translateX(26px); -ms-transform: translateX(26px); transform: translateX(26px); } /* Rounded sliders */ .ss-slider.ss-round { border-radius: 34px; } .ss-slider.ss-round:before { border-radius: 50%; } /* FOND DU PANEL */ .ss-panel-background { display: none; /* Hidden by default */ flex-direction: row; align-items: center; position: fixed; /* Stay in place */ z-index: 1; /* Sit on top */ left: 0; top: 0; width: 100%; /* Full width */ height: 100%; /* Full height */ overflow: auto; /* Enable scroll if needed */ background-color: rgb(0,0,0); /* Fallback color */ background-color: rgba(0,0,0,0.4); /* Black w/ opacity */ flex-direction: column; } /* Icone X Fermer */ span.ss-panel-close { color: #262626; font-size: 24px; font-weight: bold; } span.ss-panel-close:hover, span.ss-panel-close:focus { color: black; text-decoration: none; cursor: pointer; } /* ZONE PANEL */ .ss-panel { display: flex; flex-direction: column; color: #bbb; font-family: Tahoma, sans-serif; background-color: #2f3136; border: 1px solid #ccc; width: 1000px; max-height: 90%; margin-top: 30px; } @media screen and (max-width: 1000px) { .ss-panel { width: 100%; } } /* ------------------- FORMULAIRES ------------------- */ .ss-btn { width: 100px; height: 40px; padding: 10px !important; background-color: #2f3136 !important; border: none; color: #c8c8c9 !important; user-select: none; cursor: pointer; display: flex; flex-direction: row; justify-content: center; align-items:center; text-decoration: none !important; font-size: 16px; } .ss-btn:active { box-shadow: inset 1px 1px 5px black; } .ss-progressbar { background-color: #242529; height: 20px; width: 100px; } .ss-progressbar > * { text-align: center; vertical-align:middle; height: 100%; background-color: ; background: linear-gradient(orange, #fdde02, orange); color: #242529; } article .message-actions { display: flex !important; flex-direction: row; align-content: center; align-items: center; gap: 5px; } /* ------------------ STRUCTURE ------------------- */ .ss-panel-container { position:absolute; top:10vh; left:10vw; width:80vw; max-height:80vh; z-index:99999 } .ss-row { display: flex; flex-direction: row; flex-wrap: wrap; align-content: center; } .ss-col { display: flex; flex-direction: column; } .ss-fill { flex-grow: 4; } .ss-full-width { width: 100%; } .ss-space-between { justify-content: space-between; } .ss-space-childs { gap: 5px; } .disabled { pointer-events: none; filter: opacity(25%); } .ss-vert { background-color: #2ab27b !important; color: white !important; } .ss-vert:hover { background-color: #20ce88 !important; } .ss-rouge { background-color: #bf5329 !important; color:white !important; } .ss-rouge:hover { background-color: #d9501a !important; } .ss-gris-clair { background-color: #ccc !important; color:#242529 !important; } .hidden { display: none !important; } @media screen and (min-width: 768px) { .ss-mobile-only { display: none !important; } } .ss-mini-post .topic-message .message-content { min-height: auto !important; } /* ------------------ PARTIES DU PANEL ------------------- */ /* EN-TÊTE */ .ss-panel-header { background-image: linear-gradient(to bottom right, black, lightgrey); height: 44px; width: 100%; display: flex; flex-direction: row; justify-content: space-between; align-items:center; } .ss-panel-header > img { height:24px; margin: 10px; } .ss-panel-header > .ss-panel-close { margin-right: 15px; margin-bottom: 4px; } /* Zone onglets */ .ss-panel-onglets { background-color: none; margin: 15px 15px 5px 15px; display: flex; flex-direction: row; justify-content: flex-start; align-items:center; border-bottom: 1px solid #3e3d3d; list-style: none; } /* Onglet */ .ss-panel-onglets div a { user-select: none; cursor: pointer; width: 100px; height: 40px; display: flex; flex-direction: row; justify-content: center; align-items:center; text-decoration: none; font-size: 16px; } .ss-panel-onglets .active a       { color: #c8c8c9; background-color: #242529; } .ss-panel-onglets .active:hover a { color: #c8c8c9; background-color: #242529; } .ss-panel-onglets div:hover a     { color: #c8c8c9; background-color: #242529; } /* CORPS */ .ss-panel-body { display: flex; flex-direction: column; flex-wrap: wrap; margin: 10px; overflow-y: scroll; } .ss-zone { display: flex; flex-direction: column; flex-wrap: wrap; } .ss-mini-panel { display: flex; flex-direction: column; align-items: flex-start; margin:20px; padding: 10px; border: 1px solid #3e3d3d; flex: 1; } .ss-mini-panel-xs { display: flex; flex-direction: column; align-items: flex-start; margin:20px; padding: 10px; border: 1px solid #3e3d3d; } @media screen and (max-width: 800px) { .ss-mini-panel-xs { width: 100%; } } .ss-mini-panel > h3, .ss-mini-panel-xs > h3 { margin:-27px 0px 0px 0px; background-color:  #2f3136; padding-left: 10px; padding-right: 10px; font-size: 18px; font-weight:bold; line-height:1.5; } .ss-groupe-options { display: flex; flex-direction: row; align-items: center; justify-content: flex-start; flex-wrap: wrap; } .ss-option { align-items: center; display: inline-flex; margin:5px; width: 250px; } .ss-option div, .ss-label { margin: 5px; font-size: 15px; } .ss-option label { margin:0; } /* FOOTER */ .ss-panel-footer { display: flex; flex-direction: row; padding: 10px; border-top: 1px solid #3e3d3d; background-color: #242529; justify-content: space-between; align-items: center; padding-left: 30px; } /* SPECIFIQUES */ .ss-table-blacklist-forumeurs { color: #bbb; } .ss-sans-bordures { border: none; } .zone-resultats-recherche { width: 100%; } .ss-popup-profil { padding: 20px; display: flex; gap: 10px; left: 20px; bottom: 80px; background-color: rgba(255,75,75,.7); z-index: 99999; position: fixed; justify-content: flex-start; color: black; border-radius: 10px; flex-direction: column; align-items: stretch; align-content: flex-end; } .ss-popup-profil h3, .ss-popup-profil b { color: white; text-align: center; margin-top: 0px; } .ss-popup-profil div { gap: 10px; display: flex; flex-direction: row; justify-content: flex-end; align-items: center; } .ss-bouton-profil { cursor: pointer; display: flex; left: 20px; bottom: 20px; background-color: #fd4949; height: 50px; width: 50px; z-index: 99999; position: fixed; border-radius: 50%; justify-content: center; align-items: center; color: white; } img.ss-remove-btn { cursor: pointer; } </style>';

        let pannelHTML = '<div id="ss-panel-background" class="ss-panel-background"> <!-- Modal --> <div class="ss-panel"> <!-- En-tête --> <div class="ss-panel-header"> <img src="https://i.imgur.com/I9ngwnI.png" alt="Stratoscript"> <span class="ss-panel-close">&times;</span> </div> <!-- Onglets --> <div class="ss-panel-onglets"> <div id="ss-onglet-general" class="active"><a>Général</a></div> <div id="ss-onglet-blacklist"><a>Blacklist</a></div> </div> <!-- Corps --> <div class="ss-panel-body"> <!-- ONGLET GENERAL --> <div id="ss-zone-general" class="ss-zone" style="display: block;"> <div class="ss-mini-panel"> <h3>Intégrations <label id="sw-corr-url-odysee" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> </h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-twitter" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Twitter/X</div> </div> <div class="ss-option"> <label id="sw-issoutv" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>IssouTV</div> </div> <div class="ss-option"> <label id="sw-pornhub" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>PornHub</div> </div> <div class="ss-option"> <label id="sw-mp4-webm" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Fichiers MP4 et WEBM</div> </div> <div class="ss-option"> <label id="sw-odysee" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Odysee</div> </div> <div class="ss-option"> <label id="sw-tiktok" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Tiktok</div> </div><div class="ss-option"> <label id="sw-youtube-shorts" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>YouTube Shorts</div> </div> <div class="ss-option"> <label id="sw-spotify" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Spotify </div> </div> <div class="ss-option"> <label id="sw-soundcloud" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Soundcloud</div> </div> <div class="ss-option"> <label id="sw-streamable" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Streamable</div> </div> <div class="ss-option"> <label id="sw-masquer-inutile" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Masquer les 404</div> </div> <div class="ss-option"> <label id="sw-posts-url" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>URLs AVN (Posts)</div> </div> </div> </div> <div class="ss-row"> <div class="ss-mini-panel-xs"> <h3>Liste des topics</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-refresh-topics" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Autorefresh</div> </div> </div> </div> <div class="ss-mini-panel"> <h3>Topic</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-refresh-posts" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Autorefresh</div> </div> <div class="ss-option"> <label id="sw-recherche-posts" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Recherche</div> </div> </div> </div> </div> <div class="ss-row"> <div class="ss-mini-panel-xs"> <h3>Liste des MPs</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-btn-quitter-mp" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Bouton de sortie de MP</div> </div> </div> </div> <div class="ss-mini-panel"> <h3>MPs</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-recherche-mp"  class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Recherche</div> </div> </div> </div> <div class="ss-mini-panel-xs"> <h3>Mes messages</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-recherche-mes-messages"  class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Recherche</div> </div> </div> </div> <div class="ss-mini-panel"> <h3>Profils</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-custom-profils"  class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Outil de customization</div> </div> </div> </div> <div class="ss-mini-panel"> <h3>Nouveaux messages</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-prevoir-lock" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Prévoir lock/suppression</div> </div> <div class="ss-option"> <label id="sw-option-supplementaires" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Options supplémentaires</div> </div> <div class="ss-option"> <label id="sw-formulaire-posts" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Formulaire flottant</div> </div> <div class="ss-option"> <label id="sw-risibank-officiel" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Risibank officiel</div> </div> </div> </div> </div> </div> <!-- FIN ONGLET GENERAL --> <!-- ONGLET BLACKLIST --> <div id="ss-zone-blacklist" class="ss-zone ss-col" style="display: none;"> <div class="ss-row"> <div class="ss-mini-panel-xs ss-sans-bordures"> <div> <div class="ss-label">Blacklister un forumeur</div> <div class="ss-row"> <input type="text" class="ss-fill" placeholder="Pseudo" style="height:36px;min-width:200px"> <button id="ss-btn_blacklist_forumeurs_ajout" class="ss-btn ss-vert" type="button" style="height:36px;width:36px"><b style="transform: rotate(-45deg)">&times;</b></button> </div> </div> </div> <div class="ss-mini-panel"> <h3>Liste des formeurs bloqués</h3> <table class="ss-table-blacklist-forumeurs ss-full-width" id="ss-table-blacklist-forumeurs"> <thead style="background-image:linear-gradient(to bottom , #686868, #404040)"> <tr> <th style="font-size: 12px;width:30px"></th> <th style="font-size: 12px;">Pseudo</th> <th style="font-size: 12px;text-align: center;width:20%">Topics</th> <th style="font-size: 12px;text-align: center;width:20%">Posts</th> <th style="font-size: 12px;text-align: center;width:20%">Citations</th> </tr> </thead> <tbody> <tr id="ss-bl-element"> <td>#</td> <td id="ss-bl-pseudo" class="ss-label">MachinTrucTrucTruc</td> <td><input id="ss-bl-topics" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> <td><input id="ss-bl-posts" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> <td><input id="ss-bl-citations" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> </tr> <tr id="ss-bl-element"> <td>#</td> <td id="ss-bl-pseudo" class="ss-label">Bidoule</td> <td><input id="ss-bl-topics" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> <td><input id="ss-bl-posts" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> <td><input id="ss-bl-citations" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> </tr> <tr id="ss-bl-element"> <td>#</td> <td id="ss-bl-pseudo" class="ss-label">Jaaaaaj</td> <td><input id="ss-bl-topics" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> <td><input id="ss-bl-posts" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> <td><input id="ss-bl-citations" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> </tr> </tbody> </table> </div> </div> </div> <!-- FIN ONGLET BLACKLIST --> </div> <!-- Footer --> <div class="ss-panel-footer"> <span class="label" id="ss-version">Version 1.0</span> <div class="ss-row ss-space-childs"> <button type="button" class="ss-btn ss-panel-close">Fermer</button> <button type="button" class="ss-btn ss-panel-valider ss-vert" id="btn-validation-parametres">Valider</button> </div> </div> </div> <!-- Fin modal --> </div>';

        pannelHTML += css;

        document.getElementById( 'stratoscriptPanel' ).innerHTML = pannelHTML;

        majPannel_BlacklistPseudos();
        majPannel_Parametres();

        // Affichage de la version
        document.querySelectorAll( '#ss-version' ).forEach( ( e ) => {
            e.innerHTML = 'Version ' + version;
        } );

        /////////////
        //  EVENTS  |
        /////////////

        // Event - Ouverture du pannel
        document.querySelector( '.btnStratoscript' ).onclick = function () {
            document.getElementById( "ss-panel-background" ).style.display = "flex";

            if ( parametres.onglet_actif != null && parametres.onglet_actif != '' ) {
                // Ouvrir le dernier onglet ouvert
                document.getElementById( parametres.onglet_actif + '' ).click();
            } else {
                // Ouvrir l'onglet général par défaut
                document.getElementById( 'ss-onglet-general' ).click();
            }
        };
        // Event - Fermeture du pannel
        document.querySelectorAll( ".ss-panel-close" ).forEach( function ( e ) {
            e.onclick = function () {
                document.getElementById( "ss-panel-background" ).style.display = "none";
            };
        } );
        // Event - Clic sur le background de n'importe quel panel
        window.onclick = function ( event ) {
            if ( event.target.classList.contains( 'ss-panel-background' ) ) {
                // Fermer ce panel
                event.target.style.display = "none";
            }
        };

        /////////////////////////////////
        //  EVENTS - BLACKLIST PSEUDOS  |
        /////////////////////////////////

        // Event - Blacklist pseudos : Clic bouton d'ajout
        document.getElementById( 'ss-btn_blacklist_forumeurs_ajout' ).onclick = function () {
            let pseudo = document.getElementById( 'ss-btn_blacklist_forumeurs_ajout' ).previousElementSibling.value.trim();
            let dejaBL = false;
            blacklist_pseudos.forEach( function ( e ) {
                if ( e.pseudo == pseudo )
                    dejaBL = true;
                }
            );
            if ( pseudo !== "" && !dejaBL ) {
                let nv_pseudo_bl = {
                    pseudo: pseudo,
                    blocage_topics: 2,
                    blocage_posts: 2,
                    blocage_citations: 3
                };
                blacklist_pseudos.push( nv_pseudo_bl );
                // Ajouter le pseudo à la liste
                majPannel_BlacklistPseudos();
                // Vider le champs
                document.getElementById( 'ss-btn_blacklist_forumeurs_ajout' ).previousElementSibling.value = "";
            }
        };
        // Event - Blacklist pseudos : Clic bouton de suppression
        document.querySelectorAll( '.ss-remove-btn' ).forEach( ( e, i ) => {
            e.onclick = function () {
                let pseudo = e.parentElement.parentElement.querySelector( '#ss-bl-pseudo' ).innerText.trim();
                if ( pseudo !== "" ) {
                    let index_a_suppr = [];
                    blacklist_pseudos.forEach( function ( e, i ) {
                        if ( e.pseudo == pseudo ) {
                            index_a_suppr.push( i );
                        }
                    } );
                    // Parcourir à l'envers et supprimer (car la suppression nique les index)
                    for ( var i = index_a_suppr.length - 1; i >= 0; i-- ) {
                        blacklist_pseudos.splice( index_a_suppr[i], 1 );
                    }
                    majPannel_BlacklistPseudos();
                }
            };
        } );

        ///////////////////////
        //  EVENTS - ONGLETS  |
        ///////////////////////

        // Event - Clic sur l'onglet Général
        document.getElementById( 'ss-onglet-general' ).onclick = function () {
            // Onglets
            document.querySelectorAll( '.ss-panel-onglets > div' ).forEach( function ( e ) {
                e.classList.remove( 'active' );
            } );
            document.getElementById( 'ss-onglet-general' ).classList.add( 'active' );
            // Zones
            document.querySelectorAll( '.ss-panel-body > .ss-zone' ).forEach( function ( e ) {
                e.style.display = 'none';
            } );
            document.getElementById( 'ss-zone-general' ).style.display = 'block';

            // Mémoriser l'onglet actif
            parametres.onglet_actif = document.getElementById( "stratoscriptPanel" ).querySelector( '.ss-panel-onglets .active' ).id;
            localStorage.setItem( "ss_parametres", JSON.stringify( parametres ) );
        };
        // Event - Clic sur l'onglet Blacklist
        document.getElementById( 'ss-onglet-blacklist' ).onclick = function () {
            // Onglets
            document.querySelectorAll( '.ss-panel-onglets > div' ).forEach( function ( e ) {
                e.classList.remove( 'active' );
            } );
            document.getElementById( 'ss-onglet-blacklist' ).classList.add( 'active' );
            // Zones
            document.querySelectorAll( '.ss-panel-body > .ss-zone' ).forEach( function ( e ) {
                e.style.display = 'none';
            } );
            document.getElementById( 'ss-zone-blacklist' ).style.display = 'block';

            // Mémoriser l'onglet actif
            parametres.onglet_actif = document.getElementById( "stratoscriptPanel" ).querySelector( '.ss-panel-onglets .active' ).id;
            localStorage.setItem( "ss_parametres", JSON.stringify( parametres ) );
        };

        //////////////////////////
        //  EVENTS - PARAMETRES  |
        //////////////////////////

        // Event - Clic sur le bouton de validation des paramètres
        document.querySelectorAll( '#btn-validation-parametres' ).forEach( function ( e ) {
            e.onclick = function () {
                let onglet_actif = parametres.onglet_actif;
                parametres = {};
                // Onglet actif
                parametres[ "onglet_actif" ] = onglet_actif;
                // Toutes les pages
                parametres[ "sw-corr-url-odysee" ] = document.getElementById( 'sw-corr-url-odysee' ).querySelector( 'input' ).checked;
                parametres[ "sw-odysee" ] = document.getElementById( 'sw-odysee' ).querySelector( 'input' ).checked;
                parametres[ "sw-twitter" ] = document.getElementById( 'sw-twitter' ).querySelector( 'input' ).checked;
                parametres[ "sw-issoutv" ] = document.getElementById( 'sw-issoutv' ).querySelector( 'input' ).checked;
                parametres[ "sw-pornhub" ] = document.getElementById( 'sw-pornhub' ).querySelector( 'input' ).checked;
                parametres[ "sw-mp4-webm" ] = document.getElementById( 'sw-mp4-webm' ).querySelector( 'input' ).checked;
                parametres[ "sw-tiktok" ] = document.getElementById( 'sw-tiktok' ).querySelector( 'input' ).checked;
                parametres[ "sw-spotify" ] = document.getElementById( 'sw-spotify' ).querySelector( 'input' ).checked;
                parametres[ "sw-soundcloud" ] = document.getElementById( 'sw-soundcloud' ).querySelector( 'input' ).checked;
                parametres[ "sw-youtube-shorts" ] = document.getElementById( 'sw-youtube-shorts' ).querySelector( 'input' ).checked;
                parametres[ "sw-streamable" ] = document.getElementById( 'sw-streamable' ).querySelector( 'input' ).checked;
                parametres[ "sw-masquer-inutile" ] = document.getElementById( 'sw-masquer-inutile' ).querySelector( 'input' ).checked;
                parametres[ "sw-posts-url" ] = document.getElementById( 'sw-posts-url' ).querySelector( 'input' ).checked;
                // Liste des topics
                parametres[ "sw-refresh-topics" ] = document.getElementById( 'sw-refresh-topics' ).querySelector( 'input' ).checked;
                // Topic
                parametres[ "sw-refresh-posts" ] = document.getElementById( 'sw-refresh-posts' ).querySelector( 'input' ).checked;
                parametres[ "sw-recherche-posts" ] = document.getElementById( 'sw-recherche-posts' ).querySelector( 'input' ).checked;
                // Liste des MPs
                parametres[ "sw-btn-quitter-mp" ] = document.getElementById( 'sw-btn-quitter-mp' ).querySelector( 'input' ).checked;
                // MPs
                parametres[ "sw-recherche-mp" ] = document.getElementById( 'sw-recherche-mp' ).querySelector( 'input' ).checked;
                // Mes messages
                parametres[ "sw-recherche-mes-messages" ] = document.getElementById( 'sw-recherche-mes-messages' ).querySelector( 'input' ).checked;
                // Profils
                parametres[ "sw-custom-profils" ] = document.getElementById( 'sw-custom-profils' ).querySelector( 'input' ).checked;
                // Nouveaux messages
                parametres[ "sw-prevoir-lock" ] = document.getElementById( 'sw-prevoir-lock' ).querySelector( 'input' ).checked;
                parametres[ "sw-option-supplementaires" ] = document.getElementById( 'sw-option-supplementaires' ).querySelector( 'input' ).checked;
                parametres[ "sw-formulaire-posts" ] = document.getElementById( 'sw-formulaire-posts' ).querySelector( 'input' ).checked;
                parametres[ "sw-risibank-officiel" ] = document.getElementById( 'sw-risibank-officiel' ).querySelector( 'input' ).checked;

                // Mettre à jour le LocalStorage
                localStorage_save( parametres, "ss_parametres" );
                localStorage_save( blacklist_pseudos, "ss_blacklist_pseudos" );
                // Recharger la page
                location.reload();
            };
        } );
    }

    // Déplacement vers le haut et le bas de la page
    function hautPage() {
        window.scrollTo( 0, 0 );
    }
    function basPage() {
        window.scrollTo( 0, document.body.scrollHeight );
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

    /////////////////////////
    //  FIX DECALAGE IMGUR  |
    /////////////////////////
    function fixDecalageImgur( element ) {
        // Sortir les images des <a>
        element.querySelectorAll( '.board' ).forEach( function ( e ) {
            let img = e.querySelector( 'img.board-picture' );
            let a = e.querySelector( 'a.board-target' );
            a.remove();
            e.appendChild( img );
        } );
    }

    ////////////////
    //  INDEXEDDB  |
    ////////////////
    // https://www.tutorialspoint.com/html5/html5_indexeddb.htm
    // https://gist.github.com/JamesMessinger/a0d6389a5d0e3a24814b
    class SSDatabase {
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
            this.request = indexedDB.open( "Stratoscript", version );
            // Update needed
            this.request.onupgradeneeded = function ( event ) {
                let db = event.target.result;
                // Schemas
                db.createObjectStore( "MesMessages", { keyPath: "id" } );
                db.createObjectStore( "MesProfils", { keyPath: "id" } );
            };
        }
        // Mes Messages
        mesMessages_add( id, content, html, date, heure, auteur ) {
            let db = this.request.result;
            let tx = db.transaction( "MesMessages", "readwrite" );
            let store = tx.objectStore( "MesMessages" );

            store.put( {
                id: id,
                text: content,
                html: html,
                date: date,
                heure: heure,
                auteur: auteur
            } );
        }
        async mesMessages_get() {
            return new Promise( ( resolve, reject ) => {
                let db = this.request.result;
                let tx = db.transaction( "MesMessages", "readonly" );
                let store = tx.objectStore( "MesMessages" );

                let db_messages = store.getAll();
                tx.oncomplete = ( e ) => {
                    let messages = db_messages.result;
                    console.log( messages );
                    resolve( messages );
                };
            } );
        }
        // Mes Profils
        mesProfils_add( id, fond, musique, bio, avatar ) {
            let db = this.request.result;
            let tx = db.transaction( "MesProfils", "readwrite" );
            let store = tx.objectStore( "MesProfils" );

            store.put( { id: id, fond: fond, musique: musique, bio: bio, avatar: avatar } );
        }
        async mesProfils_get() {
            return new Promise( ( resolve, reject ) => {
                let db = this.request.result;
                let tx = db.transaction( "MesProfils", "readonly" );
                let store = tx.objectStore( "MesProfils" );

                let db_messages = store.getAll();
                tx.oncomplete = ( e ) => {
                    let messages = db_messages.result;
                    console.log( messages );
                    resolve( messages );
                };
            } );
        }

        // Database close
        close() {
            let db = this.request.result;
            db.close();
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
    function localStorage_save( liste, emplacementLS ) {
        // Mettre à jour le LocalStorage
        localStorage.setItem( emplacementLS, JSON.stringify( liste ) );

        return liste;
    }

    ////////////////////
    // INITIALISATION  |
    ////////////////////

    // initialisation sans attendre le chargement complet
    initialisation_preshot();
    // Initialisation après chargement complet
    window.onload = function () {
        setTimeout( function () {
            initialisation();
            console.log( "Stratoscript démarré !" );
        }, 100 );
    };

} )();
