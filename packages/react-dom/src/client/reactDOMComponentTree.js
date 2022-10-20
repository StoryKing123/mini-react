//function markContainerAsRoot(hostRoot: Fiber, node: Container): void
const randomKey = Math.random().toString(36).slice(2);
const internalInstanceKey = "__reactFiber$" + randomKey;
const internalPropsKey = "__reactProps$" + randomKey;
const internalContainerInstanceKey = "__reactContainer$" + randomKey;
const internalEventHandlersKey = "__reactEvents$" + randomKey;
const internalEventHandlerListenersKey = "__reactListeners$" + randomKey;
const internalEventHandlesSetKey = "__reactHandles$" + randomKey;

export function markContainerAsRoot(hostRoot, node) {
    node[internalContainerInstanceKey] = hostRoot;
}
