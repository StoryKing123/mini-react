import {
    enableUpdaterTracking,
    allowConcurrentByDefault,
    enableTransitionTracing,
} from "shared/ReactFeatureFlags";

// Lane values below should be kept in sync with getLabelForLane(), used by react-devtools-timeline.
// If those values are changed that package should be rebuilt and redeployed.

export const TotalLanes = 31;

export const NoLanes = /*                        */ 0b0000000000000000000000000000000;
export const NoLane = /*                          */ 0b0000000000000000000000000000000;

export const SyncLane = /*                        */ 0b0000000000000000000000000000001;

export const InputContinuousHydrationLane = /*    */ 0b0000000000000000000000000000010;
export const InputContinuousLane = /*             */ 0b0000000000000000000000000000100;

export const DefaultHydrationLane = /*            */ 0b0000000000000000000000000001000;
export const DefaultLane = /*                     */ 0b0000000000000000000000000010000;

const TransitionHydrationLane = /*                */ 0b0000000000000000000000000100000;
const TransitionLanes = /*                       */ 0b0000000001111111111111111000000;
const TransitionLane1 = /*                        */ 0b0000000000000000000000001000000;
const TransitionLane2 = /*                        */ 0b0000000000000000000000010000000;
const TransitionLane3 = /*                        */ 0b0000000000000000000000100000000;
const TransitionLane4 = /*                        */ 0b0000000000000000000001000000000;
const TransitionLane5 = /*                        */ 0b0000000000000000000010000000000;
const TransitionLane6 = /*                        */ 0b0000000000000000000100000000000;
const TransitionLane7 = /*                        */ 0b0000000000000000001000000000000;
const TransitionLane8 = /*                        */ 0b0000000000000000010000000000000;
const TransitionLane9 = /*                        */ 0b0000000000000000100000000000000;
const TransitionLane10 = /*                       */ 0b0000000000000001000000000000000;
const TransitionLane11 = /*                       */ 0b0000000000000010000000000000000;
const TransitionLane12 = /*                       */ 0b0000000000000100000000000000000;
const TransitionLane13 = /*                       */ 0b0000000000001000000000000000000;
const TransitionLane14 = /*                       */ 0b0000000000010000000000000000000;
const TransitionLane15 = /*                       */ 0b0000000000100000000000000000000;
const TransitionLane16 = /*                       */ 0b0000000001000000000000000000000;

const RetryLanes = /*                            */ 0b0000111110000000000000000000000;
const RetryLane1 = /*                             */ 0b0000000010000000000000000000000;
const RetryLane2 = /*                             */ 0b0000000100000000000000000000000;
const RetryLane3 = /*                             */ 0b0000001000000000000000000000000;
const RetryLane4 = /*                             */ 0b0000010000000000000000000000000;
const RetryLane5 = /*                             */ 0b0000100000000000000000000000000;

export const SomeRetryLane = RetryLane1;

export const SelectiveHydrationLane = /*          */ 0b0001000000000000000000000000000;

const NonIdleLanes = /*                          */ 0b0001111111111111111111111111111;

export const IdleHydrationLane = /*               */ 0b0010000000000000000000000000000;
export const IdleLane = /*                        */ 0b0100000000000000000000000000000;

export const OffscreenLane = /*                   */ 0b1000000000000000000000000000000;

export const NoTimestamp = -1;

let nextTransitionLane = TransitionLane1;
let nextRetryLane = RetryLane1;

// export function createLaneMap<T>(initial: T)Map<T> {
export function createLaneMap(initial) {
    const laneMap = [];
    for (let i = 0; i < TotalLanes; i++) {
        laneMap.push(initial);
    }
    return laneMap;
}

export function claimNextTransitionLane() {
    // Cycle through the lanes, assigning each new transition to the next lane.
    // In most cases, this means every transition gets its own lane, until we
    // run out of lanes and cycle back to the beginning.
    const lane = nextTransitionLane;
    nextTransitionLane <<= 1;
    if ((nextTransitionLane & TransitionLanes) === NoLanes) {
        nextTransitionLane = TransitionLane1;
    }
    return lane;
}

