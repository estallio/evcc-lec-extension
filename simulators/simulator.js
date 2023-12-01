import moment from 'moment';
import express from 'express';
import _ from 'lodash';

import {
    generateHouseholdsConfig,
    setupInfluxForHousehold,
    simulationTimeGranularity,
    simulationStepSize,
    simulationStartTime,
    centralClockPort,
} from './simulation-configs.js';

import Battery from './battery-simulator.js';
import PV from './pv-simulator.js';
import Consumption from './consumption-simulator.js';
import EV from './ev-simulator.js';
import SmartMeter from "./smart-meter-simulator.js";

import InfluxWrite from "./influx-write.js";

function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

(async () => {
    const householdsConfig = generateHouseholdsConfig();

    const households = [];

    // setup all households from config file
    for (const householdConfig of householdsConfig) {

        const household = {};

        await setupInfluxForHousehold(householdConfig); // generates an influx-bucket for a single household

        household.influx = new InfluxWrite(householdConfig.influx);

        household.smartMeter = new SmartMeter(householdConfig.smartMeter);

        household.consumptions = [];
        for (const consumptionConfig of householdConfig.consumptions) {
            const consumption = new Consumption(consumptionConfig);
            household.consumptions.push(consumption);
        }

        household.pvs = [];
        for (const pvConfig of householdConfig.pvs) {
            const pv = new PV(pvConfig);
            household.pvs.push(pv);
        }

        household.batteries = [];
        for (const batteryConfig of householdConfig.batteries) {
            const battery = new Battery(batteryConfig);
            household.batteries.push(battery);
        }

        household.evs = [];
        for (const evConfig of householdConfig.evs) {
            const ev = new EV(evConfig);
            household.evs.push(ev);
        }

        household.name = householdConfig.name;

        households.push(household);
    }



    const simulationTime = moment(simulationStartTime);

    console.log("Starting simulation...");

    console.log("Time resulution:", 1, "sec in realtime is", (1 / simulationTimeGranularity) * simulationStepSize, "sec in simulation time");

    setInterval(() => {
        console.log("Simulation time: " + simulationTime.toDate());
    }, 1000);

    // be careful: input parameters are in seconds and milliseconds

    const simulateOneStep = async () => {
        // console.log("Simulation time: " + simulationTime.toDate());

        for (const household of households) {
            let residualEnergyInKWh = 0;

            // consumption and pv production are fixed and can not be changed
            // for this reason, we get the consumption and production data first and secondly give the battery the chance to charge
            // this strategy neglects the ev charging at first and priorizes the battery charging

            let currentConsumptionPower = 0;
            for (const consumption of household.consumptions) {
                residualEnergyInKWh += consumption.update(simulationStepSize / 1000); // to seconds
                currentConsumptionPower += consumption.getCurrentPower();

                await household.influx.updateDB("sm1", "Smart_Meter_Reading", "power", currentConsumptionPower, simulationTime.toDate());
            }

            let currentPvPower = 0;
            for (const pv of household.pvs) {
                residualEnergyInKWh += pv.update(simulationStepSize / 1000); // to seconds
                currentPvPower += pv.getCurrentPower();

                await household.influx.updateDB("pv1", "PV_Inverter_Reading", "power", currentPvPower, simulationTime.toDate())
            }

            let currentBatteryPower = 0;
            for (const battery of household.batteries) {
                // changes the residual value, therefore no '+='
                residualEnergyInKWh = battery.update(simulationStepSize / 1000, residualEnergyInKWh); // to seconds
                currentBatteryPower += battery.getCurrentPower();

                // const currentBatterySoC = battery.getCurrentSoC();
                // await household.influx.updateDB("bat1", "Battery_Meter", "soc", currentBatterySoC, simulationTime.toDate())
                await household.influx.updateDB("bat1", "Battery_Meter", "power", currentBatteryPower, simulationTime.toDate())
            }

            let currentEvChargingPower = 0;
            for (const ev of household.evs) {
                residualEnergyInKWh += ev.update(simulationStepSize / 1000); // to seconds
                currentEvChargingPower += ev.getCurrentPower();
            }

            household.smartMeter.setResidualPower(-(currentConsumptionPower + currentPvPower + currentBatteryPower + currentEvChargingPower));

            await household.influx.updateDB("resid", "Residual_Meter", "energy", residualEnergyInKWh, simulationTime.toDate())
            await household.influx.updateDB("resid", "Residual_Meter", "power", residualEnergyInKWh/((simulationStepSize / 1000) / 3600), simulationTime.toDate())
        }

        simulationTime.add(simulationStepSize, 'millisecond');

        // TODO: remove this line later
        await Sleep(simulationTimeGranularity);
    };



    // setup centralClock
    const app = express();

    const instanceNames = households.map(h => h.name);
    let waitingInstances = new Map();

    app.get('/', async (req, res) => {
        const instanceName = req.query.instanceName;

        let instanceResolve;
        const instancePromise = new Promise((resolve, reject) => {
            instanceResolve = resolve;
        });
        instancePromise.resolve = instanceResolve;

        waitingInstances.set(instanceName, instancePromise);

        // first "if" only prevents unnecessary "detailed" checks - maybe superflously
        if (waitingInstances.size >= households.length) {
            // check if all instances are present in the map

            //if (_.isEqual(_.intersection(waitingInstances.keys(), instanceNames), instanceNames)) {
                await simulateOneStep();

                // resume all waiting instances
                waitingInstances.forEach((value, key, map) => value.resolve());

                // reset map
                waitingInstances = new Map();
            //}
        }

        // wait for the simulation step
        await instancePromise;

        // answer request
        res.json();
    });

    app.listen(centralClockPort, () => {
        console.log(`centralClock listening on port ${centralClockPort}`);
    });
})();
