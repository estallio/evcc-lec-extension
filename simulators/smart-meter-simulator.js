import express from 'express';

export default class SmartMeter {
    constructor(config) {
        this.file = config.file;

        this.port = config.port;

        this.residualPower = 0;

        const app = express();

        app.get('/residualPower', (req, res) => {
            res.json(this.residualPower);
        });

        app.listen(this.port, () => {
            console.log(`smart meter simulator listening on port ${this.port}`);
        });
    }

    setResidualPower(residualPower) {
        this.residualPower = residualPower;
    }

    getResidualPower() {
        return this.residualPower;
    }
}
