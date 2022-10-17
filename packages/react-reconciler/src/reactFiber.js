import { Fiber } from "./reactInternalTypes";
import { TypeOfMode } from "./reactTypeOfMode";
import { WorkTag } from "./reactWorkTags";

function FiberNode(tag, pengdingProps, key, mode) {
    // Instance
    this.tag = tag;
    this.key = key;
    this.elementType = null;
    this.type = null;
    this.stateNode = null;

    // Fiber
    this.return = null;
    this.child = null;
    this.sibling = null;
    this.index = 0;

    this.ref = null;

    this.pendingProps = pendingProps;
    this.memoizedProps = null;
    this.updateQueue = null;
    this.memoizedState = null;
    this.dependencies = null;

    this.mode = mode;
}

const createFiber = function (tag, pendingProps, key, mode) {
    // $FlowFixMe: the shapes are exact here but Flow doesn't like constructors
    return new FiberNode(tag, pendingProps, key, mode);
};

//ReactNodeList:ReactNodeList
ReactDOMHydrationRoot.prototype.render = ReactDOMRoot.prototype.render =
    function (children) {
        const root = this._internalRoot;
        if (root === null) {
            throw new Error("Cannot update an unmounted root.");
        }
        updateContainer(children, root, null, null);
    };
