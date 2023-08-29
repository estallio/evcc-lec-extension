import moment from 'moment';

import config from './simulation-configs.js';
import Battery from './battery-simulator.js';
import PV from './pv-simulator.js';
import Consumption from './consumption-simulator.js';

const { households: householdsConfig } = config; 

const households = [];

// setup all households from config file
for (const householdConfig of householdsConfig) {
    
    const household = {};

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
}

const simulationTime = moment('2021-09-01T00:00:00');

// simulation loop
for (let i = 0; i < 7 * 24 * 60; i++) {
    simulationTime.add(60, 'seconds');

    console.log(simulationTime.toDate());

    for (const household of households) {
        let residualEnergyInKWh = 0;

        // consumption and pv production are fixed and can not be changed
        // for this reason, we get the consumption and production data first and secondly give the battery the chance to charge
        // this strategy neglects the ev charging at first and priorizes the battery charging
        // the ev charging strategy is the job of evcc

        for (const consumption of household.consumptions) {
            residualEnergyInKWh += consumption.update(60);
            const consumptionPower = consumption.getCurrentPower();
        }

        for (const pv of household.pvs) {
            residualEnergyInKWh += pv.update(60);
            const pvPower = pv.getCurrentPower();
        }

        for (const battery of household.batteries) {
            residualEnergyInKWh += battery.update(60);
            const batteryPower = battery.getCurrentPower();
        }
    }
}