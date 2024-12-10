document.addEventListener('DOMContentLoaded', function() {
    const methodSelect = document.getElementById('method');
    const urlInput = document.getElementById('url');
    const addHeaderButton = document.getElementById('add-header');
    const headersContainer = document.getElementById('headers-container');
    const requestBodyTextarea = document.getElementById('request-body');
    const sendRequestButton = document.getElementById('send-request');
    const responseOutput = document.getElementById('response-output');

    function addHeaderRow(key = '', value = '') {
        const headerInput = document.createElement('div');
        headerInput.className = 'header-input mb-2 flex items-center gap-3 bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600';
        headerInput.innerHTML = `
            <div class="flex-1">
                <input type="text" 
                    class="header-key w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    placeholder="Clé" 
                    value="${key}">
            </div>
            <div class="flex-1">
                <input type="text" 
                    class="header-value w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    placeholder="Valeur" 
                    value="${value}">
            </div>
            <button class="remove-header flex items-center justify-center w-8 h-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900 text-red-500 hover:text-red-700 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;
        
        headerInput.querySelector('.remove-header').addEventListener('click', function() {
            headerInput.classList.add('fade-out');
            setTimeout(() => {
                headerInput.remove();
                saveCurrentState();
            }, 200);
        });
        
        headerInput.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', saveCurrentState);
        });
        
        // Animation d'entrée
        headerInput.style.opacity = '0';
        headerInput.style.transform = 'translateY(-10px)';
        headersContainer.appendChild(headerInput);
        
        // Forcer le reflow
        headerInput.offsetHeight;
        
        // Appliquer la transition
        headerInput.style.transition = 'all 0.2s ease-out';
        headerInput.style.opacity = '1';
        headerInput.style.transform = 'translateY(0)';
        
        return headerInput;
    }
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
            headers: headers,
            mode: 'cors' 
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

        // Ajouter du CSS pour l'animation
        const style = document.createElement('style');
        style.textContent = `
            .header-input {
                transition: all 0.2s ease-out;
            }
            .fade-out {
                opacity: 0;
                transform: translateY(-10px);
            }
            .header-input:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            .remove-header:focus {
                outline: none;
                ring: 2px;
                ring-offset: 2px;
                ring-red-500;
            }
        `;
        document.head.appendChild(style);

    // Ajouter une première ligne d'en-tête par défaut
    addHeaderRow('Accept', 'application/json');
});