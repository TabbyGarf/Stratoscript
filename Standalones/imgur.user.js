// ==UserScript==
// @name         Stratoscript Standalone - Imgur
// @version      1
// @description  Permet d'integrer l'upload Imgur
// @author       StayNoided/TabbyGarf
// @match        https://avenoel.org/*
// @icon         https://i.imgur.com/ZJqz0x7.png
// @run-at       document-body
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';
    function uploadToImgur(fileOrUrl, event) {
        // Replace 'YOUR_CLIENT_ID' with your Imgur API client ID
        const clientId = 'eb3fa83064638bb';

        const formData = new FormData();

        if (typeof fileOrUrl === 'string') {
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
        imgurDropzone.style.display = 'none'; // Initially hide imgur-dropzone
        imgurDropzone.innerHTML = 'Deposez une image ici <u>ou cliquez ici</u> (imgur)';

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
        imgurLogo.src = 'https://i.imgur.com/ZJqz0x7.png';
        imgurLogo.className = 'imgur-logo';

        // Append Imgur logo to the toggle button
        toggleButton.appendChild(imgurLogo);

        // Add event listener to toggle button
        toggleButton.addEventListener('click', function() {
            toggleDropzone('imgur-dropzone', this);
            hideDropzone('aveshack-dropzone', this);
            hideDropzone('noelshack-dropzone',this);
        });

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

        // Append the toggleButton after aveshackButton inside the formGroup
        if (aveshackButton && aveshackButton.parentNode) {
            aveshackButton.parentNode.insertBefore(toggleButton, aveshackButton.nextSibling);
        }
    });
}
    // Initialisation après chargement complet
    window.onload = function () {
        setTimeout( function () {
                addImgurButton();
        }, 100 );
    };
})();
