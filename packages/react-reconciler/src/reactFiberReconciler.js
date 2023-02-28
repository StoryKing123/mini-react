// import { hydrate } from "react-dom";
import { createFiberRoot } from "./reactFiberRoot";

export function createContainer(
  containerInfo,
  tag,
  hydrationCallbacks,
  isStrictMode
) {
  return createFiberRoot(containerInfo, tag, false, null, null, false)
}


export function updateContainer() {
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
  if (root !== null) {
    const eventTime = requestEventTime();
    scheduleUpdateOnFiber(root, current, lane, eventTime);
    entangleTransitions(root, current, lane);
  }

  return lane;
}
