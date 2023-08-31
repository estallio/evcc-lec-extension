#!/bin/bash

for i in {1..3} ; do
    ./evcc --config ./simulators/evcc-configs/evcc-Household-$i.yml &
done
