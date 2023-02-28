import { ClassComponent, HostRoot } from "./ReactWorkTags";
function findCurrentUnmaskedContext(fiber) {
  if (false) {
    // return {};
  } else {
    // Currently this is only used with renderSubtreeIntoContainer; not sure if it
    // makes sense elsewhere
    // if (!isFiberMounted(fiber) || fiber.tag !== ClassComponent) {
    //   throw new Error(
    //     "Expected subtree parent to be a mounted class component. " +
    //       "This error is likely caused by a bug in React. Please file an issue."
    //   );
    // }

    let node = fiber;
    do {
      switch (node.tag) {
        case HostRoot:
          return node.stateNode.context;
        case ClassComponent: {
          const Component = node.type;
          if (isContextProvider(Component)) {
            return node.stateNode.__reactInternalMemoizedMergedChildContext;
          }
          break;
        }
      }
      // $FlowFixMe[incompatible-type] we bail out when we get a null
      node = node.return;
    } while (node !== null);

    throw new Error(
      "Found unexpected detached subtree parent. " +
        "This error is likely caused by a bug in React. Please file an issue."
    );
  }
}

function isContextProvider(type) {
  const childContextTypes = type.childContextTypes;
  return childContextTypes !== null && childContextTypes !== undefined;
}
