// Background script pour gérer des fonctionnalités de l'extension en arrière-plan

// Exemple de listener pour des événements de l'extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension Simple API Tester installée');
  
  // Vous pouvez ajouter des configurations initiales ici
  chrome.storage.local.set({
    defaultHeaders: {
      'Accept': 'application/json'
    }
  });
});

// Exemple de communication entre les différentes parties de l'extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Exemple de gestionnaire de messages
  if (request.action === 'logRequest') {
    console.log('Requête API journalisée:', request.details);
    
    // Optionnel : Stocker l'historique des requêtes
    chrome.storage.local.get(['requestHistory'], (result) => {
      const history = result.requestHistory || [];
      history.push({
        url: request.details.url,
        method: request.details.method,
        timestamp: Date.now()
      });
      
      // Limiter l'historique aux 10 dernières requêtes
      const limitedHistory = history.slice(-10);
      
      chrome.storage.local.set({ requestHistory: limitedHistory });
    });
    
    sendResponse({ status: 'Requête journalisée' });
  }
  
  return true; // Permet des réponses asynchrones
});