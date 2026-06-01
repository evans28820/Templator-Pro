<script setup lang="ts">
import { computed } from 'vue';
import type { TreeNode } from '../../types';

const props = defineProps<{
  node: TreeNode;
  depth: number;
  selectedId: string | null;
}>();

const emit = defineEmits<{ select: [nodeId: string] }>();

const isExpanded = computed(() => props.node.expanded);
const isSelected = computed(() => props.node.id === props.selectedId);
const hasChildren = computed(() => props.node.children.length > 0);

function getIcon(node: TreeNode): string {
  switch (node.type) {
    case 'textFrame': return 'T';
    case 'pathItem':
    case 'compoundPath': return '●';
    default: return '▸';
  }
}

function getLabel(node: TreeNode): string {
  if (node.type === 'textFrame') {
    if (!node.name && node.content) return node.content.slice(0, 20);
    if (!node.name && !node.content) return '<empty text frame>';
    return node.name;
  }
  return node.name || '<unnamed>';
}

function onToggle(): void {
  props.node.expanded = !props.node.expanded;
}

function onClick(): void {
  if (props.node.readOnly) return;
  if (props.selectedId === props.node.id) {
    emit('select', '');
  } else {
    emit('select', props.node.id);
  }
}
</script>

<template>
  <div class="tree-node-wrapper">
    <div
      class="tree-node"
      :class="{
        selected: isSelected,
        readonly: node.readOnly,
      }"
      :style="{ paddingLeft: (depth * 16 + 8) + 'px' }"
      @click="onClick"
    >
      <span
        v-if="hasChildren"
        class="toggle-icon"
        @click.stop="onToggle"
      >{{ isExpanded ? '▾' : '▸' }}</span>
      <span v-else class="toggle-icon leaf">·</span>
      <span class="node-icon">{{ getIcon(node) }}</span>
      <span class="node-label" :style="node.readOnly ? { color: '#888', fontStyle: 'italic' } : {}">
        {{ getLabel(node) }}
      </span>
      <span v-if="node.includeInExcel" class="badge e-badge">E</span>
      <span v-if="node.canShrink" class="badge s-badge">↔</span>
    </div>
    <template v-if="isExpanded && hasChildren">
      <TreeNodeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :selected-id="selectedId"
        @select="emit('select', $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  user-select: none;
}
.tree-node:hover {
  background: #2a2d2e;
}
.tree-node.selected {
  background: #094771;
}
.tree-node.readonly {
  opacity: 0.6;
  cursor: default;
}
.toggle-icon {
  width: 12px;
  flex-shrink: 0;
  color: #888;
  font-size: 10px;
}
.toggle-icon.leaf {
  color: #444;
}
.node-icon {
  color: #4ec9b0;
  font-weight: bold;
  flex-shrink: 0;
}
.node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  color: #d4d4d4;
}
.badge {
  flex-shrink: 0;
  font-size: 9px;
  padding: 0 3px;
  border-radius: 2px;
  font-weight: 600;
}
.e-badge {
  background: #264f78;
  color: #569cd6;
}
.s-badge {
  background: #3a3d1e;
  color: #ce9178;
}
</style>
