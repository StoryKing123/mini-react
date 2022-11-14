import {
    SyncLane,
    claimNextTransitionLane,
    markRootUpdated,
    mergeLanes,
    removeLanes,
    addFiberToLanesMap,
    NoTimestamp,
    NoLanes,
    NoLane,
    getNextLanes,
    markStarvedLanesAsExpired,
    getHighestPriorityLane,
    includesSomeLane,
    getTransitionsForLanes,
} from "./ReactFiberLane";
import { ConcurrentRoot, LegacyRoot } from "./ReactRootTags";
import {
    getCurrentEventPriority,
    supportsMicrotasks,
    scheduleMicrotask,
    noTimeout,
    cancelTimeout,
} from "./reactFiberHostConfig";
import { ConcurrentMode, NoMode, ProfileMode } from "./reactTypeOfMode";
import { requestCurrentTransition, NoTransition } from "./reactFiberTransition";
import { getCurrentUpdatePriority } from "./reactEventPriorities";
import {
    scheduleSyncCallback,
    flushSyncCallbacks,
} from "./reactFiberSyncTaskQueue";
import {
    scheduleCallback as Scheduler_scheduleCallback,
    cancelCallback as Scheduler_cancelCallback,
    now,
} from "./scheduler";
import {
    deferRenderPhaseUpdateToNextBatch,
    enableProfilerTimer,
    enableProfilerNestedUpdatePhase,
} from "shared/reactFeatureFlags";
import ReactSharedInternals from "shared/reactSharedInternals";
import { ContextOnlyDispatcher, resetHooksAfterThrow } from "./reactFiberHooks";
import {
    createWorkInProgress,
    // assignFiberPropertiesInDEV,
    // resetWorkInProgress,
} from "./reactFiber";
import { finishQueueingConcurrentUpdates } from "./reactFiberConcurrentUpdates";
import { resetContextDependencies } from "./reactFiberNewContext";
import {
    resetWakeableStateAfterEachAttempt,
    resetThenableStateOnCompletion,
    trackSuspendedWakeable,
    suspendedThenableDidResolve,
    isTrackingSuspendedThenable,
} from "./reactFiberWakeable";
import { Incomplete } from "./reactFiberFlags";

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
let rootWithPendingPassiveEffects = null; // FiberRoot | null

const {
    ReactCurrentDispatcher,
    ReactCurrentOwner,
    ReactCurrentBatchConfig,
    ReactCurrentActQueue,
} = ReactSharedInternals;

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
let nestedUpdateCount = 0;

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
        // warnAboutRenderPhaseUpdatesInDEV(fiber);

        // Track lanes that were updated during the render phase
        workInProgressRootRenderPhaseUpdatedLanes = mergeLanes(
            workInProgressRootRenderPhaseUpdatedLanes,
            lane
        );
    } else {
        // This is a normal update, scheduled from outside the render phase. For
        // example, during an input event.
        // if (enableUpdaterTracking) {
        if (false) {
            if (isDevToolsPresent) {
                addFiberToLanesMap(root, fiber, lane);
            }
        }
        // warnIfUpdatesNotWrappedWithActDEV(fiber);

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
            !ReactCurrentActQueue.isBatchingLegacy
        ) {
            // Flush the synchronous work now, unless we're already working or inside
            // a batch. This is intentionally inside scheduleUpdateOnFiber instead of
            // scheduleCallbackForFiber to preserve the ability to schedule a callback
            // without immediately flushing it. We only do this for user-initiated
            // updates, to preserve historical behavior of legacy mode.
            resetRenderTimer();
            // flushSyncCallbacksOnlyInLegacyMode();
        }
    }
}

