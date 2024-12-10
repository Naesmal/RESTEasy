document.addEventListener('DOMContentLoaded', function() {
    const methodSelect = document.getElementById('method');
    const urlInput = document.getElementById('url');
    const addHeaderButton = document.getElementById('add-header');
    const headersContainer = document.getElementById('headers-container');
    const requestBodyTextarea = document.getElementById('request-body');
    const sendRequestButton = document.getElementById('send-request');
    const responseOutput = document.getElementById('response-output');

    // Fonction pour colorer le JSON
    function syntaxHighlight(json) {
        if (typeof json != 'string') {
            json = JSON.stringify(json, undefined, 2);
        }
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g, function(match) {
            let cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

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
                headersContainer.innerHTML = '';
                result.headers.forEach(header => {
                    addHeaderRow(header.key, header.value);
                });
            }
        });
    }

    addHeaderButton.addEventListener('click', () => {
        addHeaderRow();
        saveCurrentState();
    });

    methodSelect.addEventListener('change', saveCurrentState);
    urlInput.addEventListener('input', saveCurrentState);
    requestBodyTextarea.addEventListener('input', saveCurrentState);

    restoreState();

    sendRequestButton.addEventListener('click', async function() {
        responseOutput.innerHTML = '<p>Chargement...</p>';
        
        const method = methodSelect.value;
        const url = urlInput.value.trim();
        
        if (!url) {
            responseOutput.innerHTML = '<p style="color: red;">Erreur : URL manquante</p>';
            return;
        }

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

        const requestOptions = {
            method: method,
            headers: headers,
            mode: 'cors'
        };

        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            try {
                const body = requestBodyTextarea.value.trim();
                requestOptions.body = body ? JSON.parse(body) : undefined;
            } catch (error) {
                responseOutput.innerHTML = `<p style="color: red;">Erreur de parsing JSON : ${error.message}</p>`;
                return;
            }
        }

        try {
            const startTime = performance.now();
            const response = await fetch(url, requestOptions);
            const endTime = performance.now();
            const responseTime = (endTime - startTime).toFixed(2);

            const contentType = response.headers.get('content-type');
            let responseData;

            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
                responseOutput.innerHTML = `<pre>${syntaxHighlight(responseData)}</pre>`;
            } else {
                responseData = await response.text();
                responseOutput.textContent = responseData;
            }

        } catch (error) {
            responseOutput.innerHTML = `<p style="color: red;">Erreur de requête : ${error.message}</p>`;
        }
    });

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
        pre {
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        /* Styles pour le thème clair */
        pre {
            background-color: #f4f4f4;
            color: #333;
        }
        .string { color: #008000; }
        .number { color: #ff8c00; }
        .boolean { color: #0000ff; }
        .null { color: #ff00ff; }
        .key { color: #ff0000; }
        
        /* Styles pour le thème sombre */
        @media (prefers-color-scheme: dark) {
            pre {
                background-color: #2d3748;
                color: #e2e8f0;
            }
            .string { color: #90ee90; }
            .number { color: #ffa07a; }
            .boolean { color: #87cefa; }
            .null { color: #ff69b4; }
            .key { color: #ff6b6b; }
        }
        
        /* Support explicite du mode sombre via classe CSS */
        .dark pre {
            background-color: #2d3748;
            color: #e2e8f0;
        }
        .dark .string { color: #90ee90; }
        .dark .number { color: #ffa07a; }
        .dark .string { color: #90ee90; }
        .dark .boolean { color: #87cefa; }
        .dark .null { color: #ff69b4; }
        .dark .key { color: #ff6b6b; }
    `;
    document.head.appendChild(style);

    addHeaderRow('Accept', 'application/json');
});