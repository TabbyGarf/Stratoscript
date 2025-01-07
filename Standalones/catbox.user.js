// ==UserScript==
// @name         Stratoscript Standalone - Catbox
// @version      1
// @description  Permet d'integrer l'upload Catbox et transforme les uploads catbox en media respectifs
// @author       StayNoided/TabbyGarf
// @match        https://avenoel.org/*
// @icon         https://tabbygarf.club/files/themes/stratoscript/catbox.png
// @run-at       document-body
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';
    const litter = false; // METTRE FALSE POUR UTILISER CATBOX ET TRUE POUR LITTERBOX

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
            else if (isCatboxLink(href) && /\.(mp3|wav|ogg|aac|flac)$/i.test(href)) {

                let url_media = /(https:\/\/(.+)(\.mp4|\.webm|\.mov|\.mkv|\.mp3|\.wav|\.ogg|\.aac|\.flac))/.exec(href)[1];
                const media = document.createElement("audio");
                media.setAttribute("controls", "");

                media.setAttribute("src", url_media + "#t=0.1");
                media.setAttribute("preload", "metadata");

                // Replace the original <a class="link"> with the new <img> element
                linkElement.parentNode.replaceChild(media, linkElement);

            }
            else if (isCatboxLink(href)) {
                // Create the new <img> element
                let url_media = /(https:\/\/(.+)(\.mp4|\.webm|\.mov|\.mkv|\.mp3|\.wav|\.ogg|\.aac|\.flac))/.exec(href)[1];
                const media = document.createElement("video");
                media.setAttribute("controls", "");
                media.setAttribute("width", "380");
                media.setAttribute("height", "214");
                media.setAttribute("style", "background-color: black");

                media.setAttribute("src", url_media + "#t=0.1");
                media.setAttribute("preload", "metadata");


                // Replace the original <a class="link"> with the new <img> element
                linkElement.parentNode.replaceChild(media, linkElement);

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

    function findClosestTextarea(element) {
        // Traverse up the DOM until a textarea within the same textarea-container is found
        while (element && !element.querySelector('.form-group textarea')) {
            element = element.parentNode;
        }

        // Return the textarea element if found, otherwise null
        return element ? element.querySelector('.form-group textarea') : null;
    }


  // Function to handle file drop or URL input
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


    // Function to handle dragover and dragenter events
    function handleDragOverEnter(event) {
        event.preventDefault();
    }

    // Function to handle file selection via click
    function handleFileInputC(event) {
        const fileInput = event.target;
        const file = fileInput.files[0];
        if (file) {
            uploadToCatbox(file, event, litter);
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
    // Function to add Noelshack button and dropzone
function addCatboxButton() {
        const formGroups = document.querySelectorAll('.bbcodes');


    formGroups.forEach(formGroup => {
        // Get the parent container of formGroup
        const parentContainer = formGroup.parentNode;

        const catboxDropzone = document.createElement('div');
        catboxDropzone.className = 'catbox-dropzone';
        catboxDropzone.style.outlineOffset = '-10px';
        if (litter==false){
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
        if (litter==false){
        catboxDropzone.innerHTML = 'Deposez une image ici <u>ou cliquez ici</u> (Catbox)<br><sub>Poids max. : 200Mo</sub>';
        } else{
        catboxDropzone.innerHTML = 'Deposez une image temporairement ici <u>ou cliquez ici</u> (Litterbox)<br><sub>Poids max. : 1Go, Durée de vie: 72h</sub>';
        }
        if (litter==false){
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
        if (litter==false){
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
    // Initialisation après chargement complet
    window.onload = function () {
        setTimeout( function () {
                addCatboxButton();
        }, 100 );
        transformCatboxLinks('div.form-group.preview p-4.text-black a.link');
        transformCatboxLinks('.message-content a.link');
    };
})();
