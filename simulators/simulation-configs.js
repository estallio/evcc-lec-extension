import "dotenv/config";

import fs from "fs";
import got from "got";

const simulationDelay = 0; // indicates only how long the simulator should wait in [ms] after every simulation step
const simulationStepSize = 1000 * 15; // specifies the simulation step size in [ms]
const simulationStartTime = "2012-11-30T00:00:00+01:00"; // +01:00 = vienna time - must be present in the exact RFC3339 format (https://www.rfc-editor.org/rfc/rfc3339#section-5.8)
const centralClockPort = 7199; // evcc "site"-specific central variable (in the evcc config file, it is located under the "site:" element)

export {
    generateHouseholdsConfig,
    setupInfluxForHousehold,
    simulationDelay,
    simulationStepSize,
    simulationStartTime,
    centralClockPort
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

    data = await got.get(influxInstance + "/api/v2/orgs?org=" + influxOrganisation, {
        headers: {
            Authorization: "Token " + influxToken, Accept: "application/json", "Content-Type": "application/json"
        }
    }).json();

    const orgId = data.orgs[0].id;

    data = await got.get(influxInstance + "/api/v2/buckets?name=" + influxBucket, {
        headers: {
            Authorization: "Token " + influxToken, Accept: "application/json", "Content-Type": "application/json"
        }
    }).json();

    if (data.buckets.length === 0) {
        data = await got.post(influxInstance + "/api/v2/buckets", {
            headers: {
                Authorization: "Token " + influxToken, Accept: "application/json", "Content-Type": "application/json"
            }, json: {
                name: influxBucket, description: "A bucket holding evcc data", orgID: orgId
                // retentionRules: [{
                //    type: "expire",
                //    everySeconds: 2592000,
                // }]
            }
        }).json();
    }
}

