import moment from 'moment';
import express from 'express';
import _ from 'lodash';

import {
    generateHouseholdsConfig,
    generateCommunityConfigs,
    setupInfluxForHousehold,
    simulationDelay,
    simulationStepSize,
    simulationStartTime,
    centralClockPort,
} from './simulation-configs.js';

import Battery from './battery-simulator.js';
import PV from './pv-simulator.js';
import Consumption from './consumption-simulator.js';
import EV from './ev-simulator.js';
import SmartMeter from "./smart-meter-simulator.js";
import Aggregator from "./aggregator.js";

import InfluxWrite from "./influx-write.js";

function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

(async () => {
    const householdsConfig = generateHouseholdsConfig();

    const households = [];
    const communitiyInfras = []

    const communityConfig = generateCommunityConfigs();
    let communityInfra = [];

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

    for (const config of communityConfig) {
        const infra = {};
        await setupInfluxForHousehold(config); // generates an influx-bucket for a single household

        infra.influx = new InfluxWrite(config.influx);
        infra.smartMeter = new SmartMeter(config.smartMeter);
        infra.consumptions = [];
        for (const consumptionConfig of config.consumptions) {
            const consumption = new Consumption(consumptionConfig);
            infra.consumptions.push(consumption);
        }

        infra.pvs = [];
        for (const pvConfig of config.pvs) {
            const pv = new PV(pvConfig);
            infra.pvs.push(pv);
        }

        infra.batteries = [];
        for (const batteryConfig of config.batteries) {
            const battery = new Battery(batteryConfig);
            infra.batteries.push(battery);
        }

        infra.evs = [];
        for (const evConfig of config.evs) {
            const ev = new EV(evConfig);
            infra.evs.push(ev);
        }

        infra.name = config.name;

        communitiyInfras.push(infra);
    }



    const simulationTime = moment(simulationStartTime);

    let aggregator = new Aggregator(simulationTime.clone(), householdsConfig.length);
    console.log("Starting simulation...");

    let lastTime = simulationTime.clone();

    setInterval(() => {
        console.log("Simulation time: " + simulationTime.toDate(), "Simulation speed: " + simulationTime.diff(lastTime, 'minutes') + " min/s");
        lastTime = simulationTime.clone();
    }, 1000);

    // be careful: input parameters are in seconds and milliseconds

    const simulateOneStep = async () => {
        // console.log("Simulation time: " + simulationTime.toDate());
        let residualEnergyInKWhCommunity = 0;

        for (const household of households) {
            let residualEnergyInKWh = 0;

            // consumption and pv production are fixed and can not be changed
            // for this reason, we get the consumption and production data first and secondly give the battery the chance to charge
            // this strategy neglects the ev charging at first and priorizes the battery charging
            let currentConsumptionPower = 0;
            for (const consumption of household.consumptions) {
                residualEnergyInKWh += consumption.update(simulationStepSize / 1000); // to seconds
                currentConsumptionPower += consumption.getCurrentPower();

                household.influx.updateDB("sm1", "Smart_Meter_Reading", "power", currentConsumptionPower, simulationTime.toDate());
            }

            let currentPvPower = 0;
            for (const pv of household.pvs) {
                residualEnergyInKWh += pv.update(simulationStepSize / 1000); // to seconds
                currentPvPower += pv.getCurrentPower();

                household.influx.updateDB("pv1", "PV_Inverter_Reading", "power", currentPvPower, simulationTime.toDate())
            }

            let currentBatteryPower = 0;
            for (const battery of household.batteries) {
                // changes the residual value, therefore no '+='
                residualEnergyInKWh = battery.update(simulationStepSize / 1000, residualEnergyInKWh); // to seconds
                currentBatteryPower += battery.getCurrentPower();

                // const currentBatterySoC = battery.getCurrentSoC();
                // await household.influx.updateDB("bat1", "Battery_Meter", "soc", currentBatterySoC, simulationTime.toDate())
                household.influx.updateDB("bat1", "Battery_Meter", "power", currentBatteryPower, simulationTime.toDate())
            }

            let currentEvChargingPower = 0;
            for (const ev of household.evs) {
                residualEnergyInKWh += ev.update(simulationStepSize / 1000); // to seconds
                currentEvChargingPower += ev.getCurrentPower();
            }

            household.smartMeter.setResidualPower(-(currentConsumptionPower + currentPvPower + currentBatteryPower + currentEvChargingPower));
            residualEnergyInKWhCommunity += residualEnergyInKWh

            household.influx.updateDB("resid", "Residual_Meter", "energy", residualEnergyInKWh, simulationTime.toDate())
            household.influx.updateDB("resid", "Residual_Meter", "power", residualEnergyInKWh/((simulationStepSize / 1000) / 3600), simulationTime.toDate())
        }

        for (const infra of communitiyInfras) {
            let residualEnergyInKWh = 0;

            let currentPvPower = 0;
            for (const pv of infra.pvs) {
                residualEnergyInKWh += pv.update(simulationStepSize / 1000); // to seconds
                residualEnergyInKWhCommunity += residualEnergyInKWh;
                currentPvPower += pv.getCurrentPower();
                infra.influx.updateDB("pv1", "PV_Inverter_Reading", "power", currentPvPower, simulationTime.toDate())
            }

            let currentBatteryPower = 0;
            for (const battery of infra.batteries) {
                // changes the residual value, therefore no '+='
                residualEnergyInKWh = battery.update(simulationStepSize / 1000, residualEnergyInKWhCommunity); // to seconds
                residualEnergyInKWhCommunity = residualEnergyInKWh;
                currentBatteryPower += battery.getCurrentPower();

                // const currentBatterySoC = battery.getCurrentSoC();
                // await household.influx.updateDB("bat1", "Battery_Meter", "soc", currentBatterySoC, simulationTime.toDate())
                infra.influx.updateDB("bat1", "Battery_Meter", "power", currentBatteryPower, simulationTime.toDate())
            }


            infra.smartMeter.setResidualPower(-(currentPvPower + currentBatteryPower));

            infra.influx.updateDB("resid", "Residual_Meter", "energy", residualEnergyInKWh, simulationTime.toDate())
            infra.influx.updateDB("resid", "Residual_Meter", "power", residualEnergyInKWh/((simulationStepSize / 1000) / 3600), simulationTime.toDate())
        }



        simulationTime.add(simulationStepSize, 'millisecond');
        aggregator.setCurrentStartTime(simulationTime.clone());

        if (simulationDelay !== 0) {
            await Sleep(simulationDelay);
        }
    };


    // setup centralClock
    const app = express();

    let firstTime = true;

    // const instanceNames = households.map(h => h.name);
    let waitingInstances = new Map();

    app.get('/', async (req, res) => {
        const instanceName = req.query.instanceName;

        let instanceResolve;
        const instancePromise = new Promise((resolve, reject) => {
            instanceResolve = resolve;
        });
        instancePromise.resolve = instanceResolve;

        waitingInstances.set(instanceName, instancePromise);

        // check if all the other instances are already waiting
        if (waitingInstances.size >= households.length + communitiyInfras.length) {
            // first request-round is to wait for all instances
            if (firstTime) {
                firstTime = false;
            } else {
                // execute one simulation step
                await simulateOneStep();
            }

            // resume all waiting instances
            waitingInstances.forEach((value, key, map) => value.resolve());

            // reset map
            waitingInstances = new Map();
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