// export function markRootUpdated(
//     root: FiberRoot,
//     updateLane: Lane,
//     eventTime: number
// ) {}
export function markRootUpdated(root, updateLane, eventTime) {
    root.pendingLanes |= updateLane;
    // If there are any suspended transitions, it's possible this new update
    // could unblock them. Clear the suspended lanes so that we can try rendering
    // them again.
    //
    // TODO: We really only need to unsuspend only lanes that are in the
    // `subtreeLanes` of the updated fiber, or the update lanes of the return
    // path. This would exclude suspended updates in an unrelated sibling tree,
    // since there's no way for this update to unblock it.
    //
    // We don't do this if the incoming update is idle, because we never process
    // idle updates until after all the regular updates have finished; there's no
    // way it could unblock a transition.
    if (updateLane !== IdleLane) {
        root.suspendedLanes = NoLanes;
        root.pingedLanes = NoLanes;
    }

    const eventTimes = root.eventTimes;
    const index = laneToIndex(updateLane);
    // We can always overwrite an existing timestamp because we prefer the most
    // recent event, and we assume time is monotonically increasing.
    eventTimes[index] = eventTime;
}

function laneToIndex(lane) {
    return pickArbitraryLaneIndex(lane);
}

function pickArbitraryLaneIndex(lanes) {
    // return 31 - clz32(lanes);
    return 31 - Math.clz32(lanes);
}

function computeExpirationTime(lane, currentTime) {
    switch (lane) {
        case SyncLane:
        case InputContinuousHydrationLane:
        case InputContinuousLane:
            // User interactions should expire slightly more quickly.
            //
            // NOTE: This is set to the corresponding constant as in Scheduler.js.
            // When we made it larger, a product metric in www regressed, suggesting
            // there's a user interaction that's being starved by a series of
            // synchronous updates. If that theory is correct, the proper solution is
            // to fix the starvation. However, this scenario supports the idea that
            // expiration times are an important safeguard when starvation
            // does happen.
            return currentTime + 250;
        case DefaultHydrationLane:
        case DefaultLane:
        case TransitionHydrationLane:
        case TransitionLane1:
        case TransitionLane2:
        case TransitionLane3:
        case TransitionLane4:
        case TransitionLane5:
        case TransitionLane6:
        case TransitionLane7:
        case TransitionLane8:
        case TransitionLane9:
        case TransitionLane10:
        case TransitionLane11:
        case TransitionLane12:
        case TransitionLane13:
        case TransitionLane14:
        case TransitionLane15:
        case TransitionLane16:
            return currentTime + 5000;
        case RetryLane1:
        case RetryLane2:
        case RetryLane3:
        case RetryLane4:
        case RetryLane5:
            // TODO: Retries should be allowed to expire if they are CPU bound for
            // too long, but when I made this change it caused a spike in browser
            // crashes. There must be some other underlying bug; not super urgent but
            // ideally should figure out why and fix it. Unfortunately we don't have
            // a repro for the crashes, only detected via production metrics.
            return NoTimestamp;
        case SelectiveHydrationLane:
        case IdleHydrationLane:
        case IdleLane:
        case OffscreenLane:
            // Anything idle priority or lower should never expire.
            return NoTimestamp;
        default:
            return NoTimestamp;
    }
}

export function mergeLanes(a, b) {
    return a | b;
}
export function removeLanes(set, subset) {
    return set & ~subset;
}

export function intersectLanes(a, b) {
    return a & b;
}

export function addFiberToLanesMap(root, fiber, lanes) {
    if (!enableUpdaterTracking) {
        return;
    }
    if (!isDevToolsPresent) {
        return;
    }
    const pendingUpdatersLaneMap = root.pendingUpdatersLaneMap;
    while (lanes > 0) {
        const index = laneToIndex(lanes);
        const lane = 1 << index;

        const updaters = pendingUpdatersLaneMap[index];
        updaters.add(fiber);

        lanes &= ~lane;
    }
}

export function isTransitionLane(lane) {
    return (lane & TransitionLanes) !== NoLanes;
}

/**
 *
 * @param {*} root FiberRoot
 * @param {*} entangledLanes Lanes
 */
export function markRootEntangled(root, entangledLanes) {
    // In addition to entangling each of the given lanes with each other, we also
    // have to consider _transitive_ entanglements. For each lane that is already
    // entangled with *any* of the given lanes, that lane is now transitively
    // entangled with *all* the given lanes.
    //
    // Translated: If C is entangled with A, then entangling A with B also
    // entangles C with B.
    //
    // If this is hard to grasp, it might help to intentionally break this
    // function and look at the tests that fail in ReactTransition-test.js. Try
    // commenting out one of the conditions below.

    const rootEntangledLanes = (root.entangledLanes |= entangledLanes);
    const entanglements = root.entanglements;
    let lanes = rootEntangledLanes;
    while (lanes) {
        const index = pickArbitraryLaneIndex(lanes);
        const lane = 1 << index;
        if (
            // Is this one of the newly entangled lanes?
            (lane & entangledLanes) |
            // Is this lane transitively entangled with the newly entangled lanes?
            (entanglements[index] & entangledLanes)
        ) {
            entanglements[index] |= entangledLanes;
        }
        lanes &= ~lane;
    }
}

