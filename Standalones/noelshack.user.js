// ==UserScript==
// @name         Stratoscript Standalone - Noelshack
// @version      1
// @description  Permet d'integrer l'upload Noelshack
// @author       StayNoided/TabbyGarf
// @match        https://avenoel.org/*
// @icon         https://i.imgur.com/Ui76AcN.png
// @run-at       document-body
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';
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
                    alert('Noelshack upload failed. Please try again.');
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
        noelshackDropzone.innerHTML = 'Deposez une image ici <u>ou cliquez ici';

        // Create file input for click handling
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
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
        noelshackLogo.src = 'https://i.imgur.com/Ui76AcN.png'; // Replace with the actual path to the Noelshack logo
        noelshackLogo.className = 'noelshack-logo';

        // Append Noelshack logo to the toggle button
        toggleButton.appendChild(noelshackLogo);

        // Add event listener to toggle button
        toggleButton.addEventListener('click', function() {
            toggleDropzone('noelshack-dropzone', this);
            hideDropzone('aveshack-dropzone', this);
            hideDropzone('imgur-dropzone', this);
        });
        // Get the existing aveshack button
        const aveshackButton = parentContainer.querySelector('button[data-type="aveshack"]');
        // Append the toggleButton after aveshackButton inside the formGroup
        if (aveshackButton && aveshackButton.parentNode) {
            aveshackButton.parentNode.insertBefore(toggleButton, aveshackButton.nextSibling);
        }
        const imgurButton = parentContainer.querySelector('button[data-type="imgur"]');
        if (imgurButton == false){
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
                hideDropzone('imgur-dropzone', this);
                hideDropzone('noelshack-dropzone', this);
            });
        }

}
    });
}
    // Initialisation après chargement complet
    window.onload = function () {
        setTimeout( function () {
                addNoelshackButton();
        }, 100 );
    };
})();
