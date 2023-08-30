import express from 'express';
import ArgumentParser from 'argparse';
import moment from "moment";
import bodyParser from "body-parser";

const app = express();

var textParser = bodyParser.text()

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

const parser = new ArgumentParser.ArgumentParser({description: 'Mocks API on port.'})

parser.add_argument('-p', '--port', {help: 'Port the app is listening to'});
parser.add_argument('-m', '--maxRange', {help: 'Max value of random value'});

const args = parser.parse_args()

if (args.port === undefined) {
  throw new Error("Undefined port");
}

if (args.maxRange === undefined) {
  args.maxRange = 100
} else {
  args.maxRange = Number.parseInt(args.maxRange)
}

app.get('/meter/currentconsumption', (req, res) => {
  const val = getRandomInt(args.maxRange)
  console.log(`New request at ${moment.utc(moment.now()).format()} form port ${args.port}, return value: ${val}`)
  res.json();
});

app.get('/', (req, res) => {
  const val = getRandomInt(args.maxRange)
  console.log(`New request at ${moment.utc(moment.now()).format()} form port ${args.port}, return value: ${val}`)
  res.json(val);
});

app.post('/charger/enable', textParser, (req, res) => {
  console.log(req.body)
  console.log(req.params)
  console.log(req.headers)
  res.send('ok')
})

app.listen(args.port, () => {
  console.log(`listening on port ${args.port}`);
})
