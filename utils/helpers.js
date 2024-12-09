export function formatJSON(json) {
    return JSON.stringify(json, null, 2);
  }
  
  export function handleError(error) {
    console.error('Erreur :', error);
  }
  