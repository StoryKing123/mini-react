import { createRootImpl } from "./reactDOMRoot";

const Internals = {
    usingClientEntryPoint: false,
    // Keep in sync with ReactTestUtils.js.
    // This is an array for better minification.
    Events: [
        getInstanceFromNode,
        getNodeFromInstance,
        getFiberCurrentPropsFromNode,
        enqueueStateRestore,
        restoreStateIfNeeded,
        batchedUpdates,
    ],
};
export function createRoot(container, options) {
    return createRootImpl(container, options);
}

export { Internals as __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED };
