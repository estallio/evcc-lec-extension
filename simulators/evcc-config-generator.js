import yaml from 'js-yaml';
import config from './simulation-configs.js';
import fs from 'fs';


const {households: householdsConfig} = config;

for (const household of householdsConfig) {
    const evccConfig = {};

    evccConfig.log = "debug"
    evccConfig.interval = "1s"

    evccConfig.site = {
        title: household.name, meters: {
            grid: "smartMeter", pv: "pv1", battery: "battery1"
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
            name: "smartMeter",
            type: "custom",
            power: {
                source: "http",
                uri: `http://localhost:${household.smartMeter.port}/residualPower`,
                method: "GET",
                headers: {
                    'content-type': "application/json"
                },
                scale: 1000, //We return kW
                timeout: "10s"
            }
        },
        {
            name: "meter1",
            type: "custom",
            power: {
                source: "http",
                uri: `http://localhost:${household.consumptions[0].port}/meter/currentconsumption`,
                method: "GET",
                headers: {
                    'content-type': "application/json"
                },
                scale: 1000, //We return kW
                timeout: "10s"
            }
        },
            {
                name: "pv1",
                type: "custom",
                power: {
                    source: "http",
                    uri: `http://localhost:${household.pvs[0].port}/pv/currentproduction`,
                    method: "GET",
                    headers: {
                        'content-type': "application/json"
                    },
                    timeout: "10s",
                    scale: 1000, //We return kW
                }
            },
            {
                name: "wallbox1",
                type: "custom",
                power: {
                    source: "http",
                    uri: `http://localhost:${household.wallboxes[0].port}/meter/currentpower`,
                    method: "GET",
                    headers: {
                        'content-type': "application/json"
                    },
                    timeout: "10s",
                    scale: 1000, //We return kW
                }
            },
            {
                name: "battery1",
                type: "custom",
                power: {
                    source: "http",
                    uri: `http://localhost:${household.batteries[0].port}/battery/currentpower`,
                    method: "GET",
                    headers: {
                        'content-type': "application/json"
                    },
                    scale: 1000, //We return kW
                    timeout: "10s"
                },
                soc: {
                    source: "http",
                    uri: `http://localhost:${household.batteries[0].port}/battery/soc`,
                    method: "GET",
                    headers: {
                        'content-type': "application/json"
                    },
                    scale: 100, //We return a value from 0 to 1
                    timeout: "10s"
                },
                energy: {
                    source: "http",
                    uri: `http://localhost:${household.batteries[0].port}/battery/energy`,
                    method: "GET",
                    headers: {
                        'content-type': "application/json"
                    },
                    timeout: "10s"
                },
                capacity: household.evs[0].batterySizeInKWh,

            }
        ]

    evccConfig.vehicles = [{
        name: "vehicle1",
        title: "Vehicle 1",
        type: "custom",
        capacity: household.batteries[0].batterySizeInKWh,
        soc: {
            source: "http",
            uri: `http://localhost:${household.evs[0].port}/vehicle/soc`,
            method: "GET",
            headers: {
                'content-type': "application/json"
            },
            scale: 100, //We return a value from 0 to 1
            timeout: "10s"
        },
        status: {
            source: "http",
            uri: `http://localhost:${household.evs[0].port}/vehicle/status`,
            method: "GET",
            headers: {
                'content-type': "application/json"
            },
            timeout: "10s"
        },
        range: {
            source: "http",
            uri: `http://localhost:${household.evs[0].port}/vehicle/range`,
            method: "GET",
            headers: {
                'content-type': "application/json"
            },
            timeout: "10s"
        }
    }]

    evccConfig.chargers = [{
        name: "charger1",
        type: "custom",
        status: {
            source: "http",
            uri: `http://localhost:${household.wallboxes[0].port}/charger/status`,
            method: "GET",
            headers: {
                'content-type': "application/json"
            },
            timeout: "10s"
        },
        enabled: {
            source: "http",
            uri: `http://localhost:${household.wallboxes[0].port}/charger/enabled`,
            method: "GET",
            headers: {
                'content-type': "application/json"
            },
            timeout: "10s"
        },
        enable: {
            source: "http",
            uri: `http://localhost:${household.wallboxes[0].port}/charger/enable`,
            method: "POST",
            headers: {
                'content-type': 'text/plain'
            },
            timeout: "10s"
        },
        maxcurrent: {
            source: "http",
            uri: `http://localhost:${household.wallboxes[0].port}/charger/maxcurrent`,
            method: "POST",
            headers: {
                'content-type': 'text/plain'
            },
            timeout: "10s"
        },
    }]

    evccConfig.network = {
        port: household.port, schema: "http"
    }

    evccConfig.loadpoints = [{
        title: "Garage",
        charger: "charger1",
        vehicle: "vehicle1",
        meter: "wallbox1",
        mode: "off"
    }]

    evccConfig.tariffs = {
        currency: "EUR",
        grid: {
            type: "fixed", price: 0.35
        }
    }

    let s = yaml.dump(evccConfig)
    fs.writeFile(`evcc-configs/evcc-${household.name.replace(" ", "-")}.yml`, s, (err) => {
        if (err) throw err
    })

    console.log(s)
}