// Use this function to schedule a task for a root. There's only one task per
// root; if a task was already scheduled, we'll check to make sure the priority
// of the existing task is the same as the priority of the next level that the
// root has work on. This function is called on every update, and right before
// exiting a task.
//function ensureRootIsScheduled(root: FiberRoot, currentTime: number)
function ensureRootIsScheduled(root, currentTime) {
    const existingCallbackNode = root.callbackNode;

    // Check if any lanes are being starved by other work. If so, mark them as
    // expired so we know to work on those next.
    markStarvedLanesAsExpired(root, currentTime);

    // Determine the next lanes to work on, and their priority.
    const nextLanes = getNextLanes(
        root,
        root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes
    );

    if (nextLanes === NoLanes) {
        // Special case: There's nothing to work on.
        if (existingCallbackNode !== null) {
            cancelCallback(existingCallbackNode);
        }
        root.callbackNode = null;
        root.callbackPriority = NoLane;
        return;
    }

    // We use the highest priority lane to represent the priority of the callback.
    const newCallbackPriority = getHighestPriorityLane(nextLanes);

    // Check if there's an existing task. We may be able to reuse it.
    const existingCallbackPriority = root.callbackPriority;
    if (
        existingCallbackPriority === newCallbackPriority &&
        // Special case related to `act`. If the currently scheduled task is a
        // Scheduler task, rather than an `act` task, cancel it and re-scheduled
        // on the `act` queue.
        !(
            false &&
            // __DEV__ &&
            ReactCurrentActQueue.current !== null &&
            existingCallbackNode !== fakeActCallbackNode
        )
    ) {
        // if (__DEV__) {
        if (false) {
            // If we're going to re-use an existing task, it needs to exist.
            // Assume that discrete update microtasks are non-cancellable and null.
            // TODO: Temporary until we confirm this warning is not fired.
            // if (
            //     existingCallbackNode == null &&
            //     existingCallbackPriority !== SyncLane
            // ) {
            //     console.error(
            //         "Expected scheduled callback to exist. This error is likely caused by a bug in React. Please file an issue."
            //     );
            // }
        }
        // The priority hasn't changed. We can reuse the existing task. Exit.
        return;
    }

    if (existingCallbackNode != null) {
        // Cancel the existing callback. We'll schedule a new one below.
        cancelCallback(existingCallbackNode);
    }

    // Schedule a new callback.
    let newCallbackNode;
    if (newCallbackPriority === SyncLane) {
        // Special case: Sync React callbacks are scheduled on a special
        // internal queue
        if (root.tag === LegacyRoot) {
            // if (__DEV__ && ReactCurrentActQueue.isBatchingLegacy !== null) {
            //     ReactCurrentActQueue.didScheduleLegacyUpdate = true;
            // }
            scheduleLegacySyncCallback(performSyncWorkOnRoot.bind(null, root));
        } else {
            scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
        }
        if (supportsMicrotasks) {
            // Flush the queue in a microtask.
            if (false && ReactCurrentActQueue.current !== null) {
                // Inside `act`, use our internal `act` queue so that these get flushed
                // at the end of the current scope even when using the sync version
                // of `act`.
                // ReactCurrentActQueue.current.push(flushSyncCallbacks);
            } else {
                scheduleMicrotask(() => {
                    // In Safari, appending an iframe forces microtasks to run.
                    // https://github.com/facebook/react/issues/22459
                    // We don't support running callbacks in the middle of render
                    // or commit so we need to check against that.
                    if (
                        (executionContext & (RenderContext | CommitContext)) ===
                        NoContext
                    ) {
                        // Note that this would still prematurely flush the callbacks
                        // if this happens outside render or commit phase (e.g. in an event).
                        flushSyncCallbacks();
                    }
                });
            }
        } else {
            // Flush the queue in an Immediate task.
            scheduleCallback(ImmediateSchedulerPriority, flushSyncCallbacks);
        }
        newCallbackNode = null;
    } else {
        let schedulerPriorityLevel;
        switch (lanesToEventPriority(nextLanes)) {
            case DiscreteEventPriority:
                schedulerPriorityLevel = ImmediateSchedulerPriority;
                break;
            case ContinuousEventPriority:
                schedulerPriorityLevel = UserBlockingSchedulerPriority;
                break;
            case DefaultEventPriority:
                schedulerPriorityLevel = NormalSchedulerPriority;
                break;
            case IdleEventPriority:
                schedulerPriorityLevel = IdleSchedulerPriority;
                break;
            default:
                schedulerPriorityLevel = NormalSchedulerPriority;
                break;
        }
        newCallbackNode = scheduleCallback(
            schedulerPriorityLevel,
            performConcurrentWorkOnRoot.bind(null, root)
        );
    }

    root.callbackPriority = newCallbackPriority;
    root.callbackNode = newCallbackNode;
}

