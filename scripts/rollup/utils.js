import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import replace from "@rollup/plugin-replace";
import cjs from "@rollup/plugin-commonjs";

const __filenameNew = fileURLToPath(import.meta.url);

const __dirnameNew = path.dirname(__filenameNew);

const pkgPath = path.resolve(__dirnameNew, "../../packages");
const distPath = path.resolve(__dirnameNew, "../../dist/node_modules");

export function resolvePkgPath(pkgName, isDist) {
    if (isDist) {
        return `${distPath}/${pkgName}`;
    }
    return `${pkgPath}/${pkgName}`;
}

export function getPackageJSON(pkgName) {
    const path = `${resolvePkgPath(pkgName)}/package.json`;
    const str = fs.readFileSync(path, { encoding: "utf-8" });
    return JSON.parse(str);
}

export function getBaseRollupPlugins({
    alias = {
        __LOG__: false,
        preventAssignment: true,
    },
} = {}) {
    return [replace(alias), cjs()];
}
