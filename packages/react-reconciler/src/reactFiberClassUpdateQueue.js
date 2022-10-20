//function initializeUpdateQueue<State>(fiber: Fiber): void
export function initializeUpdateQueue(fiber) {
    const queue = {
        baseState: fiber.memoizedState,
        firstBaseUpdate: null,
        lastBaseUpdate: null,
        shared: {
            pending: null,
            lanes: NoLanes,
            hiddenCallbacks: null,
        },
        callbacks: null,
    };
    fiber.updateQueue = queue;
}
