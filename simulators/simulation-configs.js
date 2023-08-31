import fs from "fs";
import 'dotenv/config';

export default {
    households: gen()
}

function hhObject(num, webPort, pvP, pvAzimuth, pvPort, evLocation, evDistance, evPort, batteryPort, consumptionFile, consumptionPort, influxBucket) {
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
            url: "http://localhost:8086",
            bucket: influxBucket,
            token: process.env.INFLUX_TOKEN,
            org: "home"
        }
    }
}

function gen() {
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
    for (let i = 1; i <= 5; i++) {
        for (let j = 1; j <= 5; j++) {
            count += 1
            let hh = hhObject(count,
                web_port++,
                pvP,
                pvAzimuth[count - 1],
                port++,
                `${i} ${j}`,
                `${i} ${j}`,
                port++,
                port++,
                `${i}-HH_${j}`,
                port++, `sim_${count}`
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