function cancelCallback(callbackNode) {
    // In production, always call Scheduler. This function will be stripped out.
    return Scheduler_cancelCallback(callbackNode);
}

function markRootSuspended(root, suspendedLanes) {
    // When suspending, we should always exclude lanes that were pinged or (more
    // rarely, since we try to avoid it) updated during the render phase.
    // TODO: Lol maybe there's a better way to factor this besides this
    // obnoxiously named function :)
    suspendedLanes = removeLanes(suspendedLanes, workInProgressRootPingedLanes);
    suspendedLanes = removeLanes(
        suspendedLanes,
        workInProgressRootInterleavedUpdatedLanes
    );
    markRootSuspended_dontCallThisOneDirectly(root, suspendedLanes);
}

function resetRenderTimer() {
    workInProgressRootRenderTargetTime = now() + RENDER_TIMEOUT_MS;
}

export function throwIfInfiniteUpdateLoopDetected() {
    if (nestedUpdateCount > NESTED_UPDATE_LIMIT) {
        nestedUpdateCount = 0;
        nestedPassiveUpdateCount = 0;
        rootWithNestedUpdates = null;
        rootWithPassiveNestedUpdates = null;

        throw new Error(
            "Maximum update depth exceeded. This can happen when a component " +
                "repeatedly calls setState inside componentWillUpdate or " +
                "componentDidUpdate. React limits the number of nested updates to " +
                "prevent infinite loops."
        );
    }
}

/**
 * function batchedUpdates<A, R>(fn: A => R, a: A): R
 * @param {*} fn
 * @param {*} R
 * @param {*} a
 * @returns
 */
export function batchedUpdates(fn, a) {
    const prevExecutionContext = executionContext;
    executionContext |= BatchedContext;
    try {
        return fn(a);
    } finally {
        executionContext = prevExecutionContext;
        // If there were legacy sync updates, flush them at the end of the outer
        // most batchedUpdates-like method.
        if (
            executionContext === NoContext &&
            // Treat `act` as if it's inside `batchedUpdates`, even in legacy mode.
            // !(__DEV__ && ReactCurrentActQueue.isBatchingLegacy)
            !(false && ReactCurrentActQueue.isBatchingLegacy)
        ) {
            resetRenderTimer();
            flushSyncCallbacksOnlyInLegacyMode();
        }
    }
}

// This is the entry point for synchronous tasks that don't go
// through Scheduler
function performSyncWorkOnRoot(root) {
    if (enableProfilerTimer && enableProfilerNestedUpdatePhase) {
        syncNestedUpdateFlag();
    }

    if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
        throw new Error("Should not already be working.");
    }

    flushPassiveEffects();

    let lanes = getNextLanes(root, NoLanes);
    if (!includesSomeLane(lanes, SyncLane)) {
        // There's no remaining sync work left.
        ensureRootIsScheduled(root, now());
        return null;
    }

    console.log("before render root sync");
    return null;
    let exitStatus = renderRootSync(root, lanes);

    if (root.tag !== LegacyRoot && exitStatus === RootErrored) {
        // If something threw an error, try rendering one more time. We'll render
        // synchronously to block concurrent data mutations, and we'll includes
        // all pending updates are included. If it still fails after the second
        // attempt, we'll give up and commit the resulting tree.
        const originallyAttemptedLanes = lanes;
        const errorRetryLanes = getLanesToRetrySynchronouslyOnError(
            root,
            originallyAttemptedLanes
        );
        if (errorRetryLanes !== NoLanes) {
            lanes = errorRetryLanes;
            exitStatus = recoverFromConcurrentError(
                root,
                originallyAttemptedLanes,
                errorRetryLanes
            );
        }
    }

    if (exitStatus === RootFatalErrored) {
        const fatalError = workInProgressRootFatalError;
        prepareFreshStack(root, NoLanes);
        markRootSuspended(root, lanes);
        ensureRootIsScheduled(root, now());
        throw fatalError;
    }

    if (exitStatus === RootDidNotComplete) {
        throw new Error("Root did not complete. This is a bug in React.");
    }

    // We now have a consistent tree. Because this is a sync render, we
    // will commit it even if something suspended.
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLanes = lanes;
    commitRoot(
        root,
        workInProgressRootRecoverableErrors,
        workInProgressTransitions
    );

    // Before exiting, make sure there's a callback scheduled for the next
    // pending level.
    ensureRootIsScheduled(root, now());

    return null;
}

