export function createHydrationContainer(
    initialChildren,
    // TODO: Remove `callback` when we delete legacy mode.
    callback,
    containerInfo,
    tag,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks
) {
    const hydrate = true;
    const root = createFiberRoot(
        containerInfo,
        tag,
        hydrate,
        initialChildren,
        hydrationCallbacks,
        isStrictMode,
        concurrentUpdatesByDefaultOverride,
        identifierPrefix,
        onRecoverableError,
        transitionCallbacks
    );

    root.context = getContextForSubTree(null);

    const current = root.current;
    const eventTime = requestEventTime();
    const lane = requestUpdateLane(current);
    const update = createUpdate(eventTime, lane);

    update.callback =
        callback !== undefined && callback !== null ? callback : null;

    enqueueUpdate(current, update, lane);
    scheduleInitialHydrationOnRoot(root, lane, eventTime);

    return root;
    // schene
}
