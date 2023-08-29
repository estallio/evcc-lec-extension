import config from './simulation-configs.js';
import Battery from './battery-simulator.js';
import PV from './pv-simulator.js';
import Consumption from './consumption-simulator.js';

const { households } = config; 

// haushalt-verbrauch (fix) -> pv-produktion (fix) -> batterie -> ev
// 1. simulator triggered haus und sagt gib mir deinen verbrauch
// 2. simulator holt sich pv produktion
// 3. simulator triggered batterie mit der residual energy (mehrere batterien werden wie eine batterie gehandhabt)
// 4. batterie sendet die residual energy, die in das netz eingespeist wird

for (const house of households) {
    
    const pv = new PV(house.pvs[0]);

    const consumption = new Consumption(house.consumption[0]);

    for (let i = 0; i < 1000; i++)
        console.log(consumption.update(60));

    const battery = new Battery(house.batteries[0]);

    console.log('battery soc: ', battery.SoCInKWh);
    console.log(battery.update(3600, 15));
    console.log('battery soc: ', battery.SoCInKWh);
    console.log(battery.update(3600, -15));
    console.log('battery soc: ', battery.SoCInKWh);
}