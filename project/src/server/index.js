require('dotenv').config();

const express = require('express');
const { urlencoded, json } = require('body-parser');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const port = 3000;
const { API_KEY } = process.env;

app.use(urlencoded({ extended: false }));
app.use(json());
app.use('/', express.static(path.join(__dirname, '../public')));


function getUrlWithApiKey(url) {
    return `${url}${url.includes('?') ? '&' : '?'}api_key=${API_KEY}`;
}

async function fetchPhotosForRover(req, res) {
    const rover = req.url.slice(1);

    try {
        let fetchRes = await fetch(getUrlWithApiKey(`https://api.nasa.gov/mars-photos/api/v1/manifests/${rover}`));
        let data = await fetchRes.json();

        if (data && data.photo_manifest && data.photo_manifest.max_date) {
            const date = data.photo_manifest.max_date;

            fetchRes = await fetch(getUrlWithApiKey(`https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/photos?earth_date=${date}`));
            data = await fetchRes.json();

            if (data && data.photos) {
                res.send(data);
                return;
            }
        }

        throw Error('Resource responded with invalid data');
    } catch (error) {
        console.error(error);
        res.send({ error: '500 Internal Server Error' });
    }
}

// API calls
[
    'curiosity',
    'opportunity',
    'spirit'
]
.forEach((path) => app.get(`/${path}`, fetchPhotosForRover));

app.listen(
    port,
    () => console.log(`Server running on http://localhost:${port}`)
);
