import { disableLegacyContext } from "shared/ReactFeatureFlags";
import { ClassComponent, HostRoot } from "./ReactWorkTags";

export const emptyContextObject = {};

function findCurrentUnmaskedContext(fiber) {
    if (disableLegacyContext) {
        return emptyContextObject;
    } else {
        // Currently this is only used with renderSubtreeIntoContainer; not sure if it
        // makes sense elsewhere
        // if (!isFiberMounted(fiber) || fiber.tag !== ClassComponent) {
        //     throw new Error(
        //         "Expected subtree parent to be a mounted class component. " +
        //             "This error is likely caused by a bug in React. Please file an issue."
        //     );
        // }

        let node = fiber;
        do {
            switch (node.tag) {
                case HostRoot:
                    return node.stateNode.context;
                case ClassComponent: {
                    const Component = node.type;
                    if (isContextProvider(Component)) {
                        return node.stateNode
                            .__reactInternalMemoizedMergedChildContext;
                    }
                    break;
                }
            }
            node = node.return;
        } while (node !== null);

        throw new Error(
            "Found unexpected detached subtree parent. " +
                "This error is likely caused by a bug in React. Please file an issue."
        );
    }
}

function isContextProvider(type) {
    if (disableLegacyContext) {
        return false;
    } else {
        const childContextTypes = type.childContextTypes;
        return childContextTypes !== null && childContextTypes !== undefined;
    }
}

// function processChildContext(
//     fiber: Fiber,
//     type: any,
//     parentContext: Object,
//   ): Object {}

function processChildContext(fiber, type, parentContext) {
    if (disableLegacyContext) {
        return parentContext;
    } else {
        const instance = fiber.stateNode;
        const childContextTypes = type.childContextTypes;

        if (typeof instance.getChildContext !== "function") {
            return parentContext;
        }

        const childContext = instance.getChildContext();
        for (const contextKey in childContext) {
            if (!(contextKey in childContextTypes)) {
                throw new Error(
                    ` key "${contextKey}" is not defined in childContextTypes.`
                );
                // throw new Error(
                //     `${
                //         getComponentNameFromFiber(fiber) || "Unknown"
                //     }.getChildContext(): key "${contextKey}" is not defined in childContextTypes.`
                // );
            }
        }

        return { ...parentContext, ...childContext };
    }
}

export { findCurrentUnmaskedContext, isContextProvider, processChildContext };
