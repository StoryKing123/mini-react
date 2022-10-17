import { getPackageJSON, resolvePkgPath, getBaseRollupPlugins } from "./utils.js";
import generatePackageJson from "rollup-plugin-generate-package-json";
import resolve from "@rollup/plugin-node-resolve";
const extensions = [".ts", ".tsx", ".js", ".jsx"];

const { name } = getPackageJSON("react");
const pkgPath = resolvePkgPath(name);
const pkgDistPath = resolvePkgPath(name, true);

const basePlugins = getBaseRollupPlugins();

export default [
    {
        input: `${pkgPath}/index.js`,
        output: {
            file: `${pkgDistPath}/index.js`,
            name: "index.js",
            format: "umd",
        },
        plugins: [
            ...basePlugins,
            generatePackageJson({
                inputFolder: pkgPath,
                outputFolder: pkgDistPath,
                baseContents: ({ name, description, version }) => ({
                    name,
                    description,
                    version,
                    main: "index.js",
                }),
            }),
            resolve({
                extensions, // 指定 import 模块后缀解析规则
            }),
        ],
    },
    // jsx-runtime
    {
        input: `${pkgPath}/src/jsx.js`,
        output: [
            {
                file: `${pkgDistPath}/jsx-dev-runtime.js`,
                name: "jsx-dev-runtime.js",
                format: "umd",
            },
            {
                file: `${pkgDistPath}/jsx-runtime.js`,
                name: "jsx-runtime.js",
                format: "umd",
            },
        ],
        plugins: basePlugins,
    },
];
