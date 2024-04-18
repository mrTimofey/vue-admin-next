<template lang="pug">
.form-field-wysiwyg
	slot(name="label")
	.bg-white
		div(ref="editorEl" v-once v-html="modelValue")
	.invalid-feedback(v-if="errors && errors.length" style="display:block")
		div(v-for="err in errors") {{ err }}
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { onBeforeUnmount, defineComponent, ref, watch } from 'vue';
import type { QuillOptionsStatic } from 'quill';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { getCommonProps } from './common';

export type WysiwygComponentConfig = QuillOptionsStatic;

export default defineComponent({
	props: {
		...getCommonProps({
			type: String,
			default: '',
		}),
		config: {
			type: Object as PropType<WysiwygComponentConfig>,
			default: () => ({
				theme: 'snow',
				formats: ['bold', 'italic', 'link', 'strike', 'script', 'underline', 'blockquote', 'header', 'list'],
				modules: {
					toolbar: [
						[{ header: [2, 3, false] }],
						['bold', 'italic', 'underline', 'strike', 'link'],
						['blockquote'],
						[{ list: 'ordered' }, { list: 'bullet' }],
						[{ script: 'sub' }, { script: 'super' }],
						['clean'],
					],
				},
			}),
		},
	},
	emits: ['update:modelValue'],
	setup(props, { emit }) {
		const editorEl = ref<HTMLDivElement | null>(null);
		let updateTimeout = -1;

		watch(editorEl, () => {
			if (!editorEl.value) {
				return;
			}
			const quill = new Quill(editorEl.value, { placeholder: props.placeholder, ...props.config });
			quill.on('text-change', () => {
				clearTimeout(updateTimeout);
				updateTimeout = window.setTimeout(() => {
					if (!editorEl.value) {
						return;
					}
					emit('update:modelValue', quill.root.innerHTML);
				}, 200);
			});
		});
		onBeforeUnmount(() => {
			clearTimeout(updateTimeout);
		});

		return { editorEl };
	},
});
</script>

<style lang="stylus" scoped></style>
