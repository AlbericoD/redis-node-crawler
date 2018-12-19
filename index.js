const redis = require("redis");
const https = require("https");
const { port, host } = { port: 6379, host: "localhost" };
const { createClient, print } = redis;
const client = createClient(port, host);
const LOG = console.log;
const corretoras = [
  {
    nome: "mercado:bitCoin:0",
    api: "https://www.mercadobitcoin.net/api/BTC/orderbook/"
  },
  {
    nome: "mercado:bitCoin:1",
    api: "https://www.mercadobitcoin.net/api/BTC/orderbook/"
  },
  {
    nome: "mercado:bitCoin:2",
    api: "https://www.mercadobitcoin.net/api/BTC/orderbook/"
  }
];
const formatError = err => {
  if (err) throw err;
  print(err);
};
const get = arg => client.hget(arg, (formatError, print));
const keys = arg => client.keys(arg, (formatError, print));
const checkApi = arg =>
  new Promise((resolve, reject) => {
    https
      .get(arg, {}, resp => {
        let data = "";
        resp.on("data", chunk => (data += chunk));
        resp.on("end", () => resolve(JSON.parse(data)));
      })
      .on("error", err => reject(err.message));
  });

const updateDB = args =>
  new Promise((resolve, reject) => {
    const { key, field, data } = args;
    resolve(`${key} ${field} `);
    client.hset(key, field, JSON.stringify(data), (error, hashNumber) => {
      if (error) reject(error); // deve parar e ir para uma lista de nova tentativa
      resolve(hashNumber);
    });
  });

(async () => {
  client.on("connect", () =>
    LOG(`Redis client connected on Port: ${port} | Host: ${host}`)
  );
  client.on("error", err => LOG(`Something went wrong ${err}`));
  const responseApi = [];
  corretoras.map(async corretora => {
    try {
      const apiData = await checkApi(corretora.api);
      let { asks, bids } = apiData;
      let hash = `${corretora.nome}:${Date.now()}`;
      const resultAsks = await updateDB({
        key: hash,
        field: "asks",
        data: asks
      });
      const resultBids = await updateDB({
        key: hash,
        field: "bids",
        data: bids
      });
      LOG(`Updated success ${resultAsks}, ${resultBids}`);
      /**
       * EXEMPLOS DE COMO CONSULTAR POR HASH E COMO OS DADOS RETORNA.
       * DADOS SÃO SALVO NA CONVENÇAO => HASH | NOME:DATA | TIPO_DO_CAMPO | DATA
       * @param  hash nome da chave principal 
       * @returns Array [['asks','bids']]
       * */

      client.hgetall(hash, (err, result) => {
        if (err) LOG(err);
        responseApi.push({[hash]: result});
        LOG(responseApi);
      });
    } catch (error) {
      LOG(error);
    }
  });
})();


//client test
// client.set("teste:01", "value", print);

// get("teste:01");
// keys("*");
