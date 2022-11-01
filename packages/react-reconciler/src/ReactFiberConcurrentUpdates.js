/**
 *
 * @param {*} sourceFiber  Fiber
 * @param {*} lane Lane
 * @returns  FiberRoot|null
 */
export function unsafe_markUpdateLaneFromFiberToRoot(
    sourceFiber: Fiber,
    lane: Lane
): FiberRoot | null {
    // NOTE: For Hyrum's Law reasons, if an infinite update loop is detected, it
    // should throw before `markUpdateLaneFromFiberToRoot` is called. But this is
    // undefined behavior and we can change it if we need to; it just so happens
    // that, at the time of this writing, there's an internal product test that
    // happens to rely on this.
    const root = getRootForUpdatedFiber(sourceFiber);
    markUpdateLaneFromFiberToRoot(sourceFiber, null, lane);
    return root;
}
