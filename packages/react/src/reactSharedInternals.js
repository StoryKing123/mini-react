import ReactCurrentDispatcher from "./reactCurrentDispatcher";
import ReactCurrentBatchConfig from "./reactCurrentBatchConfig";
import ReactCurrentOwner from "./reactCurrentOwner";
import { enableServerContext } from "shared/reactFeatureFlags";
import { ContextRegistry } from "./reactServerContextRegistry";

const ReactSharedInternals = {
    ReactCurrentDispatcher,
    ReactCurrentBatchConfig,
    ReactCurrentOwner,
};

if (enableServerContext) {
    ReactSharedInternals.ContextRegistry = ContextRegistry;
}

export default ReactSharedInternals;
