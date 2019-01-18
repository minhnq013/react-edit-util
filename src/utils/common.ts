import { parse } from "@babel/parser";
import generate from "@babel/generator";
import * as bt from "@babel/types";
import { isNumber } from "util";

export const getAst = (fileText: string): bt.File | undefined => {
  try {
    return parse(fileText, {
      sourceType: "module",
      plugins: [
        "jsx",
        "flow",
        "doExpressions",
        "objectRestSpread",
        "classProperties",
        "asyncGenerators",
        "functionBind",
        "functionSent",
        "dynamicImport"
      ]
    });
  } catch (error) {
    console.error(error);
  }
};

/**
 * THe nodes must be mutual exclusive of each others.
 * No node can be child of
 */
export const replaceTextWithNodes = (
  originText: string,
  nodes: bt.Node[] | undefined | null
): string => {
  if (!nodes || !originText) {
    return "";
  }

  // We sort the node start position desceding, so that there is no line-change when
  // replace the text with node one-by-one
  const sortedNodesByStartDecending = nodes.sort(
    (left, right) => (right.start || 0) - (left.start || 0)
  );

  const result = sortedNodesByStartDecending.reduce(
    (prev: string, node): string => {
      if (!node || !isNumber(node.start) || !isNumber(node.end)) {
        return "";
      }
      const newText =
        prev.substring(0, node.start) +
        generate(node).code +
        prev.substring(node.end);

      return newText;
    },
    originText
  );

  return result;
};
