const targetUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=cancer&retmode=json&retmax=5';

async function run() {
  const proxyList = [
    { name: "cors.lol", url: `https://cors.lol/?url=${encodeURIComponent(targetUrl)}` },
    { name: "corsproxy.io", url: `https://corsproxy.io/?${encodeURIComponent(targetUrl)}` }
  ];

  for (const proxy of proxyList) {
    try {
      console.log(`\nTesting ${proxy.name}: ${proxy.url}`);
      const res = await fetch(proxy.url);
      console.log(`[${proxy.name}] Status:`, res.status);
      console.log(`[${proxy.name}] OK:`, res.ok);
      const text = await res.text();
      console.log(`[${proxy.name}] Starts with:`, text.substring(0, 300));
      try {
        const json = JSON.parse(text);
        console.log(`[${proxy.name}] Parsing: SUCCESS!`);
      } catch (e: any) {
        console.log(`[${proxy.name}] Parsing: FAILED (${e.message})`);
      }
    } catch (err: any) {
      console.log(`[${proxy.name}] Error:`, err?.message || err);
    }
  }
}
run();
