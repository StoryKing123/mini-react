/**
 *
 * @param {*} target Node
 */
export function enqueueStateRestore(target) {
    if (restoreTarget) {
        if (restoreQueue) {
            restoreQueue.push(target);
        } else {
            restoreQueue = [target];
        }
    } else {
        restoreTarget = target;
    }
}

export function restoreStateIfNeeded() {
    if (!restoreTarget) {
        return;
    }
    const target = restoreTarget;
    const queuedTargets = restoreQueue;
    restoreTarget = null;
    restoreQueue = null;

    restoreStateOfTarget(target);
    if (queuedTargets) {
        for (let i = 0; i < queuedTargets.length; i++) {
            restoreStateOfTarget(queuedTargets[i]);
        }
    }
}