/**
 *
 * @param {*} root FiberRoot
 * @param {*} currentTime number
 */
export function markStarvedLanesAsExpired(root, currentTime) {
    // TODO: This gets called every time we yield. We can optimize by storing
    // the earliest expiration time on the root. Then use that to quickly bail out
    // of this function.

    const pendingLanes = root.pendingLanes;
    const suspendedLanes = root.suspendedLanes;
    const pingedLanes = root.pingedLanes;
    const expirationTimes = root.expirationTimes;

    // Iterate through the pending lanes and check if we've reached their
    // expiration time. If so, we'll assume the update is being starved and mark
    // it as expired to force it to finish.
    //
    // We exclude retry lanes because those must always be time sliced, in order
    // to unwrap uncached promises.
    // TODO: Write a test for this
    let lanes = pendingLanes & ~RetryLanes;
    while (lanes > 0) {
        const index = pickArbitraryLaneIndex(lanes);
        const lane = 1 << index;

        const expirationTime = expirationTimes[index];
        if (expirationTime === NoTimestamp) {
            // Found a pending lane with no expiration time. If it's not suspended, or
            // if it's pinged, assume it's CPU-bound. Compute a new expiration time
            // using the current time.
            if (
                (lane & suspendedLanes) === NoLanes ||
                (lane & pingedLanes) !== NoLanes
            ) {
                // Assumes timestamps are monotonically increasing.
                expirationTimes[index] = computeExpirationTime(
                    lane,
                    currentTime
                );
            }
        } else if (expirationTime <= currentTime) {
            // This lane expired
            root.expiredLanes |= lane;
        }

        lanes &= ~lane;
    }
}

/**
 *
 * @param {*} root FiberRoot
 * @param {*} wipLanes Lanes
 * @returns Lanes
 */
export function getNextLanes(root, wipLanes) {
    // Early bailout if there's no pending work left.
    const pendingLanes = root.pendingLanes;
    if (pendingLanes === NoLanes) {
        return NoLanes;
    }

    let nextLanes = NoLanes;

    const suspendedLanes = root.suspendedLanes;
    const pingedLanes = root.pingedLanes;

    // Do not work on any idle work until all the non-idle work has finished,
    // even if the work is suspended.
    const nonIdlePendingLanes = pendingLanes & NonIdleLanes;
    if (nonIdlePendingLanes !== NoLanes) {
        const nonIdleUnblockedLanes = nonIdlePendingLanes & ~suspendedLanes;
        if (nonIdleUnblockedLanes !== NoLanes) {
            nextLanes = getHighestPriorityLanes(nonIdleUnblockedLanes);
        } else {
            const nonIdlePingedLanes = nonIdlePendingLanes & pingedLanes;
            if (nonIdlePingedLanes !== NoLanes) {
                nextLanes = getHighestPriorityLanes(nonIdlePingedLanes);
            }
        }
    } else {
        // The only remaining work is Idle.
        const unblockedLanes = pendingLanes & ~suspendedLanes;
        if (unblockedLanes !== NoLanes) {
            nextLanes = getHighestPriorityLanes(unblockedLanes);
        } else {
            if (pingedLanes !== NoLanes) {
                nextLanes = getHighestPriorityLanes(pingedLanes);
            }
        }
    }

    if (nextLanes === NoLanes) {
        // This should only be reachable if we're suspended
        // TODO: Consider warning in this path if a fallback timer is not scheduled.
        return NoLanes;
    }

    // If we're already in the middle of a render, switching lanes will interrupt
    // it and we'll lose our progress. We should only do this if the new lanes are
    // higher priority.
    if (
        wipLanes !== NoLanes &&
        wipLanes !== nextLanes &&
        // If we already suspended with a delay, then interrupting is fine. Don't
        // bother waiting until the root is complete.
        (wipLanes & suspendedLanes) === NoLanes
    ) {
        const nextLane = getHighestPriorityLane(nextLanes);
        const wipLane = getHighestPriorityLane(wipLanes);
        if (
            // Tests whether the next lane is equal or lower priority than the wip
            // one. This works because the bits decrease in priority as you go left.
            nextLane >= wipLane ||
            // Default priority updates should not interrupt transition updates. The
            // only difference between default updates and transition updates is that
            // default updates do not support refresh transitions.
            (nextLane === DefaultLane &&
                (wipLane & TransitionLanes) !== NoLanes)
        ) {
            // Keep working on the existing in-progress tree. Do not interrupt.
            return wipLanes;
        }
    }

    if (
        allowConcurrentByDefault &&
        (root.current.mode & ConcurrentUpdatesByDefaultMode) !== NoMode
    ) {
        // Do nothing, use the lanes as they were assigned.
    } else if ((nextLanes & InputContinuousLane) !== NoLanes) {
        // When updates are sync by default, we entangle continuous priority updates
        // and default updates, so they render in the same batch. The only reason
        // they use separate lanes is because continuous updates should interrupt
        // transitions, but default updates should not.
        nextLanes |= pendingLanes & DefaultLane;
    }

    // Check for entangled lanes and add them to the batch.
    //
    // A lane is said to be entangled with another when it's not allowed to render
    // in a batch that does not also include the other lane. Typically we do this
    // when multiple updates have the same source, and we only want to respond to
    // the most recent event from that source.
    //
    // Note that we apply entanglements *after* checking for partial work above.
    // This means that if a lane is entangled during an interleaved event while
    // it's already rendering, we won't interrupt it. This is intentional, since
    // entanglement is usually "best effort": we'll try our best to render the
    // lanes in the same batch, but it's not worth throwing out partially
    // completed work in order to do it.
    // TODO: Reconsider this. The counter-argument is that the partial work
    // represents an intermediate state, which we don't want to show to the user.
    // And by spending extra time finishing it, we're increasing the amount of
    // time it takes to show the final state, which is what they are actually
    // waiting for.
    //
    // For those exceptions where entanglement is semantically important, like
    // useMutableSource, we should ensure that there is no partial work at the
    // time we apply the entanglement.
    const entangledLanes = root.entangledLanes;
    if (entangledLanes !== NoLanes) {
        const entanglements = root.entanglements;
        let lanes = nextLanes & entangledLanes;
        while (lanes > 0) {
            const index = pickArbitraryLaneIndex(lanes);
            const lane = 1 << index;

            nextLanes |= entanglements[index];

            lanes &= ~lane;
        }
    }

    return nextLanes;
}

