export default {
  households: [
    {
      name: 'Household 1',
      port: '7070',
      pvs: [{
        file: './production_values/pv_sim_export_4000_0_45.json',
        port: 9001
      }],
      evs: [{
        chargingEfficiency: 0.95,
        maxChargeRateInKW: 22,
        batterySizeInKWh: 50,
        averageConsumptionPer100KM: 16,
        initialSoCInKWh: 20,
        locationFile: './car_values/House 2 1/Results/CarLocation.Car 2, 22kW Charging Power, avg. Speed 30 km h.HH1.json',
        distanceFile: './car_values/House 2 1/Results/DrivingDistance.Car 2, 22kW Charging Power, avg. Speed 30 km h.HH1.json',
        port: 9002
      }],
      wallboxes: [{
        maxCurrent: 16, // in A
        port: 9003
      }],
      batteries: [{
        batterySizeInKWh: 10,
        initSoCinKWh: 8,
        maxDischargeRateInKW: 5,
        maxChargeRateInKW: 4,
        chargingEfficiency: 0.95,
        dischargingEfficiency: 0.92,
        port: 9004
      }],
      consumptions: [{
        file: 'consumption_values/House_1-HH_1.json',
        port: 9005
      }],
      influx: {
        url: "http://localhost:8086",
        bucket: "sim",
        token: "zkF_MBAO4dcMB65cSmgz8LBmow7dUYa38iQtXmo9mAOR6Yw4oEGINN1I8PFNapL-3E4tNR9ABSZIT5XhZjcLyQ==",
        org: "home"
      }
    }
  ]
};
