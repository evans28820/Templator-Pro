<script setup lang="ts">
import { computed } from 'vue';
import type { TreeNode } from '../../types';

const props = defineProps<{
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  configuredFaces: Set<string>;
}>();

const emit = defineEmits<{ select: [nodeId: string] }>();

const isExpanded = computed(() => props.node.expanded);
const isSelected = computed(() => props.node.id === props.selectedId);
const hasChildren = computed(() => props.node.children.length > 0);
const isFace = computed(() => {
  const n = props.node.name.toLowerCase();
  return ['bottom','top','left','right'].includes(n);
});
const isConfigured = computed(() => isFace.value && props.configuredFaces.has(props.node.name.toLowerCase()));

function getIcon(node: TreeNode): string {
  switch (node.type) { case 'textFrame': return 'T'; case 'pathItem': case 'compoundPath': return '●'; default: return '▸'; }
}

function getLabel(node: TreeNode): string {
  if (node.type === 'textFrame') {
    if (!node.name && node.content) return node.content.slice(0, 30);
    if (!node.name && !node.content) return '<empty>';
    return node.name;
  }
  return node.name || '<unnamed>';
}

function onToggle(): void { props.node.expanded = !props.node.expanded; }

function onClick(): void {
  if (props.node.readOnly) return;
  emit('select', props.selectedId === props.node.id ? '' : props.node.id);
}
</script>

<template>
  <div class="tree-node-wrapper">
    <div
      class="tree-node"
      :class="{ selected: isSelected, readonly: node.readOnly }"
      :style="{ paddingLeft: (depth * 16 + 8) + 'px' }"
      @click="onClick"
    >
      <!-- FIX 3: bigger toggle hit area -->
      <span v-if="hasChildren" class="toggle-icon" @click.stop="onToggle">
        {{ isExpanded ? '▾' : '▸' }}
      </span>
      <span v-else class="toggle-icon leaf" />
      <span class="node-icon">{{ getIcon(node) }}</span>
      <span class="node-label" :class="{ muted: node.readOnly }">{{ getLabel(node) }}</span>
      <!-- FIX 4: Excel badge -->
      <span v-if="node.includeInExcel && node.type === 'textFrame'" class="badge e-badge" title="Included in Excel">E</span>
      <!-- FIX 4: content preview -->
      <span v-if="node.type === 'textFrame' && node.content" class="content-preview">{{ node.content.slice(0, 32) }}{{ node.content.length > 32 ? '…' : '' }}</span>
      <!-- FIX 5: configured indicator -->
      <span v-if="isConfigured" class="badge cf-badge" title="Customized">●</span>
    </div>
    <template v-if="isExpanded && hasChildren">
      <TreeNodeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :selected-id="selectedId"
        :configured-faces="configuredFaces"
        @select="emit('select', $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.tree-node-wrapper { width: 100%; }
.tree-node {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 8px; cursor: pointer; font-size: 12px;
  white-space: nowrap; user-select: none;
  border-radius: 0; margin: 0;
  width: 100%; box-sizing: border-box;
}
/* FIX 7: full-width hover */
.tree-node:hover { background: var(--bg-hover); }
.tree-node.selected { background: var(--accent); color: #fff; }
.tree-node.selected .node-label, .tree-node.selected .node-icon, .tree-node.selected .content-preview { color: #fff !important; }
.tree-node.selected .toggle-icon { color: rgba(255,255,255,.6) !important; }
.tree-node.readonly { opacity: .6; cursor: default; }
/* FIX 3: bigger toggle */
.toggle-icon {
  width: 18px; height: 18px; flex-shrink: 0;
  color: var(--text-muted); font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 3px; cursor: pointer;
}
.toggle-icon:hover { background: var(--bg-hover); color: var(--text-primary); }
.toggle-icon.leaf { cursor: default; }
.toggle-icon.leaf::before { content: ''; width: 4px; height: 4px; border-radius: 50%; background: var(--border-primary); display: block; }
.node-icon { color: #4ec9b0; font-weight: bold; flex-shrink: 0; font-size: 11px; }
.node-label { overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); flex: 1; min-width: 0; }
.node-label.muted { color: var(--text-muted); font-style: italic; }
.content-preview { color: var(--text-muted); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px; flex-shrink: 1; }
.badge { flex-shrink: 0; font-size: 9px; padding: 1px 5px; border-radius: 3px; font-weight: 600; }
.e-badge { background: #264f78; color: #569cd6; }
.cf-badge { color: #ce9178; font-size: 8px; }
</style>
