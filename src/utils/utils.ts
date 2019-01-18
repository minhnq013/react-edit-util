import * as bt from "@babel/types";
import { Position, Range } from "vscode";
import { get } from "lodash";
import * as vscode from "vscode";

export const getActiveDoc = (): vscode.TextDocument | null => {
  const editor = vscode.window.activeTextEditor;
  return editor ? editor.document : null;
};

export const replaceNodeText = (
  editor: vscode.TextEditor,
  node: bt.Node,
  newText: string
) => {
  const doc = editor.document;

  // Edit the document
  editor.edit(edit => {
    // Get the range
    const targetRange = new vscode.Range(
      doc.positionAt(node.start || 0),
      doc.positionAt(node.end || 0)
    );

    // Replace the whole document with the new text
    edit.replace(targetRange, newText);
  });
};

export const sourceLocationToRange = (
  sourceLocation: bt.SourceLocation
): Range => {
  return new Range(
    new Position(sourceLocation.start.line - 1, sourceLocation.start.column),
    new Position(sourceLocation.end.line - 1, sourceLocation.end.column)
  );
};

export const getCursorLocation = (): Position => {
  const position = get(vscode, "window.activeTextEditor.selection.active");
  return position;
};

export const getCurrentLineText = (): string => {
  const position = getCursorLocation();
  const document: vscode.TextDocument = get(
    vscode,
    "window.activeTextEditor.document"
  );
  if (!position || !document) return "";

  const text = document.lineAt(position.line).text || "";
  return text.trim();
};

export const replaceCurrentLineText = (callback: (text: string) => string) => {
  const position = getCursorLocation();
  const activeTextEditor = vscode.window.activeTextEditor || null;
  const document = get(activeTextEditor, "document");

  if (!activeTextEditor || !position || !document) return "";

  const text = document.lineAt(position.line).text || "";

  activeTextEditor.edit(editBuilder => {
    const newText = callback(text);

    editBuilder.replace(position, newText);
  });

  return text.trim();
};

export const moveCursor = () => {
  const position = getCursorLocation();
  const editor = get(vscode, "window.activeTextEditor.editor");

  if (!editor || !position) {
    return;
  }

  var newPosition = position.with(position.line, 0);
  var newSelection = new vscode.Selection(newPosition, newPosition);
  editor.selection = newSelection;
};

export const replaceActiveDocumentText = (newText: string) => {
  const { activeTextEditor } = vscode.window;
  if (!activeTextEditor) {
    return;
  }

  const { document } = activeTextEditor;
  const firstLine = document.lineAt(0);
  const lastLine = document.lineAt(document.lineCount - 1);
  const range = new vscode.Range(firstLine.range.start, lastLine.range.end);

  return activeTextEditor.edit(editBuilder => {
    editBuilder.replace(range, newText);
  });
};
