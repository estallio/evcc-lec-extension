import moment from 'moment';
import exec from 'child_process';

import config from './simulation-configs.js';

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
    const {households: householdsConfig} = await config;

    const households = [];

    // setup all households from config file
    for (const householdConfig of householdsConfig) {

        const household = {};

        household.infux = new InfluxWrite(householdConfig.influx);

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

        households.push(household)
    }

    const simulationTime = moment('2021-09-01T00:00:00');

    exec.exec(`date -s "${simulationTime.format("YYYY-MM-DD HH:mm")}"`);

    // simulation loop
    for (let i = 0; i < 7 * 24 * 60; i++) {
        simulationTime.add(60, 'seconds');

        console.log(simulationTime.toDate());

        for (const household of households) {
            let residualEnergyInKWh = 0;

            // consumption and pv production are fixed and can not be changed
            // for this reason, we get the consumption and production data first and secondly give the battery the chance to charge
            // this strategy neglects the ev charging at first and priorizes the battery charging

            let currentConsumptionPower = 0;
            for (const consumption of household.consumptions) {
                residualEnergyInKWh += consumption.update(60);
                currentConsumptionPower += consumption.getCurrentPower();

                //await household.infux.updateDB("sm1", "Smart_Meter_Reading", "power", consumptionPower, simulationTime.toDate())
            }

            let currentPvPower = 0;
            for (const pv of household.pvs) {
                residualEnergyInKWh += pv.update(60);
                currentPvPower += pv.getCurrentPower();

                //await household.infux.updateDB("pv1", "PV_Inverter_Reading", "power", pvPower, simulationTime.toDate())
            }

            let currentBatteryPower = 0;
            for (const battery of household.batteries) {
                // changes the residual value, therefore no '+='
                residualEnergyInKWh = battery.update(60, residualEnergyInKWh);
                currentBatteryPower += battery.getCurrentPower();
                
                // const batterySoC = battery.getCurrentSoC();
                //await household.infux.updateDB("bat1", "Battery_Meter", "power", batteryPower, simulationTime.toDate())
                //await household.infux.updateDB("bat1", "Battery_Meter", "soc", batterySoC, simulationTime.toDate())
            }

            let currentEvChargingPower = 0;
            for (const ev of household.evs) {
                residualEnergyInKWh += ev.update(60);
                currentEvChargingPower += ev.getCurrentPower();
            }

            household.smartMeter.setResidualPower(-(currentConsumptionPower + currentPvPower + currentBatteryPower + currentEvChargingPower));

            //await household.infux.updateDB("resid", "Residual_Meter", "energy", residualEnergyInKWh, simulationTime.toDate())
            //await household.infux.updateDB("resid", "Residual_Meter", "power", residualEnergyInKWh/(60 / 3600), simulationTime.toDate())

            exec.exec(`date -s "${simulationTime.format("YYYY-MM-DD HH:mm")}"`);

            await Sleep("10");
        }
    }
})();
