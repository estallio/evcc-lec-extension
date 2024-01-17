import fs from 'fs';
import express from 'express';

import Smooth from './utils/Smooth.js';

export default class CommunityPV {
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

        this.port = config.port
        const app = express();

        app.get('/pv/currentproduction', (req, res) => {
          res.json(this.currentProduction);
        });

        app.listen(this.port, () => {
          console.log(`pv simulator listening on port ${this.port}`);
        })
    }

    update(timespan) {
        const leftIndex = this.currentSeconds / this.intervalInSeconds;
        const rightIndex = (this.currentSeconds + timespan) / this.intervalInSeconds;

        // simulation provides power data in W, we calculate in kW - divide by 1000
        const leftValue = this.smoothFunction(leftIndex) / 1000;
        const rightValue = this.smoothFunction(rightIndex) / 1000;

        this.currentSeconds += timespan;

        const producedEnergy = (leftValue + rightValue) / 2 * (timespan / 3600);

        this.currentProduction = producedEnergy / (timespan / 3600);

        return producedEnergy;
    }

    getCurrentPower() {
        return this.currentProduction;
    }
}
