import {
    // enableDebugTracing,
    // enableSchedulingProfiler,
    enableNewReconciler,
    enableCache,
    enableUseRefAccessWarning,
    enableLazyContextPropagation,
    enableUseMutableSource,
    // enableTransitionTracing,
    enableUseHook,
    enableUseMemoCacheHook,
} from "shared/ReactFeatureFlags";
import { readContext } from "./reactFiberNewContext";
import { NoLanes } from "./reactFiberLane";
import ReactSharedInternals from "shared/reactSharedInternals";

const { ReactCurrentDispatcher, ReactCurrentBatchConfig } =
    ReactSharedInternals;

// These are set right before calling the component.
let renderLanes = NoLanes;
// The work-in-progress fiber. I've named it differently to distinguish it from
// the work-in-progress hook.
let currentlyRenderingFiber = null;

// Hooks are stored as a linked list on the fiber's memoizedState field. The
// current hook list is the list that belongs to the current fiber. The
// work-in-progress hook list is a new list that will be added to the
// work-in-progress fiber.
let currentHook = null;
let workInProgressHook = null;

// Whether an update was scheduled at any point during the render phase. This
// does not get reset if we do another render pass; only when we're completely
// finished evaluating this component. This is an optimization so we know
// whether we need to clear render phase updates after a throw.
let didScheduleRenderPhaseUpdate = false;
// Where an update was scheduled only during the current render pass. This
// gets reset after each attempt.
// TODO: Maybe there's some way to consolidate this with
// `didScheduleRenderPhaseUpdate`. Or with `numberOfReRenders`.
let didScheduleRenderPhaseUpdateDuringThisPass = false;
// Counts the number of useId hooks in this component.
let localIdCounter = 0;
// Counts number of `use`-d thenables
let thenableIndexCounter = 0;

// Used for ids that are generated completely client-side (i.e. not during
// hydration). This counter is global, so client ids are not stable across
// render attempts.
let globalClientIdCounter = 0;

const RE_RENDER_LIMIT = 25;

// In DEV, this is the name of the currently executing primitive hook
let currentHookNameInDev = null;

// In DEV, this list ensures that hooks are called in the same order between renders.
// The list stores the order of hooks used during the initial render (mount).
// Subsequent renders (updates) reference this list.
let hookTypesDev = null;
let hookTypesUpdateIndexDev = -1;

// In DEV, this tracks whether currently rendering component needs to ignore
// the dependencies for Hooks that need them (e.g. useEffect or useMemo).
// When true, such Hooks will always be "remounted". Only used during hot reload.
let ignorePreviousDependencies = false;

export const ContextOnlyDispatcher = {
    readContext,
    useCallback: throwInvalidHookError,
    useContext: throwInvalidHookError,
    useEffect: throwInvalidHookError,
    useImperativeHandle: throwInvalidHookError,
    useInsertionEffect: throwInvalidHookError,
    useLayoutEffect: throwInvalidHookError,
    useMemo: throwInvalidHookError,
    useReducer: throwInvalidHookError,
    useRef: throwInvalidHookError,
    useState: throwInvalidHookError,
    useDebugValue: throwInvalidHookError,
    useDeferredValue: throwInvalidHookError,
    useTransition: throwInvalidHookError,
    useMutableSource: throwInvalidHookError,
    useSyncExternalStore: throwInvalidHookError,
    useId: throwInvalidHookError,
    unstable_isNewReconciler: enableNewReconciler,
};

if (enableCache) {
    ContextOnlyDispatcher.getCacheSignal = getCacheSignal;
    ContextOnlyDispatcher.getCacheForType = getCacheForType;
    ContextOnlyDispatcher.useCacheRefresh = throwInvalidHookError;
}
if (enableUseHook) {
    ContextOnlyDispatcher.use = throwInvalidHookError;
}
if (enableUseMemoCacheHook) {
    ContextOnlyDispatcher.useMemoCache = throwInvalidHookError;
}

function throwInvalidHookError() {
    throw new Error(
        "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for" +
            " one of the following reasons:\n" +
            "1. You might have mismatching versions of React and the renderer (such as React DOM)\n" +
            "2. You might be breaking the Rules of Hooks\n" +
            "3. You might have more than one copy of React in the same app\n" +
            "See https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem."
    );
}

export function resetHooksAfterThrow() {
    // We can assume the previous dispatcher is always this one, since we set it
    // at the beginning of the render phase and there's no re-entrance.
    ReactCurrentDispatcher.current = ContextOnlyDispatcher;

    if (didScheduleRenderPhaseUpdate) {
        // There were render phase updates. These are only valid for this render
        // phase, which we are now aborting. Remove the updates from the queues so
        // they do not persist to the next render. Do not remove updates from hooks
        // that weren't processed.
        //
        // Only reset the updates from the queue if it has a clone. If it does
        // not have a clone, that means it wasn't processed, and the updates were
        // scheduled before we entered the render phase.
        let hook = currentlyRenderingFiber.memoizedState;
        while (hook !== null) {
            const queue = hook.queue;
            if (queue !== null) {
                queue.pending = null;
            }
            hook = hook.next;
        }
        didScheduleRenderPhaseUpdate = false;
    }

    renderLanes = NoLanes;
    currentlyRenderingFiber = null;

    currentHook = null;
    workInProgressHook = null;

    // if (__DEV__) {
    //     hookTypesDev = null;
    //     hookTypesUpdateIndexDev = -1;

    //     currentHookNameInDev = null;

    //     isUpdatingOpaqueValueInRenderPhase = false;
    // }

    didScheduleRenderPhaseUpdateDuringThisPass = false;
    localIdCounter = 0;
    thenableIndexCounter = 0;
}
