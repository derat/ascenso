// src/shims-vue.d.ts provides a default TypeScript definition for .vue files.
// Routes.vue exports additional methods for unit tests, so it needs its own
// definition.
import Vue from 'vue';
export default Vue;
export function formatDuration(ms: number): string;
export function getNextTimeout(remainMs: number): number;
