import { mergeLanes, NoLanes, NoLane } from "./reactFiberLane";
import { HostRoot } from "./reactWorkTags";
import { OffscreenVisible } from "./reactFiberOffscreenComponent";

const concurrentQueues = [];
let concurrentQueuesIndex = 0;
let concurrentlyUpdatedLanes = NoLanes;
/**
 *
 * @param {*} sourceFiber  Fiber
 * @param {*} lane Lane
 * @returns  FiberRoot|null
 */
export function unsafe_markUpdateLaneFromFiberToRoot(sourceFiber, lane) {
    // NOTE: For Hyrum's Law reasons, if an infinite update loop is detected, it
    // should throw before `markUpdateLaneFromFiberToRoot` is called. But this is
    // undefined behavior and we can change it if we need to; it just so happens
    // that, at the time of this writing, there's an internal product test that
    // happens to rely on this.
    const root = getRootForUpdatedFiber(sourceFiber);
    markUpdateLaneFromFiberToRoot(sourceFiber, null, lane);
    return root;
}

/**
 *
 * @param {*} sourceFiber  Fiber
 * @returns FiberRoot | null
 */
function getRootForUpdatedFiber(sourceFiber) {
    // TODO: We will detect and infinite update loop and throw even if this fiber
    // has already unmounted. This isn't really necessary but it happens to be the
    // current behavior we've used for several release cycles. Consider not
    // performing this check if the updated fiber already unmounted, since it's
    // not possible for that to cause an infinite update loop.
    // throwIfInfiniteUpdateLoopDetected();

    // When a setState happens, we must ensure the root is scheduled. Because
    // update queues do not have a backpointer to the root, the only way to do
    // this currently is to walk up the return path. This used to not be a big
    // deal because we would have to walk up the return path to set
    // the `childLanes`, anyway, but now those two traversals happen at
    // different times.
    // TODO: Consider adding a `root` backpointer on the update queue.
    // detectUpdateOnUnmountedFiber(sourceFiber, sourceFiber);
    let node = sourceFiber;
    let parent = node.return;
    while (parent !== null) {
        // detectUpdateOnUnmountedFiber(sourceFiber, node);
        node = parent;
        parent = node.return;
    }
    return node.tag === HostRoot ? node.stateNode : null;
}

/**
 *
 * @param {*} fiber  Fiber
 * @param {*} queue ClassQueue<State>
 * @param {*} update ClassUpdate<State>
 * @param {*} lane  Lane
 * @returns  FiberRoot | null
 */
export function enqueueConcurrentClassUpdate(fiber, queue, update, lane) {
    const concurrentQueue = queue;
    const concurrentUpdate = update;
    enqueueUpdate(fiber, concurrentQueue, concurrentUpdate, lane);
    return getRootForUpdatedFiber(fiber);
}

/**
 *
 * @param {*} fiber Fiber
 * @param {*} queue ConcurrentQueue
 * @param {*} update ConcurrentUpdate
 * @param {*} lane  Lane
 */
function enqueueUpdate(fiber, queue, update, lane) {
    // Don't update the `childLanes` on the return path yet. If we already in
    // the middle of rendering, wait until after it has completed.
    concurrentQueues[concurrentQueuesIndex++] = fiber;
    concurrentQueues[concurrentQueuesIndex++] = queue;
    concurrentQueues[concurrentQueuesIndex++] = update;
    concurrentQueues[concurrentQueuesIndex++] = lane;

    concurrentlyUpdatedLanes = mergeLanes(concurrentlyUpdatedLanes, lane);

    // The fiber's `lane` field is used in some places to check if any work is
    // scheduled, to perform an eager bailout, so we need to update it immediately.
    // TODO: We should probably move this to the "shared" queue instead.
    console.log(fiber);
    fiber.lanes = mergeLanes(fiber.lanes, lane);
    const alternate = fiber.alternate;
    if (alternate !== null) {
        alternate.lanes = mergeLanes(alternate.lanes, lane);
    }
}

export function finishQueueingConcurrentUpdates() {
    const endIndex = concurrentQueuesIndex;
    concurrentQueuesIndex = 0;

    concurrentlyUpdatedLanes = NoLanes;

    let i = 0;
    while (i < endIndex) {
        const fiber = concurrentQueues[i];
        concurrentQueues[i++] = null;
        const queue = concurrentQueues[i]; //ConcurrentQueue
        concurrentQueues[i++] = null;
        const update = concurrentQueues[i]; //ConcurrentUpdate
        concurrentQueues[i++] = null;
        const lane = concurrentQueues[i]; //Lane
        concurrentQueues[i++] = null;

        if (queue !== null && update !== null) {
            const pending = queue.pending;
            if (pending === null) {
                // This is the first update. Create a circular list.
                update.next = update;
            } else {
                update.next = pending.next;
                pending.next = update;
            }
            queue.pending = update;
        }

        if (lane !== NoLane) {
            markUpdateLaneFromFiberToRoot(fiber, update, lane);
        }
    }
}

/**
 *
 * @param {*} sourceFiber Fiber
 * @param {*} update ConcurrentUpdate | null
 * @param {*} lane Lane
 */
function markUpdateLaneFromFiberToRoot(sourceFiber, update, lane) {
    // Update the source fiber's lanes
    sourceFiber.lanes = mergeLanes(sourceFiber.lanes, lane);
    let alternate = sourceFiber.alternate;
    if (alternate !== null) {
        alternate.lanes = mergeLanes(alternate.lanes, lane);
    }
    // Walk the parent path to the root and update the child lanes.
    let isHidden = false;
    let parent = sourceFiber.return;
    let node = sourceFiber;
    while (parent !== null) {
        parent.childLanes = mergeLanes(parent.childLanes, lane);
        alternate = parent.alternate;
        if (alternate !== null) {
            alternate.childLanes = mergeLanes(alternate.childLanes, lane);
        }

        if (parent.tag === OffscreenComponent) {
            // Check if this offscreen boundary is currently hidden.
            //
            // The instance may be null if the Offscreen parent was unmounted. Usually
            // the parent wouldn't be reachable in that case because we disconnect
            // fibers from the tree when they are deleted. However, there's a weird
            // edge case where setState is called on a fiber that was interrupted
            // before it ever mounted. Because it never mounts, it also never gets
            // deleted. Because it never gets deleted, its return pointer never gets
            // disconnected. Which means it may be attached to a deleted Offscreen
            // parent node. (This discovery suggests it may be better for memory usage
            // if we don't attach the `return` pointer until the commit phase, though
            // in order to do that we'd need some other way to track the return
            // pointer during the initial render, like on the stack.)
            //
            // This case is always accompanied by a warning, but we still need to
            // account for it. (There may be other cases that we haven't discovered,
            // too.)
            //offscreenInstance: OffscreenInstance | null
            const offscreenInstance = parent.stateNode;
            if (
                offscreenInstance !== null &&
                !(offscreenInstance.visibility & OffscreenVisible)
            ) {
                isHidden = true;
            }
        }

        node = parent;
        parent = parent.return;
    }

    if (isHidden && update !== null && node.tag === HostRoot) {
        const root = node.stateNode; //FiberRoot
        markHiddenUpdate(root, update, lane);
    }
}


