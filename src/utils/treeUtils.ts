/**
 * TreeNode search and traversal helpers.
 * Pure functions — zero side effects.
 */

import type { TreeNode } from '../types';

export function findNodeById(nodes: TreeNode[], targetId: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    const found = findNodeById(node.children, targetId);
    if (found) return found;
  }
  return null;
}

export function findNodesByName(nodes: TreeNode[], name: string): TreeNode[] {
  const results: TreeNode[] = [];
  _collectByName(nodes, name, results);
  return results;
}

function _collectByName(nodes: TreeNode[], name: string, results: TreeNode[]): void {
  for (const node of nodes) {
    if (node.name === name) results.push(node);
    _collectByName(node.children, name, results);
  }
}

export function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  _flatten(nodes, result);
  return result;
}

function _flatten(nodes: TreeNode[], result: TreeNode[]): void {
  for (const node of nodes) {
    result.push(node);
    _flatten(node.children, result);
  }
}

export function getAncestors(nodes: TreeNode[], targetId: string): TreeNode[] {
  const ancestors: TreeNode[] = [];
  _findAncestors(nodes, targetId, ancestors);
  return ancestors;
}

function _findAncestors(nodes: TreeNode[], targetId: string, ancestors: TreeNode[]): boolean {
  for (const node of nodes) {
    if (node.id === targetId) return true;
    ancestors.push(node);
    if (_findAncestors(node.children, targetId, ancestors)) return true;
    ancestors.pop();
  }
  return false;
}

/** Count all descendant nodes */
export function countDescendants(node: TreeNode): number {
  let count = node.children.length;
  for (const child of node.children) {
    count += countDescendants(child);
  }
  return count;
}

/** Check if a group contains only unnamed path/compound-path items */
export function isPathsOnlyGroup(node: TreeNode): boolean {
  if (node.type !== 'group' || node.children.length === 0) return false;
  return node.children.every(
    c => c.type === 'pathItem' || c.type === 'compoundPath',
  ) && !node.children.some(c => !!c.name);
}
