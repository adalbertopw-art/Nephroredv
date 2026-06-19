const https = require("https");
const url = "https://api.mymemory.translated.net/get?q=Kidney%20disease&langpair=es|en";
https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
});