function createHouseholdObject(name, num, webPort, pvP, pvAzimuth, pvPort, evLocation, evDistance, evPort, evBatteryKwH, batteryPort, batteryKwH, consumptionFile, consumptionPort, influxBucket, smartMeterPort) {

    const influxInstance = process.env.INFLUX_INSTANCE;
    const influxToken = process.env.INFLUX_TOKEN;
    const influxOrganisation = process.env.INFLUX_ORGANISATION;

    return {
        name: `${name} ${num}`, port: webPort, pvs: [{
            file: `./production_values/pv_sim_export_${pvP}_${pvAzimuth}_45.json`, port: pvPort
        }], evs: [{
            chargingEfficiency: 0.95,
            maxChargeRateInKW: 22,
            batterySizeInKWh: evBatteryKwH,
            averageConsumptionPer100KM: 16,
            initialSoCInKWh: Math.max(evBatteryKwH - 5),
            locationFile: `./car_values/House ${evLocation}/Results/CarLocation.Car 2, 22kW Charging Power, avg. Speed 30 km h.HH1.json`,
            distanceFile: `./car_values/House ${evDistance}/Results/DrivingDistance.Car 2, 22kW Charging Power, avg. Speed 30 km h.HH1.json`,
            port: evPort
        }], wallboxes: [{
            maxCurrent: 16, // in A
            port: evPort
        }], batteries: [{
            batterySizeInKWh: batteryKwH,
            initSoCinKWh: Math.max(batteryKwH - 2, 0),
            maxDischargeRateInKW: 5,
            maxChargeRateInKW: 4,
            chargingEfficiency: 0.95,
            dischargingEfficiency: 0.92,
            port: batteryPort
        }], consumptions: [{
            file: `consumption_values/House_${consumptionFile}.json`, port: consumptionPort
        }], influx: {
            url: influxInstance, bucket: influxBucket, token: influxToken, org: influxOrganisation
        }, smartMeter: {
            port: smartMeterPort
        }
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
    // every house gets a PV
    let pvAzimuth = [0, 90, 180, 270, 0, 0, 90, 180, 270, 90, 0, 90, 180, 270, 180, 0, 90, 180, 270, 270, 0, 90, 180, 270, 0];

    console.log("Started household generation");

    let pv_kWp = [15, 5, 12, 0, 0, 8, 10, 5, 20, 10, 13, 7, 14, 4, 0, 19, 5, 13, 0, 7];
    let bat_kWh = [10, 0, 5, 0, 0, 4, 0, 0, 12, 6, 0, 0, 6, 0, 0, 20, 0, 8, 0, 3];
    let ev_kWh = [50, 0, 0, 60, 0, 50, 40, 0, 50, 40, 0, 60, 40, 0, 50, 50, 0, 40, 60, 50];

    for (let i = 1; i <= 5; i++) {
        for (let j = 1; j <= 4; j++) {
            evccInstanceNumber += 1;

            let household = createHouseholdObject(
                "Household",
                evccInstanceNumber, // evcc instance number
                evccInstancePort++, // evcc instance port
                pv_kWp[evccInstanceNumber - 1]*1000, // pv peak power
                pvAzimuth[evccInstanceNumber - 1], // pv azimuth
                evccSimulatedDevicePortNumber++, // pv simulator port
                `${i} ${j}`, // house identification and number to find the simulation data file of the location of the respective ev
                `${i} ${j}`, // house identification and number to find the simulation data file of the distances of the respective ev
                evccSimulatedDevicePortNumber++, // ev simulator port
                ev_kWh[evccInstanceNumber - 1], //ev battery size
                evccSimulatedDevicePortNumber++, // battery simulator port
                bat_kWh[evccInstanceNumber - 1], // household battery size
                `${i}-HH_${j}`, // household consumption file
                evccSimulatedDevicePortNumber++, // consumption simulator port
                `sim_${evccInstanceNumber}`, // influx bucket name
                evccSimulatedDevicePortNumber++ // smart meter simulator Port
            );

            households.push(household);

            console.log("Generated household number: ", evccInstanceNumber);
        }
    }

    fs.writeFile("sim.json", JSON.stringify(households), (err) => {
        if (err) throw err;
    });

    return households;
}

export function generateCommunityConfigs() {

    // collect all evcc instances in a households variable
    let communityInf = [];

    // iterate variables for the respective evcc simulation environment
    // all variables are increasing for every simulation environment
    let evccInstanceNumber = 0;
    let evccSimulatedDevicePortNumber = 9900;
    let evccPort = 7095;

    // the simulation data from the Load Profile Generator were iterated over a specific naming comventaion
    // every house gets a PV
    let pvAzimuth = [0, 90, 180, 270, 0, 0, 90, 180, 270, 90, 0, 90, 180, 270, 180, 0, 90, 180, 270, 270, 0, 90, 180, 270, 0];

    console.log("Started household generation");

    let pv_kWp = [40, 170];
    let bat_kWh = [300, 500];
    let ev_kWh = [50, 50];

    for (let i = 1; i <= 1; i++) {
        for (let j = 1; j <= 2; j++) {
            evccInstanceNumber += 1;

            let household = createHouseholdObject(
                "Community",
                evccInstanceNumber, // evcc instance number
                evccPort++, // evcc instance port
                pv_kWp[evccInstanceNumber - 1]*1000, // pv peak power
                pvAzimuth[evccInstanceNumber - 1], // pv azimuth
                evccSimulatedDevicePortNumber++, // pv simulator port
                `${i} ${j}`, // house identification and number to find the simulation data file of the location of the respective ev
                `${i} ${j}`, // house identification and number to find the simulation data file of the distances of the respective ev
                evccSimulatedDevicePortNumber++, // ev simulator port
                ev_kWh[evccInstanceNumber - 1], //ev battery size
                evccSimulatedDevicePortNumber++, // battery simulator port
                bat_kWh[evccInstanceNumber - 1], // household battery size
                `${i}-HH_${j}`, // household consumption file
                evccSimulatedDevicePortNumber++, // consumption simulator port
                `com_sim_${evccInstanceNumber}`, // influx bucket name
                evccSimulatedDevicePortNumber++ // smart meter simulator Port
            );

            communityInf.push(household);

            console.log("Generated community inf number: ", evccInstanceNumber);
        }
    }

    return communityInf;
}
