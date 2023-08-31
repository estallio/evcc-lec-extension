import fs from 'fs';
import Smooth from './utils/Smooth.js';
import express from 'express';

export default class Consumption {
    constructor(config) {
        this.file = config.file;


        this.rawConsumptionData = fs.readFileSync(this.file);
        this.consumptionData = JSON.parse(this.rawConsumptionData);

        this.timeResolution = this.consumptionData.TimeResolution;
        const timeResolutionStrings = this.timeResolution.split(':');
        this.intervalInSeconds = (((parseInt(timeResolutionStrings[0]) * 60) + parseInt(timeResolutionStrings[1])) * 60) + parseInt(timeResolutionStrings[2]);

        this.consumptionValues = this.consumptionData.Values;

        // simulation provides consumption in kWh in the given timespan - calculate back to kW
        this.consumptionValues = this.consumptionValues.map(value => value / (this.intervalInSeconds / 3600));

        this.smoothFunction = Smooth(this.consumptionValues);
        this.currentSeconds = 0;

        this.currentConsumption = 0;

        this.port = config.port
        const app = express();

        app.get('/meter/currentconsumption', (req, res) => {
            res.json(-this.currentConsumption);
        });

        app.listen(this.port, () => {
            console.log(`consumption simulator listening on port ${this.port}`);
        })
    }

    update(timespan, chargingConsumption, pvPower) {
        const leftIndex = this.currentSeconds / this.intervalInSeconds;
        const rightIndex = (this.currentSeconds + timespan) / this.intervalInSeconds;

        const leftValue = this.smoothFunction(leftIndex);
        const rightValue = this.smoothFunction(rightIndex);

        this.currentSeconds += timespan;

        const consumedEnergy = (leftValue + rightValue) / 2 * (timespan / 3600);

        this.currentConsumption = -(consumedEnergy / (timespan / 3600));
        this.currentConsumption -= chargingConsumption;
        //this.currentConsumption += pvPower;

        return -consumedEnergy;
    }

    getCurrentPower() {
        return this.currentConsumption;
    }
}
