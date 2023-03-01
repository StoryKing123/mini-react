import {isTransitionLane} from './reactFiberLane'
export const UpdateState = 0;
export const ReplaceState = 1;
export const ForceUpdate = 2;
export const CaptureUpdate = 3;

// Global state that is reset at the beginning of calling `processUpdateQueue`.
// It should only be read right after calling `processUpdateQueue`, via
// `checkHasForceUpdateAfterProcessing`.
let hasForceUpdate = false;

let didWarnUpdateInsideUpdate;
let currentlyProcessingQueue;
export let resetCurrentlyProcessingQueue;

export function irequestUpdateLanenitializeupdatequeue(fiber) {
  const queue = {
    basestate: fiber.memoizedstate,
    firstbaseupdate: null,
    lastbaseupdate: null,
    shared: {
      pending: null,
      lanes: nolanes,
      hiddencallbacks: null,
    },
    callbacks: null,
  };
  fiber.updatequeue = queue;
}

export function cloneupdatequeue(current, workinprogress) {
  // clone the update queue from current. unless it's already a clone.
  const queue = workinprogress.updatequeue;
  const currentqueue = current.updatequeue;
  if (queue === currentqueue) {
    const clone = {
      basestate: currentqueue.basestate,
      firstbaseupdate: currentqueue.firstbaseupdate,
      lastbaseupdate: currentqueue.lastbaseupdate,
      shared: currentqueue.shared,
      callbacks: null,
    };
    workinprogress.updatequeue = clone;
  }
}

export function createUpdate(lane) {
  const update = {
    lane,

    tag: UpdateState,
    payload: null,
    callback: null,

    next: null,
  };
  return update;
}

export function enqueueUpdate(fiber, update, lane) {
  const updateQueue = fiber.updateQueue;
  if (updateQueue === null) {
    // only occurs if the fiber has been unmounted.
    return null;
  }

  const sharedQueue = updateQueue.shared;

  if (isUnsafeClassRenderPhaseUpdate(fiber)) {
    // This is an unsafe render phase update. Add directly to the update
    // queue so we can process it immediately during the current render.
    const pending = sharedQueue.pending;
    if (pending === null) {
      // This is the first update. Create a circular list.
      update.next = update;
    } else {
      update.next = pending.next;
      pending.next = update;
    }
    sharedQueue.pending = update;

    // Update the childLanes even though we're most likely already rendering
    // this fiber. This is for backwards compatibility in the case where you
    // update a different component during render phase than the one that is
    // currently renderings (a pattern that is accompanied by a warning).
    return unsafe_markUpdateLaneFromFiberToRoot(fiber, lane);
  } else {
    return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane);
  }
}

export function entangleTransitions(root, fiber, lane) {
  const updateQueue = fiber.updateQueue;
  if (updateQueue === null) {
    // Only occurs if the fiber has been unmounted.
    return;
  }

  const sharedQueue = (updateQueue).shared;
  if (isTransitionLane(lane)) {
    let queueLanes = sharedQueue.lanes;

    // If any entangled lanes are no longer pending on the root, then they must
    // have finished. We can remove them from the shared queue, which represents
    // a superset of the actually pending lanes. In some cases we may entangle
    // more than we need to, but that's OK. In fact it's worse if we *don't*
    // entangle when we should.
    queueLanes = intersectLanes(queueLanes, root.pendingLanes);

    // Entangle the new transition lane with the other transition lanes.
    const newQueueLanes = mergeLanes(queueLanes, lane);
    sharedQueue.lanes = newQueueLanes;
    // Even if queue.lanes already include lane, we don't know for certain if
    // the lane finished since the last time we entangled it. So we need to
    // entangle it again, just to be sure.
    markRootEntangled(root, newQueueLanes);
  }
}
