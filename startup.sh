#!/bin/bash

for i in {1..20} ; do
    ./evcc --config ./simulators/evcc-configs/evcc-Household-$i.yml &
     sleep 0.1
done


for i in {1..4} ; do
    ./evcc --config ./simulators/evcc-configs/evcc-Community-$i.yml &
    sleep 0.1
done
