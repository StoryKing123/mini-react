import { NoMode, ConcurrentMode, StrictLegacyMode, StrictEffectsMode } from './reactTypeOfMode'
import { } from './reactWorkTags'
import { ConcurrentRoot, LegacyRoot } from './ReactRootTags';
import { getCurrentUpdatePriority,getCurrentEventPriority } from './reactEventPriorities'
import { SyncLane, NoLanes, NoLane, pickArbitraryLane } from './reactFiberLane'

import {
    NoFlags,
    Incomplete,
    StoreConsistency,
    HostEffectMask,
    ForceClientRender,
    BeforeMutationMask,
    MutationMask,
    LayoutMask,
    PassiveMask,
    PlacementDEV,
    Visibility,
    MountPassiveDev,
    MountLayoutDev,
} from './ReactFiberFlags';

export const NoContext = /*             */ 0b000;
const BatchedContext = /*               */ 0b001;
export const RenderContext = /*         */ 0b010;
export const CommitContext = /*         */ 0b100;


const RootInProgress = 0;
const RootFatalErrored = 1;
const RootErrored = 2;
const RootSuspended = 3;
const RootSuspendedWithDelay = 4;
const RootCompleted = 5;
const RootDidNotComplete = 6;


// Describes where we are in the React execution stack
let executionContext = NoContext;
// The root we're working on
let workInProgressRoot = null;
// The fiber we're working on
let workInProgress = null;
// The lanes we're rendering
let workInProgressRootRenderLanes = NoLanes;

const NotSuspended = 0;
const SuspendedOnError = 1;
const SuspendedOnData = 2;
const SuspendedOnImmediate = 3;
const SuspendedOnDeprecatedThrowPromise = 4;
const SuspendedAndReadyToUnwind = 5;
const SuspendedOnHydration = 6;


// When this is true, the work-in-progress fiber just suspended (or errored) and
// we've yet to unwind the stack. In some cases, we may yield to the main thread
// after this happens. If the fiber is pinged before we resume, we can retry
// immediately instead of unwinding the stack.
let workInProgressSuspendedReason = NotSuspended;
let workInProgressThrownValue = null;

// Whether a ping listener was attached during this render. This is slightly
// different that whether something suspended, because we don't add multiple
// listeners to a promise we've already seen (per root and lane).
let workInProgressRootDidAttachPingListener = false;

export let renderLanes = NoLanes;

// Whether to root completed, errored, suspended, etc.
let workInProgressRootExitStatus = RootInProgress;
// A fatal error, if one is thrown
let workInProgressRootFatalError = null;
// The work left over by components that were visited during this render. Only
// includes unprocessed updates, not work in bailed out children.
let workInProgressRootSkippedLanes = NoLanes;
// Lanes that were updated (in an interleaved event) during this render.
let workInProgressRootInterleavedUpdatedLanes = NoLanes;
// Lanes that were updated during the render phase (*not* an interleaved event).
let workInProgressRootRenderPhaseUpdatedLanes = NoLanes;
// Lanes that were pinged (in an interleaved event) during this render.
let workInProgressRootPingedLanes = NoLanes;
// Errors that are thrown during the render phase.
let workInProgressRootConcurrentErrors =
    null;
// These are errors that we recovered from without surfacing them to the UI.
// We will log them once the tree commits.
let workInProgressRootRecoverableErrors =
    null;

// The most recent time we committed a fallback. This lets us ensure a train
// model where we don't commit new loading states in too quick succession.
let globalMostRecentFallbackTime = 0;
const FALLBACK_THROTTLE_MS = 500;

// The absolute time for when we should start giving up on rendering
// more and prefer CPU suspense heuristics instead.
let workInProgressRootRenderTargetTime = Infinity;
// How long a render is supposed to take before we start following CPU
// suspense heuristics and opt out of rendering more content.
const RENDER_TIMEOUT_MS = 500;

let workInProgressTransitions = null;
export function getWorkInProgressTransitions() {
    return workInProgressTransitions;
}

let currentPendingTransitionCallbacks = null;
let currentEndTime = null;

export function requestUpdateLane(fiber) {
    // Special cases
    const mode = fiber.mode;
    if ((mode & ConcurrentMode) === NoMode) {
        return (SyncLane);
    } else if (
        (executionContext & RenderContext) !== NoContext &&
        workInProgressRootRenderLanes !== NoLanes
    ) {
        // This is a render phase update. These are not officially supported. The
        // old behavior is to give this the same "thread" (lanes) as
        // whatever is currently rendering. So if you call `setState` on a component
        // that happens later in the same render, it will flush. Ideally, we want to
        // remove the special case and treat them as if they came from an
        // interleaved event. Regardless, this pattern is not officially supported.
        // This behavior is only a fallback. The flag only exists until we can roll
        // out the setState warning, since existing code might accidentally rely on
        // the current behavior.
        return pickArbitraryLane(workInProgressRootRenderLanes);
    }

    // const isTransition = requestCurrentTransition() !== NoTransition;
    // if (isTransition) {

    //     // The algorithm for assigning an update to a lane should be stable for all
    //     // updates at the same priority within the same event. To do this, the
    //     // inputs to the algorithm must be the same.
    //     //
    //     // The trick we use is to cache the first of each of these inputs within an
    //     // event. Then reset the cached values once we can be sure the event is
    //     // over. Our heuristic for that is whenever we enter a concurrent work loop.
    //     if (currentEventTransitionLane === NoLane) {
    //         // All transitions within the same event are assigned the same lane.
    //         currentEventTransitionLane = claimNextTransitionLane();
    //     }
    //     return currentEventTransitionLane;
    // }

    // Updates originating inside certain React methods, like flushSync, have
    // their priority set by tracking it with a context variable.
    //
    // The opaque type returned by the host config is internally a lane, so we can
    // use that directly.
    // TODO: Move this type conversion to the event priority module.
    const updateLane = (getCurrentUpdatePriority());
    if (updateLane !== NoLane) {
        return updateLane;
    }

    // This update originated outside React. Ask the host environment for an
    // appropriate priority, based on the type of event.
    //
    // The opaque type returned by the host config is internally a lane, so we can
    // use that directly.
    // TODO: Move this type conversion to the event priority module.
    const eventLane = (getCurrentEventPriority());
    return eventLane;
}