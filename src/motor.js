/*
    Module which contains the Motor, Extruder and Stamper
    Device implementations.
*/
"use strict";

const { machineEvents } = require("./events");

const { delay, rotateToRight } = require("./utils");

const {
    OVEN_READY_EVENT,
    OVEN_OFF_EVENT,

    MOTOR_PAUSE_EVENT,
    MOTOR_OFF_EVENT,

    PULSE_EVENT,
    PULSE_OVEN_EVENT,
    PULSE_STAMPER_EVENT,
} = require("./constants");


const ConveyorBelt = Array(6).fill(null);
const ReadyBiscuits = new Array();


class Motor {
    _READY_BISCUIT_POSITION_ON_CONVEYOR = 5;

    constructor() {
        this._revolutions = 0;
        this._is_working = false;
        this._should_stop_motor = false;
        this._should_send_pulse_stamper = false;

        machineEvents.on(OVEN_READY_EVENT, this.on.bind(this));
        machineEvents.on(MOTOR_PAUSE_EVENT, this.pause.bind(this));
        machineEvents.on(MOTOR_OFF_EVENT, this.off.bind(this));

        this.extruder = new Extruder();
        this.stamper = new Stamper();
    }

    on() {
        console.log("\n--- Motor has been turned ON.");

        this._is_working = true;
        this._should_stop_motor = false;
        this._should_send_pulse_stamper = false;

        this._start();
    }

    pause() {
        console.log("\n--- Motor has been turned OFF.");

        this._is_working = false;
    }

    off() {
        console.log("\n--- Motor has been turned OFF.");

        if (this._revolutions === ReadyBiscuits.length) {
            this._stopMotorAndOven();
            return;
        }

        this._should_stop_motor = true;
        this._should_send_pulse_stamper = true;

        if (!this._is_working) {
            this._is_working = true;
            this._start();
        }
    }

    async pulse() {
        machineEvents.emit(PULSE_EVENT);

        await delay(5000);
    }

    async _start() {
        while (this._is_working) {
            if (!this._should_stop_motor && this._is_working) {
                await this.pulse();

                this._revolutions += 1;
            } else {
                if (this._should_send_pulse_stamper) {
                    machineEvents.emit(PULSE_STAMPER_EVENT);
                    this._should_send_pulse_stamper = false;
                }
                machineEvents.emit(PULSE_OVEN_EVENT);
            }

            let last_biscuit = ConveyorBelt[this._READY_BISCUIT_POSITION_ON_CONVEYOR];

            // shift all biscuits 1 position to the right
            rotateToRight(ConveyorBelt);

            if (last_biscuit) ReadyBiscuits.push(last_biscuit);

            console.log("\n--- Revolution:");
            console.log("--- On Conveyor: ", ConveyorBelt);
            console.log("--- Ready Biscuits: ", ReadyBiscuits);

            await delay(5000);

            if (this._should_stop_motor && this._revolutions === ReadyBiscuits.length) {
                this._stopMotorAndOven();
            }
        }
    }

    _stopMotorAndOven() {
        this._is_working = false;
        machineEvents.emit(OVEN_OFF_EVENT);
    }
}


class Extruder {
    _EXTRUDER_POSITION_ON_CONVEYOR = 0;

    constructor() {
        machineEvents.on(PULSE_EVENT, this.performAction.bind(this));
    }

    performAction() {
        console.log("--- Extruder >>> performAction");
        ConveyorBelt[this._EXTRUDER_POSITION_ON_CONVEYOR] = "..B..e..";
    }
}


class Stamper {
    _STAMPER_POSITION_ON_CONVEYOR = 0;

    constructor() {
        machineEvents.on(PULSE_EVENT, this.performAction.bind(this));
        machineEvents.on(PULSE_STAMPER_EVENT, this.performAction.bind(this));
    }

    performAction() {
        console.log("--- Stamper >>> performAction");

        if (ConveyorBelt[this._STAMPER_POSITION_ON_CONVEYOR]) {
            ConveyorBelt[this._STAMPER_POSITION_ON_CONVEYOR] += "s..";
        }
    }
}


module.exports = {
    Motor,

    ConveyorBelt,
};
