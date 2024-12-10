document.addEventListener('DOMContentLoaded', function() {
    // Éléments de l'interface
    const methodSelect = document.getElementById('method');
    const urlInput = document.getElementById('url');
    const addHeaderButton = document.getElementById('add-header');
    const headersContainer = document.getElementById('headers-container');
    const requestBodyTextarea = document.getElementById('request-body');
    const sendRequestButton = document.getElementById('send-request');
    const responseOutput = document.getElementById('response-output');

    // Gestion de la persistance des données
    function saveCurrentState() {
        chrome.storage.local.set({
            lastMethod: methodSelect.value,
            lastUrl: urlInput.value,
            headers: Array.from(document.querySelectorAll('.header-input')).map(input => ({
                key: input.querySelector('.header-key').value,
                value: input.querySelector('.header-value').value
            })),
            requestBody: requestBodyTextarea.value
        });
    }

    // Restauration de l'état précédent
    function restoreState() {
        chrome.storage.local.get([
            'lastMethod', 
            'lastUrl', 
            'headers', 
            'requestBody'
        ], function(result) {
            if (result.lastMethod) methodSelect.value = result.lastMethod;
            if (result.lastUrl) urlInput.value = result.lastUrl;
            if (result.requestBody) requestBodyTextarea.value = result.requestBody;
            
            if (result.headers) {
                // Supprimer les en-têtes existants
                headersContainer.innerHTML = '';
                
                // Ajouter les en-têtes sauvegardés
                result.headers.forEach(header => {
                    addHeaderRow(header.key, header.value);
                });
            }
        });
    }

    // Fonction pour ajouter une ligne d'en-tête
    function addHeaderRow(key = '', value = '') {
        const headerInput = document.createElement('div');
        headerInput.classList.add('header-input');
        headerInput.innerHTML = `
            <input type="text" class="header-key" placeholder="Clé" value="${key}">
            <input type="text" class="header-value" placeholder="Valeur" value="${value}">
            <button class="remove-header">-</button>
        `;
        
        // Gestion de la suppression d'en-tête
        headerInput.querySelector('.remove-header').addEventListener('click', function() {
            headerInput.remove();
            saveCurrentState();
        });
        
        // Ajout des écouteurs d'événements pour sauvegarder l'état
        headerInput.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', saveCurrentState);
        });
        
        headersContainer.appendChild(headerInput);
        return headerInput;
    }

    // Événement pour ajouter un nouvel en-tête
    addHeaderButton.addEventListener('click', () => {
        addHeaderRow();
        saveCurrentState();
    });

    // Écouteurs d'événements pour sauvegarder l'état
    methodSelect.addEventListener('change', saveCurrentState);
    urlInput.addEventListener('input', saveCurrentState);
    requestBodyTextarea.addEventListener('input', saveCurrentState);

    // Restaurer l'état initial
    restoreState();

    // Envoi de la requête API
    sendRequestButton.addEventListener('click', async function() {
        // Réinitialiser la zone de réponse
        responseOutput.textContent = 'Chargement...';
        
        const method = methodSelect.value;
        const url = urlInput.value.trim();
        
        // Validation de l'URL
        if (!url) {
            responseOutput.textContent = 'Erreur : URL manquante';
            return;
        }

        // Collecte des en-têtes
        const headerInputs = document.querySelectorAll('.header-input');
        const headers = {
            'Content-Type': 'application/json'
        };
        headerInputs.forEach(input => {
            const key = input.querySelector('.header-key').value.trim();
            const value = input.querySelector('.header-value').value.trim();
            if (key && value) {
                headers[key] = value;
            }
        });

        // Préparation des options de la requête
        const requestOptions = {
            method: method,
            headers: headers
        };

        // Gestion du corps de la requête pour POST, PUT, PATCH
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            try {
                const body = requestBodyTextarea.value.trim();
                // Corps vide ou JSON valide
                requestOptions.body = body ? JSON.parse(body) : undefined;
            } catch (error) {
                responseOutput.textContent = `Erreur de parsing JSON : ${error.message}`;
                return;
            }
        }

        try {
            // Mesure du temps de requête
            const startTime = performance.now();

            // Envoi de la requête
            const response = await fetch(url, requestOptions);
            
            // Calcul du temps de réponse
            const endTime = performance.now();
            const responseTime = (endTime - startTime).toFixed(2);

            // Gestion du type de contenu de la réponse
            const contentType = response.headers.get('content-type');
            let responseData;

            // Parsing de la réponse
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            // Préparation de la réponse détaillée
            const fullResponse = {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                responseTime: `${responseTime} ms`,
                body: responseData
            };

            // Affichage de la réponse
            responseOutput.textContent = JSON.stringify(fullResponse, null, 2);

            // Envoi d'un message au background script pour journalisation
            chrome.runtime.sendMessage({
                action: 'logRequest', 
                details: {
                    url: url,
                    method: method,
                    headers: headers,
                    status: response.status
                }
            });

        } catch (error) {
            // Gestion des erreurs réseau
            responseOutput.textContent = `Erreur de requête : ${error.message}`;
        }
    });

    // Ajouter une première ligne d'en-tête par défaut
    addHeaderRow('Accept', 'application/json');
});