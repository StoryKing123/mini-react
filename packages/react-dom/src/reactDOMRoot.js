import { createContainer, updateContainer } from "react-reconciler";
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
function ReactDOMHydrationRoot(internalRoot) {
    this._internalRoot = internalRoot;
}

//ReactNodeList:ReactNodeList
ReactDOMHydrationRoot.prototype.render = ReactDOMRoot.prototype.render =
    function (children) {
        const root = this._internalRoot;
        if (root === null) {
            throw new Error("Cannot update an unmounted root.");
        }
        updateContainer(children, root, null, null);
    };
