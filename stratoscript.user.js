// ==UserScript==
// @name         Stratoscript
// @version      1.14.23.10
// @description  1.14.23.10 > Hotfix remplacement video yt ds citations
// @author       Stratosphere, StayNoided/TabbyGarf
// @match        https://avenoel.org/*
// @icon         https://tabbygarf.club/files/themes/stratoscript/str.png
// @run-at       document-body
// @grant        GM_xmlhttpRequest
// @updateURL    https://raw.githubusercontent.com/TabbyGarf/Stratoscript/main/stratoscript.user.js
// @downloadURL  https://raw.githubusercontent.com/TabbyGarf/Stratoscript/main/stratoscript.user.js
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
    var blacklist_kw = [];
    var theme_noir = true;
    var mes_messages = {};
    var litter = false;
    let ssDatabase;
    const pseudoimgTag = document.querySelector('.navbar-user-avatar');
    const version = '1.14.23.10';

    /* ==========================================================
    |                                                           |
    |                      INITIALISATION                       |
    |                                                           |
    ========================================================== */

    function initialisation_preshot() {
        console.log( "Démarrage du Stratoscript..." );
        parametres = localStorage_chargement( "ss_parametres" );
        blacklist_pseudos = localStorage_chargement( "ss_blacklist_pseudos" );
        blacklist_kw = localStorage_chargement( "ss_blacklist_kw" );
        // IndexedDB
        ssDatabase = new SSDatabase( 1 );

        // Purger la BL si les données chargées sont dans un mauvais format
        function isObject( val ) {
            return val instanceof Object;
        }
        if ( blacklist_pseudos.length > 0 && !isObject( blacklist_pseudos[ 0 ] ) ) {
            blacklist_pseudos = [];
        }
        if ( blacklist_kw.length > 0 && !isObject( blacklist_kw[ 0 ] ) ) {
            blacklist_kw = [];
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
        // Appliquer la blacklist
                appliquer_blacklist_posts( document );
        }
        // LISTE DES TOPICS
        if ( path.startsWith( "/forum" ) || path.startsWith( "/index.php/forum" ) ) {
        // Appliquer la blacklist
            appliquer_blacklist_topics( document );
            appliquer_blacklist_kw( document );
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


            if (parametres["sw-musique-profil"] == true){
                identifyTrack();
            }
            if (parametres["sw-imgur-ex"] == true){
                resizeImgurEmbeds();
            }
        }
    }

    async function initialisation() {
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
            if ( parametres[ "sw-antigolem" ] == true ) {
            sansAvatar_antiGolem();
            }
            // Obtions supplémentaires dans le formulaire
            if ( parametres[ "sw-option-supplementaires" ] == true ) {
                ajoutBbcodesSupplementaires();
            }
            // Risibank officiel
            if ( parametres[ "sw-risibank-officiel" ] == true ) {
                ajoutRisibankOfficiel();
            }
            if ( parametres[ "sw-cat-toggle" ] == true ) {
                if (parametres ["sw-litter-toggle"]==true){
                    litter = true;
                } else { litter = false;}
                addCatboxButton();
            }
            if ( parametres[ "sw-imgur-toggle" ] == true ) {
                addImgurButton();
            }
            if ( parametres[ "sw-noel-toggle" ] == true ) {
                addNoelshackButton();
            }
            if ( parametres ["sw-catbox-embed"] == true) {
                document.addEventListener('click', function(event) {
                    const target = event.target;
                    if (target.matches('.btn.btn-primary.preview-btn') && target.textContent.trim() === 'Prévisualiser') {
                        // Apply transformation on form-group.preview p-4.text-black
                        transformCatboxLinks('div.form-group.preview p-4.text-black a.link');
                        transformCatboxLinks('.message-content a.link');
                    }
                });
            }

            //if (parametres ["sw-pseudo-custom"] == true ){
            //    styleUsernameLink(pseudoimgTag);
            //}
            if (parametres ["sw-mode-discret"] == true){
                modeDiscret();
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
            if ( parametres ["sw-catbox-embed"] == true) {
                transformCatboxLinks('div.message-content a.link');
            }
        }
        // LISTE DES TOPICS
        if ( path.startsWith( "/forum" ) || path.startsWith( "/index.php/forum" ) ) {
            // Appliquer la blacklist (2ème couche)
            appliquer_blacklist_topics( document );
            appliquer_blacklist_kw( document );


            if ( parametres[ "sw-refresh-topics" ] == true && !path.startsWith( "/forum/recherche" ) ) {
                ajoutAutorefreshTopics();
            }
            if ( parametres[ "sw-antipute" ] == true && !path.startsWith( "/forum/recherche" ) ) {
                antiPute();
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
    function modeDiscret() {
        // Replace /images/logo.png with a custom logo
        var logoImage = document.querySelector('img[src="/images/logo.png"]');
        if (logoImage) {
            // Set attributes for the new logo
            logoImage.src = 'https://tabbygarf.club/files/themes/stratoscript/logodiscret.png';
            logoImage.alt = 'Noided International Corp.';
            logoImage.style.backgroundImage = '';
            logoImage.style.marginTop = '-5px';
        }
        // Change hue of profile pictures to /images/noavatar.png with random hue
        var avatarImages = document.querySelectorAll('.message-avatar img');
        avatarImages.forEach(function(img) {
            // Replace with the path to your no-avatar image
            img.src = 'https://tabbygarf.club/files/themes/stratoscript/noprofile_red.png';

            // Generate random values for hue, grayscale, brightness, and saturation
            var randomHue = Math.floor(Math.random() * 360);
            var randomGrayscale = Math.random(); // Random value between 0 and 1
            var randomBrightness = Math.floor(Math.random() * 200) - 100; // Range: -100 to 100
            var randomSaturation = Math.floor(Math.random() * 200) - 100; // Range: -100 to 100

            // Apply the filters
            img.style.filter = 'hue-rotate(' + randomHue + 'deg) grayscale(' + randomGrayscale + ') brightness(' + (100 + randomBrightness) + '%) saturate(' + (100 + randomSaturation) + '%)';
        });
    }

    function addCatboxButton() {
        const formGroups = document.querySelectorAll('.bbcodes');


    formGroups.forEach(formGroup => {
        // Get the parent container of formGroup
        const parentContainer = formGroup.parentNode;

        const catboxDropzone = document.createElement('div');
        catboxDropzone.className = 'catbox-dropzone';
        catboxDropzone.style.outlineOffset = '-10px';
        if (parametres ["sw-litter-toggle"]==false){
            catboxDropzone.style.border = '2px dashed #805A40';
        } else{
            catboxDropzone.style.border = '2px dashed #7A94BD';
            catboxDropzone.style.backgroundColor = '#1A2E4C';
        }
        catboxDropzone.style.width = '300px';
        catboxDropzone.style.cursor= 'pointer';
        catboxDropzone.style.padding = '30px';
        catboxDropzone.style.textAlign = 'center';
        catboxDropzone.style.margin = '0 auto';
        catboxDropzone.style.fontSize = "12px"
        catboxDropzone.style.display = 'none';
        if (parametres ["sw-litter-toggle"]==false){
        catboxDropzone.innerHTML = 'Deposez une image ici <u>ou cliquez ici</u> (Catbox)<br><sub>Poids max. : 200Mo</sub>';
        } else{
        catboxDropzone.innerHTML = 'Deposez une image temporairement ici <u>ou cliquez ici</u> (Litterbox)<br><sub>Poids max. : 1Go, Durée de vie: 72h</sub>';
        }
        if (parametres ["sw-litter-toggle"]==false){
            // Create URL input
            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.placeholder = 'Entrez l\'URL de l\'image';
            urlInput.style.width = '70%';
            urlInput.style.color = '#805A40';
            urlInput.style.border = '1px solid #805A40';
            urlInput.style.backgroundColor = '#0005';
            // Create button for URL upload
            const urlUploadButton = document.createElement('button');
            urlUploadButton.type = 'button';
            urlUploadButton.style.backgroundColor ='#805A40';
            urlUploadButton.style.color = 'black';
            urlUploadButton.style.border = '1px solid #805A40';
            urlUploadButton.textContent = 'Envoyer';
            urlUploadButton.style.width = '30%';

            // Add event listener to the button for handling URL upload
            urlUploadButton.addEventListener('click', function (event) {
                const imageUrl = urlInput.value.trim();
                if (imageUrl !== '') {
                    event.stopPropagation();
                    uploadToCatbox(imageUrl, event, litter); // Pass the event to the function
                    urlInput.value = ''; // Clear the input after processing
                } else {
                    alert('Veuillez entrer une URL valide.');
                    event.stopPropagation();
                }
            });

            // Add event listener to prevent file explorer from opening when clicking URL input
            urlInput.addEventListener('click', function (event) {
                event.stopPropagation();
            });

            // Append URL input to dropzone
            catboxDropzone.appendChild(urlInput);
            catboxDropzone.appendChild(urlUploadButton);
            // Create file input for click handling
        }
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept ='image/jpeg, image/png, image/gif, image/apng, image/tiff, video/mp4, video/mpeg, video/avi, video/webm, video/x-matroska, video/x-flv, video/x-msvideo, video/x-ms-wmv, video/quicktime, .mkv, .flv, .avi, .wmv, .mov,audio/mpeg, audio/wav, audio/ogg, audio/aac, audio/flac, audio/x-m4a, audio/mp4, .mp3, .wav, .ogg, .aac, .flac, .m4a';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', handleFileInputC);

        // Add event listener to catboxDropzone for click handling
        catboxDropzone.addEventListener('click', function() {
            fileInput.click();
        });

        // Add event listeners to the drop area
        catboxDropzone.addEventListener('dragover', handleDragOverEnter);
        catboxDropzone.addEventListener('dragenter', handleDragOverEnter);
        catboxDropzone.addEventListener('drop', handleDropC);

        // Append dropzone and file input as the first children of parentContainer
        parentContainer.insertBefore(catboxDropzone, formGroup);
        parentContainer.insertBefore(fileInput, formGroup);

        // Create button to toggle dropzones
        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = 'btn';
        toggleButton.tabIndex = '-1';
        toggleButton.dataset.type = 'catbox';
        toggleButton.style.filter = 'grayscale(50%)'; // Set default to black and white
        toggleButton.style.opacity = '0.8';
        // Add event listeners for hover effect
        toggleButton.addEventListener('mouseenter', function() {
            toggleButton.style.filter = 'grayscale(0%)'; // Set to original color on hover
            toggleButton.style.opacity = '1';
        });

        toggleButton.addEventListener('mouseleave', function() {
            toggleButton.style.filter = 'grayscale(50%)'; // Set back to black and white on leave
            toggleButton.style.opacity = '0.8';
        });

        // Create Imgur logo image
        const catboxLogo = document.createElement('img');
        catboxLogo.width = 15;
        if (parametres ["sw-litter-toggle"]==false){
        catboxLogo.src = 'https://tabbygarf.club/files/themes/stratoscript/catbox.png';
        } else{
        catboxLogo.src = 'https://tabbygarf.club/files/themes/stratoscript/litterbox.png';
        }
        catboxLogo.className = 'cat-logo';

        // Append Imgur logo to the toggle button
        toggleButton.appendChild(catboxLogo);

        // Add event listener to toggle button
        toggleButton.addEventListener('click', function() {
            toggleDropzone('catbox-dropzone', this);
            hideDropzone('imgur-dropzone', this);
            hideDropzone('aveshack-dropzone', this);
            hideDropzone('noelshack-dropzone',this);
        });
        // Get the existing aveshack button
        const aveshackButton = parentContainer.querySelector('button[data-type="aveshack"]');
        if (aveshackButton && aveshackButton.parentNode) {
            aveshackButton.parentNode.insertBefore(toggleButton, aveshackButton.nextSibling);
        }
        if (parametres ["sw-imgur-toggle"] == false && ["sw-noelshack-toggle"] == false){

        // Add event listener to aveshackButton if it exists
        if (aveshackButton) {
            // Check if there's an existing click event
            const existingClickEvent = aveshackButton.onclick;

            // Wrap the existing click event and the new functionality
            aveshackButton.addEventListener('click', function() {
                // Existing click event
                if (existingClickEvent) {
                    existingClickEvent();
                }
                // New functionality
                hideDropzone('catbox-dropzone', this);
                hideDropzone('imgur-dropzone', this);
                hideDropzone('noelshack-dropzone', this);
            });
        }
        }


    });
}
   // Function to add Imgur button and dropzone
    function addImgurButton() {
        const formGroups = document.querySelectorAll('.bbcodes');

    formGroups.forEach(formGroup => {
        // Get the parent container of formGroup
        const parentContainer = formGroup.parentNode;

        // Create Imgur dropzone
        const imgurDropzone = document.createElement('div');
        imgurDropzone.className = 'imgur-dropzone';
        imgurDropzone.style.outlineOffset = '-10px';
        imgurDropzone.style.border = '2px dashed #1bb76e';
        imgurDropzone.style.width = '300px';
        imgurDropzone.style.cursor= 'pointer';
        imgurDropzone.style.padding = '30px';
        imgurDropzone.style.textAlign = 'center';
        imgurDropzone.style.margin = '0 auto';
        imgurDropzone.style.fontSize = "12px"
        imgurDropzone.style.display = 'none';
        imgurDropzone.innerHTML = 'Deposez une image ici <u>ou cliquez ici</u> (imgur)<br><sub>Poids max. : 20Mo (PNG, JPG) ; 200Mo (GIF, APNG)</sub>';

        // Create URL input
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.placeholder = 'Entrez l\'URL de l\'image';
        urlInput.style.width = '70%';
        urlInput.style.color = '#1bb76e';
        urlInput.style.border = '1px solid #1bb76e';
        urlInput.style.backgroundColor = '#0005';
        // Create button for URL upload
        const urlUploadButton = document.createElement('button');
        urlUploadButton.type = 'button';
        urlUploadButton.style.backgroundColor ='#11b76e';
        urlUploadButton.style.color = 'white';
        urlUploadButton.style.border = '1px solid #1bb76e';
        urlUploadButton.textContent = 'Envoyer';
        urlUploadButton.style.width = '30%';

        // Add event listener to the button for handling URL upload
        urlUploadButton.addEventListener('click', function (event) {
            const imageUrl = urlInput.value.trim();
            if (imageUrl !== '') {
                event.stopPropagation();
                uploadToImgur(imageUrl, event); // Pass the event to the function
                urlInput.value = ''; // Clear the input after processing
            } else {
                alert('Veuillez entrer une URL valide.');
                event.stopPropagation();
            }
        });

        // Add event listener to prevent file explorer from opening when clicking URL input
        urlInput.addEventListener('click', function (event) {
            event.stopPropagation();
        });

        // Append URL input to Imgur dropzone
        imgurDropzone.appendChild(urlInput);
        imgurDropzone.appendChild(urlUploadButton);
        // Create file input for click handling
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept ='image/jpeg, image/png, image/gif, image/apng, image/tiff, video/mp4, video/mpeg, video/avi, video/webm, video/x-matroska, video/x-flv, video/x-msvideo, video/x-ms-wmv, video/quicktime,.mkv, .flv, .avi, .wmv, .mov';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', handleFileInput);

        // Add event listener to imgurDropzone for click handling
        imgurDropzone.addEventListener('click', function() {
            fileInput.click();
        });

        // Add event listeners to the drop area
        imgurDropzone.addEventListener('dragover', handleDragOverEnter);
        imgurDropzone.addEventListener('dragenter', handleDragOverEnter);
        imgurDropzone.addEventListener('drop', handleDrop);

        // Append Imgur dropzone and file input as the first children of parentContainer
        parentContainer.insertBefore(imgurDropzone, formGroup);
        parentContainer.insertBefore(fileInput, formGroup);

        // Create button to toggle dropzones
        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = 'btn';
        toggleButton.tabIndex = '-1';
        toggleButton.dataset.type = 'imgur';
        toggleButton.style.filter = 'grayscale(50%)'; // Set default to black and white
        toggleButton.style.opacity = '0.8';
        // Add event listeners for hover effect
        toggleButton.addEventListener('mouseenter', function() {
            toggleButton.style.filter = 'grayscale(0%)'; // Set to original color on hover
            toggleButton.style.opacity = '1';
        });

        toggleButton.addEventListener('mouseleave', function() {
            toggleButton.style.filter = 'grayscale(50%)'; // Set back to black and white on leave
            toggleButton.style.opacity = '0.8';
        });

        // Create Imgur logo image
        const imgurLogo = document.createElement('img');
        imgurLogo.width = 15;
        imgurLogo.src = 'https://tabbygarf.club/files/themes/stratoscript/imgur.png';
        imgurLogo.className = 'imgur-logo';

        // Append Imgur logo to the toggle button
        toggleButton.appendChild(imgurLogo);

        // Add event listener to toggle button
        toggleButton.addEventListener('click', function() {
            toggleDropzone('imgur-dropzone', this);
            hideDropzone('catbox-dropzone', this);
            hideDropzone('aveshack-dropzone', this);
            hideDropzone('noelshack-dropzone',this);
        });

        // Get the existing aveshack button
        const aveshackButton = parentContainer.querySelector('button[data-type="aveshack"]');
        // Append the toggleButton after aveshackButton inside the formGroup
        if (aveshackButton && aveshackButton.parentNode) {
            aveshackButton.parentNode.insertBefore(toggleButton, aveshackButton.nextSibling);
        }
        // Add event listener to aveshackButton if it exists
        if (aveshackButton) {
            // Check if there's an existing click event
            const existingClickEvent = aveshackButton.onclick;

            // Wrap the existing click event and the new functionality
            aveshackButton.addEventListener('click', function() {
                // Existing click event
                if (existingClickEvent) {
                    existingClickEvent();
                }
                // New functionality
                hideDropzone('catbox-dropzone', this);
                hideDropzone('imgur-dropzone', this);
                hideDropzone('noelshack-dropzone', this);
            });
        }


    });
}
// Function to add Noelshack button and dropzone
function addNoelshackButton() {
    const formGroups = document.querySelectorAll('.bbcodes');

    formGroups.forEach(formGroup => {
        // Get the parent container of formGroup
        const parentContainer = formGroup.parentNode;

        // Create Noelshack dropzone
        const noelshackDropzone = document.createElement('div');
        noelshackDropzone.className = 'noelshack-dropzone';
        noelshackDropzone.style.outlineOffset = '-10px';
        noelshackDropzone.style.border = '2px dashed #dd0000';
        noelshackDropzone.style.width = '300px';
        noelshackDropzone.style.cursor= 'pointer';
        noelshackDropzone.style.padding = '30px';
        noelshackDropzone.style.textAlign = 'center';
        noelshackDropzone.style.margin = '0 auto';
        noelshackDropzone.style.fontSize = "12px"
        noelshackDropzone.style.display = 'none'; // Initially hide noelshack-dropzone
        noelshackDropzone.innerHTML = 'Deposez une image ici <u>ou cliquez ici</u><br><sub>Formats autorisés : PNG, JPEG, GIF, SVG, BMP, TIFF.<br>Poids max. : 4 Mo. Taille min. : 128x128 px.</sub>';

        // Create file input for click handling
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept ='image/png, image/jpeg, image/gif, image/svg+xml, image/bmp, image/tiff';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', handleFileInputN);

        // Add event listener to noelshackDropzone for click handling
        noelshackDropzone.addEventListener('click', function() {
            fileInput.click();
        });

        // Add event listeners to the drop area
        noelshackDropzone.addEventListener('dragover', handleDragOverEnter);
        noelshackDropzone.addEventListener('dragenter', handleDragOverEnter);
        noelshackDropzone.addEventListener('drop', handleDropN);

        // Append Noelshack dropzone and file input as the first children of parentContainer
        parentContainer.insertBefore(noelshackDropzone, formGroup);
        parentContainer.insertBefore(fileInput, formGroup);

        // Create button to toggle dropzones
        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = 'btn';
        toggleButton.tabIndex = '-1';
        toggleButton.dataset.type = 'noelshack';
        toggleButton.style.filter = 'grayscale(50%)'; // Set default to black and white
        toggleButton.style.opacity = '0.8';
        // Add event listeners for hover effect
        toggleButton.addEventListener('mouseenter', function() {
            toggleButton.style.filter = 'grayscale(0%)'; // Set to original color on hover
            toggleButton.style.opacity = '1';
        });

        toggleButton.addEventListener('mouseleave', function() {
            toggleButton.style.filter = 'grayscale(50%)'; // Set back to black and white on leave
            toggleButton.style.opacity = '0.8';
        });

        // Create Noelshack logo image
        const noelshackLogo = document.createElement('img');
        noelshackLogo.width = 15;
        noelshackLogo.src = 'https://tabbygarf.club/files/themes/stratoscript/noelshack.png'; // Replace with the actual path to the Noelshack logo
        noelshackLogo.className = 'noelshack-logo';

        // Append Noelshack logo to the toggle button
        toggleButton.appendChild(noelshackLogo);

        // Add event listener to toggle button
        toggleButton.addEventListener('click', function() {
            toggleDropzone('noelshack-dropzone', this);
            hideDropzone('aveshack-dropzone', this);
            hideDropzone('imgur-dropzone', this);
            hideDropzone('catbox-dropzone', this);
        });
        // Get the existing aveshack button
        const aveshackButton = parentContainer.querySelector('button[data-type="aveshack"]');
        // Append the toggleButton after aveshackButton inside the formGroup
        if (aveshackButton && aveshackButton.parentNode) {
            aveshackButton.parentNode.insertBefore(toggleButton, aveshackButton.nextSibling);
        }
        if (parametres ["sw-imgur-toggle"] == false){
            // Get the existing aveshack button
        const aveshackButton = parentContainer.querySelector('button[data-type="aveshack"]');

        // Add event listener to aveshackButton if it exists
        if (aveshackButton) {
            // Check if there's an existing click event
            const existingClickEvent = aveshackButton.onclick;

            // Wrap the existing click event and the new functionality
            aveshackButton.addEventListener('click', function() {
                // Existing click event
                if (existingClickEvent) {
                    existingClickEvent();
                }
                // New functionality
                hideDropzone('catbox-dropzone', this);
                hideDropzone('imgur-dropzone', this);
                hideDropzone('noelshack-dropzone', this);
            });
        }

}

    });
}




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
        if ( parametres[ "sw-antigolem" ] == true ) {
            sansAvatar_antiGolem();
        }
        if (parametres ["sw-mode-discret"] == true){
            modeDiscret();
        }
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
        let modalRecherche = '<!-- Fond modal--> <div id="ss-modal-recherche" class="ss-panel-background"> <!-- Modal --> <div class="ss-panel"> <!-- En-tête --> <div class="ss-panel-header"> <img src="https://tabbygarf.club/files/themes/stratoscript/NzyZTYz.png" alt="Stratoscript"> <span class="ss-panel-close">&times;</span> </div> <!-- Corps --> <div class="ss-panel-body"><div class="ss-col"> <!-- Filtres de recherche --> <div class="ss-mini-panel"> <h3>Filtres de recherche</h3> <div class="ss-row ss-space-childs ss-full-width"> <div class="ss-row ss-fill ss-space-childs"> <input type="text" class="ss-fill inputFiltreAuteur" style="height:36px;min-width:200px" placeholder="Auteur"> <input type="text" class="ss-fill inputFiltreContenu" style="height:36px;min-width:200px" placeholder="Contenu"> </div> <button id="btn-recherche" class="ss-btn ss-vert" type="button">Rechercher</button> </div> </div> <!-- Barre de progrssion --> <div class="ss-row" style="margin:0px 20px 20px 20px"> <div class="ss-progressbar ss-full-width" style="display:none"> <div class="ss-col" style="width:0%"></div> </div> </div><!-- Résultats de recherche --> <div class="ss-mini-panel"> <h3>Résultats de recherche</h3> <div class="ss-full-width zone-resultats-recherche ss-col" style="padding:10px"> </div> </div> </div></div> <!-- Footer --> <div class="ss-panel-footer"> <span class="label" id="ss-version">Version </span> <div class="ss-row"> <button type="button" class="ss-btn ss-panel-close">Fermer</button> </div></div> </div> <!-- Fin modal --> </div> <!-- Fin fond modal -->';

        let zoneRecherche = document.createElement( 'div' );
        zoneRecherche.setAttribute( "id", "zoneRecherche" );
        zoneRecherche.setAttribute( "class", "ss-panel-container" );
        zoneRecherche.innerHTML = modalRecherche;
        document.querySelector( 'body' ).appendChild( zoneRecherche );

        // Affichage de la version
        document.querySelectorAll( '#ss-version' ).forEach( ( e ) => {
            e.innerHTML = 'Version ' + version + ' by Stratosphere and StayNoided';
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
                    alert( 'Le topic est lock, sauvegarde ton message !' );
                }
            } else {
                alert( 'Le topic est supprimé ou Cloudflare va se déclencher, sauvegarde ton message !' );
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
async function appliquer_blacklist_posts(page) {
    let niveau_blocage = 2;
    if (parametres["ss-rg-blacklist-forumeurs"] != null && parametres["ss-rg-blacklist-forumeurs"] !== '') {
        niveau_blocage = parametres["ss-rg-blacklist-forumeurs"];
    }

    // Couleur du post
    let prochain_post_bleu = true;

    // Helper function: Check for blacklisted keywords in an element and its children
    function checkForBlacklistedKeywords(element, blacklist_kw) {
        let containsBlacklist = false;

        // Check the current element's text content
        blacklist_kw.forEach(function (blacklistedKeyword) {
            if (element.textContent && element.textContent.includes(blacklistedKeyword)) {
                containsBlacklist = true;
            }
        });

        // If the current element is a span with class "board", check its 'data-link' attribute
        if (
            element.classList &&
            element.classList.contains("board") &&
            element.getAttribute("data-link")
        ) {
            let dataLink = element.getAttribute("data-link");
            blacklist_kw.forEach(function (blacklistedKeyword) {
                if (dataLink.includes(blacklistedKeyword)) {
                    containsBlacklist = true;
                }
            });
        }

        // Recursively check all child nodes
        element.childNodes.forEach(function (child) {
            if (!containsBlacklist) {
                containsBlacklist = checkForBlacklistedKeywords(child, blacklist_kw);
            }
        });

        return containsBlacklist;
    }

    // Traverse all messages in the topic
    page.querySelectorAll(".topic-messages > article").forEach(article => {
        console.log("Inspecting article:", article);

        // Extract pseudo
        const pseudoElement = article.querySelector(".message-username a");
        if (!pseudoElement) {
            console.log("No pseudo found in article.");
            return;
        }

        const pseudo = pseudoElement.textContent.trim();
        console.log(`Extracted pseudo: ${pseudo}`);

        blacklist_pseudos.forEach(e_blackist => {
            if (pseudo.toLowerCase() === e_blackist.pseudo.toLowerCase()) {
                console.log(`Matched pseudo: ${pseudo}, applying blocage_posts: ${e_blackist.blocage_posts}`);

                // Apply specific blocking level
                const messageContent = article.querySelector(".message-content");
                if (e_blackist.blocage_posts == 2 && messageContent) {
                    messageContent.textContent = " [ Contenu blacklisté ] ";
                    article.style.setProperty("background-color", "rgba(247,24,24,.2)", "important");
                    console.log("Modified content for pseudo:", pseudo);
                } else if (e_blackist.blocage_posts == 3) {
                    article.innerHTML =
                        '<div style="margin:10px; text-align:center;width:100%"> [ Contenu blacklisté ] </div>';
                    article.style.setProperty("background-color", "rgba(247,24,24,.2)", "important");
                    console.log("Replaced article content for pseudo:", pseudo);
                } else if (e_blackist.blocage_posts == 4) {
                    article.remove();
                    console.log("Removed article for pseudo:", pseudo);
                    prochain_post_bleu = !prochain_post_bleu;
                } else if (e_blackist.blocage_posts == 5 && messageContent) {
                    // Replace <img> tags with links
                    messageContent.querySelectorAll("img").forEach(img => {
                        const link = document.createElement("a");
                        link.href = img.src;
                        link.textContent = `[${img.src}] `;
                        img.replaceWith(link);
                    });
                    // Replace YouTube <iframe> embeds with links
                    messageContent.querySelectorAll("iframe").forEach(iframe => {
                        if (iframe.src.includes("youtube.com") || iframe.src.includes("youtu.be")) {
                            const link = document.createElement("a");
                            link.href = iframe.src;
                            link.textContent = `[${iframe.src}] `;
                            iframe.replaceWith(link);
                        }
                    });
                    console.log("Modified content for pseudo:", pseudo);
                }
            }
        });

        // Check if .message-content contains blacklisted keywords or children with the board tag
        const messageContent = article.querySelector(".message-content");
        if (messageContent && checkForBlacklistedKeywords(messageContent, blacklist_kw)) {
            console.log("Blacklisted content found in .message-content:", messageContent);

            // Apply blacklist styling or modification
            messageContent.textContent = " [ Contenu blacklisté ] ";
            article.setAttribute("style", "background-color: rgba(247,24,24,.2)");
        }

        // Handle post colors after processing
        if (prochain_post_bleu && !article.classList.contains("odd")) {
            article.classList.add("odd");
        }
        if (!prochain_post_bleu && article.classList.contains("odd")) {
            article.classList.remove("odd");
        }

        // Toggle the color flag
        prochain_post_bleu = !prochain_post_bleu;
    });
    page.querySelectorAll( 'blockquote' ).forEach( function (quote ) {
        // Check if the quote contains an author
        const authorElement = quote.querySelector('.message-content-quote-author');
        if (!authorElement) {
            console.log("No author found in quote.");
            return;
        }

        // Extract the author's pseudo
        const pseudo = authorElement.textContent.trim();
        console.log(`Processing quote by pseudo: ${pseudo}`);

        // Check against the blacklist
        blacklist_pseudos.forEach(function (e_blackist) {
            if (pseudo === e_blackist.pseudo) {
                console.log(`Matched blacklisted pseudo in quote: ${pseudo}, applying blocage_citations: ${e_blackist.blocage_citations}`);

                // Apply the corresponding action based on blocage_citations
                if (e_blackist.blocage_citations == 2) {
                    // Keep the caption but replace the content
                    const caption = quote.querySelector('.message-content-quote-caption');
                    quote.innerHTML = ''; // Clear the current content
                    if (caption) {
                        quote.appendChild(caption); // Add the caption back
                    }
                    const div = document.createElement('div');
                    div.textContent = '[ Contenu blacklisté ]';
                    quote.appendChild(div);
                    console.log(`Applied level 2 blocking to quote by pseudo: ${pseudo}`);
                } else if (e_blackist.blocage_citations == 3) {
                    // Replace the entire quote content with a blacklist message
                    quote.textContent = '[ Contenu blacklisté ]';
                    console.log(`Applied level 3 blocking to quote by pseudo: ${pseudo}`);
                } else if (e_blackist.blocage_citations == 4) {
                    // Remove the entire quote
                    quote.remove();
                    console.log(`Removed quote block for pseudo: ${pseudo}`);
                } else if (e_blackist.blocage_citations == 5) {
                    // Modify the content: Replace YouTube links and images with text

                    const images = quote.querySelectorAll('img');

                    quote.querySelectorAll("iframe").forEach(iframe => {
                        if (iframe.src.includes("youtube.com") || iframe.src.includes("youtu.be")) {
                            const link = document.createElement("a");
                            link.href = iframe.src;
                            link.textContent = `[${iframe.src}] `;
                            iframe.replaceWith(link);
                        }
                    });

                    // Replace images with their URLs as text
                    images.forEach(img => {
                        const replacement = document.createElement('span');
                        replacement.textContent = `[${img.src}] `;
                        img.replaceWith(replacement);
                    });

                    console.log(`Applied level 5 modifications to quote by pseudo: ${pseudo}`);
                }
            }
        });
    });
}




    // Intégrations
    function ajoutLecteursEtIntegrations(container) {
        // Trouver tous les URLs dans les posts
        document.querySelectorAll( '.message-content a' ).forEach( async function ( e ) {

            let url = e.href || e.innerText;

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
                if (parametres[ "sw-imgur"] == true || parametres[ "sw-imgur-ex"] == true) {
                    function resizeImgurEmbeds(container) {
                        // Find all Imgur embeds in the document
                        document.querySelectorAll('img.board-picture[src^="https://i.imgur.com/"]').forEach(function(img) {
                            let originalSrc = img.getAttribute('src');

                            // Extract the file extension (e.g., .jpg) from the original source
                            let fileExtension = originalSrc.match(/\.\w+$/);

                            if (img.width > 180 && img.height > img.width && img.width < 1200) {
                                img.width = 100; // Adjust the width as needed
                                if (img.height > 1.5 * img.width) {
                                    img.height = 150
                                }
                            }
                            if (parametres[ "sw-imgur-ex"] == true) {
                            if (img.width > 68 || img.height > 51 ) {
                                img.width = 68; // Adjust the width as needed
                                img.height = 51
                            }

                            }
                        });
                    }
                    // Call the function to resize Imgur embeds
                resizeImgurEmbeds(document.body);
                }

                document.querySelectorAll('.apercite-image').forEach(element => {
                    // Remove each element from the DOM
                    element.remove();
                });

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
                // Tiktok
                if (parametres["sw-tiktok"] == true && urlCorrige.match(/(https:\/\/(?:www\.|m\.)?tiktok\.com\/(?:@[^\/]+\/video\/|v\/)?(\d+))/)) {
                    let id_video = urlCorrige.match(/(https:\/\/(?:www\.|m\.)?tiktok\.com\/(?:@[^\/]+\/video\/|v\/)?(\d+))/)[2];
                    let iframeTiktok = document.createElement('iframe');
                    iframeTiktok.style.width = 'auto';
                    iframeTiktok.frameBorder = "0";
                    iframeTiktok.height = '500';
                    iframeTiktok.src = 'https://www.tiktok.com/embed/' + id_video;
                    // Replace the link with the player
                    e.parentNode.replaceChild(iframeTiktok, e);
                }
                function ttConvert(shortLink, callback) {
                    GM_xmlhttpRequest({
                        method: "HEAD",
                        url: shortLink,
                        onload: function(response) {
                            if (response.finalUrl) {
                                callback(response.finalUrl);
                            } else {
                                console.error('Error following redirection:', response.status, response.statusText);
                                callback(null);
                            }
                        },
                        onerror: function(error) {
                            console.error('Error during HTTP request:', error);
                            callback(null);
                        }
                    });
                }
                // Example usage
                if (parametres["sw-tiktok"] == true && urlCorrige.match(/(https:\/\/(?:www\.|vm\.)tiktok\.com\/(.+))/)) {
                    let shortLink = urlCorrige.match(/(https:\/\/(?:www\.|vm\.)tiktok\.com\/(.+))/)[0];

                    ttConvert(shortLink, function(finalUrl) {
                        if (finalUrl) {
                            let videoIdMatch = finalUrl.match(/\/video\/(\d+)/);
                            if (videoIdMatch) {
                                let videoId = videoIdMatch[1];
                                let iframeTiktok = document.createElement('iframe');
                                iframeTiktok.style.width = 'auto';
                                iframeTiktok.frameBorder = "0";
                                iframeTiktok.height = '500';
                                iframeTiktok.src = 'https://www.tiktok.com/embed/' + videoId;
                                // Replace the link with the player
                                e.parentNode.replaceChild(iframeTiktok, e);
                            } else {
                                console.log('Unable to extract video ID from the final URL');
                            }
                        } else {
                            console.log('Unable to retrieve final URL');
                        }
                    });
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
                if (parametres["sw-corr-url-odysee"] == true && urlCorrige.match(/https?:\/\/(?:www\.)?youtube\.com\/shorts\/(\w+)(?:\?[^&]*)?$/)) {
                    let shortVideoId = urlCorrige.match(/https?:\/\/(?:www\.)?youtube\.com\/shorts\/(\w+)(?:\?[^&]*)?$/)[1];
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
                // Instagram Reels and Posts - Embed as Instagram embed code
                // Function to embed Instagram content using iframe
                function embedInstagramContent(e, iframeSrc) {
                    // Create an iframe element
                    let iframeElement = document.createElement('iframe');
                    iframeElement.setAttribute('src', iframeSrc);
                    iframeElement.setAttribute('width', 'auto');
                    iframeElement.setAttribute('height', '500');
                    iframeElement.setAttribute('frameborder', '0');
                    iframeElement.setAttribute('allowfullscreen', 'allowfullscreen');

                    // Replace the Instagram Reels or Posts link with the iframe
                    e.parentNode.replaceChild(iframeElement, e);
                }

                // Example usage
                if (parametres["sw-insta"] == true) {
                    // Check if it's an Instagram Reels link
                    const reelsMatch = urlCorrige.match(/https?:\/\/(?:www\.)?instagram\.com\/reel\/(\w+)/);

                    // Check if it's an Instagram Post link
                    const postsMatch = urlCorrige.match(/https?:\/\/(?:www\.)?instagram\.com\/p\/(\w+)/);

                    if (reelsMatch) {
                        const reelCode = reelsMatch[1];
                        const iframeSrc = `https://www.instagram.com/reel/${reelCode}/embed/`;

                        // Replace the Instagram Reels link with the iframe
                        embedInstagramContent(e, iframeSrc);
                    } else if (postsMatch) {
                        const postCode = postsMatch[1];
                        const iframeSrc = `https://www.instagram.com/p/${postCode}/embed/`;

                        // Replace the Instagram Post link with the iframe
                        embedInstagramContent(e, iframeSrc);
                    }
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



            // Posts d'AVN
            if (
                parametres["sw-posts-url"] === true && url.match(/((https:\/\/avenoel\.org\/index\.php\/message\/|https:\/\/avenoel\.org\/index\.php\/topic\/.+#|https:\/\/avenoel\.org\/message\/|https:\/\/avenoel\.org\/topic\/.+#)([0-9]+))/) && !e.parentNode.classList.contains("embedded-post")) {

                e.parentNode.classList.add("embedded-post");

                let id_post = /((https:\/\/avenoel\.org\/index\.php\/message\/|https:\/\/avenoel\.org\/index\.php\/topic\/.+#|https:\/\/avenoel\.org\/message\/|https:\/\/avenoel\.org\/topic\/.+#)([0-9]+))/.exec(url)[3];
                let url_post = 'https://avenoel.org/' + indexPhp + 'message/' + id_post;
                let doc_post = await getDoc(url_post);

                let postIntegre;
                if (doc_post.querySelector('.topic-message') != null) {
                    postIntegre = doc_post.querySelector('.topic-message').cloneNode(true);
                    postIntegre.setAttribute("style", "margin:10px");

                    postIntegre.classList.add("embedded-post");
                    postIntegre.querySelectorAll("*").forEach(element => {
                        element.classList.add("embedded-post");
                    });

                    if (!e.parentNode.parentNode.parentNode.parentNode.classList.contains('odd')) {
                        postIntegre.setAttribute("class", "flex row topic-message odd embedded-post");
                    } else {
                        postIntegre.setAttribute("class", "flex row topic-message embedded-post");
                    }
                } else {
                    postIntegre = document.createElement("div");
                    postIntegre.setAttribute("class", "topic-message message-deleted embedded-post");
                    postIntegre.setAttribute("style", "margin:10px; padding:5px; display: flex; align-items: center; justify-content: center;");
                    postIntegre.textContent = 'Message introuvable';
                }

                e.parentNode.parentNode.replaceChild(postIntegre, e.parentNode);

                e.parentNode.parentNode.remove();
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
                if (parametres["sw-mp4-webm"] == true && url.match(/(https:\/\/(.+)(\.mp4|\.webm|\.mov|\.mkv|\.mp3|\.wav|\.ogg|\.aac|\.flac))/)) {
                    // Gérer l'URL
                    let url_media = /(https:\/\/(.+)(\.mp4|\.webm|\.mov|\.mkv|\.mp3|\.wav|\.ogg|\.aac|\.flac))/.exec(url)[1];

                    // Créer le lecteur
                    let media;
                    if (url.match(/\.(mp3|wav|ogg|aac|flac)$/)) {
                        media = document.createElement("audio");
                        media.setAttribute("controls", "");
                    } else {
                        media = document.createElement("video");
                        media.setAttribute("controls", "");
                        media.setAttribute("width", "380");
                        media.setAttribute("height", "214");
                        media.setAttribute("style", "background-color: black");
                    }

                    media.setAttribute("src", url_media + "#t=0.1");
                    media.setAttribute("preload", "metadata");

                    // Remplacer le lien par le lecteur
                    e.parentNode.parentNode.replaceChild(media, e.parentNode);

                    // En cas de 404, afficher un 404 Larry, cliquable et menant vers le lien mort
                    media.onerror = function () {
                        let lien404 = document.createElement("a");
                        lien404.setAttribute("href", url);
                        let image404 = document.createElement("img");
                        image404.setAttribute("src", "https://i.imgur.com/nfy6qFK.jpg");
                        lien404.appendChild(image404);
                        // Remplacer la media par le lien
                        media.parentNode.replaceChild(lien404, media);
                    };
                }
            }

            // Twitter
            if (parametres["sw-twitter"] === true && url.match(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?:#!\/)?(\w+)\/status\/(\d+)/)) {

                const match = url.match(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?:#!\/)?(\w+)\/status\/(\d+)/);
                const id_compte = match[1]; // Captured username
                const id_tweet = match[2]; // Captured Tweet ID
                let htmlTweet;
                console.log(match);
                console.log("Username:", id_compte);
                console.log("Tweet ID:", id_tweet);
                await $.ajax( {
                    type: "GET",
                    url: "https://publish.twitter.com/oembed?url=https://twitter.com/" + id_compte + "/status/" + id_tweet + "&dnt=true",
                    dataType: "jsonp",
                    success: function ( retour ) {
                        htmlTweet = retour.html;
                                        console.log(htmlTweet);
                        // Ramplacer le lien par le tweet
                        e.parentNode.innerHTML = htmlTweet;
                    }
                } );
            }else {
                console.log("The URL" + url + "does not match a Twitter/X status URL");
            }

            // PornHub
            if (parametres["sw-pornhub"] && url.match(/(?:https?:\/\/(?:[a-zA-Z0-9-]+\.)*pornhub\.com\/view_video\.php\?viewkey=([a-zA-Z0-9]+))/)) {
                // Créer le lecteur
                let lecteurPornHub = document.createElement("iframe");
                let videoIDMatch = url.match(/(?:https?:\/\/(?:[a-zA-Z0-9-]+\.)*pornhub\.com\/view_video\.php\?viewkey=([a-zA-Z0-9]+))/);

                if (videoIDMatch) {
                    let videoID = videoIDMatch[1];
                    lecteurPornHub.setAttribute("width", "380");
                    lecteurPornHub.setAttribute("height", "214");
                    lecteurPornHub.setAttribute("src", `https://www.pornhub.com/embed/${videoID}`);
                    lecteurPornHub.setAttribute("frameborder", "0");
                    lecteurPornHub.setAttribute("allowfullscreen", "");
                    // Ajouter le lecteur
                    e.parentNode.parentNode.insertBefore(lecteurPornHub, e.parentNode);
                    // Supprimer le lien
                    e.parentNode.remove();
                }
            }

        } );
        // Event listener for spoiler-btn clicks
        document.querySelectorAll('.spoiler-btn').forEach(function (spoilerBtn) {
            spoilerBtn.addEventListener('click', function () {
                // Find the closest parent with the class 'spoiler'
                let spoilerContainer = spoilerBtn.closest('.spoiler');

                // Check if spoilerContainer is found and is the direct parent of spoilerBtn
                if (spoilerContainer && spoilerContainer === spoilerBtn.parentElement) {
                    // Delay to ensure the content is fully ready
                    setTimeout(function () {
                        let spoilerContent = spoilerContainer.querySelector('.spoiler-content');

                        // Parse and embed links within the spoiler-content
                        ajoutLecteursEtIntegrations(spoilerContent);

                        // Check Imgur parameters and resize if necessary
                        if (parametres["sw-imgur"] === true || parametres["sw-imgur-ex"] === true) {
                            resizeImgurEmbeds(spoilerContent);
                        }
                    }, 100);
                }
            });
        });
    }

    // AntiPutaclic
    function antiPute() {
        // Find all <td> elements with the class "topics-title"
        document.querySelectorAll('td.topics-title a').forEach(function(a) {
            // Get the text content of the <td> element
            let originalText = a.textContent;

            // Remove emojis from the text content
            let strippedText = originalText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

            // Convert the text to lowercase
            let lowercaseText = strippedText.toLowerCase();

            // Set the updated text content back to the <td> element
            a.textContent = lowercaseText;
        });
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
                ajoutCitation();
                ajoutCitationAuth();

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
                function ajoutCitationAuth() {
                    // Create the button
                    let btnQuote = document.createElement('button');
                    btnQuote.setAttribute('type', 'button');
                    btnQuote.setAttribute('class', 'btn');
                    btnQuote.setAttribute('tabindex', '-1');
                    btnQuote.setAttribute('title', 'Ajouter une citation avec auteur');
                    let icon = document.createElement('span');
                    icon.setAttribute('class', 'glyphicon glyphicon-user');
                    btnQuote.append(icon);
                    // Add button to the editor
                    bbcode_zone.appendChild(btnQuote);

                    // EVENT - Button Quote
                    btnQuote.onclick = function () {
                        let selectionStart = textarea.selectionStart;
                        let selectionEnd = textarea.selectionEnd;

                        // Get the full content of the textarea
                        let text = textarea.value;

                        // Extract the selected text and surrounding text
                        let before = text.substring(0, selectionStart);
                        let selected = text.substring(selectionStart, selectionEnd);
                        let after = text.substring(selectionEnd);

                        if (selected === '') {
                            // No selection: Insert a placeholder single-line quote
                            let authorHeader = '> >>Auteur';
                            let formattedQuote = `${authorHeader}\n> `;
                            textarea.value = before + formattedQuote + after;
                            // Place cursor inside the author placeholder
                            textarea.focus();
                            textarea.selectionStart = selectionStart + 4; // Position after `>> [`
                            textarea.selectionEnd = textarea.selectionStart + 6; // Select `INSERT AUTHOR`
                        } else {

                            // Multi-line quote with author header
                            let lines = selected.split('\n');
                            let authorHeader = '> >>Auteur';
                            let quotedLines = lines.map(line => '> ' + line).join('\n');
                            let formattedQuote = `${authorHeader}\n${quotedLines}`;

                            // Update the textarea value
                            textarea.value = before + formattedQuote + after;

                            // Place cursor inside the author placeholder
                            textarea.focus();
                            textarea.selectionStart = before.length + 4; // Position after `>> [`
                            textarea.selectionEnd = textarea.selectionStart + 6; // Select `INSERT AUTHOR`

                        }
                    };
                }

                function ajoutCitation() {
                    // Create the button
                    let btnQuote = document.createElement('button');
                    btnQuote.setAttribute('type', 'button');
                    btnQuote.setAttribute('class', 'btn');
                    btnQuote.setAttribute('tabindex', '-1');
                    btnQuote.setAttribute('title', 'Ajouter une citation');
                    let icon = document.createElement('span');
                    icon.setAttribute('class', 'glyphicon glyphicon-chevron-right');
                    btnQuote.append(icon);
                    // Add button to the editor
                    bbcode_zone.appendChild(btnQuote);

                    // EVENT - Button Quote
                    btnQuote.onclick = function () {
                        let selectionStart = textarea.selectionStart;
                        let selectionEnd = textarea.selectionEnd;

                        // Get the full content of the textarea
                        let text = textarea.value;

                        // If there's a selection, get the selected text; otherwise, handle it as empty
                        let before = text.substring(0, selectionStart);
                        let selected = text.substring(selectionStart, selectionEnd);
                        let after = text.substring(selectionEnd);

                        // If no text is selected, insert `>` at the cursor position
                        if (selected === '') {
                            textarea.value = before + '>' + after;
                            textarea.focus();
                            textarea.selectionStart = selectionStart + 1;
                            textarea.selectionEnd = textarea.selectionStart;
                        } else {
                            // Split the selected text into lines based on actual newlines (\n)
                            let lines = selected.split('\n');

                            // Add `>` at the start of each line
                            let modified = lines.map(line => '>' + line).join('\n');

                            // Update the textarea value
                            textarea.value = before + modified + after;

                            // Restore selection range
                            textarea.focus();
                            textarea.selectionStart = selectionStart;
                            textarea.selectionEnd = selectionStart + modified.length;
                        }
                    };
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
        appliquer_blacklist_kw( doc );
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
        });
    }
    function appliquer_blacklist_kw(page) {
        // Parcourir les topics de la liste des topics
        page.querySelectorAll('.topics > tbody > tr').forEach((e) => {
            // Appliquer la blacklist de pseudos
            if (e.querySelector('.topics-title a')) {
                let titleElement = e.querySelector('.topics-title a');
                let title = titleElement.textContent.toLowerCase();


                // Check if any explicit keyword is present in the title
                if (blacklist_kw.some(keywordObj => {
                    const keyword = keywordObj.kw.toLowerCase();
                    return title.includes(keyword);
                })) {
                    // Keyword found in the title, perform necessary actions
                    e.querySelector('.topics-title a').textContent = '[ Contenu blacklisté ]';
                    // or modify the title in any other way
                }
            }
        });
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
        let modalRecherche = '<!-- Fond modal--> <div id="ss-modal-recherche" class="ss-panel-background"> <!-- Modal --> <div class="ss-panel"> <!-- En-tête --> <div class="ss-panel-header"> <img src="https://tabbygarf.club/files/themes/stratoscript/NzyZTYz.png" alt="Stratoscript"> <span class="ss-panel-close">&times;</span> </div> <!-- Corps --> <div class="ss-panel-body"><div class="ss-col"> <!-- Filtres de recherche --> <div class="ss-mini-panel"> <h3>Filtres de recherche</h3> <div class="ss-row ss-space-childs ss-full-width"> <div class="ss-row ss-fill ss-space-childs"> <input type="text" class="ss-fill inputFiltreAuteur" style="height:36px;min-width:200px" placeholder="Auteur"> <input type="text" class="ss-fill inputFiltreContenu" style="height:36px;min-width:200px" placeholder="Contenu"> </div> <button id="btn-recherche" class="ss-btn ss-vert" type="button">Rechercher</button> </div> </div> <!-- Barre de progrssion --> <div class="ss-row" style="margin:0px 20px 20px 20px"> <div class="ss-progressbar ss-full-width" style="display:none"> <div class="ss-col" style="width:0%"></div> </div> </div><!-- Résultats de recherche --> <div class="ss-mini-panel"> <h3>Résultats de recherche</h3> <div class="ss-full-width zone-resultats-recherche ss-col" style="padding:10px"> </div> </div> </div></div> <!-- Footer --> <div class="ss-panel-footer"> <span class="label" id="ss-version">Version </span> <div class="ss-row"> <button type="button" class="ss-btn ss-panel-close">Fermer</button> </div></div> </div> <!-- Fin modal --> </div> <!-- Fin fond modal -->';

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
        let modalRecherche = '<!-- Fond modal  --> <div id="ss-modal-recherche" class="ss-panel-background"> <!-- Modal --> <div class="ss-panel"> <!-- En-tête --> <div class="ss-panel-header"> <img src="https://tabbygarf.club/files/themes/stratoscript/NzyZTYz.png" alt="Stratoscript"> <span class="ss-panel-close">&times;</span> </div> <!-- Corps --> <div class="ss-panel-body"> <div class="ss-col"> <!-- Filtres de recherche --> <div class="ss-mini-panel"> <h3>Filtres de recherche</h3> <div class="ss-row ss-space-childs ss-full-width"> <div class="ss-row ss-fill ss-space-childs"> <input type="text" class="ss-fill inputFiltreAuteur" style="height:36px;min-width:200px" placeholder="Auteur"> <input type="text" class="ss-fill inputFiltreContenu" style="height:36px;min-width:200px" placeholder="Contenu"> </div> <button id="btn-filtrer" class="ss-btn ss-vert" type="button">Filtrer</button> <button id="btn-scanner" class="ss-btn ss-gris-clair" type="button">Scanner</button> </div> </div> <!-- Barre de progrssion --> <div class="ss-row" style="margin:0px 20px 20px 20px"> <div class="ss-progressbar ss-full-width" style="display:none"> <div class="ss-col" style="width:0%"></div> </div> </div> <!-- Résultats de recherche --> <div class="ss-mini-panel"> <h3>Résultats de recherche</h3> <div class="zone-resultats-recherche ss-col" style="padding:10px"> </div> </div> </div> </div> <!-- Footer --> <div class="ss-panel-footer"> <span class="label" id="ss-version">Version 1.0</span> <div class="ss-row"> <button type="button" class="ss-btn ss-panel-close">Fermer</button> </div> </div> </div> <!-- Fin modal --> </div> <!-- Fin fond modal -->';

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

        // Débloquer le bouton "Valider" si propre profil

        let id_forumeur
        let compte_profil

        let utilisateur_connecte = await getProfil();
        console.log(utilisateur_connecte.username);
        if ( utilisateur_connecte.username == pseudo_profil ) {
            document.getElementById( 'ss-btn-valider-profil' ).classList.remove( 'disabled' );
        id_forumeur = utilisateur_connecte.id;
        console.log(id_forumeur);
        } else {
        compte_profil = await getProfilParPseudo( pseudo_profil );
        id_forumeur = compte_profil.id;
        }

        console.log(id_forumeur);
        compte_profil = await getProfilParId( id_forumeur );



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
                fetch( "https://avenoel.org/api/v1/users/id:" + id_forumeur + "/avatar", requestOptions ).then( response => response.text() ).then( result => resolve( result ) ).catch( error => reject( 'error', error ) );
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
                fetch( "https://avenoel.org/user/id:" + id_forumeur, requestOptions ).then( response => response.text() ).then( result => resolve( result ) ).catch( error => reject( 'error', error ) );
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
            cell_icone.innerHTML = '<img class="ss-remove-btn" height="20px" src="https://avenoel.org/images/topic/delete.png" alt="Icône suppression" title="Déblacklister ce forumeur">';
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
            input_posts.setAttribute( 'max', '5' );
            input_posts.value = e.blocage_posts;
            cell_posts.appendChild( input_posts );
            // Range citations
            let input_citations = document.createElement( 'input' );
            input_citations.setAttribute( 'type', 'range' );
            input_citations.setAttribute( 'id', '#ss-bl-citations' );
            input_citations.setAttribute( 'class', 'ss-full-width' );
            input_citations.setAttribute( 'min', '1' );
            input_citations.setAttribute( 'max', '5' );
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
    function majPannel_BlacklistKW() {
        // Vider le tableau
        document.querySelectorAll( '#ss-table-blacklist-kw > tbody > tr' ).forEach( function ( e ) {
            e.remove();
        } );
        // Parcourir la blacklist et remplir le tableau
        let corpsTableau = document.getElementById( 'ss-table-blacklist-kw' ).getElementsByTagName( 'tbody' )[ 0 ];
        blacklist_kw.forEach( ( e, i ) => {
            // Colonnes
            let row = corpsTableau.insertRow( 0 );
            let cell_icone = row.insertCell( 0 );
            let cell_kw = row.insertCell( 1 );
            // Icone
            cell_icone.innerHTML = '<img class="ss-remove-kw" height="20px" src="https://avenoel.org/images/topic/delete.png" alt="Icône suppression" title="Déblacklister ce mot-clé">';
            // Pseudo
            cell_kw.textContent = e.kw;
            cell_kw.setAttribute( 'id', 'ss-bl-kw' );
        } );
    }

    // Mise à jour des parametres sur le pannel
    function majPannel_Parametres() {
        // Toutes les pages
        document.getElementById( 'sw-corr-url-odysee' ).querySelector( 'input' ).checked = parametres[ "sw-corr-url-odysee" ];
        document.getElementById( 'sw-odysee' ).querySelector( 'input' ).checked = parametres[ "sw-odysee" ];
        document.getElementById( 'sw-twitter' ).querySelector( 'input' ).checked = parametres[ "sw-twitter" ];
        document.getElementById( 'sw-imgur' ).querySelector( 'input' ).checked = parametres[ "sw-imgur" ];
        document.getElementById( 'sw-imgur-ex' ).querySelector( 'input' ).checked = parametres[ "sw-imgur-ex" ];
        document.getElementById( 'sw-issoutv' ).querySelector( 'input' ).checked = parametres[ "sw-issoutv" ];
        document.getElementById( 'sw-pornhub' ).querySelector( 'input' ).checked = parametres[ "sw-pornhub" ];
        document.getElementById( 'sw-mp4-webm' ).querySelector( 'input' ).checked = parametres[ "sw-mp4-webm" ];
        document.getElementById( 'sw-tiktok' ).querySelector( 'input' ).checked = parametres[ "sw-tiktok" ];
        document.getElementById( 'sw-insta' ).querySelector( 'input' ).checked = parametres[ "sw-insta" ];
        document.getElementById( 'sw-spotify' ).querySelector( 'input' ).checked = parametres[ "sw-spotify" ];
        document.getElementById( 'sw-soundcloud' ).querySelector( 'input' ).checked = parametres[ "sw-soundcloud" ];
        document.getElementById( 'sw-streamable' ).querySelector( 'input' ).checked = parametres[ "sw-streamable" ];
        document.getElementById( 'sw-masquer-inutile' ).querySelector( 'input' ).checked = parametres[ "sw-masquer-inutile" ];
        document.getElementById( 'sw-posts-url' ).querySelector( 'input' ).checked = parametres[ "sw-posts-url" ];
        document.getElementById( 'sw-catbox-embed' ).querySelector( 'input' ).checked = parametres[ "sw-catbox-embed" ];
        // Liste des topics
        document.getElementById( 'sw-refresh-topics' ).querySelector( 'input' ).checked = parametres[ "sw-refresh-topics" ];
        document.getElementById( 'sw-antipute' ).querySelector( 'input' ).checked = parametres[ "sw-antipute" ];
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
        document.getElementById( 'sw-musique-profil' ).querySelector( 'input' ).checked = parametres[ "sw-musique-profil" ];
        // Nouveaux messages
        document.getElementById( 'sw-prevoir-lock' ).querySelector( 'input' ).checked = parametres[ "sw-prevoir-lock" ];
        document.getElementById( 'sw-option-supplementaires' ).querySelector( 'input' ).checked = parametres[ "sw-option-supplementaires" ];
        document.getElementById( 'sw-formulaire-posts' ).querySelector( 'input' ).checked = parametres[ "sw-formulaire-posts" ];
        document.getElementById( 'sw-risibank-officiel' ).querySelector( 'input' ).checked = parametres[ "sw-risibank-officiel" ];
        document.getElementById( 'sw-imgur-toggle' ).querySelector( 'input' ).checked = parametres[ "sw-imgur-toggle" ];
        document.getElementById( 'sw-noel-toggle' ).querySelector( 'input' ).checked = parametres[ "sw-noel-toggle" ];
        document.getElementById( 'sw-cat-toggle' ).querySelector( 'input' ).checked = parametres[ "sw-cat-toggle" ];
        document.getElementById( 'sw-litter-toggle' ).querySelector( 'input' ).checked = parametres[ "sw-litter-toggle" ];
        document.getElementById( 'sw-antigolem' ).querySelector( 'input' ).checked = parametres[ "sw-antigolem" ];
        //document.getElementById( 'sw-pseudo-custom' ).querySelector( 'input' ).checked = parametres[ "sw-pseudo-custom" ];
        document.getElementById( 'sw-mode-discret' ).querySelector( 'input' ).checked = parametres[ "sw-mode-discret" ];
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
        boutonScript.innerHTML = '<a style="height:70px;width:55px" class="btnStratoscript" data-toggle="modal" data-target="#modalStratoscript" href="#stratoscriptPanel" ><img class="btnStratoscript" style="position:absolute" target="_blank" src="https://tabbygarf.club/files/themes/stratoscript/str.png" alt="Stratoscript" height="24"></a>';
        document.querySelector( '.navbar-links' ).appendChild( boutonScript );

        let css = '<style type="text/css"> /* Fix de histo de modé lorsque titre de topic trop long */ tbody a, tbody td:nth-of-type(4) { overflow-wrap: anywhere; } /* Fix des profils si long motif de ban sans espace */ div.surface div.text-center > div { overflow-wrap: anywhere; } /* ---------------- SLIDERS ---------------- */ /* The switch - the box around the slider */ .ss-switch { position: relative; display: inline-block; width: 60px; height: 34px; } /* Hide default HTML checkbox */ .ss-switch input { opacity: 0; width: 0; height: 0; } /* The slider */ .ss-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; -webkit-transition: 0.2s; transition: 0.2s; } .ss-slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: #242529; -webkit-transition: 0.2s; transition: 0.2s; } input:checked + .ss-slider { background-color: #fdde02; } input:focus + .ss-slider { box-shadow: 0 0 1px #fdde02; } input:checked + .ss-slider:before { -webkit-transform: translateX(26px); -ms-transform: translateX(26px); transform: translateX(26px); } /* Rounded sliders */ .ss-slider.ss-round { border-radius: 34px; } .ss-slider.ss-round:before { border-radius: 50%; } /* FOND DU PANEL */ .ss-panel-background { display: none; /* Hidden by default */ flex-direction: row; align-items: center; position: fixed; /* Stay in place */ z-index: 1; /* Sit on top */ left: 0; top: 0; width: 100%; /* Full width */ height: 100%; /* Full height */ overflow: auto; /* Enable scroll if needed */ background-color: rgb(0,0,0); /* Fallback color */ background-color: rgba(0,0,0,0.4); /* Black w/ opacity */ flex-direction: column; } /* Icone X Fermer */ span.ss-panel-close { color: #262626; font-size: 24px; font-weight: bold; } span.ss-panel-close:hover, span.ss-panel-close:focus { color: black; text-decoration: none; cursor: pointer; } /* ZONE PANEL */ .ss-panel { display: flex; flex-direction: column; color: #bbb; font-family: Tahoma, sans-serif; background-color: #2f3136; border: 1px solid #ccc; width: 1000px; max-height: 90%; margin-top: 30px; } @media screen and (max-width: 1000px) { .ss-panel { width: 100%; } } /* ------------------- FORMULAIRES ------------------- */ .ss-btn { width: 100px; height: 40px; padding: 10px !important; background-color: #2f3136 !important; border: none; color: #c8c8c9 !important; user-select: none; cursor: pointer; display: flex; flex-direction: row; justify-content: center; align-items:center; text-decoration: none !important; font-size: 16px; } .ss-btn:active { box-shadow: inset 1px 1px 5px black; } .ss-progressbar { background-color: #242529; height: 20px; width: 100px; } .ss-progressbar > * { text-align: center; vertical-align:middle; height: 100%; background-color: ; background: linear-gradient(orange, #fdde02, orange); color: #242529; } article .message-actions { display: flex !important; flex-direction: row; align-content: center; align-items: center; gap: 5px; } /* ------------------ STRUCTURE ------------------- */ .ss-panel-container { position:absolute; top:10vh; left:10vw; width:80vw; max-height:80vh; z-index:99999 } .ss-row { display: flex; flex-direction: row; flex-wrap: wrap; align-content: center; } .ss-col { display: flex; flex-direction: column; } .ss-fill { flex-grow: 4; } .ss-full-width { width: 100%; } .ss-space-between { justify-content: space-between; } .ss-space-childs { gap: 5px; } .disabled { pointer-events: none; filter: opacity(25%); } .ss-vert { background-color: #2ab27b !important; color: white !important; } .ss-vert:hover { background-color: #20ce88 !important; } .ss-rouge { background-color: #bf5329 !important; color:white !important; } .ss-rouge:hover { background-color: #d9501a !important; } .ss-gris-clair { background-color: #ccc !important; color:#242529 !important; } .hidden { display: none !important; } @media screen and (min-width: 768px) { .ss-mobile-only { display: none !important; } } .ss-mini-post .topic-message .message-content { min-height: auto !important; } /* ------------------ PARTIES DU PANEL ------------------- */ /* EN-TÊTE */ .ss-panel-header { background-image: linear-gradient(to bottom right, black, lightgrey); height: 44px; width: 100%; display: flex; flex-direction: row; justify-content: space-between; align-items:center; } .ss-panel-header > img { height:24px; margin: 10px; } .ss-panel-header > .ss-panel-close { margin-right: 15px; margin-bottom: 4px; } /* Zone onglets */ .ss-panel-onglets { background-color: none; margin: 15px 15px 5px 15px; display: flex; flex-direction: row; justify-content: flex-start; align-items:center; border-bottom: 1px solid #3e3d3d; list-style: none; } /* Onglet */ .ss-panel-onglets div a { user-select: none; cursor: pointer; width: 100px; height: 40px; display: flex; flex-direction: row; justify-content: center; align-items:center; text-decoration: none; font-size: 16px; } .ss-panel-onglets .active a       { color: #c8c8c9; background-color: #242529; } .ss-panel-onglets .active:hover a { color: #c8c8c9; background-color: #242529; } .ss-panel-onglets div:hover a     { color: #c8c8c9; background-color: #242529; } /* CORPS */ .ss-panel-body { display: flex; flex-direction: column; flex-wrap: wrap; margin: 10px; overflow-y: scroll; } .ss-zone { display: flex; flex-direction: column; flex-wrap: wrap; } .ss-text-hint { text-decoration: underline dotted; cursor: help;} .ss-mini-panel { display: flex; flex-direction: column; align-items: flex-start; margin:20px; padding: 10px; border: 1px solid #3e3d3d; flex: 1; } .ss-mini-panel-xs { display: flex; flex-direction: column; align-items: flex-start; margin:20px; padding: 10px; border: 1px solid #3e3d3d; } @media screen and (max-width: 800px) { .ss-mini-panel-xs { width: 100%; } } .ss-mini-panel > h3, .ss-mini-panel-xs > h3 { margin:-27px 0px 0px 0px; background-color:  #2f3136; padding-left: 10px; padding-right: 10px; font-size: 18px; font-weight:bold; line-height:1.5; } .ss-groupe-options { display: flex; flex-direction: row; align-items: center; justify-content: flex-start; flex-wrap: wrap; } .ss-option { align-items: center; display: inline-flex; margin:5px; width: 250px; } .ss-option div, .ss-label { margin: 5px; font-size: 15px; } .ss-option label { margin:0; } /* FOOTER */ .ss-panel-footer { display: flex; flex-direction: row; padding: 10px; border-top: 1px solid #3e3d3d; background-color: #242529; justify-content: space-between; align-items: center; padding-left: 30px; } /* SPECIFIQUES */ .ss-table-blacklist-forumeurs { color: #bbb; } .ss-sans-bordures { border: none; } .ss-table-blacklist-kw { color: #bbb; } .ss-sans-bordures { border: none; } .zone-resultats-recherche { width: 100%; } .ss-popup-profil { padding: 20px; display: flex; gap: 10px; left: 20px; bottom: 80px; background-color: rgba(255,75,75,.7); z-index: 99999; position: fixed; justify-content: flex-start; color: black; border-radius: 10px; flex-direction: column; align-items: stretch; align-content: flex-end; } .ss-popup-profil h3, .ss-popup-profil b { color: white; text-align: center; margin-top: 0px; } .ss-popup-profil div { gap: 10px; display: flex; flex-direction: row; justify-content: flex-end; align-items: center; } .ss-bouton-profil { cursor: pointer; display: flex; left: 20px; bottom: 20px; background-color: #fd4949; height: 50px; width: 50px; z-index: 99999; position: fixed; border-radius: 50%; justify-content: center; align-items: center; color: white; } img.ss-remove-kw { cursor: pointer; }  img.ss-remove-btn { cursor: pointer;}</style>';

        let pannelHTML = '<div id="ss-panel-background" class="ss-panel-background"> <!-- Modal --> <div class="ss-panel"> <!-- En-tête --> <div class="ss-panel-header"> <img src="https://tabbygarf.club/files/themes/stratoscript/NzyZTYz.png" alt="Stratoscript"> <span class="ss-panel-close">&times;</span> </div> <!-- Onglets --> <div class="ss-panel-onglets"> <div id="ss-onglet-general" class="active"><a>Général</a></div> <div id="ss-onglet-blacklist"><a>Blacklist</a></div> <div id="ss-onglet-autre"><a>Autre</a></div> </div> <!-- Corps --> <div class="ss-panel-body"> <!-- ONGLET GENERAL --> <div id="ss-zone-general" class="ss-zone" style="display: block;"> <div class="ss-mini-panel"> <h3>Intégrations <label id="sw-corr-url-odysee" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> </h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-twitter" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Twitter/X</div> </div> <div class="ss-option"> <label id="sw-issoutv" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>IssouTV</div> </div> <div class="ss-option"> <label id="sw-pornhub" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>PornHub</div> </div> <div class="ss-option"> <label id="sw-mp4-webm" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div class="ss-text-hint" title="Ajoute un lecteur vidéo pour tout lien menant vers un fichier MP4 ou WEBM et un lecteur audio pour les fichiers MP3, FLAC, etc. (e.g. https://tabbygarf.club/etchebest.mp4)">Lecteurs Audio, MP4 et WEBM</div> </div> <div class="ss-option"> <label id="sw-odysee" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Odysee</div> </div> <div class="ss-option"> <label id="sw-tiktok" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Tiktok</div> </div><div class="ss-option"> <label id="sw-insta" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div class="ss-text-hint" title="Integre les posts insta.">Instagram</div> </div> <div class="ss-option"> <label id="sw-spotify" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Spotify </div> </div> <div class="ss-option"> <label id="sw-soundcloud" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Soundcloud</div> </div> <div class="ss-option"> <label id="sw-streamable" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div class="ss-text-hint" title="Ajoute le lecteur officiel pour tous les liens streamable.com et staging.streamable.com.">Streamable</div> </div> <div class="ss-option"> <label id="sw-masquer-inutile" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div class="ss-text-hint" title="Retire tous les liens morts d\'un message.">Masquer les 404</div> </div> <div class="ss-option"> <label id="sw-posts-url" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div class="ss-text-hint" title="Permet d\'avoir les messages AVN intégrés dans le post, à la place du lien.">URLs AVN (Posts)</div> </div>  <div class="ss-option"> <label id="sw-imgur" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div class="ss-text-hint" title="Reduis la taille des photos Imgur (potentiellement) cancer, ignore les images qui servent de titre comme ceux du topic Modération ou d\'une bio.">Corrections Imgur</div> </div> <div class="ss-option"> <label id="sw-catbox-embed" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Catbox/Litterbox</div> </div> </div> </div> <div class="ss-row"> <div class="ss-mini-panel-xs"> <h3>Liste des topics</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-refresh-topics" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Autorefresh</div> </div> <div class="ss-option"> <label id="sw-antipute" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div class="ss-text-hint" title="Dans la liste des sujets, le filtre mets tous les titres en minuscule, tout en retirant les emojis, laissant le texte faire le boulot de vous aguicher.">Filtre anti-putaclic</div> </div> </div> </div> <div class="ss-mini-panel"> <h3>Topic</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-refresh-posts" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Autorefresh</div> </div> <div class="ss-option"> <label id="sw-recherche-posts" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Recherche</div> </div> </div> </div> </div> <div class="ss-row"> <div class="ss-mini-panel-xs"> <h3>Liste des MPs</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-btn-quitter-mp" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Bouton de sortie de MP</div> </div> </div> </div> <div class="ss-mini-panel"> <h3>MPs</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-recherche-mp"  class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Recherche</div> </div> </div> </div> <div class="ss-mini-panel-xs"> <h3>Mes messages</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-recherche-mes-messages"  class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Recherche</div> </div> </div> </div> <div class="ss-mini-panel"> <h3>Profils</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-custom-profils"  class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div class="ss-text-hint" title="Ajoute un bouton qui permet de changer son profil, ou afficher les sources du profil des autres. Permet d\'exporter ou d\'importer un profil, de changer son profil sans changer son age">Outil de customization</div> </div> </div> </div> <div class="ss-mini-panel"> <h3>Messages</h3> <div class="ss-groupe-options"> <div class="ss-option"> <label id="sw-prevoir-lock" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div class="ss-text-hint" title="Mets un pop-up avant de poster le message si y\'a eu lock, suppression ou Cloudflare">Prévoir perte de message</div> </div> <div class="ss-option"> <label id="sw-option-supplementaires" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div class="ss-text-hint" title="Ajoute des boutons a la barre de la zone de texte, permettant du texte en couleur, en puissance ou ajouter une tabulation." >Options supplémentaires</div> </div> <div class="ss-option"> <label id="sw-formulaire-posts" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Formulaire flottant</div> </div> <div class="ss-option"> <label id="sw-risibank-officiel" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Risibank officiel</div> </div> <div class="ss-option ss-text-hint" title="Ajoute un bouton qui permet d\'upload sur imgur, il faudra accorder la permission au script de faire des requetes HTTP."> <label id="sw-imgur-toggle" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Bouton Imgur</div> </div> <div class="ss-option ss-text-hint" title="Ajoute un bouton qui permet d\'upload sur Catbox/Litterbox, il faudra accorder la permission au script de faire des requetes HTTP."> <label id="sw-cat-toggle" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Bouton Catbox</div> </div> <div class="ss-option ss-text-hint" title="Ajoute un bouton qui permet d\'upload sur Noelshack, il faudra accorder la permission au script de faire des requetes HTTP."> <label id="sw-noel-toggle" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Bouton Noelshack</div> </div> </div> </div> </div> </div> <!-- FIN ONGLET GENERAL --> <!-- ONGLET BLACKLIST --> <div id="ss-zone-blacklist" class="ss-zone ss-col" style="display: none;"> <div class="ss-row"> <div class="ss-mini-panel-xs ss-sans-bordures"> <div> <div class="ss-label">Blacklister un forumeur</div> <div class="ss-row"> <input type="text" class="ss-fill" placeholder="Pseudo" style="height:36px;min-width:200px"> <button id="ss-btn_blacklist_forumeurs_ajout" class="ss-btn ss-vert" type="button" style="height:36px;width:36px"><b style="transform: rotate(-45deg)">&times;</b></button> </div> </div> </div> <div class="ss-mini-panel"> <h3>Liste des forumeurs bloqués</h3> <table class="ss-table-blacklist-forumeurs ss-full-width" id="ss-table-blacklist-forumeurs"> <thead style="background-image:linear-gradient(to bottom , #686868, #404040)"> <tr> <th style="font-size: 12px;width:30px"></th> <th style="font-size: 12px;">Pseudo</th> <th style="font-size: 12px;text-align: center;width:20%">Topics</th> <th style="font-size: 12px;text-align: center;width:20%">Posts</th> <th style="font-size: 12px;text-align: center;width:20%">Citations</th> </tr> </thead> <tbody> <tr id="ss-bl-element"> <td>#</td> <td id="ss-bl-pseudo" class="ss-label">MachinTrucTrucTruc</td> <td><input id="ss-bl-topics" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> <td><input id="ss-bl-posts" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> <td><input id="ss-bl-citations" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> </tr> <tr id="ss-bl-element"> <td>#</td> <td id="ss-bl-pseudo" class="ss-label">Bidoule</td> <td><input id="ss-bl-topics" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> <td><input id="ss-bl-posts" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> <td><input id="ss-bl-citations" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> </tr> <tr id="ss-bl-element"> <td>#</td> <td id="ss-bl-pseudo" class="ss-label">Jaaaaaj</td> <td><input id="ss-bl-topics" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> <td><input id="ss-bl-posts" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> <td><input id="ss-bl-citations" type="range" class="ss-full-width" id="ss-rg-blacklist-forumeurs" min="1" max="3"></td> </tr> </tbody> </table> </div> <div class="ss-row"> <div class="ss-mini-panel-xs ss-sans-bordures"> <div> <div class="ss-label">Blacklister un mot-clé</div> </div> <div class="ss-row"> <input type="text" class="ss-fill" placeholder="Mot-clé" style="height:36px;min-width:200px"> <button id="ss-btn_blacklist_kw_ajout" class="ss-btn ss-vert" type="button" style="height:36px;width:36px"><b style="transform: rotate(-45deg)">&times;</b></button> </div> </div> <div class="ss-mini-panel"> <h3>Liste des mots-clés bloqués</h3> <table class="ss-table-blacklist-kw ss-full-width" id="ss-table-blacklist-kw"> <thead style="background-image:linear-gradient(to bottom , #686868, #404040)"> <tr> <th style="font-size: 12px;width:30px"></th> <th style="font-size: 12px;">Mot-clé</th> </tr> </thead> <tbody> <tr id="ss-bl-element"> <td>#</td> <td id="ss-bl-pseudo" class="ss-label">MachinTrucTrucTruc</td> </tr> <tr id="ss-bl-element"> <td>#</td> <td id="ss-bl-pseudo" class="ss-label">Bidoule</td> </tr> </tbody> </table> </div> </div> </div> </div> <!--FIN ONGLET BL --> <!-- ONGLET AUTRE--> <div id="ss-zone-autre" class="ss-zone ss-col" style="display: none;"> <div class="ss-row"> <div class="ss-mini-panel-xs"> <h3>Cosmétique</h3> <div class="ss-groupe-options"> <div class="ss-option ss-text-hint" title="Ajoute des lunettes anti-golem aux pfps par défaut."> <label id="sw-antigolem" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Sans avatars anti-golem</div> </div><div class="ss-option ss-text-hint" title="Change le logo et les pps."><label id="sw-mode-discret" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label><div>Mode discret</div> </div> <div class="ss-option"> <label id="sw-musique-profil" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div class="ss-text-hint" title="Affiche les infos de la musique de profil, inspiré du plugin de Draekoort.">Identificateur de musique</div></div> </div> </div> </div> <div class="ss-row"> <div class="ss-mini-panel-xs"> <h3>Personnalisations Supplémentaires</h3> <div class="ss-groupe-options"> <div class="ss-option ss-text-hint" title="Transforme les uploads Catbox en upload Litterbox, ce qui augmente la taille a 1GO, mais expire apres 72h."> <label id="sw-litter-toggle" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div>Uploads Catbox Temporaires</div> </div> <div class="ss-option"> <label id="sw-imgur-ex" class="ss-switch"><input type="checkbox"><span class="ss-slider ss-round"></span></label> <div class="ss-text-hint" title="Reduis la taille de TOUTES les photos Imgur, dans une taille de sticker habituelle">Corrections Imgur (Extreme) </div> </div> </div> </div> </div> </div> </div> <!-- FIN ONGLET AUTRE --> <!-- Footer --> <div class="ss-panel-footer"> <span class="label" id="ss-version">Version 1.14.8 by Stratosphere, Maintained with ♥ by StayNoided</span> <div class="ss-row ss-space-childs"> <button type="button" class="ss-btn ss-panel-close">Fermer</button> <button type="button" class="ss-btn ss-panel-valider ss-vert" id="btn-validation-parametres">Valider</button> </div> </div> </div> <!-- Fin modal --> </div>';

        pannelHTML += css;

        document.getElementById( 'stratoscriptPanel' ).innerHTML = pannelHTML;

        majPannel_BlacklistPseudos();
        majPannel_BlacklistKW();
        majPannel_Parametres();

        // Affichage de la version
        document.querySelectorAll( '#ss-version' ).forEach( ( e ) => {
            e.innerHTML = 'Version ' + version;
        } );

        // URL of the raw stratoscript.user.js file on GitHub
        const rawScriptUrl = 'https://raw.githubusercontent.com/TabbyGarf/Stratoscript/main/stratoscript.user.js';

        // Get the installed version from your current script
        const installedVersion = version; // Assuming 'version' is a global variable

        // Function to compare versions
        function compareVersions(installed, raw) {
            // Implement your version comparison logic here
            // For simplicity, we'll check for an exact match
            return installed === raw;
        }

        // Fetch the raw script file from GitHub
        fetch(rawScriptUrl)
            .then(response => response.text())
            .then(rawScriptContent => {
            // Extract version from the raw script content (modify the regex accordingly)
            const match = rawScriptContent.match(/@version\s+(\S+)/);
            const rawScriptVersion = match ? match[1] : null;

            // Check if the versions match
            if (rawScriptVersion && !compareVersions(installedVersion, rawScriptVersion)) {
                // Versions don't match, add an update image link next to the button
                let boutonAlerte = document.createElement( 'li' );
                boutonAlerte.innerHTML = '<a style="height:70px;width:55px" class="btn-ss-update" href="https://raw.githubusercontent.com/TabbyGarf/Stratoscript/main/stratoscript.user.js" ><img class="btnUpdate" style="position:absolute" target="_blank" src="https://tabbygarf.club/files/themes/stratoscript/update.png" alt="!!!" title="Une mise à jour est disponible !" height="24"></a>';
                document.querySelector( '.navbar-links' ).appendChild( boutonAlerte );
            }
        })
            .catch(error => console.error('Error fetching script file:', error));


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
        // Event - Blacklist keywords : Clic bouton d'ajout
        document.getElementById( 'ss-btn_blacklist_kw_ajout' ).onclick = function () {
            let kw = document.getElementById( 'ss-btn_blacklist_kw_ajout' ).previousElementSibling.value.trim();
            let dejaBL = false;
            blacklist_kw.forEach( function ( e ) {
                if ( e.kw == kw )
                    dejaBL = true;
            }
            );
            if ( kw !== "" && !dejaBL ) {
                let nv_kw_bl = {
                    kw: kw,
                };
                blacklist_kw.push( nv_kw_bl );
                // Ajouter le motclé à la liste
                majPannel_BlacklistKW();
                // Vider le champs
                document.getElementById( 'ss-btn_blacklist_kw_ajout' ).previousElementSibling.value = "";
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
        // Event - Blacklist mot-clé : Clic bouton de suppression
        document.querySelectorAll( '.ss-remove-kw' ).forEach( ( e, i ) => {
            e.onclick = function () {
                let kw = e.parentElement.parentElement.querySelector( '#ss-bl-kw' ).innerText.trim();
                if ( kw !== "" ) {
                    let index_u_suppr = [];
                    blacklist_kw.forEach( function ( e, i ) {
                        if ( e.kw == kw ) {
                            index_u_suppr.push( i );
                        }
                    } );
                    // Parcourir à l'envers et supprimer (car la suppression nique les index)
                    for ( var i = index_u_suppr.length - 1; i >= 0; i-- ) {
                        blacklist_kw.splice( index_u_suppr[i], 1 );
                    }
                    majPannel_BlacklistKW();
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
                // Event - Clic sur l'onglet Autres
        document.getElementById( 'ss-onglet-autre' ).onclick = function () {
            // Onglets
            document.querySelectorAll( '.ss-panel-onglets > div' ).forEach( function ( e ) {
                e.classList.remove( 'active' );
            } );
            document.getElementById( 'ss-onglet-autre' ).classList.add( 'active' );
            // Zones
            document.querySelectorAll( '.ss-panel-body > .ss-zone' ).forEach( function ( e ) {
                e.style.display = 'none';
            } );
            document.getElementById( 'ss-zone-autre' ).style.display = 'block';

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
                parametres[ "sw-imgur" ] = document.getElementById( 'sw-imgur' ).querySelector( 'input' ).checked;
                parametres[ "sw-imgur-ex" ] = document.getElementById( 'sw-imgur-ex' ).querySelector( 'input' ).checked;
                parametres[ "sw-issoutv" ] = document.getElementById( 'sw-issoutv' ).querySelector( 'input' ).checked;
                parametres[ "sw-pornhub" ] = document.getElementById( 'sw-pornhub' ).querySelector( 'input' ).checked;
                parametres[ "sw-mp4-webm" ] = document.getElementById( 'sw-mp4-webm' ).querySelector( 'input' ).checked;
                parametres[ "sw-tiktok" ] = document.getElementById( 'sw-tiktok' ).querySelector( 'input' ).checked;

                parametres[ "sw-spotify" ] = document.getElementById( 'sw-spotify' ).querySelector( 'input' ).checked;
                parametres[ "sw-soundcloud" ] = document.getElementById( 'sw-soundcloud' ).querySelector( 'input' ).checked;
                parametres[ "sw-insta" ] = document.getElementById( 'sw-insta' ).querySelector( 'input' ).checked;
                parametres[ "sw-streamable" ] = document.getElementById( 'sw-streamable' ).querySelector( 'input' ).checked;
                parametres[ "sw-masquer-inutile" ] = document.getElementById( 'sw-masquer-inutile' ).querySelector( 'input' ).checked;
                parametres[ "sw-posts-url" ] = document.getElementById( 'sw-posts-url' ).querySelector( 'input' ).checked;
                parametres[ "sw-catbox-embed" ] = document.getElementById( 'sw-catbox-embed' ).querySelector( 'input' ).checked;
                // Liste des topics
                parametres[ "sw-refresh-topics" ] = document.getElementById( 'sw-refresh-topics' ).querySelector( 'input' ).checked;
                parametres[ "sw-antipute" ] = document.getElementById( 'sw-antipute' ).querySelector( 'input' ).checked;
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
                parametres[ "sw-musique-profil" ] = document.getElementById( 'sw-musique-profil' ).querySelector( 'input' ).checked;
                // Nouveaux messages
                parametres[ "sw-prevoir-lock" ] = document.getElementById( 'sw-prevoir-lock' ).querySelector( 'input' ).checked;
                parametres[ "sw-option-supplementaires" ] = document.getElementById( 'sw-option-supplementaires' ).querySelector( 'input' ).checked;
                parametres[ "sw-formulaire-posts" ] = document.getElementById( 'sw-formulaire-posts' ).querySelector( 'input' ).checked;
                parametres[ "sw-risibank-officiel" ] = document.getElementById( 'sw-risibank-officiel' ).querySelector( 'input' ).checked;
                parametres[ "sw-imgur-toggle" ] = document.getElementById( 'sw-imgur-toggle' ).querySelector( 'input' ).checked;
                parametres[ "sw-noel-toggle" ] = document.getElementById( 'sw-noel-toggle' ).querySelector( 'input' ).checked;
                parametres[ "sw-cat-toggle" ] = document.getElementById( 'sw-cat-toggle' ).querySelector( 'input' ).checked;
                parametres[ "sw-litter-toggle" ] = document.getElementById( 'sw-litter-toggle' ).querySelector( 'input' ).checked;
                parametres[ "sw-antigolem" ] = document.getElementById( 'sw-antigolem' ).querySelector( 'input' ).checked;
                // parametres[ "sw-pseudo-custom" ] = document.getElementById( 'sw-pseudo-custom' ).querySelector( 'input' ).checked;
                parametres[ "sw-mode-discret" ] = document.getElementById( 'sw-mode-discret' ).querySelector( 'input' ).checked;

                localStorage_save( parametres, "ss_parametres" );
                localStorage_save( blacklist_pseudos, "ss_blacklist_pseudos" );
                localStorage_save( blacklist_kw, "ss_blacklist_kw" );

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
   function styleUsernameLink(imgTag) {
    const usernameMatch = imgTag.alt.match(/Avatar de (\w+)/);
    if (usernameMatch && usernameMatch[1]) {
        const username = usernameMatch[1];

        // Apply styles to the link with the matching href
        const usernameLinks = document.querySelectorAll(`a[href="https://avenoel.org/profil/${username}"]`);

        usernameLinks.forEach(link => {
            const textColor = getComputedStyle(link).color;
            link.style.textShadow = `0 0 2px ${textColor}`;
        });
    }
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
    var getProfilParId = function ( pseudo ) {
        return new Promise( function ( resolution, rejet ) {
            let requestOptions = {
                method: 'GET',
                redirect: 'follow'
            };
            // Requête
            fetch( "https://avenoel.org/api/v1/users/id:" + pseudo, requestOptions ).then( response => response.text() ).then( result => resolution( JSON.parse( result ).data ) ).catch( error => rejet( error ) );
        } );
    };
    var getProfil = function ( pseudo ) {
        return new Promise(function (resolution, rejet) {
        let requestOptionsAuth = {
            method: 'GET',
            redirect: 'follow'
        };

        // Fetch user ID from /auth
        // Merci Coulisse pour l'idée du /auth
        fetch("https://avenoel.org/auth", requestOptionsAuth)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(authData => {
                // Extract user ID from authData
                const userId = authData.user.id;
                let requestOptionsUserData = {
                    method: 'GET',
                    redirect: 'follow'
                };

                // Fetch user profile data using user ID
                fetch("https://avenoel.org/api/v1/users/id:" + userId, requestOptionsUserData)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.text();
                    })
                    .then(result => resolution(JSON.parse(result).data))
                    .catch(error => rejet(error));
            })
            .catch(error => rejet(error));
    });
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

    // IMGUR

    // Function to upload file or URL to Imgur using Imgur API
    function uploadToImgur(fileOrUrl, event) {
        // Replace 'YOUR_CLIENT_ID' with your Imgur API client ID
        const clientId = 'eb3fa83064638bb';

        const formData = new FormData();

        if (typeof fileOrUrl === 'string') {
            // formatting in case a discordapp link was sent and the format is webp
            const url = new URL(fileOrUrl);
            if (url.hostname === 'media.discordapp.net') {
                const formatParam = url.searchParams.get('format');
                if (formatParam && formatParam !== 'jpeg') {
                    url.searchParams.set('format', 'jpeg');
                }
                fileOrUrl = url.toString();
            }
            // URL upload
            formData.append('type', 'URL');
            formData.append('image', fileOrUrl);
        } else if (fileOrUrl instanceof File) {
            // File upload
            formData.append('type', 'file');
            formData.append('image', fileOrUrl);
        } else {
            console.error('Invalid argument. Expected File or URL.');
            return;
        }

        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://api.imgur.com/3/image',
            headers: {
                Authorization: `Client-ID ${clientId}`,
            },
            data: formData,
            onload: function(response) {
                const jsonResponse = JSON.parse(response.responseText);
                if (jsonResponse.success) {
                    // Handle successful upload, paste the Imgur link in the closest textarea
                    const uploadButton = event.target; // Assuming you have access to the event object
                    const closestTextarea = findClosestTextarea(uploadButton);

                    if (closestTextarea) {
                        const imgurLink = jsonResponse.data.link;
                        const cursorPos = closestTextarea.selectionStart;
                        const textBeforeCursor = closestTextarea.value.substring(0, cursorPos);
                        const textAfterCursor = closestTextarea.value.substring(cursorPos);

                        closestTextarea.value = textBeforeCursor + imgurLink + textAfterCursor;
                    }
                } else {
                    // Handle upload failure
                    console.error('Imgur Upload Failed');
                    alert('Imgur upload failed. Please try again.');
                }
            },
            onerror: function(error) {
                console.error('Error uploading to Imgur:', error);

                // Show a popup error
                alert('Error uploading to Imgur. Please try again.');
            },
        });
    }


    async function convertFormDataToBlob(formData, boundary) {
        const chunks = [];

        for (let [key, value] of formData.entries()) {
            chunks.push(`--${boundary}\r\n`);
            if (value instanceof File) {
                const fileBuffer = await value.arrayBuffer();
                const uint8Array = new Uint8Array(fileBuffer);

                chunks.push(`Content-Disposition: form-data; name="${key}"; filename="${value.name}"\r\n`);
                chunks.push(`Content-Type: ${value.type}\r\n\r\n`);
                chunks.push(uint8Array);
                chunks.push('\r\n');
            } else {
                chunks.push(`Content-Disposition: form-data; name="${key}"\r\n\r\n`);
                chunks.push(value + '\r\n');
            }
        }

        chunks.push(`--${boundary}--\r\n`);
        return new Blob(chunks, { type: 'multipart/form-data; boundary=' + boundary });
    }

    async function uploadToCatbox(fileOrUrl, event, t = false) {
        const catboxApiUrl = t ? 'https://litterbox.catbox.moe/resources/internals/api.php' : 'https://catbox.moe/user/api.php';
        const expiryTime = '72h';
        const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substr(2);

        const formData = new FormData();

        if (typeof fileOrUrl === 'string') {
            // URL upload
            formData.append('reqtype', 'urlupload');
            formData.append('url', fileOrUrl);
        } else if (fileOrUrl instanceof File) {
            // File upload
            formData.append('reqtype', 'fileupload');
            formData.append('fileToUpload', fileOrUrl);
            if (t) {
                formData.append('time', expiryTime);
            }
        } else {
            console.error('Invalid argument. Expected File or URL.');
            return;
        }

        // Debug: Log the formData
        for (let pair of formData.entries()) {
            console.log(pair[0]+ ': ' + pair[1]);
        }

        // Serialize FormData for GM_xmlhttpRequest
        // Convert FormData to a Blob for GM_xmlhttpRequest
        const body = await convertFormDataToBlob(formData, boundary);
        console.log('FormData:', formData);
        GM_xmlhttpRequest({
            method: 'POST',
            url: catboxApiUrl,
            data: body,
            binary: true,
            headers: {
                'Content-Type': 'multipart/form-data; boundary=' + boundary
            },
            onload: function(response) {
                console.log('Uploaded successfully:', response.responseText);

                const uploadButton = event.target;
                const closestTextarea = findClosestTextarea(uploadButton);

                if (closestTextarea) {
                    const catboxLink = response.responseText.trim();
                    const cursorPos = closestTextarea.selectionStart;
                    const textBeforeCursor = closestTextarea.value.substring(0, cursorPos);
                    const textAfterCursor = closestTextarea.value.substring(cursorPos);

                    closestTextarea.value = textBeforeCursor + catboxLink + textAfterCursor;
                }
            },
            onerror: function(error) {
                console.error('Upload failed:', error);

            }
        });
    }
    function uploadToNoelshack(file, event) {
        const formData = new FormData();
        formData.append('fichier', file);

        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://www.noelshack.com/api.php',
            data: formData,
            onload: function(response) {
                const imageUrl = response.responseText.trim();
                console.log(imageUrl);
                if (imageUrl.startsWith('https://www.noelshack.com')) {
                    // Handle successful upload, paste the Noelshack link in the closest textarea
                    const uploadButton = event.target;
                    const closestTextarea = findClosestTextarea(uploadButton);

                    if (closestTextarea) {
                        const noelshackLink = parseNoelshackUrl(imageUrl);
                        const cursorPos = closestTextarea.selectionStart;
                        const textBeforeCursor = closestTextarea.value.substring(0, cursorPos);
                        const textAfterCursor = closestTextarea.value.substring(cursorPos);

                        closestTextarea.value = textBeforeCursor + noelshackLink + textAfterCursor;
                    }
                } else {
                    // Handle upload failure
                    console.error('Noelshack Upload Failed');
                    alert('L\'upload a fail, Formats autorisés : PNG, JPEG, GIF, SVG, BMP, TIFF. Poids max. : 4 Mo. Taille min. : 128x128 px.');
                }
            },
            onerror: function(error) {
                console.error('Error uploading to Noelshack:', error);

                // Show a popup error
                alert('Error uploading to Noelshack. Please try again.');
            },
        });
    }

    function parseNoelshackUrl(url) {
        const match = url.match(/www\.noelshack\.com\/([0-9]+)-([0-9]+)-(.+)/);
        if (match) {
            const year = match[1];
            const month = match[2];
            const uids = match[3].split('-');
            const subid = uids[0];
            const id = uids.slice(1).join('-');
            return `https://image.noelshack.com/fichiers/${year}/${month}/${subid}/${id}`;
        } else {
            console.error('Failed to parse Noelshack URL:', url);
            return url;
        }
    }

    function findClosestTextarea(element) {
        // Traverse up the DOM until a textarea within the same textarea-container is found
        while (element && !element.querySelector('.form-group textarea')) {
            element = element.parentNode;
        }

        // Return the textarea element if found, otherwise null
        return element ? element.querySelector('.form-group textarea') : null;
    }


    // Function to handle file drop or URL input
    function handleDrop(event) {
        event.preventDefault();

        const dataTransfer = event.dataTransfer;
        const fileInput = document.getElementById('fileInput');
        const urlInput = document.getElementById('urlInput');

        // Check if files were dropped
        if (dataTransfer && dataTransfer.files.length > 0) {
            const file = dataTransfer.files[0];
            uploadToImgur(file, event);
        } else if (urlInput.value.trim() !== '') {
            // Check if URL input is not empty
            const imageUrl = urlInput.value.trim();
            uploadToImgur(imageUrl, event);
        }
    }
    function handleDropC(event) {
        event.preventDefault();

        const dataTransfer = event.dataTransfer;
        const fileInput = document.getElementById('fileInput');
        const urlInput = document.getElementById('urlInput');

        // Check if files were dropped
        if (dataTransfer && dataTransfer.files.length > 0) {
            const file = dataTransfer.files[0];
            uploadToCatbox(file, event, litter);
        } else if (urlInput.value.trim() !== '') {
            // Check if URL input is not empty
            const imageUrl = urlInput.value.trim();
            uploadToCatbox(imageUrl, event, litter);
        }
    }
        // Function to handle file drop or URL input
    function handleDropN(event) {
        event.preventDefault();

        const dataTransfer = event.dataTransfer;
        const fileInput = document.getElementById('fileInput');
        const urlInput = document.getElementById('urlInput');

        // Check if files were dropped
        if (dataTransfer && dataTransfer.files.length > 0) {
            const file = dataTransfer.files[0];
            uploadToNoelshack(file, event);
        } else if (urlInput.value.trim() !== '') {
            // Check if URL input is not empty
            const imageUrl = urlInput.value.trim();
            uploadToNoelshack(imageUrl, event);
        }
    }


    // Function to handle dragover and dragenter events
    function handleDragOverEnter(event) {
        event.preventDefault();
    }



    // Function to handle file selection via click
    function handleFileInput(event) {
        const fileInput = event.target;
        const file = fileInput.files[0];
        if (file) {
            uploadToImgur(file, event);
        }
    }
    function handleFileInputC(event) {
        const fileInput = event.target;
        const file = fileInput.files[0];
        if (file) {
            uploadToCatbox(file, event, litter);
        }
    }
    // Function to handle file selection via click
    function handleFileInputN(event) {
        const fileInput = event.target;
        const file = fileInput.files[0];
        if (file) {
            uploadToNoelshack(file, event);
        }
    }

    // Function to toggle a dropzone
    function toggleDropzone(dropzoneClass, button) {
        const parentContainer = button.closest('.textarea-container'); // Adjust the selector to match your actual parent container class
        const dropzone = parentContainer.querySelector(`.${dropzoneClass}`);
        if (dropzone) {
            dropzone.style.display = (dropzone.style.display === 'none') ? 'block' : 'none';
        }
    }

    // Function to hide a dropzone
    function hideDropzone(dropzoneClass, button) {
        const parentContainer = button.closest('.textarea-container'); // Adjust the selector to match your actual parent container class
        const dropzone = parentContainer.querySelector(`.${dropzoneClass}`);
        if (dropzone) {
            dropzone.style.display = 'none';
        }
    }




    function transformCatboxLinks(selector) {
        // Find all <a> elements with class 'link' inside the specified selector
        const linkElements = document.querySelectorAll(selector);

        linkElements.forEach(linkElement => {
            const href = linkElement.getAttribute('href');
            const title = linkElement.getAttribute('title');

            // Check if the href points to a Catbox link
            if (isCatboxLink(href) && /\.(jpg|jpeg|png|gif|bmp|webp|tiff|tif|svg|heic|heif|ico|jfif|pjpeg|pjp)$/i.test(href)) {
                // Create the new <img> element
                const imgElement = document.createElement('img');
                imgElement.setAttribute('src', href);
                imgElement.setAttribute('alt', title || href); // Use title or fallback to href for alt text
                imgElement.classList.add('catbox-image');
                imgElement.style.maxWidth = '50%'; // Set max width to 50%

                // Replace the original <a class="link"> with the new <img> element
                linkElement.parentNode.replaceChild(imgElement, linkElement);

            }

        });
    }

    // Function to check if a URL is a Catbox link
    function isCatboxLink(url) {
        const catboxDomains = ['files.catbox.moe', 'litter.catbox.moe'];
        try {
            const urlObj = new URL(url);
            return catboxDomains.includes(urlObj.hostname);
        } catch (error) {
            console.error('Invalid URL:', url);
            return false;
        }
    }

    ////
    // AVN musique (0.1)
    // Récupération du titre des musiques de profil
    // par Draekoort
    // surcomplication par StayNoided (lol)
    ////////////
    ////////////

async function identifyTrack() {
    const musicUrl = document.querySelector("meta[property='og:music']").content;
    console.log(musicUrl);

    try {
        const response = await fetch(`https://noembed.com/embed?format=json&url=${musicUrl}`);
        const data = await response.json();

        // Extract information from the response
        const title = data.title;
        const authorName = data.author_name;

        // Remove common suffixes like " - Topic", "VEVO", "Official"
        const cleanedAuthorName = authorName.replace(/(?: - Topic|VEVO|Official)$/, '');

        // Check for common separators in the title
        const separators = [' - ', ' | ', ' / ', ' : ', ' – '];
        let separatorFound = false;
        let cleanedTitleWithoutSeparator = title.trim();

        separators.forEach(separator => {
            if (cleanedTitleWithoutSeparator.startsWith(separator)) {
                separatorFound = true;
                cleanedTitleWithoutSeparator = cleanedTitleWithoutSeparator.substring(separator.length).trim();
            } else if (cleanedTitleWithoutSeparator.includes(separator)) {
                separatorFound = true;
                cleanedTitleWithoutSeparator = cleanedTitleWithoutSeparator.split(separator)[1].trim();
            }
        });

        // Check if the title contains the cleaned author name
        const titleWithoutAuthor = cleanedTitleWithoutSeparator.replace(new RegExp(cleanedAuthorName, 'i'), '').trim();
        const cleanedAuthorNameInTitle = cleanedTitleWithoutSeparator.startsWith(cleanedAuthorName) ? cleanedAuthorName : '';

        const effectiveAuthorName = cleanedAuthorNameInTitle && cleanedAuthorName !== cleanedAuthorNameInTitle
        ? cleanedAuthorNameInTitle
        : extractAuthorFromTitle(title, separators) || cleanedAuthorName;

        function extractAuthorFromTitle(title, separators) {
            for (const separator of separators) {
                if (title.includes(separator)) {
                    return title.split(separator)[0].trim();
                }
            }
            return null;
        }
        cleanedTitleWithoutSeparator = cleanedTitleWithoutSeparator.replace(/[\(\[\{](?:official|audio|lyrics|visualizer|visualiser|album|offical|officiel)[^\)\]\}]*[\)\]\}]/gi, '').trim();
        // Create elements for cleaned author name and title
        const authorElement = document.createElement('span');
        authorElement.textContent = effectiveAuthorName || '';

        const titleElement = document.createElement('strong');
        titleElement.textContent = separatorFound ? cleanedTitleWithoutSeparator : titleWithoutAuthor;

        // Create a container for the elements
        const container = document.createElement('div');
        container.appendChild(authorElement);
        container.appendChild(document.createElement('br')); // Add a line break
        container.appendChild(titleElement);

        // Create the link element
        const link = document.createElement('a');
        link.href = data.url;
        link.appendChild(container);

        // Create the paragraph element
        const paragraph = document.createElement('p');
        paragraph.style.margin = '0';
        paragraph.appendChild(link);

        // Append the paragraph to the desired container
        document.querySelector('div.text-center').appendChild(paragraph);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
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
