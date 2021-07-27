// ==UserScript==
// @name         Stratoscript
// @namespace    http://tampermonkey.net/
// @version      0.51
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
            document.querySelector( '.main-container' ).appendChild( zonePannel );
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
            document.querySelector( '.topic-messages' ).appendChild( e )
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
        document.querySelectorAll( ".grey-btn[data-refresh*='.main-section']" ).forEach( function ( e ) {
            let boutonRefresh = document.createElement( 'a' );
            boutonRefresh.setAttribute( "id", "btn-autorefresh-posts" );
            boutonRefresh.setAttribute( "class", "btn-autorefresh-posts btn grey-btn" );
            boutonRefresh.setAttribute( "style", "font-size: .9em" );
            boutonRefresh.innerHTML = "<i class='glyphicon glyphicon-refresh'></i>";

            e.parentNode.insertBefore( boutonRefresh, e );
            e.remove();
        } );
        // Evenements
        let boutonsAutorefresh = document.querySelectorAll( "#btn-autorefresh-posts" );
        boutonsAutorefresh.forEach( function ( e ) {
            e.onclick = function () {
                // Si on clique sur le bouton pour couper l'auto-refresh...
                if ( !e.classList.contains( 'grey-btn' ) ) {
                    boutonsAutorefresh.forEach( function ( btn ) {
                        btn.classList.add( 'grey-btn' );
                        btn.classList.remove( 'btn-success' );
                    } );
                } else {
                    autorefreshPosts( 0 );
                }
            }
            e.ondblclick = function () {
                // Si on double-clique sur le bouton pour allumer l'auto-refresh...
                if ( e.classList.contains( 'grey-btn' ) ) {
                    boutonsAutorefresh.forEach( function ( btn ) {
                        btn.classList.add( 'btn-success' );
                        btn.classList.remove( 'grey-btn' );
                    } );
                    autorefreshPosts( 1 );
                }
            }
        } );
    }

    function ajoutRecherchePosts() {
        let modalRecherche = '<!-- MODAL RECHERCE--><div class="modal fade" id="modalRecherche" tabindex="-1" role="dialog" aria-labelledby="modalRechercheLabel"> <div class="modal-dialog modal-lg" role="document"><div class="modal-content"><div class="modal-header" style="background-image: linear-gradient(to bottom right, black, lightgrey);"> <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button> <h4 class="modal-title" id="modalRechercheLabel"><img id="btnStratoscript" style="position:absolute" target="_blank" src="https://i.imgur.com/I9ngwnI.png" alt="Stratoscript" height="24"></h4></div><div class="modal-body" style="overflow-y:scroll;max-height:75vh"><div class="col-md-12"> <div class="row"> <div class="col-md-12"> <div class="row"><!-- Filtres de recherche --> <div class="panel panel-default"> <div class="panel-body"> <h4>Filtres de recherche</h4> <br> <div class="row"> <div class="col-md-6"> <input type="text" class="form-control inputFiltreAuteur" placeholder="Auteur"> </div> <div class="col-md-6"> <input type="text" class="form-control inputFiltreContenu" placeholder="Contenu"> </div> </div></div> <div class="panel-footer"> <button id="btn-recherche" class="btn btn-primary" type="button">Rechercher</button> </div> </div><!-- Barre de progrssion --> <div class="progress progression_recherche hidden" style="margin-top:20px"> <div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" style="width:0%"> 0% </div> </div><!-- Résultats de recherche --> <div class="panel panel-default"> <div class="panel-body"> <h4>Résultats de recherche</h4> <br> <div class="zone-resultats-recherche row" style="padding:10px"> </div> </div> </div></div> </div> </div></div></div><div class="modal-footer"> <button type="button" class="btn grey-btn" data-dismiss="modal">Fermer</button></div></div> </div> </div>';

        let zoneRecherche = document.createElement( 'div' );
        zoneRecherche.setAttribute( "id", "zoneRecherche" )
        zoneRecherche.innerHTML = modalRecherche;
        document.querySelector( '.main-container' ).appendChild( zoneRecherche );

        // Ajout du bouton de recherche
        let btnRechercher = document.createElement( 'button' );
        btnRechercher.setAttribute( "style", "margin-right:3px" );
        btnRechercher.setAttribute( "data-toggle", "modal" );
        btnRechercher.setAttribute( "data-target", "#modalRecherche" );
        btnRechercher.setAttribute( "class", "btn btn-primary btn-rechercher pull-right" );
        btnRechercher.innerText = 'Rechercher';
        document.querySelector( '.topic-moderation' ).append( btnRechercher );

        // Event - Clic sur le bouton de recherche
        document.getElementById( 'btn-recherche' ).onclick = function () {
            rechercheTopic();
        }

        async function rechercheTopic() {
            let progressbar = document.querySelector( '.progression_recherche' );
            let filtre_auteur = document.querySelector( '.inputFiltreAuteur' ).value;
            let filtre_contenu = document.querySelector( '.inputFiltreContenu' ).value;

            let pagination = document.querySelector( '.pagination-topic ' ).querySelectorAll( 'li' )
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
                    let auteur = e.querySelector( '.message-username ' ).innerText;
                    let contenu = e.querySelector( '.message-content ' ).innerText;
                    // Si les filtres matchent
                    if ( !( contenu.indexOf( filtre_contenu ) == -1 ) && !( auteur.indexOf( filtre_auteur ) == -1 ) ) {
                        document.querySelector( '.zone-resultats-recherche' ).append( e );
                    }
                } );
                // Affichage progressbar
                let pourcentage = Math.ceil( page * 100 / page_max );
                progressbar.classList.remove( 'hidden' );
                progressbar.children[ 0 ].setAttribute( "style", "width:" + pourcentage + "%" );
                progressbar.children[ 0 ].innerText = pourcentage + '%';
            }
            // Cacher progressbar
            progressbar.classList.add( 'hidden' );
        }
    }

    // Mettre les events sur les citations permettant d'ouvrir le nv formulaire si on clic dessus
    function preparation_nouveauFormulairePost() {
        // Event - Clic sur un bouton de citation d'un post
        document.querySelectorAll( '.message-quote' ).forEach( function ( e ) {
            e.onclick = function () {
                // Ouvrir le formulaire de post
                document.querySelector( '.btn-agrandir' ).click();
            }
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
        section.append( form )
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
        }
        // Event - Clic sur le bouton de réduction
        reponse_agrandir.onclick = function () {
            if ( zone.getAttribute( "style" ) == "z-index: 1031; position:fixed;bottom:5px;padding:10px;height:50px" ) {
                zone.setAttribute( "style", "z-index: 1031; position:fixed;bottom:5px;padding:10px" );
                reponse_reduire.classList.remove( 'hidden' );
                reponse_agrandir.classList.add( 'hidden' );
            }
        }

        // Mémoriser le contenu du post en tant que brouillon, si la page est quittée avec le forumaire non vide
        window.onbeforeunload = function ( event ) {
            if ( envoiFormulaire == false ) {
                let saisie = document.querySelector( '.zoneNouveauFormulairePosts textarea' ).value;
                // Save le brouillon
                localStorage.setItem( "ss_brouillon", JSON.stringify( saisie ) );
            }
        }
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
        if ( parametres[ "rg-blacklist-forumeurs" ] != null && parametres[ "rg-blacklist-forumeurs" ] != '' ) {
            niveau_blocage = parametres[ "rg-blacklist-forumeurs" ];
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
                        postIntegre.setAttribute( "class", "row topic-message odd" );
                    } else if ( e.parentNode.parentNode.parentNode.parentNode.classList.contains( 'odd' ) ) {
                        postIntegre.setAttribute( "class", "row topic-message" );
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
                }

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
                    }
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
            }
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
            document.querySelector( '.topics > tbody' ).appendChild( e )
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
        if ( parametres[ "rg-blacklist-forumeurs" ] != null && parametres[ "rg-blacklist-forumeurs" ] != '' ) {
            niveau_blocage = parametres[ "rg-blacklist-forumeurs" ];
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
        boutonRefresh.setAttribute( 'class', 'btn-autorefresh-topics btn grey-btn' );
        boutonRefresh.setAttribute( 'style', 'font-size: .9em' );
        boutonRefresh.innerHTML = "<i class='glyphicon glyphicon-refresh'></i>";
        let ancienBtnRefresh = document.querySelector( ".grey-btn[data-refresh*='.topics']" );
        ancienBtnRefresh.parentNode.replaceChild( boutonRefresh, ancienBtnRefresh );

        // Event - Simple clic sur le bouton refresh
        boutonRefresh.onclick = function () {
            // Si on clique sur le bouton pour couper l'auto-refresh...
            if ( !boutonRefresh.classList.contains( 'grey-btn' ) ) {
                // Mémoriser l'état
                parametres[ "etat_autorefresh_topics" ] = false;
                localStorage.setItem( "ss_parametres", JSON.stringify( parametres ) );
                // Couper l'autorefresh
                boutonRefresh.classList.add( 'grey-btn' );
                boutonRefresh.classList.remove( 'btn-success' );
            } else {
                autorefreshTopics( 0 );
            }
        }
        // Event - Double clic sur le bouton refresh
        boutonRefresh.ondblclick = function () {
            // Si on double-clique sur le bouton pour allumer l'auto-refresh...
            if ( boutonRefresh.classList.contains( 'grey-btn' ) ) {
                // Mémoriser l'état
                parametres[ "etat_autorefresh_topics" ] = true;
                localStorage.setItem( "ss_parametres", JSON.stringify( parametres ) );
                // Allumer autorefresh
                boutonRefresh.classList.add( 'btn-success' );
                boutonRefresh.classList.remove( 'grey-btn' );
                autorefreshTopics( 1 );
            }
        }

        // Activation auto de l'autorefresh, si déjà activé sur la page précédente
        if ( parametres[ "etat_autorefresh_topics" ] == true ) {
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
        let modalRecherche = '<!-- MODAL RECHERCE--><div class="modal fade" id="modalRecherche" tabindex="-1" role="dialog" aria-labelledby="modalRechercheLabel"> <div class="modal-dialog modal-lg" role="document"><div class="modal-content"><div class="modal-header" style="background-image: linear-gradient(to bottom right, black, lightgrey);"> <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button> <h4 class="modal-title" id="modalRechercheLabel"><img id="btnStratoscript" style="position:absolute" target="_blank" src="https://i.imgur.com/I9ngwnI.png" alt="Stratoscript" height="24"></h4></div><div class="modal-body" style="overflow-y:scroll;max-height:75vh"><div class="col-md-12"> <div class="row"> <div class="col-md-12"> <div class="row"><!-- Filtres de recherche --> <div class="panel panel-default"> <div class="panel-body"> <h4>Filtres de recherche</h4> <br> <div class="row"> <div class="col-md-6"> <input type="text" class="form-control inputFiltreAuteur" placeholder="Auteur"> </div> <div class="col-md-6"> <input type="text" class="form-control inputFiltreContenu" placeholder="Contenu"> </div> </div></div> <div class="panel-footer"> <button id="btn-recherche" class="btn btn-primary" type="button">Rechercher</button> </div> </div><!-- Barre de progrssion --> <div class="progress progression_recherche hidden" style="margin-top:20px"> <div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" style="width:0%"> 0% </div> </div><!-- Résultats de recherche --> <div class="panel panel-default"> <div class="panel-body"> <h4>Résultats de recherche</h4> <br> <div class="zone-resultats-recherche row" style="padding:10px"> </div> </div> </div></div> </div> </div></div></div><div class="modal-footer"> <button type="button" class="btn grey-btn" data-dismiss="modal">Fermer</button></div></div> </div> </div>';

        let zoneRecherche = document.createElement( 'div' );
        zoneRecherche.setAttribute( "id", "zoneRecherche" )
        zoneRecherche.innerHTML = modalRecherche;
        document.querySelector( '.main-container' ).appendChild( zoneRecherche );

        // Retirer la classe "col-md-2" au bouton refresh qui rend moche
        document.querySelector( '.topic-title' ).nextElementSibling.nextElementSibling.querySelector( '.col-md-2' ).classList.remove( 'col-md-2' );

        // Ajout du bouton de recherche
        let btnRechercher = document.createElement( 'button' );
        btnRechercher.setAttribute( "style", "margin-right:3px" );
        btnRechercher.setAttribute( "data-toggle", "modal" );
        btnRechercher.setAttribute( "data-target", "#modalRecherche" );
        btnRechercher.setAttribute( "class", "btn btn-primary btn-rechercher pull-right" );
        btnRechercher.innerText = 'Rechercher';
        document.querySelector( '.topic-title' ).nextElementSibling.nextElementSibling.append( btnRechercher );

        // Event - Clic sur le bouton de recherche
        document.getElementById( 'btn-recherche' ).onclick = function () {
            rechercheMP();
        }

        async function rechercheMP() {
            let progressbar = document.querySelector( '.progression_recherche' );
            let filtre_auteur = document.querySelector( '.inputFiltreAuteur' ).value;
            let filtre_contenu = document.querySelector( '.inputFiltreContenu' ).value;

            let pagination = document.querySelector( '.pagination-topic ' ).querySelectorAll( 'li' )
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
                    let auteur = e.querySelector( '.message-username ' ).innerText;
                    let contenu = e.querySelector( '.message-content ' ).innerText;
                    // Si les filtres matchent
                    if ( !( contenu.indexOf( filtre_contenu ) == -1 ) && !( auteur.indexOf( filtre_auteur ) == -1 ) ) {
                        document.querySelector( '.zone-resultats-recherche' ).append( e );
                    }
                } );
                // Affichage progressbar
                let pourcentage = Math.ceil( page * 100 / page_max );
                progressbar.classList.remove( 'hidden' );
                progressbar.children[ 0 ].setAttribute( "style", "width:" + pourcentage + "%" );
                progressbar.children[ 0 ].innerText = pourcentage + '%';
            }
            // Cacher progressbar
            progressbar.classList.add( 'hidden' );
        }
    }

    ///////////////////////////////////
    //  Interface - Toutes les pages  |
    ///////////////////////////////////

    // Mise à jour de la blacklist personnelle des pseudos sur le pannel
    function majPannel_BlacklistPseudos() {
        // Vider le tableau
        document.querySelectorAll( '#table-blacklist-forumeurs > tbody > tr' ).forEach( function ( e ) {
            e.remove();
        } );
        // Parcourir la blacklist et remplir le tableau
        let corpsTableau = document.getElementById( 'table-blacklist-forumeurs' ).getElementsByTagName( 'tbody' )[ 0 ];
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
        document.getElementById( 'rg-blacklist-forumeurs' ).value = parametres[ "rg-blacklist-forumeurs" ];
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
        boutonScript.innerHTML = '<a style="height:70px;width:145px" class="btnStratoscript" data-toggle="modal" data-target="#modalStratoscript" href="#stratoscriptPanel" ><img class="btnStratoscript" style="position:absolute" target="_blank" src="https://i.imgur.com/I9ngwnI.png" alt="Stratoscript" height="24"></a>';
        document.querySelector( '.navbar-links' ).appendChild( boutonScript );

        let cssSliders
        if ( theme_noir ) {
            cssSliders = '<style type="text/css">/* The switch - the box around the slider */.switch {position: relative;display: inline-block;width: 60px;height: 34px;}/* Hide default HTML checkbox */.switch input {opacity: 0;width: 0;height: 0;}/* The slider */.slider {position: absolute;cursor: pointer;top: 0;left: 0;right: 0;bottom: 0;background-color: #ccc;-webkit-transition: .4s;transition: .4s;}.slider:before {position: absolute;content: "";height: 26px;width: 26px;left: 4px;bottom: 4px;background-color:#333333;-webkit-transition: .4s;transition: .4s;}input:checked + .slider {background-color: #fdde02;}input:focus + .slider {box-shadow: 0 0 1px #fdde02;}input:checked + .slider:before {-webkit-transform: translateX(26px);-ms-transform: translateX(26px);transform: translateX(26px);}/* Rounded sliders */.slider.round {border-radius: 34px;}.slider.round:before {border-radius: 50%;}</style>';
        } else {
            cssSliders = '<style type="text/css">/* The switch - the box around the slider */.switch {position: relative;display: inline-block;width: 60px;height: 34px;}/* Hide default HTML checkbox */.switch input {opacity: 0;width: 0;height: 0;}/* The slider */.slider {position: absolute;cursor: pointer;top: 0;left: 0;right: 0;bottom: 0;background-color: #ccc;-webkit-transition: .4s;transition: .4s;}.slider:before {position: absolute;content: "";height: 26px;width: 26px;left: 4px;bottom: 4px;background-color: white;-webkit-transition: .4s;transition: .4s;}input:checked + .slider {background-color: #fdde02;}input:focus + .slider {box-shadow: 0 0 1px #fdde02;}input:checked + .slider:before {-webkit-transform: translateX(26px);-ms-transform: translateX(26px);transform: translateX(26px);}/* Rounded sliders */.slider.round {border-radius: 34px;}.slider.round:before {border-radius: 50%;}</style>';
        }

        let pannelHTML = '<div class="modal fade" id="modalStratoscript" tabindex="-1" role="dialog" aria-labelledby="modalStratoscriptLabel"> <div class="modal-dialog modal-lg" role="document"><div class="modal-content"><div class="modal-header" style="background-image: linear-gradient(to bottom right, black, lightgrey);"> <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button> <h4 class="modal-title" id="modalStratoscriptLabel"><img id="btnStratoscript" style="position:absolute" target="_blank" src="https://i.imgur.com/I9ngwnI.png" alt="Stratoscript" height="24"></h4></div><div id="stratoscriptPanel" class="modal-body" style="overflow-y:scroll;max-height:75vh"><div class="row"><div class="col-md-12"><ul id="onglets" class="nav nav-tabs onglets"> <li id="onglet-general"><a>Général</a></li> <li id="onglet-blacklist"><a>Blacklist</a></li></ul> </div> </div><div id="zones-container" class="zones-container row"> <!-- ONGLET GENERAL --> <div id="zone-general" class="col-md-12"><div class="col-md-12"><div class="panel-heading"><h3>Général</h3></div><!-- TOUTES LES PAGES --> <div class="panel panel-default"><div class="panel-body"> <h4>Ensemble du forum</h4> <br> <div class="row"><div class="col-md-4"> <div style="align-items: center; display: inline-flex;margin-bottom:5px"><label id="sw-twitter" class="switch" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label><div>Intégration Tweeter</div> </div></div><div class="col-md-4"> <div style="align-items: center; display: inline-flex;margin-bottom:5px"><label id="sw-issoutv" class="switch" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label><div>Intégration IssouTV</div> </div></div><div class="col-md-4"> <div style="align-items: center; display: inline-flex;margin-bottom:5px"><label id="sw-vocaroo" class="switch" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label><div>Intégration Vocaroo</div> </div></div><div class="col-md-4"> <div style="align-items: center; display: inline-flex;margin-bottom:5px"><label id="sw-pornhub" class="switch" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label><div>Intégration PornHub</div> </div></div><div class="col-md-4"> <div style="align-items: center; display: inline-flex;margin-bottom:5px"><label id="sw-mp4-webm" class="switch" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label><div>Intégration mp4 et webm</div> </div></div> </div><br><div class="row"><div class="col-md-4"> <div style="align-items: center; display: inline-flex;margin-bottom:5px"><label id="sw-masquer-inutile" class="switch" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label><div>Masquer les trucs inutiles</div> </div></div><div class="col-md-4"> <div style="align-items: center; display: inline-flex;margin-bottom:5px"><label id="sw-posts-url" class="switch" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label><div>Affichage des posts par URL</div> </div></div> </div> </div><div class="panel-footer"> <button id="btn-validation-parametres" class="btn grey-btn" type="button">Valider</button></div> </div> <!-- LISTE DES TOPICS --> <div class="panel panel-default"><div class="panel-body"> <h4>Liste des topics</h4> <br> <div class="row"><div class="col-md-4"> <div style="align-items: center; display: inline-flex;margin-bottom:5px"><label id="sw-refresh-topics" class="switch" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label><div>Refresh amélioré</div> </div></div> </div></div><div class="panel-footer"> <button id="btn-validation-parametres" class="btn grey-btn" type="button">Valider</button></div> </div> <!-- TOPIC --> <div class="panel panel-default"><div class="panel-body"> <h4>Topic</h4> <br> <div class="row"><div class="col-md-4"> <div style="align-items: center; display: inline-flex;margin-bottom:5px"><label id="sw-refresh-posts" class="switch" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label><div>Refresh amélioré</div> </div></div> <div class="col-md-4"> <div style="align-items: center; display: inline-flex;margin-bottom:5px"><label id="sw-formulaire-posts" class="switch" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label><div>Formulaire superposé</div> </div></div> <div class="col-md-4"> <div style="align-items: center; display: inline-flex;margin-bottom:5px"><label id="sw-recherche-posts" class="switch" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label><div>Recherche dans topic</div> </div></div> </div></div><div class="panel-footer"> <button id="btn-validation-parametres" class="btn grey-btn" type="button">Valider</button></div> </div> <!-- LISTE DES MPS --> <div class="panel panel-default"><div class="panel-body"> <h4>Liste des MPs</h4> <br> <div class="row"><div class="col-md-4"> <div style="align-items: center; display: inline-flex;margin-bottom:5px"><label id="sw-btn-quitter-mp" class="switch" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label><div>Bouton de sortie de MP</div> </div></div> </div></div><div class="panel-footer"> <button id="btn-validation-parametres" class="btn grey-btn" type="button">Valider</button></div> </div> <!-- MPS --> <div class="panel panel-default"><div class="panel-body"> <h4>MPs</h4> <br> <div class="row"><div class="col-md-4"> <div style="align-items: center; display: inline-flex;margin-bottom:5px"><label id="sw-recherche-mp" class="switch" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label><div>Recherche dans les MPs</div> </div></div> </div></div><div class="panel-footer"> <button id="btn-validation-parametres" class="btn grey-btn" type="button">Valider</button></div> </div> </div> </div><!-- ONGLET BLACKLIST --> <div id="zone-blacklist" class="col-md-12"> <div class="col-md-12"> <div class="panel-heading"><h3>Blacklist de forumeurs</h3></div><div class="panel panel-default"><div class="panel-body"> <div class="col-md-12"><h4>Niveau de blocage</h4><br><div class="col-xs-4" style="text-align:left"><p>Faible</p></div><div class="col-xs-4" style="text-align:center"><p>Moyen</p></div><div class="col-xs-4" style="text-align:right"><p>Elevé</p></div><input type="range" id="rg-blacklist-forumeurs" min="1" max="3"> </div></div> </div><div class="panel panel-default"><div class="panel-body"> <div class="col-md-12"><h4>Liste des forumeurs bloqués</h4></div> <div class="col-md-8" style="max-height:260px;overflow:auto;"><table id="table-blacklist-forumeurs" class="table table-condensed"> <thead><tr class=""> <th style="width:40px">#</th> <th>Pseudo</th></tr> </thead> <tbody></tbody></table> </div> <div class="col-md-4"><div class="col-md-12"><h5>Blacklister un forumeur</h5> <div class="input-group"><input type="text" class="form-control" placeholder="" style="height:36px"><span id="btn_blacklist_forumeurs_ajout" class="input-group-btn"> <button class="btn btn-success" type="button" style="height:36px"><span class="glyphicon glyphicon-plus"></span></button></span> </div></div><div class="col-md-12"><h5>Déblacklister un forumeur</h5> <div class="input-group"><input type="text" class="form-control" placeholder="" style="height:36px"><span id="btn_blacklist_forumeurs_suppr" class="input-group-btn"> <button class="btn btn-danger" type="button" style="height:36px"><span class="glyphicon glyphicon-remove"></span></button></span> </div> <br></div> </div></div> </div></div> </div></div> </div><div class="modal-footer"> <p id="versionScript" class="pull-left versionScript" style="margin-top:8px; margin-bottom:0px">Version -</p> <button type="button" class="btn grey-btn" data-dismiss="modal">Fermer</button></div></div> </div> </div>';

        // Si le thème noir est actif, l'appliquer sur le pannel
        if ( theme_noir ) {

            let contour = '#3e3d3d';
            let secondaire = '#242529';
            let principal = '#2f3136';

            let cssThemeNoir = '<style type="text/css">';
            cssThemeNoir += '.modal-content { background-color: ' + principal + '; }';
            cssThemeNoir += '.modal-footer { border-top: 1px solid ' + contour + '; }';
            cssThemeNoir += '.modal-header { border-bottom: 1px solid ' + contour + '; }';

            cssThemeNoir += '.panel-body { background-color: ' + principal + '; }';
            cssThemeNoir += '.panel-footer { background-color: ' + secondaire + '; border-top: 1px solid ' + contour + ';}';
            cssThemeNoir += '.panel { border: 1px solid ' + contour + '; background-color: ' + principal + '; }';

            cssThemeNoir += '.nav-tabs { border-bottom: 1px solid ' + contour + ';}';
            cssThemeNoir += 'ul.nav-tabs li.active a { color: #c8c8c9; background-color: ' + secondaire + '; border: 1px solid ' + contour + ' ; border-bottom: 1px solid transparent; }';
            cssThemeNoir += 'ul.nav-tabs li.active:hover a { color: #c8c8c9; background-color: ' + secondaire + '; border: 1px solid ' + contour + '; border-bottom: 1px solid transparent; }';
            cssThemeNoir += 'ul.nav-tabs li:hover a { color: #c8c8c9; background-color: ' + secondaire + '; border-color: ' + principal + ' ' + principal + ' ' + contour + '; }';
            cssThemeNoir += '</style>';

            pannelHTML += cssThemeNoir;
        }

        pannelHTML += cssSliders;

        document.getElementById( 'stratoscriptPanel' ).innerHTML = pannelHTML;

        majPannel_BlacklistPseudos();
        majPannel_Parametres();

        // Affichage de la version
        document.getElementById( 'versionScript' ).innerHTML = 'Version 0.51';

        //////////////
        //  BOUTONS  |
        //////////////

        // Event - Ouverture du pannel
        document.querySelector( '.btnStratoscript' ).onclick = function () {
            if ( parametres.onglet_actif != null && parametres.onglet_actif != '' ) {
                // Ouvrir le dernier onglet ouvert
                document.getElementById( parametres.onglet_actif + '' ).click();
            } else {
                // Ouvrir l'onglet général par défaut
                document.getElementById( 'onglet-general' ).click();
            }
        }

        //////////////////////////////////
        //  BOUTONS - BLACKLIST PSEUDOS  |
        //////////////////////////////////

        // Event - Blacklist pseudos : Changement du niveau de blocage
        document.getElementById( 'rg-blacklist-forumeurs' ).onclick = function () {
            let niveau_blacklist_pseudos = document.getElementById( 'rg-blacklist-forumeurs' ).value;
            // Enregistrer dans les parametres
            parametres[ "rg-blacklist-forumeurs" ] = niveau_blacklist_pseudos;
            // Mettre à jour le LocalStorage
            localStorage.setItem( "ss_parametres", JSON.stringify( parametres ) );

            console.log( "Niveau de blocage : " + niveau_blacklist_pseudos );
            // Recharger la page
            location.reload();
        }
        // Event - Blacklist pseudos : Clic bouton d'ajout
        document.getElementById( 'btn_blacklist_forumeurs_ajout' ).onclick = function () {
            let pseudo = document.getElementById( 'btn_blacklist_forumeurs_ajout' ).previousElementSibling.value

            // Ajouter le pseudo à la liste
            localStorage_ajout( pseudo, blacklist_pseudos, "ss_blacklist_pseudos" );
            majPannel_BlacklistPseudos();

            console.log( pseudo + " ajouté à la blacklist" );
            console.log( blacklist_pseudos.length + " pseudos sont blacklistées" );

            // Recharger la page
            location.reload();
        }
        // Event - Blacklist pseudos : Clic bouton de suppression
        document.getElementById( 'btn_blacklist_forumeurs_suppr' ).onclick = function () {
            let pseudo = document.getElementById( 'btn_blacklist_forumeurs_suppr' ).previousElementSibling.value;

            localStorage_suppression( pseudo, blacklist_pseudos, "ss_blacklist_pseudos" );
            majPannel_BlacklistPseudos();

            console.log( pseudo );
            console.log( blacklist_pseudos.length + " pseudo(s) sont blacklistée(s)" );

            // Recharger la page
            location.reload();
        }

        ////////////////////////
        //  BOUTONS - ONGLETS  |
        ////////////////////////

        // Event - Clic sur l'onglet Général
        document.getElementById( 'onglet-general' ).onclick = function () {
            // Onglets
            document.querySelectorAll( '.onglets > li' ).forEach( function ( e ) {
                e.classList.remove( 'active' );
            } )
            document.getElementById( 'onglet-general' ).classList.add( 'active' );
            // Zones
            document.querySelectorAll( '#zones-container > div' ).forEach( function ( e ) {
                e.style.display = 'none';
            } );
            document.getElementById( 'zone-general' ).style.display = 'block';

            // Mémoriser l'onglet actif
            parametres[ "onglet_actif" ] = document.getElementById( "stratoscriptPanel" ).querySelector( '#onglets .active' ).id;
            localStorage.setItem( "ss_parametres", JSON.stringify( parametres ) );
        }
        // Event - Clic sur l'onglet Blacklist
        document.getElementById( 'onglet-blacklist' ).onclick = function () {
            // Onglets
            document.querySelectorAll( '.onglets > li' ).forEach( function ( e ) {
                e.classList.remove( 'active' );
            } )
            document.getElementById( 'onglet-blacklist' ).classList.add( 'active' );
            // Zones
            document.querySelectorAll( '#zones-container > div' ).forEach( function ( e ) {
                e.style.display = 'none';
            } );
            document.getElementById( 'zone-blacklist' ).style.display = 'block';

            // Mémoriser l'onglet actif
            parametres[ "onglet_actif" ] = document.getElementById( "stratoscriptPanel" ).querySelector( '#onglets .active' ).id;
            localStorage.setItem( "ss_parametres", JSON.stringify( parametres ) );
        }

        ///////////////////////////
        //  BOUTONS - PARAMETRES  |
        ///////////////////////////

        // Event - Clic sur le bouton de validation des paramètres
        document.querySelectorAll( '#btn-validation-parametres' ).forEach( function ( e ) {
            e.onclick = function () {
                parametres = {};
                // Toutes les pages
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
                parametres[ "rg-blacklist-forumeurs" ] = document.getElementById( 'rg-blacklist-forumeurs' ).value;
                // Mettre à jour le LocalStorage
                localStorage.setItem( "ss_parametres", JSON.stringify( parametres ) );
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

    ////////////////////
    // INITIALISATION  |
    ////////////////////

    // initialisation sans attendre le chargement complet
    initialisation_preshot();
    // Initialisation après chargement complet
    window.onload = function () {
        initialisation();
        console.log( "Stratoscript démarré !" );
    };

} )();
