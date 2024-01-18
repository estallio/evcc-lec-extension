#!/bin/bash

for i in {1..20} ; do
    ./evcc --config ./simulators/evcc-configs/evcc-Household-$i.yml &
done
