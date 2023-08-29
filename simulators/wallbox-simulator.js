// go-e Charger simulator

// API fields used in evcc
// Fwv   string    // firmware version
// Car   int       // car status
// Alw   bool      // allow charging
// Amp   int       // current [A]
// Err   int       // error
// Eto   uint64    // energy total Wh
// Psm   int       // phase switching
// Trx   int       // transaction
// Nrg   []float64 // voltage, current, power
// Wh    float64   // energy [Wh]
// Cards []Card    // RFID cards

// description from go-e API
// fwv	R	string	Constant	FW_VERSION
// car	R	optional<uint8>	Status	carState, null if internal error (Unknown/Error=0, Idle=1, Charging=2, WaitCar=3, Complete=4, Error=5)
// alw	R	bool	Status	Darf das Auto derzeit laden?
// amp	R/W	uint8	Config	requestedCurrent in Ampere, used for display on LED ring and logic calculations
// err	R	optional<uint8>	Status	error, null if internal error (None = 0, FiAc = 1, FiDc = 2, Phase = 3, Overvolt = 4, Overamp = 5, Diode = 6, PpInvalid = 7, GndInvalid = 8, ContactorStuck = 9, ContactorMiss = 10, FiUnknown = 11, Unknown = 12, Overtemp = 13, NoComm = 14, StatusLockStuckOpen = 15, StatusLockStuckLocked = 16, Reserved20 = 20, Reserved21 = 21, Reserved22 = 22, Reserved23 = 23, Reserved24 = 24)
// eto	R	uint64	Status	energy_total, measured in Wh
// psm	R/W	uint8	Config	phaseSwitchMode (Auto=0, Force_1=1, Force_3=2)
// trx	R/W	optional<uint8>	Status	transaction, null when no transaction, 0 when without card, otherwise cardIndex + 1 (1: 0. card, 2: 1. card, ...)
// nrg	R	array	Status	energy array, U (L1, L2, L3, N), I (L1, L2, L3), P (L1, L2, L3, N, Total), pf (L1, L2, L3, N)
// wh	R	double	Status	energy in Wh since car connected
// cards	R/W	array	Config

let config = {
    fwv: '051.4',
    car: 1,                         // Unknown/Error=0, Idle=1, Charging=2, WaitCar=3, Complete=4, Error=5
    alw: false,                     // allowed
    amp: 8,                         // Writeable: ampere
    err: null,                      // errors
    eto: 2000,                      // energy total in Wh
    psm: 0,                         // Writeable: phaseSwitchMode (Auto=0, Force_1=1, Force_3=2)
    trx: null,                      // transaction with RFID card
    nrg: [                          // array of 16 values
        100, 100, 100, 100,         // U (L1, L2, L3, N)
        100, 100, 100,              // I (L1, L2, L3)
        100, 100, 100, 100, 100,    // P (L1, L2, L3, N, Total)
        100, 100, 100, 100,         // pf (L1, L2, L3, N)
    ],
    wh: 5000.00,                    // total in Wh
    cards: [],                      // RFID cards
};

// read
// http://192.168.0.75/api/status
// http://192.168.0.75/api/status?filter=rfb,alw,acu,adi,amp

// write
// http://192.168.0.75/api/set?fna="mein charger"
// http://192.168.0.75/api/set?amp=16
// http://192.168.0.75/api/set?dwo=null
// http://192.168.0.75/api/set?dwo=3.14
// http://192.168.0.75/api/set?bac=false&sdp=true


import express from 'express';

const app = express()
const port = 3000

app.get('/api/status', (req, res) => {
    res.send('Hello World!')
})

app.post('/api/status', (req, res) => {
    res.send('Hello World!')
})




app.get('/something', (req, res) => {
    req.query.color1 === 'red'  // true
    req.query.color2 === 'blue' // true
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})