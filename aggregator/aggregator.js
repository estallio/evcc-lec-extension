import express from 'express';
import moment from 'moment';

const app = express();
const port = 3333;

app.use(express.json());

const buildPricesResponse = (prices) => ({
  "object": "list",
  "data": prices,
  "url": "/at/v1/marketdata"
});

app.get('/v1/marketdata', (req, res) => {
  const currentHourInSeconds = moment().startOf('hour').unix();
  
  const prices = [];

  for (let i = 0; i < 24; i ++) {
    const currentHourInMilliseconds = (currentHourInSeconds + i * 3600) * 1000;
    prices.push({
      "start_timestamp": currentHourInMilliseconds,
      "end_timestamp": currentHourInMilliseconds + 3600000,
      "marketprice": 107,
      "unit": "Eur/MWh"
    });
  }

  res.json(buildPricesResponse(prices));
});

app.listen(port, () => {
  console.log(`Fake Pricing Server app listening on port ${port}`)
});