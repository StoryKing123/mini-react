// import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

function App() {
    // const [num, updateNum] = useState(0);
    const len = 10;

    // console.log("num", num);
    return (
        <ul
            onClick={(e) => {
                // updateNum((num) => num + 1);
            }}
        >
            {Array(len)
                .fill(1)
                .map((_, i) => {
                    return <Child i={`${i} ${num}`} />;
                })}
        </ul>
    );
}

function Child({ i }) {
    
    return <p>i am child {i}</p>;
}

const root = createRoot(document.getElementById("root"))
console.log(root)
root.render(<App />);
