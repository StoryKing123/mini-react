import { DefaultEventPriority } from "./reactEventPriorities";
import { getEventPriority } from "react-dom/src/events/reactDOMEventListener";
export const noTimeout = -1;
export const supportsHydration = true;
export const supportsMicrotasks = true;
export const isPrimaryRenderer = true;

export function getCurrentEventPriority() {
    const currentEvent = window.event;
    if (currentEvent === undefined) {
        return DefaultEventPriority;
    }
    return getEventPriority(currentEvent.type);
}

export const scheduleTimeout =
    typeof setTimeout === "function" ? setTimeout : undefined;

const localPromise = typeof Promise === "function" ? Promise : undefined;

function handleErrorInNextTick(error) {
    setTimeout(() => {
        throw error;
    });
}

export const scheduleMicrotask =
    typeof queueMicrotask === "function"
        ? queueMicrotask
        : typeof localPromise !== "undefined"
        ? (callback) =>
              localPromise
                  .resolve(null)
                  .then(callback)
                  .catch(handleErrorInNextTick)
        : scheduleTimeout; // TODO: Determine the best fallback here.

export const cancelTimeout =
    typeof clearTimeout === "function" ? clearTimeout : undefined;
