import {InfluxDB, Point} from '@influxdata/influxdb-client'

export default class InfluxWrite {
  constructor(config) {
    this.url = config.url;
    this.token = config.token;
    this.org = config.org;
    this.bucket = config.bucket;
  }

  updateDB(deviceName, measurementName, measurementType, value, dt) {
    let url = this.url
    let token = this.token
    let org = this.org
    let bucket = this.bucket

    const client = new InfluxDB({url, token});
    let writeClient = client.getWriteApi(org, bucket);
    let point = new Point(measurementName)
      .tag('device', deviceName)
      .floatField(measurementType, value)
      .timestamp(dt)

    writeClient.writePoint(point)

    writeClient.close()
  }
}
