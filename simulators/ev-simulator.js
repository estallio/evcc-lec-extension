// chargers properties
// status: string - A..F
// enabled: bool - true/false
// enable: function - true/false
// maxcurrent: function - int (A)

// meters properties
// power: W

import express from 'express';
import fs from 'fs';
import Smooth from './utils/Smooth.js';
import bodyParser from "body-parser";

// charger-config: https://github.com/evcc-io/evcc/blob/b28c7b516bf41662fec2c5e7632ecf99afaccf93/cmd/demo.yaml#L128
// car-config: https://github.com/evcc-io/evcc/blob/b28c7b516bf41662fec2c5e7632ecf99afaccf93/cmd/demo.yaml#L128
// wallbox-meter-config: https://github.com/evcc-io/evcc/blob/b28c7b516bf41662fec2c5e7632ecf99afaccf93/cmd/demo.yaml#L128

export default class EV {
    constructor(config) {
        this.port = config.port;

        this.locationFile = config.locationFile;
        this.rawLocationData = fs.readFileSync(this.locationFile);
        this.locationData = JSON.parse(this.rawLocationData);

        this.distanceFile = config.distanceFile;
        this.rawDistanceData = fs.readFileSync(this.distanceFile);
        this.distanceData = JSON.parse(this.rawDistanceData);

        this.timeResolution = this.distanceData.TimeResolution;
        const timeResolutionStrings = this.timeResolution.split(':');
        this.intervalInSeconds = (((parseInt(timeResolutionStrings[0]) * 60) + parseInt(timeResolutionStrings[1])) * 60) + parseInt(timeResolutionStrings[2]);

        this.distanceValues = this.distanceData.Values;
        this.locationValues = this.locationData.Values;

        // simulation provides distances in m in the given timespan - calculate back to km/h
        this.speed = this.distanceValues.map(value => value / 1000 / (this.intervalInSeconds / 3600));

        this.smoothFunction = Smooth(this.speed);
        this.currentSeconds = 0;

        // charger-related variables
        this.status = 'A';
        this.enabled = false;
        this.maxCurrent = 16;
        this.currentPhases = 1;

        // meter-related variables
        this.currentPower = 0;

        // car-related variables
        this.SoCInKWh = config.initialSoCInKWh;
        this.averageConsumptionPer100KM = config.averageConsumptionPer100KM;
        this.batterySizeInKWh = config.batterySizeInKWh;
        this.maxChargeRateInKW = config.maxChargeRateInKW;
        this.chargingEfficiency = config.chargingEfficiency;
        this.range = this.SoCInKWh / this.averageConsumptionPer100KM * 100;

        const app = express();
        //app.use(bodyParser.json({type: 'application/json'}))
        app.use(bodyParser.text())


      app.get('/charger/status', (req, res) => {
            res.send(this.status); //Does not want a JSON response for some reason
        });

        app.get('/charger/enabled', (req, res) => {
            res.json(this.enabled);
        });

        app.post('/charger/enable', (req, res) => {
            this.enabled = req.body === "true";
            res.json(this.enabled);
        });

        app.get('/charger/maxcurrent', (req, res) => {
            res.json(this.maxCurrent);
        });

        app.post('/charger/maxcurrent', (req, res) => {
            this.maxCurrent = parseInt(req.body);
            res.json(this.maxCurrent);
        });

        app.get('/charger/currentphases', (req, res) => {
            res.json(this.currentPhases);
        });

        app.post('/charger/currentphases', (req, res) => {
            this.currentPhases = parseInt(req.query.currentPhases);
            res.json(this.currentPhases);
        });

        app.get('/meter/currentpower', (req, res) => {
            res.json(-this.currentPower);
        });

        app.get('/vehicle/soc', (req, res) => {
            res.json(this.SoCInKWh / this.batterySizeInKWh);
        });

        app.get('/vehicle/status', (req, res) => {
            res.send(this.status); //Does not want a JSON response for some reason
        });

        app.get('/vehicle/range', (req, res) => {
          res.json(this.range);
        });

        app.listen(this.port, () => {
          console.log(`ev simulator listening on port ${this.port}`);
        });
    }

    update(timespan) {
        const leftIndex = this.currentSeconds / this.intervalInSeconds;
        const rightIndex = (this.currentSeconds + timespan) / this.intervalInSeconds;

        // location = null when car is driving
        const location = this.locationValues[Math.floor((this.currentSeconds + timespan) / this.intervalInSeconds)];

        const leftValue = this.smoothFunction(leftIndex);
        const rightValue = this.smoothFunction(rightIndex);

        const speed = (leftValue + rightValue) / 2 / 3600 * timespan;

        // reduce SoCInKWh - what if the battery is empty and the car not at home?
        this.SoCInKWh = this.SoCInKWh - (speed * (this.averageConsumptionPer100KM / 100));
        this.range = this.SoCInKWh / this.averageConsumptionPer100KM * 100;

        this.currentSeconds += timespan;

        if ((speed !== 0 || location !== 'Home') && this.status !== 'A') {
            // car is not at home or driving around - unplug automatically if connected            
            this.status = 'A';
            this.enabled = false;
            this.currentPower = 0;
        } else if (speed === 0 && location === 'Home' && this.status === 'A') {
            // car is not driving and at home, plug it in if not already plugged in
            this.status = 'B';
            this.enabled = false;
            this.currentPower = 0;
        } else if (this.status === 'B' && this.enabled == true) {
            // car should start charging but is only in ready state - set it in active state
            this.status = 'C';
        } else if (this.status === 'C' && this.enabled == false) {
            // car is charging - stop it
            this.status = 'B';
        } else if (this.status === 'C') {
            // charge car with charging rate in kW
            let chargingRate = this.maxCurrent * 230 / 1000;

            if (this.currentPhases === 3) {
                chargingRate = this.maxCurrent * 400 * Math.sqrt(3) / 1000;
            }

            const chargedEnergy = chargingRate * timespan / 3600;

            // charge the battery with a small amount of loss
            this.SoCInKWh += chargedEnergy * this.chargingEfficiency;

            // we can not charge more than the actual size of the battery
            if (this.SoCInKWh > this.batterySizeInKWh) {

                // saldo is calculated back
                let chargingSaldo = this.SoCInKWh - this.batterySizeInKWh;

                // calculate back the battery efficiency of the saldo
                chargingSaldo /= this.chargingEfficiency;

                // set battery fully loaded
                this.SoCInKWh = this.batterySizeInKWh;

                this.currentPower = (-chargedEnergy + chargingSaldo) / (timespan / 3600);

                return -chargedEnergy + chargingSaldo;
            }

            this.currentPower = -chargedEnergy / (timespan / 3600);

            return chargedEnergy;
        }

        this.currentPower = 0;

        return 0;
    }

    getCurrentPower() {
        return this.currentPower;
    }
}


