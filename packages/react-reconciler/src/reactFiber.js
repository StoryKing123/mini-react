// import { Fiber } from "./reactInternalTypes";
import { NoMode, ConcurrentMode } from "./reactTypeOfMode";
import { HostRoot } from "./reactWorkTags";
import { ConcurrentRoot } from './reactRootTags'

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
    concurrentUpdatesByDefaultOverride,
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
    return createFiber(HostRoot, null, null, mode)
}