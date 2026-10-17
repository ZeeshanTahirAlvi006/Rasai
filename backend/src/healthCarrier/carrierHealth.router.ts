import { Router } from "express"
import { validate } from "../middleware/validate"
import {
    checkAvailabilityController,
    acquireExecutionPermissionController,
    recordSuccessController,
    recordFailureController,
    executeWithBreakerController,
    trackShipmentController,
    getAllCarriersHealthController,
    resetCarrierBreakerController,
    forceTripBreakerController
} from "./carrierHealth.controller"
import {
    CarrierParamSchema,
    RecordFailureSchema,
    ExecuteBreakerSchema,
    TrackShipmentSchema
} from "./carrierHealth.schema"


const carrierRouter = Router()

// get overall summary of all carriers
carrierRouter.get("/summary",
    getAllCarriersHealthController
)

// to check the availability of the carrier provider
carrierRouter.get("/:carrier/availability",
    validate(CarrierParamSchema),
    checkAvailabilityController
)
//to check the persmission of the carrier
carrierRouter.post("/:carrier/permission",
    validate(CarrierParamSchema),
    acquireExecutionPermissionController
)
// to record the success of the carrier
carrierRouter.post("/:carrier/success",
    validate(CarrierParamSchema),
    recordSuccessController
)
//to record the failure of the carrier
carrierRouter.post("/:carrier/failure",
    validate(RecordFailureSchema),
    recordFailureController
)
// to execute the request with the breaker pattern
carrierRouter.post("/:carrier/execute",
    validate(ExecuteBreakerSchema),
    executeWithBreakerController
)
//to track shipment under breaker
carrierRouter.post("/track",
    validate(TrackShipmentSchema),
    trackShipmentController
)
// to manually reset a carrier circuit breaker
carrierRouter.post("/:carrier/reset",
    validate(CarrierParamSchema),
    resetCarrierBreakerController
)
// to manually force trip a carrier circuit breaker
carrierRouter.post("/:carrier/trip",
    validate(CarrierParamSchema),
    forceTripBreakerController
)

export default carrierRouter