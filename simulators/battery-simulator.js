import express from "express";

export default class Battery {
  constructor(config) {
    this.batterySizeInKWh = config.batterySizeInKWh;
    this.maxDischargeRateInKW = config.maxDischargeRateInKW;
    this.maxChargeRateInKW = config.maxChargeRateInKW;

    this.chargingEfficiency = config.chargingEfficiency;
    this.dischargingEfficiency = config.dischargingEfficiency;

    this.SoCInKWh = config.initSoCinKWh;

    this.currentPower = 0;

    this.port = config.port
    const app = express();

    app.get('/battery/currentpower', (req, res) => {
      res.json(this.currentPower);
    });

    app.get('/battery/soc', (req, res) => {
      res.json(this.SoCInKWh / this.batterySizeInKWh);
    });

    //TODO implement Battery energy
    app.get('/battery/energy', (req, res) => {
      res.json(0);
    });

    app.listen(this.port, () => {
      console.log(`consumption simulator listening on port ${this.port}`);
    })
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
      return residualEnergyInKWh + dischargedEnergy;
    }
  }

  getCurrentPower() {
    return this.currentPower;
  }

  getCurrentSoC() {
    return this.SoCInKWh / this.batterySizeInKWh
  }

  getCurrentSoCinKwH() {
    return this.SoCInKWh
  }
}
