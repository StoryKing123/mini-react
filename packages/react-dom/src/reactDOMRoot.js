import { createContainer } from "react-reconciler";
export function createRootImpl(container, options) {
    const root = createContainer(container, options);
    // markContainerAsRoot(root.current, container);
    // let root = cont
    //事件相关，暂不处理
    //     const rootContainerElement: Document | Element | DocumentFragment =
    //     container.nodeType === COMMENT_NODE
    //       ? (container.parentNode: any)
    //       : container;
    //   listenToAllSupportedEvents(rootContainerElement);

    return new ReactDOMRoot(root);
}
/**
 *
 * @param {*} internalRoot FiberRoot
 */
function ReactDOMRoot(internalRoot) {
    this._internalRoot = internalRoot;
}
