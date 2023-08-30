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
                    uri: `http://localhost:${household.pvs[0].port}`,
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
                    uri: `http://localhost:${household.wallboxes[0].port}`,
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
                    uri: `http://localhost:${household.batteries[0].port}`,
                    method: "GET",
                    headers: {
                        'content-type': "application/json"
                    },
                    scale: 1000, //We return kW
                    timeout: "10s"
                },
                soc: {
                    source: "http",
                    uri: `http://localhost:${household.batteries[0].port}`,
                    method: "GET",
                    headers: {
                        'content-type': "application/json"
                    },
                    scale: 100, //We return a value from 0 to 1
                    timeout: "10s"
                },
                energy: {
                    source: "http",
                    uri: `http://localhost:${household.batteries[0].port}`,
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
            uri: `http://localhost:${household.evs[0].port}`,
            method: "GET",
            headers: {
                'content-type': "application/json"
            },
            scale: 100, //We return a value from 0 to 1
            timeout: "10s"
        },
        status: {
            source: "http",
            uri: `http://localhost:${household.evs[0].port}`,
            method: "GET",
            headers: {
                'content-type': "application/json"
            },
            timeout: "10s"
        },
        range: {
            source: "http",
            uri: `http://localhost:${household.evs[0].port}`,
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
            uri: `http://localhost:${household.wallboxes[0].port}`,
            method: "GET",
            headers: {
                'content-type': "application/json"
            },
            timeout: "10s"
        },
        enabled: {
            source: "http",
            uri: `http://localhost:${household.wallboxes[0].port}`,
            method: "GET",
            headers: {
                'content-type': "application/json"
            },
            timeout: "10s"
        },
        enable: {
            source: "http",
            uri: `http://localhost:${household.wallboxes[0].port}`,
            method: "GET",
            headers: {
                'content-type': "application/json"
            },
            timeout: "10s"
        },
        maxcurrent: {
            source: "http",
            uri: `http://localhost:${household.wallboxes[0].port}`,
            method: "POST",
            headers: {
                'content-type': "application/json"
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
        meter: "wallbox1"
    }]

    evccConfig.tariffs = {
        currency: "EUR",
        grid: {
            type: "fixed", price: 0.35
        }
    }

    let s = yaml.dump(evccConfig)
    console.log(s)
}
