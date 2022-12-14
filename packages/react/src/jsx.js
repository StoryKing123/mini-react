const supportSymbol = typeof Symbol === 'function' && Symbol.for;

export const REACT_ELEMENT_TYPE = supportSymbol
    ? Symbol.for('react.element')
    : 0xeac7;

const ReactElement = function (type, key, ref, props) {
    const element = {
        $$typeof: REACT_ELEMENT_TYPE,
        type: type,
        key,
        ref,
        props,
        __mark: "KaSong",
    };

    return element;
};

function hasValidKey(config) {
    return config.key !== undefined;
}

function hasValidRef(config) {
    return config.ref !== undefined;
}

export const jsx = (type, config) => {
    let key = null;
    const props = {};
    let ref = null;

    for (const prop in config) {
        const val = config[prop];
        if (prop === "key") {
            if (hasValidKey(config)) {
                key = "" + val;
            }
            continue;
        }
        if (prop === "ref" && val !== undefined) {
            if (hasValidRef(config)) {
                ref = val;
            }
            continue;
        }
        if ({}.hasOwnProperty.call(config, prop)) {
            props[prop] = val;
        }
    }

    const maybeChildrenLength = maybeChildren.length;
    if (maybeChildrenLength) {
        // 将多余参数作为children
        if (maybeChildrenLength === 1) {
            props.children = maybeChildren[0];
        } else {
            props.children = maybeChildren;
        }
    }
    return ReactElement(type, key, ref, props);
};

export function isValidElement(object) {
    return (
        typeof object === "object" &&
        object !== null &&
        object.$$typeof === REACT_ELEMENT_TYPE
    );
}

// jsxDEV传入的后续几个参数与jsx不同
export const jsxDEV = (type, config) => {
    let key = null;
    const props = {};
    let ref = null;

    for (const prop in config) {
        const val = config[prop];
        if (prop === "key") {
            if (hasValidKey(config)) {
                key = "" + val;
            }
            continue;
        }
        if (prop === "ref" && val !== undefined) {
            if (hasValidRef(config)) {
                ref = val;
            }
            continue;
        }
        if ({}.hasOwnProperty.call(config, prop)) {
            props[prop] = val;
        }
    }

    return ReactElement(type, key, ref, props);
};
