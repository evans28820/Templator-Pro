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
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
}
.tree-header {
  padding: 6px 12px;
  font-size: 11px;
  color: #888;
  font-weight: 600;
  letter-spacing: 0.5px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  flex-shrink: 0;
}
.tree-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.tree-empty {
  padding: 24px;
  text-align: center;
  color: #555;
  font-size: 13px;
}
</style>
