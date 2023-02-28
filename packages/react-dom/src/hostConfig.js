import { DefaultEventPriority } from 'react-reconciler/src/reactEventPriorities';
import { getEventPriority } from './events/reactDOMEventListener'



export function getCurrentEventPriority() {
    const currentEvent = window.event;
    if (currentEvent === undefined) {
        return DefaultEventPriority;
    }
    return getEventPriority(currentEvent.type);
}
