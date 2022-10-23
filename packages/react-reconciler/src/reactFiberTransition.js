import ReactSharedInternals from "shared/ReactSharedInternals";
const { ReactCurrentBatchConfig } = ReactSharedInternals;
export function requestCurrentTransition() {
    return ReactCurrentBatchConfig.transition;
}
