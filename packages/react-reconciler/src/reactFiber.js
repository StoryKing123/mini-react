// import { Fiber } from "./reactInternalTypes";
import { NoMode, ConcurrentMode } from "./reactTypeOfMode";
import { HostRoot } from "./reactWorkTags";
import { ConcurrentRoot } from "./reactRootTags";
import { StaticMask, NoFlags } from "./reactFiberFlags";
import { NoLanes } from "./reactFiberLane";

function FiberNode(tag, pendingProps, key, mode) {
    // Instance
    this.tag = tag;
    this.key = key;
    this.elementType = null;
    this.type = null;
    this.stateNode = null;

    // Fiber
    this.return = null;
    this.child = null;
    this.sibling = null;
    this.index = 0;

    this.ref = null;

    this.pendingProps = pendingProps;
    this.memoizedProps = null;
    this.updateQueue = null;
    this.memoizedState = null;
    this.dependencies = null;

    this.mode = mode;

    // Effects
    this.flags = NoFlags;
    this.subtreeFlags = NoFlags;
    this.deletions = null;

    this.lanes = NoLanes;
    this.childLanes = NoLanes;

    this.alternate = null;
}

// This is a constructor function, rather than a POJO constructor, still
// please ensure we do the following:
// 1) Nobody should add any instance methods on this. Instance methods can be
//    more difficult to predict when they get optimized and they are almost
//    never inlined properly in static compilers.
// 2) Nobody should rely on `instanceof Fiber` for type testing. We should
//    always know when it is a fiber.
// 3) We might want to experiment with using numeric keys since they are easier
//    to optimize in a non-JIT environment.
// 4) We can easily go from a constructor to a createFiber object literal if that
//    is faster.
// 5) It should be easy to port this to a C struct and keep a C implementation
//    compatible.
export const createFiber = function (tag, pendingProps, key, mode) {
    // $FlowFixMe: the shapes are exact here but Flow doesn't like constructors
    return new FiberNode(tag, pendingProps, key, mode);
};

// export function createHostRootFiber(
//   tag: RootTag,
//   isStrictMode: boolean,
//   concurrentUpdatesByDefaultOverride: null | boolean,
// ): Fiber
export function createHostRootFiber(
    tag,
    isStrictMode,
    concurrentUpdatesByDefaultOverride
) {
    let mode;
    if (tag === ConcurrentRoot) {
        mode = ConcurrentMode;
        if (isStrictMode === true) {
            mode |= StrictLegacyMode;
            if (enableStrictEffects) {
                mode |= StrictEffectsMode;
            }
        } else if (enableStrictEffects && createRootStrictEffectsByDefault) {
            mode |= StrictLegacyMode | StrictEffectsMode;
        }
    } else {
        mode = NoMode;
    }
    return createFiber(HostRoot, null, null, mode);
}

// This is used to create an alternate fiber to do work on.
/**
 *
 * @param {*} Fiber
 * @param {*} pendingProps any
 * @returns Fiber
 */
export function createWorkInProgress(current, pendingProps) {
    let workInProgress = current.alternate;
    if (workInProgress === null) {
        // We use a double buffering pooling technique because we know that we'll
        // only ever need at most two versions of a tree. We pool the "other" unused
        // node that we're free to reuse. This is lazily created to avoid allocating
        // extra objects for things that are never updated. It also allow us to
        // reclaim the extra memory if needed.
        workInProgress = createFiber(
            current.tag,
            pendingProps,
            current.key,
            current.mode
        );
        workInProgress.elementType = current.elementType;
        workInProgress.type = current.type;
        workInProgress.stateNode = current.stateNode;

        workInProgress.alternate = current;
        current.alternate = workInProgress;
    } else {
        workInProgress.pendingProps = pendingProps;
        // Needed because Blocks store data on type.
        workInProgress.type = current.type;

        // We already have an alternate.
        // Reset the effect tag.
        workInProgress.flags = NoFlags;

        // The effects are no longer valid.
        workInProgress.subtreeFlags = NoFlags;
        workInProgress.deletions = null;

        // if (enableProfilerTimer) {
        if (false) {
            // We intentionally reset, rather than copy, actualDuration & actualStartTime.
            // This prevents time from endlessly accumulating in new commits.
            // This has the downside of resetting values for different priority renders,
            // But works for yielding (the common case) and should support resuming.
            workInProgress.actualDuration = 0;
            workInProgress.actualStartTime = -1;
        }
    }

    // Reset all effects except static ones.
    // Static effects are not specific to a render.
    workInProgress.flags = current.flags & StaticMask;
    workInProgress.childLanes = current.childLanes;
    workInProgress.lanes = current.lanes;

    workInProgress.child = current.child;
    workInProgress.memoizedProps = current.memoizedProps;
    workInProgress.memoizedState = current.memoizedState;
    workInProgress.updateQueue = current.updateQueue;

    // Clone the dependencies object. This is mutated during the render phase, so
    // it cannot be shared with the current fiber.
    const currentDependencies = current.dependencies;
    workInProgress.dependencies =
        currentDependencies === null
            ? null
            : {
                  lanes: currentDependencies.lanes,
                  firstContext: currentDependencies.firstContext,
              };

    // These will be overridden during the parent's reconciliation
    workInProgress.sibling = current.sibling;
    workInProgress.index = current.index;
    workInProgress.ref = current.ref;

    // if (enableProfilerTimer) {
    if (false) {
        workInProgress.selfBaseDuration = current.selfBaseDuration;
        workInProgress.treeBaseDuration = current.treeBaseDuration;
    }

    // if (__DEV__) {
    if (false) {
        // workInProgress._debugNeedsRemount = current._debugNeedsRemount;
        // switch (workInProgress.tag) {
        //     case IndeterminateComponent:
        //     case FunctionComponent:
        //     case SimpleMemoComponent:
        //         workInProgress.type = resolveFunctionForHotReloading(
        //             current.type
        //         );
        //         break;
        //     case ClassComponent:
        //         workInProgress.type = resolveClassForHotReloading(current.type);
        //         break;
        //     case ForwardRef:
        //         workInProgress.type = resolveForwardRefForHotReloading(
        //             current.type
        //         );
        //         break;
        //     default:
        //         break;
        // }
    }

    return workInProgress;
}
