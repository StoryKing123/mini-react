import ReactSharedInternals from "shared/reactSharedInternals";
const { ReactCurrentBatchConfig } = ReactSharedInternals;
export function requestCurrentTransition() {
    return ReactCurrentBatchConfig.transition;
}

export const NoTransition = null;
