export default class Battery {
    constructor(config) {
        this.batterySizeInKWh = config.batterySizeInKWh;
        this.maxDischargeRateInKW = config.maxDischargeRateInKW;
        this.maxChargeRateInKW = config.maxChargeRateInKW;
        
        this.chargingEfficiency = config.chargingEfficiency;
        this.dischargingEfficiency = config.dischargingEfficiency;

        this.SoCInKWh = 0;

        this.currentPower = 0;
    }

    update(timespan, residualEnergyInKWh) {
        if (residualEnergyInKWh >= 0) {
            // if battery can be charged with the surplus from PV
    
            // calculate the average production of the surplus to know if its at least possible to load the battery with the amount of kW
            let averageProductionInKW = residualEnergyInKWh / (timespan / 3600);
    
            // trim the charging power if the average production was higher than the max. charge rate of the battery
            if (averageProductionInKW > this.maxChargeRateInKW) {
                averageProductionInKW = this.maxChargeRateInKW;
            }
        
            // calculate back the possible energy the battery is able to charge
            const chargedEnergy = averageProductionInKW * timespan / 3600;
    
            // charge the battery with a small amount of loss
            this.SoCInKWh += chargedEnergy * this.chargingEfficiency;

            // we can not charge more than the actual capacity of the battery
            if (this.SoCInKWh > this.batterySizeInKWh) {
                
                // saldo is fed into the grid
                let chargingSaldo = this.SoCInKWh - this.batterySizeInKWh;
    
                // calculate back the battery efficiency of the saldo
                chargingSaldo /= this.chargingEfficiency;
    
                // set battery fully loaded
                this.SoCInKWh = this.batterySizeInKWh;

                this.currentPower = (-chargedEnergy + chargingSaldo) / (timespan / 3600);

                return residualEnergyInKWh - chargedEnergy + chargingSaldo;
            }
    
            this.currentPower = -chargedEnergy / (timespan / 3600);

            // otherwise, we simply needed all of the produced energy for the battery
            return residualEnergyInKWh - chargedEnergy;
        } else {
            // battery is drained
            
            // calculate the average consumption to know if its at least possible to discharge the battery with the amount of kW
            let averageConsumptionInKW = -residualEnergyInKWh / (timespan / 3600);

            // trim the discharging power if the average consumption was higher than the max. discharge rate of the battery
            if (averageConsumptionInKW > this.maxDischargeRateInKW) {
                averageConsumptionInKW = this.maxDischargeRateInKW;
            }
        
            // calculate back the possible energy the battery is able to discharge
            const dischargedEnergy = averageConsumptionInKW * timespan / 3600;

            // discharge the battery with a small amount of loss
            this.SoCInKWh -= dischargedEnergy / this.dischargingEfficiency;

            // we can not discharge more than the battery delivers
            if (this.SoCInKWh < 0) {
                
                // saldo is consumed from grid
                let dischargingSaldo = this.SoCInKWh;

                // calculate back the discharging efficiency
                dischargingSaldo *= this.dischargingEfficiency;
    
                // battery is empty
                this.SoCInKWh = 0;

                this.currentPower = (dischargedEnergy + dischargingSaldo) / (timespan / 3600);

                return residualEnergyInKWh + dischargedEnergy + dischargingSaldo;
            }
    
            this.currentPower = dischargedEnergy / (timespan / 3600);

            // otherwise, we simly delivered all of the needed energy from the battery
            return residualEnergyInKWh + dischargedEnergy;;
        }
    }

    getCurrentPower() {
        return this.currentPower;
    }
}
    




    /*
    // evcc settings:
    // https://docs.evcc.io/docs/devices/meters/#generische-unterst%C3%BCtzung
    meters:
      - name: my_meter
        type: custom
        power: # power (W)
          source: # plugin type
          # ...
        soc: # optional battery soc (%)
          source: # plugin type
          # ...
     */


// const batterySizeInKWh = 10; // in kWh
// const maxDischargeRateInKW = 5; // in kW
// const maxChargeRateInKW = 4; // in kW
// const chargingEfficiency = 0.97;
// const dischargingEfficiency = 0.96;

// let SoC = 0; // in kWh

const setup = (config) => {
    const app = express();
    const port = config.port;

    app.get('/', (req, res) => {
        res.send('Hello World!')
    });

    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    });
};

// timespan in seconds
// consumption in kWh
// production in kWh
const update = (timespan, residualEnergyInKWh, next) => {
    if (residualEnergyInKWh >= 0) {
        // if battery can be charged with the surplus from PV

        // calculate the average production of the surplus to know if its at least possible to load the battery with the amount of kW
        let averageProductionInKW = residualEnergyInKWh / timespan * 3600;

        // trim the charging power if the average production was higher than the max. charge rate of the battery
        if (averageProductionInKW > maxChargeRateInKW) {
            averageProductionInKW = maxChargeRateInKW;
        }
    
        // calculate back the possible energy the battery is able to charge
        const chargedEnergy = averageProductionInKW * timespan / 3600;

        // charge the battery with a small amount of loss
        SoC += chargedEnergy * chargingEfficiency;

        // we can not charge more than the actual capacity of the battery
        if (SoC > batterySizeInKWh) {

            // set battery fully loaded
            SoC = batterySizeInKWh;
            
            // saldo is passed is fed into the grid
            const chargingSaldo = SoC - batterySizeInKWh;

            // calculate back the battery efficiency of the saldo
            chargingSaldo /= chargingEfficiency;

            next(timespan, chargingSaldo, next);
        }

        // otherwise, we simly needed all of the produced energy for the battery
        next(timespan, 0, next);
    } else {
        // battery is drained
        
        // calculate the average consumption to know if its at least possible to discharge the battery with the amount of kW
        let averageConsumptionInKW = -residualEnergyInKWh / timespan * 3600;

        // trim the discharging power if the average consumption was higher than the max. discharge rate of the battery
        if (averageConsumptionInKW > maxDischargeRateInKW) {
            averageConsumptionInKW = maxDischargeRateInKW;
        }
    
        // calculate back the possible energy the battery is able to discharge
        const dischargedEnergy = averageConsumptionInKW * timespan / 3600;

        // discharge the battery with a small amount of loss
        SoC -= dischargedEnergy * dischargingEfficiency;

        // we can not discharge more than the battery delivers
        if (SoC < 0) {

            // battery is empty
            SoC = 0;
            
            // saldo is consumed from grid
            const dischargingSaldo = SoC;

            // calculate back the discharging efficiency
            dischargingSaldo /= dischargingEfficiency;

            next(timespan, dischargingSaldo, next);
        }

        // otherwise, we simly delivered all of the needed energy from the battery
        next(timespan, 0, next);
    }
};

/*
// evcc settings:
// https://docs.evcc.io/docs/devices/meters/#generische-unterst%C3%BCtzung
meters:
  - name: my_meter
    type: custom
    power: # power (W)
      source: # plugin type
      # ...
    soc: # optional battery soc (%)
      source: # plugin type
      # ...
 */