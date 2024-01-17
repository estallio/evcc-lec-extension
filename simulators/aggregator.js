import { InfluxDB } from "@influxdata/influxdb-client";
import moment from "moment/moment.js";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

function awattarDataObject(startTime, endTime, price) {
    return {
        start_timestamp: startTime.unix(), end_timestamp: endTime.unix(), marketprice: price, unit: "Eur/MWh"
    };
}

function createTariffObject(result_arr, startDate, endDate) {
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

    let startDay = startDate.clone();
    startDay.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    console.log(`${startDate.toDate()} ___ ${endDate.toDate()}`);
    let awattarArr = [];
    let endDateTemp = startDay.clone();
    let startDateTemp = startDay.clone();
    startDateTemp.add(1, "ms");
    endDateTemp.add(-1, "ms");
    for (const v of results_nominated) {
        endDateTemp.add(1, "h");
        if (startDateTemp.isAfter(startDate) && endDateTemp.isBefore(endDate)) {
            awattarArr.push(awattarDataObject(startDate, endDateTemp, v));
        }
        startDateTemp.add(1, "h");
    }
    return { "object": "list", "data": awattarArr };
}

export default class Aggregator {
    constructor(startTime) {
        let url = process.env.INFLUX_INSTANCE;
        let token = process.env.INFLUX_TOKEN;
        let org = process.env.INFLUX_ORGANISATION;
        this.time = startTime;

        //console.log(url, token, org);

        const client = new InfluxDB({ url, token });
        this.queryClient = client.getQueryApi(org);
    }

    setCurrentStartTime(time) {
        this.time = time;
    }

    getGridPower(startDate, endDate, numHouseholds) {
        let timeResolution = "1h";
        let startDay = startDate.clone();
        startDay.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
        let endDay = startDay.clone().add(1, "d");
        let fluxQuery = `
        myAggregateT = ${timeResolution}
        myStartT = ${startDay.toISOString()}
        myStopT = ${endDay.toISOString()}
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

        return new Promise((resolve, reject) => {
            let results_query = [];
            this.queryClient.queryRows(fluxQuery, {
                next: (row, tableMeta) => {
                    const tableObject = tableMeta.toObject(row);
                    results_query.push(tableObject._value);
                }, error: (error) => {
                    console.error("\nError", error);
                    reject(error);
                }, complete: () => {
                    resolve(createTariffObject(results_query, startDate, endDate));
                }
            });
        });
    }
}

async function fetchData(aggregator, start, end, num) {
    try {
        // Code here will execute after the query is complete
        let res = await aggregator.getGridPower(start, end, num);
        return res;
    } catch (error) {
        // Handle errors
        console.error("Error fetching data:", error);
    }
}


const app = express();

app.get("/v1/marketdata", async (req, res) => {
    let start = moment("2012-11-30T00:00:00+01:00");
    let end = start.clone();
    end.add(1, "d");
    if (req.query.start !== undefined) {
        start = moment.unix(req.query.start);
    }
    if (req.query.end !== undefined) {
        end = moment.unix(req.query.end);
    }

    console.log(`${start.toDate()} --- ${end.toDate()}`);
    let aggregator = new Aggregator();
    res.json(await fetchData(aggregator, start.clone(), end.clone(), 3));
});

app.listen(3333, () => {
    console.log(`consumption simulator listening on port ${3333}`);
});





