import type { UserConfigExport } from 'vite';
import vue from '@vitejs/plugin-vue';
import { dependencies } from './package.json';

// https://vitejs.dev/config/
export default {
	plugins: [vue()],
	build: {
		target: 'esnext',
		lib: {
			entry: 'src/main.ts',
			formats: ['es'],
		},
		rollupOptions: {
			external: Object.keys(dependencies),
			output: {
				preserveModulesRoot: 'src',
				preserveModules: true,
				// Rename emitted Vue component sources so they named `[name].vue.js`.
				// It is a convenient way to allow applications importing them like '.../name.vue' when using bundlers.
				// Also `.d.ts` files are generated as `[name].vue.d.ts` so we do not need to tweak them - everything just works.
				entryFileNames(chunk) {
					if (!chunk.name.endsWith('.vue')) {
						return `${chunk.name}.js`;
					}
					// Vue plugin emits multiple chunks for each vue component: main entry and style/template/script blocks
					// main entry is placed to its original folder, other files are going to their own separate folder
					const vueChunkParams = (chunk.facadeModuleId ?? chunk.moduleIds[0] ?? '').split('?')[1] ?? '';
					return vueChunkParams
						? // TODO: merge all chunks into a single file
						  `_vue-chunks/[hash].js`
						: `${chunk.name}.js`;
				},
			},
		},
	},
} satisfies UserConfigExport;