/**
 *
 * @returns boolean
 */
export function flushPassiveEffects() {
    // Returns whether passive effects were flushed.
    // TODO: Combine this check with the one in flushPassiveEFfectsImpl. We should
    // probably just combine the two functions. I believe they were only separate
    // in the first place because we used to wrap it with
    // `Scheduler.runWithPriority`, which accepts a function. But now we track the
    // priority within React itself, so we can mutate the variable directly.
    if (rootWithPendingPassiveEffects !== null) {
        // Cache the root since rootWithPendingPassiveEffects is cleared in
        // flushPassiveEffectsImpl
        const root = rootWithPendingPassiveEffects;
        // Cache and clear the remaining lanes flag; it must be reset since this
        // method can be called from various places, not always from commitRoot
        // where the remaining lanes are known
        const remainingLanes = pendingPassiveEffectsRemainingLanes;
        pendingPassiveEffectsRemainingLanes = NoLanes;

        const renderPriority = lanesToEventPriority(pendingPassiveEffectsLanes);
        const priority = lowerEventPriority(
            DefaultEventPriority,
            renderPriority
        );
        const prevTransition = ReactCurrentBatchConfig.transition;
        const previousPriority = getCurrentUpdatePriority();

        try {
            ReactCurrentBatchConfig.transition = null;
            setCurrentUpdatePriority(priority);
            return flushPassiveEffectsImpl();
        } finally {
            setCurrentUpdatePriority(previousPriority);
            ReactCurrentBatchConfig.transition = prevTransition;

            // Once passive effects have run for the tree - giving components a
            // chance to retain cache instances they use - release the pooled
            // cache at the root (if there is one)
            releaseRootPooledCache(root, remainingLanes);
        }
    }
    return false;
}

/**
 *
 * @param {*} root FiberRoot
 * @param {*} lanes Lanes
 * @returns
 */
function renderRootSync(root, lanes) {
    const prevExecutionContext = executionContext;
    executionContext |= RenderContext;
    const prevDispatcher = pushDispatcher();

    // If the root or lanes have changed, throw out the existing stack
    // and prepare a fresh one. Otherwise we'll continue where we left off.
    if (
        workInProgressRoot !== root ||
        workInProgressRootRenderLanes !== lanes
    ) {
        // if (enableUpdaterTracking) {
        if (false) {
            // if (isDevToolsPresent) {
            //     const memoizedUpdaters = root.memoizedUpdaters;
            //     if (memoizedUpdaters.size > 0) {
            //         restorePendingUpdaters(root, workInProgressRootRenderLanes);
            //         memoizedUpdaters.clear();
            //     }
            // At this point, move Fibers that scheduled the upcoming work from the Map to the Set.
            // If we bailout on this work, we'll move them back (like above).
            // It's important to move them now in case the work spawns more work at the same priority with different updaters.
            // That way we can keep the current update and future updates separate.
            //     movePendingFibersToMemoized(root, lanes);
            // }
        }

        workInProgressTransitions = getTransitionsForLanes(root, lanes);
        prepareFreshStack(root, lanes);
    }

    // if (__DEV__) {
    //     if (enableDebugTracing) {
    //         logRenderStarted(lanes);
    //     }
    // }

    // if (enableSchedulingProfiler) {
    //     markRenderStarted(lanes);
    // }

    do {
        try {
            workLoopSync();
            break;
        } catch (thrownValue) {
            handleThrow(root, thrownValue);
        }
    } while (true);
    resetContextDependencies();

    executionContext = prevExecutionContext;
    popDispatcher(prevDispatcher);

    if (workInProgress !== null) {
        // This is a sync render, so we should have finished the whole tree.
        throw new Error(
            "Cannot commit an incomplete root. This error is likely caused by a " +
                "bug in React. Please file an issue."
        );
    }

    // if (__DEV__) {
    //     if (enableDebugTracing) {
    //         logRenderStopped();
    //     }
    // }

    // if (enableSchedulingProfiler) {
    //     markRenderStopped();
    // }

    // Set this to null to indicate there's no in-progress render.
    workInProgressRoot = null;
    workInProgressRootRenderLanes = NoLanes;

    return workInProgressRootExitStatus;
}

