import { InfluxDB } from "@influxdata/influxdb-client";
import express from "express";
import dotenv from "dotenv";
import moment from "moment";

dotenv.config();

function awattarDataObject(startTime, endTime, price) {
    return {
        start_timestamp: startTime.unix() * 1000,
        end_timestamp: endTime.unix() * 1000,
        marketprice: price,
        unit: "Eur/MWh",
    };
}

function createTariffObject(result_arr, startDate) {
    let results_cleaned = [];

    for (const v of result_arr) {
        results_cleaned.push(Math.round(v));
    }
    let min_element = Math.abs(Math.min(...results_cleaned));

    let results_positive = [];
    for (const v of results_cleaned) {
        results_positive.push(v + min_element);
    }
    let max_element = Math.max(...results_positive);

    let results_nominated = [];
    for (const v of results_positive) {
        results_nominated.push(Math.round((v / max_element) * 100));
    }

    let startDateTemp = startDate.clone();
    let endDateTemp = startDateTemp.clone();
    console.log(`Return ${startDateTemp.toDate()}`);
    let awattarArr = [];
    for (const v of results_nominated) {
        endDateTemp.add(1, "h");
        awattarArr.push(awattarDataObject(startDateTemp, endDateTemp, v));
        startDateTemp.add(1, "h");
    }
    return { "object": "list", "data": awattarArr };
}

export default class Aggregator {
    constructor(startTime, num) {
        let url = process.env.INFLUX_INSTANCE;
        let token = process.env.INFLUX_TOKEN;
        let org = process.env.INFLUX_ORGANISATION;
        this.time = startTime;
        this.num = num;

        //console.log(url, token, org);

        const client = new InfluxDB({ url, token });
        this.queryClient = client.getQueryApi(org);

        const app = express();

        app.get("/v1/marketdata", async (req, res) => {
            let start = this.time.clone();
            start.set({ minute: 0, second: 0, millisecond: 0 });

            console.log(`Call for: ${start.toDate()}`);
            res.json(await fetchData(this, start.clone()));
        });

        app.listen(3333, () => {
            console.log(`Aggregator simulator listening on port ${3333}`);
        });
    }

    setCurrentStartTime(time) {
        this.time = time;
    }

    getGridPower(startDate) {
        let timeResolution = "1h";
        let startDay = startDate.clone();
        let endDay = startDate.clone();
        startDay.add(-1, "d");
        console.log(`${startDay.toISOString()} to ${endDay.toISOString()}`);
        let fluxQuery = `
        myAggregateT = ${timeResolution}
        myStartT = ${startDay.toISOString()}
        myStopT = ${endDay.toISOString()}
        `;

        for (let i = 1; i <= this.num; i++) {
            fluxQuery += `
        grid${i} = from(bucket: "sim_${i}")
          |> range(start: myStartT, stop: myStopT)
          |> filter(fn: (r) => r["_measurement"] == "gridPower")
          |> filter(fn: (r) => r["_field"] == "value")
          |> aggregateWindow(every: myAggregateT, fn: mean, createEmpty: true)
          |> fill(column: "_value", value: 0.0)
          |> keep(columns: ["_time","_value"])
        `;
        }

        fluxQuery += "\n\tunion(tables: [ ";
        for (let i = 1; i <= this.num; i++) {
            fluxQuery += `grid${i}, `;
        }

        fluxQuery += ` ])
          |> group(columns: ["_time"])
          |> sum()
          |> group()`;

        //console.log(fluxQuery);

        return new Promise((resolve, reject) => {
            let results_query = [];
            this.queryClient.queryRows(fluxQuery, {
                next: (row, tableMeta) => {
                    const tableObject = tableMeta.toObject(row);
                    results_query.push(tableObject._value);
                },
                error: (error) => {
                    console.error("\nError", error);
                    reject(error);
                },
                complete: () => {
                    if (results_query.length === 0) {
                        results_query = new Array(360).fill(1);
                    }
                    resolve(createTariffObject(results_query, startDate));
                },
            });
        });
    }
}

async function fetchData(aggregator, start) {
    try {
        // Code here will execute after the query is complete
        return await aggregator.getGridPower(start);
    } catch (error) {
        // Handle errors
        console.error("Error fetching data:", error);
    }
}

//new Aggregator(moment("2012-11-30T00:00:00+01:00"), 3);
