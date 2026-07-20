import fs from 'node:fs/promises';
import path from 'node:path';

const output = path.join(process.cwd(), 'data', 'markets.json');
const timeoutFetch = async url => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {signal: controller.signal, headers: {'user-agent': 'NewsHubMarket/1.0'}});
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return response;
  } finally { clearTimeout(timer); }
};

const pct = (current, previous) => previous ? ((current - previous) / previous) * 100 : null;
const fredSeries = [
  {id:'NASDAQCOM', name:'纳斯达克综合指数', unit:'index'},
  {id:'DTWEXBGS', name:'美元广义指数', unit:'index'},
  {id:'DCOILWTICO', name:'WTI 原油', unit:'USD'},
  {id:'GOLDAMGBD228NLBM', name:'黄金', unit:'USD/oz'}
];

async function fetchFred(series) {
  const response = await timeoutFetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${series.id}`);
  const rows = (await response.text()).trim().split(/\r?\n/).slice(1)
    .map(line => line.split(',')).filter(row => row[1] && row[1] !== '.');
  const latest = rows.at(-1), previous = rows.at(-2);
  if (!latest || !previous) throw new Error(`No FRED data for ${series.id}`);
  const value = Number(latest[1]), prev = Number(previous[1]);
  return {...series, value, changePercent:pct(value, prev), asOf:latest[0], source:'FRED'};
}

async function fetchCrypto() {
  const url='https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true';
  const data = await (await timeoutFetch(url)).json();
  return [
    {id:'BTCUSD',name:'Bitcoin',symbol:'BTC',unit:'USD',value:data.bitcoin.usd,changePercent:data.bitcoin.usd_24h_change,asOf:new Date(data.bitcoin.last_updated_at*1000).toISOString(),source:'CoinGecko'},
    {id:'ETHUSD',name:'Ethereum',symbol:'ETH',unit:'USD',value:data.ethereum.usd,changePercent:data.ethereum.usd_24h_change,asOf:new Date(data.ethereum.last_updated_at*1000).toISOString(),source:'CoinGecko'}
  ];
}

const results = await Promise.allSettled([...fredSeries.map(fetchFred), fetchCrypto()]);
let markets = results.flatMap(result => result.status === 'fulfilled' ? (Array.isArray(result.value) ? result.value : [result.value]) : []);
if (markets.length < 2) {
  try {
    const old = JSON.parse(await fs.readFile(output, 'utf8'));
    if (old.markets?.length) markets = old.markets;
  } catch {}
}
await fs.mkdir(path.dirname(output), {recursive:true});
await fs.writeFile(output, JSON.stringify({
  updatedAt:new Date().toISOString(),
  failedCount:results.filter(result => result.status === 'rejected').length,
  markets
}, null, 2)+'\n');
console.log(`Wrote ${markets.length} market quotes`);
