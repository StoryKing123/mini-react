import { DefaultEventPriority } from "./reactEventPriorities";
import { getEventPriority } from "react-dom/src/events/reactDOMEventListener";
export const noTimeout = -1;
export const supportsHydration = true;

export function getCurrentEventPriority() {
    const currentEvent = window.event;
    if (currentEvent === undefined) {
        return DefaultEventPriority;
    }
    return getEventPriority(currentEvent.type);
}
