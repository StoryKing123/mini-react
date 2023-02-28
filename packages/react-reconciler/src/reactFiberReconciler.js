// import { hydrate } from "react-dom";
import { createFiberRoot } from "./reactFiberRoot";
import { get as getInstance } from "shared/ReactInstanceMap";
import { createUpdate, enqueueUpdate } from "./reactFiberClassUpdateQueue";
import { requestEventTime,requestUpdateLane } from "./reactFiberWorkLoop";
import { entangleTransitions } from "./reactFiberClassUpdateQueue";

export function createContainer(
  containerInfo,
  tag,
  hydrationCallbacks,
  isStrictMode
) {
  return createFiberRoot(containerInfo, tag, false, null, null, false);
}

export function updateContainer(  element,
  container,
  parentComponent,
  callback,) {
  const current = container.current;
  const lane = requestUpdateLane(current);
  const context = getContextForSubtree(parentComponent);
  if (container.context === null) {
    container.context = context;
  } else {
    container.pendingContext = context;
  }

  const update = createUpdate(lane);
  // Caution: React DevTools currently depends on this property
  // being called "element".
  update.payload = { element };
  callback = callback === undefined ? null : callback;
  if (callback !== null) {
    update.callback = callback;
  }

  const root = enqueueUpdate(current, update, lane);
  console.log(root)
  if (root !== null) {
    const eventTime = requestEventTime();
    scheduleUpdateOnFiber(root, current, lane, eventTime);
    entangleTransitions(root, current, lane);
  }

  return lane;
}

function getContextForSubtree(parentComponent) {
  if (!parentComponent) {
    // return emptyContextObject;
    return {};
  }

  const fiber = getInstance(parentComponent);
  const parentContext = findCurrentUnmaskedContext(fiber);

  // if (fiber.tag === ClassComponent) {
  //   const Component = fiber.type;
  //   if (isLegacyContextProvider(Component)) {
  //     return processChildContext(fiber, Component, parentContext);
  //   }
  // }

  return parentContext;
}
