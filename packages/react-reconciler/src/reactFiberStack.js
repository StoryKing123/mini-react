const valueStack = []; // Array<any>

let fiberStack; //Array<Fiber | null>

// if (__DEV__) {
//     fiberStack = [];
// }

let index = -1;

/**
 *
 * @param {*} defaultValue T
 * @returns StackCursor<T>
 */
function createCursor(defaultValue) {
    return {
        current: defaultValue,
    };
}

function isEmpty() {
    return index === -1;
}

function pop(cursor, fiber) {
    if (index < 0) {
        return;
    }

    cursor.current = valueStack[index];

    valueStack[index] = null;

    index--;
}

function push(cursor, value , fiber) {
    index++;

    valueStack[index] = cursor.current;


    cursor.current = value;
}

function checkThatStackIsEmpty() {
    // if (__DEV__) {
    //     if (index !== -1) {
    //         console.error(
    //             "Expected an empty stack. Something was not reset properly."
    //         );
    //     }
    // }
}

function resetStackAfterFatalErrorInDev() {
    // if (__DEV__) {
    //     index = -1;
    //     valueStack.length = 0;
    //     fiberStack.length = 0;
    // }
}

export {
    createCursor,
    isEmpty,
    pop,
    push,
    // DEV only:
    checkThatStackIsEmpty,
    resetStackAfterFatalErrorInDev,
};
