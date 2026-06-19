const https = require("https");
const url = "https://api.mymemory.translated.net/get?q=Enfermedad%20renal&langpair=es|en";
https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
});
