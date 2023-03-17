const express = require('express');
const https = require('https');

const app = express();

app.get('/loader.js', (req, res) => {
  https.get('https://www.gstatic.com/charts/loader.js', (response) => {
    res.set('Access-Control-Allow-Origin', '*');
    response.pipe(res);
  });
});

app.listen(3000, () => {
  console.log('Proxy server listening on port 3000');
});