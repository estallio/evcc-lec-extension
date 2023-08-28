const batterySizeInKWh = 50; // in kWh
const typicalConsumptionInKWh = 16; // kWh/100 KM
const maxChargeRateInKW = 22; // in kW
const chargingEfficiency = 0.95;

let SoC = 0; // in kWh

// gibt die wallbox zurück
let status = 'C'; // C=laden möglich; A=nicht angesteckt und kein laden möglich, mehr: https://evsim.gonium.net/#der-control-pilot-cp und https://evsim.gonium.net/#der-control-pilot-cp

// ev loads whatever wallbox delivers

const update = (timespan, chargeRateInKW) => {
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