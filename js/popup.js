const urlInput = document.getElementById('url');
const methodSelect = document.getElementById('method');
const bodyInput = document.getElementById('body');
const sendButton = document.getElementById('sendRequest');
const responseDisplay = document.getElementById('response');

sendButton.addEventListener('click', async () => {
  const url = urlInput.value;
  const method = methodSelect.value;
  const body = bodyInput.value ? JSON.parse(bodyInput.value) : null;

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method !== 'GET' ? JSON.stringify(body) : null
    });
    const data = await response.json();
    responseDisplay.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    responseDisplay.textContent = 'Erreur : ' + error.message;
  }
});
