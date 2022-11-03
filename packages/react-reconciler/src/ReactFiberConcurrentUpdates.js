import { mergeLanes } from "./reactFiberLane";
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
    fiber.lanes = mergeLanes(fiber.lanes, lane);
    const alternate = fiber.alternate;
    if (alternate !== null) {
        alternate.lanes = mergeLanes(alternate.lanes, lane);
    }
}

