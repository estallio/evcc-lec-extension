package util

import (
	"sync"
	"time"

	"github.com/benbjohnson/clock"
)

var logger = NewLogger("clock")

var lock = &sync.Mutex{}

var globalClock clock.Clock
var stepSize time.Duration

func ConfigureGlobalClock(simulationStepSize time.Duration, simulationStartTime time.Time) {
	globalClock = clock.NewMock()
	globalClock.(*clock.Mock).Set(simulationStartTime)

	stepSize = simulationStepSize

	logger.INFO.Printf("Creating Global Clock instance with time %s", globalClock.Now().String())
}

func GetGlobalClock() clock.Clock {
	if globalClock == nil {
		lock.Lock()
		defer lock.Unlock()

		if globalClock == nil {
			ConfigureGlobalClock(1*time.Second, time.Now())
		} else {
			logger.INFO.Printf("Global Clock instance was already created.")
		}
	}

	return globalClock
}

func ForwardGlobalClock() {
	globalClock.(*clock.Mock).Add(stepSize)
}
