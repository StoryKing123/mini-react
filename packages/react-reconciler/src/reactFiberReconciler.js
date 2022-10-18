import { createFiberRoot } from './reactFiberRoot'
/**
 * 
 *     containerInfo,
    tag,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks,
  ): OpaqueRoot {
    
  }
 * @param {*} containerInfo 
 * @param {*} tag 
 * @param {*} hydrationCallbacks 
 * @param {*} isStrictMode 
 * @param {*} concurrentUpdatesByDefaultOverride 
 * @param {*} identifierPrefix 
 * @param {*} onRecoverableError 
 * @param {*} transitionCallbacks 
 */
export function createContainer(
    containerInfo,
    tag,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks
) {
    const hydrate = false;
    const initialChildren = null;
    // console.log(containerInfo)
    return createFiberRoot(
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
}

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
    // const hydrate = true;
    // const initialChildren = null;
    // const root = createFiberRoot(
    //     containerInfo,
    //     tag,
    //     hydrate,
    //     initialChildren,
    //     hydrationCallbacks,
    //     isStrictMode,
    //     concurrentUpdatesByDefaultOverride,
    //     identifierPrefix,
    //     onRecoverableError,
    //     transitionCallbacks
    // );

    // root.context = getContextForSubTree(null);

    // const current = root.current;
    // const eventTime = requestEventTime();
    // const lane = requestUpdateLane(current);
    // const update = createUpdate(eventTime, lane);

    // update.callback =
    //     callback !== undefined && callback !== null ? callback : null;

    // enqueueUpdate(current, update, lane);
    // scheduleInitialHydrationOnRoot(root, lane, eventTime);

    return root;
    // schene
}

/**export function updateContainer(
    element: ReactNodeList,
    container: OpaqueRoot,
    parentComponent: ?React$Component<any, any>,
    callback: ?Function,
  ): Lane 
  */
export function updateContainer(element, container, parentComponent, callback) {
    console.log('start update')
    console.log(element)
    console.log(container)
    console.log(parentComponent)
    console.log(callback)

    return
    const current = container.current;
    const eventTime = requestEventTime();
    const lane = requestUpdateLane(current);

    const context = getContextForSubtree(parentComponent);
    if (container.context === null) {
        container.context = context;
    } else {
        container.pendingContext = context;
    }
    const update = createUpdate(eventTime, lane);
    // Caution: React DevTools currently depends on this property
    // being called "element".
    update.payload = { element };

    callback = callback === undefined ? null : callback;
    if (callback !== null) {
        if (__DEV__) {
            if (typeof callback !== "function") {
                console.error(
                    "render(...): Expected the last optional `callback` argument to be a " +
                    "function. Instead received: %s.",
                    callback
                );
            }
        }
        update.callback = callback;
    }

    const root = enqueueUpdate(current, update, lane);
    if (root !== null) {
        scheduleUpdateOnFiber(root, current, lane, eventTime);
        entangleTransitions(root, current, lane);
    }

    return lane;
}
