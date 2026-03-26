const API_URL = 'https://script.google.com/macros/s/AKfycbwCYCuE1FLyvRygzBesUf-Y7PU5JpXTS3l8SkpOP3qZjnCA_ay8ela-RXo8mSZ9Jwd6Jg/exec';

async function apiPost(data) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return res.json();
}
