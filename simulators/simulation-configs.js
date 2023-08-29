export default {
    households: [
        {
            name: 'Household 1',
            pvs: [{
                file: './production_values/pv_sim_export_4000_0_45.json',
                port: 9001
            }],
            evs: [{
                batteryInKWh: 50,
                averageConsumptionPer100KM: 16,
                maxChargeRateInKW: 22,
                port: 9002
            }],
            wallboxes: [{
                maxCurrent: 16, // in A
                port: 9003
            }],
            batteries: [{
                batterySizeInKWh: 10,
                maxDischargeRateInKW: 5,
                maxChargeRateInKW: 4,
                chargingEfficiency: 0.95,
                dischargingEfficiency: 0.92,
                port: 9004
            }],
            consumption: [{
                file: 'consumption_values/House_1-HH_1.json',
                port: 9005
            }]
        }
    ]
};