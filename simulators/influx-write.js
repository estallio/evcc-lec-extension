import {InfluxDB, Point} from '@influxdata/influxdb-client'

export default class InfluxWrite {
    constructor(config) {
        let url = config.url;
        let token = config.token;
        let org = config.org;
        let bucket = config.bucket;

        const client = new InfluxDB({url, token});
        this.writeClient = client.getWriteApi(org, bucket)
    }

    async updateDB(deviceName, measurementName, measurementType, value, dt) {

        let point = new Point(measurementName)
            .tag('device', deviceName)
            .floatField(measurementType, value)
            .timestamp(dt)

        await this.writeClient.writePoint(point)
        await this.writeClient.flush()
    }
}