function pushDispatcher() {
    const prevDispatcher = ReactCurrentDispatcher.current;
    ReactCurrentDispatcher.current = ContextOnlyDispatcher;
    if (prevDispatcher === null) {
        // The React isomorphic package does not include a default dispatcher.
        // Instead the first renderer will lazily attach one, in order to give
        // nicer error messages.
        return ContextOnlyDispatcher;
    } else {
        return prevDispatcher;
    }
}

/**
 *
 * @param {*} root FiberRoot
 * @param {*} lanes Lanes
 * @returns Fiber
 */
function prepareFreshStack(root, lanes) {
    root.finishedWork = null;
    root.finishedLanes = NoLanes;

    const timeoutHandle = root.timeoutHandle;
    if (timeoutHandle !== noTimeout) {
        // The root previous suspended and scheduled a timeout to commit a fallback
        // state. Now that we have additional work, cancel the timeout.
        root.timeoutHandle = noTimeout;
        // $FlowFixMe Complains noTimeout is not a TimeoutID, despite the check above
        cancelTimeout(timeoutHandle);
    }

    if (workInProgress !== null) {
        let interruptedWork = workInProgress.return;
        while (interruptedWork !== null) {
            const current = interruptedWork.alternate;
            unwindInterruptedWork(
                current,
                interruptedWork,
                workInProgressRootRenderLanes
            );
            interruptedWork = interruptedWork.return;
        }
        resetWakeableStateAfterEachAttempt();
        resetThenableStateOnCompletion();
    }
    workInProgressRoot = root;
    const rootWorkInProgress = createWorkInProgress(root.current, null);
    workInProgress = rootWorkInProgress;
    workInProgressRootRenderLanes = renderLanes = lanes;
    workInProgressIsSuspended = false;
    workInProgressThrownValue = null;
    workInProgressRootDidAttachPingListener = false;
    workInProgressRootExitStatus = RootInProgress;
    workInProgressRootFatalError = null;
    workInProgressRootSkippedLanes = NoLanes;
    workInProgressRootInterleavedUpdatedLanes = NoLanes;
    workInProgressRootRenderPhaseUpdatedLanes = NoLanes;
    workInProgressRootPingedLanes = NoLanes;
    workInProgressRootConcurrentErrors = null;
    workInProgressRootRecoverableErrors = null;

    finishQueueingConcurrentUpdates();

    // if (__DEV__) {
    //     ReactStrictModeWarnings.discardPendingWarnings();
    // }

    return rootWorkInProgress;
}

function handleThrow(root, thrownValue) {
    // Reset module-level state that was set during the render phase.
    resetContextDependencies();
    resetHooksAfterThrow();
    // resetCurrentDebugFiberInDEV();
    // TODO: I found and added this missing line while investigating a
    // separate issue. Write a regression test using string refs.
    ReactCurrentOwner.current = null;

    // Setting this to `true` tells the work loop to unwind the stack instead
    // of entering the begin phase. It's called "suspended" because it usually
    // happens because of Suspense, but it also applies to errors. Think of it
    // as suspending the execution of the work loop.
    workInProgressIsSuspended = true;
    workInProgressThrownValue = thrownValue;

    const erroredWork = workInProgress;
    if (erroredWork === null) {
        // This is a fatal error
        workInProgressRootExitStatus = RootFatalErrored;
        workInProgressRootFatalError = thrownValue;
        return;
    }

    const isWakeable =
        thrownValue !== null &&
        typeof thrownValue === "object" &&
        typeof thrownValue.then === "function";

    if (enableProfilerTimer && erroredWork.mode & ProfileMode) {
        // Record the time spent rendering before an error was thrown. This
        // avoids inaccurate Profiler durations in the case of a
        // suspended render.
        stopProfilerTimerIfRunningAndRecordDelta(erroredWork, true);
    }

    // if (enableSchedulingProfiler) {
    //     markComponentRenderStopped();
    //     if (isWakeable) {
    //         const wakeable = thrownValue;
    //         markComponentSuspended(
    //             erroredWork,
    //             wakeable,
    //             workInProgressRootRenderLanes
    //         );
    //     } else {
    //         markComponentErrored(
    //             erroredWork,
    //             thrownValue,
    //             workInProgressRootRenderLanes
    //         );
    //     }
    // }

    if (isWakeable) {
        const wakeable = thrownValue;

        trackSuspendedWakeable(wakeable);
    }
}

