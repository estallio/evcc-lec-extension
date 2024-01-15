import { InfluxDB } from "@influxdata/influxdb-client";
import InfluxWrite from "./influx-write.js";
import moment from "moment/moment.js";

import {
    generateHouseholdsConfig,
} from './simulation-configs.js';

export default class Aggregator {
    constructor(config) {
        let url = config.url;
        let token = config.token;
        let org = config.org;

        const client = new InfluxDB({ url, token });
        this.queryClient = client.getQueryApi(org);
    }

    async getGridPower(startDate, stopDate, numHouseholds) {
        let timeResolution = "1d";
        let fluxQuery = `
        myAggregateT = ${timeResolution}
        myStartT = ${startDate.toISOString()}
        myStopT = ${stopDate.toISOString()}
        `;

        for (let i = 1; i <= numHouseholds; i++) {
            fluxQuery += `
        grid${i} = from(bucket: "sim_${i}")
          |> range(start: myStartT, stop: myStopT)
          |> filter(fn: (r) => r["_measurement"] == "gridPower")
          |> filter(fn: (r) => r["_field"] == "value")
          |> aggregateWindow(every: myAggregateT, fn: mean, createEmpty: false)
          |> keep(columns: ["_time","_value"])
        `;
        }

        fluxQuery += "\n\tunion(tables: [ ";
        for (let i = 1; i <= numHouseholds; i++) {
            fluxQuery += `grid${i}, `;
        }

        fluxQuery += ` ])
          |> group(columns: ["_time"])
          |> sum()
          |> group()`;

        let results = [];

        await this.queryClient.queryRows(fluxQuery, {
            next: (row, tableMeta) => {
                const tableObject = tableMeta.toObject(row);
                results.push(tableObject._value);
                //console.log(tableObject._value);
            },
            error: (error) => {
                console.error("\nError", error);
            },
            complete: () => {
                console.log("\nSuccess");
            },
        });


    }
}



const householdsConfig = generateHouseholdsConfig();


for (const householdConfig of householdsConfig) {
    const household = {};
    household.influx = new InfluxWrite(householdConfig.influx);
    household.aggregator = new Aggregator(householdConfig.influx);
    let res = household.aggregator.getGridPower(
        moment("2012-11-30T00:00:00+01:00"),
        moment("2012-12-30T00:00:00+01:00"),
        3
    );
    break;
}
