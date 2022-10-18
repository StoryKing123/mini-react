import { createHostRootFiber, createFiber } from './reactFiber'
import { noTimeout, supportsHydration } from './ReactFiberHostConfig';
import { ConcurrentMode, NoMode } from './reactTypeOfMode';
import { HostRoot } from './reactWorkTags';
import {
    enableSuspenseCallback,
    enableCache,
    enableProfilerCommitHooks,
    enableProfilerTimer,
    enableUpdaterTracking,
    enableTransitionTracing,
} from '../../shared/reactFeaturesFlag'
import {
    NoLane,
    NoLanes,
    NoTimestamp,
    // TotalLanes,
    createLaneMap,
} from './ReactFiberLane';
/**
 *export function createFiberRoot(
    containerInfo,
    tag,
    hydrate,
    initialChildren,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    // TODO: We have several of these arguments that are conceptually part of the
    // host config, but because they are passed in at runtime, we have to thread
    // them through the root constructor. Perhaps we should put them all into a
    // single type, like a DynamicHostConfig that is defined by the renderer.
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks,
  ){

  } 
 * @param {*} containerInfo 
 * @param {*} tag 
 * @param {*} hydrate 
 * @param {*} initialChildren 
 * @param {*} hydrationCallbacks 
 * @param {*} isStrictMode 
 * @param {*} concurrentUpdatesByDefaultOverride 
 * @param {*} identifierPrefix 
 * @param {*} onRecoverableError 
 * @param {*} transitionCallbacks 
 */
export function createFiberRoot(
    containerInfo,
    tag,
    hydrate,
    initialChildren,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    // TODO: We have several of these arguments that are conceptually part of the
    // host config, but because they are passed in at runtime, we have to thread
    // them through the root constructor. Perhaps we should put them all into a
    // single type, like a DynamicHostConfig that is defined by the renderer.
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks
) {
    const root = new FiberRootNode(
        containerInfo,
        tag,
        hydrate,
        identifierPrefix,
        onRecoverableError
    );
    const uninitializedFiber = createHostRootFiber(
        tag,
        isStrictMode,
        concurrentUpdatesByDefaultOverride
    );
    root.current = uninitializedFiber;
    uninitializedFiber.stateNode = root;
    // todo
    // initializeUpdateQueue(uninitializedFiber);
    return root;
}

function FiberRootNode(
    containerInfo,
    tag,
    hydrate,
    identifierPrefix,
    onRecoverableError
) {
    this.tag = tag;
    this.containerInfo = containerInfo;
    this.pendingChildren = null;
    this.current = null;
    this.pingCache = null;
    this.finishedWork = null;
    this.timeoutHandle = noTimeout;
    this.context = null;
    this.pendingContext = null;
    this.callbackNode = null;
    this.callbackPriority = NoLane;
    this.eventTimes = createLaneMap(NoLanes);
    this.expirationTimes = createLaneMap(NoTimestamp);

    this.pendingLanes = NoLanes;
    this.suspendedLanes = NoLanes;
    this.pingedLanes = NoLanes;
    this.expiredLanes = NoLanes;
    this.mutableReadLanes = NoLanes;
    this.finishedLanes = NoLanes;
    this.errorRecoveryDisabledLanes = NoLanes;

    this.entangledLanes = NoLanes;
    this.entanglements = createLaneMap(NoLanes);

    this.hiddenUpdates = createLaneMap(null);

    this.identifierPrefix = identifierPrefix;
    this.onRecoverableError = onRecoverableError;

    if (enableCache) {
        this.pooledCache = null;
        this.pooledCacheLanes = NoLanes;
    }

    if (supportsHydration) {
        this.mutableSourceEagerHydrationData = null;
    }

    if (enableSuspenseCallback) {
        this.hydrationCallbacks = null;
    }

    this.incompleteTransitions = new Map();
    if (enableTransitionTracing) {
        this.transitionCallbacks = null;
        const transitionLanesMap = (this.transitionLanes = []);
        for (let i = 0; i < TotalLanes; i++) {
            transitionLanesMap.push(null);
        }
    }

    if (enableProfilerTimer && enableProfilerCommitHooks) {
        this.effectDuration = 0;
        this.passiveEffectDuration = 0;
    }

    if (enableUpdaterTracking) {
        this.memoizedUpdaters = new Set();
        const pendingUpdatersLaneMap = (this.pendingUpdatersLaneMap = []);
        for (let i = 0; i < TotalLanes; i++) {
            pendingUpdatersLaneMap.push(new Set());
        }
    }

    // if (__DEV__) {
    //     switch (tag) {
    //         case ConcurrentRoot:
    //             this._debugRootType = hydrate
    //                 ? "hydrateRoot()"
    //                 : "createRoot()";
    //             break;
    //         case LegacyRoot:
    //             this._debugRootType = hydrate ? "hydrate()" : "render()";
    //             break;
    //     }
    // }
}

