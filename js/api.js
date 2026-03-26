const API_URL = 'https://script.google.com/macros/s/AKfycbwCYCuE1FLyvRygzBesUf-Y7PU5JpXTS3l8SkpOP3qZjnCA_ay8ela-RXo8mSZ9Jwd6Jg/exec';

async function apiPost(data) {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(data)   // 只送 body，不送 header
  });
  return res.json();
}

