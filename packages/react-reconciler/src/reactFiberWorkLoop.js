import { SyncLane, claimNextTransitionLane } from "./ReactFiberLane";
import { ConcurrentMode } from "./reactTypeOfMode";
import { requestCurrentTransition } from "./reactFiberTransition";
import { getCurrentUpdatePriority } from "./reactEventPriorities";

export const NoContext = /*             */ 0b000;
const BatchedContext = /*               */ 0b001;
const RenderContext = /*                */ 0b010;
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

// When this is true, the work-in-progress fiber just suspended (or errored) and
// we've yet to unwind the stack. In some cases, we may yield to the main thread
// after this happens. If the fiber is pinged before we resume, we can retry
// immediately instead of unwinding the stack.
let workInProgressIsSuspended = false;
let workInProgressThrownValue = null;

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
let workInProgressRootConcurrentErrors = null;
// These are errors that we recovered from without surfacing them to the UI.
// We will log them once the tree commits.
let workInProgressRootRecoverableErrors = null;

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

export function requestEventTime() {
    if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
        // We're inside React, so it's fine to read the actual time.
        return now();
    }
    // We're not inside React, so we may be in the middle of a browser event.
    if (currentEventTime !== NoTimestamp) {
        // Use the same start time for all updates until we enter React again.
        return currentEventTime;
    }
    // This is the first update since React yielded. Compute a new start time.
    currentEventTime = now();
    return currentEventTime;
}
let currentEventTime = NoTimestamp;
let currentEventTransitionLane = NoLanes;

export function requestUpdateLane(fiber) {
    const mode = fiber.mode;
    if ((mode & ConcurrentMode) === NoMode) {
        return SyncLane;
    }
    //ignore else if

    const isTransition = requestCurrentTransition() !== NoTransition;
    if (isTransition) {
        if (currentEventTransitionLane === NoLane) {
            currentEventTransitionLane = claimNextTransitionLane();
        }
        return currentEventTransitionLane;
    }
    const updateLane = getCurrentUpdatePriority();
    if (updateLane !== NoLane) {
        return updateLane;
    }

    const eventLane = getCurrentEventPriority();
    return eventLane;
}

function scheduleCallback(priorityLevel, callback) {
    return Scheduler_scheduleCallback(priorityLevel, callback);
}

export function isUnsafeClassRenderPhaseUpdate(fiber) {
    // Check if this is a render phase update. Only called by class components,
    // which special (deprecated) behavior for UNSAFE_componentWillReceive props.
    return (
        // TODO: Remove outdated deferRenderPhaseUpdateToNextBatch experiment. We
        // decided not to enable it.
        (!deferRenderPhaseUpdateToNextBatch ||
            (fiber.mode & ConcurrentMode) === NoMode) &&
        (executionContext & RenderContext) !== NoContext
    );
}

// export function scheduleUpdateOnFiber(
//     root: FiberRoot,
//     fiber: Fiber,
//     lane: Lane,
//     eventTime: number,
//   ) {}
export function scheduleUpdateOnFiber(root, fiber, lane, eventTime) {
    // Mark that the root has a pending update.
    markRootUpdated(root, lane, eventTime);
    if (
        (executionContext & RenderContext) !== NoLanes &&
        root === workInProgressRoot
    ) {
        // This update was dispatched during the render phase. This is a mistake
        // if the update originates from user space (with the exception of local
        // hook updates, which are handled differently and don't reach this
        // function), but there are some internal React features that use this as
        // an implementation detail, like selective hydration.
        warnAboutRenderPhaseUpdatesInDEV(fiber);

        // Track lanes that were updated during the render phase
        workInProgressRootRenderPhaseUpdatedLanes = mergeLanes(
            workInProgressRootRenderPhaseUpdatedLanes,
            lane
        );
    } else {
        // This is a normal update, scheduled from outside the render phase. For
        // example, during an input event.
        if (enableUpdaterTracking) {
            if (isDevToolsPresent) {
                addFiberToLanesMap(root, fiber, lane);
            }
        }
        warnIfUpdatesNotWrappedWithActDEV(fiber);

        if (enableProfilerTimer && enableProfilerNestedUpdateScheduledHook) {
            if (
                (executionContext & CommitContext) !== NoContext &&
                root === rootCommittingMutationOrLayoutEffects
            ) {
                if (fiber.mode & ProfileMode) {
                    let current = fiber;
                    while (current !== null) {
                        if (current.tag === Profiler) {
                            const { id, onNestedUpdateScheduled } =
                                current.memoizedProps;
                            if (typeof onNestedUpdateScheduled === "function") {
                                onNestedUpdateScheduled(id);
                            }
                        }
                        current = current.return;
                    }
                }
            }
        }

        if (enableTransitionTracing) {
            const transition = ReactCurrentBatchConfig.transition;
            if (transition !== null && transition.name != null) {
                if (transition.startTime === -1) {
                    transition.startTime = now();
                }

                addTransitionToLanesMap(root, transition, lane);
            }
        }

        if (root === workInProgressRoot) {
            // Received an update to a tree that's in the middle of rendering. Mark
            // that there was an interleaved update work on this root. Unless the
            // `deferRenderPhaseUpdateToNextBatch` flag is off and this is a render
            // phase update. In that case, we don't treat render phase updates as if
            // they were interleaved, for backwards compat reasons.
            if (
                deferRenderPhaseUpdateToNextBatch ||
                (executionContext & RenderContext) === NoContext
            ) {
                workInProgressRootInterleavedUpdatedLanes = mergeLanes(
                    workInProgressRootInterleavedUpdatedLanes,
                    lane
                );
            }
            if (workInProgressRootExitStatus === RootSuspendedWithDelay) {
                // The root already suspended with a delay, which means this render
                // definitely won't finish. Since we have a new update, let's mark it as
                // suspended now, right before marking the incoming update. This has the
                // effect of interrupting the current render and switching to the update.
                // TODO: Make sure this doesn't override pings that happen while we've
                // already started rendering.
                markRootSuspended(root, workInProgressRootRenderLanes);
            }
        }

        ensureRootIsScheduled(root, eventTime);
        if (
            lane === SyncLane &&
            executionContext === NoContext &&
            (fiber.mode & ConcurrentMode) === NoMode &&
            // Treat `act` as if it's inside `batchedUpdates`, even in legacy mode.
            !(__DEV__ && ReactCurrentActQueue.isBatchingLegacy)
        ) {
            // Flush the synchronous work now, unless we're already working or inside
            // a batch. This is intentionally inside scheduleUpdateOnFiber instead of
            // scheduleCallbackForFiber to preserve the ability to schedule a callback
            // without immediately flushing it. We only do this for user-initiated
            // updates, to preserve historical behavior of legacy mode.
            resetRenderTimer();
            flushSyncCallbacksOnlyInLegacyMode();
        }
    }
}
