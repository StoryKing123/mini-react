import ReactSharedInternals from "shared/reactSharedInternals";
// console.log(aa);
// console.log(123);
// console.log(ReactSharedInternals);
const { ReactCurrentBatchConfig } = ReactSharedInternals;
export function requestCurrentTransition() {
    return ReactCurrentBatchConfig.transition;
}

export const NoTransition = null;
