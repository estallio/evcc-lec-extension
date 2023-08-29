import fs from 'fs';
import Smooth from './utils/Smooth.js';

export default class PV {
    constructor(config) {
        this.file = config.file;

        this.rawPvData = fs.readFileSync(this.file);
        this.pvData = JSON.parse(this.rawPvData);

        this.azimuth = this.pvData.Azimuth;
        this.tilt = this.pvData.Tilt;
        this.timeResolution = this.pvData.TimeResolution;
        const timeResolutionStrings = this.timeResolution.split(':');
        this.intervalInSeconds = (((parseInt(timeResolutionStrings[0]) * 60) + parseInt(timeResolutionStrings[1])) * 60) + parseInt(timeResolutionStrings[2]);
        this.kWp = this.pvData.kWp;

        this.pvValues = this.pvData.Values;

        this.smoothFunction = Smooth(this.pvValues);
        this.currentSeconds = 0;

        this.currentProduction = 0;
    }

    update(timespan) {
        const leftIndex = this.currentSeconds / this.intervalInSeconds;
        const rightIndex = (this.currentSeconds + timespan) / this.intervalInSeconds;

        const leftValue = this.smoothFunction(leftIndex);
        const rightValue = this.smoothFunction(rightIndex);

        this.currentSeconds += timespan;

        const producedEnergy = (leftValue + rightValue) / 2 * (timespan / 3600);

        this.currentProduction = producedEnergy / (timespan / 3600);

        return producedEnergy;
    }

    getCurrentPower() {
        return this.currentProduction;
    }
}