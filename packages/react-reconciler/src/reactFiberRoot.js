import { createHostRootFiber } from "./reactFiber";
import { NoLane, createLaneMap, NoLanes, NoTimestamp } from './reactFiberLane'
export function createFiberRoot(
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

  //todo
  return root;
}



function FiberRootNode(
  containerInfo,
  // $FlowFixMe[missing-local-annot]
  tag,
  hydrate,
  identifierPrefix,
  onRecoverableError,
) {
  this.tag = tag;
  this.containerInfo = containerInfo;
  this.pendingChildren = null;
  this.current = null;
  this.pingCache = null;
  this.finishedWork = null;
  this.timeoutHandle = null;
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

  // this.identifierPrefix = identifierPrefix;
  // this.onRecoverableError = onRecoverableError;

  // if (enableCache) {
  //   this.pooledCache = null;
  //   this.pooledCacheLanes = NoLanes;
  // }

  // if (supportsHydration) {
  //   this.mutableSourceEagerHydrationData = null;
  // }

  // if (enableSuspenseCallback) {
  //   this.hydrationCallbacks = null;
  // }

  // this.incompleteTransitions = new Map();
  // if (enableTransitionTracing) {
  //   this.transitionCallbacks = null;
  //   const transitionLanesMap = (this.transitionLanes = []);
  //   for (let i = 0; i < TotalLanes; i++) {
  //     transitionLanesMap.push(null);
  //   }
  // }

  // if (enableProfilerTimer && enableProfilerCommitHooks) {
  //   this.effectDuration = 0;
  //   this.passiveEffectDuration = 0;
  // }

  // if (enableUpdaterTracking) {
  //   this.memoizedUpdaters = new Set();
  //   const pendingUpdatersLaneMap = (this.pendingUpdatersLaneMap = []);
  //   for (let i = 0; i < TotalLanes; i++) {
  //     pendingUpdatersLaneMap.push(new Set());
  //   }
  // }

  // if (__DEV__) {
  //   switch (tag) {
  //     case ConcurrentRoot:
  //       this._debugRootType = hydrate ? 'hydrateRoot()' : 'createRoot()';
  //       break;
  //     case LegacyRoot:
  //       this._debugRootType = hydrate ? 'hydrate()' : 'render()';
  //       break;
  //   }
  // }
}
