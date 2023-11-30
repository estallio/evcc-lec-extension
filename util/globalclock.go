package util

import (
	"sync"
	"time"

	"github.com/benbjohnson/clock"
)

var lock = &sync.Mutex{}

var globalClock clock.Clock

var logger = NewLogger("clock")

func GetInstance() clock.Clock {
	if globalClock == nil {
		lock.Lock()
		defer lock.Unlock()
		if globalClock == nil {
			ConfigureInstance(1*time.Second, 1*time.Second, time.Now())
		} else {
			logger.INFO.Printf("Single instance already created.")
		}
	} else {
		logger.INFO.Printf("Single instance already created.")
	}

	return globalClock
}

func ConfigureInstance(simulationTimeGranularity time.Duration, simulationStepSize time.Duration, simulationStartTime time.Time) {
	globalClock = clock.NewMock()
	globalClock.(*clock.Mock).Set(simulationStartTime)

	if simulationTimeGranularity == 1*time.Second && simulationStepSize == 1*time.Second {
		logger.INFO.Printf("Creating single instance now: Regular Clock with time %s", globalClock.Now().String())
	} else {
		logger.INFO.Printf("Creating single instance now: Fake Clock with time %s", globalClock.Now().String())

		ticker := time.Tick(simulationTimeGranularity)
		go func() {
			for {
				select {
				case <-ticker:
					globalClock.(*clock.Mock).Add(simulationStepSize)
				}
			}
		}()
	}
}
