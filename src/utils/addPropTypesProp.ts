import * as bt from "@babel/types";
import traverse, { NodePath } from "@babel/traverse";
import { getAst, replaceTextWithNodes } from "./common";
import { get, isNil } from "lodash";
import { trim } from "lodash";

interface Property {
  propertyName: string;
  type: string;
  isRequired: boolean;
  defaultValue?: string;
}

const addPropertyToPropType = (
  fileContent: string,
  opts: Property | null
): string => {
  try {
    if (!opts) {
      return "";
    }

    const { propertyName, type, isRequired, defaultValue } = opts;
    const ast = getAst(fileContent);
    if (!ast) {
      return "";
    }

    // Trim parameters
    const inputOpts = {
      propertyName: trim(propertyName),
      type: trim(type),
      isRequired,
      defaultValue: trim(defaultValue)
    };

    const { propTypeNodePath, defaultPropNodePath } = findPropTypesNode(ast);

    if (!propTypeNodePath || !defaultPropNodePath) {
      return "";
    }

    addPropertyToPropTypeDeclaration(propTypeNodePath, inputOpts);
    addPropertyToDefaultPropDeclaration(defaultPropNodePath, inputOpts);

    let newText = replaceTextWithNodes(fileContent, [
      propTypeNodePath.node,
      defaultPropNodePath.node
    ]);
    return newText;
  } catch (err) {
    console.error(err);
  }
  return "";
};

/**
 * Parse user input text to extract.
 * Eg: "myMethod:func:() => {}"
 *
 * add "myMethod" prop of type "func" with default "() => {}"
 */
export const parseInputs = (
  text: string | null | undefined
): Property | null => {
  if (!text) {
    return null;
  }

  let [propertyName, type, defaultValue] = text.split(":");
  if (!propertyName || !type) {
    return null;
  }

  return {
    propertyName,
    type,
    isRequired: !trim(defaultValue),
    defaultValue
  };
};

/**
 * Add a new property to the prop type declaration.
 */
const addPropertyToPropTypeDeclaration = (
  propTypeNodePath: NodePath,
  opts: Property
): NodePath => {
  const { propertyName, type, isRequired } = opts;
  const properties: bt.Node[] = get(
    propTypeNodePath,
    "node.expression.right.properties"
  );

  const isRequiredStr = isRequired ? ".isRequired" : "";
  const newNode: bt.Node = bt.objectProperty(
    bt.identifier(propertyName),
    bt.identifier(`PropTypes.${type}${isRequiredStr}`)
  );

  addSortObjectPropertyToArray(properties, newNode);

  const rightPath = propTypeNodePath.get("expression.right") as NodePath;
  rightPath.replaceWith(bt.objectExpression(properties as bt.ObjectProperty[]));

  return propTypeNodePath;
};

/**
 * Add a new property to the prop type default value declaration.
 */
const addPropertyToDefaultPropDeclaration = (
  defaultPropNodePath: NodePath,
  opts: Property
): NodePath => {
  const { isRequired, type, defaultValue, propertyName } = opts;
  const defaultTypeValuesMap: any = {
    bool: "false",
    string: "''",
    number: "0"
  };

  if (isRequired) {
    return defaultPropNodePath;
  }

  const properties: bt.Node[] = get(
    defaultPropNodePath,
    "node.expression.right.properties"
  );

  let value = isNil(defaultValue)
    ? defaultTypeValuesMap[type] || null
    : defaultValue;

  const newNode: bt.Node = bt.objectProperty(
    bt.identifier(propertyName),
    bt.identifier(value)
  );

  addSortObjectPropertyToArray(properties, newNode);

  const rightPath = defaultPropNodePath.get("expression.right") as NodePath;
  rightPath.replaceWith(bt.objectExpression(properties as bt.ObjectProperty[]));

  return defaultPropNodePath;
};

/**
 * Add a new node to array of node and sort by key.name.
 */
const addSortObjectPropertyToArray = (
  obj: Array<bt.Node>,
  property: bt.Node
) => {
  obj.push(property);
  obj.sort((left, right) =>
    get(left, "key.name").localeCompare(get(right, "key.name"))
  );
};

/**
 * Find the prop type declaration nodePath.
 */
const findPropTypesNode = (
  root: bt.File
): {
  propTypeNodePath: NodePath | null;
  defaultPropNodePath: NodePath | null;
} => {
  let propTypeNodePath: NodePath | null = null;
  let defaultPropNodePath: NodePath | null = null;

  traverse(root, {
    ExpressionStatement: path => {
      if (propTypeNodePath && defaultPropNodePath) {
        return;
      }

      // Search on 1-depth node for quick search as most PropTypes declaration is here
      if (
        get(path, "node.expression.type") === "AssignmentExpression" &&
        get(path, "node.expression.left.property.name") === "propTypes"
      ) {
        propTypeNodePath = path;
        return;
      }

      // Search on 1-depth node for quick search as most PropTypes declaration is here
      if (
        get(path, "node.expression.type") === "AssignmentExpression" &&
        get(path, "node.expression.left.property.name") === "defaultProps"
      ) {
        defaultPropNodePath = path;
      }
    }
  });

  return {
    propTypeNodePath,
    defaultPropNodePath
  };
};

export default addPropertyToPropType;
