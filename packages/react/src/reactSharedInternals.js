import ReactCurrentDispatcher from "./reactCurrentDispatcher";
import ReactCurrentBatchConfig from "./reactCurrentBatchConfig";
import ReactCurrentOwner from "./reactCurrentOwner";
import ReactCurrentActQueue from "./reactCurrentActQueue";
import { enableServerContext } from "shared/reactFeatureFlags";
import { ContextRegistry } from "./reactServerContextRegistry";

const ReactSharedInternals = {
    ReactCurrentDispatcher,
    ReactCurrentBatchConfig,
    ReactCurrentOwner,
    ReactCurrentActQueue,
};

if (enableServerContext) {
    ReactSharedInternals.ContextRegistry = ContextRegistry;
}

export default ReactSharedInternals;
