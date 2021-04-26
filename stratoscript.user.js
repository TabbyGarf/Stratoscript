// ==UserScript==
// @name         Stratoscript
// @namespace    http://tampermonkey.net/
// @version      0.38
// @description
// @author       Stratosphere
// @match        https://avenoel.org/*
// @grant        none
// ==/UserScript==

/* jshint esversion: 8 */

( function () {
    'use strict';
    var $ = window.jQuery;
    var path = window.location.pathname;

    var parametres = {};
    var blacklist_pseudos = [];

    var theme_noir = false;
    if ( $( "body" ).css( "background-color" ) == "rgb(32, 34, 37)" ) {
        theme_noir = true;
    }

    /* ==========================================================
    |                                                           |
    |                      INITIALISATION                       |
    |                                                           |
    ========================================================== */

    async function initialisation() {
        parametres = localStorage_chargement( "ss_parametres" );
        blacklist_pseudos = localStorage_chargement( "ss_blacklist_pseudos" );

        // TOUTES LES PAGES, SAUF LE PANNEL ADMIN
        if ( !path.startsWith( "/admin" ) ) {
            // Virer de l'interface les éléments à l'abandon
            if ( parametres[ "sw-masquer-inutile" ] == true ) {
                virerTrucsAbandonnes();
            }
            // Créer le pannel de config du script
            creerPannelStratoscript();
            // Ouvrir l'onglet général par défaut
            $( ".onglet-general" ).click();
            // Lecteurs Vocaroo, IssouTV, Webm etc...
            ajoutLecteursEtIntegrations();
        }
        // TOPIC
        if ( path.startsWith( "/topic" ) || path.startsWith( "/index.php/topic" ) ) {
            // Modifier le contenu (blacklist...)
            modifPosts();
            if ( parametres[ "sw-refresh-posts" ] == true ) {
                ajoutAutorefreshPosts();
            }
        }
        // LISTE DES TOPICS
        if ( path.startsWith( "/forum" ) || path.startsWith( "/index.php/forum" ) ) {
            if ( parametres[ "sw-refresh-topics" ] == true ) {
                ajoutAutorefreshTopics();
            }
            // Modifier le contenu (blacklist...)
            modifListeTopics();
        }
        // LISTE DES MPS
        if ( path.startsWith( "/messagerie" ) || path.startsWith( "/index.php/messagerie" ) ) {
            ajoutBoutonQuitterMPs();
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

    // Refresh et autorefresh
    async function autorefreshPosts( auto ) {
        // Récupération de la page
        let page = "";
        if ( path.match( /\/forum\/([0-9]+)/ ) ) {
            page = /\/forum\/([0-9]+)/.exec( path )[ 1 ];
        }

        // Simple refresh
        if ( auto == 0 ) {
            // Récupérer la liste des posts
            $( ".btn-autorefresh-posts" ).addClass( "processing" );
            let url_topic = "https://avenoel.org" + path;
            let doc = await getDoc( url_topic );
            // Modifier le contenu (blacklist...)
            modifPosts( doc );
            $( ".btn-autorefresh-posts" ).removeClass( "processing" );

            let html_liste_posts = $( ".topic-messages", doc ).html();
            // Afficher les topics
            $( ".topic-messages" ).html( html_liste_posts );

            // Lecteurs Vocaroo, IssouTV, Webm etc...
            ajoutLecteursEtIntegrations();
        } else {
            // Boucle d'autorefresh
            while ( $( ".btn-autorefresh-posts" ).hasClass( "btn-success" ) ) {

                // Récupérer la liste des posts
                $( ".btn-autorefresh-posts" ).addClass( "processing" );
                let url_topic = "https://avenoel.org" + path;
                let doc = await getDoc( url_topic );
                // Modifier le contenu (blacklist...)
                modifPosts( doc );
                $( ".btn-autorefresh-posts" ).removeClass( "processing" );

                let html_liste_posts = $( ".topic-messages", doc ).html();
                // Afficher les topics
                $( ".topic-messages" ).html( html_liste_posts );

                // Lecteurs Vocaroo, IssouTV, Webm etc...
                ajoutLecteursEtIntegrations();

                await sleep( 500 );
            }
        }
    }

    // Ajout de l'autorefresh sur la liste des topics
    function ajoutAutorefreshPosts() {
        // Ajout du bouton d'autorefresh
        $( ".grey-btn[data-refresh*='.main-section']" ).after( "<a class='btn-autorefresh-posts btn grey-btn' style='font-size: .9em'><i class='glyphicon glyphicon-refresh'></i></a><a style='width:3px;display:inline-block'></a>" );
        // Suppression du bouton refresh de base
        $( ".grey-btn[data-refresh*='.main-section']" ).remove();

        // Event - Simple clic sur le bouton refresh
        $( ".btn-autorefresh-posts" ).click( function () {
            // Si on clique sur le bouton pour couper l'auto-refresh...
            if ( !$( ".btn-autorefresh-posts" ).hasClass( "grey-btn" ) ) {
                $( ".btn-autorefresh-posts" ).addClass( "grey-btn" );
                $( ".btn-autorefresh-posts" ).removeClass( "btn-success" );
            } else {
                autorefreshPosts( 0 );
            }
        } );

        // Event - Double clic sur le bouton refresh
        $( ".btn-autorefresh-posts" ).dblclick( function () {
            // Si on double-clique sur le bouton pour allumer l'auto-refresh...
            if ( $( ".btn-autorefresh-posts" ).hasClass( "grey-btn" ) ) {
                $( ".btn-autorefresh-posts" ).addClass( "btn-success" );
                $( ".btn-autorefresh-posts" ).removeClass( "grey-btn" );
                autorefreshPosts( 1 );
            }
        } );
    }

    // Modif sur les posts
    async function modifPosts( page ) {
        let niveau_blocage = 2;
        if ( parametres[ "rg-blacklist-forumeurs" ] != null && parametres[ "rg-blacklist-forumeurs" ] != '' ) {
            niveau_blocage = parametres[ "rg-blacklist-forumeurs" ];
        }

        // Parcourir tous les messages du topic
        $( ".topic-messages", page ).children().each( async function ( i ) {
            // Appliquer la blacklist de pseudos
            let pseudo = $( this ).find( ".message-username" ).text().replace( /(\r\n|\n|\r)/gm, "" );
            if ( blacklist_pseudos.indexOf( pseudo ) >= 0 ) {
                if ( niveau_blocage == 1 ) {
                    $( this ).find( ".message-content" ).text( " [ Contenu blacklisté ] " );
                    $( this ).css( "background-color", "rgba(247,24,24,.2)" );
                } else if ( niveau_blocage == 2 ) {
                    $( this ).html( '<div style="margin:10px; text-align:center;width:100%"> [ Contenu blacklisté ] </div>' );
                    $( this ).css( "background-color", "rgba(247,24,24,.2)" );
                } else if ( niveau_blocage == 3 ) {
                    $( this ).remove();
                }
            }
            // Citations
            if ( niveau_blocage == 2 ) {
                $( this ).find( ".message-content" ).find( '.message-content-quote-author:contains("' + pseudo + '")' ).parent().parent().text( " [ Contenu blacklisté ] " );
            } else if ( niveau_blocage == 3 ) {
                $( this ).find( ".message-content" ).find( '.message-content-quote-author:contains("' + pseudo + '")' ).parent().remove();
            }
        } );
        // Parcourir toutes les citations du topic
        $( "blockquote", page ).each( async function ( i ) {
            // Appliquer la blacklist de pseudos
            let pseudo = $( this ).find( ".message-content-quote-caption" ).children().text().replace( /(\r\n|\n|\r)/gm, "" );

            if ( blacklist_pseudos.indexOf( pseudo ) >= 0 ) {
                if ( niveau_blocage == 2 ) {
                    $( this ).text( " [ Contenu blacklisté ] " );
                } else if ( niveau_blocage == 3 ) {
                    $( this ).parent().parent().parent().remove();
                }
            }
        } );

        return page;
    }

    // Intégrations
    function ajoutLecteursEtIntegrations() {
        // Trouver tous les URLs dans les posts
        $( ".message-content" ).find( "a" ).each( async function ( i ) {

            // Posts d'AVN
            if ( parametres[ "sw-posts-url" ] == true && $( this ).attr( "href" ).match( /(https:\/\/avenoel\.org\/message\/([0-9]+))/ ) ) {
                // Récupérer et adapter le post
                let url_post = /(https:\/\/avenoel\.org\/message\/([0-9]+))/.exec( $( this ).attr( "href" ) )[ 1 ];
                let doc_post = await getDoc( url_post );
                let odd = "";
                if ( !$( this ).parent().parent().parent().parent().hasClass( "odd" ) ) {
                    odd = "odd";
                }
                let html_post = "" + '<div class="topic-message  ' + odd + '" style="margin:10px">' + $( "article", doc_post ).html() + "<div>";

                // Ajouter le post
                $( this ).parent().after( html_post );
                // Supprimer le lien
                $( this ).parent().remove();
            }

            // Vocaroo
            if ( parametres[ "sw-vocaroo" ] == true && $( this ).attr( "href" ).match( /https:\/\/(voca\.ro|(?:www\.)?vocaroo\.com)\/([A-z0-9]+)/ ) ) {
                // Créer le lecteur
                let id_vocaroo = /https:\/\/(voca\.ro|(?:www\.)?vocaroo\.com)\/([A-z0-9]+)/.exec( $( this ).attr( "href" ) )[ 2 ];
                let htmlVocaroo = '<iframe width="300" height="60" src="https://vocaroo.com/embed/' + id_vocaroo + '?autoplay=0" frameborder="0" allow="autoplay"></iframe>';
                $( this ).parent().after( htmlVocaroo );
                // Supprimer le lien
                $( this ).parent().remove();
            }

            // IssouTV
            if ( parametres[ "sw-issoutv" ] == true && $( this ).attr( "href" ).match( /(https:\/\/(issoutv\.com)(.+)\/(.+))/ ) ) {
                // Gérer l'URL IssouTV
                let path_video = "https://issoutv.com/storage/videos/";
                let id_video = /(https:\/\/(issoutv\.com)(.+)\/(.+))/.exec( $( this ).attr( "href" ) )[ 4 ];
                let url_video = path_video + id_video;
                if ( id_video.substring( id_video.length - 4, id_video.length ) != ".mp4" ) {
                    url_video += ".mp4";
                }
                // Créer le lecteur
                let video = document.createElement( "video" );
                video.setAttribute( "src", url_video + "#t=0.1" );
                video.setAttribute( "controls", "" );
                video.setAttribute( "width", "380" );
                video.setAttribute( "height", "214" );
                video.setAttribute( "preload", "metadata" );
                video.setAttribute( "style", "background-color: black" );

                $( this ).parent().after( video );
                // Supprimer le lien
                $( this ).parent().remove();
                // En cas de 404, afficher un 404 Larry, cliquable et menant vers le lien mort
                video.onerror = function () {
                    let html404 = '<a href="' + url_video + '"><img src="https://i.imgur.com/nfy6qFK.jpg"</a>';
                    $( this ).after( html404 );
                    $( this ).remove();
                }

            } else {

                // .WEBM et .MP4
                if ( parametres[ "sw-mp4-webm" ] == true && $( this ).attr( "href" ).match( /(https:\/\/(.+)(\.mp4|\.webm))/ ) ) {
                    // Gérer l'URL
                    let url_video = /(https:\/\/(.+)(\.mp4|\.webm))/.exec( $( this ).attr( "href" ) )[ 1 ];
                    // Créer le lecteur
                    let video = document.createElement( "video" );
                    video.setAttribute( "src", url_video + "#t=0.1" );
                    video.setAttribute( "controls", "" );
                    video.setAttribute( "width", "380" );
                    video.setAttribute( "height", "214" );
                    video.setAttribute( "preload", "metadata" );
                    video.setAttribute( "style", "background-color: black" );

                    $( this ).parent().after( video );
                    // Supprimer le lien
                    $( this ).parent().remove();
                    // En cas de 404, afficher un 404 Larry, cliquable et menant vers le lien mort
                    video.onerror = function () {
                        let html404 = '<a href="' + url_video + '"><img src="https://i.imgur.com/nfy6qFK.jpg"</a>';
                        $( this ).after( html404 );
                        $( this ).remove();
                    }
                }
            }

            // Twitter
            if ( parametres[ "sw-twitter" ] == true && $( this ).attr( "href" ).match( /(https:\/\/twitter\.com\/|https:\/\/mobile\.twitter\.com\/)(.+)\/status\/([0-9]+)/ ) ) {
                let htmlTweet = "";
                let id_compte = /(https:\/\/twitter\.com\/|https:\/\/mobile\.twitter\.com\/)(.+)\/status\/([0-9]+)/.exec( $( this ).attr( "href" ) )[ 2 ];
                let id_tweet = /(https:\/\/twitter\.com\/|https:\/\/mobile\.twitter\.com\/)(.+)\/status\/([0-9]+)/.exec( $( this ).attr( "href" ) )[ 3 ];
                await $.ajax( {
                    type: "GET",
                    url: "https://publish.twitter.com/oembed?url=https://twitter.com/" + id_compte + "/status/" + id_tweet,
                    dataType: "jsonp",
                    success: function ( retour ) {
                        htmlTweet = retour.html;
                    }
                } );
                // Ajouter le tweet
                $( this ).parent().after( htmlTweet );
                // Supprimer le lien
                $( this ).parent().remove();
            }

            // PornHub
            if ( parametres[ "sw-pornhub" ] == true && $( this ).attr( "href" ).match( /(https:\/\/fr\.pornhub\.com\/view_video\.php\?viewkey=(.{15}))/ ) ) {
                // Récupérer l'ID de la video et récupérer le lecteur
                let id_video = /(https:\/\/fr\.pornhub\.com\/view_video\.php\?viewkey=(.{15}))/.exec( $( this ).attr( "href" ) )[ 2 ];
                let htmlPornHub = '<iframe src="https://www.pornhub.com/embed/' + id_video + '" frameborder="0" width="380" height="214" scrolling="no" allowfullscreen></iframe>';
                // Ajouter le lecteur
                $( this ).parent().after( htmlPornHub );
                // Supprimer le lien
                $( this ).parent().remove();
            }
        } );
    }

    ///////////////////////////////////
    //  Interface - Liste des topics  |
    ///////////////////////////////////

    // Refresh et autorefresh
    async function autorefreshTopics( auto ) {
        // Récupération de la page
        let page = "";
        if ( path.match( /\/forum\/([0-9]+)/ ) ) {
            page = /\/forum\/([0-9]+)/.exec( path )[ 1 ];
        }

        if ( auto == 0 ) {
            // SIMPLE REFRESH
            // Récupérer la liste des topics
            $( ".btn-autorefresh-topics" ).addClass( "processing" );
            let doc = await getDoc( "https://avenoel.org/forum/" + page );
            // Modifier le contenu (blacklist...)
            modifListeTopics( doc );
            $( ".btn-autorefresh-topics" ).removeClass( "processing" );

            let html_liste_topics = $( ".topics", doc ).html();
            // Afficher les topics
            $( ".topics" ).html( html_liste_topics );
        } else {
            // BOUCLE D'AUTOREFRESH
            while ( $( ".btn-autorefresh-topics" ).hasClass( "btn-success" ) ) {
                // Récupérer la liste des topics
                $( ".btn-autorefresh-topics" ).addClass( "processing" );
                let doc = await getDoc( "https://avenoel.org/forum/" + page );
                // Modifier le contenu (blacklist...)
                modifListeTopics( doc );
                $( ".btn-autorefresh-topics" ).removeClass( "processing" );

                let html_liste_topics = $( ".topics", doc ).html();
                // Afficher les topics
                $( ".topics" ).html( html_liste_topics );

                await sleep( 500 );
            }
        }
    }

    // Modif de la liste des topics
    function modifListeTopics( page ) {
        let fond = "lightgrey";
        if ( theme_noir ) {
            fond = "#404040";
        }
        let niveau_blocage = 2;
        if ( parametres[ "rg-blacklist-forumeurs" ] != null && parametres[ "rg-blacklist-forumeurs" ] != '' ) {
            niveau_blocage = parametres[ "rg-blacklist-forumeurs" ];
        }
        // Parcourir les topics de la liste des topics
        $( ".table", page ).last().children().last().children().each( async function ( i ) {
            // Appliquer la blacklist de pseudos
            let pseudo = $( this ).find( ".topics-author" ).text().replace( /(\r\n|\n|\r)/gm, "" );
            if ( blacklist_pseudos.indexOf( pseudo ) >= 0 ) {
                if ( niveau_blocage == 1 ) {
                    $( this ).find( ".topics-title" ).text( " [ Contenu blacklisté ] " );
                    //$( this ).find( '.topics-title' ).css( "background-color", fond );
                } else if ( niveau_blocage == 2 ) {
                    $( this ).find( "td" ).html( "" );
                    $( this ).find( ".topics-title" ).text( " [ Contenu blacklisté ] " );
                    //$( this ).css( "background-color",  fond );
                } else if ( niveau_blocage == 3 ) {
                    $( this ).remove();
                }
            }
        } );
    }

    // Ajout de l'autorefresh sur la liste des topics
    function ajoutAutorefreshTopics() {
        // Suppression du bouton refresh de base
        $( ".grey-btn[href*='https://avenoel.org/forum']" ).remove();
        $( ".grey-btn[href*='https://avenoel.org/index.php/forum']" ).remove();
        // Ajout du bouton d'autorefresh
        $( ".right-tools" ).prepend( "<a class='btn-autorefresh-topics btn grey-btn' style='font-size: .9em'><i class='glyphicon glyphicon-refresh'></i></a><a style='width:3px;display:inline-block'></a>" );

        // Event - Simple clic sur le bouton refresh
        $( ".btn-autorefresh-topics" ).click( function () {
            // Si on clique sur le bouton pour couper l'auto-refresh...
            if ( !$( ".btn-autorefresh-topics" ).hasClass( "grey-btn" ) ) {
                $( ".btn-autorefresh-topics" ).addClass( "grey-btn" );
                $( ".btn-autorefresh-topics" ).removeClass( "btn-success" );
            } else {
                autorefreshTopics( 0 );
            }
        } );

        // Event - Double clic sur le bouton refresh
        $( ".btn-autorefresh-topics" ).dblclick( function () {
            // Si on double-clique sur le bouton pour allumer l'auto-refresh...
            if ( $( ".btn-autorefresh-topics" ).hasClass( "grey-btn" ) ) {
                $( ".btn-autorefresh-topics" ).addClass( "btn-success" );
                $( ".btn-autorefresh-topics" ).removeClass( "grey-btn" );
                autorefreshTopics( 1 );
            }
        } );
    }

    ////////////////////////////////
    //  Interface - Liste des MPs  |
    ////////////////////////////////

    function ajoutBoutonQuitterMPs() {
        $( ".table" ).last().children().first().children().prepend( "<th></th>" );
        $( ".table" ).last().children().first().children().append( "<th></th>" );
        $( ".table" ).last().children().last().children().each( async function ( i ) {
            // Ajout du bouton "Quitter le MP" sur chaque MP dans la liste des MPs
            if ( parametres[ "sw-btn-quitter-mp" ] == true ) {
                let html = "<td>" + '<input style="vertical-align: middle" class="btn-quitter-mp" type="image" src="/images/topic/delete.png" title="Quitter le MP" alt="Icône suppression" height="16">' + "</td>";
                $( this ).append( html );
            } else {
                $( this ).append( "<td></td>" );
            }

            // Afficher les auteurs carton
            if ( $( this ).children().first().next().text() == "Rezabe75" && parametres[ "sw-afficher-cartons-mp" ] == true ) {
                $( this ).prepend( '<span style="vertical-align: middle;color:red; margin-right:5px;margin-left:10px" title="MP à risque ; l\'auteur de ce MP est rang carton" class="glyphicon glyphicon-warning-sign"></span>' );
                $( this ).css( "border", "1px solid red" );
            } else {
                $( this ).prepend( "<td></td>" );
            }
        } );

        // Event - Clic sur le pour quitter un MP
        $( ".btn-quitter-mp" ).click( async function () {
            if ( confirm( "Voulez-vous vraiment quitter ce MP ?" ) ) {
                // Extraction du numéro de MP
                var id_mp = /https:\/\/avenoel\.org\/messagerie\/([0-9]+)/.exec( $( this ).parent().parent().children().children().first().attr( "href" ) )[ 1 ];
                // Quitter le MP
                await quitterMP( id_mp );
                location.reload();
            }
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

    ///////////////////////////////////
    //  Interface - Toutes les pages  |
    ///////////////////////////////////

    // Mise à jour de la blacklist personnelle des pseudos sur le pannel
    function majPannel_BlacklistPseudos() {
        $( ".table-blacklist-forumeurs" ).children().last().html( "" );

        // Parcourir la blacklist
        for ( let i = 0; i < blacklist_pseudos.length; ++i ) {
            $( ".table-blacklist-forumeurs" ).children().last().append( '<tr> <th><span class="glyphicon glyphicon-user"></span></th> <td>' + blacklist_pseudos[ i ] + "</td></tr>" );
        }
    }

    // Mise à jour des parametres sur le pannel
    function majPannel_Parametres() {
        console.log( parametres );
        // Toutes les pages
        $( ".sw-twitter" ).find( "input" ).prop( "checked", parametres[ "sw-twitter" ] );
        $( ".sw-issoutv" ).find( "input" ).prop( "checked", parametres[ "sw-issoutv" ] );
        $( ".sw-vocaroo" ).find( "input" ).prop( "checked", parametres[ "sw-vocaroo" ] );
        $( ".sw-pornhub" ).find( "input" ).prop( "checked", parametres[ "sw-pornhub" ] );
        $( ".sw-mp4-webm" ).find( "input" ).prop( "checked", parametres[ "sw-mp4-webm" ] );
        $( ".sw-masquer-inutile" ).find( "input" ).prop( "checked", parametres[ "sw-masquer-inutile" ] );
        $( ".sw-posts-url" ).find( "input" ).prop( "checked", parametres[ "sw-posts-url" ] );
        // Liste des topics
        $( ".sw-refresh-topics" ).find( "input" ).prop( "checked", parametres[ "sw-refresh-topics" ] );
        // Topic
        $( ".sw-refresh-posts" ).find( "input" ).prop( "checked", parametres[ "sw-refresh-posts" ] );
        // Liste des MPs
        $( ".sw-btn-quitter-mp" ).find( "input" ).prop( "checked", parametres[ "sw-btn-quitter-mp" ] );
        // Blacklist forumeurs
        $( ".rg-blacklist-forumeurs" ).val( parametres[ "rg-blacklist-forumeurs" ] );
    }

    // Virer les trucs abandonnés sur l'interface
    function virerTrucsAbandonnes() {
        // Trucs de NoelRadio
        $( ".aside" ).find( "img" ).remove();
        $( "audio" ).remove();
        $( 'a:contains("Avenoel Radio")' ).parent().remove();
    }

    // Créer le pannel de configuration du script
    function creerPannelStratoscript() {
        // Ajouter la zone du pannel de configuration du script dans la page
        $( ".main-container" ).prepend( '<div id="stratoscriptPanel"></div>' );

        // Ajouter le bouton du script dans la barre de navigation
        $( ".navbar-links" ).append( '<li><a style="height:70px;width:145px" class="btnStratoscript" data-toggle="modal" data-target="#modalStratoscript" href="#stratoscriptPanel" ><img class="btnStratoscript" style="position:absolute" target="_blank" src="https://i.imgur.com/I9ngwnI.png" alt="Stratoscript" height="24"></a></li>' );

        let cssSliders
        if ( theme_noir ) {
            cssSliders = '<style type="text/css">/* The switch - the box around the slider */.switch {position: relative;display: inline-block;width: 60px;height: 34px;}/* Hide default HTML checkbox */.switch input {opacity: 0;width: 0;height: 0;}/* The slider */.slider {position: absolute;cursor: pointer;top: 0;left: 0;right: 0;bottom: 0;background-color: #ccc;-webkit-transition: .4s;transition: .4s;}.slider:before {position: absolute;content: "";height: 26px;width: 26px;left: 4px;bottom: 4px;background-color:#333333;-webkit-transition: .4s;transition: .4s;}input:checked + .slider {background-color: #fdde02;}input:focus + .slider {box-shadow: 0 0 1px #fdde02;}input:checked + .slider:before {-webkit-transform: translateX(26px);-ms-transform: translateX(26px);transform: translateX(26px);}/* Rounded sliders */.slider.round {border-radius: 34px;}.slider.round:before {border-radius: 50%;}</style>';
        } else {
            cssSliders = '<style type="text/css">/* The switch - the box around the slider */.switch {position: relative;display: inline-block;width: 60px;height: 34px;}/* Hide default HTML checkbox */.switch input {opacity: 0;width: 0;height: 0;}/* The slider */.slider {position: absolute;cursor: pointer;top: 0;left: 0;right: 0;bottom: 0;background-color: #ccc;-webkit-transition: .4s;transition: .4s;}.slider:before {position: absolute;content: "";height: 26px;width: 26px;left: 4px;bottom: 4px;background-color: white;-webkit-transition: .4s;transition: .4s;}input:checked + .slider {background-color: #fdde02;}input:focus + .slider {box-shadow: 0 0 1px #fdde02;}input:checked + .slider:before {-webkit-transform: translateX(26px);-ms-transform: translateX(26px);transform: translateX(26px);}/* Rounded sliders */.slider.round {border-radius: 34px;}.slider.round:before {border-radius: 50%;}</style>';
        }

        let pannelHTML = '<div class="modal fade" id="modalStratoscript" tabindex="-1" role="dialog" aria-labelledby="modalStratoscriptLabel">     <div class="modal-dialog modal-lg" role="document">    <div class="modal-content">      <div class="modal-header" style="background-image: linear-gradient(to bottom right, black, lightgrey);">     <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>     <h4 class="modal-title" id="modalStratoscriptLabel"><img class="btnStratoscript" style="position:absolute" target="_blank" src="https://i.imgur.com/I9ngwnI.png" alt="Stratoscript" height="24"></h4>      </div>      <div class="modal-body stratoscriptPanel" style="overflow-y:scroll;max-height:75vh">      <div class="row">        <div class="col-md-12">        <ul class="nav nav-tabs onglets">         <li class="onglet-general"><a>Général</a></li>         <li class="onglet-blacklist"><a>Blacklist</a></li>        </ul>       </div>       </div>      <div class="zones-container row">       <!-- ONGLET GENERAL -->       <div class="zone-general col-md-12">        <div class="col-md-12">          <div class="panel-heading"><h3>Général</h3></div>          <!-- TOUTES LES PAGES -->         <div class="panel panel-default">          <div class="panel-body">           <h4>Ensemble du forum</h4>           <br>           <div class="row">            <div class="col-md-4">             <div style="align-items: center; display: inline-flex;margin-bottom:5px">              <label class="switch sw-twitter" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label>              <div>Intégration Tweeter</div>             </div>            </div>            <div class="col-md-4">             <div style="align-items: center; display: inline-flex;margin-bottom:5px">              <label class="switch sw-issoutv" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label>              <div>Intégration IssouTV</div>             </div>            </div>            <div class="col-md-4">             <div style="align-items: center; display: inline-flex;margin-bottom:5px">              <label class="switch sw-vocaroo" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label>              <div>Intégration Vocaroo</div>             </div>            </div>            <div class="col-md-4">             <div style="align-items: center; display: inline-flex;margin-bottom:5px">              <label class="switch sw-pornhub" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label>              <div>Intégration PornHub</div>             </div>            </div>            <div class="col-md-4">             <div style="align-items: center; display: inline-flex;margin-bottom:5px">              <label class="switch sw-mp4-webm" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label>              <div>Intégration mp4 et webm</div>             </div>            </div>           </div>            <br>            <div class="row">            <div class="col-md-4">             <div style="align-items: center; display: inline-flex;margin-bottom:5px">              <label class="switch sw-masquer-inutile" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label>              <div>Masquer les trucs inutiles</div>             </div>            </div>            <div class="col-md-4">             <div style="align-items: center; display: inline-flex;margin-bottom:5px">              <label class="switch sw-posts-url" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label>              <div>Affichage des posts par URL</div>             </div>            </div>           </div>           </div>          <div class="panel-footer">           <button class="btn grey-btn btn-validation-parametres" type="button">Valider</button>          </div>         </div>         <!-- LISTE DES TOPICS -->         <div class="panel panel-default">          <div class="panel-body">           <h4>Liste des topics</h4>           <br>           <div class="row">            <div class="col-md-4">             <div style="align-items: center; display: inline-flex;margin-bottom:5px">              <label class="switch sw-refresh-topics" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label>              <div>Refresh amélioré</div>             </div>            </div>           </div>          </div>          <div class="panel-footer">           <button class="btn grey-btn btn-validation-parametres" type="button">Valider</button>          </div>         </div>         <!-- TOPIC -->         <div class="panel panel-default">          <div class="panel-body">           <h4>Topic</h4>           <br>           <div class="row">            <div class="col-md-4">             <div style="align-items: center; display: inline-flex;margin-bottom:5px">              <label class="switch sw-refresh-posts" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label>              <div>Refresh amélioré</div>             </div>            </div>           </div>          </div>          <div class="panel-footer">           <button class="btn grey-btn btn-validation-parametres" type="button">Valider</button>          </div>         </div>         <!-- LISTE DES MPS -->         <div class="panel panel-default">          <div class="panel-body">           <h4>Liste des MPs</h4>           <br>           <div class="row">            <div class="col-md-4">             <div style="align-items: center; display: inline-flex;margin-bottom:5px">              <label class="switch sw-btn-quitter-mp" style="margin-bottom:0px;margin-left:5px;margin-right:5px"><input type="checkbox"><span class="slider round"></span></label>              <div>Bouton de sortie de MP</div>             </div>            </div>           </div>          </div>          <div class="panel-footer">           <button class="btn grey-btn btn-validation-parametres" type="button">Valider</button>          </div>         </div>         </div>       </div>        <!-- ONGLET BLACKLIST -->       <div class="zone-blacklist col-md-12">         <div class="col-md-12">         <div class="panel-heading"><h3>Blacklist de forumeurs</h3></div>          <div class="panel panel-default">          <div class="panel-body">           <div class="col-md-12">            <h4>Niveau de blocage</h4>            <br>            <div class="col-xs-4" style="text-align:left"><p>Faible</p></div><div class="col-xs-4" style="text-align:center"><p>Moyen</p></div><div class="col-xs-4" style="text-align:right"><p>Elevé</p></div>            <input type="range" class="rg-blacklist-forumeurs" min="1" max="3">           </div>          </div>         </div>          <div class="panel panel-default">          <div class="panel-body">           <div class="col-md-12"><h4>Liste des forumeurs bloqués</h4></div>           <div class="col-md-8" style="max-height:260px;overflow:auto;">            <table class="table table-condensed table-blacklist-forumeurs">             <thead>              <tr class="">               <th style="width:40px">#</th>               <th>Pseudo</th>              </tr>             </thead>             <tbody></tbody>            </table>           </div>           <div class="col-md-4">            <div class="col-md-12"><h5>Blacklister un forumeur</h5>             <div class="input-group">              <input type="text" class="form-control" placeholder="" style="height:36px">              <span class="input-group-btn btn_blacklist_forumeurs_ajout">               <button class="btn btn-success" type="button" style="height:36px"><span class="glyphicon glyphicon-plus"></span></button>              </span>             </div>            </div>            <div class="col-md-12"><h5>Déblacklister un forumeur</h5>             <div class="input-group">              <input type="text" class="form-control" placeholder="" style="height:36px">              <span class="input-group-btn btn_blacklist_forumeurs_suppr">               <button class="btn btn-danger" type="button" style="height:36px"><span class="glyphicon glyphicon-remove"></span></button>              </span>             </div>             <br>            </div>           </div>          </div>         </div>        </div>       </div>      </div>       </div>      <div class="modal-footer">     <p class="pull-left versionScript" style="margin-top:8px; margin-bottom:0px">Version 0.30</p>     <button type="button" class="btn grey-btn" data-dismiss="modal">Fermer</button>      </div>    </div>     </div>   </div>';

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

        $( "#stratoscriptPanel" ).html( pannelHTML );

        majPannel_BlacklistPseudos();
        majPannel_Parametres();

        // Affichage de la version
        $( ".versionScript" ).html( "Version 0.36" );

        //////////////////////////////////
        //  BOUTONS - BLACKLIST PSEUDOS  |
        //////////////////////////////////

        // Event - Blacklist pseudos : Changement du niveau de blocage
        $( ".rg-blacklist-forumeurs" ).change( function () {
            let niveau_blacklist_pseudos = $( this ).val();
            // Enregistrer dans les parametres
            parametres[ "rg-blacklist-forumeurs" ] = niveau_blacklist_pseudos;
            // Mettre à jour le LocalStorage
            localStorage.setItem( "ss_parametres", JSON.stringify( parametres ) );

            console.log( "Niveau de blocage : " + niveau_blacklist_pseudos );

            // Recharger la page
            location.reload();
        } );
        // Event - Blacklist pseudos : Clic bouton d'ajout
        $( ".btn_blacklist_forumeurs_ajout" ).click( function () {
            let pseudo = $( this ).parent().children().first().val();

            // Ajouter le pseudo à la liste
            localStorage_ajout( pseudo, blacklist_pseudos, "ss_blacklist_pseudos" );
            majPannel_BlacklistPseudos();

            console.log( pseudo + " ajouté à la blacklist" );
            console.log( blacklist_pseudos.length + " pseudos sont blacklistées" );

            // Recharger la page
            location.reload();
        } );
        // Event - Blacklist pseudos : Clic bouton de suppression
        $( ".btn_blacklist_forumeurs_suppr" ).click( function () {
            let pseudo = $( this ).parent().children().first().val();

            localStorage_suppression( pseudo, blacklist_pseudos, "ss_blacklist_pseudos" );
            majPannel_BlacklistPseudos();

            console.log( pseudo );
            console.log( blacklist_pseudos.length + " pseudo(s) sont blacklistée(s)" );

            // Recharger la page
            location.reload();
        } );

        ////////////////////////
        //  BOUTONS - ONGLETS  |
        ////////////////////////

        // Event - Clic sur l'onglet Général
        $( ".onglet-general" ).click( function () {
            $( ".onglets" ).children().removeClass( "active" );
            $( ".onglet-general" ).addClass( "active" );
            $( ".zones-container" ).children().hide();
            $( ".zone-general" ).show();
        } );
        // Event - Clic sur l'onglet Blacklist
        $( ".onglet-blacklist" ).click( function () {
            $( ".onglets" ).children().removeClass( "active" );
            $( ".onglet-blacklist" ).addClass( "active" );
            $( ".zones-container" ).children().hide();
            $( ".zone-blacklist" ).show();
        } );

        ///////////////////////////////////
        //  BOUTONS - PARAMETRES AVANCES  |
        ///////////////////////////////////

        // Event - Clic sur le bouton de validation des paramètres
        $( ".btn-validation-parametres" ).click( function () {
            parametres = {};
            // Toutes les pages
            parametres[ "sw-twitter" ] = $( ".sw-twitter" ).find( "input" ).prop( "checked" );
            parametres[ "sw-issoutv" ] = $( ".sw-issoutv" ).find( "input" ).prop( "checked" );
            parametres[ "sw-vocaroo" ] = $( ".sw-vocaroo" ).find( "input" ).prop( "checked" );
            parametres[ "sw-pornhub" ] = $( ".sw-pornhub" ).find( "input" ).prop( "checked" );
            parametres[ "sw-mp4-webm" ] = $( ".sw-mp4-webm" ).find( "input" ).prop( "checked" );
            parametres[ "sw-masquer-inutile" ] = $( ".sw-masquer-inutile" ).find( "input" ).prop( "checked" );
            parametres[ "sw-posts-url" ] = $( ".sw-posts-url" ).find( "input" ).prop( "checked" );
            // Liste des topics
            parametres[ "sw-refresh-topics" ] = $( ".sw-refresh-topics" ).find( "input" ).prop( "checked" );
            // Topic
            parametres[ "sw-refresh-posts" ] = $( ".sw-refresh-posts" ).find( "input" ).prop( "checked" );
            // Liste des MPs
            parametres[ "sw-btn-quitter-mp" ] = $( ".sw-btn-quitter-mp" ).find( "input" ).prop( "checked" );
            // Blacklist forumeurs
            parametres[ "rg-blacklist-forumeurs" ] = $( ".rg-blacklist-forumeurs" ).val();
            // Mettre à jour le LocalStorage
            localStorage.setItem( "ss_parametres", JSON.stringify( parametres ) );
            // Recharger la page
            location.reload();
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

    initialisation();
    console.log( "Stratoscript démarré !" );
} )();