// The work loop is an extremely hot path. Tell Closure not to inline it.
/** @noinline */
function workLoopSync() {
    // Perform work without checking if we need to yield between fiber.

    if (workInProgressIsSuspended) {
        // The current work-in-progress was already attempted. We need to unwind
        // it before we continue the normal work loop.
        const thrownValue = workInProgressThrownValue;
        workInProgressIsSuspended = false;
        workInProgressThrownValue = null;
        if (workInProgress !== null) {
            resumeSuspendedUnitOfWork(workInProgress, thrownValue);
        }
    }

    while (workInProgress !== null) {
        performUnitOfWork(workInProgress);
    }
}

/**
 *
 * @param {*} unitOfWork Fiber
 * @param {*} thrownValue mixed
 * @returns
 */
function resumeSuspendedUnitOfWork(unitOfWork, thrownValue) {
    // This is a fork of performUnitOfWork specifcally for resuming a fiber that
    // just suspended. In some cases, we may choose to retry the fiber immediately
    // instead of unwinding the stack. It's a separate function to keep the
    // additional logic out of the work loop's hot path.

    const wasPinged = suspendedThenableDidResolve();
    resetWakeableStateAfterEachAttempt();

    if (!wasPinged) {
        // The thenable wasn't pinged. Return to the normal work loop. This will
        // unwind the stack, and potentially result in showing a fallback.
        resetThenableStateOnCompletion();

        const returnFiber = unitOfWork.return;
        if (returnFiber === null || workInProgressRoot === null) {
            // Expected to be working on a non-root fiber. This is a fatal error
            // because there's no ancestor that can handle it; the root is
            // supposed to capture all errors that weren't caught by an error
            // boundary.
            workInProgressRootExitStatus = RootFatalErrored;
            workInProgressRootFatalError = thrownValue;
            // Set `workInProgress` to null. This represents advancing to the next
            // sibling, or the parent if there are no siblings. But since the root
            // has no siblings nor a parent, we set it to null. Usually this is
            // handled by `completeUnitOfWork` or `unwindWork`, but since we're
            // intentionally not calling those, we need set it here.
            // TODO: Consider calling `unwindWork` to pop the contexts.
            workInProgress = null;
            return;
        }

        try {
            // Find and mark the nearest Suspense or error boundary that can handle
            // this "exception".
            throwException(
                workInProgressRoot,
                returnFiber,
                unitOfWork,
                thrownValue,
                workInProgressRootRenderLanes
            );
        } catch (error) {
            // We had trouble processing the error. An example of this happening is
            // when accessing the `componentDidCatch` property of an error boundary
            // throws an error. A weird edge case. There's a regression test for this.
            // To prevent an infinite loop, bubble the error up to the next parent.
            workInProgress = returnFiber;
            throw error;
        }

        // Return to the normal work loop.
        completeUnitOfWork(unitOfWork);
        return;
    }

    // The work-in-progress was immediately pinged. Instead of unwinding the
    // stack and potentially showing a fallback, unwind only the last stack frame,
    // reset the fiber, and try rendering it again.
    const current = unitOfWork.alternate;
    unwindInterruptedWork(current, unitOfWork, workInProgressRootRenderLanes);
    unitOfWork = workInProgress = resetWorkInProgress(unitOfWork, renderLanes);

    setCurrentDebugFiberInDEV(unitOfWork);

    let next;
    if (enableProfilerTimer && (unitOfWork.mode & ProfileMode) !== NoMode) {
        startProfilerTimer(unitOfWork);
        next = beginWork(current, unitOfWork, renderLanes);
        stopProfilerTimerIfRunningAndRecordDelta(unitOfWork, true);
    } else {
        next = beginWork(current, unitOfWork, renderLanes);
    }

    // The begin phase finished successfully without suspending. Reset the state
    // used to track the fiber while it was suspended. Then return to the normal
    // work loop.
    resetThenableStateOnCompletion();

    resetCurrentDebugFiberInDEV();
    unitOfWork.memoizedProps = unitOfWork.pendingProps;
    if (next === null) {
        // If this doesn't spawn new work, complete the current work.
        completeUnitOfWork(unitOfWork);
    } else {
        workInProgress = next;
    }

    ReactCurrentOwner.current = null;
}

