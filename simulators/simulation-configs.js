import fs from "fs";
import got from 'got';
import 'dotenv/config';

export default {
    households: await gen()
}

async function hhObject(num, webPort, pvP, pvAzimuth, pvPort, evLocation, evDistance, evPort, batteryPort, consumptionFile, consumptionPort, influxBucket, smartMeterPort) {

    const influxInstance = 'http://localhost:8086';
    const influxToken = process.env.INFLUX_TOKEN;
    const influxOrganisation = 'home';
    let data;

    // normally, influxdb forbids the API to write to organisation with: write:orgs is unauthorized
    /*
        example:
        curl --request POST "http://localhost:8086/api/v2/orgs" \
        --header "Authorization: Token -EOXPQUSw_q8hYpzhDoq_RMOttf6EVouRxxBEK5T5j6ES5XdqvsjSUFMjrvLCZwGddSDlh9GbO3nPCjMTO-Yjg==" \
        --header "Accept: application/json" \
        --header "Content-Type: application/json" \
        --data '{ "name": "tester", "description": "Example InfluxDB organization" }'
    *//*
    let data = await got.post(influxInstance + '/api/v2/orgs', {
        headers: {
            Authorization: 'Token ' + influxToken,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        json: {
		    name: influxOrganisation,
	    }
    }).json();
    */

    data = await got.get(influxInstance + '/api/v2/orgs?org=' + influxOrganisation, {
        headers: {
            Authorization: 'Token ' + influxToken,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    }).json();

    const orgId = data.orgs[0].id;

    data = await got.get(influxInstance + '/api/v2/buckets?name=' + influxBucket, {
        headers: {
            Authorization: 'Token ' + influxToken,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    }).json();

    if (data.buckets.length === 0) {
        data = await got.post(influxInstance + '/api/v2/buckets', {
            headers: {
                Authorization: 'Token ' + influxToken,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            json: {
                name: influxBucket,
                description: "A bucket holding evcc data",
                orgID: orgId,
                // retentionRules: [{
                //    type: "expire",
                //    everySeconds: 2592000,
                // }]
            }
        }).json();
    }

    return {
        name: `Household ${num}`, port: webPort, pvs: [{
            file: `./production_values/pv_sim_export_${pvP}_${pvAzimuth}_45.json`, port: pvPort
        }], evs: [{
            chargingEfficiency: 0.95,
            maxChargeRateInKW: 22,
            batterySizeInKWh: 50,
            averageConsumptionPer100KM: 16,
            initialSoCInKWh: 20,
            locationFile: `./car_values/House ${evLocation}/Results/CarLocation.Car 2, 22kW Charging Power, avg. Speed 30 km h.HH1.json`,
            distanceFile: `./car_values/House ${evDistance}/Results/DrivingDistance.Car 2, 22kW Charging Power, avg. Speed 30 km h.HH1.json`,
            port: evPort
        }], wallboxes: [{
            maxCurrent: 16, // in A
            port: evPort
        }], batteries: [{
            batterySizeInKWh: 10,
            initSoCinKWh: 8,
            maxDischargeRateInKW: 5,
            maxChargeRateInKW: 4,
            chargingEfficiency: 0.95,
            dischargingEfficiency: 0.92,
            port: batteryPort
        }], consumptions: [{
            file: `consumption_values/House_${consumptionFile}.json`, port: consumptionPort
        }], influx: {
            url: influxInstance,
            bucket: influxBucket,
            token: influxToken,
            org: influxOrganisation
        }, smartMeter: {
            port: smartMeterPort,
        }
    }
}

async function gen() {
    let count = 0
    let port = 9000
    let web_port = 7070
    let houseHolds = []
    let pvP = 4000
    let pvAzimuth = [
        0, 90, 180, 270, 0,
        0, 90, 180, 270, 90,
        0, 90, 180, 270, 180,
        0, 90, 180, 270, 270,
        0, 90, 180, 270, 0,
    ]
    for (let i = 1; i <= 1; i++) {
        for (let j = 1; j <= 1; j++) {
            count += 1
            let hh = await hhObject(count,
                web_port++,
                pvP,
                pvAzimuth[count - 1],
                port++,
                `${i} ${j}`,
                `${i} ${j}`,
                port++,
                port++,
                `${i}-HH_${j}`,
                port++, `sim_${count}`,
                port++
            )
            houseHolds.push(hh)
            console.log(count)
        }
        pvP += 2000
    }

    fs.writeFile("sim.json", JSON.stringify(houseHolds), (err) => {
        if (err) throw err
    })
    return houseHolds
}

