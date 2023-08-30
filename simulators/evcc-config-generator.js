import yaml from 'js-yaml';
import config from './simulation-configs.js';


const {households: householdsConfig} = config;

for (const household of householdsConfig) {
  const evccConfig = {};

  evccConfig.site = {
    title: household.name, meters: {
      grid: "meter1", pv: "pv1", battery: "battery1"
    }
  }

  //Influx rename bucket -> database
  let influx = household.influx
  influx.database = influx.bucket
  delete influx.bucket
  evccConfig.influx = influx

  // custom meter
  evccConfig.meters =
    [{
      name: "meter1",
      type: "custom",
      power: {
        source: `http://localhost:${household.consumptions[0].port}`,
        uri: "url",
        method: "GET",
        headers: {
          'content-type': "application/json"
        },
        timeout: "10s"
      }
    },
      {
        name: "pv1",
        type: "custom",
        power: {
          source: "http",
          uri: `http://localhost:${household.pvs[0].port}`,
          method: "GET",
          headers: {
            'content-type': "application/json"
          },
          timeout: "10s"
        }
      },
      {
        name: "wallbox1",
        type: "custom",
        power: {
          source: `http://localhost:${household.wallboxes[0].port}`,
          uri: "url",
          method: "GET",
          headers: {
            'content-type': "application/json"
          },
          timeout: "10s"
        }
      },
      {
        name: "battery1",
        type: "custom",
        power: {
          source: `http://localhost:${household.batteries[0].port}`,
          uri: "url",
          method: "GET",
          headers: {
            'content-type': "application/json"
          },
          timeout: "10s"
        }
      }
    ]

  evccConfig.vehicle = {
    name: "vehicle1",
    title: "Vehicle 1",
    type: "custom",
    power: {
      source: "http",
      uri: "url",
      method: "GET",
      headers: {
        'content-type': "application/json"
      },
      timeout: "10s"
    }
  }

  evccConfig.charger = {
    name: "charger1",
    type: "custom",
    power: {
      source: "http",
      uri: "http://localhost",
      method: "GET",
      headers: {
        'content-type': "application/json"
      },
      timeout: "10s"
    }
  }

  evccConfig.network = {
    port: household.port, schema: "http"
  }

  evccConfig.loadpoints = {
    title: "Garage",
    charger: "charger1",
    vehicle: "vehicle1",
    meter: "wallbox1"
  }

  evccConfig.tariffs = {
    currency: "EUR", grid: {
      type: "fixed", price: 0.35
    }
  }

  let s = yaml.dump(evccConfig)
  console.log(s)
}
