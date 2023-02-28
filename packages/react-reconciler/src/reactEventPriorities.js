

import {
    NoLane,
    SyncLane,
    InputContinuousLane,
    DefaultLane,
    IdleLane,
    getHighestPriorityLane,
    includesNonIdleWork,
} from './reactFiberLane';


export const DiscreteEventPriority = SyncLane;
export const ContinuousEventPriority = InputContinuousLane;
export const DefaultEventPriority = DefaultLane;
export const IdleEventPriority = IdleLane;

let currentUpdatePriority = NoLane;

export function getCurrentUpdatePriority() {
    return currentUpdatePriority;
}

export function setCurrentUpdatePriority(newPriority) {
    currentUpdatePriority = newPriority;
}

export function runWithPriority(priority) {
    const previousPriority = currentUpdatePriority;
    try {
        currentUpdatePriority = priority;
        return fn();
    } finally {
        currentUpdatePriority = previousPriority;
    }
}

export function higherEventPriority(
    a,
    b,
) {
    return a !== 0 && a < b ? a : b;
}

export function lowerEventPriority(
    a,
    b,
)  {
    return a === 0 || a > b ? a : b;
}

export function isHigherEventPriority(
    a,
    b,
) {
    return a !== 0 && a < b;
}

export function lanesToEventPriority(lanes) {
    const lane = getHighestPriorityLane(lanes);
    if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
        return DiscreteEventPriority;
    }
    if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
        return ContinuousEventPriority;
    }
    if (includesNonIdleWork(lane)) {
        return DefaultEventPriority;
    }
    return IdleEventPriority;
}
