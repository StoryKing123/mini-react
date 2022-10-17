import reactConfig from "./react.config.js";
import reactDOMConfig from "./react-dom.config.js";
// import reactNoopConfig from "./react-noop-renderer.config";

export default () => {
    return [...reactConfig, ...reactDOMConfig];
};
