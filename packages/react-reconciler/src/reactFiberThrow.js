/**
 *
 * @param {*} root FiberRoot
 * @param {*} returnFiber Fiber
 * @param {*} sourceFiber Fiber
 * @param {*} value mixed
 * @param {*} rootRenderLanes Lanes
 * @returns
 */
function throwException(
    root,
    returnFiber,
    sourceFiber,
    value,
    rootRenderLanes
) {
    // The source fiber did not complete.
    sourceFiber.flags |= Incomplete;

    if (enableUpdaterTracking) {
        if (isDevToolsPresent) {
            // If we have pending work still, restore the original updaters
            restorePendingUpdaters(root, rootRenderLanes);
        }
    }

    if (
        value !== null &&
        typeof value === "object" &&
        typeof value.then === "function"
    ) {
        // This is a wakeable. The component suspended.
        const wakeable = value;
        resetSuspendedComponent(sourceFiber, rootRenderLanes);

        if (__DEV__) {
            if (getIsHydrating() && sourceFiber.mode & ConcurrentMode) {
                markDidThrowWhileHydratingDEV();
            }
        }

        if (__DEV__) {
            if (enableDebugTracing) {
                if (sourceFiber.mode & DebugTracingMode) {
                    const name =
                        getComponentNameFromFiber(sourceFiber) || "Unknown";
                    logComponentSuspended(name, wakeable);
                }
            }
        }

        // Schedule the nearest Suspense to re-render the timed out view.
        const suspenseBoundary = getSuspenseHandler();
        if (suspenseBoundary !== null) {
            switch (suspenseBoundary.tag) {
                case SuspenseComponent: {
                    suspenseBoundary.flags &= ~ForceClientRender;
                    markSuspenseBoundaryShouldCapture(
                        suspenseBoundary,
                        returnFiber,
                        sourceFiber,
                        root,
                        rootRenderLanes
                    );
                    // Retry listener
                    //
                    // If the fallback does commit, we need to attach a different type of
                    // listener. This one schedules an update on the Suspense boundary to
                    // turn the fallback state off.
                    //
                    // Stash the wakeable on the boundary fiber so we can access it in the
                    // commit phase.
                    //
                    // When the wakeable resolves, we'll attempt to render the boundary
                    // again ("retry").
                    const wakeables = suspenseBoundary.updateQueue;
                    if (wakeables === null) {
                        suspenseBoundary.updateQueue = new Set([wakeable]);
                    } else {
                        wakeables.add(wakeable);
                    }
                    break;
                }
                case OffscreenComponent: {
                    if (suspenseBoundary.mode & ConcurrentMode) {
                        suspenseBoundary.flags |= ShouldCapture;
                        const offscreenQueue = suspenseBoundary.updateQueue;
                        if (offscreenQueue === null) {
                            const newOffscreenQueue = {
                                transitions: null,
                                markerInstances: null,
                                wakeables: new Set([wakeable]),
                            };
                            suspenseBoundary.updateQueue = newOffscreenQueue;
                        } else {
                            const wakeables = offscreenQueue.wakeables;
                            if (wakeables === null) {
                                offscreenQueue.wakeables = new Set([wakeable]);
                            } else {
                                wakeables.add(wakeable);
                            }
                        }
                        break;
                    }
                }
                // eslint-disable-next-line no-fallthrough
                default: {
                    throw new Error(
                        `Unexpected Suspense handler tag (${suspenseBoundary.tag}). This ` +
                            "is a bug in React."
                    );
                }
            }
            // We only attach ping listeners in concurrent mode. Legacy Suspense always
            // commits fallbacks synchronously, so there are no pings.
            if (suspenseBoundary.mode & ConcurrentMode) {
                attachPingListener(root, wakeable, rootRenderLanes);
            }
            return;
        } else {
            // No boundary was found. Unless this is a sync update, this is OK.
            // We can suspend and wait for more data to arrive.

            if (!includesSyncLane(rootRenderLanes)) {
                // This is not a sync update. Suspend. Since we're not activating a
                // Suspense boundary, this will unwind all the way to the root without
                // performing a second pass to render a fallback. (This is arguably how
                // refresh transitions should work, too, since we're not going to commit
                // the fallbacks anyway.)
                //
                // This case also applies to initial hydration.
                attachPingListener(root, wakeable, rootRenderLanes);
                renderDidSuspendDelayIfPossible();
                return;
            }

            // This is a sync/discrete update. We treat this case like an error
            // because discrete renders are expected to produce a complete tree
            // synchronously to maintain consistency with external state.
            const uncaughtSuspenseError = new Error(
                "A component suspended while responding to synchronous input. This " +
                    "will cause the UI to be replaced with a loading indicator. To " +
                    "fix, updates that suspend should be wrapped " +
                    "with startTransition."
            );

            // If we're outside a transition, fall through to the regular error path.
            // The error will be caught by the nearest suspense boundary.
            value = uncaughtSuspenseError;
        }
    } else {
        // This is a regular error, not a Suspense wakeable.
        if (getIsHydrating() && sourceFiber.mode & ConcurrentMode) {
            markDidThrowWhileHydratingDEV();
            const suspenseBoundary = getSuspenseHandler();
            // If the error was thrown during hydration, we may be able to recover by
            // discarding the dehydrated content and switching to a client render.
            // Instead of surfacing the error, find the nearest Suspense boundary
            // and render it again without hydration.
            if (suspenseBoundary !== null) {
                if ((suspenseBoundary.flags & ShouldCapture) === NoFlags) {
                    // Set a flag to indicate that we should try rendering the normal
                    // children again, not the fallback.
                    suspenseBoundary.flags |= ForceClientRender;
                }
                markSuspenseBoundaryShouldCapture(
                    suspenseBoundary,
                    returnFiber,
                    sourceFiber,
                    root,
                    rootRenderLanes
                );

                // Even though the user may not be affected by this error, we should
                // still log it so it can be fixed.
                queueHydrationError(
                    createCapturedValueAtFiber(value, sourceFiber)
                );
                return;
            }
        } else {
            // Otherwise, fall through to the error path.
        }
    }

    value = createCapturedValueAtFiber(value, sourceFiber);
    renderDidError(value);

    // We didn't find a boundary that could handle this type of exception. Start
    // over and traverse parent path again, this time treating the exception
    // as an error.
    let workInProgress = returnFiber;
    do {
        switch (workInProgress.tag) {
            case HostRoot: {
                const errorInfo = value;
                workInProgress.flags |= ShouldCapture;
                const lane = pickArbitraryLane(rootRenderLanes);
                workInProgress.lanes = mergeLanes(workInProgress.lanes, lane);
                const update = createRootErrorUpdate(
                    workInProgress,
                    errorInfo,
                    lane
                );
                enqueueCapturedUpdate(workInProgress, update);
                return;
            }
            case ClassComponent:
                // Capture and retry
                const errorInfo = value;
                const ctor = workInProgress.type;
                const instance = workInProgress.stateNode;
                if (
                    (workInProgress.flags & DidCapture) === NoFlags &&
                    (typeof ctor.getDerivedStateFromError === "function" ||
                        (instance !== null &&
                            typeof instance.componentDidCatch === "function" &&
                            !isAlreadyFailedLegacyErrorBoundary(instance)))
                ) {
                    workInProgress.flags |= ShouldCapture;
                    const lane = pickArbitraryLane(rootRenderLanes);
                    workInProgress.lanes = mergeLanes(
                        workInProgress.lanes,
                        lane
                    );
                    // Schedule the error boundary to re-render using updated state
                    const update = createClassErrorUpdate(
                        workInProgress,
                        errorInfo,
                        lane
                    );
                    enqueueCapturedUpdate(workInProgress, update);
                    return;
                }
                break;
            default:
                break;
        }
        workInProgress = workInProgress.return;
    } while (workInProgress !== null);
}
