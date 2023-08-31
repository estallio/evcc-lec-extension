import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../simulators/.env') });

import express from 'express';
import moment from 'moment';

import { InfluxDB } from '@influxdata/influxdb-client';

const queryApi = new InfluxDB({ url: 'http://localhost:8086', token: process.env.INFLUX_TOKEN }).getQueryApi('home');

const app = express();
const port = 3333;

app.use(express.json());

const buildPricesResponse = (prices) => ({
  "object": "list",
  "data": prices,
  "url": "/at/v1/marketdata"
});

app.get('/v1/marketdata', (req, res) => {

  console.log('New price request');

  /*
  const fluxQuery = `
    from(bucket: "sim_1")
    |> range(start: -6h)
    |> filter(fn: (r) => r["_measurement"] == "batteryCapacity" or r["_measurement"] == "pvPower")
    |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
    |> yield(name: "mean")
  `;

  const myQuery = async () => {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const o = tableMeta.toObject(values)
      console.log(
        `${o._time} ${o._measurement} in '${o.location}' (${o.sensor_id}): ${o._field}=${o._value}`
      )
    }
  }

  myQuery();

*/

  const currentHourInSeconds = moment().startOf('hour').unix();
  
  const prices = [];

  for (let i = 0; i < 24; i ++) {
    const currentHourInMilliseconds = (currentHourInSeconds + i * 3600) * 1000;
    prices.push({
      "start_timestamp": currentHourInMilliseconds,
      "end_timestamp": currentHourInMilliseconds + 3600000,
      "marketprice": 107 * Math.random(),
      "unit": "Eur/MWh"
    });
  }

  res.json(buildPricesResponse(prices));
});

app.listen(port, () => {
  console.log(`Fake Pricing Server app listening on port ${port}`)
});