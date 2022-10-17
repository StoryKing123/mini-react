import { createRootImpl } from "./reactDOMRoot";
export function createRoot(container, options) {
    return createRootImpl(container, options);
}
