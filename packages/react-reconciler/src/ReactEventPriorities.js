import { DefaultLane, NoLane } from "./reactFiberLane";
let currentUpdatePriority = NoLane;
export const DefaultEventPriority = DefaultLane;
export function setCurrentUpdatePriority(newPriority) {
    currentUpdatePriority = newPriority;
}
export function getCurrentUpdatePriority() {
    return currentUpdatePriority;
}

// export function getCurrentEventPriority() {
//     return DefaultEventPriority;
// }
