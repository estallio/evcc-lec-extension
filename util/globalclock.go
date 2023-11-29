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
			ConfigureInstance(1*time.Second, 1*time.Second)
		} else {
			logger.INFO.Printf("Single instance already created.")
		}
	} else {
		logger.INFO.Printf("Single instance already created.")
	}

	return globalClock
}

func ConfigureInstance(simulationTimeGranularity time.Duration, simulationStepSize time.Duration) {
	globalClock = clock.NewMock()
	globalClock.(*clock.Mock).Set(clock.New().Now())

	if simulationTimeGranularity == 1*time.Second && simulationStepSize == 1*time.Second {
		logger.INFO.Printf("Creating single instance now: Regular Clock")
	} else {
		logger.INFO.Printf("Creating single instance now: Fake Clock")

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
