async function apiGet(action) {
  const res = await fetch(API_URL + '?action=' + action);
  return res.json();
}

async function apiPost(data) {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return res.json();
}
