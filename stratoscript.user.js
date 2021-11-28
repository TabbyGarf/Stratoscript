// ==UserScript==
// @name         Stratoscript
// @namespace    http://tampermonkey.net/
// @version      1.4.2
// @description
// @author       Stratosphere
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

    /* ==========================================================
    |                                                           |
    |                      INITIALISATION                       |
    |                                                           |
    ========================================================== */

    function initialisation_preshot() {
        console.log( "Démarrage du Stratoscript..." );
        parametres = localStorage_chargement( "ss_parametres" );
        blacklist_pseudos = localStorage_chargement( "ss_blacklist_pseudos" );

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
            // Modifier le contenu (blacklist...)
            modifPosts( document );
        }
        // LISTE DES TOPICS
        if ( path.startsWith( "/forum" ) || path.startsWith( "/index.php/forum" ) ) {
            // Modifier le contenu (blacklist...)
            modifListeTopics( document );
        }
    }

    async function initialisation() {
        // Script Tweeter
        if ( parametres[ "sw-twitter" ] == true ) {
            var s = document.createElement( "script" );
            s.type = "text/javascript";
            s.src = "https://platform.twitter.com/widgets.js";
            s.async = true;
            document.head.append( s );
        }

        // TOUTES LES PAGES, SAUF LE PANNEL ADMIN
        if ( !path.startsWith( "/admin" ) ) {
            // Créer le pannel de config du script
            creerPannelStratoscript();
            // Lecteurs Vocaroo, IssouTV, Webm etc...
            ajoutLecteursEtIntegrations();
        }
        // TOPIC
        if ( path.startsWith( "/topic" ) || path.startsWith( "/index.php/topic" ) ) {
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
        }
        // LISTE DES TOPICS
        if ( path.startsWith( "/forum" ) || path.startsWith( "/index.php/forum" ) ) {
            if ( parametres[ "sw-refresh-topics" ] == true ) {
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
        // Modifier le contenu (blacklist, etc..)
        modifPosts( doc );
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
        ajoutLecteursEtIntegrations();
        // Spoilers
        ajoutSpoilers();
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

    function ajoutRecherchePosts() {
        let modalRecherche = '<!-- Fond modal--> <div id="ss-modal-recherche" class="ss-panel-background"> <!-- Modal --> <div class="ss-panel"> <!-- En-tête --> <div class="ss-panel-header"> <img src="https://i.imgur.com/I9ngwnI.png" alt="Stratoscript"> <span class="ss-panel-close">&times;</span> </div> <!-- Corps --> <div class="ss-panel-body"><div class="ss-col"> <!-- Filtres de recherche --> <div class="ss-mini-panel"> <h3>Filtres de recherche</h3> <div class="ss-row ss-space-childs ss-full-width"> <div class="ss-row ss-fill ss-space-childs"> <input type="text" class="ss-fill inputFiltreAuteur" style="height:36px;min-width:200px" placeholder="Auteur"> <input type="text" class="ss-fill inputFiltreContenu" style="height:36px;min-width:200px" placeholder="Contenu"> </div> <button id="btn-recherche" class="ss-btn ss-vert" type="button">Rechercher</button> </div> </div> <!-- Barre de progrssion --> <div class="ss-row" style="margin:0px 20px 20px 20px"> <div class="ss-progressbar ss-full-width" style="display:none"> <div class="ss-col" style="width:0%"></div> </div> </div><!-- Résultats de recherche --> <div class="ss-mini-panel"> <h3>Résultats de recherche</h3> <div class="zone-resultats-recherche ss-col" style="padding:10px"> </div> </div> </div></div> <!-- Footer --> <div class="ss-panel-footer"> <span class="label" id="ss-version">Version </span> <div class="ss-row"> <button type="button" class="ss-btn ss-panel-close">Fermer</button> </div></div> </div> <!-- Fin modal --> </div> <!-- Fin fond modal -->';

        let zoneRecherche = document.createElement( 'div' );
        zoneRecherche.setAttribute( "id", "zoneRecherche" );
        zoneRecherche.setAttribute( "class", "ss-panel-container" );
        zoneRecherche.innerHTML = modalRecherche;
        document.querySelector( 'body' ).appendChild( zoneRecherche );

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
            let progressbar = document.querySelector( "#ss-modal-recherche .ss-progressbar" )
            let filtre_auteur = document.querySelector( '#ss-modal-recherche .inputFiltreAuteur' ).value.toLowerCase();
            let filtre_contenu = document.querySelector( '#ss-modal-recherche .inputFiltreContenu' ).value.toLowerCase();

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
                    let auteur = e.querySelector( '.message-username ' ).innerText.toLowerCase();
                    let contenu = e.querySelector( '.message-content ' ).innerText.toLowerCase();
                    // Si les filtres matchent
                    if ( !( contenu.indexOf( filtre_contenu ) == -1 ) && !( auteur.indexOf( filtre_auteur ) == -1 ) ) {
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

    // Modifications exclusives à la liste des posts d'un topic
    async function modifPosts( page ) {
        let niveau_blocage = 2;
        if ( parametres[ "ss-rg-blacklist-forumeurs" ] != null && parametres[ "ss-rg-blacklist-forumeurs" ] != '' ) {
            niveau_blocage = parametres[ "ss-rg-blacklist-forumeurs" ];
        }
        // Parcourir tous les messages du topic
        page.querySelectorAll( '.topic-messages > article' ).forEach( function ( e ) {
            // Appliquer la blacklist de pseudos
            let pseudo = e.querySelector( '.message-username' ).textContent.replace( /(\r\n|\n|\r)/gm, "" );

            if ( blacklist_pseudos.indexOf( pseudo ) >= 0 ) {
                if ( niveau_blocage == 1 ) {
                    e.querySelector( '.message-content' ).textContent = ' [ Contenu blacklisté ] ';
                    e.setAttribute( 'style', 'background-color: rgba(247,24,24,.2)' );
                } else if ( niveau_blocage == 2 ) {
                    e.innerHTML = '<div style="margin:10px; text-align:center;width:100%"> [ Contenu blacklisté ] </div>';
                    e.setAttribute( 'style', 'background-color: rgba(247,24,24,.2)' );
                } else if ( niveau_blocage == 3 ) {
                    e.remove();
                }
            }
        } );

        // Parcourir toutes les citations du topic
        page.querySelectorAll( 'blockquote' ).forEach( function ( e ) {
            // Appliquer la blacklist de pseudos
            if ( e.querySelector( '.message-content-quote-author' ) ) {
                let pseudo = e.querySelector( '.message-content-quote-author' ).textContent.replace( /(\r\n|\n|\r)/gm, "" );

                if ( blacklist_pseudos.indexOf( pseudo ) >= 0 ) {
                    if ( niveau_blocage == 2 ) {
                        e.textContent = " [ Contenu blacklisté ] ";
                    } else if ( niveau_blocage == 3 ) {
                        e.parentNode.parentNode.parentNode.remove();
                    }
                }
            }
        } );
    }

    // Intégrations
    function ajoutLecteursEtIntegrations() {
        // Trouver tous les URLs dans les posts
        document.querySelectorAll( '.message-content a' ).forEach( async function ( e ) {

            let url = e.getAttribute( 'href' );

            // Odysee - Correction d'URL
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
                if ( parametres[ "sw-odysee" ] == true && urlCorrige.match( /https:\/\/odysee\.com\/(@.+)\/(.+):(.+)/ ) ) {
                    // Créer le lecteur
                    let lecteurOdysee = document.createElement( "iframe" );
                    let id_video = /https:\/\/odysee\.com\/(@.+)\/(.+):(.+)/.exec( urlCorrige )[ 2 ];
                    lecteurOdysee.setAttribute( "id", "lbry-iframe" );
                    lecteurOdysee.setAttribute( "width", "380" );
                    lecteurOdysee.setAttribute( "height", "214" );
                    lecteurOdysee.setAttribute( "src", "https://odysee.com/$/embed/" + id_video );
                    lecteurOdysee.setAttribute( "allowfullscreen", "allowfullscreen" );
                    // Ramplacer le lien par le lecteur
                    e.parentNode.replaceChild( lecteurOdysee, e );

                    console.log( "https://odysee.com/$/embed/" + id_video );
                }
            }

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

            // Vocaroo
            if ( parametres[ "sw-vocaroo" ] == true && url.match( /https:\/\/(voca\.ro|(?:www\.)?vocaroo\.com)\/([A-z0-9]+)/ ) ) {
                // Créer le lecteur
                let lecteurVocaroo = document.createElement( "iframe" );
                let id_vocaroo = /https:\/\/(voca\.ro|(?:www\.)?vocaroo\.com)\/([A-z0-9]+)/.exec( url )[ 2 ];
                lecteurVocaroo.setAttribute( "width", "300" );
                lecteurVocaroo.setAttribute( "height", "60" );
                lecteurVocaroo.setAttribute( "src", "https://vocaroo.com/embed/" + id_vocaroo + "?autoplay=0" );
                lecteurVocaroo.setAttribute( "frameborder", "0" );
                lecteurVocaroo.setAttribute( "allow", "autoplay" );
                // Ramplacer le lien par le lecteur
                e.parentNode.parentNode.replaceChild( lecteurVocaroo, e.parentNode );
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

    ///////////////////////////////////
    //  Interface - Liste des topics  |
    ///////////////////////////////////

    async function refreshTopics() {
        // Animation refresh
        document.querySelector( '.btn-autorefresh-topics' ).classList.add( 'processing' );
        // Récupérer la liste des topics à la bonne page
        let doc = await getDoc( document.location );
        // Modifier le contenu (blacklist...)
        modifListeTopics( doc );
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

    // Modif de la liste des topics
    function modifListeTopics( page ) {

        let niveau_blocage = 2;
        if ( parametres[ "ss-rg-blacklist-forumeurs" ] != null && parametres[ "ss-rg-blacklist-forumeurs" ] != '' ) {
            niveau_blocage = parametres[ "ss-rg-blacklist-forumeurs" ];
        }
        // Parcourir les topics de la liste des topics
        page.querySelectorAll( '.topics > tbody > tr' ).forEach( ( e ) => {
            // Appliquer la blacklist de pseudos
            let pseudo = e.querySelector( '.topics-author' ).textContent.replace( /(\r\n|\n|\r)/gm, "" );

            if ( blacklist_pseudos.indexOf( pseudo ) >= 0 ) {
                if ( niveau_blocage == 1 ) {
                    e.querySelector( ".topics-title" ).textContent = ' [ Contenu blacklisté ] ';
                } else if ( niveau_blocage == 2 ) {
                    e.innerHTML = '<td></td><td class="topics-title">[ Contenu blacklisté ]</td><td></td><td></td><td></td>';
                } else if ( niveau_blocage == 3 ) {
                    e.remove();
                }
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
        let modalRecherche = '<!-- Fond modal--> <div id="ss-modal-recherche" class="ss-panel-background"> <!-- Modal --> <div class="ss-panel"> <!-- En-tête --> <div class="ss-panel-header"> <img src="https://i.imgur.com/I9ngwnI.png" alt="Stratoscript"> <span class="ss-panel-close">&times;</span> </div> <!-- Corps --> <div class="ss-panel-body"><div class="ss-col"> <!-- Filtres de recherche --> <div class="ss-mini-panel"> <h3>Filtres de recherche</h3> <div class="ss-row ss-space-childs ss-full-width"> <div class="ss-row ss-fill ss-space-childs"> <input type="text" class="ss-fill inputFiltreAuteur" style="height:36px;min-width:200px" placeholder="Auteur"> <input type="text" class="ss-fill inputFiltreContenu" style="height:36px;min-width:200px" placeholder="Contenu"> </div> <button id="btn-recherche" class="ss-btn ss-vert" type="button">Rechercher</button> </div> </div> <!-- Barre de progrssion --> <div class="ss-row" style="margin:0px 20px 20px 20px"> <div class="ss-progressbar ss-full-width" style="display:none"> <div class="ss-col" style="width:0%"></div> </div> </div><!-- Résultats de recherche --> <div class="ss-mini-panel"> <h3>Résultats de recherche</h3> <div class="zone-resultats-recherche ss-col" style="padding:10px"> </div> </div> </div></div> <!-- Footer --> <div class="ss-panel-footer"> <span class="label" id="ss-version">Version </span> <div class="ss-row"> <button type="button" class="ss-btn ss-panel-close">Fermer</button> </div></div> </div> <!-- Fin modal --> </div> <!-- Fin fond modal -->';

        let zoneRecherche = document.createElement( 'div' );
        zoneRecherche.setAttribute( "id", "zoneRecherche" );
        zoneRecherche.setAttribute( "class", "ss-panel-container" );
        zoneRecherche.innerHTML = modalRecherche;
        document.querySelector( 'body' ).appendChild( zoneRecherche );

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
            let progressbar = document.querySelector( "#ss-modal-recherche .ss-progressbar" )
            let filtre_auteur = document.querySelector( '#ss-modal-recherche .inputFiltreAuteur' ).value.toLowerCase();
            let filtre_contenu = document.querySelector( '#ss-modal-recherche .inputFiltreContenu' ).value.toLowerCase();

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
                    let auteur = e.querySelector( '.message-username ' ).innerText.toLowerCase();
                    let contenu = e.querySelector( '.message-content ' ).innerText.toLowerCase();
                    // Si les filtres matchent
                    if ( !( contenu.indexOf( filtre_contenu ) == -1 ) && !( auteur.indexOf( filtre_auteur ) == -1 ) ) {
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

    ///////////////////////////////////
    //  Interface - Toutes les pages  |
    ///////////////////////////////////

    // Mise à jour de la blacklist personnelle des pseudos sur le pannel
    function majPannel_BlacklistPseudos() {
        // Vider le tableau
        document.querySelectorAll( '#ss-table-blacklist-forumeurs > tbody > tr' ).forEach( function ( e ) {
            e.remove();
        } );
        // Parcourir la blacklist et remplir le tableau
        let corpsTableau = document.getElementById( 'ss-table-blacklist-forumeurs' ).getElementsByTagName( 'tbody' )[ 0 ];
        for ( let i = 0; i < blacklist_pseudos.length; ++i ) {
            let row = corpsTableau.insertRow( 0 );
            let cell1 = row.insertCell( 0 );
            let cell2 = row.insertCell( 1 );
            cell1.innerHTML = '<span class="glyphicon glyphicon-user"></span>';
            cell2.textContent = blacklist_pseudos[ i ];
        }
    }

    // Mise à jour des parametres sur le pannel
    function majPannel_Parametres() {
        console.log( parametres );
        // Toutes les pages
        document.getElementById( 'sw-corr-url-odysee' ).querySelector( 'input' ).checked = parametres[ "sw-corr-url-odysee" ];
        document.getElementById( 'sw-odysee' ).querySelector( 'input' ).checked = parametres[ "sw-odysee" ];
        document.getElementById( 'sw-twitter' ).querySelector( 'input' ).checked = parametres[ "sw-twitter" ];
        document.getElementById( 'sw-issoutv' ).querySelector( 'input' ).checked = parametres[ "sw-issoutv" ];
        document.getElementById( 'sw-vocaroo' ).querySelector( 'input' ).checked = parametres[ "sw-vocaroo" ];
        document.getElementById( 'sw-pornhub' ).querySelector( 'input' ).checked = parametres[ "sw-pornhub" ];
        document.getElementById( 'sw-mp4-webm' ).querySelector( 'input' ).checked = parametres[ "sw-mp4-webm" ];
        document.getElementById( 'sw-masquer-inutile' ).querySelector( 'input' ).checked = parametres[ "sw-masquer-inutile" ];
        document.getElementById( 'sw-posts-url' ).querySelector( 'input' ).checked = parametres[ "sw-posts-url" ];
        // Liste des topics
        document.getElementById( 'sw-refresh-topics' ).querySelector( 'input' ).checked = parametres[ "sw-refresh-topics" ];
        // Topic
        document.getElementById( 'sw-refresh-posts' ).querySelector( 'input' ).checked = parametres[ "sw-refresh-posts" ];
        document.getElementById( 'sw-formulaire-posts' ).querySelector( 'input' ).checked = parametres[ "sw-formulaire-posts" ];
        document.getElementById( 'sw-recherche-posts' ).querySelector( 'input' ).checked = parametres[ "sw-recherche-posts" ];
        // Liste des MPs
        document.getElementById( 'sw-btn-quitter-mp' ).querySelector( 'input' ).checked = parametres[ "sw-btn-quitter-mp" ];
        // MPs
        document.getElementById( 'sw-recherche-mp' ).querySelector( 'input' ).checked = parametres[ "sw-recherche-mp" ];
        // Blacklist forumeurs
        document.getElementById( 'ss-rg-blacklist-forumeurs' ).value = parametres[ "ss-rg-blacklist-forumeurs" ];
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
        document.querySelectorAll( '.aside li' )[ 2 ].remove();
    }

    // Créer le pannel de configuration du script
    function creerPannelStratoscript() {
        // Ajouter le bouton du script dans la barre de navigation
        let boutonScript = document.createElement( 'li' );
        boutonScript.innerHTML = '<a style="height:70px;width:55px" class="btnStratoscript" data-toggle="modal" data-target="#modalStratoscript" href="#stratoscriptPanel" ><img class="btnStratoscript" style="position:absolute" target="_blank" src="https://i.imgur.com/29iypJm.png" alt="Stratoscript" height="24"></a>';
        document.querySelector( '.navbar-links' ).appendChild( boutonScript );

        let css = '<style type="text/css"> /* ---------------- SLIDERS ---------------- */ /* The switch - the box around the slider */ .ss-switch { position: relative; display: inline-block; width: 60px; height: 34px; } /* Hide default HTML checkbox */ .ss-switch input { opacity: 0; width: 0; height: 0; } /* The slider */ .ss-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; -webkit-transition: 0.2s; transition: 0.2s; } .ss-slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: #242529; -webkit-transition: 0.2s; transition: 0.2s; } input:checked + .ss-slider { background-color: #fdde02; } input:focus + .ss-slider { box-shadow: 0 0 1px #fdde02; } input:checked + .ss-slider:before { -webkit-transform: translateX(26px); -ms-transform: translateX(26px); transform: translateX(26px); } /* Rounded sliders */ .ss-slider.ss-round { border-radius: 34px; } .ss-slider.ss-round:before { border-radius: 50%; }/* FOND DU PANEL */ .ss-panel-background {display: none; /* Hidden by default */flex-direction: row;align-items: center;position: fixed; /* Stay in place */z-index: 1; /* Sit on top */left: 0;top: 0;width: 100%; /* Full width */height: 100%; /* Full height */overflow: auto; /* Enable scroll if needed */background-color: rgb(0,0,0); /* Fallback color */background-color: rgba(0,0,0,0.4); /* Black w/ opacity */flex-direction: column; } /* Icone X Fermer */ span.ss-panel-close {color: #262626;font-size: 24px;font-weight: bold; } span.ss-panel-close:hover, span.ss-panel-close:focus {color: black;text-decoration: none;cursor: pointer; } /* ZONE PANEL */ .ss-panel { display: flex; flex-direction: column; color: #bbb; font-family: Tahoma, sans-serif; background-color: #2f3136; border: 1px solid #ccc; width: 1000px; max-height: 90%; margin-top: 30px; } @media screen and (max-width: 1000px) { .ss-panel { width: 100%; } }/* ------------------- FORMULAIRES ------------------- */ .ss-btn { width: 100px; height: 40px; padding: 10px; background-color: #2f3136; /* Green */ border: none; color: #c8c8c9; user-select: none; cursor: pointer; display: flex; flex-direction: row; justify-content: center; align-items:center; text-decoration: none; font-size: 16px; } .ss-btn:active { box-shadow: inset 1px 1px 5px black; } .ss-progressbar { background-color: #242529; height: 20px; width: 100px; } .ss-progressbar > * { text-align: center; vertical-align:middle; height: 100%; background-color: ; background: linear-gradient(orange, #fdde02, orange); color: #242529; }/* ------------------ STRUCTURE ------------------- */ .ss-panel-container { position:absolute; top:10vh; left:10vw; width:80vw; max-height:80vh; z-index:99999 } .ss-row { display: flex; flex-direction: row; flex-wrap: wrap; align-content: center; } .ss-col { display: flex; flex-direction: column; } .ss-fill { flex-grow: 4; } .ss-full-width { width: 100%; } .ss-space-between { justify-content: space-between; } .ss-space-childs { gap: 5px; } .disabled { pointer-events: initial; } .ss-vert { background-color: #2ab27b; color: white; } .ss-vert:hover { background-color: #20ce88; } .ss-rouge { background-color: #bf5329; color:white; } .ss-rouge:hover { background-color: #d9501a; } .ss-gris-clair { background-color: #ccc; color:#242529; }/* ------------------PARTIES DU PANEL ------------------- */ /* EN-TÊTE */ .ss-panel-header { background-image: linear-gradient(to bottom right, black, lightgrey); height: 44px; width: 100%; display: flex; flex-direction: row; justify-content: space-between; align-items:center; } .ss-panel-header > img { height:24px; margin: 10px; } .ss-panel-header > .ss-panel-close { margin-right: 15px; margin-bottom: 4px; } /* Zone onglets */ .ss-panel-onglets { background-color: none; margin: 15px 15px 5px 15px; display: flex; flex-direction: row; justify-content: flex-start; align-items:center;border-bottom: 1px solid #3e3d3d; list-style: none; } /* Onglet */ .ss-panel-onglets div a { user-select: none; cursor: pointer; width: 100px; height: 40px; display: flex; flex-direction: row; justify-content: center; align-items:center; text-decoration: none; font-size: 16px; } .ss-panel-onglets .active a { color: #c8c8c9; background-color: #242529; } .ss-panel-onglets .active:hover a { color: #c8c8c9; background-color: #242529; } .ss-panel-onglets div:hover a { color: #c8c8c9; background-color: #242529; }/* CORPS */ .ss-panel-body { display: flex; flex-direction: column; flex-wrap: wrap; margin: 10px; overflow-y: scroll; } .ss-zone { display: flex; flex-direction: column; flex-wrap: wrap; } .ss-mini-panel { display: flex; flex-direction: column; align-items: flex-start; margin:20px; padding: 10px; border: 1px solid #3e3d3d; flex: 1; } .ss-mini-panel-xs { display: flex; flex-direction: column; align-items: flex-start; margin:20px; padding: 10px; border: 1px solid #3e3d3d; } @media screen and (max-width: 800px) { .ss-mini-panel-xs { width: 100%; } } .ss-mini-panel > h3, .ss-mini-panel-xs > h3 { margin:-27px 0px 0px 0px; background-color:#2f3136; padding-left: 10px; padding-right: 10px; font-size: 18px; font-weight:bold; line-height:1.5; } .ss-groupe-options { display: flex; flex-direction: row; align-items: center; justify-content: flex-start; flex-wrap: wrap; } .ss-option { align-items: center; display: inline-flex; margin:5px; width: 250px; } .ss-option div, .ss-label { margin: 5px; font-size: 15px; } .ss-option label { margin:0; } /* FOOTER */ .ss-panel-footer { display: flex; flex-direction: row; padding: 10px; border-top: 1px solid #3e3d3d; background-color: #242529; justify-content: space-between; align-items: center; padding-left: 30px; } /* SPECIFIQUES */ .ss-table-blacklist-forumeurs { color: #bbb; } .ss-sans-bordures { border: none; } </style>';

        let pannelHTML = '<!-- Fond modal--> <div id="ss-panel-background" class="ss-panel-background"> <!-- Modal --> <div class="ss-panel"> <!-- En-tête --> <div class="ss-panel-header"> <img src="https://i.imgur.com/I9ngwnI.png" alt="Stratoscript"> <span class="ss-panel-close">&times;</span> </div> <!-- Onglets --> <div class="ss-panel-onglets"> <div id="ss-onglet-general" class="active"><a>Général</a></div> <div id="ss-onglet-blacklist"><a>Blacklist</a></div> </div> <!-- Corps --> <div class="ss-panel-body"><!-- ONGLET GENERAL --> <div id="ss-zone-general" class="ss-zone"> <div class="ss-mini-panel"> <h3>Ensemble du forum</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-twitter" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Affichage des tweets</div> </div> <div class="ss-option"> <label id="sw-issoutv" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Lecteurs IssouTV</div> </div> <div class="ss-option"> <label id="sw-vocaroo" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Lecteurs Vocaroo</div> </div> <div class="ss-option"> <label id="sw-pornhub" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Lecteurs PornHub</div> </div> <div class="ss-option"> <label id="sw-mp4-webm" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Lecteurs mp4 et webm</div> </div> <div class="ss-option"> <label id="sw-corr-url-odysee" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Correction URLs Odysee</div> </div> <div class="ss-option"> <label id="sw-odysee" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Lecteurs Odysee</div> </div> <div class="ss-option"> <label id="sw-masquer-inutile" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Masquer les trucs morts</div> </div> <div class="ss-option"> <label id="sw-posts-url" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Posts par URL</div> </div> </div> </div><div class="ss-row"> <div class="ss-mini-panel-xs"> <h3>Liste des topics</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-refresh-topics" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Autorefresh</div> </div> </div> </div><div class="ss-mini-panel"> <h3>Topic</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-refresh-posts" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Autorefresh</div> </div> <div class="ss-option"> <label id="sw-recherche-posts" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Recherche</div> </div> <div class="ss-option"> <label id="sw-formulaire-posts" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Formulaire flottant</div> </div> </div> </div> </div><div class="ss-row"> <div class="ss-mini-panel-xs"> <h3>Liste des MPs</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-btn-quitter-mp" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Bouton de sortie de MP</div> </div> </div> </div><div class="ss-mini-panel"> <h3>MPs</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-recherche-mp"class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Recherche</div> </div> </div> </div> </div> </div> <!-- FIN ONGLET GENERAL --><!-- ONGLET BLACKLIST --> <div id="ss-zone-blacklist" class="ss-zone ss-col" style="display: none;"><div class="ss-row"> <div class="ss-mini-panel-xs ss-sans-bordures"> <div> <div class="ss-label">Blacklister un forumeur</div> <div class="ss-row"> <input type="text" class="ss-fill" placeholder="Pseudo" style="height:36px;min-width:200px"> <button id="ss-btn_blacklist_forumeurs_ajout" class="ss-btn ss-vert" type="button" style="height:36px;width:36px"><b style="transform: rotate(-45deg)">&times;</b></button> </div> </div><div> <div class="ss-label">Déblacklister un forumeur</div> <div class="ss-row"> <input type="text" class="ss-fill" placeholder="Pseudo" style="height:36px;min-width:200px"> <button id="ss-btn_blacklist_forumeurs_suppr" class="ss-btn ss-rouge" type="button" style="height:36px;width:36px"><b style="margin-left:2px">&times;</b></button> </div> </div> </div><div class="ss-mini-panel"> <h3>Liste des formeurs bloqués</h3> <table class="ss-table-blacklist-forumeurs ss-full-width" id="ss-table-blacklist-forumeurs"> <thead> <tr> <th style="width:40px"></th> <th></th> </tr> </thead> <tbody></tbody> </table> </div> </div><div class="ss-mini-panel"> <h3>Niveau de blocage</h3> <div class="ss-col ss-full-width"> <div class="ss-row ss-space-between"> <div style="text-align:left"><p class="ss-label">Faible</p></div><div style="text-align:center"><p class="ss-label">Moyen</p></div><div style="text-align:right"><p class="ss-label">Elevé</p></div> </div><input type="range" class="ss-rg-blacklist-forumeurs" id="ss-rg-blacklist-forumeurs" min="1" max="3"> </div> </div></div> <!-- FIN ONGLET BLACKLIST --></div> <!-- Footer --> <div class="ss-panel-footer"> <span class="label" id="ss-version">Version </span> <div class="ss-row ss-space-childs"> <button type="button" class="ss-btn ss-panel-close">Fermer</button> <button type="button" class="ss-btn ss-panel-valider ss-vert" id="btn-validation-parametres">Valider</button> </div></div> </div> <!-- Fin modal --> </div> <!-- Fin fond modal -->';

        pannelHTML += css;

        document.getElementById( 'stratoscriptPanel' ).innerHTML = pannelHTML;

        majPannel_BlacklistPseudos();
        majPannel_Parametres();

        // Affichage de la version
        document.querySelectorAll( '#ss-version' ).forEach( ( e ) => {
            e.innerHTML = 'Version 1.4.2';
        } );

        //////////////
        //  BOUTONS  |
        //////////////

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
        // Event - Fermture du pannel
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

        //////////////////////////////////
        //  BOUTONS - BLACKLIST PSEUDOS  |
        //////////////////////////////////

        // Event - Blacklist pseudos : Changement du niveau de blocage
        document.getElementById( 'ss-rg-blacklist-forumeurs' ).onclick = function () {
            let niveau_blacklist_pseudos = document.getElementById( 'ss-rg-blacklist-forumeurs' ).value;
            // Enregistrer dans les parametres
            parametres[ "ss-rg-blacklist-forumeurs" ] = niveau_blacklist_pseudos;
        };
        // Event - Blacklist pseudos : Clic bouton d'ajout
        document.getElementById( 'ss-btn_blacklist_forumeurs_ajout' ).onclick = function () {
            let pseudo = document.getElementById( 'ss-btn_blacklist_forumeurs_ajout' ).previousElementSibling.value.trim();
            if ( pseudo !== "" ) {
                // Ajouter le pseudo à la liste
                blacklist_pseudos.push( pseudo );
                majPannel_BlacklistPseudos();
            }
        };
        // Event - Blacklist pseudos : Clic bouton de suppression
        document.getElementById( 'ss-btn_blacklist_forumeurs_suppr' ).onclick = function () {
            let pseudo = document.getElementById( 'ss-btn_blacklist_forumeurs_suppr' ).previousElementSibling.value.trim();
            if ( pseudo !== "" ) {
                // Retirer de la liste
                let index = blacklist_pseudos.indexOf( pseudo );
                if ( index !== -1 ) {
                    blacklist_pseudos.splice( index, 1 );
                }
                majPannel_BlacklistPseudos();
            }
        };

        ////////////////////////
        //  BOUTONS - ONGLETS  |
        ////////////////////////

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

        ///////////////////////////
        //  BOUTONS - PARAMETRES  |
        ///////////////////////////

        // Event - Clic sur le bouton de validation des paramètres
        document.querySelectorAll( '#btn-validation-parametres' ).forEach( function ( e ) {
            e.onclick = function () {
                parametres = {};
                // Toutes les pages
                parametres[ "sw-corr-url-odysee" ] = document.getElementById( 'sw-corr-url-odysee' ).querySelector( 'input' ).checked;
                parametres[ "sw-odysee" ] = document.getElementById( 'sw-odysee' ).querySelector( 'input' ).checked;
                parametres[ "sw-twitter" ] = document.getElementById( 'sw-twitter' ).querySelector( 'input' ).checked;
                parametres[ "sw-issoutv" ] = document.getElementById( 'sw-issoutv' ).querySelector( 'input' ).checked;
                parametres[ "sw-vocaroo" ] = document.getElementById( 'sw-vocaroo' ).querySelector( 'input' ).checked;
                parametres[ "sw-pornhub" ] = document.getElementById( 'sw-pornhub' ).querySelector( 'input' ).checked;
                parametres[ "sw-mp4-webm" ] = document.getElementById( 'sw-mp4-webm' ).querySelector( 'input' ).checked;
                parametres[ "sw-masquer-inutile" ] = document.getElementById( 'sw-masquer-inutile' ).querySelector( 'input' ).checked;
                parametres[ "sw-posts-url" ] = document.getElementById( 'sw-posts-url' ).querySelector( 'input' ).checked;
                // Liste des topics
                parametres[ "sw-refresh-topics" ] = document.getElementById( 'sw-refresh-topics' ).querySelector( 'input' ).checked;
                // Topic
                parametres[ "sw-refresh-posts" ] = document.getElementById( 'sw-refresh-posts' ).querySelector( 'input' ).checked;
                parametres[ "sw-formulaire-posts" ] = document.getElementById( 'sw-formulaire-posts' ).querySelector( 'input' ).checked;
                parametres[ "sw-recherche-posts" ] = document.getElementById( 'sw-recherche-posts' ).querySelector( 'input' ).checked;
                // Liste des MPs
                parametres[ "sw-btn-quitter-mp" ] = document.getElementById( 'sw-btn-quitter-mp' ).querySelector( 'input' ).checked;
                // MPs
                parametres[ "sw-recherche-mp" ] = document.getElementById( 'sw-recherche-mp' ).querySelector( 'input' ).checked;
                // Blacklist forumeurs
                parametres[ "ss-rg-blacklist-forumeurs" ] = document.getElementById( 'ss-rg-blacklist-forumeurs' ).value;
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
