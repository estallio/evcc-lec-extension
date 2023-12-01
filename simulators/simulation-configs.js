import 'dotenv/config';

import fs from "fs";
import got from 'got';

/**
 * simulationTimeGranularity = 1
 * simulationStepSize = 15
 * -> every second, the simulation-clock is fast-forwarded by 15s
 */
// TODO: remove time granularity? maybe only needed for evcc interval
const simulationTimeGranularity = 0; // every simulationTimeGranularity the simulation steps one simulationStepSize forward in [ms] - don't know if 0 is working because evcc disables adjustment of interval if 0
const simulationStepSize = 1000 * 15; // (every 15s) // every simulationTimeGranularity the simulation steps one simulationStepSize forward in [ms]
const evccInterval = simulationTimeGranularity; // evcc request loop interval
const simulationStartTime = '2012-11-30T00:00:00+01:00'; // +01:00 = vienna time - must be present in the exact RFC3339 format (https://www.rfc-editor.org/rfc/rfc3339#section-5.8)

// site-specific central variables (in evcc config file under site: root element)
const centralClockPort = 7069;

export {
    generateHouseholdsConfig,
    setupInfluxForHousehold,
    simulationTimeGranularity,
    simulationStepSize,
    evccInterval,
    simulationStartTime,
    centralClockPort,
};

// generates a bucket for a household
// !important: influx token with org-previledges is needed
async function setupInfluxForHousehold(household) {

    const influxInstance = household.influx.url;
    const influxBucket = household.influx.bucket;
    const influxToken = household.influx.token;
    const influxOrganisation = household.influx.org;
    
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
}

function createHouseholdObject(num, webPort, pvP, pvAzimuth, pvPort, evLocation, evDistance, evPort, batteryPort, consumptionFile, consumptionPort, influxBucket, smartMeterPort) {

    const influxInstance = process.env.INFLUX_INSTANCE;
    const influxToken = process.env.INFLUX_TOKEN;
    const influxOrganisation = process.env.INFLUX_ORGANISATION;

    return {
        name: `Household ${num}`,
        port: webPort,
        pvs: [{
            file: `./production_values/pv_sim_export_${pvP}_${pvAzimuth}_45.json`,
            port: pvPort,
        }], evs: [{
            chargingEfficiency: 0.95,
            maxChargeRateInKW: 22,
            batterySizeInKWh: 50,
            averageConsumptionPer100KM: 16,
            initialSoCInKWh: 20,
            locationFile: `./car_values/House ${evLocation}/Results/CarLocation.Car 2, 22kW Charging Power, avg. Speed 30 km h.HH1.json`,
            distanceFile: `./car_values/House ${evDistance}/Results/DrivingDistance.Car 2, 22kW Charging Power, avg. Speed 30 km h.HH1.json`,
            port: evPort,
        }], wallboxes: [{
            maxCurrent: 16, // in A
            port: evPort,
        }], batteries: [{
            batterySizeInKWh: 10,
            initSoCinKWh: 8,
            maxDischargeRateInKW: 5,
            maxChargeRateInKW: 4,
            chargingEfficiency: 0.95,
            dischargingEfficiency: 0.92,
            port: batteryPort,
        }], consumptions: [{
            file: `consumption_values/House_${consumptionFile}.json`,
            port: consumptionPort,
        }], influx: {
            url: influxInstance,
            bucket: influxBucket,
            token: influxToken,
            org: influxOrganisation,
        }, smartMeter: {
            port: smartMeterPort,
        },
    };
}

function generateHouseholdsConfig() {

    // collect all evcc instances in a households variable
    let households = [];

    // iterate variables for the respective evcc simulation environment
    // all variables are increasing for every simulation environment
    let evccInstanceNumber = 0;
    let evccInstancePort = 7070;
    let evccSimulatedDevicePortNumber = 9000;

    // the simulation data from the Load Profile Generator were iterated over a specific naming comventaion
    let pvPeakPower = 4000;

    // every house gets a PV
    let pvAzimuth = [
        0, 90, 180, 270, 0,
        0, 90, 180, 270, 90,
        0, 90, 180, 270, 180,
        0, 90, 180, 270, 270,
        0, 90, 180, 270, 0,
    ];

    console.log("Started household generation");

    for (let i = 1; i <= 1; i++) {
        for (let j = 1; j <= 3; j++) {
            evccInstanceNumber += 1

            let household = createHouseholdObject(
                evccInstanceNumber, // evcc instance number
                evccInstancePort++, // evcc instance port
                pvPeakPower, // pv peak power
                pvAzimuth[evccInstanceNumber - 1], // pv azimuth
                evccSimulatedDevicePortNumber++, // pv simulator port
                `${i} ${j}`, // house identification and number to find the simulation data file of the location of the respective ev
                `${i} ${j}`, // house identification and number to find the simulation data file of the distances of the respective ev
                evccSimulatedDevicePortNumber++, // ev simulator port
                evccSimulatedDevicePortNumber++, // battery simulator port
                `${i}-HH_${j}`, // household consumption file
                evccSimulatedDevicePortNumber++, // consumption simulator port
                `sim_${evccInstanceNumber}`, // influx bucket name
                evccSimulatedDevicePortNumber++ // smart meter simulator Port
            );

            households.push(household);

            console.log("Generated household number: ", evccInstanceNumber);
        }

        pvPeakPower += 2000;
    }

    fs.writeFile("sim.json", JSON.stringify(households), (err) => {
        if (err) throw err
    });

    return households;
}

