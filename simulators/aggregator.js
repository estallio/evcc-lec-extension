import { InfluxDB } from "@influxdata/influxdb-client";
import InfluxWrite from "./influx-write.js";
import moment from "moment/moment.js";

import { generateHouseholdsConfig } from "./simulation-configs.js";

function nominate(result_arr) {
    let results_cleaned = [];

    for (const v of result_arr) {
        results_cleaned.push(Math.round(v));
    }
    let min_element = Math.abs(Math.min(...results_cleaned));

    let result_positive = [];
    for (const v of results_cleaned) {
        result_positive.push(v + min_element);
    }
    let max_element = Math.max(...result_positive);

    let result_nominated = [];
    for (const v of result_positive) {
        result_nominated.push(Math.round((v / max_element) * 100));
    }

    //console.log(results_cleaned);
    //console.log(result_positive);
    console.log(result_nominated);
}

export default class Aggregator {
    constructor(config) {
        let url = config.url;
        let token = config.token;
        let org = config.org;

        const client = new InfluxDB({ url, token });
        this.queryClient = client.getQueryApi(org);
    }

    async getGridPower(startDate, stopDate, numHouseholds) {
        let timeResolution = "15m";
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

        let results = {};
        let result_arr = [];

        await this.queryClient.queryRows(fluxQuery, {
            next: (row, tableMeta) => {
                const tableObject = tableMeta.toObject(row);
                results[tableObject._time] = tableObject._value;
                result_arr.push(tableObject._value);
                //console.log(tableObject._value);
            },
            error: (error) => {
                console.error("\nError", error);
            },
            complete: () => {
                //console.log("\nSuccess");
                //console.dir(results);
                //console.dir(result_arr);
                console.log(startDate.toDate());
                nominate(result_arr);


            }
        });


    }
}


const householdsConfig = generateHouseholdsConfig();

let start = moment("2012-11-30T00:00:00+01:00");
let stop = moment("2012-12-30T00:00:00+01:00");

while (start.isBefore(stop)) {
    //console.log(start.toDate());
    for (const householdConfig of householdsConfig) {
        const household = {};
        household.influx = new InfluxWrite(householdConfig.influx);
        household.aggregator = new Aggregator(householdConfig.influx);
        let res = household.aggregator.getGridPower(
            start,
            stop,
            3
        );
        break;
    }
    start.add(1, "d");

}



