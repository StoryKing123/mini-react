import { isPrimaryRenderer } from "./reactFiberHostConfig";
import {
    enableLazyContextPropagation,
    enableServerContext,
} from "shared/reactFeatureFlags";
import { NeedsPropagation } from "./reactFiberFlags";
import { NoLanes } from "./reactFiberLane";
import { createCursor, push, pop } from "./reactFiberStack";

const valueCursor = createCursor(null);

let rendererSigil;
let currentlyRenderingFiber = null;
let lastContextDependency = null;
let lastFullyObservedContext = null;

let isDisallowedContextReadInDEV = false;
/**
 *
 * @param {*} context ReactContext<T>
 * @returns T
 */
export function readContext(context) {
    const value = isPrimaryRenderer
        ? context._currentValue
        : context._currentValue2;

    if (lastFullyObservedContext === context) {
        // Nothing to do. We already observe everything in this context.
    } else {
        const contextItem = {
            context: context,
            memoizedValue: value,
            next: null,
        };

        if (lastContextDependency === null) {
            if (currentlyRenderingFiber === null) {
                throw new Error(
                    "Context can only be read while React is rendering. " +
                        "In classes, you can read it in the render method or getDerivedStateFromProps. " +
                        "In function components, you can read it directly in the function body, but not " +
                        "inside Hooks like useReducer() or useMemo()."
                );
            }

            // This is the first dependency for this component. Create a new list.
            lastContextDependency = contextItem;
            currentlyRenderingFiber.dependencies = {
                lanes: NoLanes,
                firstContext: contextItem,
            };
            if (enableLazyContextPropagation) {
                currentlyRenderingFiber.flags |= NeedsPropagation;
            }
        } else {
            // Append a new context item.
            lastContextDependency = lastContextDependency.next = contextItem;
        }
    }
    return value;
}

export function resetContextDependencies() {
    // This is called right before React yields execution, to ensure `readContext`
    // cannot be called outside the render phase.
    currentlyRenderingFiber = null;
    lastContextDependency = null;
    lastFullyObservedContext = null;
    // if (__DEV__) {
    //   isDisallowedContextReadInDEV = false;
    // }
}