/**
 *
 * @param {*} lanes  Lanes | Lane
 * @returns Lanes
 */
function getHighestPriorityLanes(lanes) {
    switch (getHighestPriorityLane(lanes)) {
        case SyncLane:
            return SyncLane;
        case InputContinuousHydrationLane:
            return InputContinuousHydrationLane;
        case InputContinuousLane:
            return InputContinuousLane;
        case DefaultHydrationLane:
            return DefaultHydrationLane;
        case DefaultLane:
            return DefaultLane;
        case TransitionHydrationLane:
            return TransitionHydrationLane;
        case TransitionLane1:
        case TransitionLane2:
        case TransitionLane3:
        case TransitionLane4:
        case TransitionLane5:
        case TransitionLane6:
        case TransitionLane7:
        case TransitionLane8:
        case TransitionLane9:
        case TransitionLane10:
        case TransitionLane11:
        case TransitionLane12:
        case TransitionLane13:
        case TransitionLane14:
        case TransitionLane15:
        case TransitionLane16:
            return lanes & TransitionLanes;
        case RetryLane1:
        case RetryLane2:
        case RetryLane3:
        case RetryLane4:
        case RetryLane5:
            return lanes & RetryLanes;
        case SelectiveHydrationLane:
            return SelectiveHydrationLane;
        case IdleHydrationLane:
            return IdleHydrationLane;
        case IdleLane:
            return IdleLane;
        case OffscreenLane:
            return OffscreenLane;
        default:
            // This shouldn't be reachable, but as a fallback, return the entire bitmask.
            return lanes;
    }
}

/**
 *
 * @param {*} Lanes
 * @returns Lane
 */
export function getHighestPriorityLane(lanes) {
    return lanes & -lanes;
}

/**
 *
 * @param {*} a Lanes | Lane
 * @param {*} b Lanes | Lane
 * @returns
 */
export function includesSomeLane(a, b) {
    return (a & b) !== NoLanes;
}

/**
 *
 * @param {*} root FiberRoot
 * @param {*} lanes Lane | Lanes
 * @returns Array<Transition> | null
 */

export function getTransitionsForLanes(root, lanes) {
    if (!enableTransitionTracing) {
        return null;
    }

    const transitionsForLanes = [];
    while (lanes > 0) {
        const index = laneToIndex(lanes);
        const lane = 1 << index;
        const transitions = root.transitionLanes[index];
        if (transitions !== null) {
            transitions.forEach((transition) => {
                transitionsForLanes.push(transition);
            });
        }

        lanes &= ~lane;
    }

    if (transitionsForLanes.length === 0) {
        return null;
    }

    return transitionsForLanes;
}

