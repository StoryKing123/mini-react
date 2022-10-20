import { DefaultEventPriority } from "./ReactEventPriorities";
export const noTimeout = -1;
export const supportsHydration = true;

export function getCurrentEventPriority() {
    const currentEvent = window.event;
    if (currentEvent === undefined) {
        return DefaultEventPriority;
    }
    return getEventPriority(currentEvent.type);
}
