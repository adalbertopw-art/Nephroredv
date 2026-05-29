import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const check = async () => {
    const res = await fetch(`${url}/rest/v1/profiles?select=*`, { headers: { apikey: key } });
    console.log(res.status);
}

await check();
