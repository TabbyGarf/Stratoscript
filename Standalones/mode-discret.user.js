// ==UserScript==
// @name         Stratoscript Standalone - Mode Discret
// @version      1
// @description  Shhh..
// @author       StayNoided/TabbyGarf
// @match        https://avenoel.org/*
// @icon         https://media.discordapp.net/attachments/592805019590459403/1108591534594596965/Untitled.png
// @run-at       document-body
// ==/UserScript==

(function() {
    'use strict';
    var path = window.location.pathname;

    function modeDiscret() {
        // Replace /images/logo.png with a custom logo
        var logoImage = document.querySelector('img[src="/images/logo.png"]');
        if (logoImage) {
            // Set attributes for the new logo
            logoImage.src = 'https://cdn.discordapp.com/attachments/592805019590459403/1203871895494332507/logodiscret.png';
            logoImage.alt = 'Noided International Corp.';
            logoImage.style.backgroundImage = '';
            logoImage.style.marginTop = '-5px';
        }

        // Change hue of profile pictures to /images/noavatar.png with random hue
        var avatarImages = document.querySelectorAll('.message-avatar img');
        avatarImages.forEach(function(img) {
            // Replace with the path to your no-avatar image
            img.src = 'https://cdn.discordapp.com/attachments/592805019590459403/1203865465194156032/noprofile_red.png?ex=65d2a615&is=65c03115&hm=57a90e3fa06387f20bec05316d64b90881441bcbc2fe8cd284df425da88acdad&';

            // Generate random values for hue, grayscale, brightness, and saturation
            var randomHue = Math.floor(Math.random() * 360);
            var randomGrayscale = Math.random(); // Random value between 0 and 1
            var randomBrightness = Math.floor(Math.random() * 200) - 100; // Range: -100 to 100
            var randomSaturation = Math.floor(Math.random() * 200) - 100; // Range: -100 to 100

            // Apply the filters
            img.style.filter = 'hue-rotate(' + randomHue + 'deg) grayscale(' + randomGrayscale + ') brightness(' + (100 + randomBrightness) + '%) saturate(' + (100 + randomSaturation) + '%)';
        });
    }
    // Initialisation après chargement complet
    window.onload = function () {
        setTimeout( function () {
                modeDiscret();
        }, 100 );
    };

    // Script de Strato pour appliquer post refresh

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
    async function refreshPosts() {
        // Animation refresh
        document.querySelectorAll( '#btn-autorefresh-posts' ).forEach( function ( e ) {
            e.classList.add( "processing" );
        } );
        // Récupérer la liste des posts
        let url_topic = "https://avenoel.org" + path;
        let doc = await getDoc( url_topic );

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

            modeDiscret();

    }
})();
