import ReactCurrentDispatcher from "./reactCurrentDispatcher";
import ReactCurrentBatchConfig from "./reactCurrentBatchConfig";
import ReactCurrentOwner from "./reactCurrentOwner";

const ReactSharedInternals = {
    ReactCurrentDispatcher,
    ReactCurrentBatchConfig,
    ReactCurrentOwner,
};

if (enableServerContext) {
    ReactSharedInternals.ContextRegistry = ContextRegistry;
}

export default ReactSharedInternals;
