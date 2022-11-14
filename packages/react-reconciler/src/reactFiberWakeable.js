// let suspendedThenable: Thenable<mixed> | null = null;
let suspendedThenable = null;
// let adHocSuspendCount: number = 0;
let adHocSuspendCount = 0;

let usedThenables = null;
let lastUsedThenable = null;

const MAX_AD_HOC_SUSPEND_COUNT = 50;

export function isTrackingSuspendedThenable() {
    return suspendedThenable !== null;
}

export function suspendedThenableDidResolve() {
    if (suspendedThenable !== null) {
        const status = suspendedThenable.status;
        return status === "fulfilled" || status === "rejected";
    }
    return false;
}

export function trackSuspendedWakeable(wakeable) {
    // If this wakeable isn't already a thenable, turn it into one now. Then,
    // when we resume the work loop, we can check if its status is
    // still pending.
    // TODO: Get rid of the Wakeable type? It's superseded by UntrackedThenable.
    const thenable = wakeable;

    if (thenable !== lastUsedThenable) {
        // If this wakeable was not just `use`-d, it must be an ad hoc wakeable
        // that was thrown by an older Suspense implementation. Keep a count of
        // these so that we can detect an infinite ping loop.
        // TODO: Once `use` throws an opaque signal instead of the actual thenable,
        // a better way to count ad hoc suspends is whether an actual thenable
        // is caught by the work loop.
        adHocSuspendCount++;
    }
    suspendedThenable = thenable;

    // We use an expando to track the status and result of a thenable so that we
    // can synchronously unwrap the value. Think of this as an extension of the
    // Promise API, or a custom interface that is a superset of Thenable.
    //
    // If the thenable doesn't have a status, set it to "pending" and attach
    // a listener that will update its status and result when it resolves.
    switch (thenable.status) {
        case "pending":
            // Since the status is already "pending", we can assume it will be updated
            // when it resolves, either by React or something in userspace.
            break;
        case "fulfilled":
        case "rejected":
            // A thenable that already resolved shouldn't have been thrown, so this is
            // unexpected. Suggests a mistake in a userspace data library. Don't track
            // this thenable, because if we keep trying it will likely infinite loop
            // without ever resolving.
            // TODO: Log a warning?
            suspendedThenable = null;
            break;
        default: {
            const pendingThenable = thenable;
            pendingThenable.status = "pending";
            pendingThenable.then(
                (fulfilledValue) => {
                    if (thenable.status === "pending") {
                        const fulfilledThenable = thenable;
                        fulfilledThenable.status = "fulfilled";
                        fulfilledThenable.value = fulfilledValue;
                    }
                },
                (error) => {
                    if (thenable.status === "pending") {
                        const rejectedThenable = thenable;
                        rejectedThenable.status = "rejected";
                        rejectedThenable.reason = error;
                    }
                }
            );
            break;
        }
    }
}

export function resetWakeableStateAfterEachAttempt() {
    suspendedThenable = null;
    adHocSuspendCount = 0;
    lastUsedThenable = null;
}

export function resetThenableStateOnCompletion() {
    usedThenables = null;
}

export function throwIfInfinitePingLoopDetected() {
    if (adHocSuspendCount > MAX_AD_HOC_SUSPEND_COUNT) {
        // TODO: Guard against an infinite loop by throwing an error if the same
        // component suspends too many times in a row. This should be thrown from
        // the render phase so that it gets the component stack.
    }
}

export function trackUsedThenable(thenable, index) {
    if (usedThenables === null) {
        usedThenables = [];
    }
    usedThenables[index] = thenable;
    lastUsedThenable = thenable;
}

export function getPreviouslyUsedThenableAtIndex(index) {
    if (usedThenables !== null) {
        const thenable = usedThenables[index];
        if (thenable !== undefined) {
            return thenable;
        }
    }
    return null;
}
