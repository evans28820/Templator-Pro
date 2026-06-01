<script setup lang="ts">
import type { TreeNode } from '../../types';
import TreeNodeItem from './TreeNodeItem.vue';

defineEmits<{ 'select-node': [nodeId: string | null] }>();

defineProps<{
  tree: TreeNode[];
  selectedId: string | null;
}>();
</script>

<template>
  <div class="layer-tree">
    <div class="tree-header">LAYER TREE</div>
    <div class="tree-body">
      <template v-for="node in tree" :key="node.id">
        <TreeNodeItem
          :node="node"
          :depth="0"
          :selected-id="selectedId"
          @select="$emit('select-node', $event)"
        />
      </template>
      <div v-if="tree.length === 0" class="tree-empty">
        Scan a file to see layer structure
      </div>
    </div>
  </div>
</template>

<style scoped>
.layer-tree {
  display: flex; flex-direction: column; height: 100%;
  background: var(--bg-primary);
}
.tree-header {
  padding: 8px 12px;
  font-size: 11px; color: var(--text-muted);
  font-weight: 600; letter-spacing: 0.5px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
}
.tree-body {
  flex: 1; overflow-y: auto; padding: 4px 0;
}
.tree-empty {
  padding: 24px; text-align: center;
  color: var(--text-muted); font-size: 13px;
}
</style>