/**
 *
 * @param {*} unitOfWork Fiber
 * @returns void
 */
function completeUnitOfWork(unitOfWork) {
    return;
    // Attempt to complete the current unit of work, then move to the next
    // sibling. If there are no more siblings, return to the parent fiber.
    let completedWork = unitOfWork;
    do {
        // The current, flushed, state of this fiber is the alternate. Ideally
        // nothing should rely on this, but relying on it here means that we don't
        // need an additional field on the work in progress.
        const current = completedWork.alternate;
        const returnFiber = completedWork.return;

        // Check if the work completed or if something threw.
        if ((completedWork.flags & Incomplete) === NoFlags) {
            setCurrentDebugFiberInDEV(completedWork);
            let next;
            if (
                !enableProfilerTimer ||
                (completedWork.mode & ProfileMode) === NoMode
            ) {
                next = completeWork(current, completedWork, renderLanes);
            } else {
                startProfilerTimer(completedWork);
                next = completeWork(current, completedWork, renderLanes);
                // Update render duration assuming we didn't error.
                stopProfilerTimerIfRunningAndRecordDelta(completedWork, false);
            }
            resetCurrentDebugFiberInDEV();

            if (next !== null) {
                // Completing this fiber spawned new work. Work on that next.
                workInProgress = next;
                return;
            }
        } else {
            // This fiber did not complete because something threw. Pop values off
            // the stack without entering the complete phase. If this is a boundary,
            // capture values if possible.
            const next = unwindWork(current, completedWork, renderLanes);

            // Because this fiber did not complete, don't reset its lanes.

            if (next !== null) {
                // If completing this work spawned new work, do that next. We'll come
                // back here again.
                // Since we're restarting, remove anything that is not a host effect
                // from the effect tag.
                next.flags &= HostEffectMask;
                workInProgress = next;
                return;
            }

            if (
                enableProfilerTimer &&
                (completedWork.mode & ProfileMode) !== NoMode
            ) {
                // Record the render duration for the fiber that errored.
                stopProfilerTimerIfRunningAndRecordDelta(completedWork, false);

                // Include the time spent working on failed children before continuing.
                let actualDuration = completedWork.actualDuration;
                let child = completedWork.child;
                while (child !== null) {
                    actualDuration += child.actualDuration;
                    child = child.sibling;
                }
                completedWork.actualDuration = actualDuration;
            }

            if (returnFiber !== null) {
                // Mark the parent fiber as incomplete and clear its subtree flags.
                returnFiber.flags |= Incomplete;
                returnFiber.subtreeFlags = NoFlags;
                returnFiber.deletions = null;
            } else {
                // We've unwound all the way to the root.
                workInProgressRootExitStatus = RootDidNotComplete;
                workInProgress = null;
                return;
            }
        }

        const siblingFiber = completedWork.sibling;
        if (siblingFiber !== null) {
            // If there is more work to do in this returnFiber, do that next.
            workInProgress = siblingFiber;
            return;
        }
        // Otherwise, return to the parent
        completedWork = returnFiber;
        // Update the next thing we're working on in case something throws.
        workInProgress = completedWork;
    } while (completedWork !== null);

    // We've reached the root.
    if (workInProgressRootExitStatus === RootInProgress) {
        workInProgressRootExitStatus = RootCompleted;
    }
}
