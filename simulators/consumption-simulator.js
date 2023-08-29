import fs from 'fs';
import Smooth from './utils/Smooth.js';

export default class Consumption {
    constructor(config) {
        this.file = config.file;

        this.rawConsumptionData = fs.readFileSync(this.file);
        this.consumptionData = JSON.parse(this.rawConsumptionData);

        this.timeResolution = this.consumptionData.TimeResolution;
        const timeResolutionStrings = this.timeResolution.split(':');
        this.intervalInSeconds = (((parseInt(timeResolutionStrings[0]) * 60) + parseInt(timeResolutionStrings[1])) * 60) + parseInt(timeResolutionStrings[2]);

        this.consumptionValues = this.consumptionData.Values;

        this.smoothFunction = Smooth(this.consumptionValues);
        this.currentSeconds = 0;

        this.currentConsumption = 0;
    }

    update(timespan) {
        const leftIndex = this.currentSeconds / this.intervalInSeconds;
        const rightIndex = (this.currentSeconds + timespan) / this.intervalInSeconds;

        const leftValue = this.smoothFunction(leftIndex);
        const rightValue = this.smoothFunction(rightIndex);

        this.currentSeconds += timespan;

        const consumedEnergy = (leftValue + rightValue) / 2 * (timespan / 3600);

        this.currentConsumption = -(consumedEnergy / (timespan / 3600));

        return -consumedEnergy;
    }

    getCurrentPower() {
        return this.currentConsumption;
    }
}