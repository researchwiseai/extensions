#!/usr/bin/env bun

import fs from "fs/promises";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";

async function main() {
    const [,, inputPath] = process.argv;
    if (!inputPath) {
        console.error("Usage: remove_export.ts <input.js>");
        process.exit(1);
    }

    const source = await fs.readFile(inputPath, "utf8");
    const ast = parse(source, {
        sourceType: "module",
        plugins: ["jsx", "typescript", "classProperties", "dynamicImport"]
    });

    traverse(ast, {
        ExportNamedDeclaration(path) {
            const { declaration, specifiers, source } = path.node;
            // export function/foo/bar... keep the declaration but drop the export
            if (declaration) {
                path.replaceWith(declaration);
            } else if (specifiers.length > 0 && source == null) {
                // export { a, b } -- this makes no sense alone
                path.remove();
            } else {
                // re-exports or export ... from ... 
                path.remove();
            }
        },
        ExportDefaultDeclaration(path) {
            const decl = path.node.declaration;
            // if it's a function/class with a name, keep it; else drop entirely
            if (
                (t.isFunctionDeclaration(decl) || t.isClassDeclaration(decl)) &&
                decl.id
            ) {
                path.replaceWith(decl);
            } else {
                path.remove();
            }
        },
        ExportAllDeclaration(path) {
            path.remove();
        }
    });
    const { code } = generate(ast, { comments: true, retainLines: true });
    await fs.writeFile(inputPath, code, "utf8");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
