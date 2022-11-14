// import { DefaultLane, NoLane } from "./reactFiberLane";
import {
    NoLane,
    SyncLane,
    // InputContinuousLane,
    DefaultLane,
    // IdleLane,
    // getHighestPriorityLane,
    // includesNonIdleWork,
} from "./reactFiberLane";
let currentUpdatePriority = NoLane;
export const DefaultEventPriority = DefaultLane;
export const DiscreteEventPriority = SyncLane;
export function setCurrentUpdatePriority(newPriority) {
    currentUpdatePriority = newPriority;
}
export function getCurrentUpdatePriority() {
    return currentUpdatePriority;
}

// export function getCurrentEventPriority() {
//     return DefaultEventPriority;
// }
